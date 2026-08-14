import { describe, expect, it } from "vitest";
import { formatProgramareDate } from "../dateUtils";

describe("formatProgramareDate", () => {
  it("formats date with time as DD/MM/YYYY HH:mm", () => {
    expect(formatProgramareDate("2026-08-15T09:30:00")).toBe("15/08/2026 09:30");
  });

  it("formats date-only as DD/MM/YYYY", () => {
    expect(formatProgramareDate("2026-08-15")).toBe("15/08/2026");
  });

  it("returns empty for missing values", () => {
    expect(formatProgramareDate("")).toBe("");
    expect(formatProgramareDate(null)).toBe("");
    expect(formatProgramareDate(undefined)).toBe("");
  });
});
