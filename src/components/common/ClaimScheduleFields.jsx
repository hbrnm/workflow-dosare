import React from "react";
import { CalendarClock } from "lucide-react";
import { fmtProgramare, todayISO } from "../../utils/dateUtils";

/**
 * Date/time picker shown when a claim is in status „Programat”.
 */
export default function ClaimScheduleFields({
  dataProgramare,
  onChange,
  readOnly = false,
}) {
  const dateValue = dataProgramare ? String(dataProgramare).slice(0, 10) : todayISO();
  const timeValue = dataProgramare ? (String(dataProgramare).slice(11, 16) || "09:00") : "09:00";

  const updateSchedule = (date, time) => {
    if (!date) {
      onChange(null);
      return;
    }
    onChange(`${date}T${time || "09:00"}:00`);
  };

  return (
    <div className="rounded-lg border border-[var(--app-accent)]/25 bg-[var(--app-accent)]/10 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--app-accent)]">
        <CalendarClock size={14} />
        <span>Data programării atelier</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          disabled={readOnly}
          value={dateValue}
          onChange={(e) => updateSchedule(e.target.value, timeValue)}
          className="text-[12px] font-mono font-bold p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)] focus:border-[var(--app-accent)] disabled:opacity-60"
        />
        <input
          type="time"
          disabled={readOnly}
          value={timeValue}
          onChange={(e) => updateSchedule(dateValue, e.target.value)}
          className="text-[12px] font-mono font-bold p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)] focus:border-[var(--app-accent)] disabled:opacity-60"
        />
        {dataProgramare && (
          <span className="text-[10.5px] font-semibold text-[var(--app-muted)]">
            {fmtProgramare(dataProgramare)}
          </span>
        )}
      </div>

      <p className="text-[10px] text-[var(--app-muted)] leading-snug">
        Dosarul va apărea automat în Programator la data aleasă după salvare.
      </p>
    </div>
  );
}
