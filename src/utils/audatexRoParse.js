import { uid } from "./dateUtils";
import { operationsSummary, createOperation } from "./estimateUtils";

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
    .replace(/^[:\-–=.\s]+/, "")
    .replace(/[:\-–=.\s]+$/, "")
    .trim()
    .slice(0, 100);
}

function audatexFlagsFromDesc(desc) {
  const t = String(desc || "").toUpperCase();
  const flags = { inl: false, rev: false, rep: false, uni: false };
  if (/\bD\/R\b|\bD\s*\/\s*R\b|DEMONT|MONTAR|DEM\.|MONT\./i.test(t)) flags.uni = true;
  if (/\bREPARAT|\BINDREPT|\BAJUST|\BRECTIF/i.test(t)) flags.rep = true;
  if (/\bVOP\b|VOPS|LACAR|GRUND|METALIZ|PREVOPS|REVOPS|K1G|K2/i.test(t)) flags.rev = true;
  if (/\bINLOC|\bSCHIMB|\bNOU\b|\bPIESA\s+NOUA/i.test(t)) flags.inl = true;
  if (!flags.inl && !flags.rev && !flags.rep && !flags.uni) flags.uni = true;
  return flags;
}

function stripAudatexOpCode(part) {
  let s = String(part || "").trim();
  s = s.replace(/^KN\s+/i, "");
  s = s.replace(/^\d{2}[-\s]\d{4}\s+\d{1,2}\s+/, "");
  s = s.replace(/^\d{2}[-\s]\d{4}\s+/, "");
  s = s.replace(/^\d{2}\s+\d{2}\s+\d{2}\s+\d{2}\s+/, "");
  s = s.replace(/^\d{2}\s+\d{2}\s+[\d)]+\s+/, "");
  s = s.replace(/^\d{4}\s+(?:\d{1,2}\s+)?/, "");
  s = s.replace(/^\d{2,3}[.)]\s+/, "");
  return s.trim();
}

/** Parse OPERATII line — UT (CL UT COST), ORE (ore COST) or direct description format. */
function parseAudatexOpLine(norm) {
  if (!norm || norm.startsWith("(") || /^COD\s*\//i.test(norm)) return null;
  if (/^(?:BAZA\s+MANOPERA|PRET\/CL|PRET\s*=|COD\s*\/\s*DETALII|ORE\s+COST|PRET|BAZA|COD|TOTAL|SUMA|SISTEM\s+AUDATEX)/i.test(norm)) return null;

  // 1. UT with Class/UT/Cost: e.g. "60-4204 01 D/R PIESE COMPONENTE USA SP DR 1 50 75.00"
  const m1 = norm.match(/^(.+?)\s+([123])\s+(\d+(?:\*|\.)?)\s+(\d+\.\d{2})\s*$/);
  if (m1) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(m1[1]));
    if (desc.length >= 3 && !/^(?:PRET|BAZA|COD|TOTAL|SUMA)/i.test(desc)) {
      return { name: desc, amount: parseAudatexMoney(m1[4]), flags: audatexFlagsFromDesc(desc) };
    }
  }

  // 2. ORE with Hours/Cost: e.g. "... 0.4 40.00" or "... 1.0* 100.00"
  const m2 = norm.match(/^(.+?)\s+(\d+(?:\.\d+)?)\*?\s+(\d+\.\d{2})\s*$/);
  if (m2) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(m2[1]));
    if (desc.length >= 3 && !/^(?:PRET|BAZA|COD|TOTAL|SUMA)/i.test(desc)) {
      return { name: desc, amount: parseAudatexMoney(m2[3]), flags: audatexFlagsFromDesc(desc) };
    }
  }

  // 3. Simple Amount at end: e.g. "D/R BARA PROTECTIE SPATE 150.00"
  const m3 = norm.match(/^(.+?)\s+(\d+\.\d{2})\*?\s*$/);
  if (m3) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(m3[1]));
    if (desc.length >= 3 && !/^(?:PRET|BAZA|COD|TOTAL|SUMA|PAGINA)/i.test(desc)) {
      return { name: desc, amount: parseAudatexMoney(m3[2]), flags: audatexFlagsFromDesc(desc) };
    }
  }

  // 4. Operation with Code prefix: e.g. "60-4204 01 D/R PIESE COMPONENTE USA SP DR"
  if (/^(?:KN\s+)?(?:\d{2}[-\s]\d{4}|\d{4})\s+(?:\d{1,2}\s+)?(?:D\/R|INL|REP|VOP|DEMONT|MONT|REPARAT|SCHIMB)/i.test(norm)) {
    const desc = cleanAudatexOpDesc(stripAudatexOpCode(norm.replace(/\s+\d+(?:\.\d+)?\*?\s*$/g, "")));
    if (desc.length >= 3) {
      return { name: desc, amount: 0, flags: audatexFlagsFromDesc(desc) };
    }
  }

  return null;
}

