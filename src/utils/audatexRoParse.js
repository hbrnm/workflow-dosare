import { uid } from "./dateUtils";
import { operationsSummary } from "./estimateUtils";

/** Detect Audatex Romania printable export (SISTEM AUDATEX, UT, CALCUL REPARATIE). */
export function isAudatexRoText(text) {
  const t = String(text || "");
  return (
    /SISTEM\s+AUDATEX/i.test(t) ||
    (/AUDATEX/i.test(t) && /(?:CALCUL\s+REPARATIE|C\s+A\s+L\s+C\s+U\s+L\s+A\s+T\s+I\s+E\s+F\s+I\s+N\s+A\s+L\s+A)/i.test(t)) ||
    (/100\s+UT\s*=\s*1\s+ORA/i.test(t) && /OPERATII\s+PRET/i.test(t)) ||
    (/BAZA\s+MANOPERA\s*=\s*1\s+ORA/i.test(t) && /OPERATII\s+PRET/i.test(t))
  );
}

/** Audatex RO amounts: 430.00, 1 377.59, 2 580.21 (space thousands, dot decimals). */
export function parseAudatexMoney(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\*$/, "");
  if (!s || s.endsWith("-")) return null;
  s = s.replace(/(\d)\s+(?=\d{3}(?:[.,\s]|$))/g, "$1");
  s = s.replace(/\s+/g, "");
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function moneyAtEnd(line) {
  const m = String(line || "").match(/((?:\d{1,3}(?:\s\d{3})*|\d+))\.\d{2}\s*$/);
  if (!m) return null;
  return parseAudatexMoney(m[0]);
}

function normLabel(line) {
  return String(line || "")
    .replace(/[.\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function lineLabelPart(line) {
  const money = moneyAtEnd(line);
  if (money == null) return normLabel(line);
  const idx = String(line).search(/((?:\d{1,3}(?:\s\d{3})*|\d+))\.\d{2}\s*$/);
  return normLabel(line.slice(0, idx));
}

function cleanAudatexOpDesc(desc) {
  return String(desc || "")
    .replace(/\s+/g, " ")
    .replace(/\*+$/, "")
    .trim()
    .slice(0, 100);
}

function audatexFlagsFromDesc(desc) {
  const t = String(desc || "").toUpperCase();
  const flags = { inl: false, rev: false, rep: false, uni: false };
  if (/\bD\/R\b|DEMONT|MONTAR/.test(t)) flags.uni = true;
  if (/\bREPARAT/.test(t)) flags.rep = true;
  if (/\bVOP\b|VOPS|LACAR|GRUND|METALIZ|PREVOPS|REVOPS/.test(t)) flags.rev = true;
  if (/\bINLOC|\bSCHIMB|\bNOU\b/.test(t)) flags.inl = true;
  if (!flags.inl && !flags.rev && !flags.rep && !flags.uni) flags.uni = true;
  return flags;
}

function stripAudatexOpCode(part) {
  let s = String(part || "").trim();
  s = s.replace(/^KN\s+/, "");
  s = s.replace(/^\d{2}\s+\d{2}\s+\d{2}\s+\d{2}\s+/, "");
  s = s.replace(/^\d{2}\s+\d{2}\s+[\d)]+\s+/, "");
  s = s.replace(/^\d{4}\s+/, "");
  return s;
}

/** Parse OPERATII line — UT (CL UT COST) or ORE (ore COST) format. */
function parseAudatexOpLine(norm) {
  if (!norm || norm.startsWith("(")) return null;

  // UT: "... CL UT COST" e.g. "D/R ROTI SP 1 30 30.00"
  const ut = norm.match(/^(.+?)\s+([123])\s+(\d+(?:\*|\.)?)\s+(\d+\.\d{2})\s*$/);
  if (ut) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(ut[1]));
    if (desc.length < 3) return null;
    return { name: desc, amount: parseAudatexMoney(ut[4]), flags: audatexFlagsFromDesc(desc) };
  }

  // ORE: "... 0.4 40.00" or "... 1.0* 100.00"
  const ore = norm.match(/^(.+?)\s+(\d+(?:\.\d+)?)\*?\s+(\d+\.\d{2})\s*$/);
  if (ore) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(ore[1]));
    if (desc.length < 3) return null;
    if (/^(?:PRET|BAZA|COD|TOTAL)/i.test(desc)) return null;
    return { name: desc, amount: parseAudatexMoney(ore[3]), flags: audatexFlagsFromDesc(desc) };
  }
  return null;
}

