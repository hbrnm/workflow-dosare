import { parseNumber } from "./claimUtils";

/**
 * Parse Audatex / DAT Romanian repair estimates (PDF text, XML, CSV, XLSX)
 * into the claim financial fields used by Dosare Daună.
 *
 * Typical Recapitulatie labels (RO):
 *   Total Piese / Total Piese de Inlocuit
 *   Total Manopere / Total Manopera (caroserie + mecanica)
 *   Total Manopera + Total Material under Vopsitorie
 *   Total Vopsitorie
 *   Cost Reparatie netto
 */

export const AUDATEX_IMPORT_FIELDS = [
  { key: "valoareDevizAudatex", label: "Deviz (netto)" },
  { key: "valoarePieseAudatex", label: "Piese" },
  { key: "manoperaTinichigerie", label: "Manoperă tinichigerie" },
  { key: "manoperaVopsitorie", label: "Manoperă vopsitorie" },
  { key: "materialeVopsitorie", label: "Materiale vopsitorie" },
  { key: "zileChirieAudatex", label: "Zile chirie" },
];

/** Normalize Romanian money strings: 8.954,35 → 8954.35 */
export function parseRoMoney(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return null;
  // Strip currency markers
  const cleaned = s.replace(/\s*(lei|ron|eur|€)\s*/gi, "").trim();
  const n = parseNumber(cleaned, NaN);
  return Number.isFinite(n) ? n : null;
}

function lastMoneyOnLine(line) {
  if (!line) return null;
  // Prefer amounts at end of line (totals)
  const matches = String(line).match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:,\d{1,2})/g);
  if (!matches || !matches.length) return null;
  return parseRoMoney(matches[matches.length - 1]);
}

function findLabeledAmount(text, patterns) {
  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const norm = line.replace(/\s+/g, " ").trim();
    if (!norm) continue;
    for (const re of patterns) {
      if (re.test(norm)) {
        const amt = lastMoneyOnLine(norm);
        if (amt != null) return amt;
      }
    }
  }
  // Fallback: same-line after label via capture
  for (const re of patterns) {
    const m = String(text || "").match(new RegExp(`${re.source}[^\\d\\n]{0,40}(-?\\d[\\d.\\s,]*)`, "i"));
    if (m?.[1]) {
      const amt = parseRoMoney(m[1]);
      if (amt != null) return amt;
    }
  }
  return null;
}

/**
 * Extract totals from plain text (PDF extract or pasted).
 * @returns {{ values: object, confidence: "high"|"medium"|"low", sourceHints: string[] }}
 */
