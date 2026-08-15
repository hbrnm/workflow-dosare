import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, AlertCircle, RefreshCw } from "lucide-react";
import { PHOTO_CATEGORIES } from "../../utils/scanUtils";
import { useModalEscape } from "../../hooks/useModalEscape";
import { compressImage } from "../../utils/imageUtils";
import "../../styles/liveCamera.css";

export default function LiveStreamCameraModal({
  initialCategorie = "receptie",
  initialStream = null,
  onSavePhoto,
  onClose,
}) {
  const [categorie, setCategorie] = useState(initialCategorie);
  const [photoCount, setPhotoCount] = useState(0);
  const [lastThumbUrl, setLastThumbUrl] = useState(null);
  const [flash, setFlash] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const thumbUrlRef = useRef(null);
  const aliveRef = useRef(true);
  const flashTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  useModalEscape(onClose);

  useEffect(() => {
    setCategorie(initialCategorie);
  }, [initialCategorie]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
        streamRef.current?.removeTrack(t);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStream = useCallback((stream) => {
    if (!aliveRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera video nu este suportată de acest browser.");
      return;
    }

    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          advanced: [{ focusMode: "continuous" }]
        },
        audio: false,
      });
      attachStream(stream);
    } catch (err) {
      console.warn("Camera video stream failed:", err);
      setCameraError("Permisiunea camerei a fost refuzată sau camera este indisponibilă.");
    }
  }, [attachStream, stopStream]);

  useEffect(() => {
    aliveRef.current = true;

    if (initialStream) attachStream(initialStream);
    else startCamera();

    // Reia stream-ul la revenirea din background pe telefoane mobile (iOS Safari / Android)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && aliveRef.current && !streamRef.current) {
        startCamera();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      stopStream();
      if (thumbUrlRef.current) {
        URL.revokeObjectURL(thumbUrlRef.current);
        thumbUrlRef.current = null;
      }
    };
  }, [initialStream, startCamera, attachStream, stopStream]);

  const setThumbFromBlob = (blob) => {
    if (!blob || !aliveRef.current) return;
    const nextUrl = URL.createObjectURL(blob);
    if (thumbUrlRef.current) URL.revokeObjectURL(thumbUrlRef.current);
    thumbUrlRef.current = nextUrl;
    setLastThumbUrl(nextUrl);
  };

  const capturePhotoInstantly = async () => {
    if (!videoRef.current || !aliveRef.current || !cameraReady) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch {
      /* ignore */
    }

    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      if (aliveRef.current) setFlash(false);
      flashTimerRef.current = null;
    }, 120);

    try {
      const video = videoRef.current;
      if (!video) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        // Zero-memory cleanup pe WebKit
        canvas.width = 0;
        canvas.height = 0;

        if (!blob || !aliveRef.current) return;
        try {
          setThumbFromBlob(blob);
          const file = new File([blob], `Foto_${categorie}_${Date.now()}.jpg`, { type: "image/jpeg" });
          if (aliveRef.current) setPhotoCount((c) => c + 1);
          if (typeof onSavePhoto === "function") {
            await onSavePhoto([file], categorie);
          }
        } catch (err) {
          console.error("Camera save failed:", err);
        }
      }, "image/jpeg", 0.95);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNativeFallbackInput = async (e) => {
    if (!e.target.files || !e.target.files.length) return;
    const rawFiles = Array.from(e.target.files);
    try {
      const optimizedFiles = [];
      for (const file of rawFiles) {
        const opt = await compressImage(file, { maxDim: 1800, quality: 0.80 });
        optimizedFiles.push(opt);
        setThumbFromBlob(opt);
      }
      if (aliveRef.current) setPhotoCount((c) => c + optimizedFiles.length);
      if (typeof onSavePhoto === "function") {
        await onSavePhoto(optimizedFiles, categorie);
      }
    } catch (err) {
      console.error("Native capture save error:", err);
    }
  };

  const activeCat = PHOTO_CATEGORIES.find((c) => c.key === categorie);

  return (
    <div className="live-cam fixed inset-0 z-[10000] bg-black text-white overflow-hidden select-none">
      <div className="live-cam-rail live-cam-rail--start">
        <button
          type="button"
          onClick={onClose}
          className="live-cam-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Închide camera"
        >
          <X size={22} />
        </button>
        <div className="live-cam-cats">
          {categorie.startsWith("scan_") ? (
            <div className="live-cam-cat is-active bg-[var(--app-accent)] text-white">
              {categorie === "scan_crop" ? "Scan Document" : "Scan Multi-pagină"}
            </div>
          ) : (
            PHOTO_CATEGORIES.map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategorie(key)}
                className={`live-cam-cat ${categorie === key ? `is-active ${color}` : ""}`}
              >
                {label}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="live-cam-stage">
        {cameraError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm mx-auto">
            <AlertCircle size={40} className="text-amber-400" />
            <div>
              <p className="text-[14px] font-bold text-white">{cameraError}</p>
              <p className="text-[12px] text-white/60 mt-1">
                Poți face fotografii folosind camera nativă a telefonului.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[12px] font-semibold flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Reîncearcă
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] rounded-xl text-[12px] font-bold flex items-center gap-1.5 text-white"
              >
                <Camera size={14} /> Fă Foto Nativ
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="live-cam-video"
            onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})}
            onCanPlay={() => setCameraReady(true)}
          />
        )}

        {flash && <div className="live-cam-flash" />}

        {lastThumbUrl ? (
          <div
            className="live-cam-thumb"
            aria-live="polite"
            aria-label={`${photoCount} ${photoCount === 1 ? "poză salvată" : "poze salvate"}`}
          >
            <img src={lastThumbUrl} alt="Ultima poză salvată" draggable={false} />
            <span className="live-cam-thumb-count">{photoCount}</span>
          </div>
        ) : null}
      </div>

      {/* Input nativ ascuns pentru fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleNativeFallbackInput}
      />

      <div className="live-cam-rail live-cam-rail--end">
        <div className="live-cam-cat-label">{activeCat?.label || categorie}</div>
        <button
          type="button"
          onClick={cameraError ? () => fileInputRef.current?.click() : capturePhotoInstantly}
          className="live-cam-shutter"
          disabled={!cameraReady && !cameraError}
          aria-label="Fotografiază"
        >
          <span className="live-cam-shutter-inner" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="live-cam-done min-w-[44px] min-h-[44px] flex items-center justify-center font-bold"
        >
          Gata
        </button>
      </div>
    </div>
  );
}
