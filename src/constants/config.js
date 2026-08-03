// ---------------------------------------------------------------------------
// Config & Constants
// ---------------------------------------------------------------------------

export const STATUSES = [
  { key: "deschidere",       num: 1, label: "Deschidere dosar",          phase: "start" },
  { key: "reconstatare",     num: 2, label: "Reconstatare",              phase: "eval"  },
  { key: "accept_plata",     num: 3, label: "Accept de plată",           phase: "eval"  },
  { key: "piese_comandate",  num: 4, label: "Piese comandate",           phase: "lucru" },
  { key: "programat",        num: 5, label: "Programat",                 phase: "lucru" },
  { key: "in_lucru",         num: 6, label: "În lucru",                  phase: "lucru" },
  { key: "gata_de_ridicare", num: 7, label: "Gata de ridicare",          phase: "final" },
  { key: "predat_client",    num: 8, label: "Predat client",            phase: "final" },
  { key: "facturat",         num: 9, label: "Facturat asigurător",       phase: "final" },
];

export const STATUS_MIGRATION = {
  primit: "deschidere",
  cerere_reparatie: "deschidere",
  piese_sosite: "piese_comandate",
  chemat_lucru: "programat",
  finalizat: "gata_de_ridicare"
};
export const STADII_PROGRAMABILE = ["piese_comandate", "programat", "in_lucru"];

export const PHASE_COLORS = {
  start: { bar: "#3B5166", tint: "#EEF1F3" },
  eval:  { bar: "#4A6FA5", tint: "#ECF1F7" },
  lucru: { bar: "#C98A2B", tint: "#FBF3E6" },
  final: { bar: "#3E6B45", tint: "#EEF5EE" },
};

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

export function getPhaseColors(statusKey) {
  return PHASE_COLORS[getStatusDefinition(statusKey).phase] || PHASE_COLORS.start;
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
