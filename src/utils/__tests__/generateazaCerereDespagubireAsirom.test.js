import { describe, it, expect, vi } from "vitest";
import { generateazaCerereDespagubireAsirom } from "../pdfGenerator";
import { emptyClaim } from "../claimModel";

describe("generateazaCerereDespagubireAsirom", () => {
  it("generează cu succes PDF-ul de cerere despăgubire Asirom cu toate datele completate", async () => {
    const mockClaim = {
      ...emptyClaim("accept_plata"),
      id: "claim-asirom-1",
      numarInmatriculare: "B 175 VOI",
      marcaModel: "BMW 520 D",
      numarDosar: "33217900",
      nrDosarAsigurator: "33217900",
      asigurator: "Asirom VIG",
      tipAsigurare: "RCA",
      client: "VOINESCU SI ASOCIATII SOC. PROF. DE AV.",
      proprietar: "VOINESCU SI ASOCIATII SOC. PROF. DE AV.",
      delegat: "VOINESCU SONIA STEFANIA",
      cnp: "2900517055069",
      adresaClient: "BD DECEBAL, NR 5, ORADEA",
      telefonClient: "0756966190",
      sumaDecont: 14500,
      valoareDevizAudatex: 14500,
    };

    const mockBranding = {
      nume: "SC AUTO WASH IMPEX SRL",
      iban: "RO56MIRO0000118403040301",
      banca: "PROCREDIT BANK",
    };

    const res = await generateazaCerereDespagubireAsirom(mockClaim, mockBranding);

    expect(res).toBeDefined();
    expect(res.fileName).toContain("ASIROM");
    expect(res.pdfBytes).toBeInstanceOf(ArrayBuffer);
    expect(res.pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(res.blob).toBeInstanceOf(Blob);
  });
});
