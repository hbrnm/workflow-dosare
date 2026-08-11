/** Câmpuri deviz Audatex — mapare 1:1 cu cuprinsul PDF. */
export const AUDATEX_DEVIZ_UI_FIELDS = [
  { key: "totalPiese", label: "Total piese" },
  { key: "totalManopera", label: "Total manoperă" },
  { key: "totalCosturiSuplimentare", label: "Total costuri suplimentare (2%)" },
  { key: "totalVopsitorie", label: "Total vopsitorie" },
  { key: "costReparatieFaraTva", label: "Total reparație fără TVA", primary: true },
  { key: "costReparatieCuTva", label: "Total reparație cu TVA", primary: true },
];

export function emptyAudatexDevizTotals() {
  return {
    totalPiese: 0,
    totalManopera: 0,
    totalCosturiSuplimentare: 0,
    totalVopsitorie: 0,
    costReparatieFaraTva: 0,
    costReparatieCuTva: 0,
  };
}
