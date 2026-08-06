import { describe, it, expect } from "vitest";
import {
  claimMatchesSearch,
  getSearchHighlightIds,
  isSearchHighlighted,
} from "../searchUtils";

describe("searchUtils", () => {
  const claim = {
    id: "c1",
    numarInmatriculare: "B101ABC",
    client: "Ion Popescu",
    numarDosar: "10328417",
    asigurator: "Omniasig",
    vin: "VF123",
  };

  it("matches plate, client, dosar, asigurator, vin", () => {
    expect(claimMatchesSearch(claim, "b101")).toBe(true);
    expect(claimMatchesSearch(claim, "popescu")).toBe(true);
    expect(claimMatchesSearch(claim, "10328417")).toBe(true);
    expect(claimMatchesSearch(claim, "omniasig")).toBe(true);
    expect(claimMatchesSearch(claim, "vf123")).toBe(true);
    expect(claimMatchesSearch(claim, "xyz")).toBe(false);
  });

  it("returns all matching ids for highlight", () => {
    const claims = [
      claim,
      { ...claim, id: "c2", numarInmatriculare: "B202XYZ", client: "Alt client" },
      { ...claim, id: "c3", numarInmatriculare: "C303DEF", client: "Alt client" },
    ];
    const ids = getSearchHighlightIds(claims, "b101");
    expect(ids?.size).toBe(1);
    expect(ids?.has("c1")).toBe(true);
    const ids2 = getSearchHighlightIds(claims, "client");
    expect(ids2?.size).toBe(2);
  });

  it("isSearchHighlighted checks set membership", () => {
    const ids = new Set(["a", "b"]);
    expect(isSearchHighlighted("a", ids)).toBe(true);
    expect(isSearchHighlighted("c", ids)).toBe(false);
    expect(isSearchHighlighted("a", null)).toBe(false);
  });
});
