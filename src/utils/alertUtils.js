import { businessDaysSince, todayISO } from "./dateUtils";
import { getStatusDefinition, getClaimAlertDays, isPieseComandateStatus } from "../constants/config";
import { isPaymentOverdue, getDaysPaymentOverdue, getSettlementAmount, getEffectivePaymentDue } from "./settlementUtils";
import { resolveAlertGroupKey, getAlertTypesForTab } from "../constants/alertCategories";

/**
 * Tipuri de alertă operațională (Centru Alerte / badge Alerte).
 * Dosarele blocate sunt stare de inventar — vezi `counts.blocate`, nu intră aici.
 */
export const ALERT_TYPES = [
  "masini_schimb",
  "stagnate",
  "livrare_piese",
  "piese",
  "neridicate",
  "accept_plata",
  "inactivitate",
  "restante",
];

/** Legacy modal tab key → canonical type / group */
export const ALERT_TAB_ALIASES = {
  depasite: "intarzieri",
};

export function normalizeAlertTab(tab) {
  if (!tab || tab === "toate") return tab || "toate";
  const aliased = ALERT_TAB_ALIASES[tab] || tab;
  return resolveAlertGroupKey(aliased);
}

/**
 * Ancoră pentru alerta de etapă.
 * Pe „Programat” cu dată setată: ceasul pornește de la data programării în atelier
 * (nu de la momentul mutării în status) — altfel o programare la +15 zile
 * ar alarma greșit dacă pragul e 7.
 */
export function getStageAlertAnchor(claim) {
  if (claim?.status === "programat" && claim?.dataProgramare) {
    return claim.dataProgramare;
  }
  return claim?.dataSchimbareStatus || null;
}

// După ce un dosar este gata de ridicare, el este urmărit separat de alertele
// de întârziere ale etapelor din flux.
export function isReadyForPickupOverdue(claim, pickupThresholdDays) {
  if (claim?.alerteAck) return false;
  return Boolean(
    claim.gataDeRidicare &&
    !claim.ridicata &&
    claim.dataGataRidicare &&
    businessDaysSince(claim.dataGataRidicare) >= pickupThresholdDays
  );
}

export function isStageOverdue(claim) {
  if (claim?.alerteAck) return false;
  if (claim?.status === "facturat") return false;
  if (claim?.gataDeRidicare && !claim?.ridicata) return false;

  // Programare viitoare: nu e întârziată încă — așteptăm data din calendar
  if (claim?.status === "programat" && claim?.dataProgramare) {
    const apptDay = String(claim.dataProgramare).slice(0, 10);
    if (apptDay > todayISO()) return false;
  }

  const threshold = getClaimAlertDays(claim);
  const anchor = getStageAlertAnchor(claim);
  return Boolean(anchor && businessDaysSince(anchor) >= threshold);
}

export function getDaysInStage(claim) {
  const anchor = getStageAlertAnchor(claim);
  return anchor ? businessDaysSince(anchor) : 0;
}

// Dosare pe Accept plată (după reparație) — așteaptă decontare / facturare
export function isAcceptPlataWithoutParts(claim) {
  if (claim?.alerteAck) return false;
  return Boolean(
    !claim.blocat &&
    getStatusDefinition(claim.status).key === "accept_plata"
  );
}

// Detectează dosarele care nu au avut nicio modificare/activitate de mai mult de X zile
export function isInactiveClaim(claim, inactivityThresholdDays = 7) {
  const key = getStatusDefinition(claim?.status).key;
  if (key === "facturat" || claim?.status === "predat_client") return false;
  if (claim?.ridicata && key === "accept_plata") return false;
  if (claim?.alerteAck) return false;
  const lastUpdate = claim.dataUltimeiActualizari || claim.dataSchimbareStatus || claim.dataDeschiderii;
  return businessDaysSince(lastUpdate) >= inactivityThresholdDays;
}

export function getDaysSinceLastActivity(claim) {
  const lastUpdate = claim?.dataUltimeiActualizari || claim?.dataSchimbareStatus || claim?.dataDeschiderii;
  return lastUpdate ? businessDaysSince(lastUpdate) : 0;
}

/** Dosar blocat / litigiu (stare inventar, nu alertă de reacție). */
export function isBlocked(claim) {
  return Boolean(claim?.blocat);
}

