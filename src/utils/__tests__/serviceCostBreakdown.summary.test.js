import { describe, it, expect } from "vitest";
import { computeClaimFinancialSummary } from "../serviceCostBreakdown";

describe("computeClaimFinancialSummary", () => {
  it("computes complete financial summary with Audatex deviz and real labor rates", () => {
    const claim = {
      valoareAchizitiePiese: 2500,
      financiar: {
        audatex: {
          totalFaraTva: 6000,
          piese: 3500,
          manoperaTinichigerie: 1200,
          manoperaVopsitorie: 800,
          materialeVopsitorie: 500,
        },
        oreLucrateTinichigerie: 10,
        oreLucrateVopsitorie: 8,
        costMaterialeVopsitorieService: 450,
        costConsumabileTinichigerieService: 120,
        costMasinaSchimb: 200,
        costuriExterne: 100,
      },
    };

    const tarife = {
      tinichigerie: { tarifOrar: 70 },
      vopsitorie: { tarifOrar: 80 },
    };

    const summary = computeClaimFinancialSummary(claim, tarife);

    expect(summary.venitNetTotal).toBe(6000);
    expect(summary.valoareDevizAudatex).toBe(6000);
    expect(summary.pretPieseService).toBe(2500);
    expect(summary.costManoperaTinichigerieService).toBe(700); // 10 * 70
    expect(summary.costManoperaVopsitorieService).toBe(640); // 8 * 80
    expect(summary.totalCosturiService).toBe(4710); // 2500 + 700 + 640 + 450 + 120 + 200 + 100
    expect(summary.profitBrutReal).toBe(1290); // 6000 - 4710
    expect(summary.marjaProfitProc).toBeCloseTo(21.5, 1);
    expect(summary.breakdown.rows.length).toBe(7);
  });

  it("prioritizes valoareAcceptPlata when present", () => {
    const claim = {
      financiar: {
        audatex: { totalFaraTva: 5000 },
        valoareAcceptPlata: 4800,
      },
      valoareAchizitiePiese: 2000,
    };

    const summary = computeClaimFinancialSummary(claim);
    expect(summary.venitNetTotal).toBe(4800);
    expect(summary.totalCosturiService).toBe(2000);
    expect(summary.profitBrutReal).toBe(2800);
    expect(summary.marjaProfitProc).toBeCloseTo(58.3, 1);
  });

  it("handles empty claim gracefully", () => {
    const summary = computeClaimFinancialSummary({});
    expect(summary.venitNetTotal).toBe(0);
    expect(summary.totalCosturiService).toBe(0);
    expect(summary.profitBrutReal).toBe(0);
    expect(summary.marjaProfitProc).toBe(0);
    expect(summary.breakdown.rows).toEqual([]);
  });
});
