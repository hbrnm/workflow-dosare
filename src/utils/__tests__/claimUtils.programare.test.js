import { describe, it, expect } from "vitest";
import { toDb, toDbPatch, emptyClaim } from "../claimUtils";

describe("toDb programare_status compatibility", () => {
  it("omits programare_status from full save when unset", () => {
    const row = toDb({ ...emptyClaim(), id: "x1", programareStatus: null });
    expect(row).not.toHaveProperty("programare_status");
  });

  it("includes programare_status when marked onorata", () => {
    const row = toDb({ ...emptyClaim(), id: "x1", programareStatus: "onorata" });
    expect(row.programare_status).toBe("onorata");
  });

  it("patch for piese dates does not send programare_status", () => {
    const claim = { ...emptyClaim(), id: "x1" };
    const patch = toDbPatch(claim, {
      dataComandaPiese: "2026-08-06",
      termenLivrarePiese: "2026-08-20",
    }, { updatedByEmail: "test@example.com" });
    expect(patch.data_comanda_piese).toBe("2026-08-06");
    expect(patch.termen_livrare_piese).toBe("2026-08-20");
    expect(patch).not.toHaveProperty("programare_status");
  });
});
