/**
 * Glossar scurt pentru jargonul atelier — tooltips / title attributes.
 * Chei: status pipeline + termeni UI (sosite, brief, flux…).
 */
export const GLOSSARY = {
  deschidere: {
    short: "AIR",
    title: "AIR — Acord reparație",
    hint: "Dosarul e deschis; se strâng date, poze și acordul pentru reparație.",
  },
  piese_comandate: {
    short: "Piese",
    title: "Piese comandate",
    hint: "Piesele sunt comandate la furnizor. Marchează „Sosite” când ajung.",
  },
  sosite: {
    short: "Sosite",
    title: "Piese sosite",
    hint: "Piesele au ajuns în atelier — poți programa mașina la lucru.",
  },
  programat: {
    short: "Prog.",
    title: "Programări",
    hint: "Mașina are dată/oră rezervată în calendarul atelierului.",
  },
  in_lucru: {
    short: "Repar.",
    title: "Reparație",
    hint: "Lucrările de tinichigerie / vopsitorie sunt în curs.",
  },
  accept_plata: {
    short: "AP",
    title: "Accept plată",
    hint: "Reparația e gata; se așteaptă acceptul / plata decontului.",
  },
  facturat: {
    short: "Facturat",
    title: "Facturat",
    hint: "Dosar închis financiar — factura emisă.",
  },
  brief: {
    short: "Brief",
    title: "Brief",
    hint: "Centrul de comandă al zilei: alerte, programări și ce cere reacție acum.",
  },
  flux: {
    short: "Flux",
    title: "Flux",
    hint: "Tablou pe stadii — vezi toate dosarele pe etape și le muți rapid.",
  },
  programari: {
    short: "Programări",
    title: "Programări",
    hint: "Calendarul atelierului: sloturi, capacitate și mașini programate.",
  },
};

export function glossaryForStatus(statusKey) {
  const key = String(statusKey || "").trim();
  return GLOSSARY[key] || null;
}

export function glossaryTitle(statusKey) {
  const g = glossaryForStatus(statusKey);
  if (!g) return undefined;
  return `${g.title}: ${g.hint}`;
}
