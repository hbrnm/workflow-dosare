import React from "react";
import { AlertOctagon, CheckCircle2, X } from "lucide-react";

export default function Notification({ notice, onClose, stacked = false }) {
  if (!notice) return null;
  const isErr = notice.type === "error";
  const actionLabel = notice.actionLabel;
  const onAction = notice.onAction;

  const baseClasses = `flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl text-[13px] font-medium border backdrop-blur-xl ${
    isErr
      ? "bg-red-950/90 border-red-900/50 text-red-50"
      : "bg-zinc-900/90 border-zinc-700/50 text-zinc-100"
  }`;

  const icon = isErr ? (
    <AlertOctagon size={18} className="shrink-0 text-red-400" />
  ) : (
    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
  );

  const body = (
    <>
      {icon}
      <span className={`flex-1 ${stacked ? "truncate" : ""}`}>{notice.message}</span>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={() => {
            onAction();
            onClose?.();
          }}
          className="shrink-0 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-[11px] font-semibold"
        >
          {actionLabel}
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full shrink-0 transition-colors" aria-label="Închide">
        <X size={15} className="opacity-70" />
      </button>
    </>
  );

  if (stacked) {
    return (
      <div className={`${baseClasses} w-full md:w-80`} role="status" aria-live="polite">
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
