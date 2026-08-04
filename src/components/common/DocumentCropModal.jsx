import React, { useState, useRef, useEffect } from "react";
import { X, RotateCcw, RotateCw, Crop, Check, Sun, Contrast, FileCheck } from "lucide-react";

export default function DocumentCropModal({ imageSrc, onConfirm, onClose }) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [contrast, setContrast] = useState(120); // % contrast
  const [brightness, setBrightness] = useState(105); // % brightness
  const [grayscale, setGrayscale] = useState(false);
  const [crop, setCrop] = useState({ top: 5, bottom: 5, left: 5, right: 5 }); // % percentages

  const canvasRef = useRef(null);
  const [loadedImage, setLoadedImage] = useState(null);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.src = imageSrc;
  }, [imageSrc]);

  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  const applyAutoEnhance = () => {
    setContrast(140);
    setBrightness(110);
    setGrayscale(true);
  };

  const handleAutoCamScannerCrop = () => {
    if (!loadedImage) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const w = Math.min(800, loadedImage.width);
      const h = Math.round((loadedImage.height * w) / loadedImage.width);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(loadedImage, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let top = 0, bottom = h - 1, left = 0, right = w - 1;
      const step = 4;

      const rowBright = new Array(h).fill(0);
      const colBright = new Array(w).fill(0);

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

      const validRows = [...rowBright].filter(v => v > 0).sort((a, b) => a - b);
      const medianVal = validRows[Math.floor(validRows.length / 2)] || 128;
      const cutoff = Math.max(70, medianVal * 0.7);

      while (top < h * 0.25 && rowBright[top] < cutoff) top += step;
      while (bottom > h * 0.75 && rowBright[bottom] < cutoff) bottom -= step;
      while (left < w * 0.25 && colBright[left] < cutoff) left += step;
      while (right > w * 0.75 && colBright[right] < cutoff) right -= step;

      const cropTop = Math.max(0, Math.floor((top / h) * 100));
      const cropBottom = Math.max(0, Math.floor(((h - bottom) / h) * 100));
      const cropLeft = Math.max(0, Math.floor((left / w) * 100));
      const cropRight = Math.max(0, Math.floor(((w - right) / w) * 100));

      setCrop({ top: cropTop, bottom: cropBottom, left: cropLeft, right: cropRight });
      applyAutoEnhance();
    } catch (e) {
      applyAutoEnhance();
    }
  };

  const handleSave = () => {
    if (!loadedImage) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const isVertical = rotation === 90 || rotation === 270;
    const origW = isVertical ? loadedImage.height : loadedImage.width;
    const origH = isVertical ? loadedImage.width : loadedImage.height;

    // Calculate cropped region
    const cropX = Math.round((crop.left / 100) * origW);
    const cropY = Math.round((crop.top / 100) * origH);
    const cropW = Math.round(origW * (1 - (crop.left + crop.right) / 100));
    const cropH = Math.round(origH * (1 - (crop.top + crop.bottom) / 100));

    canvas.width = Math.max(10, cropW);
    canvas.height = Math.max(10, cropH);

    ctx.save();
    // Filters
    let filterStr = `contrast(${contrast}%) brightness(${brightness}%)`;
    if (grayscale) filterStr += ` grayscale(100%)`;
    ctx.filter = filterStr;

    // Apply rotation transformation
    ctx.translate(-cropX, -cropY);

    if (rotation === 90) {
      ctx.translate(loadedImage.height, 0);
      ctx.rotate((90 * Math.PI) / 180);
    } else if (rotation === 180) {
      ctx.translate(loadedImage.width, loadedImage.height);
      ctx.rotate((180 * Math.PI) / 180);
    } else if (rotation === 270) {
      ctx.translate(0, loadedImage.width);
      ctx.rotate((270 * Math.PI) / 180);
    }

    ctx.drawImage(loadedImage, 0, 0);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onConfirm(croppedDataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl bg-[#1E293B] text-white rounded-xl shadow-2xl overflow-hidden max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Scanare & Editare Document Pro</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-slate-950 relative min-h-[300px]">
          {loadedImage ? (
            <div className="relative max-w-full max-h-[50vh] flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Document preview"
                className="max-h-[45vh] max-w-full object-contain rounded border border-slate-700 transition-all"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: `contrast(${contrast}%) brightness(${brightness}%) ${grayscale ? "grayscale(100%)" : ""}`,
                  clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
                }}
              />
            </div>
          ) : (
            <div className="text-slate-400 text-sm">Se încarcă imaginea...</div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-[#0F172A] border-t border-slate-800 flex flex-col gap-3 text-xs">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRotateLeft}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                title="Rotește stânga"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 90°
              </button>
              <button
                onClick={handleRotateRight}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                title="Rotește dreapta"
              >
                <RotateCw className="w-3.5 h-3.5" /> 90°
              </button>
              <button
                onClick={handleAutoCamScannerCrop}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded shadow-sm"
                title="Detecție automată margini hârtie și decupare stil CamScanner"
              >
                <Crop className="w-3.5 h-3.5 text-white" /> ⚡ Auto-Crop CamScanner
              </button>
              <button
                onClick={applyAutoEnhance}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-700 rounded font-bold"
              >
                <Sun className="w-3.5 h-3.5 text-emerald-400" /> Scanner Alb/Negru Pro
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGrayscale(!grayscale)}
                className={`px-2.5 py-1.5 rounded border transition ${
                  grayscale ? "bg-amber-600 border-amber-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                Grayscale
              </button>
            </div>
          </div>

          {/* Sliders for Crop Margins */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Crop Sus: {crop.top}%</label>
              <input
                type="range"
                min="0"
                max="40"
                value={crop.top}
                onChange={(e) => setCrop({ ...crop, top: Number(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Crop Jos: {crop.bottom}%</label>
              <input
                type="range"
                min="0"
                max="40"
                value={crop.bottom}
                onChange={(e) => setCrop({ ...crop, bottom: Number(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Crop Stânga: {crop.left}%</label>
              <input
                type="range"
                min="0"
                max="40"
                value={crop.left}
                onChange={(e) => setCrop({ ...crop, left: Number(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Crop Dreapta: {crop.right}%</label>
              <input
                type="range"
                min="0"
                max="40"
                value={crop.right}
                onChange={(e) => setCrop({ ...crop, right: Number(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded font-medium"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition"
            >
              <Check className="w-4 h-4" /> Salvează Pagina Procesată
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
