export const AUDATEX_DEVIZ_UI_FIELDS = [
  { key: "totalPiese", label: "Total piese" },
  { key: "totalManopera", label: "Manoperă tinichigerie" },
  { key: "manoperaVopsitorie", label: "Manoperă vopsitorie" },
  { key: "materialeVopsitorie", label: "Materiale vopsitorie" },
  { key: "totalCosturiSuplimentare", label: "Total costuri suplimentare (2%)" },
  { key: "totalVopsitorie", label: "Total vopsitorie (Manoperă + Materiale)" },
  { key: "costReparatieFaraTva", label: "Total reparație fără TVA", primary: true },
  { key: "costReparatieCuTva", label: "Total reparație cu TVA", primary: true },
];

export function emptyAudatexDevizTotals() {
  return {
    totalPiese: 0,
    totalManopera: 0,
    manoperaVopsitorie: 0,
    materialeVopsitorie: 0,
    totalCosturiSuplimentare: 0,
    totalVopsitorie: 0,
    costReparatieFaraTva: 0,
    costReparatieCuTva: 0,
  };
}
