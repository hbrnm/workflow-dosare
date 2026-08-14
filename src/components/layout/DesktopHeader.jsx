import React from "react";
import { Layers, Sunrise, List, Search, X, Plus, Sparkles, Bell, Ban } from "lucide-react";
import AppButton from "../common/AppButton";
import { ROLES } from "../../constants/roles";

export default function DesktopHeader({
  view,
  dosareSubView,
  setDosareSubView,
  setOnlyBlocked,
  totalAlertsCount = 0,
  blockedCount = 0,
  search = "",
  setSearch,
  setIsCommandPaletteOpen,
  userCanCreate = false,
  myRole = "",
  myRoleLabel = "",
  openNew,
  setIsAiModalOpenHeader,
  openAlerts,
  openBlockedClaims,
}) {
  const isDosareView = view === "dosare" || view === "flux" || view === "brief" || view === "list";

  return (
    <header className="relative h-12 app-header border-b px-4 flex items-center justify-between shrink-0 z-20">
      {/* Segment (dosare) — sub-vizualizări */}
      <div className="flex items-center gap-3 text-[13px] min-w-0">
        {isDosareView && (
          <div className="flex items-center app-segment-track border p-0.5 rounded-full font-medium text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => {
                setOnlyBlocked(false);
                setDosareSubView("flux");
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                dosareSubView === "flux"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <Layers size={12} />
              <span className="hidden md:inline">Flux</span>
            </button>

            <button
              type="button"
              onClick={() => setDosareSubView("brief")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                dosareSubView === "brief"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <Sunrise size={12} />
              <span className="hidden md:inline">Brief</span>
              {totalAlertsCount > 0 && (
                <span className="bg-[var(--app-danger)] text-white text-[9px] px-1 py-0 rounded-full font-mono min-w-[14px] text-center">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDosareSubView("list")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                dosareSubView === "list"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <List size={12} />
              <span className="hidden md:inline">Tabel</span>
            </button>
          </div>
        )}
      </div>

      {/* Search — CommandPalette launcher (Ctrl+K); icon below lg */}
      <div className="flex items-center absolute left-1/2 -translate-x-1/2">
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="lg:hidden p-2 rounded-lg app-nav-btn text-[var(--app-muted)] hover:text-[var(--app-text)]"
          title="Caută sau comandă (Ctrl+K)"
          aria-label="Caută sau comandă"
        >
          <Search size={18} />
        </button>
        <div className="hidden lg:block relative app-search-lg">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            readOnly
            tabIndex={0}
            role="button"
            aria-label="Caută sau comandă"
            onFocus={() => setIsCommandPaletteOpen(true)}
            onClick={() => setIsCommandPaletteOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") return;
              if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
              }
            }}
            placeholder="Caută sau comandă…"
            className="app-search w-full pl-10 pr-20 py-2 rounded-lg text-[13px] transition-all font-medium cursor-pointer"
            title="Caută sau comandă (Ctrl+K)"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="p-0.5 rounded-full hover:bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                title="Șterge căutarea"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="app-kbd text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
              title="Căutare inteligentă (Ctrl+K)"
            >
              Ctrl+K
            </button>
          </div>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2">
        {userCanCreate ? (
          <>
            <AppButton
              variant="primary"
              onClick={() => openNew()}
              className="app-header-action-btn"
            >
              <Plus size={14} /> <span>Dosar nou</span>
            </AppButton>
            <button
              type="button"
              onClick={() => setIsAiModalOpenHeader(true)}
              className="app-header-action-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[12px] font-bold transition-all cursor-pointer shadow-sm"
              title="Scanează și extrage automat datele din deviz/PV"
            >
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span className="hidden sm:inline">Scanează Document</span>
            </button>
          </>
        ) : (
          <span
            className="app-type-xs text-[var(--app-muted)] px-2 hidden sm:inline"
            title={ROLES[myRole]?.description}
          >
            {myRoleLabel}
          </span>
        )}

        <AppButton
          variant={totalAlertsCount > 0 ? "danger" : "secondary"}
          onClick={() => openAlerts(totalAlertsCount > 0 ? "depasite" : "toate")}
          className="app-header-action-btn"
          title="Deschide Centrul de Alerte"
        >
          <Bell size={14} />
          <span>{totalAlertsCount} Alerte</span>
        </AppButton>

        {blockedCount > 0 ? (
          <AppButton
            variant="secondary"
            onClick={openBlockedClaims}
            className="app-header-action-btn"
            title="Dosare blocate — inventar separat de alerte"
          >
            <Ban size={14} />
            <span>{blockedCount} Blocate</span>
          </AppButton>
        ) : null}
      </div>
    </header>
  );
}
