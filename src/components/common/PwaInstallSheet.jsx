import React from "react";
import { Share, X, Plus } from "lucide-react";

/** Instructiuni iOS + trigger Android pentru „Adauga pe ecranul principal”. */
export default function PwaInstallSheet({ open, onClose, onInstallNative, canNativeInstall = false }) {
  if (!open) return null;

  return (
    <div className="wa-sheet-root" role="presentation">
      <button
        type="button"
        className="wa-sheet-backdrop"
        aria-label="Inchide"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adauga pe ecranul principal"
        className="wa-sheet app-shell"
      >
        <div className="wa-sheet-handle" aria-hidden="true" />
        <div className="wa-sheet-head">
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-[var(--app-text-strong)]">
              Pe ecranul principal
            </p>
            <p className="text-[12px] text-[var(--app-muted)] font-semibold mt-0.5">
              Dispare bara Safari, Back-ul ramane in app.
            </p>
          </div>
          <button type="button" className="m-sheet-close" onClick={onClose} aria-label="Inchide">
            <X size={18} />
          </button>
        </div>

        {canNativeInstall ? (
          <button
            type="button"
            className="m-btn-primary w-full py-3 rounded-xl text-[14px] font-extrabold"
            onClick={onInstallNative}
          >
            Instaleaza aplicatia
          </button>
        ) : (
          <ol className="pwa-install-steps">
            <li>
              <Share size={16} />
              <span>Tap pe <strong>Share</strong> jos in Safari</span>
            </li>
            <li>
              <Plus size={16} />
              <span>Alege <strong>Add to Home Screen</strong></span>
            </li>
            <li>
              <span className="pwa-install-num">3</span>
              <span>Deschide iconul <strong>Dosare Dauna</strong></span>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
