import { describe, it, expect } from "vitest";
import {
  resolveColorScheme,
  msUntilNextSchemeChange,
  getTokensForScheme,
  DAY_START_HOUR,
  NIGHT_START_HOUR,
} from "../appTokens";

describe("appTokens day/night", () => {
  it("resolveColorScheme returns light during day hours", () => {
    expect(resolveColorScheme(new Date(2026, 7, 6, DAY_START_HOUR, 30))).toBe("light");
    expect(resolveColorScheme(new Date(2026, 7, 6, 12, 0))).toBe("light");
    expect(resolveColorScheme(new Date(2026, 7, 6, NIGHT_START_HOUR - 1, 59))).toBe("light");
  });

  it("resolveColorScheme returns dark at night and early morning", () => {
    expect(resolveColorScheme(new Date(2026, 7, 6, NIGHT_START_HOUR, 0))).toBe("dark");
    expect(resolveColorScheme(new Date(2026, 7, 6, 23, 0))).toBe("dark");
    expect(resolveColorScheme(new Date(2026, 7, 6, DAY_START_HOUR - 1, 0))).toBe("dark");
  });

  it("msUntilNextSchemeChange is positive", () => {
    expect(msUntilNextSchemeChange(new Date(2026, 7, 6, 10, 0))).toBeGreaterThan(0);
    expect(msUntilNextSchemeChange(new Date(2026, 7, 6, 22, 0))).toBeGreaterThan(0);
  });

  it("getTokensForScheme picks light and dark palettes", () => {
    expect(getTokensForScheme("light")["--app-bg"]).toBe("#f6f8fa");
    expect(getTokensForScheme("dark")["--app-bg"]).toBe("#0d1117");
  });
});
