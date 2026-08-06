import { getStatusDefinition } from "../constants/config";
import { fmtDate, todayISO } from "./dateUtils";

export function buildClaimsListRows(claims = []) {
  return claims.map((c) => {
    const status = getStatusDefinition(c.status);
    return {
      "Nr. dosar": c.numarDosar || "—",
      Tip: c.tipAsigurare || "—",
      Asigurător: c.asigurator || "—",
      Client: c.client || "—",
      "Nr. înmatriculare": c.numarInmatriculare || "—",
      "Marcă/Model": c.marcaModel || "—",
      Status: status ? `${String(status.num).padStart(2, "0")}. ${status.label}` : c.status || "—",
      Deschis: fmtDate(c.dataDeschiderii),
      Telefon: c.telefonClient || "—",
      Blocat: c.blocat ? "DA" : "NU",
    };
  });
}

export function claimsListFilename({ focusedStage = null } = {}) {
  const date = todayISO();
  if (!focusedStage) return `lista-dosare-toate-${date}.xlsx`;

  const status = getStatusDefinition(focusedStage);
  const slug = `${String(status.num).padStart(2, "0")}-${status.label}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `lista-dosare-${slug}-${date}.xlsx`;
}

/** Exportă lista vizibilă din Tabel (filtru stadiu + sortare coloane). */
export async function downloadClaimsList(claims, { focusedStage = null } = {}) {
  if (!claims?.length) return false;

  const XLSX = await import("xlsx");
  const rows = buildClaimsListRows(claims);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lista dosare");
  XLSX.writeFile(wb, claimsListFilename({ focusedStage }));
  return true;
}
