import React, { useState } from "react";
import { CalendarClock, X, AlertTriangle } from "lucide-react";
import { todayISO } from "../../utils/dateUtils";

/**
 * Popup când programarea nu s-a onorat: anulare sau reprogramare.
 */
export default function ProgramareNeonorataModal({ claim, onClose, onCancel, onReschedule }) {
  const [mode, setMode] = useState(null); // null | 'reschedule'
  const [editDate, setEditDate] = useState(() =>
    claim?.dataProgramare ? String(claim.dataProgramare).slice(0, 10) : todayISO()
  );
  const [editTime, setEditTime] = useState(() =>
    claim?.dataProgramare ? (String(claim.dataProgramare).slice(11, 16) || "09:00") : "09:00"
  );
  const [saving, setSaving] = useState(false);

  if (!claim) return null;

  const handleCancel = async () => {
    setSaving(true);
    try {
      await onCancel(claim);
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!editDate) return;
    setSaving(true);
    try {
      const iso = `${editDate}T${editTime || "09:00"}:00`;
      await onReschedule(claim, iso);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#1C2127]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] bg-[var(--app-danger)]/10">
          <div className="flex items-center gap-2 text-[var(--app-danger)]">
            <AlertTriangle size={18} />
            <span className="font-extrabold text-[13px]">Programare neonorată</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--app-surface-muted)] text-[var(--app-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[12.5px] text-[var(--app-text-strong)] leading-relaxed">
            Clientul <strong>{claim.client || "—"}</strong> ({claim.numarInmatriculare || "fără nr."})
            {" "}nu s-a prezentat la programare. Ce doriți să faceți?
          </p>

          {mode === "reschedule" ? (
            <div className="space-y-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
              <div className="text-[11px] font-bold uppercase text-[var(--app-muted)] flex items-center gap-1">
                <CalendarClock size={14} /> Noua dată
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-[12px] font-mono p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)]"
                />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-[12px] font-mono p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving || !editDate}
                  onClick={handleReschedule}
                  className="flex-1 py-2 rounded-lg bg-[var(--app-muted)] text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
                >
                  Salvează reprogramarea
                </button>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-3 py-2 rounded-lg border border-[var(--app-border)] text-[12px] font-bold text-[var(--app-muted)]"
                >
                  Înapoi
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode("reschedule")}
                className="py-2.5 px-3 rounded-lg border-2 border-[var(--app-muted)] bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] text-[12px] font-extrabold hover:bg-[var(--app-border)]/40 transition-colors disabled:opacity-50"
              >
                Reprogramează altă dată
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="py-2.5 px-3 rounded-lg border-2 border-[var(--app-danger)] bg-[var(--app-danger)]/10 text-[var(--app-danger)] text-[12px] font-extrabold hover:bg-[var(--app-danger)]/15 transition-colors disabled:opacity-50"
              >
                Anulează programarea
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
