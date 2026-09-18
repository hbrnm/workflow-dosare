// ---------------------------------------------------------------------------
// Config & Constants
// ---------------------------------------------------------------------------

/**
 * Flux operațional (6 stadii):
 * AIR → Piese → Programări → Reparație → Accept plată → Facturat
 * Cheile DB rămân stabile; etapele scoase din pipeline se mapează prin STATUS_MIGRATION.
 */
export const STATUSES = [
  { key: "deschidere",      num: 1, label: "Acord reparație", short: "AIR",      phase: "start",  alertDays: 3 },
  { key: "piese_comandate", num: 2, label: "Piese",           short: "Piese",    phase: "lucru",  alertDays: 4 },
  { key: "programat",       num: 3, label: "Programări",      short: "Prog.",    phase: "lucru",  alertDays: 3 },
  { key: "in_lucru",        num: 4, label: "Reparație",       short: "Repar.",   phase: "lucru",  alertDays: 7 },
  { key: "accept_plata",    num: 5, label: "Accept plată",    short: "AP",       phase: "final",  alertDays: 5 },
  { key: "facturat",        num: 6, label: "Facturat",        short: "Facturat", phase: "final",  alertDays: 30 },
];

export const STATUS_MIGRATION = {
  primit: "deschidere",
  cerere_reparatie: "deschidere",
  reconstatare: "deschidere",
  constatare: "deschidere",
  piese_sosite: "piese_comandate",
  chemat_lucru: "programat",
  finalizat: "in_lucru",
  gata_de_ridicare: "in_lucru",
  predat_client: "accept_plata",
};

/** Stadii din care se poate seta / muta o programare în atelier. */
export const STADII_PROGRAMABILE = ["piese_comandate", "programat", "in_lucru"];

/** Statusuri vizibile în Programator (desktop + mobil) — aceleași pe ambele. */
export const PROGRAMATOR_VISIBLE_STATUSES = [
  "programat",
  "in_lucru",
  "accept_plata",
  "facturat",
];

export function isProgramatorClaim(claim) {
  const key = getStatusDefinition(claim?.status).key;
  return !!(
    claim?.dataProgramare &&
    PROGRAMATOR_VISIBLE_STATUSES.includes(key)
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
  const keyNorm = String(statusKey || "").toLowerCase();
  const mappedKey = STATUS_MIGRATION[keyNorm] || keyNorm;
  return STATUSES.find((status) => status.key === mappedKey) || FALLBACK_STATUS;
}

/** Prescurtare stadiu (UI compact: alerte, carduri). */
export function getStatusShortLabel(statusKey) {
  const def = getStatusDefinition(statusKey);
  return def.short || def.label;
}

/** Numele de folder al stadiului — același pe mobil (ALL CAPS) și desktop. */
export function getStatusFolderLabel(statusKey, { upper = false } = {}) {
  const def = getStatusDefinition(statusKey);
  const label = def.label || "";
  return upper ? String(label).toLocaleUpperCase("ro-RO") : label;
}

/** True for pipeline step „Piese” (incl. legacy status piese_sosite). */
export function isPieseComandateStatus(statusKey) {
  return getStatusDefinition(statusKey).key === "piese_comandate";
}

export function getPhaseColors(statusKey) {
  return PHASE_COLORS[getStatusDefinition(statusKey).phase] || PHASE_COLORS.start;
}

/** Accent pe stadiu — carduri mobile (Brief / Dosare / Programări). */
export const STAGE_ACCENT = {
  deschidere: { className: "stage-air", color: "#3B5166" },
  piese_comandate: { className: "stage-piese", color: "#4A6FA5" },
  programat: { className: "stage-programat", color: "#C98A2B" },
  in_lucru: { className: "stage-lucru", color: "#B8791E" },
  accept_plata: { className: "stage-accept", color: "#2F6B4E" },
  facturat: { className: "stage-facturat", color: "#3E6B45" },
};

export function getStageAccent(statusKey) {
  const key = getStatusDefinition(statusKey).key;
  return STAGE_ACCENT[key] || STAGE_ACCENT.deschidere;
}

/** Culori coloană kanban (bg header + fundal soft). */
export function getPhaseColumnColors(phaseKey) {
  const p = PHASE_COLORS[phaseKey] || PHASE_COLORS.start;
  return { bg: p.bg || p.bar, soft: p.soft || p.tint };
}

const STATUS_ALERT_OVERRIDES_KEY = "workflow_dosare_termene_alerta";

export function getStatusAlertOverridesStorageKey(atelierId) {
  return atelierId ? `${STATUS_ALERT_OVERRIDES_KEY}_${atelierId}` : STATUS_ALERT_OVERRIDES_KEY;
}

/** Praguri alertă per stadiu — din Setări (localStorage) sau default din STATUSES. */
export function getStatusAlertOverrides(atelierId = null) {
  try {
    if (atelierId) {
      const tenantRaw = localStorage.getItem(getStatusAlertOverridesStorageKey(atelierId));
      if (tenantRaw) return JSON.parse(tenantRaw);
    }
    const raw = localStorage.getItem(STATUS_ALERT_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function cacheStatusAlertOverrides(overrides, atelierId = null) {
  try {
    const serialized = JSON.stringify(overrides || {});
    if (atelierId) {
      localStorage.setItem(getStatusAlertOverridesStorageKey(atelierId), serialized);
    }
    localStorage.setItem(STATUS_ALERT_OVERRIDES_KEY, serialized);
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
    label: "1. AIR",
    description: "Acord reparație",
    barColor: "#3B5166",
    bgColor: "#EEF1F3",
    statuses: ["deschidere"],
  },
  {
    key: "lucru",
    label: "2. Atelier",
    description: "Piese, programări și reparație",
    barColor: "#C98A2B",
    bgColor: "#FBF3E6",
    statuses: ["piese_comandate", "programat", "in_lucru"],
  },
  {
    key: "final",
    label: "3. Decontare",
    description: "Accept plată și facturare",
    barColor: "#3E6B45",
    bgColor: "#EEF5EE",
    statuses: ["accept_plata", "facturat"],
  },
];
