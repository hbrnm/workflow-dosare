import React from "react";
import { X } from "lucide-react";
import { modalHeaderClass } from "../../common/modalShellClasses";

export default function SettingsHeader({
  desktopUi = false,
  userEmail = "",
  isAdmin = false,
  onClose,
}) {
  if (!desktopUi) return null;

  return (
    <div className={modalHeaderClass(desktopUi, "flex items-center justify-between px-4 py-3")}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[14px] app-accent-bg">
          {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[15.5px] tracking-wide app-display text-[var(--app-text)]">
              Centrul de Administrare &amp; Setări
            </h2>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                isAdmin
                  ? "bg-[var(--app-accent)]/15 text-[var(--app-accent)] border border-[var(--app-accent)]/40"
                  : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border border-[var(--app-border)]"
              }`}
            >
              {isAdmin ? "Administrator" : "Operator"}
            </span>
          </div>
          <p className="text-[11px] text-[var(--app-muted)]">
            Conectat ca: <span className="font-semibold text-[var(--app-text)]">{userEmail || "Neautentificat"}</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] active:scale-95 transition-colors cursor-pointer"
        aria-label="Închide panoul de setări"
      >
        <X size={20} />
      </button>
    </div>
  );
}
