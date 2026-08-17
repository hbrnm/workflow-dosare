import { describe, it, expect } from "vitest";
import {
  uniqueSearchMatch,
  mobileSearchHits,
  shouldShowMobileSearchHits,
  resolveInboxFotoClaim,
} from "../mobileSearchNav";

const claims = [
  { id: "c1", numarInmatriculare: "B101ABC", client: "Ion Popescu" },
  { id: "c2", numarInmatriculare: "B202XYZ", client: "Ana Ionescu" },
  { id: "c3", numarInmatriculare: "CJ03DEF", client: "Mihai Popa" },
];

describe("mobileSearchNav", () => {
  it("uniqueSearchMatch opens only when exactly one claim matches", () => {
    expect(uniqueSearchMatch(claims, "")).toBeNull();
    expect(uniqueSearchMatch(claims, "b")).toBeNull();
    expect(uniqueSearchMatch(claims, "b101").id).toBe("c1");
    expect(uniqueSearchMatch(claims, "popescu").id).toBe("c1");
  });

  it("shouldShowMobileSearchHits hides the dock list for a unique match", () => {
    expect(shouldShowMobileSearchHits("", 0)).toBe(false);
    expect(shouldShowMobileSearchHits("b101", 1)).toBe(false);
    expect(shouldShowMobileSearchHits("b", 2)).toBe(true);
    expect(shouldShowMobileSearchHits("zzz", 0)).toBe(true);
  });

  it("mobileSearchHits caps the list", () => {
    expect(mobileSearchHits(claims, "b").map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(mobileSearchHits(claims, "")).toEqual([]);
  });

  it("resolveInboxFotoClaim prefers unique search, else last used, else null", () => {
    expect(
      resolveInboxFotoClaim({ claims, searchQuery: "b101", lastClaimId: "c2" }).id
    ).toBe("c1");
    expect(
      resolveInboxFotoClaim({ claims, searchQuery: "b", lastClaimId: "c2" })
    ).toBeNull();
    expect(
      resolveInboxFotoClaim({ claims, searchQuery: "", lastClaimId: "c2" }).id
    ).toBe("c2");
    expect(
      resolveInboxFotoClaim({ claims, searchQuery: "", lastClaimId: "missing" })
    ).toBeNull();
    expect(
      resolveInboxFotoClaim({ claims, searchQuery: "", lastClaimId: null })
    ).toBeNull();
  });
});
