import { describe, it, expect } from "vitest";
import {
  normalizeBranding,
  darkenHex,
  DEFAULT_BRANDING,
  isPlaceholderAtelierName,
  isPlaceholderAtelierShort,
  atelierInitials,
  mergeAtelierBranding,
  resolveDisplayBranding,
  needsBrandingSetup,
} from "../branding";

describe("branding", () => {
  it("normalizeBranding leaves empty identity blank", () => {
    expect(normalizeBranding({})).toEqual(DEFAULT_BRANDING);
    expect(DEFAULT_BRANDING.atelierNume).toBe("");
    expect(DEFAULT_BRANDING.atelierShort).toBe("");
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
    expect(b).not.toHaveProperty("accentColor");
  });

  it("darkenHex reduces brightness", () => {
    const d = darkenHex("#e6edf3", 0.2);
    expect(d).toMatch(/^#[0-9a-f]{6}$/i);
    expect(d.toLowerCase()).not.toBe("#e6edf3");
  });

  it("treats product defaults as placeholders", () => {
    expect(isPlaceholderAtelierName("Dosare Daună")).toBe(true);
    expect(isPlaceholderAtelierName("Dosare Dauna")).toBe(true);
    expect(isPlaceholderAtelierName("")).toBe(true);
    expect(isPlaceholderAtelierName("AutoService Popescu")).toBe(false);
    expect(isPlaceholderAtelierShort("WD")).toBe(true);
    expect(isPlaceholderAtelierShort("AP")).toBe(false);
    expect(atelierInitials("AutoService Popescu")).toBe("AP");
    expect(atelierInitials("Beta")).toBe("BE");
  });

  it("mergeAtelierBranding prefers real atelier name over product default", () => {
    const merged = mergeAtelierBranding(
      { atelierNume: "Dosare Daună", atelierShort: "WD", logoUrl: "" },
      { nume: "Service Rapid", short: "SR", logo_url: "https://logo" }
    );
    expect(merged.atelierNume).toBe("Service Rapid");
    expect(merged.atelierShort).toBe("SR");
    expect(merged.logoUrl).toBe("https://logo");
    expect(needsBrandingSetup(merged)).toBe(false);
  });

  it("resolveDisplayBranding hides placeholder chrome", () => {
    const hidden = resolveDisplayBranding({ atelierNume: "Dosare Daună", atelierShort: "WD" });
    expect(hidden.atelierNume).toBe("");
    expect(hidden.atelierShort).toBe("");
    expect(needsBrandingSetup({ atelierNume: "Dosare Daună" })).toBe(true);
  });
});
