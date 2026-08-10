import React from "react";
import { AlertOctagon, ShieldCheck, X } from "lucide-react";

export default function Notification({ notice, onClose, stacked = false }) {
  if (!notice) return null;
  const isErr = notice.type === "error";
  const actionLabel = notice.actionLabel;
  const onAction = notice.onAction;

  const baseClasses = `flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-2xl text-[13px] font-bold text-white ${isErr ? "bg-[var(--app-danger,#B23A2E)]" : "bg-[var(--app-success,#3E6B45)]"}`;

  const body = (
    <>
      {isErr ? <AlertOctagon size={16} className="shrink-0" /> : <ShieldCheck size={16} className="shrink-0" />}
      <span className={`flex-1 ${stacked ? "truncate" : ""}`}>{notice.message}</span>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={() => {
            onAction();
            onClose?.();
          }}
          className="shrink-0 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-[11px] font-bold"
        >
          {actionLabel}
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded shrink-0" aria-label="Închide">
        <X size={14} />
      </button>
    </>
  );

  if (stacked) {
    return (
      <div className={`${baseClasses} w-80`} role="status" aria-live="polite">
        {body}
      </div>
    );
  }

  return (
    <div
      className={`fixed top-3 left-3 right-3 sm:top-auto sm:left-auto sm:right-4 sm:bottom-4 z-[100001] animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${baseClasses}`}
      role="status"
      aria-live="polite"
    >
      {body}
    </div>
  );
}
