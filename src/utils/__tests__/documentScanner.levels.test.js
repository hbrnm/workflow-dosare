import { describe, it, expect } from "vitest";
import { applyDocumentLevels, estimateDocumentLevels } from "../documentScanner";

function makeRgbaFromLumas(lumas) {
  const rgba = new Uint8ClampedArray(lumas.length * 4);
  for (let i = 0; i < lumas.length; i++) {
    const v = lumas[i];
    const o = i * 4;
    rgba[o] = v;
    rgba[o + 1] = v;
    rgba[o + 2] = v;
    rgba[o + 3] = 255;
  }
  return rgba;
}

describe("document scan levels", () => {
  it("estimateDocumentLevels finds ink/paper anchors on a mixed page", () => {
    const lumas = [];
    for (let i = 0; i < 200; i++) lumas.push(35); // ink
    for (let i = 0; i < 800; i++) lumas.push(220); // paper
    const levels = estimateDocumentLevels(makeRgbaFromLumas(lumas), 1);
    expect(levels.black).toBeLessThan(80);
    expect(levels.white).toBeGreaterThan(180);
    expect(levels.white).toBeGreaterThan(levels.black + 40);
  });

  it("applyDocumentLevels darkens midtones instead of washing them out", () => {
    const levels = { black: 40, white: 220, mean: 180 };
    const mid = applyDocumentLevels(150, levels, { midGamma: 1.2 });
    // Old pipeline lifted midtones toward white; new one must keep them clearly darker than paper
    const paper = applyDocumentLevels(220, levels, { midGamma: 1.2 });
    const ink = applyDocumentLevels(40, levels, { midGamma: 1.2 });
    expect(ink).toBeLessThan(40);
    expect(mid).toBeLessThan(200);
    expect(paper).toBeGreaterThan(mid + 20);
  });

  it("bright page midtones stay readable (not near-white)", () => {
    const levels = { black: 60, white: 250, mean: 200 };
    const grayText = applyDocumentLevels(170, levels, {
      inkTarget: 12,
      paperTarget: 242,
      midGamma: 1.28,
    });
    expect(grayText).toBeLessThan(210);
    expect(grayText).toBeGreaterThan(40);
  });
});
