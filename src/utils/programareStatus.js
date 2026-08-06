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
    return "app-prog-chip is-onorata";
  }
  if (status === PROGRAMARE_STATUS.NEONORATA) {
    return "app-prog-chip is-neonorata";
  }
  return "app-prog-chip";
}

export function getProgramareCardClass(status) {
  if (status === PROGRAMARE_STATUS.ONORATA) {
    return "app-prog-claim-card is-onorata";
  }
  if (status === PROGRAMARE_STATUS.NEONORATA) {
    return "app-prog-claim-card is-neonorata";
  }
  return "app-prog-claim-card";
}