/** Ultima notiță internă de pe dosar (cele mai noi sunt primele). */
export function getLatestClaimNoteText(claim, { maxLen = 140 } = {}) {
  const notes = Array.isArray(claim?.note) ? claim.note : [];
  for (const n of notes) {
    const text = String(n?.text || "").trim().replace(/\s+/g, " ");
    if (!text) continue;
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen - 1)}…`;
  }
  return "";
}

/** Auto la schimb cu zile Audatex depășite. */
export function isLoanerOverdue(claim) {
  if (claim?.alerteAck) return false;
  if (!claim?.masinaSchimb || !String(claim.masinaSchimb).trim()) return false;
  if (claim.status === "facturat") return false;
  const zileChirie = Number(claim.zileChirieAudatex) || 0;
  if (zileChirie <= 0) return false;
  const zile = businessDaysSince(claim.dataDariiLaSchimb || claim.dataProgramare);
  return zile > zileChirie;
}

export function getLoanerDaysUsed(claim) {
  return businessDaysSince(claim?.dataDariiLaSchimb || claim?.dataProgramare);
}

/** Piese sosite / status vechi piese_sosite, fără dată de programare.
 * Dacă mașina e deja adusă fizic în service, nu mai e alertă de programare. */
export function isPartsArrivedUnscheduled(claim) {
  if (claim?.alerteAck) return false;
  if (claim?.adusaFizic) return false;
  return Boolean((claim?.pieseSosite || claim?.status === "piese_sosite") && !claim?.dataProgramare);
}

function deliveryDateOnly(claim) {
  return claim?.termenLivrarePiese ? String(claim.termenLivrarePiese).slice(0, 10) : "";
}

/** Termen livrare piese depășit — verificare fizică stoc necesară. */
export function isDeliveryDeadlineOverdue(claim) {
  if (claim?.alerteAck) return false;
  if (!isPieseComandateStatus(claim?.status) || claim?.pieseSosite) return false;
  const termen = deliveryDateOnly(claim);
  if (!termen) return false;
  return termen < todayISO();
}

export function getDaysPastDeliveryDeadline(claim) {
  const termen = deliveryDateOnly(claim);
  if (!termen) return 0;
  return businessDaysSince(`${termen}T12:00:00.000Z`);
}

/** Piese comandate fără confirmare: termen livrare depășit sau fallback zile în stadiu. */
export function isPartsOrderOverdue(claim, pieseAlertDays = 4) {
  if (claim?.alerteAck) return false;
  if (!isPieseComandateStatus(claim?.status) || claim?.pieseSosite) return false;
  if (isDeliveryDeadlineOverdue(claim)) return true;
  if (deliveryDateOnly(claim)) return false;
  return businessDaysSince(claim.dataSchimbareStatus) > pieseAlertDays;
}

function sortByDaysDesc(claims, dateField) {
  return [...claims].sort(
    (a, b) => businessDaysSince(b[dateField]) - businessDaysSince(a[dateField])
  );
}

/** Metrică afișată pe cardul de alertă (zile / unitate). */
export function getAlertMetric(item) {
  const c = item?.claim;
  if (!c) return null;
  switch (item.type) {
    case "stagnate":
      return { value: getDaysInStage(c), unit: "zile", hint: "în etapă" };
    case "inactivitate":
      return { value: getDaysSinceLastActivity(c), unit: "zile", hint: "fără activitate" };
    case "livrare_piese":
      return { value: getDaysPastDeliveryDeadline(c), unit: "zile", hint: "peste termen" };
    case "neridicate":
      return {
        value: c.dataGataRidicare ? businessDaysSince(c.dataGataRidicare) : 0,
        unit: "zile",
        hint: "gata de ridicare",
      };
    case "masini_schimb":
      return { value: c.zile || 0, unit: "zile", hint: "la schimb" };
    case "restante":
      return { value: getDaysPaymentOverdue(c), unit: "zile", hint: "scadență" };
    default:
      return null;
  }
}

export function alertSeverityClass(severity) {
  if (severity === "critical") return "is-critical";
  if (severity === "warning") return "is-warning";
  return "is-info";
}

/**
 * Single source of truth for operational alerts.
 * Returns claim lists per type, display items, and counts.
 */
export function buildAlertBuckets(claims = [], { pragRidicare = 3, pragInactivitate = 7 } = {}) {
  const list = Array.isArray(claims) ? claims.filter(Boolean) : [];

  // Blocate = inventar separat; nu generez alerte operaționale pe ele.
  const blocate = list.filter(isBlocked);
  const active = list.filter((c) => !c.blocat);

  const masiniSchimb = active
    .filter(isLoanerOverdue)
    .map((c) => ({ ...c, zile: getLoanerDaysUsed(c), depasit: true }))
    .sort((a, b) => b.zile - a.zile);
  const stagnate = sortByDaysDesc(active.filter(isStageOverdue), "dataSchimbareStatus");
  const livrarePiese = active
    .filter(isDeliveryDeadlineOverdue)
    .sort((a, b) => getDaysPastDeliveryDeadline(b) - getDaysPastDeliveryDeadline(a));
  const piese = active.filter(isPartsArrivedUnscheduled);
  const neridicate = sortByDaysDesc(
    active.filter((c) => isReadyForPickupOverdue(c, pragRidicare)),
    "dataGataRidicare"
  );
  const acceptPlata = active.filter(isAcceptPlataWithoutParts);
  const inactivitate = active.filter((c) => isInactiveClaim(c, pragInactivitate));
  const restante = active
    .filter(isPaymentOverdue)
    .sort((a, b) => getDaysPaymentOverdue(b) - getDaysPaymentOverdue(a));

  const byType = {
    blocate,
    masini_schimb: masiniSchimb,
    stagnate,
    livrare_piese: livrarePiese,
    piese,
    neridicate,
    accept_plata: acceptPlata,
    inactivitate,
    restante,
  };

  const counts = {
    blocate: blocate.length,
    masini_schimb: masiniSchimb.length,
    stagnate: stagnate.length,
    livrare_piese: livrarePiese.length,
    piese: piese.length,
    neridicate: neridicate.length,
    accept_plata: acceptPlata.length,
    inactivitate: inactivitate.length,
    restante: restante.length,
  };

  // Legacy aliases used by badges / openAlerts("depasite")
  counts.depasite = counts.stagnate;
  counts.intarzieri = (counts.stagnate || 0) + (counts.inactivitate || 0);
  counts.predare = (counts.neridicate || 0) + (counts.masini_schimb || 0);
  counts.plati = counts.restante || 0;

  const items = [];

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
    const stageLabel = sDef.short || sDef.label;
    items.push({
      id: `stagnate-${c.id}`,
      claim: c,
      type: "stagnate",
      title: `Întârziere în ${stageLabel}`,
      reason: `În ${stageLabel} de ${zile} ${zile === 1 ? "zi" : "zile"} — depășit pragul recomandat`,
      severity: "info",
    });
  });

  livrarePiese.forEach((c) => {
    const zile = getDaysPastDeliveryDeadline(c);
    const termen = deliveryDateOnly(c);
    const stageLabel = getStatusDefinition(c.status).short || "Piese";
    items.push({
      id: `livrare_piese-${c.id}`,
      claim: c,
      type: "livrare_piese",
      title: `Livrare piese depășită (+${zile}z)`,
      reason: `Stadiu ${stageLabel} · termen livrare era ${termen} — verifică stocul`,
      severity: "warning",
    });
  });

  piese.forEach((c) => {
    items.push({
      id: `piese-${c.id}`,
      claim: c,
      type: "piese",
      title: "Piese sosite — fără programare",
      reason: "Piesele sunt recepționate, dar lipsește data de intrare în service",
      severity: "warning",
    });
  });

  neridicate.forEach((c) => {
    const zile = businessDaysSince(c.dataGataRidicare);
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
      title: "Accept plată",
      reason: "Reparație finalizată — așteaptă acceptul de plată / decontarea",
      severity: "info",
    });
  });

  inactivitate.forEach((c) => {
    const zile = getDaysSinceLastActivity(c);
    const sDef = getStatusDefinition(c.status);
    const stageLabel = sDef.short || sDef.label;
    items.push({
      id: `inactivitate-${c.id}`,
      claim: c,
      type: "inactivitate",
      title: `Fără activitate în ${stageLabel}`,
      reason: `Nicio modificare de ${zile} ${zile === 1 ? "zi" : "zile"} în stadiul ${stageLabel}`,
      severity: "info",
    });
  });

  restante.forEach((c) => {
    const zile = getDaysPaymentOverdue(c);
    const due = getEffectivePaymentDue(c);
    const amount = getSettlementAmount(c);
    items.push({
      id: `restante-${c.id}`,
      claim: c,
      type: "restante",
      title: `Plată restantă (+${zile}z)`,
      reason: `${c.asigurator || "Asigurător"} · scadență ${due || "—"} · ${
        amount ? `${amount.toLocaleString("ro-RO")} RON` : "sumă neseată"
      }`,
      severity: "warning",
    });
  });

  const totalAlertsCount = ALERT_TYPES.reduce((sum, key) => sum + counts[key], 0);

  const itemsWithNotes = items.map((item) =>
    item.noteSnippet != null
      ? item
      : { ...item, noteSnippet: getLatestClaimNoteText(item.claim) },
  );

  return {
    byType,
    counts,
    items: itemsWithNotes,
    totalAlertsCount,
    blocate,
    masiniSchimb,
    stagnate,
    livrarePiese,
    piese,
    neridicate,
    acceptPlata,
    inactivitate,
    restante,
  };
}

export function filterAlertItems(items, tab) {
  const normalized = normalizeAlertTab(tab);
  if (!normalized || normalized === "toate") return items;
  const types = getAlertTypesForTab(normalized);
  if (!types || types.length === 0) return items;
  const set = new Set(types);
  return items.filter((item) => set.has(item.type));
}
