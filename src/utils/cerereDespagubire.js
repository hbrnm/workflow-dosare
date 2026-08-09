/**
 * Logică tipizate „Cerere despăgubire” (Omniasig).
 *
 * Subsemnatul = delegatul (reprezentant) doar când e diferit de proprietar (client).
 * Altfel Subsemnatul = clientul. Sume / date / bife rămân goale (de mână).
 */

function normName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {{ client?: string, delegat?: string }} claim
 * @returns {{
 *   subsemnatul: string,
 *   reprezentant: string,
 *   asCompanyRep: boolean,
 *   proprietar: string,
 * }}
 */
export function resolveCerereDespagubireParties(claim) {
  const proprietar = String(claim?.client || "").trim();
  const delegat = String(claim?.delegat || "").trim();
  const hasSeparateDelegat = Boolean(delegat && normName(delegat) !== normName(proprietar));

  if (hasSeparateDelegat) {
    return {
      // Subsemnatul = delegatul (reprezentantul); spațiul „al societății” rămâne de mână
      subsemnatul: delegat,
      reprezentant: delegat,
      asCompanyRep: true,
      proprietar,
    };
  }

  return {
    subsemnatul: proprietar,
    reprezentant: "",
    asCompanyRep: false,
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