/** Parse PIESE line — ghid + descriere + buc + cod OE + preț. */
function parseAudatexPartLine(norm) {
  if (!norm || /VEZI\s+COD|^NR\.?GHID|^DESCRIERE|^PRET|^COD\s+PIESA/i.test(norm)) return null;
  const priceM = norm.match(/(\d+(?:\.\d{2})?)U?\*?\s*$/i);
  if (!priceM) return null;
  const price = parseAudatexMoney(priceM[1]);
  if (price == null) return null;
  const head = norm.slice(0, norm.length - priceM[0].length).trim();

  // Extract guide number (4 digits or \d{2}-\d{4} or \d{2}\s+\d{2})
  const guideM = head.match(/^(?:KN\s+)?(\d{2}[-\s]\d{4}|\d{4})(?:\s+\d{1,2})?\s+(.*)$/);
  const body = guideM ? guideM[2].trim() : head;
  const guide = guideM ? guideM[1] : "";

  // Pattern 1: GHID BUC [P/N] DESC COD — e.g. "1414 2 P DISTANTIER 1 418 363"
  const withBuc = body.match(/^(\d{1,2})\s+(?:[A-Z]\s+)?(.+?)\s+((?:\d+\s+)+\d+)\s*$/i);
  if (withBuc && withBuc[2].trim().length >= 2) {
    return {
      guide,
      name: cleanAudatexOpDesc(stripAudatexOpCode(withBuc[2])),
      qty: parseInt(withBuc[1], 10),
      partCode: withBuc[3].trim(),
      amount: price,
    };
  }

  // Pattern 2: GHID DESC COD — e.g. "1401 PARBRIZ 2 778 364" or "1410 FOLIE SENZOR PLOAIE 1 720 926"
  const descWithCode = body.match(/^(.+?)\s+((?:\d+\s+)+\d+)\s*$/);
  if (descWithCode && descWithCode[1].trim().length >= 2) {
    return {
      guide,
      name: cleanAudatexOpDesc(stripAudatexOpCode(descWithCode[1])),
      qty: 1,
      partCode: descWithCode[2].trim(),
      amount: price,
    };
  }

  // Pattern 3: Direct Name
  const directName = cleanAudatexOpDesc(stripAudatexOpCode(body));
  if (directName.length >= 2 && !/^(?:PRET|TOTAL|COD|P\s*I\s*E\s*S\s*E|BAZA|PAGINA|DISCOUNT)/i.test(directName)) {
    return {
      guide,
      name: directName,
      qty: 1,
      partCode: "",
      amount: price,
    };
  }

  return null;
}

/** Paint position without K1G: "0281 BARA ... REVOPSIRE PLASTIC 14" */
const AUDATEX_PAINT_REVOPS = /^(?:(?:KN\s+)?(?:\d{2}[-\s]\d{4}|\d{4})(?:\s+\d{1,2})?\s+)?(.+?\s+REVOPSIRE\s+.+?)\s+(\d+(?:\.\d+)?)\s*$/i;

/** Paint headline with K1G: "2583 BARA ... VOP. PIESE NOI K1G 21" */
const AUDATEX_PAINT_LINE = /^(?:(?:KN\s+)?(?:\d{2}[-\s]\d{4}|\d{4})(?:\s+\d{1,2})?\s+)?(.+?\s+VOP\.?\s*.+?)\s+K\dG\s+[\d.]+\s*$/i;

/** Supplementary article: "1000 3M-SET REP. PLAST ... 222.18*" */
const AUDATEX_SUPP_LINE = /^(?:(?:KN\s+)?(?:\d{2}[-\s]\d{4}|\d{4})(?:\s+\d{1,2})?\s+)?(.+?)\s+(\d+\.\d{2})\*?\s*$/;

