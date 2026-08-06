import { describe, it, expect } from "vitest";
import { toDbPatch, emptyClaim } from "../claimUtils";

describe("toDbPatch identity fields", () => {
  it("persists mobile sheet edits for plate, client and phone", () => {
    const claim = {
      ...emptyClaim(),
      id: "c1",
      numarInmatriculare: "B111AAA",
      client: "Old Client",
      telefonClient: "0700000000",
    };
    const patch = toDbPatch(
      claim,
      {
        numarInmatriculare: "B222BBB",
        client: "New Client",
        telefonClient: "0711111111",
      },
      { updatedByEmail: "test@example.com" },
    );
    expect(patch.numar_inmatriculare).toBe("B222BBB");
    expect(patch.client).toBe("New Client");
    expect(patch.telefon_client).toBe("0711111111");
  });

  it("clears programare_status when patch sets null", () => {
    const claim = { ...emptyClaim(), id: "c1", programareStatus: "onorata" };
    const patch = toDbPatch(claim, { programareStatus: null }, { updatedByEmail: "test@example.com" });
    expect(patch.programare_status).toBeNull();
  });
});
