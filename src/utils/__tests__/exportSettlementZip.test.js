import { describe, it, expect } from "vitest";
import {
  generateCentralizatorDecontPdf,
  buildInsurerEmailTemplate,
} from "../exportSettlementZip";

describe("exportSettlementZip", () => {
  const mockClaim = {
    id: "cl_settle_1",
    numarInmatriculare: "CJ 99 WWW",
    vin: "WVWZZZ3CZAE112233",
    marcaModel: "VW Passat 2.0",
    client: "Auto Logistics SRL",
    asigurator: "Groupama",
    nrDosarAsigurator: "GRP-889911",
    sumaDecont: 8500,
    valoarePieseAudatex: 4500,
    manopera: {
      tinichigerie: { facturat: 1200 },
      vopsitorie: { facturat: 1500 },
    },
  };

  it("generează șablonul de e-mail către asigurător cu date complete", () => {
    const text = buildInsurerEmailTemplate(mockClaim, {
      nume: "TEST SERVICE REPAIR SRL",
      iban: "RO44TEST0000111122223333",
    });

    expect(text).toContain("CJ 99 WWW");
    expect(text).toContain("Groupama");
    expect(text).toContain("GRP-889911");
    expect(text).toContain("8.500 LEI");
    expect(text).toContain("RO44TEST0000111122223333");
  });

  it("generează PDF-ul centralizator de decont", () => {
    const pdfBytes = generateCentralizatorDecontPdf(mockClaim, {
      nume: "TEST SERVICE REPAIR SRL",
      cui: "RO11223344",
      iban: "RO44TEST0000111122223333",
    });

    expect(pdfBytes).toBeInstanceOf(ArrayBuffer);
    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  });
});