/** Parse PIESE line — ghid + descriere + buc + cod OE + preț. */
function parseAudatexPartLine(norm) {
  if (!norm || /VEZI\s+COD|^NR\.?GHID|^DESCRIERE|^PRET/i.test(norm)) return null;
  const priceM = norm.match(/(\d+(?:\.\d{2})?)U?\s*$/i);
  if (!priceM) return null;
  const price = parseAudatexMoney(priceM[1]);
  if (price == null) return null;
  const head = norm.slice(0, norm.length - priceM[0].length).trim();
  const guideM = head.match(/^(\d{4})\s+(.*)$/);
  if (!guideM) return null;
  const body = guideM[2];

  // GHID BUC DESC COD — e.g. "1414 2 P DISTANTIER 1 418 363"
  const withBuc = body.match(/^(\d+)\s+(.+?)\s+((?:\d+\s+)+\d+)\s*$/);
  if (withBuc && withBuc[1].length <= 2) {
    return {
      guide: guideM[1],
      name: cleanAudatexOpDesc(withBuc[2]),
      qty: parseInt(withBuc[1], 10),
      partCode: withBuc[3].trim(),
      amount: price,
    };
  }

  // GHID DESC BUC COD — e.g. "1401 PARBRIZ 2 778 364"
  const descFirst = body.match(/^(.+?)\s+(\d+)\s+((?:\d+\s+)+\d+)\s*$/);
  if (descFirst) {
    return {
      guide: guideM[1],
      name: cleanAudatexOpDesc(descFirst[1]),
      qty: parseInt(descFirst[2], 10),
      partCode: descFirst[3].trim(),
      amount: price,
    };
  }
  return null;
}

/** Paint position without K1G: "0281 BARA ... REVOPSIRE PLASTIC 14" */
const AUDATEX_PAINT_REVOPS = /^(\d{4})\s+(.+?\s+REVOPSIRE\s+.+?)\s+(\d+(?:\.\d+)?)\s*$/i;

/** Paint headline with K1G: "2583 BARA ... VOP. PIESE NOI K1G 21" */
const AUDATEX_PAINT_LINE = /^(\d{4})\s+(.+?\s+VOP\.?\s*.+?)\s+K\dG\s+[\d.]+\s*$/i;

/** Supplementary article: "1000 3M-SET REP. PLAST ... 222.18*" */
const AUDATEX_SUPP_LINE = /^(\d{4})\s+(.+?)\s+(\d+\.\d{2})\*?\s*$/;

