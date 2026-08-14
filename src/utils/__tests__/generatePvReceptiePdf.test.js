import { describe, it, expect, vi } from "vitest";
import { generatePvReceptiePdf } from "../generatePvReceptiePdf";

describe("generatePvReceptiePdf", () => {
  it("generează un document PDF de predare-primire cu structură validă", async () => {
    const claim = {
      id: "cl_100",
      numarInmatriculare: "B 123 ABC",
      vin: "WAUZZZ8V1KA123456",
      marcaModel: "Audi A4 2.0 TDI",
      client: "Popescu Ion",
      telefonClient: "0722123456",
      numarDosar: "DOS-2026-99",
      asigurator: "Omniasig",
      tipAsigurare: "CASCO",
      kilometraj: 154200,
    };

    const receptieData = {
      kilometraj: 154300,
      combustibil: "3/4 (75%)",
      obiecte: ["Certificat Înmatriculare (Talon original)", "Cheie contact"],
      elementeAvariate: ["Bară Față", "Capotă Motor", "Ușă Față Stg."],
      avariiPreexistente: "Bară Față, Capotă Motor",
      observatii: "Vopsire aripă dreapta",
      pozeCount: 4,
    };

    const result = await generatePvReceptiePdf({
      claim,
      receptieData,
      signatureDataUrl: null,
      atelierBranding: {
        nume: "SERVICE AUTO TEST",
        cui: "RO998877",
      },
    });

    expect(result).toBeDefined();
    expect(result.fileName).toContain("PV_Receptie_B_123_ABC");
    expect(result.pdfBytes).toBeInstanceOf(ArrayBuffer);
    expect(result.pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(result.blob).toBeInstanceOf(Blob);
  });
});
