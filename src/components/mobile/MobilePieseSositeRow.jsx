import React from "react";

/**
 * Toggle "Piese sosite" — visible only for status piese_comandate.
 * Sets claim.pieseSosite; alerts bucket "piese" picks it up when unscheduled.
 */
export default function MobilePieseSositeRow({
  claim,
  canEdit = true,
  onToggle,
  compact = false,
}) {
  if (!claim || claim.status !== "piese_comandate") return null;

  const checked = !!claim.pieseSosite;
  const disabled = !canEdit || typeof onToggle !== "function";

  return (
    <div className={`space-y-1 ${compact ? "" : ""}`} onClick={(e) => e.stopPropagation()}>
      {claim.dataComandaPiese && (
        <div className="text-[10.5px] font-bold text-[#7A5316] bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
          <span>📦 Piese comandate la:</span>
          <span className="font-mono">{String(claim.dataComandaPiese).slice(0, 10)}</span>
        </div>
      )}
      <label
        className={`flex items-center justify-between gap-2 text-[12px] font-bold cursor-pointer select-none py-2 px-2.5 rounded-xl border transition-all ${
          checked
            ? "bg-emerald-50 text-[#2F8F5B] border-emerald-200"
            : "bg-[#FAF8F5] text-[#5B6572] border-[#DAD4C6]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onToggle?.(claim, e.target.checked)}
            className="rounded accent-[#2F8F5B] w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
          />
          <span>Piese sosite</span>
        </span>
        {checked && (
          <span className="text-[9.5px] font-extrabold bg-[#2F8F5B] text-white px-1.5 py-0.5 rounded shrink-0">
            SOSITE
          </span>
        )}
      </label>
      {checked && !claim.dataProgramare && (
        <p className="text-[10px] font-semibold text-[#8A8375] px-0.5">
          Apare la alerte → Piese (fără programare).
        </p>
      )}
    </div>
  );
}
