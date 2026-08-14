import { describe, it, expect } from "vitest";
import { emptyClaim } from "../claimModel";

describe("Insurer Activities Categorization Logic", () => {
  it("clasifică corect daunele totale, dosarele în așteptare și dosarele în lucru", () => {
    const claims = [
      {
        ...emptyClaim("deschidere"),
        id: "c1",
        numarInmatriculare: "B 101 ABC",
        asigurator: "Omniasig VIG",
        acordReparatiePrimit: false,
      },
      {
        ...emptyClaim("deschidere"),
        id: "c2",
        numarInmatriculare: "B 102 ABC",
        asigurator: "Allianz-Țiriac",
        reconstatareCeruta: true,
      },
      {
        ...emptyClaim("in_lucru"),
        id: "c3",
        numarInmatriculare: "B 103 ABC",
        valoareDevizAudatex: 12000,
      },
      {
        ...emptyClaim("accept_plata"),
        id: "c4",
        numarInmatriculare: "B 104 ABC",
        incasat: false,
      },
      {
        ...emptyClaim("deschidere"),
        id: "c5",
        numarInmatriculare: "B 105 ABC",
        daunaTotala: true,
      },
    ];

    // 1. Daune Totale
    const dauneTotale = claims.filter(
      (c) => !c.blocat && (c.daunaTotala || c.valoareDevizAudatex > 50000)
    );
    expect(dauneTotale.length).toBe(1);
    expect(dauneTotale[0].numarInmatriculare).toBe("B 105 ABC");

    // 2. AIR în așteptare
    const airAsteptare = claims.filter(
      (c) => !c.blocat && c.status === "deschidere" && !c.acordReparatiePrimit
    );
    expect(airAsteptare.length).toBe(3); // c1, c2, c5 (când nu e exclus)

    // 3. Reconstatări în așteptare
    const reconstatari = claims.filter((c) => !c.blocat && c.reconstatareCeruta);
    expect(reconstatari.length).toBe(1);
    expect(reconstatari[0].id).toBe("c2");

    // 4. Accept de plată în așteptare
    const acceptPlata = claims.filter(
      (c) => !c.blocat && (c.status === "accept_plata" || (c.status === "facturat" && !c.incasat))
    );
    expect(acceptPlata.length).toBe(1);
    expect(acceptPlata[0].id).toBe("c4");
  });
});
