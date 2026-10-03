import { describe, it, expect } from "vitest";
import {
  shouldMirrorSetari,
  atelierRowToSettings,
  brandingToAtelierPatch,
  atelierPatchToSetariMirror,
  brandingLogoStoragePath,
  edgeFunctionFailure,
} from "../atelierSettings";

describe("atelierSettings", () => {
  it("mirrors only default slug", () => {
    expect(shouldMirrorSetari("default")).toBe(true);
    expect(shouldMirrorSetari("Default")).toBe(true);
    expect(shouldMirrorSetari("atelier-a")).toBe(false);
    expect(shouldMirrorSetari(null)).toBe(false);
  });

  it("maps atelier row to settings shape", () => {
    const mapped = atelierRowToSettings({
      nume: "Alpha",
      short: "AL",
      logo_url: "https://x/y.png",
      capacitate_zilnica: 5,
      prag_ridicare_zile: 2,
      prag_inactivitate_zile: 9,
      asiguratori: ["Allianz"],
      termene_alerta_status: { AIR: 3 },
      plan: "active",
      trial_ends_at: null,
      seat_limit: 8,
      slug: "alpha",
    });
    expect(mapped.atelier_nume).toBe("Alpha");
    expect(mapped.atelier_short).toBe("AL");
    expect(mapped.capacitate_zilnica).toBe(5);
    expect(mapped.asiguratori).toEqual(["Allianz"]);
    expect(mapped.slug).toBe("alpha");
  });

  it("maps branding and mirror payloads", () => {
    const patch = brandingToAtelierPatch({
      atelierNume: "Beta",
      atelierShort: "BT",
      logoUrl: "https://logo",
    });
    expect(patch).toEqual({ nume: "Beta", short: "BT", logo_url: "https://logo" });
    expect(atelierPatchToSetariMirror(patch)).toEqual({
      atelier_nume: "Beta",
      atelier_short: "BT",
      logo_url: "https://logo",
    });
    expect(
      atelierPatchToSetariMirror({ capacitate_zilnica: 4, plan: "trial" })
    ).toEqual({ capacitate_zilnica: 4, plan: "trial" });
  });

  it("builds per-atelier logo path", () => {
    expect(brandingLogoStoragePath(null, "png")).toBe("atelier/logo.png");
    expect(brandingLogoStoragePath("uuid-1", "JPG")).toBe("atelier/uuid-1/logo.jpg");
  });

  describe("edgeFunctionFailure", () => {
    it("treats a missing function (404 { code, message }) as soft so the direct update runs", () => {
      const r = edgeFunctionFailure({
        status: 404,
        body: { code: "NOT_FOUND", message: "Requested function was not found" },
        errMessage: "Edge Function returned a non-2xx status code",
      });
      expect(r.soft).toBe(true);
    });

    it("treats network errors and empty failures as soft", () => {
      expect(edgeFunctionFailure({ errMessage: "Failed to send a request to the Edge Function" }).soft).toBe(true);
      expect(edgeFunctionFailure({ errMessage: "Relay Error invoking the Edge Function" }).soft).toBe(true);
      expect(edgeFunctionFailure({}).soft).toBe(true);
    });

    it("surfaces the function's own error for real rejections", () => {
      const r = edgeFunctionFailure({
        status: 403,
        body: { error: "Doar administratorul atelierului poate modifica setările." },
        errMessage: "Edge Function returned a non-2xx status code",
      });
      expect(r).toEqual({ message: "Doar administratorul atelierului poate modifica setările.", soft: false });
    });
  });
});
