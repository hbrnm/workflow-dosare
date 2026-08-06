import { PIPELINE_PHASES, getStatusDefinition } from "../constants/config";

/** Texte prietenoase pe status — pentru pagina publică de tracking. */
export const CLIENT_STATUS_COPY = {
  deschidere: {
    title: "Dosar deschis",
    body: "Am înregistrat mașina. Urmează evaluarea daunelor.",
  },
  reconstatare: {
    title: "Reconstatare",
    body: "Se verifică și se documentează avariile împreună cu asigurătorul.",
  },
  accept_plata: {
    title: "Accept de plată",
    body: "Așteptăm confirmarea de plată de la asigurător ca să putem continua.",
  },
  piese_comandate: {
    title: "Piese comandate",
    body: "Am lansat comanda de piese. Te anunțăm când intră mașina în lucru.",
  },
  programat: {
    title: "Programat în service",
    body: "Mașina are o programare în atelier. Reparația urmează să înceapă.",
  },
  in_lucru: {
    title: "În reparație",
    body: "Echipa lucrează acum la vehiculul tău.",
  },
  gata_de_ridicare: {
    title: "Gata de ridicare",
    body: "Reparația este finalizată. Poți veni să ridici mașina.",
  },
  predat_client: {
    title: "Predat",
    body: "Vehiculul a fost predat. Îți mulțumim pentru încredere!",
  },
  facturat: {
    title: "Dosar finalizat",
    body: "Procesul pe acest dosar este închis din punct de vedere operațional.",
  },
};

export function getClientStatusCopy(statusKey) {
  const key = getStatusDefinition(statusKey).key;
  return (
    CLIENT_STATUS_COPY[key] || {
      title: getStatusDefinition(statusKey).label,
      body: "Statusul reparației a fost actualizat.",
    }
  );
}

export function getClientPhaseIndex(statusKey) {
  const key = getStatusDefinition(statusKey).key;
  const idx = PIPELINE_PHASES.findIndex((p) => p.statuses.includes(key));
  return idx < 0 ? 0 : idx;
}

/** Progres 0–100 pe baza fazei + flaguri ridicare. */
export function getClientProgressPercent(data) {
  if (!data) return 0;
  if (data.ridicata || data.status === "predat_client" || data.status === "facturat") return 100;
  if (data.gata_de_ridicare || data.status === "gata_de_ridicare") return 90;
  const idx = getClientPhaseIndex(data.status);
  const steps = PIPELINE_PHASES.length;
  return Math.min(85, Math.round(((idx + 0.5) / steps) * 100));
}

export const CLIENT_PHASE_HINTS = {
  start: "Preluare și deschidere dosar",
  eval: "Evaluare și aprobare asigurător",
  lucru: "Piese și reparație în atelier",
  final: "Finalizare și predare",
};
