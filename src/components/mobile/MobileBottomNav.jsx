import React from "react";
import { LayoutGrid, Bell, CalendarClock, Plus } from "lucide-react";
import { softHaptic } from "../../utils/mobilePrefs";

/**
 * Bară de navigație inferioară plutitoare — stil „Dark Bento".
 * Ascunsă automat când `hidden` (ex. modale/sheet-uri deschise deasupra).
 */
export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenAlerts,
  onNewClaim,
  totalAlertsCount = 0,
  hidden = false,
}) {
  if (hidden) return null;

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
      className="fixed bottom-3 inset-x-4 bg-[#18191b]/95 backdrop-blur-md border border-zinc-700/60 rounded-2xl py-2.5 px-6 flex justify-around items-center z-50 shadow-2xl"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0px))" }}
      aria-label="Navigare principală"
    >
      <button
        type="button"
        onClick={() => go("brief")}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
          activeTab === "brief" ? "text-emerald-400" : "text-zinc-400"
        }`}
        aria-pressed={activeTab === "brief"}
      >
        <LayoutGrid size={20} strokeWidth={2.25} />
        <span className="text-[10px] font-semibold tracking-tight">Flux</span>
      </button>

      <button
        type="button"
        onClick={handleAlerts}
        className="relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-zinc-400 transition-colors"
        aria-label={`Alerte${totalAlertsCount > 0 ? `, ${totalAlertsCount} active` : ""}`}
      >
        <span className="relative">
          <Bell size={20} strokeWidth={2.25} />
          {totalAlertsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow">
              {badgeLabel}
            </span>
          )}
        </span>
        <span className="text-[10px] font-semibold tracking-tight">Alerte</span>
      </button>

      <button
        type="button"
        onClick={handleNew}
        className="relative -translate-y-3.5 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 text-black shadow-[0_8px_24px_rgba(16,185,129,0.45)] border-2 border-[#18191b] active:scale-95 transition-transform"
        aria-label="Dosar nou"
        title="+ Dosar Nou"
      >
        <Plus size={26} strokeWidth={2.75} />
      </button>

      <button
        type="button"
        onClick={() => go("programari")}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
          activeTab === "programari" ? "text-emerald-400" : "text-zinc-400"
        }`}
        aria-pressed={activeTab === "programari"}
      >
        <CalendarClock size={20} strokeWidth={2.25} />
        <span className="text-[10px] font-semibold tracking-tight">Programări</span>
      </button>

      <button
        type="button"
        onClick={() => go("dosare")}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
          activeTab === "dosare" ? "text-emerald-400" : "text-zinc-400"
        }`}
        aria-pressed={activeTab === "dosare"}
      >
        <span className="text-[10px] font-black leading-none">≡</span>
        <span className="text-[10px] font-semibold tracking-tight">Dosare</span>
      </button>
    </nav>
  );
}
