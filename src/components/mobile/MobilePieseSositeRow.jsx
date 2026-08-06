import React, { useState } from "react";
import { PackageCheck, CalendarClock, Save } from "lucide-react";
import { isPieseComandateStatus } from "../../constants/config";
import { todayISO } from "../../utils/dateUtils";

/**
 * Toggle "Piese sosite" — visible only for status piese_comandate.
 * When checked and unscheduled, shows interactive „Programare” → date/time picker.
 */
export default function MobilePieseSositeRow({
  claim,
  canEdit = true,
  onToggle,
  onSchedule,
  onPatchDates,
  compact = false,
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

  const toInputDate = (val) => (val ? String(val).slice(0, 10) : "");

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
        return t ? `${d} ${t}` : d;
      })()
    : null;

  const livrareOverdue =
    claim.termenLivrarePiese &&
    !claim.pieseSosite &&
    toInputDate(claim.termenLivrarePiese) < todayISO();

  return (
    <div
      className={`m-piese-sosite space-y-1.5 ${compact ? "" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {(claim.dataComandaPiese || claim.termenLivrarePiese || canEditDates) && (
        <div className="m-piese-sosite-meta text-[10px] font-bold text-[#7A5316] bg-amber-50 p-1.5 rounded-lg border border-amber-200 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0">📦 Comandă:</span>
            {canEditDates ? (
              <input
                type="date"
                className="font-mono text-[10px] bg-white border border-amber-200 rounded px-1 py-0.5 flex-1 min-w-0"
                defaultValue={toInputDate(claim.dataComandaPiese)}
                disabled={savingDates}
                onBlur={(e) => handleDateFieldBlur("dataComandaPiese", e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : claim.dataComandaPiese ? (
              <span className="font-mono">{toInputDate(claim.dataComandaPiese)}</span>
            ) : (
              <span className="text-[#9A7A30] italic">—</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0">🚚 Livrare:</span>
            {canEditDates ? (
              <input
                type="date"
                className={`font-mono text-[10px] bg-white border rounded px-1 py-0.5 flex-1 min-w-0 ${
                  livrareOverdue ? "border-[#D6473F] text-[#D6473F]" : "border-amber-200"
                }`}
                defaultValue={toInputDate(claim.termenLivrarePiese)}
                disabled={savingDates}
                onBlur={(e) => handleDateFieldBlur("termenLivrarePiese", e.target.value || null)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : claim.termenLivrarePiese ? (
              <span className={`font-mono ${livrareOverdue ? "text-[#D6473F]" : ""}`}>
                {toInputDate(claim.termenLivrarePiese)}
              </span>
            ) : (
              <span className="text-[#9A7A30] italic">—</span>
            )}
          </div>
        </div>
      )}

      <div
        className={`m-piese-sosite-toggle flex items-center justify-between gap-2 text-[13px] font-extrabold select-none py-2.5 px-3 rounded-xl border-2 transition-all ${
          checked
            ? "is-checked bg-emerald-50 text-[#1F7A45] border-emerald-400"
            : "bg-[#FFF8E8] text-[#5C4810] border-[#E0B85A]"
        } ${toggleDisabled ? "opacity-60" : ""}`}
      >
        <label className={`flex items-center gap-2.5 min-w-0 flex-1 ${toggleDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={toggleDisabled}
            onChange={(e) => onToggle?.(claim, e.target.checked)}
            className="rounded accent-[#2F8F5B] w-[18px] h-[18px] shrink-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="flex items-center gap-1.5 min-w-0">
            <PackageCheck size={16} className="shrink-0 opacity-80" aria-hidden />
            <span className="leading-tight">Au sosit piesele?</span>
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
              className="m-piese-programare-btn text-[10px] font-extrabold bg-[#C98A2B] hover:bg-[#B37A22] active:scale-[0.97] text-white px-2.5 py-1 rounded-md shrink-0 inline-flex items-center gap-1 transition-all"
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
          <span className="text-[10px] font-bold text-[#9A7A30] shrink-0">Bifează</span>
        )}
      </div>

      {checked && scheduling && canSchedule && (
        <div className="m-piese-schedule-panel bg-[#FAF8F5] border border-[#C98A2B]/55 p-2.5 rounded-xl space-y-2">
          <div className="text-[10.5px] font-bold text-[#7A5316] flex items-center gap-1">
            <CalendarClock size={12} /> Alege data &amp; ora programării
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="bg-white border border-[#DAD4C6] rounded-lg p-1.5 text-[12px] font-bold text-[#23282E]"
            />
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="bg-white border border-[#DAD4C6] rounded-lg p-1.5 text-[12px] font-bold text-[#23282E]"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={cancelScheduler}
              className="px-2.5 py-1 rounded-lg border border-[#DAD4C6] text-[11px] font-bold text-[#6B6558] hover:bg-gray-100"
            >
              Anulează
            </button>
            <button
              type="button"
              disabled={saving || !editDate}
              onClick={saveSchedule}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#C98A2B] text-white text-[11px] font-extrabold hover:bg-[#B37A22] shadow-xs disabled:opacity-50"
            >
              <Save size={12} />
              {saving ? "…" : "Salvează"}
            </button>
          </div>
        </div>
      )}

      {checked && !hasSchedule && !scheduling && (
        <p className="m-piese-sosite-hint text-[10.5px] font-semibold text-[#8A8375] px-0.5">
          Apasă <span className="text-[#C98A2B] font-extrabold">Programare</span> ca să alegi data — trece automat în Programat.
        </p>
      )}
    </div>
  );
}
