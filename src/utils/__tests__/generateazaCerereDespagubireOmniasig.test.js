import { describe, it, expect } from "vitest";
import { generateazaCerereDespagubireOmniasig, formatEventDate } from "../pdfGenerator";
import { emptyClaim } from "../claimModel";

describe("formatEventDate", () => {
  it("formatează corect datele ISO YYYY-MM-DD", () => {
    expect(formatEventDate("2026-09-22")).toBe("22/09/2026");
    expect(formatEventDate("2026-01-05")).toBe("05/01/2026");
  });

  it("păstrează datele deja formatate DD/MM/YYYY sau cu puncte", () => {
    expect(formatEventDate("22/09/2026")).toBe("22/09/2026");
    expect(formatEventDate("22.09.2026")).toBe("22/09/2026");
    expect(formatEventDate("22-09-2026")).toBe("22/09/2026");
  });

  it("returnează string gol pentru valori nule, nedefinite sau goale", () => {
    expect(formatEventDate(null)).toBe("");
    expect(formatEventDate(undefined)).toBe("");
    expect(formatEventDate("")).toBe("");
    expect(formatEventDate("—")).toBe("");
  });
});

describe("generateazaCerereDespagubireOmniasig", () => {
  it("generează cu succes PDF-ul de cerere despăgubire Omniasig cu dataEveniment și CNP", async () => {
    const mockClaim = {
      ...emptyClaim("accept_plata"),
      id: "claim-omniasig-1",
      numarInmatriculare: "B 123 ABC",
      marcaModel: "VW Golf 7",
      numarDosar: "OMN-998822",
      asigurator: "Omniasig VIG",
      tipAsigurare: "RCA",
      client: "Popescu Ion",
      cnp: "1900101123456",
      dataEveniment: "2026-09-15",
      telefonClient: "0722111222",
    };

    const res = await generateazaCerereDespagubireOmniasig(mockClaim, null);

    expect(res).toBeDefined();
    expect(res.fileName).toContain("cerere-despagubire-omniasig");
    expect(res.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(res.pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(res.blob).toBeInstanceOf(Blob);
  });

  it("generează cu succes PDF-ul când dataEveniment și CNP nu sunt specificate (mod formular de mână)", async () => {
    const mockClaim = {
      ...emptyClaim("in_lucru"),
      id: "claim-omniasig-2",
      numarInmatriculare: "B 999 XYZ",
      numarDosar: "OMN-112233",
      asigurator: "Omniasig VIG",
      client: "Ionescu Maria",
      cnp: "",
      dataEveniment: null,
    };

    const res = await generateazaCerereDespagubireOmniasig(mockClaim, null);

    expect(res).toBeDefined();
    expect(res.fileName).toContain("cerere-despagubire-omniasig");
    expect(res.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(res.pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(res.blob).toBeInstanceOf(Blob);
  });
});
