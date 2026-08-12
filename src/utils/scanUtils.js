// Utilitare categorie scan.

export const PHOTO_CATEGORIES = [
  { key: "receptie", label: "Recepție", color: "bg-[#C98A2B]" },
  { key: "reconstatare", label: "Reconstatare", color: "bg-[#3B5166]" },
  { key: "predare", label: "Predare", color: "bg-[#3E6B45]" },
];

export function categoryLabel(categoria) {
  if (categoria === "receptie") return "RECEPȚIE";
  if (categoria === "reconstatare") return "RECONST.";
  if (categoria === "predare") return "PREDARE";
  if (categoria === "generale") return "GENERAL";
  return null;
}
