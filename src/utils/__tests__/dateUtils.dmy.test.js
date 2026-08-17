import { describe, expect, it } from "vitest";
import { formatDateDMY } from "../dateUtils";

describe("formatDateDMY", () => {
  it("formats as zi:luna:an", () => {
    expect(formatDateDMY(new Date(2026, 7, 17))).toBe("17:08:2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDateDMY(new Date(2026, 0, 5))).toBe("05:01:2026");
  });

  it("returns empty for invalid dates", () => {
    expect(formatDateDMY(new Date("not-a-date"))).toBe("");
  });
});
