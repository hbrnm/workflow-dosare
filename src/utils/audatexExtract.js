import { uid } from "./dateUtils";
import { isAudatexRoText, parseAudatexRoEstimate } from "./audatexRoParse";
import { parseRoMoney } from "./audatexTypes";
import { createOperation } from "./estimateUtils";

function lastMoneyOnLine(line) {
  if (!line) return null;
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
  for (const re of patterns) {
    const m = String(text || "").match(new RegExp(`${re.source}[^\\d\\n]{0,40}(-?\\d[\\d.\\s,]*)`, "i"));
    if (m?.[1]) {
      const amt = parseRoMoney(m[1]);
      if (amt != null) return amt;
    }
  }
  return null;
}

const SECTION_STOP =
  /^(?:Total\s+bloc|Total\s+General|Total\s+Piese|Total\s+Manopere?\b|Total\s+Vopsitorie|Total\s+Material|Cost\s+Reparat|Recapitulatie|TVA\b|Toate valorile|Lista\s+Piese|(?:^|\b)(?:Manopera|Vopsitorie|Material)\s*$)/i;

const SECTION_TITLE =
  /^(?:Lista\s+)?Piese\s+de\s+(?:Inlocuit|schimb)|^(?:Total\s+bloc\s+)?(?:Manopera|Vopsitorie|Material)\b|^Parts\s+list|^Paint\s+work|^Spare\s+parts/i;

const HEADER_NOISE =
  /^(?:Pos\.?|Poz\.?|Nr\.?|Cod|OE|Descriere|Cant\.?|Pret|Preț|Total|Ore|Tarif|UM|Guide|Part\s*No)/i;

function normalizePartName(name) {
  return String(name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingPosAndCode(line) {
  let s = String(line || "").replace(/\s+/g, " ").trim();
  s = s.replace(/^\d{1,3}[.)]?\s*/, "");
  s = s.replace(/^[|\s]*/, "");
  s = s.replace(/^\|[^|]+\|\s*/, "");
  // OE / Audatex codes always contain at least one digit — never eat "Aripa", "Bara"…
  s = s.replace(/^(?=[A-Z0-9./-]*\d)[A-Z0-9][A-Z0-9./-]{4,}\s+/i, "");
  return s.trim();
}

function stripTrailingQtyAndMoney(line) {
  let s = String(line || "").replace(/\s+/g, " ").trim();
  s = s.replace(/(?:\s+-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:,\d{1,2}))+$/g, "");
  s = s.replace(/\s+\d{1,3}(?:[.,]\d{1,2})?\s*(?:h|ore)?$/i, "");
  s = s.replace(/\s+[EIRLPX]\b$/i, "");
  return s.replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractDescription(line) {
  const raw = stripTrailingQtyAndMoney(stripLeadingPosAndCode(line));
  if (!raw || raw.length < 3) return "";
  if (HEADER_NOISE.test(raw)) return "";
  if (SECTION_STOP.test(raw)) return "";
  if (SECTION_TITLE.test(raw)) return "";
  const letters = (raw.match(/[A-Za-zăâîșțĂÂÎȘȚ]/g) || []).length;
  if (letters < 3) return "";
  return raw.slice(0, 120);
}

function looksLikePartRow(line) {
  const text = String(line || "").trim();
  if (!text) return false;
  if (SECTION_STOP.test(text) || SECTION_TITLE.test(text) || HEADER_NOISE.test(text)) return false;
  if (/^Total\b/i.test(text)) return false;
  const hasMoney = /-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:,\d{1,2})/.test(text);
  const hasCode = /\b[A-Z0-9./-]{5,}\b/.test(text);
  const hasWords = (text.match(/[A-Za-zăâîșțĂÂÎȘȚ]/g) || []).length >= 4;
  return hasMoney && hasCode && hasWords;
}

