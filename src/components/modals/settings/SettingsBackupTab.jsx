import React from "react";
import { Database, Download } from "lucide-react";

export default function SettingsBackupTab({
  isAdmin = false,
  claims = [],
  totalPoze = 0,
  totalDocumente = 0,
  exportFullBackupJSON,
}) {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Database size={16} className="text-[var(--app-muted)]" /> Diagnostic Sistem &amp; Stocare Cloud
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Total Dosare</span>
            <span className="block font-extrabold text-[20px] text-[var(--app-text-strong)]">{claims.length}</span>
          </div>

          <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Fotografii Salvate</span>
            <span className="block font-extrabold text-[20px] text-[var(--app-accent)]">{totalPoze}</span>
          </div>

          <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
            <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Documente Atașate</span>
            <span className="block font-extrabold text-[20px] text-[var(--app-muted)]">{totalDocumente}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--app-border)]">
          <h4 className="font-bold text-[13px] text-[var(--app-text-strong)] mb-1">Export &amp; Salvgardare Date (Backup)</h4>
          <p className="text-[11px] text-[var(--app-muted)] mb-3">
            Copie rapidă a dosarelor încărcate în sesiune (JSON). Pentru export complet GDPR (inclusiv arhivă și echipă), folosește tab-ul Date.
          </p>
          <button
            type="button"
            onClick={exportFullBackupJSON}
            disabled={!isAdmin}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-text)] text-white text-[12.5px] font-bold rounded-lg hover:bg-[#1E2D44] transition-colors disabled:opacity-50"
          >
            <Download size={15} /> Descarcă Backup Complet (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
