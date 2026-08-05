import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, RotateCcw, Check, Sun, FileCheck, Sparkles, Move } from "lucide-react";
import {
  detectDocumentCorners,
  orderCorners,
  imageToCanvas,
  loadImageElement,
  applyCornerWarp,
} from "../../utils/documentScanner";

/**
 * Editor tip CamScanner: 4 colțuri tragabile + perspectivă + filtru scan.
 */
export default function DocumentCropModal({ imageSrc, onConfirm, onClose }) {
  const [loadedImage, setLoadedImage] = useState(null);
  const [corners, setCorners] = useState(null); // [{x,y}x4] in natural image coords
  const [dragging, setDragging] = useState(null); // corner index
  const [busy, setBusy] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [detecting, setDetecting] = useState(true);
  const stageRef = useRef(null);
  const [viewSize, setViewSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    if (!imageSrc) return;
    let cancelled = false;
    (async () => {
      let img = null;
      try {
        setDetecting(true);
        img = await loadImageElement(imageSrc);
        if (cancelled) return;
        setLoadedImage(img);

        const canvas = imageToCanvas(img, 1200);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const detected = detectDocumentCorners(data, canvas.width, canvas.height);
        // Scale corners to natural image size
        const sx = (img.naturalWidth || img.width) / canvas.width;
        const sy = (img.naturalHeight || img.height) / canvas.height;
        const scaled = orderCorners(
          detected.map((p) => ({ x: p.x * sx, y: p.y * sy }))
        );
        if (!cancelled) setCorners(scaled);
      } catch (err) {
        console.warn("Auto-detect corners failed:", err);
        if (!cancelled && img) {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          setCorners(
            orderCorners([
              { x: w * 0.08, y: h * 0.08 },
              { x: w * 0.92, y: h * 0.08 },
              { x: w * 0.92, y: h * 0.92 },
              { x: w * 0.08, y: h * 0.92 },
            ])
          );
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc]);

  const measureView = useCallback(() => {
    if (!stageRef.current || !loadedImage) return;
    const rect = stageRef.current.getBoundingClientRect();
    const natW = loadedImage.naturalWidth || loadedImage.width;
    const natH = loadedImage.naturalHeight || loadedImage.height;
    const scale = Math.min(rect.width / natW, rect.height / natH, 1);
    setViewSize({ w: natW * scale, h: natH * scale, scale, natW, natH });
  }, [loadedImage]);

  useEffect(() => {
    measureView();
    window.addEventListener("resize", measureView);
    return () => window.removeEventListener("resize", measureView);
  }, [measureView, loadedImage]);

  const toView = (p) => {
    const s = viewSize.scale || 1;
    return { x: p.x * s, y: p.y * s };
  };

  const fromClient = (clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect();
    const offsetX = (rect.width - viewSize.w) / 2;
    const offsetY = (rect.height - viewSize.h) / 2;
    const x = (clientX - rect.left - offsetX) / (viewSize.scale || 1);
    const y = (clientY - rect.top - offsetY) / (viewSize.scale || 1);
    return {
      x: Math.max(0, Math.min(viewSize.natW || 1, x)),
      y: Math.max(0, Math.min(viewSize.natH || 1, y)),
    };
  };

  const onPointerDown = (idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(idx);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (dragging === null || !corners) return;
    e.preventDefault();
    const pt = fromClient(e.clientX, e.clientY);
    setCorners((prev) => {
      const next = prev.map((c, i) => (i === dragging ? pt : c));
      return next;
    });
  };

  const onPointerUp = (e) => {
    if (dragging === null) return;
    e.preventDefault();
    setDragging(null);
  };

  const handleAutoDetect = async () => {
    if (!loadedImage) return;
    setDetecting(true);
    try {
      const canvas = imageToCanvas(loadedImage, 1200);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const detected = detectDocumentCorners(data, canvas.width, canvas.height);
      const sx = (loadedImage.naturalWidth || loadedImage.width) / canvas.width;
      const sy = (loadedImage.naturalHeight || loadedImage.height) / canvas.height;
      setCorners(orderCorners(detected.map((p) => ({ x: p.x * sx, y: p.y * sy }))));
    } finally {
      setDetecting(false);
    }
  };

  const handleResetFull = () => {
    if (!loadedImage) return;
    const w = loadedImage.naturalWidth || loadedImage.width;
    const h = loadedImage.naturalHeight || loadedImage.height;
    setCorners(
      orderCorners([
        { x: 2, y: 2 },
        { x: w - 2, y: 2 },
        { x: w - 2, y: h - 2 },
        { x: 2, y: h - 2 },
      ])
    );
  };

  const handleSave = async () => {
    if (!imageSrc || !corners) return;
    setBusy(true);
    try {
      const dataUrl = await applyCornerWarp(imageSrc, corners, {
        maxDim: 2200,
        outMaxDim: 1800,
        enhance,
        mode: "document",
        quality: 0.85,
        sourceWidth: loadedImage?.naturalWidth || loadedImage?.width,
        sourceHeight: loadedImage?.naturalHeight || loadedImage?.height,
      });
      onConfirm(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Nu am putut procesa pagina: " + (err.message || "eroare"));
    } finally {
      setBusy(false);
    }
  };

  const labels = ["ST", "DR", "DJ", "SJ"]; // sus-stânga, sus-dreapta, jos-dreapta, jos-stânga

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-3xl bg-[#1C2127] text-white rounded-2xl shadow-2xl overflow-hidden max-h-[96vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#14181D] border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#C98A2B]" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Scanare document</h3>
              <p className="text-[10.5px] text-white/50 font-medium">
                Trage cele 4 colțuri pe colțurile albe ale paginii
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={stageRef}
          className="relative flex-1 min-h-[320px] sm:min-h-[420px] bg-[#0B0E11] flex items-center justify-center overflow-hidden touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {loadedImage ? (
            <div
              className="relative"
              style={{ width: viewSize.w, height: viewSize.h }}
            >
              <img
                src={imageSrc}
                alt="Document"
                draggable={false}
                className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
              />

              {/* Dark overlay outside quad via SVG mask */}
              {corners && viewSize.scale && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
                >
                  <defs>
                    <mask id="doc-quad-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <polygon
                        fill="black"
                        points={corners
                          .map(toView)
                          .map((p) => `${p.x},${p.y}`)
                          .join(" ")}
                      />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#doc-quad-mask)"
                  />
                  <polygon
                    fill="none"
                    stroke="#C98A2B"
                    strokeWidth="2.5"
                    points={corners
                      .map(toView)
                      .map((p) => `${p.x},${p.y}`)
                      .join(" ")}
                  />
                  {corners.map((c, i) => {
                    const next = corners[(i + 1) % 4];
                    const a = toView(c);
                    const b = toView(next);
                    return (
                      <line
                        key={`edge-${i}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#C98A2B"
                        strokeWidth="2"
                        strokeOpacity="0.9"
                      />
                    );
                  })}
                </svg>
              )}

              {/* Corner handles */}
              {corners &&
                corners.map((c, idx) => {
                  const v = toView(c);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onPointerDown={(e) => onPointerDown(idx, e)}
                      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center touch-none ${
                        dragging === idx ? "scale-110" : ""
                      }`}
                      style={{ left: v.x, top: v.y }}
                      aria-label={`Colț ${labels[idx]}`}
                    >
                      <span className="w-7 h-7 rounded-full bg-[#C98A2B] border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-black text-white">
                        {labels[idx]}
                      </span>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="text-white/50 text-sm font-semibold">Se încarcă imaginea...</div>
          )}

          {(detecting || busy) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <div className="px-4 py-2 rounded-xl bg-[#1C2127] border border-white/10 text-[12px] font-bold text-white">
                {busy ? "Se aplică perspectiva..." : "Detectez colțurile paginii..."}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-[#14181D] border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={detecting || busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C98A2B] hover:bg-[#B37A22] text-white text-[11.5px] font-extrabold disabled:opacity-50"
            >
              <Sparkles size={13} /> Auto-detect colțuri
            </button>
            <button
              type="button"
              onClick={handleResetFull}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11.5px] font-bold"
            >
              <RotateCcw size={13} /> Tot cadrul
            </button>
            <button
              type="button"
              onClick={() => setEnhance((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold border transition ${
                enhance
                  ? "bg-emerald-900/50 border-emerald-600 text-emerald-200"
                  : "bg-white/5 border-white/15 text-white/70"
              }`}
            >
              <Sun size={13} /> {enhance ? "Filtru scan ON" : "Filtru scan OFF"}
            </button>
            <div className="flex items-center gap-1 text-[10.5px] text-white/45 font-medium ml-auto">
              <Move size={12} /> Ajustează colțurile pe hârtie
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-[12.5px] font-bold text-white/60 hover:text-white hover:bg-white/10"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !corners}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12.5px] font-extrabold shadow disabled:opacity-50"
            >
              <Check size={15} /> {busy ? "Se procesează..." : "Confirmă pagina"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
