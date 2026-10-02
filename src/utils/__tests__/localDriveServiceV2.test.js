import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  findMatchingDriveClaim,
  getDriveApiVersion,
  resetDriveApiVersionCache,
  uploadFilesToDriveClaim,
  updateDriveClaimStatus,
  getDriveClaimFileUrl,
  DRIVE_V2_CATEGORIES,
} from "../localDriveService";
import ClaimDriveTabV2 from "../../components/modals/claim/ClaimDriveTabV2";

const claims = [
  { id: "2026-08-06_OMNIASIG_10329178", numarDosar: "10329178", programari: ["60340589"], numereLegate: ["10329178", "60340589"] },
  { id: "2026-08-06_OMNIASIG_10329184", numarDosar: "10329184", programari: ["60340590"], numereLegate: ["10329184", "60340590"] },
  { id: "2026-09-16_ALLIANZ_DA-9821-2026", numarDosar: "DA-9821/2026" },
  { id: "2026-10-01_OMNIASIG_FARA-NR-prog60359984", numarDosar: "", programari: ["60359984"] },
];

describe("localDriveService v2", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetDriveApiVersionCache();
  });

  it("findMatchingDriveClaim gaseste dauna dupa nr. dosar", () => {
    expect(findMatchingDriveClaim(claims, "10329184").id).toBe("2026-08-06_OMNIASIG_10329184");
    expect(findMatchingDriveClaim(claims, " 10329178 ").id).toBe("2026-08-06_OMNIASIG_10329178");
  });

  it("findMatchingDriveClaim gaseste dauna dupa programarea Omniasig 60…", () => {
    expect(findMatchingDriveClaim(claims, "60340590").id).toBe("2026-08-06_OMNIASIG_10329184");
    expect(findMatchingDriveClaim(claims, "60359984").id).toBe("2026-10-01_OMNIASIG_FARA-NR-prog60359984");
  });

  it("findMatchingDriveClaim gaseste numere cu / (alti asiguratori)", () => {
    expect(findMatchingDriveClaim(claims, "DA-9821/2026").id).toBe("2026-09-16_ALLIANZ_DA-9821-2026");
  });

  it("findMatchingDriveClaim intoarce null cand nu exista sau nr. e gol", () => {
    expect(findMatchingDriveClaim(claims, "99999999")).toBeNull();
    expect(findMatchingDriveClaim(claims, "")).toBeNull();
    expect(findMatchingDriveClaim(null, "10329178")).toBeNull();
  });

  it("getDriveApiVersion citeste apiVersion din network-info si il tine minte", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ apiVersion: 2 }) });
    expect(await getDriveApiVersion()).toBe(2);
    expect(await getDriveApiVersion()).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("getDriveApiVersion = 1 pentru serverul vechi si cand serverul e oprit", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ localIp: "x" }) });
    expect(await getDriveApiVersion()).toBe(1);
    resetDriveApiVersionCache();
    global.fetch = vi.fn().mockRejectedValue(new Error("refused"));
    expect(await getDriveApiVersion()).toBe(1);
  });

  it("uploadFilesToDriveClaim trimite car, claim, category", async () => {
    let body = null;
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      body = opts.body;
      return Promise.resolve({ ok: true, json: async () => ({ success: true, savedFiles: ["a.jpg"] }) });
    });
    const r = await uploadFilesToDriveClaim("B 101 FMW", "2026-08-06_OMNIASIG_10329184", "02_Foto_Intrare", [new Blob(["x"])]);
    expect(r.savedFiles).toEqual(["a.jpg"]);
    expect(global.fetch.mock.calls[0][0]).toContain("/api/v2/upload");
    expect(body.get("car")).toBe("B 101 FMW");
    expect(body.get("claim")).toBe("2026-08-06_OMNIASIG_10329184");
    expect(body.get("category")).toBe("02_Foto_Intrare");
  });

  it("updateDriveClaimStatus arunca eroarea serverului", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Dauna nu a fost găsită" }) });
    await expect(updateDriveClaimStatus("B 1 ABC", "x", { status: "Finalizat" })).rejects.toThrow("Dauna nu a fost găsită");
  });

  it("getDriveClaimFileUrl codifica parametrii", () => {
    const u = getDriveClaimFileUrl("B 101 FMW", "2026-08-06_OMNIASIG_10329184", "03_Devize", "a b.pdf");
    expect(u).toContain("/api/v2/file?car=B%20101%20FMW&claim=2026-08-06_OMNIASIG_10329184&cat=03_Devize&file=a%20b.pdf");
  });

  it("are cele 8 categorii noi", () => {
    expect(DRIVE_V2_CATEGORIES.map((c) => c.key)).toEqual([
      "01_Acte", "02_Foto_Intrare", "03_Devize", "04_Reconstatare", "05_Corespondenta", "06_Facturi", "07_Foto_Final", "08_Pachet",
    ]);
  });

  it("ClaimDriveTabV2 se randeaza fara erori (cu si fara nr. auto)", () => {
    expect(() => renderToString(React.createElement(ClaimDriveTabV2, { form: { numarInmatriculare: "B 12 RIS", numarDosar: "10345148" } }))).not.toThrow();
    expect(() => renderToString(React.createElement(ClaimDriveTabV2, { form: {} }))).not.toThrow();
  });
});
