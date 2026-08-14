import { describe, it, expect } from "vitest";
import {
  filterClaimsByUser,
  filterClaimsList,
  sortClaimsList,
  extractInsurersList,
  computeActiveFilterCount,
} from "../useClaimFilters";

describe("pure claim filter utilities", () => {
  const sampleClaims = [
    { id: "1", numarDosar: "DOS-001", client: "Popescu Ion", status: "constatare", tipAsigurare: "CASCO", asigurator: "Allianz", blocat: false, createdBy: "user1", dataUltimeiActualizari: "2026-08-01" },
    { id: "2", numarDosar: "DOS-002", client: "Ionescu Dan", status: "lucru", tipAsigurare: "RCA", asigurator: "Omniasig", blocat: true, createdByEmail: "coleg@service.ro", dataUltimeiActualizari: "2026-08-05" },
    { id: "3", numarDosar: "DOS-003", client: "Vasilescu Ana", status: "gata", tipAsigurare: "CASCO", asigurator: "Generali", blocat: false, dataUltimeiActualizari: "2026-08-03" },
  ];

  describe("filterClaimsByUser", () => {
    it("returns all claims for admin", () => {
      const result = filterClaimsByUser(sampleClaims, { isAdmin: true });
      expect(result.length).toBe(3);
    });

    it("filters claims by user ID or email", () => {
      const result = filterClaimsByUser(sampleClaims, { myEmail: "coleg@service.ro" });
      // should return claim 2 + legacy claim 3 (which has no owner)
      expect(result.map((c) => c.id)).toContain("2");
      expect(result.map((c) => c.id)).toContain("3");
      expect(result.map((c) => c.id)).not.toContain("1");
    });
  });

  describe("sortClaimsList", () => {
    it("sorts by client name ascending", () => {
      const sorted = sortClaimsList(sampleClaims, "client");
      expect(sorted[0].client).toBe("Ionescu Dan");
      expect(sorted[1].client).toBe("Popescu Ion");
      expect(sorted[2].client).toBe("Vasilescu Ana");
    });

    it("sorts by recent update descending by default", () => {
      const sorted = sortClaimsList(sampleClaims, "recent");
      expect(sorted[0].numarDosar).toBe("DOS-002"); // 2026-08-05
      expect(sorted[1].numarDosar).toBe("DOS-003"); // 2026-08-03
      expect(sorted[2].numarDosar).toBe("DOS-001"); // 2026-08-01
    });
  });

  describe("filterClaimsList", () => {
    it("filters by search query and insurance type", () => {
      const result = filterClaimsList(sampleClaims, {
        search: "Popescu",
        filterTip: "CASCO",
      });
      expect(result.length).toBe(1);
      expect(result[0].numarDosar).toBe("DOS-001");
    });

    it("filters only blocked claims", () => {
      const result = filterClaimsList(sampleClaims, { onlyBlocked: true });
      expect(result.length).toBe(1);
      expect(result[0].numarDosar).toBe("DOS-002");
    });
  });

  describe("extractInsurersList", () => {
    it("extracts unique sorted insurers", () => {
      const insurers = extractInsurersList(sampleClaims);
      expect(insurers).toEqual(["Allianz", "Generali", "Omniasig"]);
    });
  });

  describe("computeActiveFilterCount", () => {
    it("computes count of non-default filters", () => {
      expect(computeActiveFilterCount({ search: "B-100", filterTip: "RCA" })).toBe(2);
      expect(computeActiveFilterCount({ filterTip: "toate", filterStatus: "toate" })).toBe(0);
      expect(computeActiveFilterCount({ onlyBlocked: true })).toBe(1);
    });
  });
});
