import React from "react";
import { Sunrise, Layers, CalendarClock, Plus, X } from "lucide-react";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "./modalShellClasses";

const STEPS = [
  {
    Icon: Sunrise,
    title: "Brief",
    body: "Acasă pentru ziua de lucru: alerte, programări și ce cere reacție acum.",
  },
  {
    Icon: Layers,
    title: "Flux",
    body: "Tablou pe stadii (AIR → Facturat). Mută dosarele între etape dintr-o privire.",
  },
  {
    Icon: CalendarClock,
    title: "Programări",
    body: "Calendarul atelierului: sloturi, capacitate și mașini programate.",
  },
];

/**
 * First-login tour (~60s) — dismissible, persisted.
 */
export default function OnboardingModal({
  open,
  onDismiss,
  onCreateClaim,
  desktopUi = false,
  roleLabel = null,
}) {
  if (!open) return null;

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        )}
        role="dialog"
        aria-labelledby="onboarding-title"
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-[var(--app-border)]">
          <div className="min-w-0">
            <h2 id="onboarding-title" className="font-semibold text-[17px] text-[var(--app-text-strong)] tracking-tight">
              Cum începi
            </h2>
            <p className="text-[12px] text-[var(--app-muted)] mt-1 leading-relaxed">
              Trei ecrane, un flux. {roleLabel ? `Rolul tău: ${roleLabel}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] shrink-0"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="px-5 py-4 space-y-3">
          {STEPS.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 items-start">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-text)]">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-[13px] text-[var(--app-text-strong)]">{title}</div>
                <p className="text-[12px] text-[var(--app-muted)] leading-relaxed mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
          {onCreateClaim ? (
            <AppButton
              variant="primary"
              className="flex-1 app-btn-lg"
              onClick={() => {
                onDismiss?.();
                onCreateClaim();
              }}
            >
              <Plus size={16} /> Creează primul dosar
            </AppButton>
          ) : null}
          <AppButton variant="secondary" className="flex-1 app-btn-lg" onClick={onDismiss}>
            Am înțeles
          </AppButton>
        </div>
      </div>
    </div>
  );
}
