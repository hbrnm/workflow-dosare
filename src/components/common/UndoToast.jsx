import React, { useEffect, useRef, useState } from "react";
import { Undo2, X, Trash2, ArrowRightLeft } from "lucide-react";

/**
 * UndoToast — notificare cu countdown, adaptată la tema app (light/dark).
 *
 * Commit-ul DB e responsabilitatea caller-ului (timer în useClaims).
 * Toast-ul doar afișează countdown + apelează onUndo / onCommit(dismiss) / onDone.
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

  const isDelete = item.icon === "delete";
  const Icon = isDelete ? Trash2 : ArrowRightLeft;
  const toneClass = isDelete ? "is-delete" : "is-status";

  return (
    <div
      className={`undo-toast fixed bottom-4 left-1/2 -translate-x-1/2 z-[100002] w-[calc(100%-1.5rem)] max-w-sm pointer-events-auto ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="undo-toast-panel relative overflow-hidden rounded-2xl shadow-lg border">
        <div className="undo-toast-track absolute bottom-0 left-0 right-0" aria-hidden>
          <div
            className="undo-toast-progress h-full origin-left"
            style={{
              width: "100%",
              transform: `scaleX(${progress})`,
              transition: "transform 80ms linear",
              willChange: "transform",
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5 pb-4">
          <div className="undo-toast-icon shrink-0 w-8 h-8 rounded-xl flex items-center justify-center">
            <Icon size={16} />
          </div>

          <span className="undo-toast-message flex-1 text-[13px] font-semibold leading-snug">
            {item.message}
          </span>

          <button type="button" onClick={handleUndo} className="undo-toast-undo shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-extrabold transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <Undo2 size={13} />
            Anulează
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="undo-toast-close shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Închide"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
