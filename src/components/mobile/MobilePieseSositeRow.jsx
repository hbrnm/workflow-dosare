import React from "react";
import { PackageCheck } from "lucide-react";
import { isPieseComandateStatus } from "../../constants/config";

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
  if (!claim || !isPieseComandateStatus(claim.status)) return null;

  const checked = !!claim.pieseSosite;
  const disabled = !canEdit || typeof onToggle !== "function";

  return (
    <div
      className={`m-piese-sosite space-y-1.5 ${compact ? "" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {claim.dataComandaPiese && (
        <div className="m-piese-sosite-meta text-[10.5px] font-bold text-[#7A5316] bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
          <span>📦 Piese comandate la:</span>
          <span className="font-mono">{String(claim.dataComandaPiese).slice(0, 10)}</span>
        </div>
      )}
      <label
        className={`m-piese-sosite-toggle flex items-center justify-between gap-2 text-[13px] font-extrabold cursor-pointer select-none py-2.5 px-3 rounded-xl border-2 transition-all ${
          checked
            ? "is-checked bg-emerald-50 text-[#1F7A45] border-emerald-400"
            : "bg-[#FFF8E8] text-[#5C4810] border-[#E0B85A]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onToggle?.(claim, e.target.checked)}
            className="rounded accent-[#2F8F5B] w-[18px] h-[18px] shrink-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="flex items-center gap-1.5 min-w-0">
            <PackageCheck size={16} className="shrink-0 opacity-80" aria-hidden />
            <span className="leading-tight">Au sosit piesele?</span>
          </span>
        </span>
        {checked ? (
          <span className="text-[10px] font-extrabold bg-[#2F8F5B] text-white px-2 py-0.5 rounded-md shrink-0">
            DA · SOSITE
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[#9A7A30] shrink-0">Bifează</span>
        )}
      </label>
      {checked && !claim.dataProgramare && (
        <p className="m-piese-sosite-hint text-[10.5px] font-semibold text-[#8A8375] px-0.5">
          Apare la alerte → Piese (fără programare).
        </p>
      )}
    </div>
  );
}
