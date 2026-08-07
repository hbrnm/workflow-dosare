// ---------------------------------------------------------------------------
// Config & Constants
// ---------------------------------------------------------------------------

export const STATUSES = [
  { key: "deschidere",       num: 1, label: "Acord intrare în reparație", phase: "start", alertDays: 3 },
  { key: "reconstatare",     num: 2, label: "Reconstatare",              phase: "eval",  alertDays: 5 },
  { key: "accept_plata",     num: 3, label: "Accept de plată",           phase: "eval",  alertDays: 5 },
  { key: "piese_comandate",  num: 4, label: "Piese comandate",           phase: "lucru", alertDays: 4 },
  { key: "programat",        num: 5, label: "Programat",                 phase: "lucru", alertDays: 3 },
  { key: "in_lucru",         num: 6, label: "În lucru",                  phase: "lucru", alertDays: 7 },
  { key: "gata_de_ridicare", num: 7, label: "Gata de ridicare",          phase: "final", alertDays: 3 },
  { key: "predat_client",    num: 8, label: "Predat client",            phase: "final", alertDays: 14 },
  { key: "facturat",         num: 9, label: "Facturat asigurător",       phase: "final", alertDays: 30 },
];

export const STATUS_MIGRATION = {
  primit: "deschidere",
  cerere_reparatie: "deschidere",
  piese_sosite: "piese_comandate",
  chemat_lucru: "programat",
  finalizat: "gata_de_ridicare"
};
export const STADII_PROGRAMABILE = ["piese_comandate", "programat", "in_lucru"];

/** Statusuri vizibile în Programator (desktop + mobil) — aceleași pe ambele. */
export const PROGRAMATOR_VISIBLE_STATUSES = [
  "programat",
  "in_lucru",
  "gata_de_ridicare",
  "predat_client",
  "facturat",
];

export function isProgramatorClaim(claim) {
  return !!(
    claim?.dataProgramare &&
    PROGRAMATOR_VISIBLE_STATUSES.includes(claim.status)
  );
}

export const PHASE_COLORS = {
  start: { bar: "#3B5166", tint: "#EEF1F3", bg: "#1E2A44", soft: "#E9EBF1" },
  eval:  { bar: "#4A6FA5", tint: "#ECF1F7", bg: "#2E5C8A", soft: "#E7EEF5" },
  lucru: { bar: "#C98A2B", tint: "#FBF3E6", bg: "#B8791E", soft: "#FBF0DE" },
  final: { bar: "#3E6B45", tint: "#EEF5EE", bg: "#2F6B4E", soft: "#E7F1EC" },
};

export const INSURANCE_TYPES = ["CASCO", "RCA", "Regie Proprie", "Fără asigurare"];

export const INSURERS = [
  "Omniasig VIG", "Asirom VIG", "Allianz-Țiriac", "Groupama Asigurări",
  "Euroins România", "Grawe România", "Generali România", "Uniqa Asigurări",
  "Axeria IARD", "Hellas Direct",
];

export const PIE_COLORS = ["#3B5166", "#4A6FA5", "#C98A2B", "#3E6B45", "#B23A2E", "#8A8375", "#7A5316", "#2C4160", "#294A2E"];

export const FALLBACK_STATUS = STATUSES[0];

// Limite pentru încărcarea fișierelor (poze / documente pe dosar), ca să nu
// se umple accidental storage-ul cu fișiere prea mari sau prea multe.
export const MAX_UPLOAD_SIZE_MB = 8;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const MAX_POZE_PER_DOSAR = 20;
export const MAX_DOCUMENTE_PER_DOSAR = 15;

export function getStatusDefinition(statusKey) {
  const mappedKey = STATUS_MIGRATION[statusKey] || statusKey;
  return STATUSES.find((status) => status.key === mappedKey) || FALLBACK_STATUS;
}

/** True for pipeline step „Piese comandate” (incl. legacy status piese_sosite). */
export function isPieseComandateStatus(statusKey) {
  return getStatusDefinition(statusKey).key === "piese_comandate";
}

export function getPhaseColors(statusKey) {
  return PHASE_COLORS[getStatusDefinition(statusKey).phase] || PHASE_COLORS.start;
}

/** Culori coloană kanban (bg header + fundal soft). */
export function getPhaseColumnColors(phaseKey) {
  const p = PHASE_COLORS[phaseKey] || PHASE_COLORS.start;
  return { bg: p.bg || p.bar, soft: p.soft || p.tint };
}

const STATUS_ALERT_OVERRIDES_KEY = "workflow_dosare_termene_alerta";

/** Praguri alertă per stadiu — din Setări (localStorage) sau default din STATUSES. */
export function getStatusAlertOverrides() {
  try {
    const raw = localStorage.getItem(STATUS_ALERT_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function cacheStatusAlertOverrides(overrides) {
  try {
    localStorage.setItem(STATUS_ALERT_OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch {
    /* ignore */
  }
}

export function getStatusAlertDays(statusKey, overrides) {
  const key = getStatusDefinition(statusKey).key;
  const map = overrides || getStatusAlertOverrides();
  if (map[key] != null && map[key] !== "") {
    const n = Number(map[key]);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const def = STATUSES.find((s) => s.key === key);
  return def?.alertDays ?? 3;
}

/**
 * Prag efectiv pentru un dosar: din Setări (per stadiu), live.
 * Nu folosim termenAlertaZile înghețat pe dosar — altfel schimbarea pragurilor
 * din Setări nu ar afecta cardurile / Brief până la următoarea schimbare de status.
 * Câmpul pe dosar rămâne ca snapshot la mutare status (rapoarte / DB).
 */
export function getClaimAlertDays(claim, overrides) {
  return getStatusAlertDays(claim?.status, overrides);
}

export const PIPELINE_PHASES = [
  {
    key: "start",
    label: "1. Deschidere & Intrare",
    description: "Preluare dosar și cerere intrare reparație",
    barColor: "#3B5166",
    bgColor: "#EEF1F3",
    statuses: ["deschidere"]
  },
  {
    key: "eval",
    label: "2. Evaluare & Aprobare",
    description: "Reconstatare și obținere accept de plată",
    barColor: "#4A6FA5",
    bgColor: "#ECF1F7",
    statuses: ["reconstatare", "accept_plata"]
  },
  {
    key: "lucru",
    label: "3. Piese & Service",
    description: "Comandă piese, recepție, atelier și lucru",
    barColor: "#C98A2B",
    bgColor: "#FBF3E6",
    statuses: ["piese_comandate", "programat", "in_lucru"]
  },
  {
    key: "final",
    label: "4. Finalizare & Predare",
    description: "Gata de ridicare, predare și facturare asigurător",
    barColor: "#3E6B45",
    bgColor: "#EEF5EE",
    statuses: ["gata_de_ridicare", "predat_client", "facturat"]
  }
];
