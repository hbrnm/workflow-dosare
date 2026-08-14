/**
 * Self-serve atelier bootstrap helpers.
 */

export function slugifyAtelierName(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "atelier";
}

export function shortFromName(input) {
  const cleaned = String(input || "").replace(/[^A-Za-z0-9]/g, "");
  return (cleaned.slice(0, 2) || "AT").toUpperCase();
}

/**
 * Validate signup form fields.
 * @returns {string|null} error message or null
 */
export function validateAtelierSignup({
  email,
  password,
  passwordConfirm,
  atelierNume,
  acceptDataResponsibility = true,
}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  const name = String(atelierNume || "").trim();
  if (name.length < 2) return "Introdu numele atelierului (min. 2 caractere).";
  if (!cleanEmail.includes("@")) return "Introdu un email valid.";
  if (cleanPassword.length < 6) return "Parola trebuie să aibă cel puțin 6 caractere.";
  if (passwordConfirm != null && cleanPassword !== String(passwordConfirm)) {
    return "Parolele nu coincid.";
  }
  if (!acceptDataResponsibility) {
    return "Confirmă că atelierul este responsabil pentru datele clienților procesate în aplicație.";
  }
  return null;
}
