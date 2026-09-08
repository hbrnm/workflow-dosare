import { describe, it, expect } from "vitest";
import { WA_TEMPLATES } from "../dateUtils";

describe("WA_TEMPLATES acte", () => {
  it("builds solicitare acte message with dosar + inmatriculare and Auto Wash signature", () => {
    const acte = WA_TEMPLATES.find((t) => t.key === "acte");
    expect(acte).toBeTruthy();
    const msg = acte.text({
      numarDosar: "10326844",
      numarInmatriculare: "B167CRD",
    });
    expect(msg).toContain("10326844 / B167CRD");
    expect(msg).toContain("aprobarea de reparatie");
    expect(msg).toContain("imputernicire leasing + imputernicire utilizator");
    expect(msg).toContain("Alex, Auto Wash");
    expect(msg).not.toContain("talon");
  });

  it("builds tracking link message with claim details and brand name", () => {
    const tracking = WA_TEMPLATES.find((t) => t.key === "tracking");
    expect(tracking).toBeTruthy();
    const msg = tracking.text(
      {
        numarDosar: "2026-001",
        numarInmatriculare: "B999ABC",
        marcaModel: "VW Golf",
        trackingToken: "abcdef123456",
      },
      "Auto Service Pro"
    );
    expect(msg).toContain("VW Golf (B999ABC)");
    expect(msg).toContain("?track=abcdef123456");
    expect(msg).toContain("Echipa Auto Service Pro");
  });
});

