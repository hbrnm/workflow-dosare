// Comprimă o poză în browser (canvas) înainte de upload, ca fotografiile
// făcute direct cu telefonul (adesea 4-15MB) să nu mai fie respinse de
// limita de mărime și să se încarce rapid chiar și pe 4G.

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch (err) {
      // unele browsere nu pot decoda direct HEIC prin createImageBitmap — cădem pe <img>
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nu am putut citi imaginea."));
    img.src = url;
  });
}

export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;

  try {
    const bitmap = await loadBitmap(file);
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    if (typeof bitmap.close === "function") bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // originalul era deja mic — nu merită înlocuit

    const newName = (file.name || "poza").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch (err) {
    console.warn("Comprimare eșuată, se încarcă fotografia originală:", err);
    return file;
  }
}
