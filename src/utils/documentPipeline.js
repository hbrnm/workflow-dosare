/**
 * Pipeline complet de scanare / procesare documente.
 */

import { isOpenCvReady } from "./opencvLoader";
import { warpWithOpenCv } from "./opencvDocumentDetect";
import { detectDocumentCorners } from "./documentDetect";
import {
  warpPerspective,
  enhanceScan,
  analyzeImageQuality,
  enhanceScanPro,
  recommendedJpegQuality,
} from "./documentWarp";
import { fileToDataUrl, loadImageElement, imageToCanvas } from "./documentPdf";

/**
 * Pipeline complet: detect → warp → enhance (auto Pro) → JPEG dataURL
 */
export async function processDocumentScan(file, options = {}) {
  // Do not load OpenCV here — it freezes mobile PWAs. Use JS pipeline;
  // OpenCV warp is used only if the engine was already loaded elsewhere.
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
  // Never auto-load OpenCV on confirm — keeps crop UI responsive on phones.
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
