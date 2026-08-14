import { useMemo } from "react";
import { buildAlertBuckets } from "../utils/alertUtils";

/**
 * Shared operational alerts for desktop Brief, mobile Brief, AlerteModal, and nav badges.
 */
export function useAlerts(userClaims = [], pragRidicare, pragInactivitate) {
  const buckets = useMemo(
    () => buildAlertBuckets(userClaims, { pragRidicare, pragInactivitate }),
    [userClaims, pragRidicare, pragInactivitate]
  );

  return {
    buckets,
    items: buckets.items,
    byType: buckets.byType,
    counts: buckets.counts,
    // Legacy count keys (kept for existing App.jsx / badges)
    alertCount: buckets.counts.stagnate,
    blockedCount: buckets.counts.blocate,
    gataNeridicateCount: buckets.counts.neridicate,
    acceptPlataNoPartsCount: buckets.counts.accept_plata,
    inactiveCount: buckets.counts.inactivitate,
    loanerOverdueCount: buckets.counts.masini_schimb,
    partsUnscheduledCount: buckets.counts.piese,
    deliveryOverdueCount: buckets.counts.livrare_piese,
    totalAlertsCount: buckets.totalAlertsCount,
  };
}
