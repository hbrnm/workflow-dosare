import { describe, it, expect } from "vitest";
import { generateQuickEstimate, buildNotaConstatareText } from "../quickEstimateGenerator";

describe("quickEstimateGenerator - Deviz Estimativ & Notă de Constatare", () => {
  it("generează deviz estimativ din operațiuni caroserie", () => {
    const claim = {
      numarDosar: "DOS-101",
      marcaModel: "VW Golf 7",
      operatiuni: [
        { piesa: "Bară Față", inl: true, rev: true, rep: false, uni: false },
        { piesa: "Aripă Față Stânga", inl: false, rev: true, rep: true, uni: false },
      ],
      financiar: { tvaProc: 21 },
    };

    const tarife = {
      tinichigerie: { tarifOrar: 150 },
      vopsitorie: { tarifOrar: 160 },
    };

    const estimate = generateQuickEstimate(claim, tarife);
    expect(estimate.elementeCount).toBe(2);
    expect(estimate.totalOre).toBeGreaterThan(0);
    expect(estimate.totalManopera).toBeGreaterThan(0);
    expect(estimate.costMaterialeVopsea).toBe(440); // 2 elements * 220
    expect(estimate.costTotalFaraTva).toBeGreaterThan(estimate.totalManopera);
    expect(estimate.costTotalCuTva).toBe(Math.round(estimate.costTotalFaraTva * 1.21));
  });

  it("generează textul complet pentru nota de constatare", () => {
    const claim = {
      numarDosar: "DOS-202",
      numarInmatriculare: "B 123 ABC",
      client: "Ion Popescu",
      operatiuni: [
        { piesa: "Capotă", inl: false, rev: true, rep: true, uni: false }
      ]
    };

    const estimate = generateQuickEstimate(claim);
    const text = buildNotaConstatareText(claim, estimate);
    expect(text).toContain("NOTĂ DE CONSTATARE & ESTIMARE RAPIDĂ");
    expect(text).toContain("DOS-202");
    expect(text).toContain("B 123 ABC");
    expect(text).toContain("Capotă");
  });
});
