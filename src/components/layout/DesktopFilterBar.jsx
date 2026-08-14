import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { STATUSES } from "../../constants/config";

export default function DesktopFilterBar({
  view,
  showFilterPanel,
  setShowFilterPanel,
  activeFilterCount = 0,
  filterTip = "toate",
  setFilterTip,
  filterAsigurator = "toti",
  setFilterAsigurator,
  filterStatus = "toate",
  setFilterStatus,
  insurers = [],
  resetFilters,
}) {
  if (["brief", "programator", "flux", "dosare"].includes(view)) {
    return null;
  }

  return (
    <div className="hidden md:block px-4 py-2 bg-[var(--app-surface)] border-b border-[var(--app-border)] shrink-0 z-10">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilterPanel((open) => !open)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            showFilterPanel || activeFilterCount
              ? "border-[var(--app-muted)] bg-[var(--app-surface-muted)] text-[var(--app-text)]"
              : "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:bg-[var(--app-border-soft)]"
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtre avansate"}</span>
        </button>
      </div>

      {showFilterPanel && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-2.5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Tip asigurare</span>
            <select
              className="in min-w-[130px]"
              value={filterTip}
              onChange={(e) => setFilterTip(e.target.value)}
            >
              <option value="toate">Toate</option>
              <option value="CASCO">CASCO</option>
              <option value="RCA">RCA</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Asigurător</span>
            <select
              className="in min-w-[190px]"
              value={filterAsigurator}
              onChange={(e) => setFilterAsigurator(e.target.value)}
            >
              <option value="toti">Toți asigurătorii</option>
              {insurers.map((insurer) => (
                <option key={insurer} value={insurer}>
                  {insurer}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Status</span>
            <select
              className="in min-w-[190px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="toate">Toate statusurile</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {String(s.num).padStart(2, "0")}. {s.label}
                </option>
              ))}
            </select>
          </label>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-[var(--app-danger)] hover:underline"
            >
              <X size={13} /> Resetează
            </button>
          )}
        </div>
      )}
    </div>
  );
}
