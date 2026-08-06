/** Text sigur pentru jsPDF (fără diacritice problematice). */
export function stripPdfText(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâî]/g, (c) => ({ ă: "a", â: "a", î: "i" }[c] || c))
    .replace(/[ĂÂÎ]/g, (c) => ({ Ă: "A", Â: "A", Î: "I" }[c] || c))
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}
