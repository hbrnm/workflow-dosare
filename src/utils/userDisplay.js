/** Prima literă a e-mailului logat — avatar pill mobil. */
export function emailInitial(email) {
  const s = String(email || "").trim();
  return s ? s[0].toUpperCase() : "?";
}
