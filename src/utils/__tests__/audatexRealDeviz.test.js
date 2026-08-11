import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseEstimateText, countExtractedOperations } from "../audatexParse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, "fixtures/deviz_60338570_audatex.txt");
const text = fs.readFileSync(fixturePath, "utf8").replace(/---PAGE---/g, "\n");

/**
 * Audatex RO real export — dosar 60338570, VW Arteon, reparație bară spate (fără piese).
 * Totaluri așteptate (fără TVA):
 *   Manoperă tinichigerie 430.00 | Vopsitorie manoperă 510.00 | Materiale vops 1377.59
 *   Suplimente 262.62 | Piese 0.00 | Deviz netto 2580.21
 */
describe("audatex real deviz 60338570", () => {
  it("extracts Audatex RO totals and operations", () => {
    const { values, format, lineItems, confidence } = parseEstimateText(text);

    expect(format).toBe("audatex");
    expect(confidence).toBe("high");

    expect(values.valoareDevizAudatex).toBeCloseTo(2580.21, 2);
    expect(values.costReparatieFaraTva).toBeCloseTo(2580.21, 2);
    expect(values.valoarePieseAudatex).toBe(0);
    expect(values.totalPieseAudatex).toBe(0);
    expect(values.manoperaTinichigerie).toBeCloseTo(430, 2);
    expect(values.totalManoperaAudatex).toBeCloseTo(430, 2);
    expect(values.manoperaVopsitorie).toBeCloseTo(510, 2);
    expect(values.materialeVopsitorie).toBeCloseTo(1377.59, 2);
    expect(values.totalVopsitorieAudatex).toBeCloseTo(1887.59, 2);
    expect(values.cheltuieliDiverse).toBeCloseTo(262.62, 2);
    expect(values.totalCosturiSuplimentareAudatex).toBeCloseTo(262.62, 2);
    expect(values.costReparatieCuTva).toBeCloseTo(3122.05, 2);
    expect(values.oreTinichigerieAudatex).toBeCloseTo(4.3, 2);
    expect(values.oreVopsitorieAudatex).toBeCloseTo(5.1, 2);

    expect(countExtractedOperations(lineItems)).toBeGreaterThanOrEqual(10);

    const names = lineItems.operations.map((o) => o.piesa);
    expect(names.some((n) => /BARA PROTECTIE SPATE/i.test(n))).toBe(true);

    const bara = lineItems.operations.find((o) => /BARA PROTECTIE SPATE/i.test(o.piesa));
    expect(bara?.rep || bara?.rev).toBe(true);
  });
});
