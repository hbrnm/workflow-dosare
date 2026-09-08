// Comprimă o poză în browser (canvas) înainte de upload, ca fotografiile
// făcute direct cu telefonul (adesea 4-15MB) să nu mai fie respinse de
// limita de mărime și să se încarce rapid chiar și pe 4G.

async function loadBitmap(file) {
  if (typeof window !== "undefined" && window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch (err) {
      // unele browsere nu pot decoda direct anumite formate — cădem pe <img>
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nu am putut citi imaginea."));
    };
    img.src = url;
  });
}

export async function compressImage(file, { maxDim = 1920, quality = 0.82, format = "image/jpeg" } = {}) {
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
    if (!ctx) {
      canvas.width = 0;
      canvas.height = 0;
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    if (typeof bitmap.close === "function") bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));

    // Zero-memory canvas teardown pentru iOS WebKit / Safari PWA
    canvas.width = 0;
    canvas.height = 0;

    if (!blob || blob.size >= file.size) return file; // originalul era deja mic — nu merită înlocuit

    const ext = format === "image/webp" ? ".webp" : ".jpg";
    const newName = (file.name || "poza").replace(/\.[^.]+$/, "") + ext;
    return new File([blob], newName, { type: format, lastModified: Date.now() });
  } catch (err) {
    console.warn("Comprimare eșuată, se folosește fișierul original:", err);
    return file;
  }
}
