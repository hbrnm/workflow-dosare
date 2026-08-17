import { describe, it, expect } from "vitest";
import { isWhatsAppTemplateRecommended } from "../WhatsAppSheet";

describe("WhatsApp templates", () => {
  it("recommends the matching template for the claim stage", () => {
    expect(isWhatsAppTemplateRecommended({ status: "reparatie_finalizata" }, "gata")).toBe(true);
    expect(isWhatsAppTemplateRecommended({ status: "piese_comandate" }, "piese")).toBe(true);
    expect(isWhatsAppTemplateRecommended({ status: "deschidere" }, "acte")).toBe(true);
    expect(isWhatsAppTemplateRecommended({ status: "in_lucru" }, "gata")).toBe(false);
  });
});
