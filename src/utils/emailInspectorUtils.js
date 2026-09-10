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
 * Construiește subiectul email-ului de reconstatare:
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
 * Folosește newline-uri clare pe fiecare rând pentru lizibilitate maximă.
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
            `${idx + 1}. ${r.piesa} [${r.operatiune || "INL"}] - ${r.descriere || "Element avariat descoperit la demontare"}`
        )
        .join("\n")
    : "- Conform anexei PDF generate si fotografiilor din dosar.";

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

  return lines.join("\n");
}

/**
 * Convertește corpul email-ului în HTML structurat cu paragrafe și div-uri pe fiecare linie.
 * Asigură că în clienții Webmail (Gmail, Outlook Web, Yahoo) textul nu se comasează într-o singură linie.
 */
export function formatEmailBodyToHtml(subject = "", bodyText = "") {
  const escape = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const lines = String(bodyText || "").split(/\r?\n/);
  const htmlRows = lines.map((line) => {
    if (!line.trim()) {
      return "<br/>";
    }
    return `<div style="margin: 0; padding: 0;">${escape(line)}</div>`;
  });

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b;">
      ${htmlRows.join("\n")}
    </div>
  `.trim();
}

/**
 * Copiază textul formatat în clipboard oferind atât text/plain (cu newline-uri \n)
 * cât și text/html (pentru compunere în Gmail / Outlook Web).
 */
export async function copyFormattedEmailToClipboard({ subject = "", body = "" } = {}) {
  const plainText = body;
  const htmlText = formatEmailBodyToHtml(subject, body);

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      if (typeof window !== "undefined" && window.ClipboardItem) {
        const plainBlob = new Blob([plainText], { type: "text/plain" });
        const htmlBlob = new Blob([htmlText], { type: "text/html" });
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/plain": plainBlob,
            "text/html": htmlBlob,
          }),
        ]);
        return true;
      }
    } catch {
      /* fallback la writeText */
    }

    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch {
      /* fallback jos */
    }
  }

  // Fallback tradițional pentru browsere vechi
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = plainText;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }

  return false;
}

/**
 * Construiește mesajul pentru WhatsApp cu linie nouă între blocuri.
 */
export function buildReconstatareWaMessage({
  claim = {},
  inspectorDauna = "",
  nrDosarAsigurator = "",
  branding = {},
  repereCount = 0,
} = {}) {
  const auto = claim.numarInmatriculare || claim.marcaModel || "Auto";
  const dosar = claim.numarDosar || "Fara Numar";
  const asig = claim.asigurator ? ` (${claim.asigurator})` : "";
  const asigNr = nrDosarAsigurator ? ` / Dosar Asig: ${nrDosarAsigurator}` : "";

  return [
    "Buna ziua!",
    `Referitor la dosarul ${dosar} - ${auto}${asig}${asigNr}`,
    inspectorDauna ? `In atentia: Dl./Dna. ${inspectorDauna}` : "",
    "",
    `Va solicitam o reconstatare pentru daune ascunse identificate la dezechipare${repereCount > 0 ? ` (${repereCount} repere noi)` : ""}.`,
    `Autovehiculul este disponibil la ${branding?.atelierNume || "service"}.`,
    "",
    "Va rugam sa ne comunicati data si intervalul orar pentru efectuarea inspectiei.",
    "Va multumim!",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/**
 * Construiește link-ul de trimitere WhatsApp.
 * Dacă numărul de telefon lipsește, generează link universal care deschide selectorul de contacte din WhatsApp.
 */
export function buildReconstatareWaUrl({ phone = "", message = "" } = {}) {
  const cleanDigits = String(phone || "").replace(/\D/g, "");
  let phoneParam = "";
  if (cleanDigits) {
    let full = cleanDigits;
    if (full.startsWith("0")) full = `4${full}`;
    else if (!full.startsWith("40")) full = `40${full}`;
    phoneParam = `phone=${full}&`;
  }
  return `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`;
}

/**
 * Generează link-ul mailto: preformatat compatibil cu clienții de mail (Outlook, Thunderbird, Apple Mail etc.).
 */
export function buildReconstatareMailtoUrl({ to = "", subject = "", body = "" } = {}) {
  const cleanTo = String(to || "").trim();
  const params = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) {
    // În standardul mailto: (RFC 6068), newline-urile trebuie să fie \r\n
    const crlfBody = body.replace(/\r?\n/g, "\r\n");
    params.push(`body=${encodeURIComponent(crlfBody)}`);
  }
  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return `mailto:${cleanTo}${query}`;
}
