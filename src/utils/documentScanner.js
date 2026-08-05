/**
 * Document scanner — detecție 4 colțuri + perspectivă (stil CamScanner).
 * Preferă OpenCV.js când e disponibil; fallback JS edge/blob + homografie.
 */

import { isOpenCvReady, loadOpenCv } from "./opencvLoader";
import {
  detectCornersOpenCv,
  detectCornersFromVideoOpenCv,
  warpWithOpenCv,
} from "./opencvDocumentDetect";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Ordonează colțurile: TL, TR, BR, BL */
export function orderCorners(points) {
  if (!points || points.length !== 4) return points;
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

function defaultCorners(w, h, margin = 0.08) {
  const mx = w * margin;
  const my = h * margin;
  return orderCorners([
    { x: mx, y: my },
    { x: w - mx, y: my },
    { x: w - mx, y: h - my },
    { x: mx, y: h - my },
  ]);
}

function quadArea(pts) {
  // Shoelace
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

  // Prefer roughly document-shaped aspect (A4-ish, but allow landscape)
  const wTop = dist(pts[0], pts[1]);
  const wBot = dist(pts[3], pts[2]);
  const hLeft = dist(pts[0], pts[3]);
  const hRight = dist(pts[1], pts[2]);
  const avgW = (wTop + wBot) / 2;
  const avgH = (hLeft + hRight) / 2;
  if (avgW < 40 || avgH < 40) return -1;
  const aspect = Math.max(avgW, avgH) / Math.min(avgW, avgH);
  if (aspect > 3.5) return -1;

  // Parallelism bonus
  const topAng = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  const botAng = Math.atan2(pts[2].y - pts[3].y, pts[2].x - pts[3].x);
  const leftAng = Math.atan2(pts[3].y - pts[0].y, pts[3].x - pts[0].x);
  const rightAng = Math.atan2(pts[2].y - pts[1].y, pts[2].x - pts[1].x);
  const parallel =
    1 -
    Math.min(1, Math.abs(topAng - botAng) / (Math.PI / 2)) * 0.5 -
    Math.min(1, Math.abs(leftAng - rightAng) / (Math.PI / 2)) * 0.5;

  return (area / imgArea) * 0.7 + parallel * 0.3;
}

/** Convex hull (Andrew's monotone chain) */
function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 3) return pts;

  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Douglas–Peucker simplify */
function simplifyRdp(points, epsilon) {
  if (points.length < 3) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  const a = points[0];
  const b = points[end];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;

  for (let i = 1; i < end; i++) {
    const p = points[i];
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const d = Math.hypot(p.x - projX, p.y - projY);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRdp(points.slice(0, index + 1), epsilon);
    const right = simplifyRdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function pickBestQuadFromHull(hull, w, h) {
  if (!hull || hull.length < 4) return null;

  // Close ring for RDP
  const closed = [...hull, hull[0]];
  const epsilon = Math.max(4, Math.min(w, h) * 0.02);
  let simplified = simplifyRdp(closed, epsilon);
  if (simplified.length > 1 &&
      simplified[0].x === simplified[simplified.length - 1].x &&
      simplified[0].y === simplified[simplified.length - 1].y) {
    simplified = simplified.slice(0, -1);
  }

  let best = null;
  let bestScore = -1;

  const n = simplified.length;
  if (n === 4) {
    const ordered = orderCorners(simplified);
    const s = scoreQuad(ordered, w, h);
    if (s > bestScore) {
      bestScore = s;
      best = ordered;
    }
  }

  // Try all combinations of 4 hull points if needed
  if (n > 4 && n <= 24) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          for (let l = k + 1; l < n; l++) {
            const ordered = orderCorners([
              simplified[i],
              simplified[j],
              simplified[k],
              simplified[l],
            ]);
            const s = scoreQuad(ordered, w, h);
            if (s > bestScore) {
              bestScore = s;
              best = ordered;
            }
          }
        }
      }
    }
  }

  // Fallback: take 4 extreme points of hull
  if (!best && hull.length >= 4) {
    const ordered = orderCorners([
      hull.reduce((a, b) => (a.x + a.y < b.x + b.y ? a : b)),
      hull.reduce((a, b) => (a.x - a.y > b.x - b.y ? a : b)),
      hull.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b)),
      hull.reduce((a, b) => (-a.x + a.y > -b.x + b.y ? a : b)),
    ]);
    if (scoreQuad(ordered, w, h) > 0) best = ordered;
  }

  return bestScore > 0.15 ? best : null;
}

