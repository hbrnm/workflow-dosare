import { uid } from "./dateUtils";
import { operationsSummary } from "./estimateUtils";

/** Detect Audatex Romania printable export (SISTEM AUDATEX, UT, CALCUL REPARATIE). */
export function isAudatexRoText(text) {
  const t = String(text || "");
  return (
    /SISTEM\s+AUDATEX/i.test(t) ||
    (/AUDATEX/i.test(t) && /(?:CALCUL\s+REPARATIE|C\s+A\s+L\s+C\s+U\s+L\s+A\s+T\s+I\s+E\s+F\s+I\s+N\s+A\s+L\s+A)/i.test(t)) ||
    (/100\s+UT\s*=\s*1\s+ORA/i.test(t) && /OPERATII\s+PRET/i.test(t))
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

function audatexFlagsFromDesc(desc) {
  const t = String(desc || "").toUpperCase();
  const flags = { inl: false, rev: false, rep: false, uni: false };
  if (/\bD\/R\b|DEMONT|MONTAR/.test(t)) flags.uni = true;
  if (/\bREPARAT/.test(t)) flags.rep = true;
  if (/\bVOP\b|VOPS|LACAR|GRUND|METALIZ|PREVOPS/.test(t)) flags.rev = true;
  if (/\bINLOC|\bSCHIMB|\bNOU\b/.test(t)) flags.inl = true;
  if (!flags.inl && !flags.rev && !flags.rep && !flags.uni) flags.uni = true;
  return flags;
}

function cleanAudatexOpDesc(desc) {
  return String(desc || "")
    .replace(/\s+/g, " ")
    .replace(/\*+$/, "")
    .trim()
    .slice(0, 100);
}

/** Main repair/paint position lines: "2583 BARA ... REPARATIE 3 50* 50.00" */
const AUDATEX_OP_LINE =
  /^((?:\d{2}\s+\d{2}\s+\d{2}\s+\d{2})|\d{4}|KN)\s+(.+?)\s+(\d)\s+(\d+(?:\*|\.)?)\s+(\d+\.\d{2})\s*$/;

/** Paint headline: "2583 BARA PROTECTIE SPATE VOP. PIESE NOI K1G 21" */
const AUDATEX_PAINT_LINE = /^(\d{4})\s+(.+?\s+VOP\.?\s*.+?)\s+K\dG\s+[\d.]+\s*$/i;

/** Supplementary article: "1000 3M-SET REP. PLAST ... 222.18*" */
const AUDATEX_SUPP_LINE = /^(\d{4})\s+(.+?)\s+(\d+\.\d{2})\*?\s*$/;

function extractAudatexOperations(text) {
  const raw = String(text || "");
  const labour = [];
  const paint = [];
  const supplementary = [];

  const blocks = raw.split(/OPERATII\s+PRET/gi).slice(1);
  for (const block of blocks) {
    const section = block.split(/-{3,}|V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E|SISTEM\s+AUDATEX|PAGINA\s+\d/i)[0] || "";
    for (const line of section.split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      if (!norm || norm.startsWith("(") || /^COD\s*\//i.test(norm)) continue;
      if (/^BAZA\s+MANOPERA|^PRET\/CL|^COD\s*\/\s*DETALII/i.test(norm)) continue;

      const m = norm.match(AUDATEX_OP_LINE);
      if (m) {
        const desc = cleanAudatexOpDesc(m[2]);
        if (desc.length >= 3) {
          labour.push({
            name: desc,
            amount: parseAudatexMoney(m[5]),
            flags: audatexFlagsFromDesc(desc),
            source: "manopera",
          });
        }
        continue;
      }

      const pm = norm.match(AUDATEX_PAINT_LINE);
      if (pm) {
        const desc = cleanAudatexOpDesc(pm[2].replace(/\s+VOP\.?\s*.*/i, "").trim() || pm[2]);
        paint.push({
          name: desc,
          flags: { inl: false, rev: true, rep: false, uni: false },
          source: "vopsitorie",
        });
      }
    }
  }

  // Paint block outside OPERATII (page 3)
  const paintBlock = raw.match(/V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E[\s\S]{0,2500}?(?=ARTICOLE\s+SUPLIMENTARE|SISTEM\s+AUDATEX|-{3,})/i);
  if (paintBlock) {
    for (const line of paintBlock[0].split(/\r?\n/)) {
      const norm = line.replace(/\s+/g, " ").trim();
      const pm = norm.match(AUDATEX_PAINT_LINE);
      if (pm) {
        const base = cleanAudatexOpDesc(pm[2].replace(/\s+VOP\.?\s+.*/i, "").trim());
        if (base.length >= 3) {
          paint.push({
            name: base,
            flags: { inl: false, rev: true, rep: false, uni: false },
            source: "vopsitorie",
          });
        }
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

  const operations = mergeAudatexOperations(labour, paint);
  return { parts: [], labour, paint, supplementary, operations };
}

function mergeAudatexOperations(labour, paint) {
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
        if (flags.rep || flags.rev) op.piesa = preferShorterPartName(op.piesa, clean);
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

    const label = lineLabelPart(norm);
    const amt = moneyAtEnd(norm);
    if (amt == null) continue;

    if (/VOPSITORIE/.test(label) && label.length < 20 && !/TOTAL/.test(label)) {
      inVopsitorie = true;
      continue;
    }
    if (/PIESE/.test(label) && !/NOI|DEM|VOP/.test(label)) inVopsitorie = false;

    if (label.includes("TOTALMANOPERA") && !inVopsitorie && !label.includes("UL")) {
      set("manoperaTinichigerie", amt, "audatex_manopera");
      continue;
    }
    if (label.includes("TOTALCOSTURISUPLIMENTARE") || label.includes("TOTALARTICOLESUPLIMENTARE")) {
      set("cheltuieliDiverse", amt, "audatex_supliment");
      continue;
    }
    if (inVopsitorie && label.includes("COSTMANOPERA")) {
      set("manoperaVopsitorie", amt, "audatex_manopera_vops");
      continue;
    }
    if (inVopsitorie && label.includes("COSTMATERIALE")) {
      set("materialeVopsitorie", amt, "audatex_materiale_vops");
      continue;
    }
    if (label.includes("TOTALVOPSITORIE") && amt > 50) {
      set("_totalVopsitorie", amt, "audatex_total_vops");
      continue;
    }
    if (label.includes("TOTALPIESE")) {
      set("valoarePieseAudatex", amt, "audatex_piese");
      continue;
    }
    if (label.includes("COSTREPARATIEFARATVA") || label.includes("COSTREPARATIENETTO")) {
      set("valoareDevizAudatex", amt, "audatex_netto");
      continue;
    }
    if (label.includes("COSTREPARATIECUTVA")) {
      set("_brutCuTva", amt, "audatex_brut");
    }
  }

  // Cuprins (pagina 1) fallback — spaced headings
  if (values.manoperaTinichigerie == null) {
    const m = String(text).match(/TOTAL\s+M\s*A\s*N\s*O\s*P\s*E\s*R\s*A\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaTinichigerie", parseAudatexMoney(m[1]), "audatex_cuprins_manopera");
  }
  if (values.cheltuieliDiverse == null) {
    const m = String(text).match(/TOTAL\s+C\s*O\s*S\s*T\s*U\s*R\s*I\s*S\s*U\s*P\s*L\s*E\s*M\s*E\s*N\s*T\s*A\s*R\s*E\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("cheltuieliDiverse", parseAudatexMoney(m[1]), "audatex_cuprins_supliment");
  }
  if (values._totalVopsitorie == null && values.manoperaVopsitorie == null) {
    const m = String(text).match(/TOTAL\s+V\s*O\s*P\s*S\s*I\s*T\s*O\s*R\s*I\s*E\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("_totalVopsitorie", parseAudatexMoney(m[1]), "audatex_cuprins_vops");
  }
  if (values.valoareDevizAudatex == null) {
    const m = String(text).match(
      /C\s*O\s*S\s*T\s+R\s*E\s*P\s*A\s*R\s*A\s*T\s*I\s*E\s+F\s*A\s*R\s*A\s+T\s*V\s*A\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i
    );
    if (m) set("valoareDevizAudatex", parseAudatexMoney(m[1]), "audatex_cuprins_netto");
  }

  // Paint labour from TOTAL VOPSITORIE block on page 3 if missing
  if (values.manoperaVopsitorie == null) {
    const m = String(text).match(/TOTAL\s+VOPSITORIE\s+100\s+UT\/ORA\s*:\s*\d+\s+UT\s+((?:\d{1,3}(?:\s\d{3})*|\d+)\.\d{2})/i);
    if (m) set("manoperaVopsitorie", parseAudatexMoney(m[1]), "audatex_vops_ut");
  }

  if (values.materialeVopsitorie == null && values._totalVopsitorie != null && values.manoperaVopsitorie != null) {
    const derived = Math.round((values._totalVopsitorie - values.manoperaVopsitorie) * 100) / 100;
    if (derived > 0) set("materialeVopsitorie", derived, "audatex_materiale_derived");
  }

  delete values._totalVopsitorie;
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

  const filled = Object.keys(values).filter((k) => values[k] != null).length;
  const confidence =
    filled >= 4 && lineItems.operations.length >= 2
      ? "high"
      : filled >= 2 || lineItems.operations.length >= 1
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