function extractAudatexOperations(text) {
  const raw = String(text || "");
  const parts = [];
  const labour = [];
  const paint = [];
  const supplementary = [];

  const blocks = raw.split(/OPERATII\s+PRET/gi).slice(1);
  for (const block of blocks) {
    const section = block.split(/-{3,}|V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E|SISTEM\s+AUDATEX|PAGINA\s+\d/i)[0] || "";
    for (const line of section.split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || norm.startsWith("(") || /^COD\s*\//i.test(norm)) continue;
      if (/^BAZA\s+MANOPERA|^PRET\/CL|^PRET\s*=|^COD\s*\/\s*DETALII|^ORE\s+COST$/i.test(norm)) continue;

      const op = parseAudatexOpLine(norm);
      if (op) {
        labour.push({ ...op, source: "manopera" });
      }
    }
  }

  const paintBlock = raw.match(
    /V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E[\s\S]{0,3500}?(?=P\s*I\s*E\s*S\s*E|ARTICOLE\s+SUPLIMENTARE|SISTEM\s+AUDATEX|-{3,})/i
  );
  if (paintBlock) {
    for (const line of paintBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || /^OPERATII|^PRET|^TOTAL|^PREGATIRE|^COST|^CONST|^INDEX|^VOPSITORIE/i.test(norm)) continue;

      const pm = norm.match(AUDATEX_PAINT_LINE);
      if (pm) {
        const base = cleanAudatexOpDesc(pm[2].replace(/\s+VOP\.?\s+.*/i, "").trim());
        if (base.length >= 3) paint.push({ name: base, flags: { inl: false, rev: true, rep: false, uni: false }, source: "vopsitorie" });
        continue;
      }
      const rev = norm.match(AUDATEX_PAINT_REVOPS);
      if (rev) {
        const base = cleanAudatexOpDesc(rev[2].replace(/\s+REVOPSIRE\s+.*/i, "").trim());
        if (base.length >= 3) paint.push({ name: base, flags: { inl: false, rev: true, rep: false, uni: false }, source: "vopsitorie" });
      }
    }
  }

  const partsBlock = raw.match(
    /P\s*I\s*E\s*S\s*E\s+PRET\s+VALABIL[\s\S]{0,2000}?(?=ARTICOLE\s+SUPLIMENTARE|C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A|-{3,}|SISTEM\s+AUDATEX)/i
  );
  if (partsBlock) {
    for (const line of partsBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || /^P\s*I\s*E\s*S\s*E|^NR\.?GHID|^PRET\s+VALABIL|^BUC\.|^DESCRIERE|^COD\s+PIESA|^PRET$/i.test(norm)) continue;
      const p = parseAudatexPartLine(norm);
      if (p && p.name.length >= 2) {
        parts.push({
          name: p.name,
          qty: p.qty,
          partCode: p.partCode,
          amount: p.amount,
          flags: { inl: true, rev: false, rep: false, uni: false },
          source: "piese",
        });
      }
    }
  }

  const supBlock = raw.match(/ARTICOLE\s+SUPLIMENTARE[\s\S]{0,1200}?(?=C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A|-{3,})/i);
  if (supBlock) {
    for (const line of supBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (/^NR\.?GHID|^DESCRIERE|^PRET$/i.test(norm)) continue;
      const sm = norm.match(AUDATEX_SUPP_LINE);
      if (sm) {
        supplementary.push({
          name: cleanAudatexOpDesc(sm[2]),
          amount: parseAudatexMoney(sm[3]),
          source: "supliment",
        });
      }
    }
  }

  const operations = mergeAudatexOperations(parts, labour, paint);
  return { parts, labour, paint, supplementary, operations };
}

function mergeAudatexOperations(parts, labour, paint) {
  const byKey = new Map();

  const upsert = (name, flags) => {
    const clean = cleanAudatexOpDesc(name).toUpperCase();
    if (!clean || clean.length < 3) return;
    const key = clean.replace(/[^A-Z0-9]+/g, " ").trim();
    for (const [k, op] of byKey) {
      if (k.includes(key) || key.includes(k) || tokenOverlap(k, key) >= 2) {
        op.inl = op.inl || flags.inl;
        op.rev = op.rev || flags.rev;
        op.rep = op.rep || flags.rep;
        op.uni = op.uni || flags.uni;
        if (flags.rep || flags.rev || flags.inl) op.piesa = preferShorterPartName(op.piesa, clean);
        return;
      }
    }
    byKey.set(key, {
      id: uid(),
      piesa: clean,
      inl: !!flags.inl,
      rev: !!flags.rev,
      rep: !!flags.rep,
      uni: !!flags.uni,
    });
  };

  for (const p of parts) upsert(p.name, p.flags || { inl: true, rev: false, rep: false, uni: false });
  for (const l of labour) upsert(l.name, l.flags);
  for (const p of paint) upsert(p.name, p.flags);

  return Array.from(byKey.values());
}

function tokenOverlap(a, b) {
  const ta = new Set(String(a).split(" ").filter((t) => t.length > 2));
  const tb = String(b).split(" ").filter((t) => t.length > 2);
  return tb.filter((t) => ta.has(t)).length;
}

