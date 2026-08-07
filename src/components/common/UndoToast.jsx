import React, { useEffect, useRef, useState } from "react";
import { Undo2, X, Trash2, ArrowRightLeft } from "lucide-react";

/**
 * UndoToast — notificare cu countdown (linie vizibilă) și buton Anulează.
 *
 * Commit-ul DB e responsabilitatea caller-ului (timer în useClaims).
 * Toast-ul doar afișează countdown + apelează onUndo / onCommit(dismiss) / onDone.
 * Nu face commit în cleanup — Strict Mode remount ar declanșa commit prematur.
 *
 * Props:
 *   item   — { id, message, icon, onUndo, onCommit, timeoutMs }
 *   onDone — apelat când s-a finalizat (commit sau undo)
 */
export default function UndoToast({ item, onDone }) {
  const [progress, setProgress] = useState(1);
  const settledRef = useRef(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const timeoutMs = item?.timeoutMs ?? 5000;

  onDoneRef.current = onDone;

  useEffect(() => {
    if (!item) return;

    settledRef.current = false;
    startRef.current = Date.now();
    setProgress(1);
    const currentItem = item;

    const settleCommit = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      currentItem.onCommit?.();
      onDoneRef.current?.();
    };

    const timeoutId = setTimeout(settleCommit, timeoutMs);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / timeoutMs);
      setProgress(remaining);
      if (elapsed < timeoutMs) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [item?.id, timeoutMs]); // eslint-disable-line react-hooks/exhaustive-deps -- identity by id

  const handleUndo = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!settledRef.current) {
      settledRef.current = true;
      item?.onUndo?.();
      onDoneRef.current?.();
    }
  };

  const handleDismiss = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!settledRef.current) {
      settledRef.current = true;
      item?.onCommit?.();
      onDoneRef.current?.();
    }
  };

  if (!item) return null;

  const Icon = item.icon === "delete" ? Trash2 : ArrowRightLeft;
  const accentColor = item.icon === "delete" ? "#F85149" : "#D29922";

  return (
    <div
      className="undo-toast fixed bottom-4 left-1/2 -translate-x-1/2 z-[100002] w-[calc(100%-1.5rem)] max-w-sm pointer-events-auto"
      style={{ fontFamily: "'Inter', sans-serif" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="undo-toast-panel relative overflow-hidden rounded-2xl shadow-2xl border border-white/15"
        style={{ background: "#161B22" }}
      >
        {/* Track + filling countdown line */}
        <div
          className="undo-toast-track absolute bottom-0 left-0 right-0 h-1"
          style={{ background: "rgba(255,255,255,0.12)" }}
          aria-hidden
        >
          <div
            className="undo-toast-progress h-full origin-left"
            style={{
              width: "100%",
              transform: `scaleX(${progress})`,
              background: accentColor,
              transition: "transform 80ms linear",
              willChange: "transform",
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5 pb-4">
          <div
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}22` }}
          >
            <Icon size={16} style={{ color: accentColor }} />
          </div>

          <span className="flex-1 text-[13px] font-semibold text-white/90 leading-snug">
            {item.message}
          </span>

          <button
            type="button"
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

          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Închide"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
