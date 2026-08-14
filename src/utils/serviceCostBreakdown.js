import { computeServiceLaborCosts } from "./manoperaCost";

/** Categorii cost service — etichete + culoare bară (Tailwind). */
export const SERVICE_COST_CATEGORY_META = {
  piese: { label: "Piese achiziție", barClass: "bg-sky-500" },
  manoperaTinichigerie: { label: "Manoperă tinichigerie", barClass: "bg-violet-500" },
  manoperaVopsitorie: { label: "Manoperă vopsitorie", barClass: "bg-purple-500" },
  materialeVopsitorie: { label: "Materiale vopsitorie", barClass: "bg-orange-500" },
  consumabileTinichigerie: { label: "Consumabile tinichigerie", barClass: "bg-amber-500" },
  diverse: { label: "Cheltuieli diverse", barClass: "bg-slate-500" },
  masinaSchimb: { label: "Auto schimb", barClass: "bg-rose-500" },
};

/**
 * Breakdown costuri service cu procent din total.
 * @returns {{ total: number, rows: Array<{ key, label, amount, pct, barClass }> }}
 */
export function buildServiceCostBreakdown(amounts = {}) {
  const entries = Object.entries(SERVICE_COST_CATEGORY_META).map(([key, meta]) => ({
    key,
    label: meta.label,
    barClass: meta.barClass,
    amount: Math.round((Number(amounts[key]) || 0) * 100) / 100,
  }));

  const total = Math.round(entries.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
  const rows = entries
    .map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return { total, rows };
}

/**
 * Calculează centralizat sumarul financiar al unui dosar:
 * venit net, costuri totale, profit brut, marjă % și breakdown.
 *
 * @param {object} claim Obiectul dosarului (claim sau form)
 * @param {object} [tarifeRaw] Tarife orare service opționale
 * @returns {{
 *   venitNetTotal: number,
 *   valoareDevizAudatex: number,
 *   valoareAcceptPlata: number,
 *   valoareFransiza: number,
 *   pretPieseService: number,
 *   costManoperaTinichigerieService: number,
 *   costManoperaVopsitorieService: number,
 *   costMaterialeVopsitorieService: number,
 *   costConsumabileTinichigerieService: number,
 *   costMasinaSchimb: number,
 *   cheltuieliDiverseService: number,
 *   totalCosturiService: number,
 *   profitBrutReal: number,
 *   marjaProfitProc: number,
 *   breakdown: { total: number, rows: Array<object> }
 * }}
 */
export function computeClaimFinancialSummary(claim = {}, tarifeRaw = null) {
  const f = claim?.financiar || {};
  const aud = f.audatex || {};

  // Valoare totală deviz Audatex (piese + manoperă + materiale sau total explicit)
  const audPiese = Number(aud.piese) || Number(claim?.valoarePieseAudatex) || 0;
  const audTin = Number(aud.manoperaTinichigerie) || 0;
  const audVops = Number(aud.manoperaVopsitorie) || 0;
  const audMat = Number(aud.materialeVopsitorie) || 0;
  const computedAudTotal = audPiese + audTin + audVops + audMat;
  const valoareDevizAudatex =
    Number(aud.totalFaraTva) ||
    Number(f.valoareDevizAudatex) ||
    (computedAudTotal > 0 ? computedAudTotal : 0);

  const valoareAcceptPlata = Number(f.valoareAcceptPlata) || 0;
  const valoareFransiza = Number(f.valoareFransiza) || 0;

  // Venit Net: Accept de plată sau Deviz Audatex sau Piese facturate
  const venitNetTotal =
    valoareAcceptPlata > 0
      ? valoareAcceptPlata
      : valoareDevizAudatex > 0
      ? valoareDevizAudatex
      : Number(f.pieseFacturateFaraTva) || 0;

  // Cost achiziție piese
  const pretPieseService =
    Number(claim?.valoareAchizitiePiese) ||
    Number(f.costPieseAchizitie) ||
    0;

  // Ore și tarife manoperă
  const oreTin = Number(f.oreLucrateTinichigerie) || 0;
  const oreVops = Number(f.oreLucrateVopsitorie) || 0;

  let costTin = Number(f.costManoperaTinichigerieService) || 0;
  let costVops = Number(f.costManoperaVopsitorieService) || 0;

  if (tarifeRaw && (oreTin > 0 || oreVops > 0) && (!costTin || !costVops)) {
    const computedLabor = computeServiceLaborCosts(oreTin, oreVops, tarifeRaw);
    if (!costTin) costTin = computedLabor.tinichigerie;
    if (!costVops) costVops = computedLabor.vopsitorie;
  }

  const costMaterialeVopsitorieService = Number(f.costMaterialeVopsitorieService) || 0;
  const costConsumabileTinichigerieService = Number(f.costConsumabileTinichigerieService) || 0;
  const costMasinaSchimb = Number(f.costMasinaSchimb) || 0;
  const cheltuieliDiverseService = Number(f.costuriExterne) || 0;

  const rawAmounts = {
    piese: pretPieseService,
    manoperaTinichigerie: costTin,
    manoperaVopsitorie: costVops,
    materialeVopsitorie: costMaterialeVopsitorieService,
    consumabileTinichigerie: costConsumabileTinichigerieService,
    masinaSchimb: costMasinaSchimb,
    diverse: cheltuieliDiverseService,
  };

  const breakdown = buildServiceCostBreakdown(rawAmounts);
  const totalCosturiService = breakdown.total;
  const profitBrutReal = Math.round((venitNetTotal - totalCosturiService) * 100) / 100;
  const marjaProfitProc =
    venitNetTotal > 0
      ? Math.round((profitBrutReal / venitNetTotal) * 1000) / 10
      : 0;

  return {
    venitNetTotal,
    valoareDevizAudatex,
    valoareAcceptPlata,
    valoareFransiza,
    pretPieseService,
    costManoperaTinichigerieService: costTin,
    costManoperaVopsitorieService: costVops,
    costMaterialeVopsitorieService,
    costConsumabileTinichigerieService,
    costMasinaSchimb,
    cheltuieliDiverseService,
    totalCosturiService,
    profitBrutReal,
    marjaProfitProc,
    breakdown,
  };
}
