// Procesează o pagină scanată: auto-crop CamScanner, contrast ridicat, compresie JPEG.

export function processScanImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const rawCanvas = document.createElement("canvas");
          const rawCtx = rawCanvas.getContext("2d");

          const MAX_DIM = 1600;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          rawCanvas.width = w;
          rawCanvas.height = h;
          rawCtx.drawImage(img, 0, 0, w, h);

          const imgData = rawCtx.getImageData(0, 0, w, h);
          const data = imgData.data;

          let top = 0, bottom = h - 1, left = 0, right = w - 1;
          const rowBright = new Array(h).fill(0);
          const colBright = new Array(w).fill(0);
          const step = 4;

          for (let y = 0; y < h; y += step) {
            let sum = 0, cnt = 0;
            for (let x = 0; x < w; x += step) {
              const idx = (y * w + x) * 4;
              sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              cnt++;
            }
            rowBright[y] = sum / cnt;
          }

          for (let x = 0; x < w; x += step) {
            let sum = 0, cnt = 0;
            for (let y = 0; y < h; y += step) {
              const idx = (y * w + x) * 4;
              sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              cnt++;
            }
            colBright[x] = sum / cnt;
          }

          const validRows = [...rowBright].filter((v) => v > 0).sort((a, b) => a - b);
          const medianVal = validRows[Math.floor(validRows.length / 2)] || 128;
          const cutoff = Math.max(70, medianVal * 0.7);

          while (top < h * 0.25 && rowBright[top] < cutoff) top += step;
          while (bottom > h * 0.75 && rowBright[bottom] < cutoff) bottom -= step;
          while (left < w * 0.25 && colBright[left] < cutoff) left += step;
          while (right > w * 0.75 && colBright[right] < cutoff) right -= step;

          const cropX = Math.max(0, left);
          const cropY = Math.max(0, top);
          const cropW = Math.max(100, right - left + 1);
          const cropH = Math.max(100, bottom - top + 1);

          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = cropW;
          finalCanvas.height = cropH;
          const finalCtx = finalCanvas.getContext("2d");

          finalCtx.drawImage(rawCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const croppedData = finalCtx.getImageData(0, 0, cropW, cropH);
          const pixels = croppedData.data;
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (lum > 120) {
              lum = Math.min(255, lum * 1.25);
            } else {
              lum = Math.max(0, lum * 0.75);
            }
            pixels[i] = lum;
            pixels[i + 1] = lum;
            pixels[i + 2] = lum;
          }
          finalCtx.putImageData(croppedData, 0, 0);

          resolve(finalCanvas.toDataURL("image/jpeg", 0.65));
        } catch (err) {
          reject(new Error("Eroare la autocropare și procesare scan."));
        }
      };
      img.onerror = () => reject(new Error("Eroare la încărcarea imaginii."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Eroare la citirea imaginii."));
    reader.readAsDataURL(file);
  });
}

export const PHOTO_CATEGORIES = [
  { key: "receptie", label: "Recepție", color: "bg-[#C98A2B]" },
  { key: "reconstatare", label: "Reconstatare", color: "bg-[#3B5166]" },
  { key: "predare", label: "Predare", color: "bg-[#3E6B45]" },
];

export function categoryLabel(categoria) {
  if (categoria === "receptie") return "RECEPȚIE";
  if (categoria === "reconstatare") return "RECONST.";
  if (categoria === "predare") return "PREDARE";
  if (categoria === "generale") return "GENERAL";
  return null;
}
