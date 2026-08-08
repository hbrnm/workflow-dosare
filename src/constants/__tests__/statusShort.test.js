import { describe, it, expect, vi, afterEach } from "vitest";
import { getStatusShortLabel } from "../config";
import { copyClaimNumber } from "../../utils/copyClaimNumber";

describe("getStatusShortLabel", () => {
  it("returns short stage abbreviations", () => {
    expect(getStatusShortLabel("deschidere")).toBe("AIR");
    expect(getStatusShortLabel("accept_plata")).toBe("AP");
    expect(getStatusShortLabel("gata_de_ridicare")).toBe("Repar."); // migrated → in_lucru
    expect(getStatusShortLabel("piese_sosite")).toBe("Piese"); // migrated
    expect(getStatusShortLabel("in_lucru")).toBe("Repar.");
    expect(getStatusShortLabel("predat_client")).toBe("AP"); // migrated → accept_plata
  });
});

describe("copyClaimNumber", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies trimmed dosar number and notifies", async () => {
    const writes = [];
    const notices = [];
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: async (v) => { writes.push(v); },
      },
    });
    const ok = await copyClaimNumber(" 10326844 ", (msg, type) => notices.push({ msg, type }));
    expect(ok).toBe(true);
    expect(writes).toEqual(["10326844"]);
    expect(notices[0].type).toBe("success");
  });
});
