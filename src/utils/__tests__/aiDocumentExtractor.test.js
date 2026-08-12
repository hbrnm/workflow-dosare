import { describe, it, expect } from "vitest";
import { mapExtractedJsonToClaim } from "../aiDocumentExtractor";

describe("mapExtractedJsonToClaim", () => {
  it("tratează cazurile nule sau nedefinite grațios", () => {
    const res = mapExtractedJsonToClaim(null);
    expect(res).toBeDefined();
    expect(res.claimPartial).toBeDefined();
    expect(res.tipDocument).toBe("Document Procesat");
  });

  it("mapează corect un răspuns JSON complet de la Gemini AI", () => {
    const mockAiOutput = {
      numarDosar: "DOS-2026-999",
      nrDosarAsigurator: "DA-888777",
      asigurator: "Groupama Asigurari",
      tipAsigurare: "RCA",
      client: "Popescu Ion",
      telefonClient: "0722111222",
      numarInmatriculare: "B 777 AAA",
      vin: "WVWZZZ1KZ9W000000",
      marca: "Volkswagen",
      model: "Golf",
      kilometraj: 145000,
      valoareDevizAudatex: 4500.5,
      valoarePieseAudatex: 3100,
      manoperaTinichigerie: 600,
      manoperaVopsitorie: 800,
      operatiuni: [
        { piesa: "Bara fata", inl: true, rev: false, rep: false, uni: false },
        { piesa: "Aripa stanga fata", inl: false, rev: true, rep: true, uni: false },
      ],
      tipDocumentIdentificat: "Deviz Audatex",
    };

    const { claimPartial, tipDocument, extractedRaw } = mapExtractedJsonToClaim(mockAiOutput);

    expect(tipDocument).toBe("Deviz Audatex");
    expect(extractedRaw.client).toBe("Popescu Ion");

    expect(claimPartial.numarDosar).toBe("DOS-2026-999");
    expect(claimPartial.nrDosarAsigurator).toBe("DA-888777");
    expect(claimPartial.asigurator).toBe("Groupama Asigurari");
    expect(claimPartial.tipAsigurare).toBe("RCA");
    expect(claimPartial.client).toBe("Popescu Ion");
    expect(claimPartial.telefonClient).toBe("0722111222");
    expect(claimPartial.numarInmatriculare).toBe("B 777 AAA");
    expect(claimPartial.vin).toBe("WVWZZZ1KZ9W000000");
    expect(claimPartial.marca).toBe("Volkswagen");
    expect(claimPartial.model).toBe("Golf");
    expect(claimPartial.marcaModel).toBe("Volkswagen Golf");
    expect(claimPartial.kilometraj).toBe(145000);
    expect(claimPartial.valoareDevizAudatex).toBe(4500.5);
    expect(claimPartial.valoarePieseAudatex).toBe(3100);
    expect(claimPartial.operatiuni.length).toBe(2);
    expect(claimPartial.operatiuni[0].piesa).toBe("Bara fata");
    expect(claimPartial.operatiuni[0].inl).toBe(true);
  });
});
