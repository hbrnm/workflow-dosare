/**
 * Document detection + perspective warp powered by OpenCV.js
 * (same class of CV used by open-source scanners like jscanify).
 */

import { getOpenCv, isOpenCvReady, loadOpenCv } from "./opencvLoader";

function orderCorners(points) {
  if (!points || points.length !== 4) return points;
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function quadArea(pts) {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % 4];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function isConvexQuad(pts) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % 4];
    const r = pts[(i + 2) % 4];
    const cross = (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (sign !== s) return false;
    }
  }
  return true;
}

function scoreQuad(pts, w, h) {
  if (!isConvexQuad(pts)) return -1;
  const area = quadArea(pts);
  const imgArea = w * h;
  if (area < imgArea * 0.12 || area > imgArea * 0.98) return -1;

  const avgW = (dist(pts[0], pts[1]) + dist(pts[3], pts[2])) / 2;
  const avgH = (dist(pts[0], pts[3]) + dist(pts[1], pts[2])) / 2;
  if (avgW < 40 || avgH < 40) return -1;
  const aspect = Math.max(avgW, avgH) / Math.min(avgW, avgH);
  if (aspect > 3.8) return -1;

  return area / imgArea;
}

function matPointsToCorners(approx) {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    pts.push({
      x: approx.data32S[i * 2],
      y: approx.data32S[i * 2 + 1],
    });
  }
  return orderCorners(pts);
}

/**
 * Ensure OpenCV is ready (no-op if already loaded).
 */
export async function ensureOpenCvEngine() {
  if (isOpenCvReady()) return getOpenCv();
  return loadOpenCv();
}

/**
 * Detect document corners on an HTMLCanvasElement / HTMLImageElement / HTMLVideoElement frame.
 * Returns ordered [TL,TR,BR,BL] in source pixel coords, or null.
 */
export function detectCornersOpenCv(source, options = {}) {
  const cv = getOpenCv();
  if (!cv || !source) return null;

  const minAreaRatio = options.minAreaRatio ?? 0.12;
  const maxAreaRatio = options.maxAreaRatio ?? 0.97;

  let src = null;
  let gray = null;
  let blur = null;
  let edges = null;
  let dilated = null;
  let hierarchy = null;
  let contours = null;
  let kernel = null;

  try {
    src = cv.imread(source);
    if (!src || src.rows < 16 || src.cols < 16) return null;

    gray = new cv.Mat();
    blur = new cv.Mat();
    edges = new cv.Mat();
    dilated = new cv.Mat();
    hierarchy = new cv.Mat();
    contours = new cv.MatVector();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blur, edges, 50, 150, 3, false);

    kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, dilated, kernel);

    cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imgArea = src.rows * src.cols;
    let best = null;
    let bestScore = -1;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < imgArea * minAreaRatio || area > imgArea * maxAreaRatio) continue;

      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const corners = matPointsToCorners(approx);
        const score = scoreQuad(corners, src.cols, src.rows);
        if (score > bestScore) {
          bestScore = score;
          best = corners;
        }
      }
      approx.delete();
    }

    // Fallback: largest contour → farthest points per quadrant (jscanify-style)
    if (!best && contours.size() > 0) {
      let maxArea = 0;
      let maxIdx = -1;
      for (let i = 0; i < contours.size(); i++) {
        const a = cv.contourArea(contours.get(i));
        if (a > maxArea) {
          maxArea = a;
          maxIdx = i;
        }
      }
      if (maxIdx >= 0 && maxArea >= imgArea * minAreaRatio && maxArea <= imgArea * maxAreaRatio) {
        const cnt = contours.get(maxIdx);
        const rect = cv.minAreaRect(cnt);
        const center = rect.center;
        const buckets = {
          tl: { p: null, d: 0 },
          tr: { p: null, d: 0 },
          br: { p: null, d: 0 },
          bl: { p: null, d: 0 },
        };
        for (let i = 0; i < cnt.data32S.length; i += 2) {
          const point = { x: cnt.data32S[i], y: cnt.data32S[i + 1] };
          const d = dist(point, center);
          if (point.x < center.x && point.y < center.y && d > buckets.tl.d) {
            buckets.tl = { p: point, d };
          } else if (point.x > center.x && point.y < center.y && d > buckets.tr.d) {
            buckets.tr = { p: point, d };
          } else if (point.x > center.x && point.y > center.y && d > buckets.br.d) {
            buckets.br = { p: point, d };
          } else if (point.x < center.x && point.y > center.y && d > buckets.bl.d) {
            buckets.bl = { p: point, d };
          }
        }
        if (buckets.tl.p && buckets.tr.p && buckets.br.p && buckets.bl.p) {
          const corners = orderCorners([buckets.tl.p, buckets.tr.p, buckets.br.p, buckets.bl.p]);
          if (scoreQuad(corners, src.cols, src.rows) > 0) best = corners;
        }
      }
    }

    return best;
  } catch (err) {
    console.warn("OpenCV document detect failed:", err);
    return null;
  } finally {
    src?.delete?.();
    gray?.delete?.();
    blur?.delete?.();
    edges?.delete?.();
    dilated?.delete?.();
    hierarchy?.delete?.();
    contours?.delete?.();
    kernel?.delete?.();
  }
}

/**
 * Live frame helper: draw video onto a small canvas, detect, scale corners back.
 */
export function detectCornersFromVideoOpenCv(video, maxDim = 640) {
  if (!video || !video.videoWidth || !isOpenCvReady()) return null;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.max(64, Math.round(vw * scale));
  const h = Math.max(64, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  const corners = detectCornersOpenCv(canvas, { minAreaRatio: 0.1 });
  if (!corners) return null;
  const sx = vw / w;
  const sy = vh / h;
  return orderCorners(corners.map((p) => ({ x: p.x * sx, y: p.y * sy })));
}

/**
 * Perspective-correct a source canvas/image using OpenCV warp.
 * corners: [TL,TR,BR,BL]
 * Returns a new canvas or null.
 */
export function warpWithOpenCv(source, corners, options = {}) {
  const cv = getOpenCv();
  if (!cv || !source || !corners || corners.length !== 4) return null;

  const ordered = orderCorners(corners);
  const outW = options.width || Math.round(
    Math.max(dist(ordered[0], ordered[1]), dist(ordered[3], ordered[2]))
  );
  const outH = options.height || Math.round(
    Math.max(dist(ordered[0], ordered[3]), dist(ordered[1], ordered[2]))
  );
  const width = clamp(outW, 200, options.maxWidth || 2400);
  const height = clamp(outH, 200, options.maxHeight || 3200);

  let src = null;
  let dst = null;
  let M = null;
  let srcTri = null;
  let dstTri = null;

  try {
    src = cv.imread(source);
    dst = new cv.Mat();
    srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      ordered[0].x, ordered[0].y,
      ordered[1].x, ordered[1].y,
      ordered[2].x, ordered[2].y,
      ordered[3].x, ordered[3].y,
    ]);
    dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      width, 0,
      width, height,
      0, height,
    ]);
    M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(width, height),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    cv.imshow(canvas, dst);
    return canvas;
  } catch (err) {
    console.warn("OpenCV warp failed:", err);
    return null;
  } finally {
    src?.delete?.();
    dst?.delete?.();
    M?.delete?.();
    srcTri?.delete?.();
    dstTri?.delete?.();
  }
}
