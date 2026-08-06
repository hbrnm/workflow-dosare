import { getStatusDefinition } from "../constants/config";
import { fmtDate, todayISO, daysBetween } from "./dateUtils";
import { downloadMultiSectionPdf } from "./exportListPdf";

export function buildDosareModuleRows(claims = []) {
  return claims.map((c) => ({
    "Nr. dosar": c.numarDosar || "—",
    "Tip Asigurare": c.tipAsigurare || "—",
    Asigurător: c.asigurator || "—",
    Client: c.client || "—",
    "Telefon Client": c.telefonClient || "—",
    "Nr. Înmatriculare": c.numarInmatriculare || "—",
    VIN: c.vin || "—",
    "Marcă / Model": c.marcaModel || "—",
    "Status Curent": getStatusDefinition(c.status)?.label || c.status,
    Blocat: c.blocat ? "DA" : "NU",
    "Motiv Blocat": c.motivBlocat || "—",
    "Data Deschiderii": fmtDate(c.dataDeschiderii),
    "Data Schimbare Status": fmtDate(c.dataSchimbareStatus),
    "Creat de": c.createdByEmail || "—",
  }));
}

export function buildFinanciarModuleRows(claims = []) {
  return claims.map((c) => {
    const fin = c.manopera || {};
    const tin = fin.tinichigerie || {};
    const vop = fin.vopsitorie || {};
    const facturatTotal = (Number(tin.facturat) || 0) + (Number(vop.facturat) || 0);

    return {
      "Nr. dosar": c.numarDosar || "—",
      Client: c.client || "—",
      Asigurător: c.asigurator || "—",
      "Valoare Deviz Estimat (RON)": c.valoareDeviz || 0,
      "Valoare Decontată (RON)": c.valoareDecontata || 0,
      "Diferență Regie / Client (RON)": c.diferentaRegie || 0,
      "Facturat Tinichigerie (RON)": tin.facturat || 0,
      "Ore Tinichigerie": tin.ore || 0,
      "Facturat Vopsitorie (RON)": vop.facturat || 0,
      "Ore Vopsitorie": vop.ore || 0,
      "Total Manoperă Facturată (RON)": facturatTotal,
      "Comandă Piese": c.pieseComandate ? "Comandate" : "Necomandate",
      "Piese Sosite": c.pieseSosite ? "Sosite" : "Incomplete / Neprimite",
      "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
    };
  });
}

export function buildProgramariModuleRows(claims = []) {
  const rows = claims
    .filter((c) => c.dataProgramare)
    .map((c) => ({
      "Nr. dosar": c.numarDosar || "—",
      Client: c.client || "—",
      "Nr. Inmatriculare": c.numarInmatriculare || "—",
      "Marcă / Model": c.marcaModel || "—",
      "Data Programare": fmtDate(c.dataProgramare),
      "Tinichigiu / Mecanic Alocat": c.mecanicAlocat || "Nealocat",
      "Vopsitor Alocat": c.vopsitorAlocat || "Nealocat",
      "Estimare Finalizare Work": fmtDate(c.dataEstimataFinalizare),
      "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
    }));
  return rows.length ? rows : [{ Notă: "Nicio programare existentă" }];
}

export function buildMasiniSchimbModuleRows(claims = []) {
  const rows = claims
    .filter((c) => c.masinaSchimb && c.masinaSchimb.trim())
    .map((c) => {
      const zileEfective = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
      const depasit = c.zileChirieAudatex > 0 && zileEfective > c.zileChirieAudatex;
      return {
        "Nr. dosar": c.numarDosar || "—",
        Client: c.client || "—",
        "Telefon Client": c.telefonClient || "—",
        "Mașină la Schimb Alocată": c.masinaSchimb,
        "Dată Predare Auto": fmtDate(c.dataDariiLaSchimb),
        "Zile Aprobate Audatex": c.zileChirieAudatex || 0,
        "Zile Efective Utilizate": zileEfective,
        "Status Depășire": depasit ? `Depășit cu ${zileEfective - c.zileChirieAudatex} zile` : "În grafic / OK",
        "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
      };
    });
  return rows.length ? rows : [{ Notă: "Nicio mașină la schimb alocată" }];
}

export function buildStatisticiModuleRows(claims = []) {
  const map = {};
  claims.forEach((c) => {
    const key = c.asigurator?.trim() || "Neprecizat";
    if (!map[key]) {
      map[key] = { total: 0, rca: 0, casco: 0, blocate: 0, facturate: 0, valoareDevizTotal: 0 };
    }
    map[key].total += 1;
    if (c.tipAsigurare === "RCA") map[key].rca += 1;
    if (c.tipAsigurare === "CASCO") map[key].casco += 1;
    if (c.blocat) map[key].blocate += 1;
    if (c.status === "facturat") map[key].facturate += 1;
    map[key].valoareDevizTotal += Number(c.valoareDeviz) || 0;
  });

  return Object.entries(map).map(([asigurator, stat]) => ({
    Asigurător: asigurator,
    "Total Dosare": stat.total,
    "Dosare RCA": stat.rca,
    "Dosare CASCO": stat.casco,
    "Dosare Blocate": stat.blocate,
    "Dosare Finalizate / Facturate": stat.facturate,
    "Valoare Devize Însumată (RON)": stat.valoareDevizTotal,
  }));
}

const MODULE_BUILDERS = {
  dosare: { title: "Lista Dosare", build: buildDosareModuleRows },
  financiar: { title: "Raport Financiar", build: buildFinanciarModuleRows },
  programari: { title: "Programări Atelier", build: buildProgramariModuleRows },
  masiniSchimb: { title: "Auto la Schimb", build: buildMasiniSchimbModuleRows },
  statistici: { title: "Statistici Asigurători", build: buildStatisticiModuleRows },
};

export function buildWorkflowExportSections(claims, selectedModules) {
  return Object.entries(MODULE_BUILDERS)
    .filter(([key]) => selectedModules[key])
    .map(([, { title, build }]) => ({ title, rows: build(claims) }));
}

export function workflowExportFilename(format = "xlsx") {
  const ext = format === "pdf" ? "pdf" : "xlsx";
  return `export-workflow-dosare-${todayISO()}.${ext}`;
}

export async function downloadWorkflowModules(claims, selectedModules, format = "xlsx") {
  const sections = buildWorkflowExportSections(claims, selectedModules);
  if (!sections.length) return false;

  if (format === "pdf") {
    return downloadMultiSectionPdf({
      sections,
      filename: workflowExportFilename("pdf"),
      documentTitle: "Export Workflow Dosare",
    });
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  sections.forEach(({ title, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const sheetName = title.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  XLSX.writeFile(wb, workflowExportFilename("xlsx"));
  return true;
}
