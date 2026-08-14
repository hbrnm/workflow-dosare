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

  it("status move patch does not include poze/documente", () => {
    const claim = {
      ...emptyClaim(),
      id: "c1",
      status: "deschidere",
      poze: [{ id: "p1", path: "x/a.jpg" }],
      documente: [{ id: "d1", path: "x/b.pdf" }],
    };
    const patch = toDbPatch(
      claim,
      {
        status: "in_lucru",
        dataSchimbareStatus: "2026-08-05T10:00:00.000Z",
        termenAlertaZile: 3,
        alerteAck: false,
      },
      { updatedByEmail: "test@example.com" },
    );
    expect(patch.status).toBe("in_lucru");
    expect(patch.poze).toBeUndefined();
    expect(patch.documente).toBeUndefined();
  });
});