function labourFlagsFromText(desc) {
  const t = normalizePartName(desc);
  const flags = { inl: false, rev: false, rep: false, uni: false };
  if (/DEMONT|MONTAR|DEM\.|MONT\.|DEMONTARE|MONTARE/.test(t)) flags.uni = true;
  if (/INLOC|INL\b|REPLACE|SCHIMB/.test(t)) flags.inl = true;
  if (/REPAR|INDREPT|AJUST|RECTIF|TUTUI|STRAIGHT/.test(t)) flags.rep = true;
  if (/VOPS|LACAR|GRUND|METALIZ|REVOPS|PAINT/.test(t)) flags.rev = true;
  if (!flags.inl && !flags.rev && !flags.rep && !flags.uni) flags.uni = true;
  return flags;
}

function paintFlagsFromText(desc) {
  const t = normalizePartName(desc);
  const flags = { inl: false, rev: true, rep: false, uni: false };
  if (/REPAR|INDREPT/.test(t)) flags.rep = true;
  return flags;
}

function sliceSection(text, startRe, endRes) {
  const raw = String(text || "");
  const start = raw.search(startRe);
  if (start < 0) return "";
  const after = raw.slice(start);
  let end = after.length;
  for (const er of endRes) {
    const m = after.slice(40).search(er);
    if (m >= 0) end = Math.min(end, m + 40);
  }
  return after.slice(0, end);
}

/**
 * Extract piese / manoperă / vopsitorie line items and map to claim operațiuni.
 * @returns {{ parts: object[], labour: object[], paint: object[], operations: object[] }}
 */
export function extractEstimateLineItems(text) {
  const raw = String(text || "");
  const partsSection = sliceSection(
    raw,
    /(?:Lista\s+)?Piese\s+de\s+(?:Inlocuit|schimb)|Parts\s+list|Piese\s+de\s+schimb|Spare\s+parts/i,
    [
      /Total\s+bloc\s+Manopera/i,
      /Total\s+Manopere?\b/i,
      /\bManopera\b/i,
      /Total\s+bloc\s+Vopsitorie/i,
      /Total\s+General/i,
      /Recapitulatie/i,
    ]
  );
  const labourSection = sliceSection(
    raw,
    /Total\s+bloc\s+Manopera|(?:^|\n)\s*Manopera\b(?!\s+vopsitorie)/im,
    [
      /Total\s+Manopere?\b/i,
      /Total\s+bloc\s+Vopsitorie/i,
      /\bVopsitorie\b/i,
      /Total\s+General/i,
      /Recapitulatie/i,
    ]
  );
  const paintSection = sliceSection(
    raw,
    /Total\s+bloc\s+Vopsitorie|(?:^|\n)\s*Vopsitorie\b|Paint\s+work/im,
    [
      /Total\s+Vopsitorie\b/i,
      /Total\s+Material/i,
      /Total\s+General/i,
      /Cost\s+Reparat/i,
      /Recapitulatie/i,
    ]
  );

  const partsLines = (partsSection || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const labourLines = (labourSection || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const paintLines = (paintSection || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const parts = [];
  for (const line of partsLines) {
    if (SECTION_STOP.test(line) || SECTION_TITLE.test(line) || HEADER_NOISE.test(line)) continue;
    if (/^Total\b/i.test(line)) continue;
    // Prefer numbered rows, but also accept coded rows from exports without index column.
    if (!/^\d{1,3}[.)]?\s+/.test(line) && !/\|/.test(line) && !looksLikePartRow(line)) continue;
    const desc = extractDescription(line);
    if (!desc) continue;
    if (/^(caroserie|mecanica|material|manopera|vopsitorie|piese)\b/i.test(desc)) continue;
    parts.push({
      name: desc,
      amount: lastMoneyOnLine(line),
      source: "piese",
    });
  }

  const labour = [];
  for (const line of labourLines) {
    if (SECTION_STOP.test(line) || SECTION_TITLE.test(line) || HEADER_NOISE.test(line)) continue;
    if (/^Total\b/i.test(line)) continue;
    if (/^(Ore|Pret\/Ora|caroserie|mecanica)\b/i.test(line)) continue;
    if (!/^\d{1,3}[.)]?\s+/.test(line) && !/(demont|montar|repar|indrept|ajust|inloc)/i.test(line)) continue;
    const desc = extractDescription(line);
    if (!desc || desc.length < 4) continue;
    if (/^(manopera|vopsitorie|material|piese)\b/i.test(desc)) continue;
    labour.push({
      name: desc,
      amount: lastMoneyOnLine(line),
      flags: labourFlagsFromText(desc),
      source: "manopera",
    });
  }

  const paint = [];
  for (const line of paintLines) {
    if (SECTION_STOP.test(line) || SECTION_TITLE.test(line) || HEADER_NOISE.test(line)) continue;
    if (/^Total\b/i.test(line)) continue;
    if (/^(Ore|Pret\/Ora|Material|Manopera)\b/i.test(line)) continue;
    if (!/^\d{1,3}[.)]?\s+/.test(line) && !/(lacar|vops|grund|metaliz|revops)/i.test(line)) continue;
    const desc = extractDescription(line);
    if (!desc) continue;
    if (/^(manopera|vopsitorie|material|piese)\b/i.test(desc)) continue;
    paint.push({
      name: desc,
      amount: lastMoneyOnLine(line),
      flags: paintFlagsFromText(desc),
      source: "vopsitorie",
    });
  }

  const operations = mergeLineItemsToOperations(parts, labour, paint);
  return { parts, labour, paint, operations };
}

