import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseEstimateText, countExtractedOperations } from "../audatexParse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(path.join(__dirname, "fixtures/deviz_60340395_cu_piese.txt"), "utf8").replace(/---PAGE---/g, "\n");

/**
 * Audatex RO — dosar 60340395, Ford Focus, parbriz + piese de schimb.
 */
describe("audatex deviz cu piese 60340395", () => {
  it("extracts totals, parts list and operations", () => {
    const { values, format, lineItems, confidence } = parseEstimateText(text);

    expect(format).toBe("audatex");
    expect(confidence).toBe("high");

    expect(values.valoareDevizAudatex).toBeCloseTo(8299.94, 2);
    expect(values.valoarePieseAudatex).toBeCloseTo(5092.17, 2);
    expect(values.manoperaTinichigerie).toBeCloseTo(540, 2);
    expect(values.manoperaVopsitorie).toBeCloseTo(730, 2);
    expect(values.materialeVopsitorie).toBeCloseTo(1675.15, 2);
    expect(values.cheltuieliDiverse).toBeCloseTo(262.62, 2);
    expect(values.oreTinichigerieAudatex).toBeCloseTo(5.4, 2);
    expect(values.oreVopsitorieAudatex).toBeCloseTo(7.3, 2);

    expect(lineItems.parts.length).toBeGreaterThanOrEqual(4);
    const partNames = lineItems.parts.map((p) => p.name.toUpperCase());
    expect(partNames.some((n) => /PARBRIZ/i.test(n))).toBe(true);
    expect(partNames.some((n) => /FOLIE|SENZOR/i.test(n))).toBe(true);

    expect(countExtractedOperations(lineItems)).toBeGreaterThanOrEqual(8);

    const parbriz = lineItems.operations.find((o) => /PARBRIZ/i.test(o.piesa));
    expect(parbriz?.inl).toBe(true);

    const bara = lineItems.operations.find((o) => /BARA PROTECTIE FATA/i.test(o.piesa));
    expect(bara?.rep || bara?.rev).toBe(true);
  });
});
