import { describe, it, expect } from "vitest";
import { buildWorkflowExportSections, workflowExportFilename, buildStatisticiModuleRows } from "../exportWorkflowModules";

describe("exportWorkflowModules", () => {
  const claims = [
    { id: "1", numarDosar: "A1", tipAsigurare: "RCA", asigurator: "X", client: "C", status: "deschidere" },
    {
      id: "2",
      numarDosar: "A2",
      tipAsigurare: "RCA",
      asigurator: "X",
      client: "C2",
      status: "programat",
      numarInmatriculare: "B111AAA",
    },
    {
      id: "3",
      numarDosar: "A3",
      tipAsigurare: "CASCO",
      asigurator: "X",
      client: "C3",
      status: "programat",
      numarInmatriculare: "B111AAA",
    },
  ];

  it("builds sections for selected modules only", () => {
    const sections = buildWorkflowExportSections(claims, { dosare: true, financiar: false, programari: false, masiniSchimb: false, statistici: true });
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("Lista Dosare");
    expect(sections[1].title).toBe("Statistici Asigurători");
  });

  it("uses pdf or xlsx extension in filename", () => {
    expect(workflowExportFilename("xlsx")).toMatch(/\.xlsx$/);
    expect(workflowExportFilename("pdf")).toMatch(/\.pdf$/);
  });

  it("dedupes programat/in_lucru per plate in statistici export", () => {
    const rows = buildStatisticiModuleRows(claims);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Total Dosare"]).toBe(3);
    expect(rows[0]["Mașini programate (unice)"]).toBe(1);
  });
});
