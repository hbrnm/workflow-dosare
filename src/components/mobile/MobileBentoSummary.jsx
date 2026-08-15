import React, { useMemo } from "react";
import { Wrench, AlertTriangle } from "lucide-react";
import { getStatusDefinition } from "../../constants/config";

/**
 * Mini-dashboard Bento — 2 widget-uri compacte în capul ecranului mobil:
 * capacitate atelier (mașini active) + alerte/întârzieri.
 */
export default function MobileBentoSummary({
  claims = [],
  totalAlertsCount = 0,
  blockedCount = 0,
  capacitateZilnica = 3,
  onOpenAlerts,
}) {
  const activeCount = useMemo(() => {
    return (claims || []).filter((c) => {
      if (c.blocat) return false;
      const key = getStatusDefinition(c.status).key;
      return key !== "facturat";
    }).length;
  }, [claims]);

  const capacityMax = Math.max(activeCount, (Number(capacitateZilnica) || 3) * 5, 1);
  const pct = Math.max(4, Math.min(100, Math.round((activeCount / capacityMax) * 100)));
  const alertsTotal = totalAlertsCount + blockedCount;

  return (
    <div className="grid grid-cols-2 gap-2.5 mb-4">
      {/* Widget 1: Capacitate / În lucru */}
      <div className="bg-[#202225] border border-zinc-700/40 rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Wrench size={13} strokeWidth={2.5} />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide">În lucru</span>
        </div>
        <div className="text-2xl font-extrabold text-white leading-none">{activeCount}</div>
        <div className="text-[10px] text-zinc-500 -mt-1">mașini în atelier</div>
        <div className="h-1.5 rounded-full bg-zinc-700/50 overflow-hidden mt-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Widget 2: Alerte & Întârzieri */}
      <button
        type="button"
        onClick={() => onOpenAlerts?.(alertsTotal > 0 ? "depasite" : "toate")}
        className={`text-left bg-[#202225] border rounded-xl p-3.5 flex flex-col gap-2 active:scale-[0.98] transition-transform ${
          alertsTotal > 0 ? "border-red-500/40" : "border-zinc-700/40"
        }`}
      >
        <div className={`flex items-center gap-1.5 ${alertsTotal > 0 ? "text-red-400" : "text-zinc-400"}`}>
          <AlertTriangle size={13} strokeWidth={2.5} />
          <span className="text-[10.5px] font-semibold uppercase tracking-wide">Alerte</span>
        </div>
        <div className={`text-2xl font-extrabold leading-none ${alertsTotal > 0 ? "text-red-400" : "text-white"}`}>
          {alertsTotal}
        </div>
        <div className="text-[10px] text-zinc-500 -mt-1">
          {blockedCount > 0 ? `${blockedCount} blocate · depășiri termen` : "dosare depășite"}
        </div>
      </button>
    </div>
  );
}
