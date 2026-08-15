import React from "react";
import { LayoutGrid, Bell, CalendarClock, Plus, ListChecks } from "lucide-react";
import { softHaptic } from "../../utils/mobilePrefs";

/**
 * Bară de navigație inferioară fixă — stil „Dark Bento".
 * Rămâne ancorată jos, pe toată lățimea ecranului, în orice ecran mobil.
 */
export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenAlerts,
  onNewClaim,
  totalAlertsCount = 0,
}) {
  const go = (id) => {
    softHaptic(8);
    onTabChange?.(id);
  };

  const handleAlerts = () => {
    softHaptic(8);
    onOpenAlerts?.(totalAlertsCount > 0 ? "depasite" : "toate");
  };

  const handleNew = () => {
    softHaptic(10);
    onNewClaim?.();
  };

  const badgeLabel = totalAlertsCount > 99 ? "99+" : totalAlertsCount;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 bg-[#18191b]/97 backdrop-blur-md border-t border-zinc-700/60 shadow-[0_-8px_28px_rgba(0,0,0,0.45)]"
      aria-label="Navigare principală"
    >
      <div
        className="grid grid-cols-5 items-center max-w-md mx-auto"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={() => go("brief")}
          className={`flex flex-col items-center justify-center gap-1 pt-2.5 pb-1 transition-colors ${
            activeTab === "brief" ? "text-emerald-400" : "text-zinc-400"
          }`}
          aria-pressed={activeTab === "brief"}
        >
          <LayoutGrid size={20} strokeWidth={2.25} />
          <span className="text-[10px] font-semibold tracking-tight leading-none">Flux</span>
        </button>

        <button
          type="button"
          onClick={handleAlerts}
          className="relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-1 text-zinc-400 transition-colors"
          aria-label={`Alerte${totalAlertsCount > 0 ? `, ${totalAlertsCount} active` : ""}`}
        >
          <span className="relative inline-flex">
            <Bell size={20} strokeWidth={2.25} />
            {totalAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow">
                {badgeLabel}
              </span>
            )}
          </span>
          <span className="text-[10px] font-semibold tracking-tight leading-none">Alerte</span>
        </button>

        <div className="flex flex-col items-center justify-end pb-1">
          <button
            type="button"
            onClick={handleNew}
            className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-black shadow-[0_8px_24px_rgba(16,185,129,0.45)] border-4 border-[#18191b] active:scale-95 transition-transform"
            aria-label="Dosar nou"
            title="+ Dosar Nou"
          >
            <Plus size={24} strokeWidth={2.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => go("programari")}
          className={`flex flex-col items-center justify-center gap-1 pt-2.5 pb-1 transition-colors ${
            activeTab === "programari" ? "text-emerald-400" : "text-zinc-400"
          }`}
          aria-pressed={activeTab === "programari"}
        >
          <CalendarClock size={20} strokeWidth={2.25} />
          <span className="text-[10px] font-semibold tracking-tight leading-none">Programări</span>
        </button>

        <button
          type="button"
          onClick={() => go("dosare")}
          className={`flex flex-col items-center justify-center gap-1 pt-2.5 pb-1 transition-colors ${
            activeTab === "dosare" ? "text-emerald-400" : "text-zinc-400"
          }`}
          aria-pressed={activeTab === "dosare"}
        >
          <ListChecks size={20} strokeWidth={2.25} />
          <span className="text-[10px] font-semibold tracking-tight leading-none">Dosare</span>
        </button>
      </div>
    </nav>
  );
}
