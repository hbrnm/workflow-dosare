import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Zap, ZapOff, Check, Trash2, RotateCcw, FileText, Camera } from "lucide-react";
import DocumentCropModal from "./DocumentCropModal";

/**
 * Scanner documente — flux tip aplicație pro, fără overlay live (slab pe PWA):
 * 1) Cameră + cadru-ghid A4
 * 2) Captură foto
 * 3) Detecție / ajustare colțuri pe poza statică (DocumentCropModal)
 * 4) Warp + Pro enhance → pagină curată pentru PDF
 */
export default function LiveDocumentScanner({ onComplete, onClose, initialPages = [] }) {
  const [pages, setPages] = useState(() => [...initialPages]);
  const [flash, setFlash] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [pendingCrop, setPendingCrop] = useState(null);
  const [capturing, setCapturing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
          setTorchSupported(Boolean(caps.torch));
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Document scanner camera failed:", err);
        if (!cancelled) setCameraError("Nu am putut deschide camera. Verifică permisiunile.");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      } else if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (capturingRef.current || pendingCrop) return;
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;

    capturingRef.current = true;
    setCapturing(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 100);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      // Calitate mare pentru warp + enhance ulterior
      const imageSrc = canvas.toDataURL("image/jpeg", 0.95);
      setPendingCrop({ imageSrc });
    } catch (err) {
      console.error(err);
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }, [pendingCrop]);

  const setTorch = async (on) => {
    const track = streamRef.current?.getVideoTracks?.()?.[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      setTorchOn(on);
    } catch (err) {
      console.warn("Torch not available:", err);
      setTorchSupported(false);
    }
  };

  const handleCropConfirm = (croppedDataUrl) => {
    setPages((prev) => [...prev, croppedDataUrl]);
    setPendingCrop(null);
  };

  const handleCropClose = () => {
    setPendingCrop(null);
  };

  const removeLastPage = () => {
    setPages((prev) => prev.slice(0, -1));
  };

  const removePageAt = (idx) => {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const finish = () => {
    if (pages.length === 0) {
      onClose();
      return;
    }
    onComplete(pages);
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black flex flex-col text-white overflow-hidden select-none">
        <div className="w-full flex items-center justify-between px-3 py-2.5 bg-black/90 z-20 shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-[#C98A2B] shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold truncate">Scanner documente</div>
              <div className="text-[10px] text-white/55 font-semibold">
                {pages.length === 0
                  ? "Încadrează foaia în cadru → fotografiază → ajustează colțurile"
                  : `${pages.length} pagin${pages.length === 1 ? "ă" : "i"} · continuă sau Gata`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {torchSupported && (
              <button
                type="button"
                onClick={() => setTorch(!torchOn)}
                className={`p-2 rounded-full transition-colors ${
                  torchOn ? "bg-[#C98A2B] text-white" : "bg-white/10 hover:bg-white/20"
                }`}
                title={torchOn ? "Oprește lanterna" : "Lanternă"}
              >
                {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              title="Închide"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative flex-1 w-full bg-black overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80 font-semibold">
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )}

          {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none" />}

          {/* Cadru-ghid fix A4 — fără detecție live */}
          {!cameraError && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full max-w-[300px] aspect-[210/297]">
                <div className="absolute inset-0 border-[2.5px] border-[#F5C451] rounded-sm shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                {/* Corner marks */}
                <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-[3px] border-l-[3px] border-white" />
                <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-[3px] border-r-[3px] border-white" />
                <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-[3px] border-l-[3px] border-white" />
                <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-[3px] border-r-[3px] border-white" />
              </div>
            </div>
          )}

          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full text-[11px] font-extrabold border bg-black/60 border-white/20 text-white/85 backdrop-blur-md">
            Aliniază pagina în chenar, apoi fotografiază
          </div>

          {pages.length > 0 && (
            <div className="absolute bottom-3 left-0 right-0 z-20 px-3 flex gap-2 overflow-x-auto scrollbar-thin">
              {pages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative shrink-0 w-14 h-[76px] rounded-lg overflow-hidden border border-white/30 bg-black shadow-md"
                >
                  <img src={url} alt={`Pag ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 bg-black/75 text-[9px] font-mono font-bold px-1 rounded">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePageAt(idx)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-[#B23A2E] text-white"
                    title="Șterge pagina"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full py-5 px-5 bg-black/95 z-20 flex items-center justify-between shrink-0 border-t border-white/10">
          <button
            type="button"
            onClick={removeLastPage}
            disabled={pages.length === 0}
            className="w-[72px] flex flex-col items-center gap-1 text-[10px] font-bold text-white/70 disabled:opacity-30"
            title="Șterge ultima pagină"
          >
            <RotateCcw size={20} />
            Refă
          </button>

          <button
            type="button"
            onClick={captureFrame}
            disabled={Boolean(cameraError) || Boolean(pendingCrop) || capturing}
            className="w-[76px] h-[76px] rounded-full border-[4px] border-white flex items-center justify-center active:scale-90 transition-transform bg-white/10 disabled:opacity-40"
            title="Fotografiază pagina"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center">
              <Camera size={22} className="text-black" />
            </div>
          </button>

          <button
            type="button"
            onClick={finish}
            className={`min-w-[72px] px-3 py-2.5 rounded-xl font-extrabold text-[12px] flex flex-col items-center gap-0.5 shadow-md transition-colors ${
              pages.length > 0
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-white/10 text-white/60"
            }`}
          >
            <Check size={18} />
            {pages.length > 0 ? `Gata (${pages.length})` : "Ieși"}
          </button>
        </div>
      </div>

      {pendingCrop && (
        <DocumentCropModal
          imageSrc={pendingCrop.imageSrc}
          onConfirm={handleCropConfirm}
          onClose={handleCropClose}
        />
      )}
    </>
  );
}
