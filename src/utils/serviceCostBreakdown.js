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
