/**
 * Detecție 4 colțuri document (OpenCV / JS fallback) + geometrie quad.
 */

import { isOpenCvReady, loadOpenCv, prefetchScanEngine } from "./opencvLoader";
import {
  detectCornersOpenCv,
  detectCornersFromVideoOpenCv,
} from "./opencvDocumentDetect";

export { isOpenCvReady, loadOpenCv, prefetchScanEngine };

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

function scoreQuad(pts, w, h, options = {}) {
  if (!isConvexQuad(pts)) return -1;
  const area = quadArea(pts);
  const imgArea = w * h;
  const minArea = options.minAreaRatio ?? 0.12;
  const maxArea = options.maxAreaRatio ?? 0.98;
  if (area < imgArea * minArea || area > imgArea * maxArea) return -1;

  // Prefer roughly document-shaped aspect (A4-ish, but allow landscape)
  const wTop = dist(pts[0], pts[1]);
  const wBot = dist(pts[3], pts[2]);
  const hLeft = dist(pts[0], pts[3]);
  const hRight = dist(pts[1], pts[2]);
  const avgW = (wTop + wBot) / 2;
  const avgH = (hLeft + hRight) / 2;
  if (avgW < 40 || avgH < 40) return -1;
  const aspect = Math.max(avgW, avgH) / Math.min(avgW, avgH);
  const maxAspect = options.maxAspect ?? 3.5;
  if (aspect > maxAspect) return -1;

  // Reject quads that hug the full frame (common false lock on walls/floors)
  if (options.strict) {
    const marginX = Math.min(pts[0].x, pts[3].x, w - pts[1].x, w - pts[2].x);
    const marginY = Math.min(pts[0].y, pts[1].y, h - pts[2].y, h - pts[3].y);
    if (marginX < w * 0.02 || marginY < h * 0.02) return -1;
  }

  // Parallelism bonus
  const topAng = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  const botAng = Math.atan2(pts[2].y - pts[3].y, pts[2].x - pts[3].x);
  const leftAng = Math.atan2(pts[3].y - pts[0].y, pts[3].x - pts[0].x);
  const rightAng = Math.atan2(pts[2].y - pts[1].y, pts[2].x - pts[1].x);
  const parallel =
    1 -
    Math.min(1, Math.abs(topAng - botAng) / (Math.PI / 2)) * 0.5 -
    Math.min(1, Math.abs(leftAng - rightAng) / (Math.PI / 2)) * 0.5;

  if (options.strict && parallel < 0.4) return -1;

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

function pickBestQuadFromHull(hull, w, h, scoreOptions = {}) {
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
  const minScore = scoreOptions.minScore ?? 0.15;

  const n = simplified.length;
  if (n === 4) {
    const ordered = orderCorners(simplified);
    const s = scoreQuad(ordered, w, h, scoreOptions);
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
            const s = scoreQuad(ordered, w, h, scoreOptions);
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
    const s = scoreQuad(ordered, w, h, scoreOptions);
    if (s > bestScore) {
      bestScore = s;
      best = ordered;
    }
  }

  return bestScore >= minScore ? best : null;
}

/** Point-in-quad (barycentric via cross signs) for paper brightness check. */
function pointInQuad(px, py, pts) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (sign !== s) return false;
    }
  }
  return true;
}

/**
 * Verifică dacă quad-ul arată a hârtie: interior relativ deschis vs exterior.
 * Praguri moderate — pe telefon lumina variază mult.
 */
function looksLikePaperSheet(gray, w, h, corners, step = 4) {
  let inSum = 0;
  let inN = 0;
  let outSum = 0;
  let outN = 0;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const g = gray[y * w + x];
      if (pointInQuad(x, y, corners)) {
        inSum += g;
        inN += 1;
      } else {
        outSum += g;
        outN += 1;
      }
    }
  }
  if (inN < 12 || outN < 12) return false;
  const inMean = inSum / inN;
  const outMean = outSum / outN;
  // Interiorul trebuie să fie rezonabil deschis și mai luminos decât fundalul
  if (inMean < 105) return false;
  if (inMean - outMean < 10) return false;
  return true;
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
  const live = Boolean(options.live);
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

  // Percentilă ~70 pentru hârtie (mai robust decât mean+offset pe scene întunecate)
  const sample = [];
  const sampleStep = Math.max(2, Math.floor(Math.min(w, h) / 80));
  for (let y = 0; y < h; y += sampleStep) {
    for (let x = 0; x < w; x += sampleStep) {
      sample.push(gray[y * w + x]);
    }
  }
  sample.sort((a, b) => a - b);
  const p70 = sample[Math.floor(sample.length * 0.7)] || mean;

  // 2) Sobel pe subsample pentru muchii
  const step = Math.max(1, Math.floor(Math.min(w, h) / (live ? 240 : 280)));
  const edgePts = [];
  const brightPts = [];
  const paperThresh = live
    ? Math.max(mean + 14, p70 * 0.98, 118)
    : Math.max(mean + 12, mean * 1.05, 110);
  const edgeMag = live ? 85 : 90;

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

      if (mag > edgeMag) {
        edgePts.push({ x, y });
      }
      if (gray[i] >= paperThresh) {
        brightPts.push({ x, y });
      }
    }
  }

  const scoreOpts = live
    ? {
        strict: true,
        minAreaRatio: 0.12,
        maxAreaRatio: 0.92,
        maxAspect: 3.0,
        minScore: 0.22,
      }
    : {};

  // 3) Preferă muchii, apoi blob hârtie
  let corners = null;
  if (edgePts.length > (live ? 35 : 40)) {
    const hull = convexHull(edgePts);
    corners = pickBestQuadFromHull(hull, w, h, scoreOpts);
  }
  if (!corners && brightPts.length > (live ? 60 : 80)) {
    const hull = convexHull(brightPts);
    corners = pickBestQuadFromHull(hull, w, h, scoreOpts);
  }

  // 4) Bounding box pe zonă deschisă — OK și pe live dacă trece testul de hârtie
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
    const minFrac = live ? 0.18 : 0.25;
    const maxFrac = live ? 0.92 : 1;
    const bw = right - left;
    const bh = bottom - top;
    if (
      found &&
      bw > w * minFrac &&
      bh > h * minFrac &&
      bw < w * maxFrac &&
      bh < h * maxFrac
    ) {
      const pad = Math.round(Math.min(w, h) * 0.01);
      const box = orderCorners([
        { x: clamp(left - pad, 0, w - 1), y: clamp(top - pad, 0, h - 1) },
        { x: clamp(right + pad, 0, w - 1), y: clamp(top - pad, 0, h - 1) },
        { x: clamp(right + pad, 0, w - 1), y: clamp(bottom + pad, 0, h - 1) },
        { x: clamp(left - pad, 0, w - 1), y: clamp(bottom + pad, 0, h - 1) },
      ]);
      if (!live || looksLikePaperSheet(gray, w, h, box, step)) {
        corners = box;
      }
    }
  }

  if (corners && live && !looksLikePaperSheet(gray, w, h, corners, step)) {
    return null;
  }

  if (corners) return corners;
  return allowDefault ? defaultCorners(w, h, 0.06) : null;
}


