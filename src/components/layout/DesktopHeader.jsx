import React from "react";
import { Layers, Sunrise, List, Search, X, Plus, Bell, Ban } from "lucide-react";
import AppButton from "../common/AppButton";
import TooltipGuide from "../common/TooltipGuide";
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
  claims = [],
  userEmail = "",
  openSettings,
}) {
  const isDosareView = view === "dosare" || view === "flux" || view === "brief" || view === "list";

  return (
    <header className="relative h-12 app-header border-b px-4 flex items-center justify-between shrink-0 z-20 gap-3">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] md:text-[15px] font-medium transition-all cursor-pointer ${
                dosareSubView === "flux"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <Layers size={15} />
              <span className="hidden md:inline">Flux</span>
            </button>

            <button
              type="button"
              onClick={() => setDosareSubView("brief")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] md:text-[15px] font-medium transition-all cursor-pointer ${
                dosareSubView === "brief"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <Sunrise size={15} />
              <span className="hidden md:inline">Brief</span>
              {totalAlertsCount > 0 && (
                <span className="bg-[var(--app-danger)] text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono min-w-[16px] text-center font-bold">
                  {totalAlertsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDosareSubView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] md:text-[15px] font-medium transition-all cursor-pointer ${
                dosareSubView === "list"
                  ? "app-segment-active"
                  : "app-muted hover:text-[var(--app-text)]"
              }`}
            >
              <List size={15} />
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
              if (e.key === "Escape") {
                if (search) {
                  e.stopPropagation();
                  setSearch("");
                }
                return;
              }
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
          <TooltipGuide
            id="tt-dosar-nou"
            title="Creare / Import Dosar Nou"
            content="Apasă aici pentru a deschide modalul rapid. Poți importa direct un deviz Audatex / DAT sau crea un dosar manual în < 30 secunde!"
            position="bottom"
          >
            <AppButton
              variant="primary"
              onClick={() => openNew()}
              className="app-header-action-btn bg-[var(--app-accent,#0284c7)] hover:bg-[var(--app-accent-hover,#0369a1)] text-white font-bold border-[var(--app-accent,#0284c7)] shadow-sm"
            >
              <Plus size={14} /> <span>Dosar nou</span>
            </AppButton>
          </TooltipGuide>
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
