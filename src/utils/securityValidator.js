/**
 * Modul de Validare Securizată & Sanitizare Input-uri (Anti-XSS, Anti-Injection, Input Boundary Checks).
 */

/**
 * Elimină tag-urile HTML periculoase și caracterele de control pentru a preveni Stored XSS.
 */
export function sanitizeText(input, maxLength = 500) {
  if (input === null || input === undefined) return "";
  const str = String(input);
  // Elimină tag-uri HTML și caractere de control invizibile
  const cleaned = str
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return cleaned.slice(0, maxLength).trim();
}

/**
 * Validează și permite doar URL-uri sigure (http, https, blob, data imagini/pdf sigure).
 * Blochează atacurile de tip javascript:, vbscript:, data:text/html etc.
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // Permite protocoale sigure
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/jpeg") ||
    trimmed.startsWith("data:image/png") ||
    trimmed.startsWith("data:image/webp") ||
    trimmed.startsWith("data:application/pdf")
  ) {
    return trimmed;
  }

  // Respinge orice schemă potențial periculoasă
  return "";
}

/**
 * Validează numărul de înmatriculare (whitelist caractere alfanumerice și spații/cratimă).
 */
export function sanitizeLicensePlate(plate) {
  if (!plate || typeof plate !== "string") return "";
  return plate
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15)
    .trim();
}

/**
 * Validează seria de șasiu (VIN) - standard 17 caractere alfanumerice (fără I, O, Q).
 */
export function sanitizeVin(vin) {
  if (!vin || typeof vin !== "string") return "";
  return vin
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim()
    .slice(0, 17)
    .trim();
}

/**
 * Validează numărul de telefon (elimină orice caractere non-numerice în afară de +).
 */
export function sanitizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return "";
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  return cleaned.slice(0, 20).trim();
}