export function parseEstimateText(text) {
  const raw = String(text || "");
  const values = {};
  const hints = [];

  const piese = findLabeledAmount(raw, [
    /Total\s+Piese\s+de\s+Inlocuit/i,
    /Total\s+conform\s+Lista/i,
    /Total\s+Piese(?!\s*marunte)/i,
    /Total\s+Piese\s+de\s+schimb/i,
    /Cost(?:ul)?\s+pieselor/i,
  ]);
  if (piese != null) {
    values.valoarePieseAudatex = piese;
    hints.push("piese");
  }

  // Prefer "Total Manopere" (plural, manopera block) over generic Total Manopera
  const manopere = findLabeledAmount(raw, [
    /Total\s+Manopere\b/i,
    /Total\s+bloc\s+Manopera/i,
  ]);
  const manoperaCaroserie = findLabeledAmount(raw, [/\bcaroserie\b/i]);
  // Tinichigerie ≈ Total Manopere from body/mechanics block
  if (manopere != null) {
    values.manoperaTinichigerie = manopere;
    hints.push("manopera_tinichigerie");
  } else if (manoperaCaroserie != null) {
    values.manoperaTinichigerie = manoperaCaroserie;
    hints.push("manopera_tinichigerie");
  }

  // Vopsitorie block: look for "Total Vopsitorie" section totals near end
  const totalVopsitorie = findLabeledAmount(raw, [
    /Total\s+Vopsitorie\b/i,
    /Cost(?:ul)?\s+(?:de\s+)?vopsitorie/i,
  ]);

  // Materiale — "Total Material" in paint section
  const materiale = findLabeledAmount(raw, [
    /Total\s+Material(?:e)?\b/i,
    /Materiale?\s+vopsitorie/i,
    /Cost\s+Materiale/i,
  ]);
  if (materiale != null) {
    values.materialeVopsitorie = materiale;
    hints.push("materiale_vopsitorie");
  }

  // Manoperă vopsitorie: "Total Manopera … 1.275,00" inside bloc Vopsitorie
  // (line often has hours + rate + total — take the last money on the matching line)
  const paintLabourFromBloc = extractPaintLabour(raw);
  if (paintLabourFromBloc != null) {
    values.manoperaVopsitorie = paintLabourFromBloc;
    hints.push("manopera_vopsitorie");
  } else if (totalVopsitorie != null && materiale != null && totalVopsitorie > materiale) {
    values.manoperaVopsitorie = Math.round((totalVopsitorie - materiale) * 100) / 100;
    hints.push("manopera_vopsitorie_derived");
  } else {
    const paintLabour = findLabeledAmount(raw, [
      /Manopera\s+vopsitorie/i,
      /Manoperă\s+vopsitorie/i,
    ]);
    if (paintLabour != null) {
      values.manoperaVopsitorie = paintLabour;
      hints.push("manopera_vopsitorie");
    }
  }

  const netto = findLabeledAmount(raw, [
    /Cost\s+Reparatie\s+netto/i,
    /Cost\s+Reparație\s+netto/i,
    /Cost\s+repara(?:t|ț)ie\s+netto/i,
    /Total\s+General\b/i,
    /Cost(?:ul)?\s+reparatie(?:i)?\s*(?:netto|net)?/i,
  ]);
  if (netto != null) {
    values.valoareDevizAudatex = netto;
    hints.push("deviz_netto");
  } else {
    // Sum parts if we have them
    const sum =
      (values.valoarePieseAudatex || 0) +
      (values.manoperaTinichigerie || 0) +
      (values.manoperaVopsitorie || 0) +
      (values.materialeVopsitorie || 0);
    if (sum > 0) {
      values.valoareDevizAudatex = Math.round(sum * 100) / 100;
      hints.push("deviz_sum");
    }
  }

  const zile = findLabeledAmount(raw, [
    /Zile\s+(?:chirie|înlocuire|inchiriere)/i,
    /Durata\s+chirie/i,
  ]);
  if (zile != null && zile > 0 && zile < 365) {
    values.zileChirieAudatex = Math.round(zile);
    hints.push("zile_chirie");
  }

  const filled = Object.keys(values).length;
  const confidence = filled >= 4 ? "high" : filled >= 2 ? "medium" : filled >= 1 ? "low" : "low";

  return { values, confidence, sourceHints: hints, format: detectFormatHint(raw) };
}

/**
 * Prefer totals from the Vopsitorie recapitulation block.
 * DAT lines look like: "Total Manopera 8,50 150,00 1.275,00" → 1275
 */
function extractPaintLabour(text) {
  const raw = String(text || "");
  const bloc = raw.match(/Total\s+bloc\s+Vopsitorie([\s\S]{0,1200}?)(?=Total\s+General|Cost\s+Reparat|$)/i);
  // Without an explicit Vopsitorie block, avoid the first "Total Manopera" in the file
  // (often the body/mechanics total) — callers can derive from Total Vopsitorie − Material.
  if (!bloc) return null;
  const scope = bloc[1];
  const lines = scope.split(/\r?\n/);
  for (const line of lines) {
    const norm = line.replace(/\s+/g, " ").trim();
    if (/Total\s+bloc\s+Vopsitorie/i.test(norm)) continue;
    if (/Total\s+Manopera\b/i.test(norm) && !/Total\s+Manopere\b/i.test(norm)) {
      const amt = lastMoneyOnLine(norm);
      if (amt != null && amt >= 1) return amt;
    }
  }
  const compact = scope.match(/Total\s+Manopera\s+([\d.\s,]+?)(?=\s+Total\s+Material|\s+Total\s+Vopsitorie|$)/i);
  if (compact?.[1]) {
    const amt = lastMoneyOnLine(compact[1]) ?? parseRoMoney(compact[1].trim().split(/\s+/).pop());
    if (amt != null && amt >= 1) return amt;
  }
  return null;
}

