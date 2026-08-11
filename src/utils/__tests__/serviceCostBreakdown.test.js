import { describe, it, expect } from "vitest";
import { buildServiceCostBreakdown } from "../serviceCostBreakdown";

describe("buildServiceCostBreakdown", () => {
  it("computes percentages sorted by amount", () => {
    const { total, rows } = buildServiceCostBreakdown({
      piese: 3200,
      manoperaTinichigerie: 324,
      manoperaVopsitorie: 438,
      materialeVopsitorie: 500,
      consumabileTinichigerie: 150,
      diverse: 0,
      masinaSchimb: 0,
    });
    expect(total).toBeCloseTo(4612, 2);
    expect(rows[0].key).toBe("piese");
    expect(rows[0].pct).toBeCloseTo(69.4, 1);
    expect(rows.find((r) => r.key === "diverse")).toBeUndefined();
  });

  it("returns empty rows when total is zero", () => {
    const { total, rows } = buildServiceCostBreakdown({});
    expect(total).toBe(0);
    expect(rows).toEqual([]);
  });
});
