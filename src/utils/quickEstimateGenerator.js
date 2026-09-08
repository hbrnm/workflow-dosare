import { parseNumber } from "./claimModel";
import { normalizeOperations } from "./estimateUtils";

/**
 * Ore de manoperă standard estimate per operațiune și severitate de caroserie.
 */
export const ESTIMATED_HOURS = {
  inl: 2.0, // Ore tinichigerie demontare/montare și ajustare piesă nouă
  rep_usoara: 1.0,
  rep_medie: 2.0,
  rep_grava: 3.5,
  rev: 1.8, // Ore pregătire și vopsitorie per element
  uni: 0.8, // Demontare/Remontare mecanică
  costMaterialVopseaPerElement: 220, // RON per element vopsit
};

/**
 * Generează calculul estimativ rapid pe baza reperelor avariate și tarifelor atelierului.
 * @param {Object} claim
 * @param {Object} tarifeAtelier
 * @returns {Object}
 */
export function generateQuickEstimate(claim = {}, tarifeAtelier = {}) {
  const operations = normalizeOperations(claim.operatiuni, claim.ceEsteDeReparat);
  const damageMarks = Array.isArray(claim.damageMarks) ? claim.damageMarks : [];

  // Rate orare (din configurare atelier sau valori de piață uzuale)
  const tarifTinichigerie =
    parseNumber(tarifeAtelier.tinichigerie?.tarifOrar, 0) ||
    parseNumber(claim.financiar?.tarifOrarTinichigerie, 150);

  const tarifVopsitorie =
    parseNumber(tarifeAtelier.vopsitorie?.tarifOrar, 0) ||
    parseNumber(claim.financiar?.tarifOrarVopsitorie, 160);

  let oreTinichigerie = 0;
  let oreVopsitorie = 0;
  let costMaterialeVopsea = 0;
  let elementeVopsiteCount = 0;

  const items = [];

  // 1. Dacă avem operațiuni detaliate
  if (operations.length > 0) {
    operations.forEach((op) => {
      let hTin = 0;
      let hVop = 0;
      let mat = 0;

      if (op.inl) hTin += ESTIMATED_HOURS.inl;
      if (op.rep) hTin += ESTIMATED_HOURS.rep_medie;
      if (op.uni) hTin += ESTIMATED_HOURS.uni;
      if (op.rev) {
        hVop += ESTIMATED_HOURS.rev;
        mat += ESTIMATED_HOURS.costMaterialVopseaPerElement;
        elementeVopsiteCount += 1;
      }

      oreTinichigerie += hTin;
      oreVopsitorie += hVop;
      costMaterialeVopsea += mat;

      items.push({
        reper: op.piesa || "Element caroserie",
        operatiuni: [
          op.inl ? "INL" : null,
          op.rep ? "REP" : null,
          op.rev ? "REV" : null,
          op.uni ? "D/R" : null,
        ]
          .filter(Boolean)
          .join(", ") || "Constatare",
        oreTinichigerie: hTin,
        oreVopsitorie: hVop,
        costEstimativFaraTva: Math.round(hTin * tarifTinichigerie + hVop * tarifVopsitorie + mat),
      });
    });
  } else if (damageMarks.length > 0) {
    // 2. Altfel calculăm din damageMarks
    damageMarks.forEach((mark) => {
      const sev = mark.severity || "medie";
      const hTin =
        sev === "grava"
          ? ESTIMATED_HOURS.rep_grava
          : sev === "usoara"
          ? ESTIMATED_HOURS.rep_usoara
          : ESTIMATED_HOURS.rep_medie;
      const hVop = ESTIMATED_HOURS.rev;
      const mat = ESTIMATED_HOURS.costMaterialVopseaPerElement;

      oreTinichigerie += hTin;
      oreVopsitorie += hVop;
      costMaterialeVopsea += mat;
      elementeVopsiteCount += 1;

      items.push({
        reper: mark.label || mark.partId || "Reper avariat",
        operatiuni: `REP (${sev}) + REV`,
        oreTinichigerie: hTin,
        oreVopsitorie: hVop,
        costEstimativFaraTva: Math.round(hTin * tarifTinichigerie + hVop * tarifVopsitorie + mat),
      });
    });
  }

  // Rotunjiri
  oreTinichigerie = Math.round(oreTinichigerie * 10) / 10;
  oreVopsitorie = Math.round(oreVopsitorie * 10) / 10;

  const totalManoperaTinichigerie = Math.round(oreTinichigerie * tarifTinichigerie);
  const totalManoperaVopsitorie = Math.round(oreVopsitorie * tarifVopsitorie);
  const totalManopera = totalManoperaTinichigerie + totalManoperaVopsitorie;

  const costTotalFaraTva = totalManopera + costMaterialeVopsea;
  const tvaProc = parseNumber(claim.financiar?.tvaProc, 21);
  const tvaValoare = Math.round(costTotalFaraTva * (tvaProc / 100));
  const costTotalCuTva = costTotalFaraTva + tvaValoare;

  return {
    items,
    elementeCount: items.length,
    oreTinichigerie,
    oreVopsitorie,
    totalOre: Math.round((oreTinichigerie + oreVopsitorie) * 10) / 10,
    tarifTinichigerie,
    tarifVopsitorie,
    totalManoperaTinichigerie,
    totalManoperaVopsitorie,
    totalManopera,
    costMaterialeVopsea,
    costTotalFaraTva,
    tvaProc,
    tvaValoare,
    costTotalCuTva,
  };
}

