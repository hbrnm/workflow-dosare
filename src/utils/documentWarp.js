/**
 * Transformare de perspectivă (homografie 3x3) + post-procesare / filtrare scan (levels/contrast/pro).
 */

import { orderCorners } from "./documentDetect";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

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

/** Filtru scan: hârtie albă, text contrastat (fără a spăla griurile medii). */
export function enhanceScan(canvas, { mode = "document" } = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = img.data;

  if (mode === "photo") {
    for (let i = 0; i < p.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let v = p[i + c];
        v = (v - 128) * 1.12 + 128;
        p[i + c] = clamp(v, 0, 255);
      }
    }
  } else {
    const levels = estimateDocumentLevels(p);
    for (let i = 0; i < p.length; i += 4) {
      const lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
      const v = applyDocumentLevels(lum, levels);
      p[i] = v;
      p[i + 1] = v;
      p[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Estimează puncte negru/alb din histogramă (hârtie + cerneală).
 * Exportat pentru teste.
 */
export function estimateDocumentLevels(rgba, sampleStep = 4) {
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < rgba.length; i += 4 * sampleStep) {
    const lum = Math.round(
      0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]
    );
    hist[clamp(lum, 0, 255)]++;
    count++;
  }
  if (!count) {
    return { black: 20, white: 235, mean: 128, p10: 40, p90: 220 };
  }

  const percentile = (pct) => {
    const target = (pct / 100) * count;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= target) return v;
    }
    return 255;
  };

  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  const mean = sum / count;

  const p5 = percentile(5);
  const p10 = percentile(10);
  const p90 = percentile(90);
  const p95 = percentile(95);

  // Ink / paper anchors — keep a usable range even on washed photos
  let black = Math.min(p10, p5 + 8);
  let white = Math.max(p90, p95 - 6);

  // Already-bright / flash photos: pull white point down so stretch darkens midtones
  if (mean > 175 || p90 > 245) {
    black = Math.min(black, Math.max(12, p5));
    white = Math.min(white, 232);
  }
  // Dark photos: don't crush; lift black slightly via stretch target, not additive lift
  if (mean < 95) {
    black = Math.max(8, Math.min(black, 35));
    white = Math.max(white, 200);
  }

  if (white - black < 48) {
    const mid = (black + white) / 2;
    black = clamp(mid - 40, 0, 200);
    white = clamp(mid + 40, 55, 255);
  }

  return { black, white, mean, p10, p90 };
}

/**
 * Mapează luminanța pe interval tip scan (text închis, hârtie aproape albă).
 * Fără paperLift global — cauza principală a paginilor „prea deschise”.
 */
export function applyDocumentLevels(lum, levels, opts = {}) {
  const black = levels.black ?? 25;
  const white = levels.white ?? 230;
  const inkTarget = opts.inkTarget ?? 18;
  const paperTarget = opts.paperTarget ?? 248;
  const span = Math.max(1, white - black);

  // Normalize 0..1 within document range
  let t = clamp((lum - black) / span, 0, 1);

  // Midtones slightly darker so gray print / stamps stay visible on bright pages
  const gamma = opts.midGamma ?? 1.15;
  t = Math.pow(t, gamma);

  // Soft ends: keep ink near black, paper near white
  const shaped = t * t * (3 - 2 * t);
  const blended = t * 0.55 + shaped * 0.45;

  return clamp(inkTarget + blended * (paperTarget - inkTarget), 0, 255);
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
 * Pro mode: levels adaptive (fără paper-lift) + unsharp pentru text clar.
 */
export function enhanceScanPro(canvas, qualityHints = {}) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const n = w * h;

  const levels = estimateDocumentLevels(p);
  // Prefer live quality hints when available (mean/overexposure)
  if (Number.isFinite(qualityHints.meanBrightness)) {
    levels.mean = qualityHints.meanBrightness;
  }
  const overexposed =
    (qualityHints.issues || []).some((i) => i.code === "overexposed") ||
    levels.mean > 185 ||
    (qualityHints.brightRatio || 0) > 0.5;
  const needsSharpen =
    (qualityHints.blurMetric ?? 999) < 220 ||
    (qualityHints.issues || []).some((i) => i.code === "blur") ||
    (qualityHints.contrast ?? 50) < 42;

  const levelOpts = {
    inkTarget: overexposed ? 12 : 16,
    paperTarget: overexposed ? 242 : 250,
    midGamma: overexposed ? 1.28 : 1.18,
  };

  const gray = new Float32Array(n);
  for (let i = 0, px = 0; i < p.length; i += 4, px++) {
    const lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
    gray[px] = applyDocumentLevels(lum, levels, levelOpts);
  }

  const out = new Float32Array(n);
  if (needsSharpen) {
    const amount = overexposed ? 1.15 : 1.05;
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
  return pro ? 0.95 : 0.9;
}
