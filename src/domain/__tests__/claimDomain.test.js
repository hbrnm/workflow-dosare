import { describe, it, expect } from "vitest";
import { canTransition } from "../claimWorkflow";
import { isValidVin, isValidRoPlate, isValidAmount, validateClaimInput } from "../claimValidation";

describe("canTransition", () => {
  it("permite fluxul normal și mutările înapoi", () => {
    expect(canTransition("deschidere", "piese_comandate").ok).toBe(true);
    expect(canTransition("in_lucru", "accept_plata").ok).toBe(true);
    expect(canTransition("accept_plata", "facturat").ok).toBe(true);
    expect(canTransition("facturat", "accept_plata").ok).toBe(true);
    expect(canTransition("in_lucru", "programat").ok).toBe(true);
  });
  it("blochează sărirea peste etapele financiare", () => {
    expect(canTransition("deschidere", "facturat").ok).toBe(false);
    expect(canTransition("in_lucru", "facturat").ok).toBe(false);
    expect(canTransition("piese_comandate", "accept_plata").ok).toBe(false);
  });
  it("mapează statusurile legacy", () => {
    expect(canTransition("predat_client", "facturat").ok).toBe(true);
    expect(canTransition("primit", "facturat").ok).toBe(false);
  });
});

describe("claimValidation", () => {
  it("VIN", () => {
    expect(isValidVin("WVWZZZ1JZXW000001")).toBe(true);
    expect(isValidVin("wvwzzz1jzxw000001")).toBe(true);
    expect(isValidVin("WVWZZZ1JZXW00000I")).toBe(false);
    expect(isValidVin("123")).toBe(false);
  });
  it("număr înmatriculare RO", () => {
    expect(isValidRoPlate("B 123 ABC")).toBe(true);
    expect(isValidRoPlate("cj12abc")).toBe(true);
    expect(isValidRoPlate("XYZ")).toBe(false);
  });
  it("sume", () => {
    expect(isValidAmount(0)).toBe(true);
    expect(isValidAmount("1500.5")).toBe(true);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(1e9)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
  });
  it("validateClaimInput separă erori de avertismente", () => {
    const r = validateClaimInput({ vin: "ABC", numarInmatriculare: "B 12 ABC", sumaDecont: -5 });
    expect(r.warnings.vin).toBeTruthy();
    expect(r.warnings.plate).toBeUndefined();
    expect(r.errors.sumaDecont).toBeTruthy();
  });
});
