import React, { useState } from "react";
import { PackageCheck, CalendarClock, Save } from "lucide-react";
import { isPieseComandateStatus } from "../../constants/config";
import { todayISO } from "../../utils/dateUtils";

function toInputDate(val) {
  return val ? String(val).slice(0, 10) : "";
}

function formatShortDate(val) {
  const iso = toInputDate(val);
  if (!iso || iso.length < 10) return "";
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

/**
 * Toggle "Piese sosite" — visible only for status piese_comandate.
 * When checked and unscheduled, shows interactive „Programare” → date/time picker.
 *
 * layout:
 * - "stack" (default): dates above toggle (modal / sheet)
 * - "inline": one dense row for list cards (Toate dosarele)
 */
export default function MobilePieseSositeRow({
  claim,
  canEdit = true,
  onToggle,
  onSchedule,
  onPatchDates,
  compact = false,
  hideDatesUntilHover = false,
  layout = "stack",
}) {
  const [scheduling, setScheduling] = useState(false);
  const [editDate, setEditDate] = useState(todayISO());
  const [editTime, setEditTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

  if (!claim || !isPieseComandateStatus(claim.status)) return null;

  const checked = !!claim.pieseSosite;
  const hasSchedule = Boolean(claim.dataProgramare);
  const toggleDisabled = !canEdit || typeof onToggle !== "function";
  const canSchedule = canEdit && typeof onSchedule === "function";
  const canEditDates = canEdit && typeof onPatchDates === "function";
  const inline = layout === "inline";

  const openScheduler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSchedule) return;
    setEditDate(todayISO());
    setEditTime("09:00");
    setScheduling(true);
  };

  const cancelScheduler = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setScheduling(false);
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSchedule || !editDate) return;
    setSaving(true);
    try {
      const iso = `${editDate}T${editTime || "09:00"}:00`;
      const ok = await onSchedule(claim, iso);
      if (ok === false) return;
      setScheduling(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDateFieldBlur = async (field, value) => {
    if (!canEditDates) return;
    const normalized = value || null;
    const current = field === "dataComandaPiese" ? claim.dataComandaPiese : claim.termenLivrarePiese;
    if (toInputDate(current) === (normalized || "")) return;
    setSavingDates(true);
    try {
      await onPatchDates(claim, { [field]: normalized });
    } finally {
      setSavingDates(false);
    }
  };

  const scheduleLabel = hasSchedule
    ? (() => {
        const d = String(claim.dataProgramare).slice(0, 10);
        const t = String(claim.dataProgramare).slice(11, 16) || "";
        return t ? `${formatShortDate(d) || d} ${t}` : formatShortDate(d) || d;
      })()
    : null;

  const livrareOverdue =
    claim.termenLivrarePiese &&
    !claim.pieseSosite &&
    toInputDate(claim.termenLivrarePiese) < todayISO();

  const showDatesBlock = claim.dataComandaPiese || claim.termenLivrarePiese || canEditDates || compact || inline;
  const showDateFields = claim.dataComandaPiese || claim.termenLivrarePiese || canEditDates;

  const metaBoxClass = compact
    ? "app-piese-panel m-piese-sosite-meta text-[10px] font-bold p-1.5 rounded-lg space-y-1"
    : "app-piese-panel m-piese-sosite-meta text-[10.5px] font-bold p-2 rounded-lg space-y-1.5";

  const datesRevealClass = hideDatesUntilHover
    ? (scheduling ? "block" : "hidden group-hover:block group-focus-within:block")
    : "";

  const toggleRowClass = compact
    ? "app-piese-toggle flex items-center justify-between gap-2 min-h-0"
    : `app-piese-toggle m-piese-sosite-toggle flex items-center justify-between gap-2 font-bold select-none py-2 px-2.5 rounded-lg transition-all ${
        toggleDisabled ? "opacity-60" : ""
      }`;

  const scheduleControl = checked ? (
    hasSchedule ? (
      <span
        className={`font-bold bg-[#2C4160] text-white rounded shrink-0 inline-flex items-center gap-0.5 ${
          inline ? "text-[9px] px-1 py-0.5" : compact ? "text-[9.5px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5 rounded-md"
        }`}
        title={String(claim.dataProgramare)}
      >
        <CalendarClock size={inline ? 9 : 10} aria-hidden />
        {scheduleLabel}
      </span>
    ) : canSchedule ? (
      <button
        type="button"
        onClick={openScheduler}
        className={`m-piese-programare-btn font-bold bg-[#C98A2B] hover:bg-[#B37A22] text-white rounded shrink-0 inline-flex items-center gap-0.5 transition-colors ${
          inline ? "text-[9px] px-1 py-0.5" : compact ? "text-[9.5px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5 rounded-md"
        }`}
      >
        <CalendarClock size={inline ? 9 : 10} aria-hidden />
        {inline ? "Prog." : compact ? "Progr." : "Programare"}
      </button>
    ) : (
      <span className={`font-bold text-[#1F7A45] shrink-0 ${inline ? "text-[9px]" : "text-[9.5px]"}`}>✓</span>
    )
  ) : null;

  const schedulePanel = checked && scheduling && canSchedule ? (
    <div
      className={`app-piese-schedule-panel m-piese-schedule-panel rounded-lg space-y-1.5 ${
        compact || inline ? "p-1.5 mt-1" : "p-2.5 rounded-xl space-y-2"
      }`}
    >
      <div
        className={`font-bold text-[var(--app-muted)] flex items-center gap-1 ${
          compact || inline ? "text-[9.5px]" : "text-[10.5px]"
        }`}
      >
        <CalendarClock size={compact || inline ? 10 : 12} /> Alege data &amp; ora
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="rounded-lg p-1.5 text-[12px] font-bold"
        />
        <input
          type="time"
          value={editTime}
          onChange={(e) => setEditTime(e.target.value)}
          className="rounded-lg p-1.5 text-[12px] font-bold"
        />
      </div>
      <div className="flex justify-end gap-1.5 pt-0.5">
        <button type="button" onClick={cancelScheduler} className="app-piese-btn-cancel px-2.5 py-1 rounded-lg text-[11px] font-bold">
          Anulează
        </button>
        <button
          type="button"
          disabled={saving || !editDate}
          onClick={saveSchedule}
          className="app-piese-btn-save flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-extrabold shadow-xs disabled:opacity-50"
        >
          <Save size={12} />
          {saving ? "…" : "Salvează"}
        </button>
      </div>
    </div>
  ) : null;

  if (inline) {
    const cmdShort = formatShortDate(claim.dataComandaPiese);
    const livShort = formatShortDate(claim.termenLivrarePiese);

    return (
      <div className="m-piese-sosite m-piese-sosite-inline" onClick={(e) => e.stopPropagation()}>
        <div className="m-piese-inline-row">
          <div className="m-piese-inline-dates" title="Data comandă / termen livrare">
            <label
              className={`m-piese-inline-chip ${canEditDates ? "is-editable" : ""}`}
              title={toInputDate(claim.dataComandaPiese) || "Fără dată comandă"}
            >
              <span className="m-piese-inline-k">Cmd</span>
              <span className="m-piese-inline-v font-mono">{cmdShort || "—"}</span>
              {canEditDates ? (
                <input
                  type="date"
                  className="m-piese-inline-input-overlay"
                  value={toInputDate(claim.dataComandaPiese)}
                  disabled={savingDates}
                  onChange={(e) => handleDateFieldBlur("dataComandaPiese", e.target.value || null)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Data comandă piese"
                />
              ) : null}
            </label>
            <label
              className={`m-piese-inline-chip ${livrareOverdue ? "is-overdue" : ""} ${canEditDates ? "is-editable" : ""}`}
              title={toInputDate(claim.termenLivrarePiese) || "Fără dată recepție"}
            >
              <span className="m-piese-inline-k">Rec</span>
              <span className="m-piese-inline-v font-mono">{livShort || "—"}</span>
              {canEditDates ? (
                <input
                  type="date"
                  className="m-piese-inline-input-overlay"
                  value={toInputDate(claim.termenLivrarePiese)}
                  disabled={savingDates}
                  onChange={(e) => handleDateFieldBlur("termenLivrarePiese", e.target.value || null)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Data recepție / livrare piese"
                />
              ) : null}
            </label>
          </div>

          <label
            className={`m-piese-inline-check ${checked ? "is-checked" : ""} ${toggleDisabled ? "is-disabled" : ""}`}
            title="Au sosit piesele?"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={toggleDisabled}
              onChange={(e) => onToggle?.(claim, e.target.checked)}
              className="m-piese-inline-checkbox"
            />
            <span>Sosite</span>
          </label>

          {scheduleControl}
        </div>
        {schedulePanel}
      </div>
    );
  }

  return (
    <div
      className={`m-piese-sosite ${compact ? "space-y-1" : "space-y-1.5"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {showDatesBlock && (
        <div className={datesRevealClass}>
          <div className={metaBoxClass}>
            {showDateFields && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0">📦 Comandă:</span>
                  {canEditDates ? (
                    <input
                      type="date"
                      className="font-mono text-[10px] rounded px-1 py-0.5 flex-1 min-w-0 max-w-[130px]"
                      defaultValue={toInputDate(claim.dataComandaPiese)}
                      disabled={savingDates}
                      onBlur={(e) => handleDateFieldBlur("dataComandaPiese", e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : claim.dataComandaPiese ? (
                    <span className="font-mono">{toInputDate(claim.dataComandaPiese)}</span>
                  ) : (
                    <span className="text-[var(--app-muted-2)] italic">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0">🚚 Livrare:</span>
                  {canEditDates ? (
                    <input
                      type="date"
                      className={`font-mono text-[10px] rounded px-1 py-0.5 flex-1 min-w-0 max-w-[130px] ${
                        livrareOverdue ? "border-[var(--app-danger)] text-[var(--app-danger)]" : ""
                      }`}
                      defaultValue={toInputDate(claim.termenLivrarePiese)}
                      disabled={savingDates}
                      onBlur={(e) => handleDateFieldBlur("termenLivrarePiese", e.target.value || null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : claim.termenLivrarePiese ? (
                    <span className={`font-mono ${livrareOverdue ? "text-[var(--app-danger)]" : ""}`}>
                      {toInputDate(claim.termenLivrarePiese)}
                    </span>
                  ) : (
                    <span className="text-[var(--app-muted-2)] italic">—</span>
                  )}
                </div>
              </div>
            )}

            <div className={`${toggleRowClass}${checked ? " is-checked" : ""}`}>
              <label className={`flex items-center gap-1.5 min-w-0 ${toggleDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={toggleDisabled}
                  onChange={(e) => onToggle?.(claim, e.target.checked)}
                  className={`rounded accent-[#2F8F5B] shrink-0 cursor-pointer disabled:cursor-not-allowed ${
                    compact ? "w-3.5 h-3.5" : "w-4 h-4"
                  }`}
                />
                <span className={`flex items-center gap-1 min-w-0 ${compact ? "text-[10px] font-bold" : "text-[11px] font-extrabold"}`}>
                  {!compact && <PackageCheck size={13} className="shrink-0 opacity-80" aria-hidden />}
                  <span className="leading-none">Au sosit piesele?</span>
                </span>
              </label>
              {scheduleControl}
            </div>
          </div>

          {schedulePanel}
        </div>
      )}

      {!compact && !showDatesBlock && (
        <div className={toggleRowClass}>
          <label className={`flex items-center gap-2 min-w-0 flex-1 ${toggleDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={checked}
              disabled={toggleDisabled}
              onChange={(e) => onToggle?.(claim, e.target.checked)}
              className="rounded accent-[#2F8F5B] w-4 h-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold">
              <PackageCheck size={13} className="shrink-0 opacity-80" aria-hidden />
              Au sosit piesele?
            </span>
          </label>
          {checked ? (
            hasSchedule ? (
              <span className="text-[10px] font-extrabold bg-[#2C4160] text-white px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1">
                <CalendarClock size={11} aria-hidden />
                {scheduleLabel}
              </span>
            ) : canSchedule ? (
              <button
                type="button"
                onClick={openScheduler}
                className="m-piese-programare-btn text-[10px] font-extrabold bg-[#C98A2B] hover:bg-[#B37A22] text-white px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1 transition-all"
              >
                <CalendarClock size={11} aria-hidden />
                Programare
              </button>
            ) : (
              <span className="text-[10px] font-extrabold bg-[#2F8F5B] text-white px-2 py-0.5 rounded-md shrink-0">
                DA · SOSITE
              </span>
            )
          ) : (
            <span className="text-[10px] font-bold text-[var(--app-muted-2)] shrink-0">Bifează</span>
          )}
        </div>
      )}

      {checked && !hasSchedule && !scheduling && !compact && (
        <p className="m-piese-sosite-hint text-[10.5px] font-semibold text-[var(--app-muted)] px-0.5">
          Apasă <span className="text-[var(--app-accent)] font-extrabold">Programare</span> ca să alegi data — trece automat în Programat.
        </p>
      )}
    </div>
  );
}
