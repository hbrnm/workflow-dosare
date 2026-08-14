import { describe, it, expect } from "vitest";
import { mapExtractedJsonToClaim, normalizeNumeric } from "../aiDocumentExtractor";

describe("aiDocumentExtractor & schema mapping", () => {
  it("tratează cazurile nule sau nedefinite grațios", () => {
    const res = mapExtractedJsonToClaim(null);
    expect(res).toBeDefined();
    expect(res.claimPartial).toBeDefined();
    expect(res.tipDocument).toBe("Document Procesat");
  });

  it("normalizează valori numerice cu monedă și formate europene", () => {
    expect(normalizeNumeric("1.250,50 RON")).toBe(1250.5);
    expect(normalizeNumeric("3500,00 lei")).toBe(3500);
    expect(normalizeNumeric("1,450.75 €")).toBe(1450.75);
    expect(normalizeNumeric(450)).toBe(450);
  });

  it("mapează corect un răspuns JSON structurat (repair_estimate / invoice)", () => {
    const structuredDoc = {
      document_type: "repair_estimate",
      document_metadata: {
        document_number: "DEV-2026-0042",
        document_date: "2026-08-10",
        vendor_name: "Service Auto Expert SRL",
        vendor_cui: "RO12345678",
      },
      financials: {
        subtotal_amount: 5400.5,
        vat_amount: 1026.1,
        total_amount: 6426.6,
        currency: "RON",
      },
      repair_details: {
        vehicle_vin: "WAUZZZ8V1GA000000",
        license_plate: "B 999 WDF",
        vehicle_make: "Audi",
        vehicle_model: "A3",
        mileage_km: "85.200 km",
        labor_total: "1.400,00 RON",
        parts_total: "3.200,50 RON",
        paint_materials_total: 800,
        insurance_company: "Allianz-Tiriac",
        insurance_type: "CASCO",
        client_name: "Andrei Georgescu",
        client_phone: "0733444555",
        damage_summary: "Avarie aripă stânga față și bară",
      },
      line_items: [
        { description: "Bara protectie fata", quantity: 1, unit_price: 1800, total_price: 1800, inl: true },
        { description: "Aripa stanga fata", quantity: 1, unit_price: 1400.5, total_price: 1400.5, inl: true, rev: true },
        { description: "Vopsire reper bara", quantity: 1, unit_price: 800, total_price: 800, rev: true },
      ],
    };

    const { claimPartial, tipDocument } = mapExtractedJsonToClaim(structuredDoc);

    expect(tipDocument).toBe("Deviz Reparație");
    expect(claimPartial.numarDosar).toBe("DEV-2026-0042");
    expect(claimPartial.asigurator).toBe("Allianz-Țiriac");
    expect(claimPartial.tipAsigurare).toBe("CASCO");
    expect(claimPartial.client).toBe("Andrei Georgescu");
    expect(claimPartial.telefonClient).toBe("0733444555");
    expect(claimPartial.numarInmatriculare).toBe("B 999 WDF");
    expect(claimPartial.vin).toBe("WAUZZZ8V1GA000000");
    expect(claimPartial.marca).toBe("Audi");
    expect(claimPartial.model).toBe("A3");
    expect(claimPartial.kilometraj).toBe(85200);
    expect(claimPartial.ceEsteDeReparat).toBe("Avarie aripă stânga față și bară");

    // Financiare & Manoperă
    expect(claimPartial.valoareDevizAudatex).toBe(5400.5);
    expect(claimPartial.valoarePieseAudatex).toBe(3200.5);
    expect(claimPartial.financiar.audatex.totalPiese).toBe(3200.5);
    expect(claimPartial.financiar.audatex.costReparatieFaraTva).toBe(5400.5);
    expect(claimPartial.financiar.audatex.costReparatieCuTva).toBe(6426.6);
    expect(claimPartial.financiar.audatex.totalVopsitorie).toBe(800);
    expect(claimPartial.financiar.manoperaTinichigerie).toBe(1400);
    expect(claimPartial.manopera.tinichigerie.facturat).toBe(1400);

    // Line items
    expect(claimPartial.operatiuni.length).toBe(3);
    expect(claimPartial.operatiuni[0].piesa).toBe("Bara protectie fata");
    expect(claimPartial.operatiuni[0].inl).toBe(true);
    expect(claimPartial.operatiuni[1].rev).toBe(true);
  });

  it("mapează corect un răspuns JSON complet de la Gemini AI și ignoră service-ul la asigurător", () => {
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
    expect(claimPartial.asigurator).toBe("Groupama Asigurări");
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
    expect(claimPartial.manopera.tinichigerie.facturat).toBe(600);
    expect(claimPartial.manopera.vopsitorie.facturat).toBe(800);
    expect(claimPartial.financiar.manoperaTinichigerie).toBe(600);
    expect(claimPartial.financiar.manoperaVopsitorie).toBe(800);
    expect(claimPartial.operatiuni.length).toBe(2);
    expect(claimPartial.operatiuni[0].piesa).toBe("Bara fata");
    expect(claimPartial.operatiuni[0].inl).toBe(true);
  });
});
