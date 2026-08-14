import { uid } from "./dateUtils";

export const OP_FLAGS = [
  { key: "inl", label: "INL", title: "Înlocuire", active: "bg-[#B8791E] text-white border-[#B8791E]" },
  { key: "rev", label: "REV", title: "Revopsire", active: "bg-[#3B5166] text-white border-[#3B5166]" },
  { key: "rep", label: "REP", title: "Reparație", active: "bg-[#3E6B45] text-white border-[#3E6B45]" },
  { key: "uni", label: "D/R", title: "Demontare / Remontare (D/R)", active: "bg-[#2C4160] text-white border-[#2C4160]" },
];

export const DEVIZ_FILE_TYPES = [
  { key: "audatex", label: "Audatex" },
  { key: "dat", label: "DAT" },
  { key: "pdf", label: "PDF / alt export" },
  { key: "altele", label: "Altele" },
];

export function createOperation(piesa = "", flags = {}) {
  return {
    id: uid(),
    piesa: String(piesa || "").trim(),
    inl: !!flags?.inl,
    rev: !!flags?.rev,
    rep: !!flags?.rep,
    uni: !!flags?.uni,
  };
}

export function emptyOperationLine() {
  return createOperation("", {});
}

/** Normalizează operatiuni la listă de linii (compatibil cu formatul vechi obiect). */
export function normalizeOperations(operatiuni, ceEsteDeReparat = "") {
  if (Array.isArray(operatiuni) && operatiuni.length > 0) {
    return operatiuni.map((op, idx) => ({
      id: op.id || `${uid()}_${idx}`,
      piesa: op.piesa || "",
      inl: !!op.inl,
      rev: !!op.rev,
      rep: !!op.rep,
      uni: !!op.uni,
    }));
  }
  if (operatiuni && typeof operatiuni === "object") {
    return [
      {
        id: uid(),
        piesa: ceEsteDeReparat || "",
        inl: !!operatiuni.inl,
        rev: !!operatiuni.rev,
        rep: !!operatiuni.rep,
        uni: !!operatiuni.uni,
      },
    ];
  }
  return [];
}

export function operationsSummary(operatiuni) {
  const lines = normalizeOperations(operatiuni);
  return lines
    .map((o) => o.piesa)
    .filter(Boolean)
    .join(", ");
}

export function countOperationsByFlag(operatiuni) {
  const lines = normalizeOperations(operatiuni);
  return {
    total: lines.length,
    inl: lines.filter((l) => l.inl).length,
    rev: lines.filter((l) => l.rev).length,
    rep: lines.filter((l) => l.rep).length,
    uni: lines.filter((l) => l.uni).length,
  };
}
