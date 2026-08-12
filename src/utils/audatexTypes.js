import { parseNumber } from "./claimUtils";

/**
 * Typical Recapitulatie labels (RO):
 *   Total Piese / Total Piese de Inlocuit
 *   Total Manopere / Total Manopera (caroserie + mecanica)
 *   Total Manopera + Total Material under Vopsitorie
 *   Total Vopsitorie
 *   Cost Reparatie netto
 */


/** Câmpuri principale afișate în tab Financiar — mapare 1:1 cu cuprinsul Audatex. */
export const AUDATEX_DEVIZ_TOTALS = [
  { key: "totalPiese", label: "Total piese", valueKeys: ["totalPieseAudatex", "valoarePieseAudatex"] },
  { key: "totalManopera", label: "Total manoperă", valueKeys: ["totalManoperaAudatex", "manoperaTinichigerie"] },
  {
    key: "totalCosturiSuplimentare",
    label: "Total costuri suplimentare (2%)",
    valueKeys: ["totalCosturiSuplimentareAudatex", "cheltuieliDiverse"],
  },
  { key: "totalVopsitorie", label: "Total vopsitorie", valueKeys: ["totalVopsitorieAudatex"] },
  { key: "costReparatieFaraTva", label: "Total reparație fără TVA", valueKeys: ["costReparatieFaraTva", "valoareDevizAudatex"] },
  { key: "costReparatieCuTva", label: "Total reparație cu TVA", valueKeys: ["costReparatieCuTva"] },
];

export function pickAudatexValue(values, keys) {
  for (const k of keys) {
    const v = values?.[k];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/** Normalize parsed Audatex values into canonical cuprins totals + legacy fields. */
export function normalizeAudatexImportValues(values = {}) {
  const totalPiese = pickAudatexValue(values, ["totalPieseAudatex", "valoarePieseAudatex"]) ?? 0;
  const totalManopera = pickAudatexValue(values, ["totalManoperaAudatex", "manoperaTinichigerie"]) ?? 0;
  const totalCosturiSuplimentare =
    pickAudatexValue(values, ["totalCosturiSuplimentareAudatex", "cheltuieliDiverse"]) ?? 0;
  const manoperaVopsitorie = pickAudatexValue(values, ["manoperaVopsitorie"]) ?? 0;
  const materialeVopsitorie = pickAudatexValue(values, ["materialeVopsitorie"]) ?? 0;
  let totalVopsitorie = pickAudatexValue(values, ["totalVopsitorieAudatex"]);
  if (totalVopsitorie == null && (manoperaVopsitorie > 0 || materialeVopsitorie > 0)) {
    totalVopsitorie = Math.round((manoperaVopsitorie + materialeVopsitorie) * 100) / 100;
  }
  totalVopsitorie = totalVopsitorie ?? 0;
  const costReparatieFaraTva =
    pickAudatexValue(values, ["costReparatieFaraTva", "valoareDevizAudatex"]) ??
    Math.round((totalPiese + totalManopera + totalCosturiSuplimentare + totalVopsitorie) * 100) / 100;

  return {
    totalPiese,
    totalManopera,
    totalCosturiSuplimentare,
    totalVopsitorie,
    costReparatieFaraTva,
    costReparatieCuTva: pickAudatexValue(values, ["costReparatieCuTva"]) ?? null,
    manoperaVopsitorie,
    materialeVopsitorie,
    valoarePieseAudatex: totalPiese,
    manoperaTinichigerie: totalManopera,
    cheltuieliDiverse: pickAudatexValue(values, ["cheltuieliDiverse"]),
    valoareDevizAudatex: costReparatieFaraTva,
    totalPieseAudatex: totalPiese,
    totalManoperaAudatex: totalManopera,
    totalCosturiSuplimentareAudatex: totalCosturiSuplimentare,
    totalVopsitorieAudatex: totalVopsitorie,
    zileChirieAudatex: pickAudatexValue(values, ["zileChirieAudatex"]),
  };
}

/** Normalize Romanian money strings: 8.954,35 → 8954.35 */
export function parseRoMoney(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/\s*(lei|ron|eur|€)\s*/gi, "").trim();
  const n = parseNumber(cleaned, NaN);
  return Number.isFinite(n) ? n : null;
}

export function countExtractedFields(values = {}) {
  return AUDATEX_DEVIZ_TOTALS.filter((f) => {
    if (f.valueKeys.some((k) => values[k] != null && values[k] !== "")) return true;
    if (f.key === "totalVopsitorie") {
      return values.manoperaVopsitorie != null && values.materialeVopsitorie != null;
    }
    return false;
  }).length;
}

export function countExtractedOperations(lineItems) {
  return Array.isArray(lineItems?.operations) ? lineItems.operations.length : 0;
}
