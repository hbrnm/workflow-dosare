import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { PHOTO_CATEGORIES } from "../../utils/scanUtils";
import { useModalEscape } from "../../hooks/useModalEscape";
import { compressImage } from "../../utils/imageUtils";
import {
  clearLiveCameraDenied,
  isCameraPermissionDeniedError,
  isLiveCameraDenied,
  markLiveCameraDenied,
} from "../../utils/cameraFallback";
import "../../styles/liveCamera.css";

export default function LiveStreamCameraModal({
  initialCategorie = "receptie",
  initialStream = null,
  onSavePhoto,
  onClose,
}) {
  const isScan = String(initialCategorie || "").startsWith("scan_");
  const [categorie, setCategorie] = useState(initialCategorie);
  const [pendingFiles, setPendingFiles] = useState(null);
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
  const nativePromptedRef = useRef(false);

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
    clearLiveCameraDenied();
    setCameraError(null);
  }, []);

  const openNativeCamera = useCallback(() => {
    if (nativePromptedRef.current) return;
    nativePromptedRef.current = true;
    fileInputRef.current?.click();
    window.setTimeout(() => {
      nativePromptedRef.current = false;
    }, 800);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraError(null);

    if (isLiveCameraDenied()) {
      setCameraError("native");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("native");
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
      if (isCameraPermissionDeniedError(err)) markLiveCameraDenied();
      setCameraError("native");
    }
  }, [attachStream, stopStream]);

  useEffect(() => {
    aliveRef.current = true;

    if (initialStream) attachStream(initialStream);
    else startCamera();

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

  useEffect(() => {
    if (!cameraError || pendingFiles?.length) return undefined;
    const coarse = typeof window !== "undefined"
      && window.matchMedia?.("(pointer: coarse)")?.matches;
    if (!coarse) return undefined;
    const t = window.setTimeout(() => openNativeCamera(), 0);
    return () => window.clearTimeout(t);
  }, [cameraError, pendingFiles, openNativeCamera]);

  const setThumbFromBlob = (blob) => {
    if (!blob || !aliveRef.current) return;
    const nextUrl = URL.createObjectURL(blob);
    if (thumbUrlRef.current) URL.revokeObjectURL(thumbUrlRef.current);
    thumbUrlRef.current = nextUrl;
    setLastThumbUrl(nextUrl);
  };

  const saveFiles = async (files, cat) => {
    if (!files?.length) return;
    if (aliveRef.current) setPhotoCount((c) => c + files.length);
    if (typeof onSavePhoto === "function") {
      await onSavePhoto(files, cat);
    }
  };

  const queueFiles = (files) => {
    if (!files?.length || !aliveRef.current) return;
    if (isScan) {
      void saveFiles(files, categorie);
      return;
    }
    setPendingFiles(files);
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
        canvas.width = 0;
        canvas.height = 0;
        if (!blob || !aliveRef.current) return;
        try {
          setThumbFromBlob(blob);
          const file = new File([blob], `Foto_${Date.now()}.jpg`, { type: "image/jpeg" });
          queueFiles([file]);
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
    e.target.value = "";
    try {
      const optimizedFiles = [];
      for (const file of rawFiles) {
        const opt = await compressImage(file, { maxDim: 1800, quality: 0.80 });
        optimizedFiles.push(opt);
        setThumbFromBlob(opt);
      }
      queueFiles(optimizedFiles);
    } catch (err) {
      console.error("Native capture save error:", err);
    }
  };

  const assignFolder = async (key) => {
    const files = pendingFiles;
    setCategorie(key);
    setPendingFiles(null);
    await saveFiles(files, key);
  };

  const handleClose = async () => {
    if (pendingFiles?.length) {
      const cat = ["receptie", "predare", "reconstatare"].includes(categorie)
        ? categorie
        : initialCategorie;
      await saveFiles(pendingFiles, cat);
      setPendingFiles(null);
    }
    onClose?.();
  };

  const waitingFolder = Boolean(pendingFiles?.length) && !isScan;
  const useNativeShutter = Boolean(cameraError) && !waitingFolder;

  return (
    <div className="live-cam fixed inset-0 z-[10000] bg-black text-white overflow-hidden select-none">
      <div className="live-cam-rail live-cam-rail--start">
        <button
          type="button"
          onClick={handleClose}
          className="live-cam-icon-btn min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Închide camera"
        >
          <X size={22} />
        </button>
        {isScan ? (
          <div className="live-cam-cats">
            <div className="live-cam-cat is-active bg-[var(--app-accent)] text-white">
              {categorie === "scan_crop" ? "Scan Document" : "Scan Multi-pagină"}
            </div>
          </div>
        ) : (
          <p className="live-cam-hint">
            {waitingFolder ? "Alege folderul pozei" : "Fotografiază, apoi alege folderul"}
          </p>
        )}
      </div>

      <div className="live-cam-stage">
        {cameraError ? (
          <div className="live-cam-native-stage" aria-hidden="true" />
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
            <span className="live-cam-thumb-count">{photoCount + (waitingFolder ? pendingFiles.length : 0)}</span>
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeFallbackInput}
      />

      <div className="live-cam-rail live-cam-rail--end">
        {waitingFolder ? (
          <div className="live-cam-folder-pick" role="group" aria-label="Folder poză">
            {PHOTO_CATEGORIES.map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => assignFolder(key)}
                className={`live-cam-cat live-cam-folder-btn ${key === initialCategorie ? `is-active ${color}` : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="live-cam-cat-label">Foto</div>
            <button
              type="button"
              onClick={useNativeShutter ? openNativeCamera : capturePhotoInstantly}
              className="live-cam-shutter"
              disabled={!cameraReady && !cameraError}
              aria-label="Fotografiază"
            >
              <span className="live-cam-shutter-inner" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="live-cam-done min-w-[44px] min-h-[44px] flex items-center justify-center font-bold"
            >
              Gata
            </button>
          </>
        )}
      </div>
    </div>
  );
}