/**
 * Detectează cele 4 colțuri ale paginii pe ImageData.
 * Preferă OpenCV (Canny + approxPolyDP). Fallback JS dacă OpenCV nu e gata.
 * Returnează [{x,y} x4] în coordonatele imaginii (TL,TR,BR,BL).
 * @param {{ allowDefault?: boolean }} [options]
 */
export function detectDocumentCorners(imageData, width, height, options = {}) {
  const allowDefault = options.allowDefault !== false;

  if (isOpenCvReady() && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      const ocCorners = detectCornersOpenCv(canvas, {
        minAreaRatio: options.minAreaRatio,
        maxAreaRatio: options.maxAreaRatio,
      });
      if (ocCorners) return ocCorners;
      if (!allowDefault) return null;
    } catch (err) {
      console.warn("OpenCV corner detect fallback to JS:", err);
    }
  }

  return detectDocumentCornersJs(imageData, width, height, options);
}

/** Fallback detecție fără OpenCV (Sobel / blob). */
function detectDocumentCornersJs(imageData, width, height, options = {}) {
  const allowDefault = options.allowDefault !== false;
  const data = imageData.data;
  const w = width;
  const h = height;

  // 1) Luminanță + prag adaptiv (hârtia e mai deschisă decât fundalul)
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const mean = sum / (w * h);

  // 2) Sobel pe subsample pentru muchii
  const step = Math.max(1, Math.floor(Math.min(w, h) / 280));
  const edgePts = [];
  const brightPts = [];
  const paperThresh = Math.max(mean + 12, mean * 1.05, 110);

  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] +
        gray[i - w + 1] -
        2 * gray[i - 1] +
        2 * gray[i + 1] -
        gray[i + w - 1] +
        gray[i + w + 1];
      const gy =
        -gray[i - w - 1] -
        2 * gray[i - w] -
        gray[i - w + 1] +
        gray[i + w - 1] +
        2 * gray[i + w] +
        gray[i + w + 1];
      const mag = Math.abs(gx) + Math.abs(gy);

      if (mag > 90) {
        edgePts.push({ x, y });
      }
      if (gray[i] >= paperThresh) {
        brightPts.push({ x, y });
      }
    }
  }

  // 3) Încearcă din muchii, apoi din blob hârtie
  let corners = null;
  if (edgePts.length > 40) {
    const hull = convexHull(edgePts);
    corners = pickBestQuadFromHull(hull, w, h);
  }
  if (!corners && brightPts.length > 80) {
    const hull = convexHull(brightPts);
    corners = pickBestQuadFromHull(hull, w, h);
  }

  // 4) Fallback: bounding box pe hârtie (axis-aligned) — mai bun decât tot cadrul
  if (!corners) {
    let top = h,
      bottom = 0,
      left = w,
      right = 0;
    let found = false;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (gray[y * w + x] >= paperThresh) {
          found = true;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (found && right - left > w * 0.25 && bottom - top > h * 0.25) {
      const pad = Math.round(Math.min(w, h) * 0.01);
      corners = orderCorners([
        { x: clamp(left - pad, 0, w - 1), y: clamp(top - pad, 0, h - 1) },
        { x: clamp(right + pad, 0, w - 1), y: clamp(top - pad, 0, h - 1) },
        { x: clamp(right + pad, 0, w - 1), y: clamp(bottom + pad, 0, h - 1) },
        { x: clamp(left - pad, 0, w - 1), y: clamp(bottom + pad, 0, h - 1) },
      ]);
    }
  }

  if (corners) return corners;
  return allowDefault ? defaultCorners(w, h, 0.06) : null;
}

/**
 * Detectează colțuri pe un frame video downscalat (overlay live tip CamScanner).
 * Preferă OpenCV; fallback JS.
 */
