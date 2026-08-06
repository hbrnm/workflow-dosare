import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { PHOTO_CATEGORIES } from "../../utils/scanUtils";

export default function LiveStreamCameraModal({ initialCategorie = "receptie", onSavePhoto, onClose }) {
  const [categorie, setCategorie] = useState(initialCategorie);
  const [photoCount, setPhotoCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    setCategorie(initialCategorie);
  }, [initialCategorie]);

  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Camera video stream failed:", err);
      }
    }
    startCamera();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capturePhotoInstantly = async () => {
    if (!videoRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `Foto_${categorie}_${Date.now()}.jpg`, { type: "image/jpeg" });
        setPhotoCount((c) => c + 1);
        await onSavePhoto([file], categorie);
      }, "image/jpeg", 0.70);
    } catch (e) {
      console.error(e);
    }
  };

  const activeCat = PHOTO_CATEGORIES.find((c) => c.key === categorie);

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-between text-white overflow-hidden select-none">
      <div className="w-full flex items-center justify-between px-4 py-3 bg-black/90 z-20 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-2">
          {PHOTO_CATEGORIES.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategorie(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all ${
                categorie === key ? `${color} text-white shadow-sm` : "bg-white/10 text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 w-full flex items-center justify-center bg-black overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white z-30 transition-opacity duration-100" />}
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/20 text-emerald-400 px-3.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>{photoCount} poze salvate direct</span>
        </div>
      </div>

      <div className="w-full py-6 px-8 bg-black/90 z-20 flex items-center justify-between shrink-0 border-t border-white/10">
        <div className="w-16 text-center text-[11px] font-bold text-white/60 uppercase">
          {activeCat?.label || categorie}
        </div>
        <button
          type="button"
          onClick={capturePhotoInstantly}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-2xl bg-white/10"
        >
          <div className="w-16 h-16 rounded-full bg-white active:bg-gray-300 transition-colors shadow-inner" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white rounded-xl shadow-md"
        >
          Gata
        </button>
      </div>
    </div>
  );
}