function preferShorterPartName(a, b) {
  const strip = (s) =>
    s
      .replace(/\b(D\/R|REPARATIE|REPARAT|VOP\.?|PIESE\s+NOI)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  const sa = strip(a);
  const sb = strip(b);
  if (sb.length >= 4 && sb.length <= sa.length) return sb.toUpperCase();
  return a;
}

/**
 * Parse Audatex RO totals from CALCULATIE FINALA + cuprins fallback.
 */
export function parseAudatexRoTotals(text) {
  const lines = String(text || "").split(/\r?\n/);
  const values = {};
  const hints = [];

  let inFinal = false;
  let inVopsitorie = false;

  const set = (key, val, hint) => {
    if (val == null || !Number.isFinite(val)) return;
    values[key] = val;
    hints.push(hint);
  };

  for (const line of lines) {
    const norm = line.replace(/\s+/g, " ").trim();
    if (/C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A/i.test(norm)) {
      inFinal = true;
      continue;
    }
    if (inFinal && /C\s*O\s*M\s*E\s*N\s*T\s*A\s*R\s*I\s*I/i.test(norm)) break;

    const label = normLabel(norm);

    // Section headers without amounts
    if (inFinal && /^VOPSITORIE$/i.test(label.replace(/\s/g, ""))) {
      inVopsitorie = true;
      continue;
    }
    if (inFinal && /^PIESE$/i.test(label.replace(/\s/g, "")) && !/TOTAL|VOP|NOI|DEM/.test(label)) {
      inVopsitorie = false;
      continue;
    }
    if (inFinal && label.includes("COSTURISUPLIMENTARE") && !label.includes("TOTAL")) {
      inVopsitorie = false;
      continue;
    }

    const amt = moneyAtEnd(norm);
    if (amt == null) continue;

    const lineLbl = lineLabelPart(norm);

    if (lineLbl.includes("TOTALMANOPERA") && !inVopsitorie && !lineLbl.includes("UL")) {
      set("manoperaTinichigerie", amt, "audatex_manopera");
      continue;
    }
    if (lineLbl.includes("TOTALCOSTURISUPLIMENTARE") || lineLbl.includes("TOTALARTICOLESUPLIMENTARE")) {
      set("cheltuieliDiverse", amt, "audatex_supliment");
      continue;
    }
    if (inVopsitorie && lineLbl.includes("COSTMANOPERA")) {
      set("manoperaVopsitorie", amt, "audatex_manopera_vops");
      continue;
    }
    if (inVopsitorie && lineLbl.includes("COSTMATERIALE")) {
      set("materialeVopsitorie", amt, "audatex_materiale_vops");
      continue;
    }
    if (lineLbl.includes("TOTALVOPSITORIE") && amt > 50) {
      set("totalVopsitorieAudatex", amt, "audatex_total_vops");
      continue;
    }
    if (lineLbl.includes("TOTALPIESE")) {
      set("valoarePieseAudatex", amt, "audatex_piese");
      continue;
    }
    if (lineLbl.includes("COSTREPARATIEFARATVA") || lineLbl.includes("COSTREPARATIENETTO")) {
      set("valoareDevizAudatex", amt, "audatex_netto");
      continue;
    }
    if (lineLbl.includes("COSTREPARATIECUTVA")) {
      set("_brutCuTva", amt, "audatex_brut");
    }
  }

  // Cuprins (pagina 1) fallback — spaced headings
  if (values.manoperaTinichigerie == null) {
    const m = String(text).match(/TOTAL\s+M\s*A\s*N\s*O\s*P\s*E\s*R\s*A\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaTinichigerie", parseAudatexMoney(m[1]), "audatex_cuprins_manopera");
  }
  if (values.manoperaTinichigerie == null) {
    const m = String(text).match(/TOTAL\s+MANOPERA[^\d]{0,40}((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaTinichigerie", parseAudatexMoney(m[1]), "audatex_cuprins_manopera_plain");
  }
  if (values.cheltuieliDiverse == null) {
    const m = String(text).match(/TOTAL\s+C\s*O\s*S\s*T\s*U\s*R\s*I\s*S\s*U\s*P\s*L\s*E\s*M\s*E\s*N\s*T\s*A\s*R\s*E\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("cheltuieliDiverse", parseAudatexMoney(m[1]), "audatex_cuprins_supliment");
  }
  if (values.cheltuieliDiverse == null) {
    const m = String(text).match(/TOTAL\s+COSTURI\s+SUPLIMENTARE[^\d]{0,40}((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("cheltuieliDiverse", parseAudatexMoney(m[1]), "audatex_cuprins_supliment_plain");
  }
  if (values.totalVopsitorieAudatex == null && values.manoperaVopsitorie == null) {
    const m = String(text).match(/TOTAL\s+V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("totalVopsitorieAudatex", parseAudatexMoney(m[1]), "audatex_cuprins_vops");
  }
  if (values.totalVopsitorieAudatex == null) {
    const m = String(text).match(/TOTAL\s+VOPSITORIE[^\d]{0,40}((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("totalVopsitorieAudatex", parseAudatexMoney(m[1]), "audatex_cuprins_vops_plain");
  }
  if (values.valoareDevizAudatex == null) {
    const m = String(text).match(
      /C\s*O\s*S\s*T\s+R\s*E\s*P\s*A\s*R\s*A\s*T\s*I\s*E\s+F\s*A\s*R\s*A\s+T\s*V\s*A\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i
    );
    if (m) set("valoareDevizAudatex", parseAudatexMoney(m[1]), "audatex_cuprins_netto");
  }
  if (values.valoareDevizAudatex == null) {
    const m = String(text).match(
      /COST\s+REPARATIE\s+FARA\s+TVA[^\d]{0,40}((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i
    );
    if (m) set("valoareDevizAudatex", parseAudatexMoney(m[1]), "audatex_cuprins_netto_plain");
  }

  // Paint labour from vopsitorie detail block if missing
  if (values.manoperaVopsitorie == null) {
    const m = String(text).match(/TOTAL\s+VOPSITORIE\s+100\s+UT\/ORA\s*:\s*\d+\s+UT\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaVopsitorie", parseAudatexMoney(m[1]), "audatex_vops_ut");
  }
  if (values.manoperaVopsitorie == null) {
    const m = String(text).match(/TOTAL\s+VOPSITORIE\s+1\s+ORA\s*:\s*[\d.]+\s+ORE\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaVopsitorie", parseAudatexMoney(m[1]), "audatex_vops_ore");
  }

  if (values.materialeVopsitorie == null && values.totalVopsitorieAudatex != null && values.manoperaVopsitorie != null) {
    const derived = Math.round((values.totalVopsitorieAudatex - values.manoperaVopsitorie) * 100) / 100;
    if (derived > 0) set("materialeVopsitorie", derived, "audatex_materiale_derived");
  }

  // Canonical Audatex cuprins totals (UI import)
  if (values.valoarePieseAudatex != null) values.totalPieseAudatex = values.valoarePieseAudatex;
  if (values.manoperaTinichigerie != null) values.totalManoperaAudatex = values.manoperaTinichigerie;
  if (values.cheltuieliDiverse != null) values.totalCosturiSuplimentareAudatex = values.cheltuieliDiverse;
  if (values.valoareDevizAudatex != null) values.costReparatieFaraTva = values.valoareDevizAudatex;
  if (
    values.totalVopsitorieAudatex == null &&
    values.manoperaVopsitorie != null &&
    values.materialeVopsitorie != null
  ) {
    values.totalVopsitorieAudatex =
      Math.round((values.manoperaVopsitorie + values.materialeVopsitorie) * 100) / 100;
  }

  delete values._brutCuTva;

  if (values.valoareDevizAudatex == null) {
    const sum =
      (values.valoarePieseAudatex || 0) +
      (values.manoperaTinichigerie || 0) +
      (values.manoperaVopsitorie || 0) +
      (values.materialeVopsitorie || 0) +
      (values.cheltuieliDiverse || 0);
    if (sum > 0) set("valoareDevizAudatex", Math.round(sum * 100) / 100, "audatex_sum");
  }

  return { values, hints };
}

/**
 * Full Audatex RO parse — totals + operațiuni.
 */
export function parseAudatexRoEstimate(text) {
  const raw = String(text || "");
  const { values, hints: totalHints } = parseAudatexRoTotals(raw);
  const lineItems = extractAudatexOperations(raw);
  const hints = [...totalHints];
  if (lineItems.operations.length) hints.push(`audatex_lines_${lineItems.operations.length}`);
  if (lineItems.parts?.length) hints.push(`audatex_piese_${lineItems.parts.length}`);

  const filled = Object.keys(values).filter((k) => values[k] != null).length;
  const confidence =
    filled >= 5 && (lineItems.operations.length >= 2 || lineItems.parts?.length >= 1)
      ? "high"
      : filled >= 3 || lineItems.operations.length >= 1 || lineItems.parts?.length >= 1
        ? "medium"
        : "low";

  return {
    values,
    confidence,
    sourceHints: hints,
    format: "audatex",
    lineItems,
  };
}

/** Re-export for tests */
export { mergeAudatexOperations, extractAudatexOperations };
