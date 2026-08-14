import { getStatusDefinition } from "../constants/config";
import { fmtDate, todayISO } from "./dateUtils";
import { downloadTablePdf } from "./exportListPdf";

export const EXPORT_FORMAT = {
  XLSX: "xlsx",
  PDF: "pdf",
};

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

export function claimsListFilename({ focusedStage = null, format = EXPORT_FORMAT.XLSX } = {}) {
  const date = todayISO();
  const ext = format === EXPORT_FORMAT.PDF ? "pdf" : "xlsx";
  if (!focusedStage) return `lista-dosare-toate-${date}.${ext}`;

  const status = getStatusDefinition(focusedStage);
  const slug = `${String(status.num).padStart(2, "0")}-${status.label}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `lista-dosare-${slug}-${date}.${ext}`;
}

function claimsListSubtitle(focusedStage) {
  if (!focusedStage) return "Toate etapele";
  const status = getStatusDefinition(focusedStage);
  return status ? `Etapa ${String(status.num).padStart(2, "0")}. ${status.label}` : "";
}

/** Exportă lista vizibilă (Tabel / Flux) în Excel sau PDF. */
export async function downloadClaimsList(claims, { focusedStage = null, format = EXPORT_FORMAT.XLSX } = {}) {
  if (!claims?.length) return false;

  const rows = buildClaimsListRows(claims);
  const filename = claimsListFilename({ focusedStage, format });

  if (format === EXPORT_FORMAT.PDF) {
    return downloadTablePdf({
      title: "Lista dosare",
      subtitle: claimsListSubtitle(focusedStage),
      rows,
      filename,
    });
  }

  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lista dosare");
  XLSX.writeFile(wb, filename);
  return true;
}

/** Export rapid — toate dosarele (paleta comenzi). */
export async function downloadAllClaimsQuick(claims, format = EXPORT_FORMAT.XLSX) {
  return downloadClaimsList(claims, { focusedStage: null, format });
}

export function quickExportFilename(format = EXPORT_FORMAT.XLSX) {
  const ext = format === EXPORT_FORMAT.PDF ? "pdf" : "xlsx";
  return `dosare-dauna-${todayISO()}.${ext}`;
}