function extractAudatexOperations(text) {
  const raw = String(text || "");
  const parts = [];
  const labour = [];
  const paint = [];
  const supplementary = [];

  // Section 1: Operații Manoperă
  const opBlocks = raw.split(/(?:O\s*P\s*E\s*R\s*A\s*T\s*I\s*I(?:\s*[\/\-]\s*PRET|\s+PRET|\s+CU\s+PRET\s+VALABIL)?|M\s*A\s*N\s*O\s*P\s*E\s*R\s*A)/gi).slice(1);
  for (const block of opBlocks) {
    const section = block.split(/-{3,}|V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E|P\s*I\s*E\s*S\s*E|SISTEM\s+AUDATEX|PAGINA\s+\d/i)[0] || "";
    for (const line of section.split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || norm.startsWith("(") || /^COD\s*\//i.test(norm)) continue;
      if (/^BAZA\s+MANOPERA|^PRET\/CL|^PRET\s*=|^COD\s*\/\s*DETALII|^ORE\s+COST/i.test(norm)) continue;

      const op = parseAudatexOpLine(norm);
      if (op) {
        labour.push({ ...op, source: "manopera" });
      }
    }
  }

  // Section 2: Vopsitorie
  const paintBlock = raw.match(
    /(?:V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E\s*\(|PREGATIRE\s+VOPSIRE|OPERATII\s+DETALII\s*-\s*PREVOPSIRE|VOPSITORIE\s+PRET)[\s\S]{0,4500}?(?=P\s*I\s*E\s*S\s*E|ARTICOLE\s+SUPLIMENTARE|C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A)/i
  ) || raw.match(/(?:V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E)[\s\S]{0,4500}?(?=P\s*I\s*E\s*S\s*E|ARTICOLE\s+SUPLIMENTARE|C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A)/i);

  if (paintBlock) {
    for (const line of paintBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || /^OPERATII|^PRET|^TOTAL|^PREGATIRE|^COST|^CONST|^INDEX|^VOPSITORIE/i.test(norm)) continue;

      const pm = norm.match(AUDATEX_PAINT_LINE);
      if (pm) {
        const base = cleanAudatexOpDesc(stripAudatexOpCode(pm[1].replace(/\s+VOP\.?\s+.*/i, "").trim()));
        if (base.length >= 3) paint.push({ name: base, flags: { inl: false, rev: true, rep: false, uni: false }, source: "vopsitorie" });
        continue;
      }
      const rev = norm.match(AUDATEX_PAINT_REVOPS);
      if (rev) {
        const base = cleanAudatexOpDesc(stripAudatexOpCode(rev[1].replace(/\s+REVOPSIRE\s+.*/i, "").trim()));
        if (base.length >= 3) paint.push({ name: base, flags: { inl: false, rev: true, rep: false, uni: false }, source: "vopsitorie" });
      }
    }
  }

  // Section 3: Piese de Schimb (vizează tabelul detaliat, nu liniile din cuprins/sumar)
  const partsBlock = raw.match(
    /(?:P\s*I\s*E\s*S\s*E\s+PRET\s+VALABIL|P\s*I\s*E\s*S\s*E\s+DE\s+SCHIMB|PIESE\s+DE\s+SCHIMB|NR\.?GHID\s+BUC\.?\s+DESCRIERE)[\s\S]{0,6000}?(?=ARTICOLE\s+SUPLIMENTARE|C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A|SISTEM\s+AUDATEX\s+PAGINA\s+[3-9])/i
  ) || raw.match(
    /(?:P\s*I\s*E\s*S\s*E|L\s*I\s*S\s*T\s*A\s+P\s*I\s*E\s*S\s*E)[\s\S]{0,6000}?(?=ARTICOLE\s+SUPLIMENTARE|C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A)/i
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

  // Section 4: Articole Suplimentare
  const supBlock = raw.match(/(?:ARTICOLE\s+SUPLIMENTARE|COSTURI\s+SUPLIMENTARE)[\s\S]{0,1500}?(?=C\s*A\s*L\s*C\s*U\s*L\s*A\s*T\s*I\s*E\s+F\s*I\s*N\s*A\s*L\s*A|-{3,})/i);
  if (supBlock) {
    for (const line of supBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (/^NR\.?GHID|^DESCRIERE|^PRET/i.test(norm)) continue;
      const sm = norm.match(AUDATEX_SUPP_LINE);
      if (sm) {
        supplementary.push({
          name: cleanAudatexOpDesc(sm[1]),
          amount: parseAudatexMoney(sm[2]),
          source: "supliment",
        });
      }
    }
  }

  // Universal Scanner Fallback: dacă prin secțiuni nu s-au găsit operațiuni, scanăm toate liniile documentului
  if (labour.length === 0 && parts.length === 0) {
    for (const line of raw.split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || norm.length < 5 || norm.startsWith("(") || /^COD\s*\//i.test(norm)) continue;
      if (/^BAZA\s+MANOPERA|^PRET\/CL|^PRET\s*=|^TOTAL|^SISTEM\s+AUDATEX|^CALCULATIE/i.test(norm)) continue;

      const op = parseAudatexOpLine(norm);
      if (op) {
        labour.push({ ...op, source: "manopera" });
        continue;
      }
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
    byKey.set(key, createOperation(clean, flags));
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
      set("costReparatieCuTva", amt, "audatex_brut");
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
  if (values.costReparatieCuTva == null && values.valoareDevizAudatex != null) {
    const m = String(text).match(/C\s*O\s*S\s*T\s+R\s*E\s*P\s*A\s*R\s*A\s*T\s*I\s*E\s+C\s*U\s+T\s*V\s*A\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("costReparatieCuTva", parseAudatexMoney(m[1]), "audatex_cuprins_brut");
  }
  if (values.costReparatieCuTva == null) {
    const m = String(text).match(/COST\s+REPARATIE\s+CU\s+TVA[^\d]{0,40}((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("costReparatieCuTva", parseAudatexMoney(m[1]), "audatex_cuprins_brut_plain");
  }
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

  const laborHours = extractAudatexLaborHours(text);
  if (laborHours.oreTinichigerieAudatex != null) {
    values.oreTinichigerieAudatex = laborHours.oreTinichigerieAudatex;
    hints.push("audatex_ore_tinichigerie");
  }
  if (laborHours.oreVopsitorieAudatex != null) {
    values.oreVopsitorieAudatex = laborHours.oreVopsitorieAudatex;
    hints.push("audatex_ore_vopsitorie");
  }

  return { values, hints };
}

/** Extrage ore lucrate tinichigerie/vopsitorie din deviz (UT sau ORE). */
export function extractAudatexLaborHours(text) {
  const raw = String(text || "");
  let oreTinichigerieAudatex = null;
  let oreVopsitorieAudatex = null;

  const oreTinMatch =
    raw.match(/TOTAL\s+([\d.]+)\s+ORE\s+X\s+[\d.]+\s+RON/i) ||
    raw.match(/TOTAL\s+TINICHIGERIE\s*[:\s]\s*([\d.]+)\s+ORE/i) ||
    raw.match(/MANOPERA\s+TINICHIGERIE\s*[:\s]\s*([\d.]+)\s+ORE/i);
  if (oreTinMatch) {
    oreTinichigerieAudatex = Math.round(parseFloat(oreTinMatch[1]) * 100) / 100;
  }

  if (oreTinichigerieAudatex == null && /100\s+UT\s*=\s*1\s+ORA/i.test(raw)) {
    const clMatches = [...raw.matchAll(/TOTAL\s+CL\s+\d+\s+(\d+)\s+UT/gi)];
    if (clMatches.length) {
      const totalUt = clMatches.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
      if (totalUt > 0) oreTinichigerieAudatex = Math.round((totalUt / 100) * 100) / 100;
    }
  }

  const oreVopsMatch =
    raw.match(/TOTAL\s+VOPSITORIE\s+1\s+ORA\s*:\s*([\d.]+)\s+ORE/i) ||
    raw.match(/TOTAL\s+VOPSITORIE\s*[:\s]\s*([\d.]+)\s+ORE/i) ||
    raw.match(/MANOPERA\s+VOPSITORIE\s*[:\s]\s*([\d.]+)\s+ORE/i);
  if (oreVopsMatch) {
    oreVopsitorieAudatex = Math.round(parseFloat(oreVopsMatch[1]) * 100) / 100;
  }

  if (oreVopsitorieAudatex == null) {
    const utVopsMatch = raw.match(/TOTAL\s+VOPSITORIE\s+100\s+UT\/ORA\s*:\s*(\d+)\s+UT/i);
    if (utVopsMatch) {
      oreVopsitorieAudatex = Math.round((parseInt(utVopsMatch[1], 10) / 100) * 100) / 100;
    }
  }

  return { oreTinichigerieAudatex, oreVopsitorieAudatex };
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
