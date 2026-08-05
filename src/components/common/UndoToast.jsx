import React, { useEffect, useRef, useState } from "react";
import { Undo2, X, Trash2, ArrowRightLeft } from "lucide-react";

/**
 * UndoToast — notificare cu countdown și buton Anulează.
 *
 * Props:
 *   item   — { id, message, icon, onUndo, onCommit, timeoutMs }
 *   onDone — apelat când s-a finalizat (commit sau undo)
 */
export default function UndoToast({ item, onDone }) {
  const [progress, setProgress] = useState(100);
  const commitFiredRef = useRef(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const timeoutMs = item?.timeoutMs ?? 5000;

  onDoneRef.current = onDone;

  useEffect(() => {
    if (!item) return;

    commitFiredRef.current = false;
    startRef.current = Date.now();
    const currentItem = item;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / timeoutMs);
      setProgress(remaining * 100);

      if (elapsed >= timeoutMs) {
        if (!commitFiredRef.current) {
          commitFiredRef.current = true;
          currentItem.onCommit?.();
          onDoneRef.current?.();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // If toast is replaced/unmounted before timeout/undo, commit pending DB work
      if (!commitFiredRef.current) {
        commitFiredRef.current = true;
        currentItem.onCommit?.();
      }
    };
  }, [item, timeoutMs]);

  const handleUndo = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!commitFiredRef.current) {
      commitFiredRef.current = true;
      item?.onUndo?.();
      onDoneRef.current?.();
    }
  };

  const handleDismiss = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!commitFiredRef.current) {
      commitFiredRef.current = true;
      item?.onCommit?.();
      onDoneRef.current?.();
    }
  };

  if (!item) return null;

  const Icon = item.icon === "delete" ? Trash2 : ArrowRightLeft;
  const accentColor = item.icon === "delete" ? "#B23A2E" : "#C98A2B";

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100002] w-full max-w-sm"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10"
        style={{ background: "#1C2127" }}
      >
        {/* Progress bar — fills from right to left */}
        <div
          className="absolute bottom-0 left-0 h-[3px] transition-none"
          style={{
            width: `${progress}%`,
            background: accentColor,
            transition: "width 100ms linear",
          }}
        />

        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon */}
          <div
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}22` }}
          >
            <Icon size={16} style={{ color: accentColor }} />
          </div>

          {/* Message */}
          <span className="flex-1 text-[13px] font-semibold text-white/90 leading-snug">
            {item.message}
          </span>

          {/* Undo button */}
          <button
            onClick={handleUndo}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-extrabold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: `${accentColor}33`,
              color: accentColor,
              border: `1.5px solid ${accentColor}55`,
            }}
          >
            <Undo2 size={13} />
            Anulează
          </button>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
