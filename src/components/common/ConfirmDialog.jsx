import React from "react";
import { AlertTriangle } from "lucide-react";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "./modalShellClasses";

/** Shared destructive / confirm dialog. */
export default function ConfirmDialog({
  open,
  title = "Confirmă",
  message,
  confirmLabel = "Confirmă",
  cancelLabel = "Anulează",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
  desktopUi = false,
}) {
  if (!open) return null;

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi)}
      style={{ zIndex: 10050 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className={modalPanelClass(desktopUi, "w-full max-w-sm overflow-hidden p-5 space-y-4")}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex gap-3 items-start">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--app-danger-muted)] text-[var(--app-danger)]">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h3 id="confirm-title" className="font-semibold text-[15px] text-[var(--app-text-strong)]">
              {title}
            </h3>
            <p id="confirm-message" className="text-[12.5px] text-[var(--app-muted)] mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <AppButton variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
