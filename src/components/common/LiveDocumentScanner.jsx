import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Zap, ZapOff, Check, Trash2, RotateCcw, FileText, Loader2 } from "lucide-react";
import {
  detectCornersFromVideoFrame,
  isOpenCvReady,
  loadOpenCv,
} from "../../utils/documentScanner";
import DocumentCropModal from "./DocumentCropModal";

/** Mapează punct din frame video (object-cover) → coordonate pe containerul de display. */
function mapVideoPointToDisplay(px, py, videoW, videoH, displayW, displayH) {
  const scale = Math.max(displayW / videoW, displayH / videoH);
  const drawnW = videoW * scale;
  const drawnH = videoH * scale;
  const offsetX = (displayW - drawnW) / 2;
  const offsetY = (displayH - drawnH) / 2;
  return { x: px * scale + offsetX, y: py * scale + offsetY };
}

/**
 * Scanner document live tip CamScanner / QuickScan:
 * OpenCV edge detect + overlay + multi-pagină + crop după shutter.
 */
export default function LiveDocumentScanner({ onComplete, onClose, initialPages = [] }) {
  const [pages, setPages] = useState(() => [...initialPages]);
  const [liveCorners, setLiveCorners] = useState(null);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [pendingCrop, setPendingCrop] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });
  const [engineReady, setEngineReady] = useState(isOpenCvReady());
  const [engineError, setEngineError] = useState(null);
  const [engineLoading, setEngineLoading] = useState(!isOpenCvReady());
  const [autoCapture, setAutoCapture] = useState(true);
  const [lockStreak, setLockStreak] = useState(0);

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const streamRef = useRef(null);
  const detectBusyRef = useRef(false);
  const liveCornersRef = useRef(null);
  const pausedRef = useRef(false);
  const capturingRef = useRef(false);
  const lockStreakRef = useRef(0);

  useEffect(() => {
    liveCornersRef.current = liveCorners;
  }, [liveCorners]);

  const measureStage = useCallback(() => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setDisplaySize({ w: rect.width, h: rect.height });
  }, []);

  useEffect(() => {
    measureStage();
    window.addEventListener("resize", measureStage);
    return () => window.removeEventListener("resize", measureStage);
  }, [measureStage]);

  // Start camera immediately. Load OpenCV in parallel with timeout —
  // never block the scanner UI on CDN/init forever.
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
          measureStage();
        }
      } catch (err) {
        console.warn("Live document scanner camera failed:", err);
        if (!cancelled) setCameraError("Nu am putut deschide camera. Verifică permisiunile.");
      }
    }

    async function startEngine() {
      if (isOpenCvReady()) {
        if (!cancelled) {
          setEngineReady(true);
          setEngineLoading(false);
        }
        return;
      }
      if (!cancelled) setEngineLoading(true);
      try {
        await loadOpenCv({ timeoutMs: 15000 });
        if (!cancelled) {
          setEngineReady(true);
          setEngineError(null);
        }
      } catch (err) {
        console.warn("OpenCV unavailable, using JS detection:", err);
        if (!cancelled) {
          setEngineReady(false);
          setEngineError("OpenCV indisponibil — scanare cu detecție de rezervă");
        }
      } finally {
        if (!cancelled) setEngineLoading(false);
      }
    }

    startCamera();
    startEngine();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      } else if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [measureStage]);

  const captureFrame = useCallback(() => {
    if (capturingRef.current || pausedRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;

    capturingRef.current = true;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 100);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const imageSrc = canvas.toDataURL("image/jpeg", 0.94);
    const corners = liveCornersRef.current
      ? liveCornersRef.current.map((p) => ({ ...p }))
      : null;

    pausedRef.current = true;
    lockStreakRef.current = 0;
    setLockStreak(0);
    setPendingCrop({ imageSrc, corners });
    capturingRef.current = false;
  }, []);

  // Continuous detection ~7 FPS
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (
        video &&
        !pausedRef.current &&
        !detectBusyRef.current &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        detectBusyRef.current = true;
        try {
          const corners = detectCornersFromVideoFrame(video, engineReady ? 720 : 420);
          if (!cancelled && !pausedRef.current) {
            const found = Boolean(corners);
            setLiveCorners(corners);
            setLocked(found);
            if (found) {
              lockStreakRef.current += 1;
              setLockStreak(lockStreakRef.current);
              // Auto-capture after ~1s of stable lock (CamScanner-like)
              if (autoCapture && engineReady && lockStreakRef.current >= 7) {
                captureFrame();
              }
            } else {
              lockStreakRef.current = 0;
              setLockStreak(0);
            }
          }
        } catch {
          /* ignore frame errors */
        } finally {
          detectBusyRef.current = false;
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, 140);
    };

    timer = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [autoCapture, captureFrame, engineReady]);

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
    pausedRef.current = false;
    setLiveCorners(null);
    setLocked(false);
    lockStreakRef.current = 0;
    setLockStreak(0);
  };

  const handleCropClose = () => {
    setPendingCrop(null);
    pausedRef.current = false;
    lockStreakRef.current = 0;
    setLockStreak(0);
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

  const video = videoRef.current;
  const vw = video?.videoWidth || 1;
  const vh = video?.videoHeight || 1;
  const displayCorners =
    liveCorners &&
    liveCorners.map((p) =>
      mapVideoPointToDisplay(p.x, p.y, vw, vh, displaySize.w, displaySize.h)
    );

  const polyPoints = displayCorners
    ? displayCorners.map((p) => `${p.x},${p.y}`).join(" ")
    : "";

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black flex flex-col text-white overflow-hidden select-none">
        <div className="w-full flex items-center justify-between px-3 py-2.5 bg-black/90 z-20 shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-[#C98A2B] shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold truncate">Scanner documente</div>
              <div className="text-[10px] text-white/55 font-semibold">
                {engineLoading
                  ? "Se încarcă motorul OpenCV…"
                  : engineReady
                    ? pages.length === 0
                      ? "Încadrează pagina — detectare OpenCV activă"
                      : `${pages.length} pagin${pages.length === 1 ? "ă" : "i"} · continuă sau Gata`
                    : "Mod redus (fără OpenCV) — verifică rețeaua"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoCapture((v) => !v)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border transition-colors ${
                autoCapture
                  ? "bg-emerald-600/30 border-emerald-400/40 text-emerald-300"
                  : "bg-white/10 border-white/15 text-white/60"
              }`}
              title="Captură automată când documentul e detectat stabil"
            >
              Auto {autoCapture ? "ON" : "OFF"}
            </button>
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

        <div ref={stageRef} className="relative flex-1 w-full bg-black overflow-hidden">
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
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={measureStage}
            />
          )}

          {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none" />}

          {engineLoading && (
            <div className="absolute top-12 left-3 right-3 z-30 flex items-center gap-2 rounded-xl bg-black/70 border border-white/15 px-3 py-2 pointer-events-none">
              <Loader2 className="w-4 h-4 text-[#C98A2B] animate-spin shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-white">Se încarcă OpenCV…</div>
                <div className="text-[10px] text-white/60 font-semibold">
                  Poți scana acum; detecția se îmbunătățește când motorul e gata.
                </div>
              </div>
            </div>
          )}

          {displayCorners && (
            <svg
              className="absolute inset-0 w-full h-full z-10 pointer-events-none"
              viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
              preserveAspectRatio="none"
            >
              <polygon
                points={polyPoints}
                fill="rgba(201, 138, 43, 0.18)"
                stroke={locked ? "#34d399" : "#C98A2B"}
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {displayCorners.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="7"
                  fill="#fff"
                  stroke={locked ? "#34d399" : "#C98A2B"}
                  strokeWidth="2.5"
                />
              ))}
            </svg>
          )}

          <div
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-[11px] font-extrabold border backdrop-blur-md transition-colors ${
              locked
                ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300"
                : "bg-black/55 border-white/15 text-white/70"
            }`}
          >
            {locked
              ? autoCapture && lockStreak > 0
                ? `Document detectat · auto ${Math.min(100, Math.round((lockStreak / 7) * 100))}%`
                : "Document detectat"
              : "Caută marginile documentului…"}
          </div>

          {engineError && !engineLoading && (
            <div className="absolute top-12 left-3 right-3 z-20 text-center text-[10px] font-bold text-amber-300/90 bg-black/50 rounded-lg px-2 py-1">
              {engineError}
            </div>
          )}

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
            disabled={Boolean(cameraError) || Boolean(pendingCrop)}
            className="w-[76px] h-[76px] rounded-full border-[4px] border-white flex items-center justify-center active:scale-90 transition-transform bg-white/10 disabled:opacity-40"
            title="Capturează pagină"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-white" />
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
          initialCorners={pendingCrop.corners}
          onConfirm={handleCropConfirm}
          onClose={handleCropClose}
        />
      )}
    </>
  );
}
