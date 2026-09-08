import { PIPELINE_PHASES, getStatusDefinition } from "../constants/config";

/** Texte prietenoase pe status — pentru pagina publică de tracking. */
export const CLIENT_STATUS_COPY = {
  deschidere: {
    title: "Dosar deschis",
    body: "Am înregistrat mașina. Urmează pregătirea pieselor și programarea în atelier.",
  },
  reconstatare: {
    title: "Dosar deschis",
    body: "Am înregistrat mașina. Urmează pregătirea pieselor și programarea în atelier.",
  },
  piese_comandate: {
    title: "Piese în pregătire",
    body: "Am lansat comanda de piese. Te anunțăm când programăm reparația.",
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
    title: "În reparație",
    body: "Reparația este aproape finalizată. Te anunțăm pentru ridicare.",
  },
  accept_plata: {
    title: "Accept de plată",
    body: "Reparația s-a încheiat. Lucrăm la acceptul de plată și decontare.",
  },
  predat_client: {
    title: "Accept de plată",
    body: "Vehiculul a fost predat. Finalizăm decontarea pe dosar.",
  },
  facturat: {
    title: "Dosar finalizat",
    body: "Procesul pe acest dosar este închis din punct de vedere operațional.",
  },
};

export function getClientStatusCopy(statusKey) {
  const key = getStatusDefinition(statusKey).key;
  return (
    CLIENT_STATUS_COPY[key] ||
    CLIENT_STATUS_COPY[statusKey] || {
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
  const key = getStatusDefinition(data.status).key;
  if (data.ridicata || key === "facturat") return 100;
  if (key === "accept_plata") return 92;
  if (data.gata_de_ridicare || data.gataDeRidicare) return 88;
  const idx = getClientPhaseIndex(data.status);
  const steps = PIPELINE_PHASES.length;
  return Math.min(80, Math.round(((idx + 0.5) / steps) * 100));
}

export const CLIENT_PHASE_HINTS = {
  start: "Acord reparație",
  lucru: "Piese, programări și reparație",
  final: "Accept plată și facturare",
  eval: "Evaluare",
};

export function getTrackingTokenFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("t") || params.get("track") || "";
  } catch {
    return "";
  }
}

export function buildTrackingUrl(token, baseUrl) {
  if (!token) return "";
  let base = baseUrl;
  if (!base && typeof window !== "undefined" && window.location?.origin) {
    base = window.location.origin + window.location.pathname;
  }
  if (!base) {
    base = "https://app.workflow-daune.ro/";
  }
  const url = new URL(base);
  url.searchParams.set("t", token);
  return url.toString();
}