function detectFormatHint(text) {
  const t = String(text || "");
  if (/Audatex|AudaNet|Qapter/i.test(t)) return "audatex";
  if (/Sistem\s+DAT|DAT\s*€uropa|CalculatePro/i.test(t)) return "dat";
  return "unknown";
}

/** Lightweight XML: search for amount-like nodes / attributes with known names */
export function parseEstimateXml(xmlText) {
  const text = String(xmlText || "");
  // Flatten tag content into pseudo-lines for the text parser
  const flattened = text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
  const result = parseEstimateText(flattened);

  // Also try common attribute patterns
  const attrPatterns = [
    { key: "valoarePieseAudatex", re: /(?:PartsAmount|PartsTotal|TotalParts|PieseTotal)[^0-9-]{0,20}([\d.,]+)/i },
    { key: "manoperaTinichigerie", re: /(?:LabourAmount|LaborAmount|BodyLabour|ManoperaTotal)[^0-9-]{0,20}([\d.,]+)/i },
    { key: "manoperaVopsitorie", re: /(?:PaintLabour|PaintLabor|VopsitorieManopera)[^0-9-]{0,20}([\d.,]+)/i },
    { key: "materialeVopsitorie", re: /(?:PaintMaterial|PaintMaterials|MaterialVopsitorie)[^0-9-]{0,20}([\d.,]+)/i },
    { key: "valoareDevizAudatex", re: /(?:GrandTotal|NetTotal|RepairCostNet|TotalNetto)[^0-9-]{0,20}([\d.,]+)/i },
  ];
  for (const { key, re } of attrPatterns) {
    if (result.values[key] != null) continue;
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseRoMoney(m[1]);
      if (n != null) {
        result.values[key] = n;
        result.sourceHints.push(`xml_${key}`);
      }
    }
  }
  result.format = result.format === "unknown" ? "xml" : result.format;
  return result;
}

/** XLSX / CSV via sheet rows — look for label+amount columns */
export function parseEstimateSheetRows(rows) {
  const lines = (rows || [])
    .map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? "" : String(c))).join("  ") : String(r)))
    .join("\n");
  const result = parseEstimateText(lines);
  result.format = "sheet";
  return result;
}

/**
 * Apply parsed values onto a claim form object (immutable).
 * Syncs both financiar.* and manopera.*.facturat/alocat.
 */
export function applyEstimateValuesToClaim(claim, values = {}) {
  const next = { ...(claim || {}) };
  const financiar = { ...(next.financiar || {}) };
  const manopera = {
    tinichigerie: { ...(next.manopera?.tinichigerie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }) },
    vopsitorie: { ...(next.manopera?.vopsitorie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }) },
  };

  if (values.valoareDevizAudatex != null) {
    next.valoareDevizAudatex = values.valoareDevizAudatex;
    financiar.valoareDevizAudatex = values.valoareDevizAudatex;
  }
  if (values.valoarePieseAudatex != null) {
    next.valoarePieseAudatex = values.valoarePieseAudatex;
    financiar.pieseFacturateFaraTva = values.valoarePieseAudatex;
  }
  if (values.manoperaTinichigerie != null) {
    financiar.manoperaTinichigerie = values.manoperaTinichigerie;
    manopera.tinichigerie.facturat = values.manoperaTinichigerie;
    manopera.tinichigerie.alocat = values.manoperaTinichigerie;
  }
  if (values.manoperaVopsitorie != null) {
    financiar.manoperaVopsitorie = values.manoperaVopsitorie;
    manopera.vopsitorie.facturat = values.manoperaVopsitorie;
    manopera.vopsitorie.alocat = values.manoperaVopsitorie;
  }
  if (values.materialeVopsitorie != null) {
    financiar.materialeVopsitorie = values.materialeVopsitorie;
  }
  if (values.zileChirieAudatex != null) {
    next.zileChirieAudatex = values.zileChirieAudatex;
  }

  next.financiar = financiar;
  next.manopera = manopera;
  return next;
}

export function countExtractedFields(values = {}) {
  return AUDATEX_IMPORT_FIELDS.filter((f) => values[f.key] != null && values[f.key] !== "").length;
}
