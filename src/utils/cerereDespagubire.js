/**
 * Logică tipizate „Cerere despăgubire” (Omniasig).
 *
 * - Subsemnatul = delegatul când e diferit de proprietar (client); altfel = client (persoană)
 * - „reprezentant al societății” = clientul când acesta e firmă; altfel gol (de mână)
 * - Sume / date / bife rămân goale (de mână)
 */

function normName(value) {
  return String(value || "")
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
 * @param {{ client?: string, delegat?: string }} claim
 * @returns {{
 *   subsemnatul: string,
 *   reprezentantSocietate: string,
 *   asCompanyOwner: boolean,
 *   hasSeparateDelegat: boolean,
 *   proprietar: string,
 * }}
 */
export function resolveCerereDespagubireParties(claim) {
  const proprietar = String(claim?.client || "").trim();
  const delegat = String(claim?.delegat || "").trim();
  const asCompanyOwner = isCompanyClientName(proprietar);
  const hasSeparateDelegat = Boolean(delegat && normName(delegat) !== normName(proprietar));

  let subsemnatul = "";
  if (hasSeparateDelegat) {
    subsemnatul = delegat;
  } else if (!asCompanyOwner) {
    subsemnatul = proprietar;
  }
  // Firmă fără delegat: Subsemnatul rămâne gol (de mână)

  return {
    subsemnatul,
    // Firmă-proprietar → completat la „reprezentant al societății”
    reprezentantSocietate: asCompanyOwner ? proprietar : "",
    asCompanyOwner,
    hasSeparateDelegat,
    proprietar,
  };
}

export function isOmniasigAsigurator(asigurator) {
  const a = String(asigurator || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
  return a.includes("omniasig");
}
