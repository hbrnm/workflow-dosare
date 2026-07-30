// ---------------------------------------------------------------------------
// Config & Constants
// ---------------------------------------------------------------------------

export const STATUSES = [
  { key: "primit",           num: 1, label: "Dosar primit",              phase: "start" },
  { key: "cerere_reparatie", num: 2, label: "Cerere intrare reparație",  phase: "start" },
  { key: "reconstatare",     num: 3, label: "Reconstatare",              phase: "eval"  },
  { key: "accept_plata",     num: 4, label: "Accept de plată",           phase: "eval"  },
  { key: "piese_comandate",  num: 5, label: "Piese comandate",           phase: "lucru" },
  { key: "piese_sosite",     num: 6, label: "Piese sosite",              phase: "lucru" },
  { key: "programat",        num: 7, label: "Programat",                 phase: "lucru" },
  { key: "in_lucru",         num: 8, label: "În lucru",                  phase: "lucru" },
  { key: "facturat",         num: 9, label: "Facturat",                  phase: "final" },
];

export const STATUS_MIGRATION = { chemat_lucru: "programat", finalizat: "in_lucru" };
export const STADII_PROGRAMABILE = ["piese_sosite", "programat", "in_lucru"];

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

export function getStatusDefinition(statusKey) {
  return STATUSES.find((status) => status.key === statusKey) || FALLBACK_STATUS;
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
    statuses: ["primit", "cerere_reparatie"]
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
    description: "Comandă, recepție piese, atelier și lucru",
    barColor: "#C98A2B",
    bgColor: "#FBF3E6",
    statuses: ["piese_comandate", "piese_sosite", "programat", "in_lucru"]
  },
  {
    key: "final",
    label: "4. Finalizare & Predare",
    description: "Facturare dosar și eliberare mașină",
    barColor: "#3E6B45",
    bgColor: "#EEF5EE",
    statuses: ["facturat"]
  }
];
