import { describe, it, expect } from "vitest";
import { buildWorkflowExportSections, workflowExportFilename } from "../exportWorkflowModules";

describe("exportWorkflowModules", () => {
  const claims = [
    { id: "1", numarDosar: "A1", tipAsigurare: "RCA", asigurator: "X", client: "C", status: "deschidere" },
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
});
