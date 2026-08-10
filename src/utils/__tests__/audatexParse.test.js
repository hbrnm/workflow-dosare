import { describe, it, expect } from "vitest";
import {
  parseRoMoney,
  parseEstimateText,
  applyEstimateValuesToClaim,
  countExtractedFields,
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
  });
});
