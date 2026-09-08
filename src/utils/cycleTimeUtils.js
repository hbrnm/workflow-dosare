import { daysBetween } from "./dateUtils";

/**
 * Calculează diferența în zile între două date ISO (fără dependență de data de azi).
 */
export function daysBetweenDates(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const d1 = new Date(startIso);
  const d2 = new Date(endIso);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffMs = d2.getTime() - d1.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculează timpii de ciclu pentru un dosar individual (Lead Time, Repair Time, Stationing).
 */
export function computeClaimCycleTimes(claim = {}) {
  if (!claim || typeof claim !== "object") {
    return {
      durataReparatieZile: null,
      durataTotalaCicluZile: null,
      durataAsteptarePieseZile: null,
      durataStationareCurteZile: null,
      durataIncasareZile: null,
      isFinished: false,
    };
  }

  const isFinished = claim.status === "facturat" || !!claim.dataGataRidicare || !!claim.ridicata;

  // 1. Data de intrare fizică în atelier (prioritate dataAdusaFizic -> dataProgramare -> dataDeschiderii)
  const entryDate = claim.dataAdusaFizic || claim.dataProgramare || claim.dataDeschiderii || null;

  // 2. Data finalizării reparației
  const completionDate = claim.dataGataRidicare ||
    (isFinished ? (claim.dataSchimbareStatus || claim.financiar?.dataFactura || null) : null);

  // Timp efectiv de reparație
  let durataReparatieZile = null;
  if (entryDate && completionDate) {
    durataReparatieZile = daysBetweenDates(entryDate, completionDate);
  } else if (entryDate && claim.status === "reparatie") {
    durataReparatieZile = daysBetween(entryDate);
  }

  // Durată totală ciclu dosar (deschidere -> închidere/facturare)
  let durataTotalaCicluZile = null;
  const openDate = claim.dataDeschiderii || null;
  const closeDate = claim.financiar?.dataFactura || claim.dataGataRidicare || claim.dataSchimbareStatus || null;
  if (openDate && isFinished && closeDate) {
    durataTotalaCicluZile = daysBetweenDates(openDate, closeDate);
  }

  // Durată așteptare piese
  let durataAsteptarePieseZile = null;
  if (claim.dataComandaPiese && claim.termenLivrarePiese) {
    durataAsteptarePieseZile = daysBetweenDates(claim.dataComandaPiese, claim.termenLivrarePiese);
  }

  // Durată staționare mașină gata în curte
  let durataStationareCurteZile = null;
  if (claim.dataGataRidicare) {
    if (claim.dataRidicare) {
      durataStationareCurteZile = daysBetweenDates(claim.dataGataRidicare, claim.dataRidicare);
    } else {
      durataStationareCurteZile = daysBetween(claim.dataGataRidicare);
    }
  }

  // Durată decontare (facturare -> încasare)
  let durataIncasareZile = null;
  if (claim.financiar?.dataFactura && claim.dataIncasarii) {
    durataIncasareZile = daysBetweenDates(claim.financiar.dataFactura, claim.dataIncasarii);
  }

  return {
    durataReparatieZile,
    durataTotalaCicluZile,
    durataAsteptarePieseZile,
    durataStationareCurteZile,
    durataIncasareZile,
    isFinished,
  };
}

/**
 * Calculează indicatorii agrenați de ciclu mediu și performanță pentru atelier.
 */
export function computeFleetCycleMetrics(claims = []) {
  if (!Array.isArray(claims) || claims.length === 0) {
    return {
      avgRepairDays: 0,
      avgTotalCycleDays: 0,
      avgStationingDays: 0,
      avgInvoicingLeadDays: 0,
      completedRepairsCount: 0,
      activeInRepairCount: 0,
      benchmarkRating: "N/A",
    };
  }

  const cycles = claims.map(computeClaimCycleTimes);

  // Dosare cu reparație finalizată ce au durată validă
  const finishedRepairs = cycles
    .filter((c) => c.isFinished && typeof c.durataReparatieZile === "number" && !isNaN(c.durataReparatieZile))
    .map((c) => c.durataReparatieZile);

  const finishedCycles = cycles
    .filter((c) => c.isFinished && typeof c.durataTotalaCicluZile === "number" && !isNaN(c.durataTotalaCicluZile))
    .map((c) => c.durataTotalaCicluZile);

  const stationingDays = cycles
    .filter((c) => typeof c.durataStationareCurteZile === "number")
    .map((c) => c.durataStationareCurteZile);

  const invoicingDays = cycles
    .filter((c) => typeof c.durataIncasareZile === "number")
    .map((c) => c.durataIncasareZile);

  const avg = (arr) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);

  const avgRepairDays = avg(finishedRepairs);
  const avgTotalCycleDays = avg(finishedCycles);
  const avgStationingDays = avg(stationingDays);
  const avgInvoicingLeadDays = avg(invoicingDays);

  const activeInRepairCount = claims.filter((c) => c.status === "reparatie" || c.status === "constatare").length;
  const completedRepairsCount = finishedRepairs.length;

  // Calificativ SLA atelier:
  // <= 4 zile: Excelent (Fast-track)
  // 5-8 zile: Bun (Standard body shop)
  // > 8 zile: Întârziat / Blocaj
  let benchmarkRating = "Optim";
  let benchmarkColor = "#1a7f37";
  if (completedRepairsCount > 0) {
    if (avgRepairDays <= 4) {
      benchmarkRating = "Rapid (SLA Excelent)";
      benchmarkColor = "#1a7f37";
    } else if (avgRepairDays <= 8) {
      benchmarkRating = "Standard Atelier";
      benchmarkColor = "#0284c7";
    } else {
      benchmarkRating = "Peste Medie (Atenție SLA)";
      benchmarkColor = "#cf222e";
    }
  } else {
    benchmarkRating = "Fără istoric finalizat";
    benchmarkColor = "#64748b";
  }

  return {
    avgRepairDays,
    avgTotalCycleDays,
    avgStationingDays,
    avgInvoicingLeadDays,
    completedRepairsCount,
    activeInRepairCount,
    benchmarkRating,
    benchmarkColor,
  };
}
