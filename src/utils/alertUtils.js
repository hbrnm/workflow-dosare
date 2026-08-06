import { daysBetween } from "./dateUtils";
import { getStatusDefinition, getClaimAlertDays } from "../constants/config";

/** Canonical alert type keys used by Brief, MobileBrief, and AlerteModal. */
export const ALERT_TYPES = [
  "blocate",
  "masini_schimb",
  "stagnate",
  "piese",
  "neridicate",
  "accept_plata",
  "inactivitate",
];

/** Legacy modal tab key → canonical type */
export const ALERT_TAB_ALIASES = {
  depasite: "stagnate",
};

export function normalizeAlertTab(tab) {
  if (!tab || tab === "toate") return tab || "toate";
  return ALERT_TAB_ALIASES[tab] || tab;
}

// După ce un dosar este gata de ridicare, el este urmărit separat de alertele
// de întârziere ale etapelor din flux.
export function isReadyForPickupOverdue(claim, pickupThresholdDays) {
  if (claim?.alerteAck) return false;
  return Boolean(
    claim.gataDeRidicare &&
    !claim.ridicata &&
    claim.dataGataRidicare &&
    daysBetween(claim.dataGataRidicare) >= pickupThresholdDays
  );
}

export function isStageOverdue(claim) {
  if (claim?.alerteAck) return false;
  const threshold = getClaimAlertDays(claim);
  return Boolean(
    claim.status !== "facturat" &&
    !(claim.gataDeRidicare && !claim.ridicata) &&
    daysBetween(claim.dataSchimbareStatus) >= threshold
  );
}

export function getDaysInStage(claim) {
  return claim?.dataSchimbareStatus ? daysBetween(claim.dataSchimbareStatus) : 0;
}

// Dosare cu accept de plată dar pentru care nu au fost comandate încă piesele
export function isAcceptPlataWithoutParts(claim) {
  if (claim?.alerteAck) return false;
  return Boolean(
    !claim.blocat &&
    claim.status === "accept_plata"
  );
}

// Detectează dosarele care nu au avut nicio modificare/activitate de mai mult de X zile
export function isInactiveClaim(claim, inactivityThresholdDays = 7) {
  if (["predat_client", "facturat"].includes(claim.status)) return false;
  if (claim?.alerteAck) return false;
  const lastUpdate = claim.dataUltimeiActualizari || claim.dataSchimbareStatus || claim.dataDeschiderii;
  return daysBetween(lastUpdate) >= inactivityThresholdDays;
}

export function getDaysSinceLastActivity(claim) {
  const lastUpdate = claim?.dataUltimeiActualizari || claim?.dataSchimbareStatus || claim?.dataDeschiderii;
  return lastUpdate ? daysBetween(lastUpdate) : 0;
}

/** Dosar blocat / litigiu — respectă alerteAck ca celelalte categorii. */
export function isBlocked(claim) {
  if (claim?.alerteAck) return false;
  return Boolean(claim?.blocat);
}

/** Auto la schimb cu zile Audatex depășite. */
export function isLoanerOverdue(claim) {
  if (claim?.alerteAck) return false;
  if (!claim?.masinaSchimb || !String(claim.masinaSchimb).trim()) return false;
  if (claim.status === "facturat") return false;
  const zileChirie = Number(claim.zileChirieAudatex) || 0;
  if (zileChirie <= 0) return false;
  const zile = daysBetween(claim.dataDariiLaSchimb || claim.dataProgramare);
  return zile > zileChirie;
}

export function getLoanerDaysUsed(claim) {
  return daysBetween(claim?.dataDariiLaSchimb || claim?.dataProgramare);
}

/** Piese sosite / status vechi piese_sosite, fără dată de programare. */
export function isPartsArrivedUnscheduled(claim) {
  if (claim?.alerteAck) return false;
  return Boolean((claim?.pieseSosite || claim?.status === "piese_sosite") && !claim?.dataProgramare);
}

function sortByDaysDesc(claims, dateField) {
  return [...claims].sort(
    (a, b) => daysBetween(b[dateField]) - daysBetween(a[dateField])
  );
}

/**
 * Single source of truth for operational alerts.
 * Returns claim lists per type, display items, and counts.
 */
