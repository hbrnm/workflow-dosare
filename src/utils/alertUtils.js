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

export function getDaysInStage(claim) {
  return claim?.dataSchimbareStatus ? daysBetween(claim.dataSchimbareStatus) : 0;
}

// Dosare cu accept de plată dar pentru care nu au fost comandate încă piesele
export function isAcceptPlataWithoutParts(claim) {
  return Boolean(
    !claim.blocat &&
    claim.status === "accept_plata"
  );
}

// Detectează dosarele care nu au avut nicio modificare/activitate de mai mult de X zile
export function isInactiveClaim(claim, inactivityThresholdDays = 7) {
  if (["predat_client", "facturat"].includes(claim.status)) return false;
  const lastUpdate = claim.dataUltimeiActualizari || claim.dataSchimbareStatus || claim.dataDeschiderii;
  return daysBetween(lastUpdate) >= inactivityThresholdDays;
}

export function getDaysSinceLastActivity(claim) {
  const lastUpdate = claim?.dataUltimeiActualizari || claim?.dataSchimbareStatus || claim?.dataDeschiderii;
  return lastUpdate ? daysBetween(lastUpdate) : 0;
}
