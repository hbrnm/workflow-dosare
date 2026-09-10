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
    expect(msg).toContain("?t=abcdef123456");
    expect(msg).toContain("Echipa Auto Service Pro");
  });

  it("builds piese and gata templates with tracking token included", () => {
    const piese = WA_TEMPLATES.find((t) => t.key === "piese");
    const gata = WA_TEMPLATES.find((t) => t.key === "gata");
    const inLucru = WA_TEMPLATES.find((t) => t.key === "in_lucru");

    const claim = {
      numarDosar: "2026-001",
      numarInmatriculare: "B123XYZ",
      marcaModel: "Skoda Octavia",
      trackingToken: "TK-98765",
    };

    const pMsg = piese.text(claim, "Atelier Top");
    expect(pMsg).toContain("B123XYZ");
    expect(pMsg).toContain("?t=TK-98765");
    expect(pMsg).toContain("Atelier Top");

    const gMsg = gata.text(claim, "Atelier Top");
    expect(gMsg).toContain("finalizata si gata de ridicare");
    expect(gMsg).toContain("?t=TK-98765");

    const lMsg = inLucru.text(claim, "Atelier Top");
    expect(lMsg).toContain("a intrat in lucru");
    expect(lMsg).toContain("?t=TK-98765");
  });
});