export function detectCornersFromVideoFrame(video, maxDim = 480) {
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  if (isOpenCvReady()) {
    const oc = detectCornersFromVideoOpenCv(video, Math.max(maxDim, 640));
    if (oc) return oc;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.max(32, Math.round(vw * scale));
  const h = Math.max(32, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const corners = detectDocumentCornersJs(data, w, h, { allowDefault: false });
  if (!corners) return null;
  const sx = vw / w;
  const sy = vh / h;
  return orderCorners(corners.map((p) => ({ x: p.x * sx, y: p.y * sy })));
}

/** Prefetch OpenCV in background (call when user opens capture screen). */
export function prefetchScanEngine() {
  return loadOpenCv().catch((err) => {
    console.warn("OpenCV prefetch failed:", err);
    return null;
  });
}

export { isOpenCvReady, loadOpenCv };

/** Rezolvă sistem Ax=b (Gaussian elimination). A e n x n flat row-major. */
function solveLinearSystem(A, b, n) {
  const M = A.slice();
  const x = b.slice();
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row * n + col]) > Math.abs(M[pivot * n + col])) pivot = row;
    }
    if (Math.abs(M[pivot * n + col]) < 1e-10) return null;
    if (pivot !== col) {
      for (let k = 0; k < n; k++) {
        const tmp = M[col * n + k];
        M[col * n + k] = M[pivot * n + k];
        M[pivot * n + k] = tmp;
      }
      const tb = x[col];
      x[col] = x[pivot];
      x[pivot] = tb;
    }
    const div = M[col * n + col];
    for (let k = col; k < n; k++) M[col * n + k] /= div;
    x[col] /= div;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row * n + col];
      for (let k = col; k < n; k++) M[row * n + k] -= factor * M[col * n + k];
      x[row] -= factor * x[col];
    }
  }
  return x;
}

/**
 * Homografie 3x3: mapează src quad → dst quad.
 * corners: [TL,TR,BR,BL], dst: [0,0,w,0,w,h,0,h]
 */