function fuzzyIncludes(a, b) {
  const x = normalizePartName(a);
  const y = normalizePartName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 6 && y.includes(x)) return true;
  if (y.length >= 6 && x.includes(y)) return true;
  const tx = x.split(" ").filter((t) => t.length > 2);
  const ty = new Set(y.split(" ").filter((t) => t.length > 2));
  const overlap = tx.filter((t) => ty.has(t)).length;
  return overlap >= 2 && overlap / Math.max(tx.length, 1) >= 0.5;
}

function mergeLineItemsToOperations(parts, labour, paint) {
  const byKey = new Map();

  const upsert = (name, flags) => {
    const clean = String(name || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    if (!clean) return;
    let key = normalizePartName(clean);
    for (const [k, op] of byKey) {
      if (fuzzyIncludes(op.piesa, clean) || fuzzyIncludes(clean, op.piesa)) {
        key = k;
        op.inl = op.inl || !!flags.inl;
        op.rev = op.rev || !!flags.rev;
        op.rep = op.rep || !!flags.rep;
        op.uni = op.uni || !!flags.uni;
        if (clean.length < op.piesa.length && flags.inl) op.piesa = clean.toUpperCase();
        return;
      }
    }
    byKey.set(key || `${byKey.size}_${clean}`, createOperation(clean.toUpperCase(), flags));
  };

  for (const p of parts) upsert(p.name, { inl: true, rev: false, rep: false, uni: false });
  for (const l of labour) upsert(l.name, l.flags || labourFlagsFromText(l.name));
  for (const p of paint) {
    const base = String(p.name).split(/\s[-–—:]\s/)[0];
    upsert(base || p.name, p.flags || paintFlagsFromText(p.name));
  }

  return Array.from(byKey.values()).filter((op) => op.piesa);
}

/**
 * Extract totals from plain text (PDF extract or pasted).
 * @returns {{ values: object, confidence: string, sourceHints: string[], lineItems: object, format: string }}
 */
export function parseEstimateText(text) {
  const raw = String(text || "");
  if (isAudatexRoText(raw)) {
    return parseAudatexRoEstimate(raw);
  }
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

  const manopere = findLabeledAmount(raw, [
    /Total\s+Manopere\b/i,
    /Total\s+bloc\s+Manopera/i,
  ]);
  const manoperaCaroserie = findLabeledAmount(raw, [/\bcaroserie\b/i]);
  if (manopere != null) {
    values.manoperaTinichigerie = manopere;
    hints.push("manopera_tinichigerie");
  } else if (manoperaCaroserie != null) {
    values.manoperaTinichigerie = manoperaCaroserie;
    hints.push("manopera_tinichigerie");
  }

  const totalVopsitorie = findLabeledAmount(raw, [
    /Total\s+Vopsitorie\b/i,
    /Cost(?:ul)?\s+(?:de\s+)?vopsitorie/i,
  ]);

  const materiale = findLabeledAmount(raw, [
    /Total\s+Material(?:e)?\b/i,
    /Materiale?\s+vopsitorie/i,
    /Cost\s+Materiale/i,
  ]);
  if (materiale != null) {
    values.materialeVopsitorie = materiale;
    hints.push("materiale_vopsitorie");
  }

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

  const lineItems = extractEstimateLineItems(raw);
  if (lineItems.operations.length) hints.push(`lines_${lineItems.operations.length}`);

  const filled = Object.keys(values).length;
  const confidence =
    filled >= 4 || lineItems.operations.length >= 3
      ? "high"
      : filled >= 2 || lineItems.operations.length >= 1
        ? "medium"
        : filled >= 1
          ? "low"
          : "low";

  return {
    values,
    confidence,
    sourceHints: hints,
    format: detectFormatHint(raw),
    lineItems,
  };
}

function extractPaintLabour(text) {
  const raw = String(text || "");
  const bloc = raw.match(/Total\s+bloc\s+Vopsitorie([\s\S]{0,1200}?)(?=Total\s+General|Cost\s+Reparat|$)/i);
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
  if (/Sistem\s+DAT|DAT\s*€uropa|CalculatePro|SilverDAT/i.test(t)) return "dat";
  return "unknown";
}

/** Lightweight XML: search for amount-like nodes / attributes with known names */
export function parseEstimateXml(xmlText) {
  const text = String(xmlText || "");
  const flattened = text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
  const result = parseEstimateText(flattened);

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

  const xmlOps = extractXmlOperations(text);
  if (xmlOps.length) {
    result.lineItems = {
      parts: xmlOps.filter((o) => o.inl),
      labour: xmlOps.filter((o) => o.uni || o.rep),
      paint: xmlOps.filter((o) => o.rev),
      operations: xmlOps,
    };
    result.sourceHints.push(`xml_lines_${xmlOps.length}`);
  }

  result.format = result.format === "unknown" ? "xml" : result.format;
  return result;
}

function extractXmlOperations(xmlText) {
  const ops = [];
  const partRe =
    /<(?:Part|SparePart|Piesa|Position)[^>]*>([\s\S]*?)<\/(?:Part|SparePart|Piesa|Position)>/gi;
  let m;
  while ((m = partRe.exec(xmlText))) {
    const block = m[1];
    const name = block.match(/<(?:Description|Descriere|Name|PartName)[^>]*>([^<]+)/i)?.[1];
    const desc = String(name || "").trim();
    if (desc.length >= 3) {
      ops.push(createOperation(desc.toUpperCase(), { inl: true }));
    }
  }
  const labourRe =
    /<(?:Labour|Labor|WorkPosition|Manopera)[^>]*>([\s\S]*?)<\/(?:Labour|Labor|WorkPosition|Manopera)>/gi;
  while ((m = labourRe.exec(xmlText))) {
    const block = m[1];
    const name = block.match(/<(?:Description|Descriere|Name)[^>]*>([^<]+)/i)?.[1];
    const desc = String(name || "").trim();
    if (desc.length >= 3) {
      const flags = labourFlagsFromText(desc);
      ops.push(createOperation(desc.toUpperCase(), flags));
    }
  }
  return ops;
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
