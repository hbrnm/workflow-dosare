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

/**
 * Extensii și tipuri MIME permise pentru upload în sistemul de daune auto.
 */
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
export const ALLOWED_DOC_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];

export const DANGEROUS_EXTENSIONS = [
  "html", "htm", "svg", "js", "mjs", "jsx", "ts", "tsx", "exe", "bat", "cmd",
  "sh", "vbs", "ps1", "php", "py", "rb", "dll", "jar", "scr", "msi"
];

/**
 * Curăță numele de fișier pentru a preveni Directory Traversal (../) și caractere speciale.
 */
export function sanitizeFileName(name = "") {
  if (!name || typeof name !== "string") return `file_${Date.now()}`;
  const base = name.split(/[/\\]/).pop() || "";
  const cleaned = base
    .replace(/[^\w.-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim();
  return cleaned || `file_${Date.now()}`;
}

/**
 * Validează un fișier înainte de upload (tip, extensie, mărime, securitate).
 * @param {File|Object} file
 * @param {Object} options
 * @returns {{ valid: boolean, error?: string, sanitizedName: string }}
 */
export function validateFileUpload(file, {
  isImageOnly = false,
  maxSizeBytes = 15 * 1024 * 1024, // 15MB default
} = {}) {
  if (!file) {
    return { valid: false, error: "Niciun fișier furnizat.", sanitizedName: "" };
  }

  const name = String(file.name || "");
  const sanitizedName = sanitizeFileName(name);
  const ext = (name.split(".").pop() || "").toLowerCase().trim();

  // Verifică extensii periculoase (anti-exploit / anti-stored XSS)
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Formatul fișierului (.${ext}) nu este permis din motive de securitate.`,
      sanitizedName,
    };
  }

  // Verificare extensii permise
  const allowed = isImageOnly ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_DOC_EXTENSIONS;
  if (!allowed.includes(ext)) {
    return {
      valid: false,
      error: `Extensie nepermisă (.${ext}). Sunt acceptate doar: ${allowed.join(", ")}.`,
      sanitizedName,
    };
  }

  // Verificare dimensiune
  if (file.size && file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Fișierul depășește limita de ${maxMb}MB.`,
      sanitizedName,
    };
  }

  return { valid: true, sanitizedName };
}

/**
 * Mascare date cu caracter personal (GDPR compliance) pentru rapoarte și afișări publice.
 */
export function maskPii(value, type = "phone") {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (type === "phone") {
    if (trimmed.length <= 4) return "****";
    return trimmed.slice(0, 4) + "****" + trimmed.slice(-2);
  }
  if (type === "email") {
    const parts = trimmed.split("@");
    if (parts.length !== 2) return "***@***";
    const name = parts[0];
    const maskedName = name.length <= 2 ? name[0] + "*" : name[0] + "***" + name.slice(-1);
    return `${maskedName}@${parts[1]}`;
  }
  if (type === "vin") {
    if (trimmed.length <= 6) return "******";
    return trimmed.slice(0, 3) + "********" + trimmed.slice(-4);
  }
  if (type === "name") {
    const names = trimmed.split(" ");
    return names.map((n) => (n.length > 2 ? n[0] + "***" : n)).join(" ");
  }
  return trimmed;
}
