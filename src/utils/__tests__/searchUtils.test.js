import { describe, it, expect } from "vitest";
import {
  claimMatchesSearch,
  getSearchHighlightIds,
  isSearchHighlighted,
  filterClaimsBySearch,
} from "../searchUtils";

describe("searchUtils", () => {
  const claim = {
    id: "c1",
    numarInmatriculare: "B101ABC",
    client: "Ion Popescu",
    numarDosar: "10328417",
    asigurator: "Omniasig",
    vin: "VF123",
    marcaModel: "Dacia Logan",
    telefonClient: "0712345678",
  };

  it("matches plate, client, dosar, asigurator, vin, model, phone", () => {
    expect(claimMatchesSearch(claim, "b101")).toBe(true);
    expect(claimMatchesSearch(claim, "popescu")).toBe(true);
    expect(claimMatchesSearch(claim, "10328417")).toBe(true);
    expect(claimMatchesSearch(claim, "omniasig")).toBe(true);
    expect(claimMatchesSearch(claim, "vf123")).toBe(true);
    expect(claimMatchesSearch(claim, "logan")).toBe(true);
    expect(claimMatchesSearch(claim, "0712")).toBe(true);
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

  it("filterClaimsBySearch returns claim list for popup", () => {
    const claims = [
      claim,
      { ...claim, id: "c2", numarInmatriculare: "B202XYZ", client: "Alt" },
    ];
    expect(filterClaimsBySearch(claims, "")).toEqual([]);
    expect(filterClaimsBySearch(claims, "b101").map((c) => c.id)).toEqual(["c1"]);
    expect(filterClaimsBySearch(claims, "b", { limit: 1 })).toHaveLength(1);
  });

  it("isSearchHighlighted checks set membership", () => {
    const ids = new Set(["a", "b"]);
    expect(isSearchHighlighted("a", ids)).toBe(true);
    expect(isSearchHighlighted("c", ids)).toBe(false);
    expect(isSearchHighlighted("a", null)).toBe(false);
  });
});
