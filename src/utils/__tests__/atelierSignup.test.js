import { describe, it, expect } from "vitest";
import { slugifyAtelierName, shortFromName, validateAtelierSignup } from "../atelierSignup";

describe("atelierSignup", () => {
  it("slugifies and shorts names", () => {
    expect(slugifyAtelierName("Service Rapid SRL")).toBe("service-rapid-srl");
    expect(shortFromName("Service Rapid")).toBe("SE");
  });

  it("validates required fields", () => {
    expect(validateAtelierSignup({ atelierNume: "A", email: "a@b.ro", password: "123456" })).toMatch(/atelier/i);
    expect(validateAtelierSignup({ atelierNume: "OK", email: "x", password: "123456" })).toMatch(/email/i);
    expect(validateAtelierSignup({ atelierNume: "OK", email: "a@b.ro", password: "123", passwordConfirm: "123" })).toMatch(/parola/i);
    expect(
      validateAtelierSignup({
        atelierNume: "OK",
        email: "a@b.ro",
        password: "123456",
        passwordConfirm: "654321",
      })
    ).toMatch(/coincid/i);
    expect(
      validateAtelierSignup({
        atelierNume: "OK",
        email: "a@b.ro",
        password: "123456",
        passwordConfirm: "123456",
      })
    ).toBeNull();
    expect(
      validateAtelierSignup({
        atelierNume: "OK",
        email: "a@b.ro",
        password: "123456",
        passwordConfirm: "123456",
        acceptDataResponsibility: false,
      })
    ).toMatch(/responsabil/i);
  });
});
