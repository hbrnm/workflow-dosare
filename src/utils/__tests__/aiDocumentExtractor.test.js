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

    expect(tipDocument).toBe("Deviz de Reparație");
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
    expect(claimPartial.operatiuni.length).toBe(2);
    expect(claimPartial.operatiuni[0].piesa).toBe("Bara fata");
    expect(claimPartial.operatiuni[0].inl).toBe(true);
  });

  it("mapează corect documente de tip TALON (Certificat de Înmatriculare)", () => {
    const talonDoc = {
      status: "SUCCESS",
      document_type: "TALON",
      confidence_score: 0.98,
      data: {
        license_plate: "CJ 10 ABC",
        vehicle_vin: "VF1BB050512345678",
        owner_name: "Ionescu Maria",
        brand_model: "Dacia Duster",
        first_registration_date: "2021-05-14",
        engine_power: "1461 cm3 / 85 kW",
      },
    };

    const { claimPartial, tipDocument } = mapExtractedJsonToClaim(talonDoc);

    expect(tipDocument).toBe("Certificat Înmatriculare (Talon)");
    expect(claimPartial.numarInmatriculare).toBe("CJ 10 ABC");
    expect(claimPartial.vin).toBe("VF1BB050512345678");
    expect(claimPartial.client).toBe("Ionescu Maria");
    expect(claimPartial.marca).toBe("Dacia");
    expect(claimPartial.model).toBe("Duster");
  });

  it("mapează corect documente de tip PV_DAUNA (Proces-Verbal de Constatare)", () => {
    const pvDoc = {
      status: "SUCCESS",
      document_type: "PV_DAUNA",
      confidence_score: 0.95,
      data: {
        claim_number: "DOS-OMN-2026-789",
        insurance_company: "Omniasig VIG",
        insurance_type: "CASCO",
        client_name: "Radu Mihai",
        client_phone: "0744111222",
        license_plate: "B 555 XYZ",
        vehicle_vin: "WBA3A5C55FP123456",
        vehicle_make: "BMW",
        vehicle_model: "Seria 3",
        claim_inspector: "Inspector Daună George",
        damage_summary: "Avarie frontală: bară, capotă, far stânga",
        damaged_parts: [
          { description: "Bara protectie fata", type: "REPLACE", inl: true },
          { description: "Capota motor", type: "REPAIR", rep: true },
          { description: "Vopsire capota", type: "PAINT", rev: true },
          { description: "D/R componente fata", type: "D/R", uni: true },
        ],
        labor_total: 1200,
        parts_total: 4500,
        paint_materials_total: 650,
        subtotal_amount: 6350,
        total_amount: 7556.5,
      },
    };

    const { claimPartial, tipDocument } = mapExtractedJsonToClaim(pvDoc);

    expect(tipDocument).toBe("Proces Verbal Constatare Daună");
    expect(claimPartial.nrDosarAsigurator).toBe("DOS-OMN-2026-789");
    expect(claimPartial.asigurator).toBe("Omniasig VIG");
    expect(claimPartial.tipAsigurare).toBe("CASCO");
    expect(claimPartial.client).toBe("Radu Mihai");
    expect(claimPartial.telefonClient).toBe("0744111222");
    expect(claimPartial.numarInmatriculare).toBe("B 555 XYZ");
    expect(claimPartial.vin).toBe("WBA3A5C55FP123456");
    expect(claimPartial.marca).toBe("BMW");
    expect(claimPartial.model).toBe("Seria 3");
    expect(claimPartial.inspectorDauna).toBe("Inspector Daună George");
    expect(claimPartial.valoareDevizAudatex).toBe(6350);
    expect(claimPartial.valoarePieseAudatex).toBe(4500);
    expect(claimPartial.manopera.tinichigerie.facturat).toBe(1200);

    expect(claimPartial.operatiuni.length).toBe(4);
    expect(claimPartial.operatiuni[0].inl).toBe(true);
    expect(claimPartial.operatiuni[1].rep).toBe(true);
    expect(claimPartial.operatiuni[2].rev).toBe(true);
    expect(claimPartial.operatiuni[3].uni).toBe(true);
  });
});
