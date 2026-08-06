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
        className="bg-white rounded-xl border border-[#DAD4C6] shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFEAE1] bg-[#FBEAE9]">
          <div className="flex items-center gap-2 text-[#B23A2E]">
            <AlertTriangle size={18} />
            <span className="font-extrabold text-[13px]">Programare neonorată</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-black/5 text-[#6B6558]">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[12.5px] text-[#23282E] leading-relaxed">
            Clientul <strong>{claim.client || "—"}</strong> ({claim.numarInmatriculare || "fără nr."})
            {" "}nu s-a prezentat la programare. Ce doriți să faceți?
          </p>

          {mode === "reschedule" ? (
            <div className="space-y-2 rounded-lg border border-[#DAD4C6] bg-[#FAF8F5] p-3">
              <div className="text-[11px] font-bold uppercase text-[#3B5166] flex items-center gap-1">
                <CalendarClock size={14} /> Noua dată
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-[12px] font-mono p-1.5 border border-[#DAD4C6] rounded-lg bg-white"
                />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-[12px] font-mono p-1.5 border border-[#DAD4C6] rounded-lg bg-white"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving || !editDate}
                  onClick={handleReschedule}
                  className="flex-1 py-2 rounded-lg bg-[#3B5166] text-white text-[12px] font-bold hover:bg-[#2C4160] disabled:opacity-50"
                >
                  Salvează reprogramarea
                </button>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-3 py-2 rounded-lg border border-[#DAD4C6] text-[12px] font-bold text-[#6B6558]"
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
                className="py-2.5 px-3 rounded-lg border-2 border-[#2E5C8A] bg-[#E7EEF5] text-[#2E5C8A] text-[12px] font-extrabold hover:bg-[#D6E4F0] transition-colors disabled:opacity-50"
              >
                Reprogramează altă dată
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="py-2.5 px-3 rounded-lg border-2 border-[#B23A2E] bg-[#FBEAE9] text-[#B23A2E] text-[12px] font-extrabold hover:bg-[#F5D4D2] transition-colors disabled:opacity-50"
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
