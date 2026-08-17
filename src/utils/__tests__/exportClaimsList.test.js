import { describe, it, expect } from "vitest";
import { buildClaimsListRows, claimsListFilename } from "../exportClaimsList";

describe("exportClaimsList", () => {
  it("maps table columns for export rows", () => {
    const rows = buildClaimsListRows([
      {
        numarDosar: "10326304",
        tipAsigurare: "CASCO",
        asigurator: "Omniasig VIG",
        client: "ELENA CONSTANTIN",
        numarInmatriculare: "B404NMD",
        marcaModel: "OPEL ASTRA",
        status: "deschidere",
        dataDeschiderii: "2026-08-06",
        telefonClient: "0712345678",
        blocat: false,
      },
    ]);

    expect(rows[0]["Nr. dosar"]).toBe("10326304");
    expect(rows[0].Status).toBe("01. Acord reparație");
    expect(rows[0].Telefon).toBe("0712345678");
  });

  it("builds filename with stage slug when filtered", () => {
    expect(claimsListFilename({ focusedStage: "deschidere" })).toMatch(/^lista-dosare-01-acord-reparatie-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(claimsListFilename({ focusedStage: null })).toMatch(/^lista-dosare-toate-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(claimsListFilename({ focusedStage: "deschidere", format: "pdf" })).toMatch(/\.pdf$/);
  });
});
