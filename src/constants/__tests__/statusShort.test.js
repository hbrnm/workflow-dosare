import { describe, it, expect, vi, afterEach } from "vitest";
import { getStatusShortLabel } from "../config";
import { copyClaimNumber } from "../../utils/copyClaimNumber";

describe("getStatusShortLabel", () => {
  it("returns short stage abbreviations", () => {
    expect(getStatusShortLabel("deschidere")).toBe("AIR");
    expect(getStatusShortLabel("accept_plata")).toBe("Accept");
    expect(getStatusShortLabel("gata_de_ridicare")).toBe("Gata");
    expect(getStatusShortLabel("piese_sosite")).toBe("Piese"); // migrated
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
