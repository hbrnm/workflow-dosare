import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";

/**
 * CanvasSignaturePad — Componentă tactilă ultra-fluidă pentru semnătură digitală pe ecran/mobil.
 * Suportă scalare la rezoluție înaltă (Retina / DPR), evenimente touch și mouse.
 */
export default function CanvasSignaturePad({
  onSignatureChange,
  className = "",
  strokeColor = "#1E293B",
  lineWidth = 2.5,
  height = 160,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Scalare canvas pentru afișaje retina/mobile
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }, [strokeColor, lineWidth]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (onSignatureChange && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onSignatureChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setIsEmpty(true);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className="relative w-full rounded-xl border border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-inner touch-none select-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />

        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5 opacity-60">
            <PenTool size={20} className="animate-pulse" />
            <span className="text-xs font-medium">Semnează aici cu degetul sau stylus-ul</span>
          </div>
        )}

        {/* Linia de bază a semnăturii */}
        <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-slate-500 font-medium">
          {isEmpty ? "Semnătură nesalvată" : "Semnătură capturată ✓"}
        </span>
        <button
          type="button"
          onClick={clearSignature}
          disabled={isEmpty}
          className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none font-medium transition-colors"
        >
          <RotateCcw size={12} />
          <span>Șterge &amp; Reîncearcă</span>
        </button>
      </div>
    </div>
  );
}
