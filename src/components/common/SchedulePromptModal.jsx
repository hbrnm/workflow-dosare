import React, { useState, useEffect } from "react";
import { CalendarClock, CalendarCheck } from "lucide-react";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "./modalShellClasses";
import { useModalEscape } from "../../hooks/useModalEscape";
import { todayISO, formatDateYMD } from "../../utils/dateUtils";

function addDaysISO(numDays) {
  const d = new Date();
  d.setDate(d.getDate() + numDays);
  return formatDateYMD(d);
}

function formatRomanianDate(dStr, tStr) {
  if (!dStr) return "";
  try {
    const d = new Date(`${dStr}T${tStr || "09:00"}:00`);
    if (isNaN(d.getTime())) return `${dStr} ${tStr || ""}`.trim();
    const formatted = d.toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${formatted.charAt(0).toUpperCase() + formatted.slice(1)}, ora ${tStr || "09:00"}`;
  } catch {
    return `${dStr} ${tStr || ""}`.trim();
  }
}

/**
 * Pop-up modal to confirm and select schedule date/time when moving to status „Programat”.
 */
export default function SchedulePromptModal({
  open,
  claim,
  initialDate,
  onConfirm,
  onClose,
  desktopUi = true,
  loading = false,
}) {
  useModalEscape(onClose, { enabled: open });

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");

  useEffect(() => {
    if (!open) return;
    const source = initialDate || claim?.dataProgramare;
    if (source) {
      const raw = String(source);
      setSelectedDate(raw.slice(0, 10));
      setSelectedTime(raw.slice(11, 16) || "09:00");
    } else {
      setSelectedDate(todayISO());
      setSelectedTime("09:00");
    }
  }, [open, initialDate, claim]);

  if (!open) return null;

  const overlayClass = desktopUi
    ? modalOverlayClass(desktopUi, { dense: true })
    : "fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm";

  const panelClass = desktopUi
    ? modalPanelClass(desktopUi, "w-full max-w-md overflow-hidden p-5 space-y-4 shadow-2xl")
    : "app-modal-panel w-full max-w-md overflow-hidden p-5 space-y-4 shadow-2xl m-2";

  const claimInfo = [
    claim?.numarInmatriculare,
    claim?.numarDosar ? `Dosar ${claim.numarDosar}` : null,
    claim?.asigurat,
  ]
    .filter(Boolean)
    .join(" • ") || "Dosar selectat";

  const prettyDate = formatRomanianDate(selectedDate, selectedTime);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!selectedDate) return;
    const finalIso = `${selectedDate}T${selectedTime || "09:00"}:00`;
    onConfirm?.(finalIso);
  };

  return (
    <div
      className={overlayClass}
      {...modalOverlayProps(desktopUi)}
      style={{ zIndex: 10050 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        className={panelClass}
        role="dialog"
        aria-labelledby="schedule-modal-title"
        aria-describedby="schedule-modal-desc"
      >
        {/* Header */}
        <div className="flex gap-3 items-start">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--app-accent)]/15 text-[var(--app-accent)]">
            <CalendarClock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              id="schedule-modal-title"
              className="font-bold text-[16px] text-[var(--app-text-strong)]"
            >
              Programare în atelier
            </h3>
            <p
              id="schedule-modal-desc"
              className="text-[12px] text-[var(--app-muted)] mt-0.5 truncate"
            >
              {claimInfo}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-[var(--app-text-strong)] block">
              Data și ora programării
            </label>

            {/* Quick date shortcuts */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO())}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)] hover:bg-[var(--app-accent)]/15 hover:border-[var(--app-accent)]/40 transition-colors cursor-pointer"
              >
                Azi
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(1))}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)] hover:bg-[var(--app-accent)]/15 hover:border-[var(--app-accent)]/40 transition-colors cursor-pointer"
              >
                Mâine
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(2))}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)] hover:bg-[var(--app-accent)]/15 hover:border-[var(--app-accent)]/40 transition-colors cursor-pointer"
              >
                +2 zile
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(7))}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-text)] hover:bg-[var(--app-accent)]/15 hover:border-[var(--app-accent)]/40 transition-colors cursor-pointer"
              >
                +1 săpt.
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
                className="flex-1 text-[13px] font-semibold p-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface-2)] text-[var(--app-text-strong)] focus:border-[var(--app-accent)] outline-none"
              />
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={loading}
                className="w-28 text-[13px] font-semibold p-2 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface-2)] text-[var(--app-text-strong)] focus:border-[var(--app-accent)] outline-none"
              />
            </div>
          </div>

          {/* Live formatted preview */}
          <div className="rounded-lg bg-[var(--app-surface-2)]/70 border border-[var(--app-border)] p-2.5 flex items-center gap-2.5">
            <CalendarCheck size={16} className="text-[var(--app-accent)] shrink-0" />
            <div className="text-[12px] font-medium text-[var(--app-text)] min-w-0">
              {selectedDate ? (
                <span>
                  Programat pentru:{" "}
                  <strong className="text-[var(--app-text-strong)]">{prettyDate}</strong>
                </span>
              ) : (
                <span className="text-[var(--app-danger)]">Selectează o dată validă</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <AppButton
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Anulează
            </AppButton>
            <AppButton
              variant="primary"
              type="submit"
              disabled={!selectedDate || loading}
            >
              Confirmă programarea
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
}
