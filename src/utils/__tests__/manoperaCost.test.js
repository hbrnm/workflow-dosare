import { describe, it, expect } from "vitest";
import {
  hourlyRateFromSalary,
  laborCostFromHours,
  resolveRoleHourlyRate,
  computeServiceLaborCosts,
  applyLaborCostsToClaim,
} from "../manoperaCost";

describe("manoperaCost", () => {
  it("hourlyRateFromSalary applies overhead", () => {
    expect(hourlyRateFromSalary(8000, 160, 20)).toBeCloseTo(60, 2);
    expect(hourlyRateFromSalary(8000, 160, 0)).toBeCloseTo(50, 2);
  });

  it("resolveRoleHourlyRate prefers manual tarif", () => {
    expect(
      resolveRoleHourlyRate({ salariuLunar: 8000, oreProductiveLuna: 160, overheadProc: 20, tarifOrar: 55 })
    ).toBe(55);
  });

  it("computeServiceLaborCosts from ore", () => {
    const result = computeServiceLaborCosts(4, 7, {
      tinichigerie: { salariuLunar: 8000, oreProductiveLuna: 160, overheadProc: 20 },
      vopsitorie: { salariuLunar: 6000, oreProductiveLuna: 160, overheadProc: 0 },
    });
    expect(result.rateTinichigerie).toBeCloseTo(60, 2);
    expect(result.tinichigerie).toBeCloseTo(240, 2);
    expect(result.vopsitorie).toBeCloseTo(262.5, 2);
    expect(result.total).toBeCloseTo(502.5, 2);
  });

  it("applyLaborCostsToClaim updates financiar", () => {
    const next = applyLaborCostsToClaim(
      { financiar: { oreLucrateTinichigerie: 2, oreLucrateVopsitorie: 3 } },
      { tinichigerie: { tarifOrar: 50 }, vopsitorie: { tarifOrar: 40 } }
    );
    expect(next.financiar.costManoperaTinichigerieService).toBe(100);
    expect(next.financiar.costManoperaVopsitorieService).toBe(120);
  });

  it("laborCostFromHours rounds to 2 decimals", () => {
    expect(laborCostFromHours(1.5, 33.33)).toBe(50);
    expect(laborCostFromHours(2, 33.335)).toBe(66.67);
  });
});
