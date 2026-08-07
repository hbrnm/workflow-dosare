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
});
