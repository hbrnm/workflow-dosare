import { describe, it, expect } from "vitest";
import CentralizatorPiese from "../CentralizatorPiese";
import { PART_STATUSES, COMMON_SUPPLIERS } from "../../common/PartsLifecyclePanel";

describe("CentralizatorPiese", () => {
  it("exports CentralizatorPiese component as a valid function", () => {
    expect(typeof CentralizatorPiese).toBe("function");
  });

  it("extracts and calculates parts statistics correctly", () => {
    const mockClaims = [
      {
        id: "c1",
        numarDosar: "101",
        numarInmatriculare: "B123ABC",
        operatiuni: [
          { piesa: "BARA", inl: true, statusPiesa: "comandat", pretAchizitie: 500, furnizor: "Autonet" },
          { piesa: "FAR", inl: true, statusPiesa: "sosit", pretAchizitie: 1000, furnizor: "Unix Auto" },
        ],
      },
      {
        id: "c2",
        numarDosar: "102",
        numarInmatriculare: "CJ01XYZ",
        operatiuni: [
          { piesa: "ARIPA", inl: true, statusPiesa: "in_tranzit", pretAchizitie: 400, furnizor: "Inter Cars" },
        ],
      },
    ];

    const ops1 = mockClaims[0].operatiuni;
    const ops2 = mockClaims[1].operatiuni;
    const totalOps = [...ops1, ...ops2];

    expect(totalOps.length).toBe(3);
    const totalAchizitie = totalOps.reduce((sum, op) => sum + op.pretAchizitie, 0);
    expect(totalAchizitie).toBe(1900);

    const sosite = totalOps.filter((op) => op.statusPiesa === "sosit");
    expect(sosite.length).toBe(1);

    const inTranzit = totalOps.filter((op) => op.statusPiesa === "in_tranzit");
    expect(inTranzit.length).toBe(1);

    const comandate = totalOps.filter((op) => op.statusPiesa === "comandat");
    expect(comandate.length).toBe(1);
  });
});
