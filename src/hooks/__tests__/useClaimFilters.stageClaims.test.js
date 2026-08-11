import { describe, it, expect } from "vitest";
import { selectStageClaims } from "../useClaimFilters";

describe("selectStageClaims", () => {
  const claims = [
    { id: "1", blocat: false },
    { id: "2", blocat: true },
    { id: "3", blocat: false },
  ];

  it("excludes blocked claims from stage pipeline", () => {
    expect(selectStageClaims(claims, false).map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("keeps blocked list intact when onlyBlocked is on", () => {
    const blockedOnly = claims.filter((c) => c.blocat);
    expect(selectStageClaims(blockedOnly, true).map((c) => c.id)).toEqual(["2"]);
  });
});
