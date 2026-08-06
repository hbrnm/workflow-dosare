import { describe, it, expect } from "vitest";
import {
  normalizeOperations,
  operationsSummary,
  countOperationsByFlag,
  emptyOperationLine,
} from "../estimateUtils";

describe("estimateUtils", () => {
  it("normalizes legacy object to one line", () => {
    const lines = normalizeOperations({ inl: true, rev: false }, "BARA FATA");
    expect(lines).toHaveLength(1);
    expect(lines[0].piesa).toBe("BARA FATA");
    expect(lines[0].inl).toBe(true);
  });

  it("keeps array lines", () => {
    const lines = normalizeOperations([
      { id: "1", piesa: "A", inl: true },
      { id: "2", piesa: "B", rep: true },
    ]);
    expect(lines).toHaveLength(2);
    expect(operationsSummary(lines)).toBe("A, B");
  });

  it("counts flags", () => {
    const counts = countOperationsByFlag([
      emptyOperationLine(),
      { ...emptyOperationLine(), inl: true, rep: true },
    ]);
    expect(counts.total).toBe(2);
    expect(counts.inl).toBe(1);
    expect(counts.rep).toBe(1);
  });
});
