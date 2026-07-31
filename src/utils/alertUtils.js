import { daysBetween } from "./dateUtils";

// După ce un dosar este gata de ridicare, el este urmărit separat de alertele
// de întârziere ale etapelor din flux.
export function isReadyForPickupOverdue(claim, pickupThresholdDays) {
  return Boolean(
    claim.gataDeRidicare &&
    !claim.ridicata &&
    claim.dataGataRidicare &&
    daysBetween(claim.dataGataRidicare) >= pickupThresholdDays
  );
}

export function isStageOverdue(claim) {
  return Boolean(
    claim.status !== "facturat" &&
    !(claim.gataDeRidicare && !claim.ridicata) &&
    daysBetween(claim.dataSchimbareStatus) >= (claim.termenAlertaZile || 3)
  );
}
