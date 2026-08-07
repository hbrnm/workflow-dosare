import { describe, it, expect } from "vitest";
import { formatProgramareShort } from "../dateUtils";

describe("formatProgramareShort", () => {
  it("formats date and time for programat cards", () => {
    expect(formatProgramareShort("2026-08-15T09:30:00")).toBe("15/08 09:30");
  });

  it("formats date only when time missing", () => {
    expect(formatProgramareShort("2026-08-15")).toBe("15/08");
  });

  it("returns empty for invalid input", () => {
    expect(formatProgramareShort("")).toBe("");
    expect(formatProgramareShort(null)).toBe("");
  });
});