/**
 * Generează textul complet pentru Nota de Constatare Rapidă.
 */
export function buildNotaConstatareText(claim = {}, estimate = {}) {
  const lines = [];
  lines.push("══════════════════════════════════════════════════");
  lines.push("       NOTĂ DE CONSTATARE & ESTIMARE RAPIDĂ       ");
  lines.push("══════════════════════════════════════════════════");
  lines.push(`Dosar: ${claim.numarDosar || "Fără număr"}`);
  lines.push(`Nr. Înmatriculare: ${claim.numarInmatriculare || "-"}`);
  lines.push(`Vehicul: ${claim.marcaModel || [claim.marca, claim.model].filter(Boolean).join(" ") || "-"}`);
  lines.push(`Serie Șasiu (VIN): ${claim.vin || "-"}`);
  lines.push(`Client: ${claim.client || "-"} | Tel: ${claim.telefonClient || "-"}`);
  lines.push(`Asigurător: ${claim.asigurator || "Regie proprie"} (${claim.tipAsigurare || "RCA"})`);
  lines.push(`Data: ${new Date().toLocaleDateString("ro-RO")}`);
  lines.push("──────────────────────────────────────────────────");
  lines.push("REPERE AVARIATE & OPERAȚIUNI:");

  if (estimate.items && estimate.items.length > 0) {
    estimate.items.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.reper} — [${item.operatiuni}] (~${item.costEstimativFaraTva} lei)`);
    });
  } else {
    lines.push("Niciun reper avariat specificat.");
  }

  lines.push("──────────────────────────────────────────────────");
  lines.push(`Ore Tinichigerie: ${estimate.oreTinichigerie || 0} h (${estimate.totalManoperaTinichigerie || 0} RON)`);
  lines.push(`Ore Vopsitorie: ${estimate.oreVopsitorie || 0} h (${estimate.totalManoperaVopsitorie || 0} RON)`);
  lines.push(`Materiale Vopsea: ${estimate.costMaterialeVopsea || 0} RON`);
  lines.push(`TOTAL ESTIMAT (FĂRĂ TVA): ${estimate.costTotalFaraTva || 0} RON`);
  lines.push(`TOTAL ESTIMAT (CU TVA ${estimate.tvaProc || 21}%): ${estimate.costTotalCuTva || 0} RON`);
  lines.push("══════════════════════════════════════════════════");
  lines.push("Notă: Acest deviz are caracter strict orientativ.");

  return lines.join("\n");
}
