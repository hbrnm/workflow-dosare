/**
 * Logică tipizate „Cerere despăgubire” (Omniasig).
 *
 * - Subsemnatul = delegatul când e diferit de proprietar; altfel persoana-proprietar
 * - „reprezentant al societății” = proprietarul (client) când e firmă SAU când
 *   există delegat distinct (cine e reprezentat pe cerere)
 * - Sume / date / bife rămân goale (de mână)
 */

/** Destinație plată din formularul tipizat (atelier). */
export const CERERE_ATELIER_PLATA = {
  beneficiar: "SC AUTO WASH IMPEX SRL",
  banca: "PROCREDIT BANK",
  cont: "RO56 MIRO 0000 1184 0304 0301",
};

/** @deprecated folosește CERERE_ATELIER_PLATA */
export const OMNIASIG_CERERE_PLATA = CERERE_ATELIER_PLATA;

function stripDiacriticsLoose(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș|ş/gi, "s")
    .replace(/ț|ţ/gi, "t");
}

function normName(value) {
  return stripDiacriticsLoose(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Detectează denumire de firmă / formă juridică în câmpul client. */
export function isCompanyClientName(name) {
  const raw = String(name || "").trim();
  if (!raw) return false;
  const n = raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

  // Forme juridice RO frecvente
  if (/\b(srl|sa|sra|scs|snc|sca|pfa|ii|if|ra)\b/.test(n)) return true;
  if (/\b(s\s*r\s*l|s\s*a)\b/.test(n)) return true;
  // Prefix SC / S.C.
  if (/^s\s*c\b/.test(n)) return true;
  if (/\b(societate|company|ltd|gmbh|llc)\b/.test(n)) return true;
  return false;
}

/**
 * @param {{ client?: string, proprietar?: string, delegat?: string }} claim
 * @returns {{
 *   subsemnatul: string,
 *   reprezentantSocietate: string,
 *   asCompanyOwner: boolean,
 *   hasSeparateDelegat: boolean,
 *   proprietar: string,
 * }}
 */
export function resolveCerereDespagubireParties(claim) {
  // UI: „Nume proprietar auto” → claim.client (alias proprietar acceptat)
  const proprietar = String(claim?.proprietar || claim?.client || "").trim();
  const delegat = String(claim?.delegat || "").trim();
  const asCompanyOwner = isCompanyClientName(proprietar);

  // Proprietar ≠ delegat (inclusiv când proprietarul lipsește dar există delegat)
  const hasSeparateDelegat = Boolean(
    delegat && (!proprietar || normName(delegat) !== normName(proprietar))
  );

  // Subsemnatul = întotdeauna delegatul când proprietarul e altcineva
  let subsemnatul = "";
  if (hasSeparateDelegat) {
    subsemnatul = delegat;
  } else if (!asCompanyOwner) {
    // Aceeași persoană (sau fără delegat): semnează proprietarul-persoană
    subsemnatul = proprietar || delegat;
  }
  // Firmă fără delegat distinct: Subsemnatul rămâne gol (de mână)

  // Proprietarul apare la „reprezentant al societății” pentru firmă
  // sau când un delegat semnează în numele lui.
  const reprezentantSocietate =
    proprietar && (asCompanyOwner || hasSeparateDelegat) ? proprietar : "";

  return {
    subsemnatul,
    reprezentantSocietate,
    asCompanyOwner,
    hasSeparateDelegat,
    proprietar,
  };
}

function normAsigurator(asigurator) {
  return String(asigurator || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}

export function isOmniasigAsigurator(asigurator) {
  return normAsigurator(asigurator).includes("omniasig");
}

export function isAsiromAsigurator(asigurator) {
  return normAsigurator(asigurator).includes("asirom");
}

export function isGroupamaAsigurator(asigurator) {
  return normAsigurator(asigurator).includes("groupama");
}

export function isGraweAsigurator(asigurator) {
  return normAsigurator(asigurator).includes("grawe");
}

/** Tip tipizat disponibil pentru asigurătorul dosarului. */
export function resolveCerereDespagubireKind(asigurator) {
  if (isOmniasigAsigurator(asigurator)) return "omniasig";
  if (isAsiromAsigurator(asigurator)) return "asirom";
  if (isGroupamaAsigurator(asigurator)) return "groupama";
  if (isGraweAsigurator(asigurator)) return "grawe";
  return null;
}