export function getPerspectiveTransform(srcCorners, dstW, dstH) {
  const src = orderCorners(srcCorners);
  const dst = [
    { x: 0, y: 0 },
    { x: dstW, y: 0 },
    { x: dstW, y: dstH },
    { x: 0, y: dstH },
  ];

  // Solve for H that maps dst → src (inverse warp friendly)
  // We want src = H * dst, then for each dest pixel sample src.
  const A = new Array(64).fill(0);
  const b = new Array(8).fill(0);

  for (let i = 0; i < 4; i++) {
    const x = dst[i].x;
    const y = dst[i].y;
    const u = src[i].x;
    const v = src[i].y;
    const r1 = i * 2;
    const r2 = i * 2 + 1;
    A[r1 * 8 + 0] = x;
    A[r1 * 8 + 1] = y;
    A[r1 * 8 + 2] = 1;
    A[r1 * 8 + 6] = -x * u;
    A[r1 * 8 + 7] = -y * u;
    b[r1] = u;

    A[r2 * 8 + 3] = x;
    A[r2 * 8 + 4] = y;
    A[r2 * 8 + 5] = 1;
    A[r2 * 8 + 6] = -x * v;
    A[r2 * 8 + 7] = -y * v;
    b[r2] = v;
  }

  const h = solveLinearSystem(A, b, 8);
  if (!h) return null;
  // H as 3x3 with h33=1
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function sampleBilinear(data, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) {
    const xi = clamp(Math.round(x), 0, w - 1);
    const yi = clamp(Math.round(y), 0, h - 1);
    const i = (yi * w + xi) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = x - x0;
  const fy = y - y0;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const out = [0, 0, 0, 255];
  for (let c = 0; c < 3; c++) {
    const v00 = data[i00 + c];
    const v10 = data[i10 + c];
    const v01 = data[i01 + c];
    const v11 = data[i11 + c];
    out[c] =
      v00 * (1 - fx) * (1 - fy) +
      v10 * fx * (1 - fy) +
      v01 * (1 - fx) * fy +
      v11 * fx * fy;
  }
  return out;
}

/**
 * Warp perspectivă: colțuri pe imaginea sursă → dreptunghi dest.
 */
export function warpPerspective(sourceCanvas, corners, options = {}) {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const ordered = orderCorners(corners);

  const wTop = dist(ordered[0], ordered[1]);
  const wBot = dist(ordered[3], ordered[2]);
  const hLeft = dist(ordered[0], ordered[3]);
  const hRight = dist(ordered[1], ordered[2]);
  let dstW = Math.round(Math.max(wTop, wBot));
  let dstH = Math.round(Math.max(hLeft, hRight));

  const maxDim = options.maxDim || 1800;
  const scale = Math.min(1, maxDim / Math.max(dstW, dstH));
  dstW = Math.max(100, Math.round(dstW * scale));
  dstH = Math.max(100, Math.round(dstH * scale));

  const H = getPerspectiveTransform(ordered, dstW, dstH);
  if (!H) {
    // fallback: axis crop bounding box
    const xs = ordered.map((p) => p.x);
    const ys = ordered.map((p) => p.y);
    const minX = Math.max(0, Math.floor(Math.min(...xs)));
    const maxX = Math.min(srcW, Math.ceil(Math.max(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(srcH, Math.ceil(Math.max(...ys)));
    const out = document.createElement("canvas");
    out.width = Math.max(10, maxX - minX);
    out.height = Math.max(10, maxY - minY);
    out.getContext("2d").drawImage(sourceCanvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

  const out = document.createElement("canvas");
  out.width = dstW;
  out.height = dstH;
  const outCtx = out.getContext("2d");
  const outImg = outCtx.createImageData(dstW, dstH);
  const od = outImg.data;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const denom = H[6] * x + H[7] * y + H[8];
      const sx = (H[0] * x + H[1] * y + H[2]) / denom;
      const sy = (H[3] * x + H[4] * y + H[5]) / denom;
      const [r, g, b, a] = sampleBilinear(srcData, srcW, srcH, sx, sy);
      const i = (y * dstW + x) * 4;
      od[i] = r;
      od[i + 1] = g;
      od[i + 2] = b;
      od[i + 3] = a;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return out;
}

/** Filtru scan: hârtie albă, text contrastat */
export function enhanceScan(canvas, { mode = "document" } = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = img.data;

  if (mode === "photo") {
    // contrast ușor color
    for (let i = 0; i < p.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = p[i + c];
        v = (v - 128) * 1.15 + 128 + 8;
        p[i + c] = clamp(v, 0, 255);
      }
    }
  } else {
    for (let i = 0; i < p.length; i += 4) {
      let lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
      // S-curve + whitening paper
      lum = (lum - 128) * 1.35 + 128 + 18;
      if (lum > 165) lum = Math.min(255, lum * 1.12);
      else if (lum < 110) lum = Math.max(0, lum * 0.82);
      lum = clamp(lum, 0, 255);
      p[i] = lum;
      p[i + 1] = lum;
      p[i + 2] = lum;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Analizează calitatea pozei: lumină slabă, blur/mișcare, contrast slab.
 * Returnează issues + recomandare Pro mode.
 */
export function analyzeImageQuality(imageData, width, height) {
  const data = imageData.data;
  const w = width;
  const h = height;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 220));

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  let dark = 0;
  let bright = 0;
  let lapSum = 0;
  let lapSumSq = 0;
  let lapCount = 0;

  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = (y * w + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      count++;
      if (lum < 70) dark++;
      if (lum > 210) bright++;

      const iUp = ((y - 1) * w + x) * 4;
      const iDn = ((y + 1) * w + x) * 4;
      const iLf = (y * w + (x - 1)) * 4;
      const iRt = (y * w + (x + 1)) * 4;
      const up = 0.2126 * data[iUp] + 0.7152 * data[iUp + 1] + 0.0722 * data[iUp + 2];
      const dn = 0.2126 * data[iDn] + 0.7152 * data[iDn + 1] + 0.0722 * data[iDn + 2];
      const lf = 0.2126 * data[iLf] + 0.7152 * data[iLf + 1] + 0.0722 * data[iLf + 2];
      const rt = 0.2126 * data[iRt] + 0.7152 * data[iRt + 1] + 0.0722 * data[iRt + 2];
      const lap = Math.abs(4 * lum - up - dn - lf - rt);
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }

  const mean = count ? sum / count : 128;
  const variance = count ? Math.max(0, sumSq / count - mean * mean) : 0;
  const contrast = Math.sqrt(variance);
  const darkRatio = count ? dark / count : 0;
  const brightRatio = count ? bright / count : 0;
  const lapMean = lapCount ? lapSum / lapCount : 0;
  const lapVar = lapCount ? Math.max(0, lapSumSq / lapCount - lapMean * lapMean) : 0;

  const issues = [];
  if (mean < 95 || darkRatio > 0.42) {
    issues.push({
      code: "dark",
      label: "Lumină slabă",
      detail: "Documentul sau poza e prea întunecată",
    });
  }
  if (lapVar < 180 || lapMean < 8) {
    issues.push({
      code: "blur",
      label: "Posibilă mișcare / blur",
      detail: "Imaginea pare neclară — Pro mode aplică sharpen",
    });
  }
  if (contrast < 38) {
    issues.push({
      code: "low_contrast",
      label: "Contrast slab",
      detail: "Textul și hârtia nu sunt suficient de distincte",
    });
  }
  if (brightRatio > 0.55 && mean > 190) {
    issues.push({
      code: "overexposed",
      label: "Prea luminos",
      detail: "Zone albe arse — Pro mode recuperează textul",
    });
  }

  const score = Math.max(
    0,
    100 -
      (issues.some((i) => i.code === "dark") ? 28 : 0) -
      (issues.some((i) => i.code === "blur") ? 32 : 0) -
      (issues.some((i) => i.code === "low_contrast") ? 22 : 0) -
      (issues.some((i) => i.code === "overexposed") ? 18 : 0)
  );

  return {
    meanBrightness: mean,
    contrast,
    blurMetric: lapVar,
    darkRatio,
    brightRatio,
    issues,
    score,
    recommendPro: issues.length > 0 || score < 75,
  };
}

/**
 * Pro mode: lumină + contrast adaptiv + unsharp (anti-blur) + albire hârtie.
 */
export function enhanceScanPro(canvas, qualityHints = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const n = w * h;

  const mean = qualityHints.meanBrightness ?? 128;
  const needsBrighten = mean < 105 || (qualityHints.darkRatio || 0) > 0.35;
  const needsExtraContrast = (qualityHints.contrast ?? 50) < 45;
  const needsSharpen =
    (qualityHints.blurMetric ?? 999) < 220 ||
    (qualityHints.issues || []).some((i) => i.code === "blur");
  const overexposed = (qualityHints.issues || []).some((i) => i.code === "overexposed");

  const brightGain = needsBrighten ? clamp(1.15 + (105 - mean) / 180, 1.12, 1.55) : 1.06;
  const contrastGain = needsExtraContrast ? 1.55 : 1.38;
  const paperLift = needsBrighten ? 28 : overexposed ? 6 : 16;

  const gray = new Float32Array(n);
  for (let i = 0, px = 0; i < p.length; i += 4, px++) {
    let lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
    lum *= brightGain;
    lum = (lum - 128) * contrastGain + 128 + paperLift;
    if (overexposed && lum > 200) lum = 200 + (lum - 200) * 0.45;
    if (lum > 170) lum = Math.min(255, lum * 1.1);
    else if (lum < 105) lum = Math.max(0, lum * 0.78);
    gray[px] = clamp(lum, 0, 255);
  }

  const out = new Float32Array(n);
  if (needsSharpen) {
    const amount = 1.35;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const blur =
          (gray[i - w - 1] +
            gray[i - w] +
            gray[i - w + 1] +
            gray[i - 1] +
            gray[i] * 2 +
            gray[i + 1] +
            gray[i + w - 1] +
            gray[i + w] +
            gray[i + w + 1]) /
          10;
        out[i] = clamp(gray[i] + (gray[i] - blur) * amount, 0, 255);
      }
    }
    for (let x = 0; x < w; x++) {
      out[x] = gray[x];
      out[(h - 1) * w + x] = gray[(h - 1) * w + x];
    }
    for (let y = 0; y < h; y++) {
      out[y * w] = gray[y * w];
      out[y * w + w - 1] = gray[y * w + w - 1];
    }
  } else {
    out.set(gray);
  }

  for (let px = 0, i = 0; px < n; px++, i += 4) {
    const v = out[px];
    p[i] = v;
    p[i + 1] = v;
    p[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Calitate JPEG: Pro → aproape lossless vizual */
export function recommendedJpegQuality({ pro = false } = {}) {
  return pro ? 0.94 : 0.9;
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nu am putut încărca imaginea."));
    img.src = src;
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nu am putut citi fișierul."));
    reader.readAsDataURL(file);
  });
}

/** Desenează imaginea pe canvas (opțional downscale) */
export function imageToCanvas(img, maxDim = 2000) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Pipeline complet: detect → warp → enhance (auto Pro) → JPEG dataURL
 */
export async function processDocumentScan(file, options = {}) {
  await loadOpenCv().catch(() => null);
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImageElement(dataUrl);
  const canvas = imageToCanvas(img, options.maxDim || 2200);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const corners = detectDocumentCorners(imageData, canvas.width, canvas.height);
  const quality = analyzeImageQuality(imageData, canvas.width, canvas.height);
  const pro = options.pro === true || (options.pro !== false && quality.recommendPro);
  let warped =
    (isOpenCvReady() &&
      warpWithOpenCv(canvas, corners, {
        maxWidth: options.outMaxDim || 2000,
        maxHeight: options.outMaxDim || 2800,
      })) ||
    warpPerspective(canvas, corners, { maxDim: options.outMaxDim || 2000 });
  if (options.enhance !== false) {
    if (pro) enhanceScanPro(warped, quality);
    else enhanceScan(warped, { mode: options.mode || "document" });
  }
  const qualityJpeg = options.quality ?? recommendedJpegQuality({ pro });
  return {
    dataUrl: warped.toDataURL("image/jpeg", qualityJpeg),
    corners,
    width: warped.width,
    height: warped.height,
    quality,
    pro,
  };
}

/**
 * Aplică warp pe baza unor colțuri deja alese (din UI).
 * corners sunt în coordonate relative 0–1 sau absolute pe sourceWidth/Height.
 */
export async function applyCornerWarp(imageSrc, corners, options = {}) {
  await loadOpenCv().catch(() => null);
  const img = await loadImageElement(imageSrc);
  const canvas = imageToCanvas(img, options.maxDim || 2400);
  const absCorners = corners.map((c) => {
    if (c.x <= 1 && c.y <= 1 && c.x >= 0 && c.y >= 0 && options.normalized) {
      return { x: c.x * canvas.width, y: c.y * canvas.height };
    }
    if (options.sourceWidth && options.sourceHeight) {
      return {
        x: (c.x / options.sourceWidth) * canvas.width,
        y: (c.y / options.sourceHeight) * canvas.height,
      };
    }
    return { x: c.x, y: c.y };
  });

  let quality = options.qualityHints || null;
  if (!quality) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    quality = analyzeImageQuality(imageData, canvas.width, canvas.height);
  }

  const pro =
    options.pro === true ||
    (options.pro !== false && (options.forcePro || quality.recommendPro));

  let warped =
    (isOpenCvReady() &&
      warpWithOpenCv(canvas, absCorners, {
        maxWidth: options.outMaxDim || 2000,
        maxHeight: Math.round((options.outMaxDim || 2000) * 1.45),
      })) ||
    warpPerspective(canvas, absCorners, { maxDim: options.outMaxDim || 2000 });
  if (options.enhance !== false) {
    if (pro) enhanceScanPro(warped, quality);
    else enhanceScan(warped, { mode: options.mode || "document" });
  }
  const qualityJpeg = options.quality ?? recommendedJpegQuality({ pro });
  return {
    dataUrl: warped.toDataURL("image/jpeg", qualityJpeg),
    quality,
    pro,
  };
}
