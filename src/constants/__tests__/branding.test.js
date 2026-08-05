import { describe, it, expect } from "vitest";
import { normalizeBranding, darkenHex, DEFAULT_BRANDING } from "../branding";

describe("branding", () => {
  it("normalizeBranding fills defaults", () => {
    expect(normalizeBranding({})).toEqual(DEFAULT_BRANDING);
  });

  it("normalizeBranding accepts snake_case from DB", () => {
    const b = normalizeBranding({
      atelier_nume: "Auto Pro",
      atelier_short: "ap",
      logo_url: "https://example.com/logo.png",
      accent_color: "#112233",
    });
    expect(b.atelierNume).toBe("Auto Pro");
    expect(b.atelierShort).toBe("AP");
    expect(b.logoUrl).toBe("https://example.com/logo.png");
    expect(b.accentColor).toBe("#112233");
  });

  it("rejects invalid accent colors", () => {
    expect(normalizeBranding({ accentColor: "red" }).accentColor).toBe(DEFAULT_BRANDING.accentColor);
  });

  it("darkenHex reduces brightness", () => {
    const d = darkenHex("#C98A2B", 0.2);
    expect(d).toMatch(/^#[0-9a-f]{6}$/i);
    expect(d.toLowerCase()).not.toBe("#c98a2b");
  });
});