export function buildAlertBuckets(claims = [], { pragRidicare = 3, pragInactivitate = 7 } = {}) {
  const list = Array.isArray(claims) ? claims.filter(Boolean) : [];

  const blocate = list.filter(isBlocked);
  const masiniSchimb = list
    .filter(isLoanerOverdue)
    .map((c) => ({ ...c, zile: getLoanerDaysUsed(c), depasit: true }))
    .sort((a, b) => b.zile - a.zile);
  const stagnate = sortByDaysDesc(list.filter(isStageOverdue), "dataSchimbareStatus");
  const piese = list.filter(isPartsArrivedUnscheduled);
  const neridicate = sortByDaysDesc(
    list.filter((c) => isReadyForPickupOverdue(c, pragRidicare)),
    "dataGataRidicare"
  );
  const acceptPlata = list.filter(isAcceptPlataWithoutParts);
  const inactivitate = list.filter((c) => isInactiveClaim(c, pragInactivitate));

  const byType = {
    blocate,
    masini_schimb: masiniSchimb,
    stagnate,
    piese,
    neridicate,
    accept_plata: acceptPlata,
    inactivitate,
  };

  const counts = {
    blocate: blocate.length,
    masini_schimb: masiniSchimb.length,
    stagnate: stagnate.length,
    piese: piese.length,
    neridicate: neridicate.length,
    accept_plata: acceptPlata.length,
    inactivitate: inactivitate.length,
  };

  // Legacy aliases used by badges / openAlerts("depasite")
  counts.depasite = counts.stagnate;

  const items = [];

  blocate.forEach((c) => {
    items.push({
      id: `blocate-${c.id}`,
      claim: c,
      type: "blocate",
      title: "Dosar Blocat",
      reason: c.motivBlocare || "Lipsă motiv specificat",
      severity: "critical",
    });
  });

  masiniSchimb.forEach((c) => {
    const depasireZile = c.zile - (Number(c.zileChirieAudatex) || 0);
    items.push({
      id: `masini_schimb-${c.id}`,
      claim: c,
      type: "masini_schimb",
      title: `Auto la Schimb Excedat (+${depasireZile}z)`,
      reason: `Auto: ${c.masinaSchimb} · Folosit ${c.zile} zile (limită Audatex: ${c.zileChirieAudatex}z)`,
      severity: "warning",
    });
  });

  stagnate.forEach((c) => {
    const zile = getDaysInStage(c);
    const sDef = getStatusDefinition(c.status);
    items.push({
      id: `stagnate-${c.id}`,
      claim: c,
      type: "stagnate",
      title: `Întârziere în Etapă (${zile} zile)`,
      reason: `Status curent: ${sDef.label} (depășit pragul recomandat)`,
      severity: "info",
    });
  });

  piese.forEach((c) => {
    items.push({
      id: `piese-${c.id}`,
      claim: c,
      type: "piese",
      title: "Piese Sosite - Fără Programare",
      reason: "Piesele au fost recepționate dar nu a fost stabilită o dată de intrare în service",
      severity: "warning",
    });
  });

  neridicate.forEach((c) => {
    const zile = daysBetween(c.dataGataRidicare);
    items.push({
      id: `neridicate-${c.id}`,
      claim: c,
      type: "neridicate",
      title: `Mașină Neridicată (${zile} zile)`,
      reason: `Mașina este gata din ${c.dataGataRidicare ? c.dataGataRidicare.slice(0, 10) : "—"} și nu a fost preluată`,
      severity: "warning",
    });
  });

  acceptPlata.forEach((c) => {
    items.push({
      id: `accept_plata-${c.id}`,
      claim: c,
      type: "accept_plata",
      title: "Accept fără piese comandate",
      reason: "Accept de plată primit — comanda de piese nu a fost lansată",
      severity: "info",
    });
  });

  inactivitate.forEach((c) => {
    const zile = getDaysSinceLastActivity(c);
    const sDef = getStatusDefinition(c.status);
    items.push({
      id: `inactivitate-${c.id}`,
      claim: c,
      type: "inactivitate",
      title: `Fără activitate (${zile} zile)`,
      reason: `${sDef.label} · nicio modificare de ${zile} zile`,
      severity: "info",
    });
  });

  const totalAlertsCount = ALERT_TYPES.reduce((sum, key) => sum + counts[key], 0);

  return {
    byType,
    counts,
    items,
    totalAlertsCount,
    // Convenience lists (same references as byType)
    blocate,
    masiniSchimb,
    stagnate,
    piese,
    neridicate,
    acceptPlata,
    inactivitate,
  };
}

export function filterAlertItems(items, tab) {
  const normalized = normalizeAlertTab(tab);
  if (!normalized || normalized === "toate") return items;
  return items.filter((item) => item.type === normalized);
}
