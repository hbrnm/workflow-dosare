import React from "react";
import { Filter, ArrowUpDown, Layers, Camera, CalendarClock, BarChart3, Search, X } from "lucide-react";
import { STATUSES } from "../../constants/config";

export default function DesktopMobileDock({
  view,
  setView,
  activeFilterCount = 0,
  mobileSort,
  setMobileSort,
  mobileFilterSheetOpen,
  setMobileFilterSheetOpen,
  openQuickCapture,
  // Sheet props
  search = "",
  setSearch,
  filterTip = "toate",
  setFilterTip,
  onlyBlocked = false,
  setOnlyBlocked,
  filterAsigurator = "toti",
  setFilterAsigurator,
  filterStatus = "toate",
  setFilterStatus,
  insurers = [],
  resetFilters,
  filteredClaimsCount = 0,
}) {
  return (
    <>
      {/* Decathlon Style Sub-Header on Mobile: Sticky Filter & Sort Buttons */}
      <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10 text-white md:hidden text-[12px] font-bold">
        <button
          onClick={() => setMobileFilterSheetOpen(true)}
          className={`flex items-center justify-center gap-2 py-2.5 transition-colors ${
            activeFilterCount > 0 ? "bg-[var(--app-accent)] text-white" : "bg-[var(--app-surface)] text-white"
          }`}
        >
          <Filter size={14} className="text-white" />
          <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtrează"}</span>
        </button>

        <button
          onClick={() => {
            setMobileSort((prev) =>
              prev === "recent"
                ? "status"
                : prev === "status"
                ? "numar"
                : prev === "numar"
                ? "client"
                : "recent"
            );
          }}
          className="flex items-center justify-center gap-2 py-2.5 bg-[var(--app-surface)] active:bg-[var(--app-surface-muted)] transition-colors border-l border-white/10"
        >
          <ArrowUpDown size={14} className="text-[var(--app-accent)]" />
          <span className="truncate">
            {mobileSort === "recent"
              ? "Recente"
              : mobileSort === "status"
              ? "Status"
              : mobileSort === "numar"
              ? "Nr. dosar"
              : "Client"}
          </span>
        </button>
      </div>

      {/* Decathlon Floating Curved Bottom Dock (Mobile Nav Bar) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 md:hidden w-[92%] max-w-sm">
        <div className="bg-[var(--app-surface)]/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-4 py-2 grid grid-cols-[1fr_auto_1fr_1fr] gap-3 text-white items-center">
          {[
            { id: "dosare", label: "Dosare", icon: Layers },
            { id: "quickCapture", label: "Scan/Foto", icon: Camera, isAction: true },
            { id: "programator", label: "Programat", icon: CalendarClock },
            { id: "dashboard", label: "Statistici", icon: BarChart3 },
          ].map(({ id, label, icon: Icon, isAction }) => {
            const active = view === id;
            if (isAction) {
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openQuickCapture()}
                  className="col-span-1 flex items-center justify-center p-3 rounded-full bg-gradient-to-tr from-[var(--app-accent)] to-[#E5A84B] text-white shadow-lg -mt-5 border-[3px] border-[var(--app-surface)] active:scale-95 transition-transform"
                  title="Captură rapidă foto & scanner cameră"
                >
                  <Icon size={20} />
                  <span className="text-[8.5px] font-black tracking-tight uppercase mt-0.5">Scan</span>
                </button>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-full transition-all min-w-0 ${
                  active
                    ? "bg-[var(--app-accent)] text-white font-bold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[9.5px] font-semibold tracking-tight mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decathlon Mobile Bottom Sheet Filters */}
      {mobileFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center md:hidden">
          <div className="bg-[var(--app-surface-2)] w-full rounded-t-2xl border-t border-[var(--app-border)] p-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-[var(--app-border)] rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
              <h3 className="font-bold text-[15px] text-[var(--app-text-strong)] flex items-center gap-2">
                <Filter size={16} className="text-[var(--app-accent)]" /> Filtrează Dosarele
              </h3>
              <button
                type="button"
                onClick={() => setMobileFilterSheetOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-full text-[var(--app-muted)] hover:bg-[var(--app-border-soft)] active:scale-95 transition-colors"
                aria-label="Închide panoul de filtre"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Căutare text</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--app-border)] text-[14px] bg-[var(--app-surface)]"
                  placeholder="Nr. dosar, client, nr. auto, VIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Tip asigurare</label>
                <select
                  className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-[var(--app-surface)] font-semibold"
                  value={filterTip}
                  onChange={(e) => setFilterTip(e.target.value)}
                >
                  <option value="toate">Toate</option>
                  <option value="CASCO">CASCO</option>
                  <option value="RCA">RCA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Doar Blocat</label>
                <button
                  type="button"
                  onClick={() => setOnlyBlocked((v) => !v)}
                  className={`w-full p-2.5 rounded-lg border text-[13px] font-semibold text-center transition-colors ${
                    onlyBlocked
                      ? "bg-[var(--app-danger)] text-white border-[var(--app-danger)]"
                      : "bg-[var(--app-surface)] text-[var(--app-muted)] border-[var(--app-border)]"
                  }`}
                >
                  {onlyBlocked ? "Blocat DA" : "Toate"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Asigurător</label>
              <select
                className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-[var(--app-surface)] font-semibold"
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
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Status Dosar</label>
              <select
                className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-[var(--app-surface)] font-semibold"
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
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--app-border)]">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    resetFilters();
                    setSearch("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-[var(--app-danger)] text-[var(--app-danger)] text-[13px] font-bold hover:bg-red-50 text-center"
                >
                  Resetează
                </button>
              )}
              <button
                onClick={() => setMobileFilterSheetOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[var(--app-accent)] text-white text-[13px] font-bold hover:bg-[var(--app-accent-hover)] text-center shadow-md"
              >
                Aplică Filtre ({filteredClaimsCount} dosare)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
