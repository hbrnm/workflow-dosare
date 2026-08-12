/**
 * Utilitare PDF și conversii de elemente de imagine / canvas.
 */

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
 * Adaugă o pagină scanată în PDF A4, păstrând proporțiile (stil scaner pro).
 * Nu întinde imaginea pe tot A4 — o centrează cu margini albe mici.
 */
export async function addScannedPageToPdf(pdf, dataUrl, options = {}) {
  const marginMm = options.marginMm ?? 4;
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const maxW = pdfW - marginMm * 2;
  const maxH = pdfH - marginMm * 2;

  const img = await loadImageElement(dataUrl);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    pdf.addImage(dataUrl, "JPEG", marginMm, marginMm, maxW, maxH);
    return;
  }

  const scale = Math.min(maxW / iw, maxH / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const x = (pdfW - drawW) / 2;
  const y = (pdfH - drawH) / 2;
  pdf.addImage(dataUrl, "JPEG", x, y, drawW, drawH);
}

/**
 * Construiește un Blob PDF A4 din pagini scanate (dataURL JPEG).
 */
export async function buildScanPdfBlob(pages, options = {}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    await addScannedPageToPdf(pdf, pages[i], options);
  }
  return pdf.output("blob");
}
