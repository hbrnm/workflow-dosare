import { describe, it, expect } from "vitest";
import {
  parseRoMoney,
  parseEstimateText,
  applyEstimateValuesToClaim,
  countExtractedFields,
  countExtractedOperations,
  extractEstimateLineItems,
} from "../audatexParse";

const SAMPLE_DAT_RO = `
Recapitulatie
Total bloc Piese de Inlocuit
Total conform Lista ( Total Piese de Inlocuit) 8.778,77 + 2,00% Piese marunte 175,58 Total Piese 8.954,35
Total bloc Manopera
Ore Pret/Ora Total caroserie 1 8,70 150,00 1.305,00 mecanica 1 1,10 150,00 165,00 Total Manopere 9,80 1.470,00
Total bloc Vopsitorie Manopera
Ore Pret/Ora Total Manopera 8,50 150,00 1.275,00
Material
Total Material 2.612,47
Total Vopsitorie
Total Total Manopera 1.275,00 Total Material 2.612,47 Total Vopsitorie 3.887,47
Total General
Total Piese de Inlocuit 8.954,35
Total Manopera 1.470,00
Total Vopsitorie 3.887,47
Cost Reparatie netto 14.311,82
TVA (19,00%) 2.719,25
Cost Reparatie brutto 17.031,07
Toate valorile in RON
`;

const SAMPLE_WITH_LINES = `
Lista Piese de Inlocuit
Pos. Cod OE Descriere Cant. Pret Total
1 5G0821105A Aripa fata stanga 1 1.850,00 1.850,00
2 5G0853655 Far stanga 1 2.100,00 2.100,00
3 5G0807221D Bara fata 1 890,00 890,00
Total Piese 4.840,00

Manopera
Pos. Descriere Ore Pret Total
1 Demontare/montare aripa fata stanga 1,20 150,00 180,00
2 Demontare/montare far stanga 0,40 150,00 60,00
3 Indreptare bara fata 2,00 150,00 300,00
Total Manopere 540,00

Vopsitorie
Pos. Descriere
1 Aripa fata stanga - lacare noua
2 Bara fata - lacare noua
Total Vopsitorie
Total Manopera 400,00 Total Material 600,00 Total Vopsitorie 1.000,00
Cost Reparatie netto 6.380,00
`;

const SAMPLE_PARTS_WITHOUT_INDEX = `
Lista Piese de schimb
5G0821105A Aripa fata stanga 1 1.850,00 1.850,00
5G0853655 Far stanga 1 2.100,00 2.100,00
Total Piese 3.950,00
`;

describe("audatexParse", () => {
  it("parseRoMoney handles Romanian thousands", () => {
    expect(parseRoMoney("8.954,35")).toBeCloseTo(8954.35, 2);
    expect(parseRoMoney("1.470,00")).toBe(1470);
    expect(parseRoMoney("14.311,82")).toBeCloseTo(14311.82, 2);
  });

  it("extracts DAT/Audatex-style recapitulation totals", () => {
    const { values, confidence, format } = parseEstimateText(SAMPLE_DAT_RO);
    expect(values.valoarePieseAudatex).toBeCloseTo(8954.35, 2);
    expect(values.manoperaTinichigerie).toBeCloseTo(1470, 2);
    expect(values.manoperaVopsitorie).toBeCloseTo(1275, 2);
    expect(values.materialeVopsitorie).toBeCloseTo(2612.47, 2);
    expect(values.valoareDevizAudatex).toBeCloseTo(14311.82, 2);
    expect(confidence).toBe("high");
    expect(format).toMatch(/dat|unknown|audatex/);
    expect(countExtractedFields(values)).toBeGreaterThanOrEqual(4);
  });

  it("extracts parts and labour into claim operations", () => {
    const { values, lineItems } = parseEstimateText(SAMPLE_WITH_LINES);
    expect(values.valoarePieseAudatex).toBeCloseTo(4840, 2);
    expect(countExtractedOperations(lineItems)).toBeGreaterThanOrEqual(3);

    const names = lineItems.operations.map((o) => o.piesa);
    expect(names.some((n) => /ARIPA/.test(n))).toBe(true);
    expect(names.some((n) => /BARA/.test(n))).toBe(true);

    const aripa = lineItems.operations.find((o) => /ARIPA/.test(o.piesa));
    expect(aripa.inl).toBe(true);
    expect(aripa.rev || aripa.uni).toBe(true);

    const claim = applyEstimateValuesToClaim(
      { financiar: {}, manopera: {}, operatiuni: [] },
      values,
      { operations: lineItems.operations, applyOperations: true, replaceOperations: true }
    );
    expect(claim.operatiuni.length).toBeGreaterThanOrEqual(3);
    expect(claim.ceEsteDeReparat).toMatch(/ARIPA/i);
    expect(claim.valoarePieseAudatex).toBeCloseTo(4840, 2);
  });

  it("extractEstimateLineItems maps INL / UNI / REV flags", () => {
    const items = extractEstimateLineItems(SAMPLE_WITH_LINES);
    expect(items.parts.length).toBe(3);
    expect(items.labour.length).toBeGreaterThanOrEqual(2);
    expect(items.paint.length).toBeGreaterThanOrEqual(1);
    expect(items.operations.some((o) => o.inl)).toBe(true);
    expect(items.operations.some((o) => o.uni || o.rev || o.rep)).toBe(true);
  });

  it("extracts parts rows even when export has no position index", () => {
    const items = extractEstimateLineItems(SAMPLE_PARTS_WITHOUT_INDEX);
    expect(items.parts.length).toBeGreaterThanOrEqual(2);
    expect(items.operations.some((o) => /ARIPA/.test(o.piesa))).toBe(true);
    expect(items.operations.some((o) => /FAR/.test(o.piesa))).toBe(true);
  });

  it("applyEstimateValuesToClaim syncs financiar + manopera", () => {
    const claim = applyEstimateValuesToClaim(
      { financiar: {}, manopera: { tinichigerie: { facturat: 0, alocat: 0 }, vopsitorie: { facturat: 0, alocat: 0 } } },
      {
        valoareDevizAudatex: 1000,
        valoarePieseAudatex: 400,
        manoperaTinichigerie: 200,
        manoperaVopsitorie: 150,
        materialeVopsitorie: 250,
      }
    );
    expect(claim.valoareDevizAudatex).toBe(1000);
    expect(claim.valoarePieseAudatex).toBe(400);
    expect(claim.financiar.manoperaTinichigerie).toBe(200);
    expect(claim.manopera.tinichigerie.facturat).toBe(200);
    expect(claim.manopera.vopsitorie.facturat).toBe(150);
    expect(claim.financiar.materialeVopsitorie).toBe(250);
    expect(claim.financiar.audatex.totalPiese).toBe(400);
    expect(claim.financiar.audatex.totalManopera).toBe(200);
    expect(claim.financiar.audatex.costReparatieFaraTva).toBe(1000);
    expect(claim.financiar.audatex.totalVopsitorie).toBe(400);
  });
});
