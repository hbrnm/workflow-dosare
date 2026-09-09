/**
 * Utilitare pentru trimiterea rapidă a Cererilor de Reconstatare către Inspectori & Asigurători
 */

export const INSURER_DEFAULT_EMAILS = {
  "Omniasig VIG": "daune@omniasig.ro",
  "Asirom VIG": "daune@asirom.ro",
  "Allianz-Țiriac": "daune@allianztiriac.ro",
  "Groupama Asigurări": "daune@groupama.ro",
  "Euroins România": "daune@euroins.ro",
  "Grawe România": "daune@grawe.ro",
  "Generali România": "daune.ro@generali.com",
  "Uniqa Asigurări": "daune@uniqa.ro",
  "Axeria IARD": "daune@axeria-iard.ro",
  "Hellas Direct": "claims@hellasdirect.ro",
};

/**
 * Returnează emailul implicit de daune/reconstatări pentru asigurătorul specificat.
 */
export function getInsurerDefaultEmail(asigurator) {
  if (!asigurator || typeof asigurator !== "string") return "";
  const norm = asigurator.trim().toLowerCase();
  for (const [key, email] of Object.entries(INSURER_DEFAULT_EMAILS)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return email;
    }
  }
  return "";
}

/**
 * Construiește subiectul email-ului de reconstatare conform cerințelor:
 * „Cerere Reconstatare Daune Ascunse - Dosar ... - Auto ...”
 */
export function buildReconstatareEmailSubject({ claim, nrDosarAsigurator } = {}) {
  const nrDosar = claim?.numarDosar || "Fara Numar";
  const auto = claim?.numarInmatriculare || claim?.marcaModel || "Auto";
  const asigPart = nrDosarAsigurator ? ` (Dosar Asig: ${nrDosarAsigurator})` : "";
  return `Cerere Reconstatare Daune Ascunse - Dosar ${nrDosar}${asigPart} - Auto ${auto}`;
}

/**
 * Construiește corpul mesajului pentru inspector / departamentul de daune.
 */
export function buildReconstatareEmailBody({
  claim = {},
  inspectorDauna = "",
  nrDosarAsigurator = "",
  dataCerere = "",
  modDesfasurare = "Fizic la atelier",
  intervalOrar = "09:00 - 17:00",
  motivatie = "",
  repere = [],
  branding = {},
} = {}) {
  const repereValide = Array.isArray(repere)
    ? repere.filter((r) => r && String(r.piesa || "").trim().length > 0)
    : [];

  const repereList = repereValide.length > 0
    ? repereValide
        .map(
          (r, idx) =>
            `  ${idx + 1}. ${r.piesa} [${r.operatiune || "INL"}] - ${r.descriere || "Element avariat descoperit la demontare"}`
        )
        .join("\r\n")
    : "  - Conform anexei PDF generate si fotografiilor din dosar.";

  const lines = [
    "Buna ziua,",
    "",
    `In atentia: ${inspectorDauna || "Inspector Daune"}`,
    `Asigurator: ${claim?.asigurator || "Nespecificat"}`,
    `Numar Dosar Service: ${claim?.numarDosar || "-"}`,
    `Numar Dosar Asigurator: ${nrDosarAsigurator || claim?.nrDosarAsigurator || "-"}`,
    `Autovehicul: ${claim?.marcaModel || ""} (${claim?.numarInmatriculare || ""})`.trim(),
    `Serie Sasiu (VIN): ${claim?.vin || "-"}`,
    `Proprietar / Asigurat: ${claim?.client || "-"}`,
    "",
    "Va transmitem solicitarea de reconstatare pentru autovehiculul mentionat mai sus, ca urmare a identificarii unor daune ascunse si deformari structurale in urma dezechiparii reperelor exterioare in atelier.",
    "",
    "Motivatie tehnica:",
    motivatie || "Constatare elemente avariate ascunse la dezechipare si demontare.",
    "",
    `Repere suplimentare de reconstatat (${repereValide.length}):`,
    repereList,
    "",
    "Detalii desfasurare la atelier:",
    `- Mod desfasurare solicitat: ${modDesfasurare}`,
    `- Interval orar propus: ${intervalOrar}${dataCerere ? ` (Data cererii: ${dataCerere})` : ""}`,
    `- Locatie autovehicul: ${branding?.atelierNume || "Atelier Service"}${branding?.adresa ? `, ${branding.adresa}` : ""}`,
    `- Telefon receptie: ${branding?.telefon || "-"}`,
    "",
    "Atasat regasiti cererea oficiala de reconstatare generata (PDF) impreuna cu plansele foto ale daunelor ascunse.",
    "Va rugam sa ne confirmati data si modalitatea stabilita pentru efectuarea inspectiei.",
    "",
    "Cu stima,",
    branding?.atelierNume || "Echipa Service Auto",
    branding?.telefon ? `Tel: ${branding.telefon}` : "",
    branding?.email ? `Email: ${branding.email}` : "",
  ].filter((l) => l !== undefined);

  return lines.join("\r\n");
}

/**
 * Generează link-ul mailto: preformatat compatibil cu toți clienții de mail (Outlook, Thunderbird, Apple Mail etc.).
 */
export function buildReconstatareMailtoUrl({ to = "", subject = "", body = "" } = {}) {
  const cleanTo = String(to || "").trim();
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return `mailto:${cleanTo}${query}`;
}
