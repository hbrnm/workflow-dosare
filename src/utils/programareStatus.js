/** @typedef {'onorata' | 'neonorata' | null} ProgramareStatus */

export const PROGRAMARE_STATUS = {
  ONORATA: "onorata",
  NEONORATA: "neonorata",
};

export function normalizeProgramareStatus(value) {
  if (value === PROGRAMARE_STATUS.ONORATA || value === PROGRAMARE_STATUS.NEONORATA) {
    return value;
  }
  return null;
}

export function getProgramareChipClass(status) {
  if (status === PROGRAMARE_STATUS.ONORATA) {
    return "bg-[#2F8F5B] text-white border-[#2F8F5B]";
  }
  if (status === PROGRAMARE_STATUS.NEONORATA) {
    return "bg-[#D6473F] text-white border-[#D6473F]";
  }
  return "bg-[#E7EEF5] text-[#2E5C8A] border-[#2E5C8A]/30";
}

export function getProgramareCardClass(status) {
  if (status === PROGRAMARE_STATUS.ONORATA) {
    return "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200/80 hover:border-emerald-500";
  }
  if (status === PROGRAMARE_STATUS.NEONORATA) {
    return "bg-red-50 border-red-400 ring-1 ring-red-200/80 hover:border-red-500";
  }
  return "bg-[#FAF8F5] border-[#DAD4C6] hover:border-[#3B5166]";
}
