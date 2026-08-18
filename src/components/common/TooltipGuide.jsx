import React, { useState } from "react";
import { HelpCircle, X, Sparkles } from "lucide-react";

const TOOLTIP_DISMISS_KEY = "workflow_dosare_tooltips_dismissed";

export function isTooltipGuideDismissed() {
  try {
    return localStorage.getItem(TOOLTIP_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissTooltipGuideGlobal() {
  try {
    localStorage.setItem(TOOLTIP_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export default function TooltipGuide({
  id,
  title,
  content,
  children,
  position = "bottom", // "top" | "bottom" | "left" | "right"
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => isTooltipGuideDismissed());

  if (dismissed) return children;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
  };

  const handleDismissGlobal = (e) => {
    e.stopPropagation();
    dismissTooltipGuideGlobal();
    setDismissed(true);
  };

  const posClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }[position];

  return (
    <div className="relative inline-flex items-center group/tt">
      {children}

      {/* Floating Hint Badge Button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="ml-1 p-1 rounded-full text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all shrink-0 animate-pulse"
        title={title}
      >
        <HelpCircle size={14} />
      </button>

      {/* Tooltip Popup */}
      {open ? (
        <div
          className={`absolute z-50 w-64 p-3 rounded-xl border border-[var(--app-primary,#0284c7)]/40 bg-[var(--app-surface-2,#1e293b)] text-[var(--app-text)] shadow-xl text-left animate-in fade-in zoom-in-95 duration-150 ${posClasses}`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-[var(--app-border)] pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[12px] text-[var(--app-text-strong)]">
              <Sparkles size={13} className="text-amber-400" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[var(--app-muted)] hover:text-[var(--app-text)] p-0.5 rounded"
            >
              <X size={13} />
            </button>
          </div>

          <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">{content}</p>

          <div className="mt-2.5 pt-1.5 border-t border-[var(--app-border)] flex items-center justify-between">
            <button
              type="button"
              onClick={handleDismissGlobal}
              className="text-[10.5px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
            >
              Ascunde toate sfaturile
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[var(--app-primary,#0284c7)] text-white"
            >
              Am înțeles
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
