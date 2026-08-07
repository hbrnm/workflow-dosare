import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { PHOTO_CATEGORIES } from "../../utils/scanUtils";
import "../../styles/liveCamera.css";

export default function LiveStreamCameraModal({ initialCategorie = "receptie", onSavePhoto, onClose }) {
  const [categorie, setCategorie] = useState(initialCategorie);
  const [photoCount, setPhotoCount] = useState(0);
  const [lastThumbUrl, setLastThumbUrl] = useState(null);
  const [flash, setFlash] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const thumbUrlRef = useRef(null);
  const aliveRef = useRef(true);
  const flashTimerRef = useRef(null);

  useEffect(() => {
    setCategorie(initialCategorie);
  }, [initialCategorie]);

  useEffect(() => {
    aliveRef.current = true;
    let active = true;

    async function startCamera() {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          console.warn("Camera API unavailable");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera video stream failed:", err);
      }
    }

    startCamera();
    return () => {
      active = false;
      aliveRef.current = false;
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (thumbUrlRef.current) {
        URL.revokeObjectURL(thumbUrlRef.current);
        thumbUrlRef.current = null;
      }
    };
  }, []);

  const setThumbFromBlob = (blob) => {
    if (!blob || !aliveRef.current) return;
    const nextUrl = URL.createObjectURL(blob);
    if (thumbUrlRef.current) URL.revokeObjectURL(thumbUrlRef.current);
    thumbUrlRef.current = nextUrl;
    setLastThumbUrl(nextUrl);
  };

  const capturePhotoInstantly = async () => {
    if (!videoRef.current || !aliveRef.current) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch { /* ignore */ }

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
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
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
      }, "image/jpeg", 0.70);
    } catch (e) {
      console.error(e);
    }
  };

  const activeCat = PHOTO_CATEGORIES.find((c) => c.key === categorie);

  return (
    <div className="live-cam fixed inset-0 z-[10000] bg-black text-white overflow-hidden select-none">
      <div className="live-cam-rail live-cam-rail--start">
        <button
          type="button"
          onClick={onClose}
          className="live-cam-icon-btn"
          aria-label="Închide camera"
        >
          <X size={22} />
        </button>
        <div className="live-cam-cats">
          {PHOTO_CATEGORIES.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategorie(key)}
              className={`live-cam-cat ${categorie === key ? `is-active ${color}` : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="live-cam-stage">
        <video ref={videoRef} autoPlay playsInline muted className="live-cam-video" />
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

      <div className="live-cam-rail live-cam-rail--end">
        <div className="live-cam-cat-label">{activeCat?.label || categorie}</div>
        <button
          type="button"
          onClick={capturePhotoInstantly}
          className="live-cam-shutter"
          aria-label="Fotografiază"
        >
          <span className="live-cam-shutter-inner" />
        </button>
        <button type="button" onClick={onClose} className="live-cam-done">
          Gata
        </button>
      </div>
    </div>
  );
}
