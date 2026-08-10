import { describe, it, expect } from "vitest";
import {
  resolveCerereDespagubireParties,
  isOmniasigAsigurator,
  isAsiromAsigurator,
  isCompanyClientName,
  resolveCerereDespagubireKind,
} from "../cerereDespagubire";

describe("isCompanyClientName", () => {
  it("detects Romanian company forms", () => {
    expect(isCompanyClientName("SC Auto Rapid SRL")).toBe(true);
    expect(isCompanyClientName("Transporturi SA")).toBe(true);
    expect(isCompanyClientName("Ion PFA")).toBe(true);
    expect(isCompanyClientName("S.C. Beta S.R.L.")).toBe(true);
    expect(isCompanyClientName("Popescu Ion")).toBe(false);
    expect(isCompanyClientName("")).toBe(false);
  });
});

describe("resolveCerereDespagubireParties", () => {
  it("person owner, no delegat → Subsemnatul = client, societate goala", () => {
    expect(resolveCerereDespagubireParties({ client: "Popescu Ion", delegat: "" })).toEqual({
      subsemnatul: "Popescu Ion",
      reprezentantSocietate: "",
      asCompanyOwner: false,
      hasSeparateDelegat: false,
      proprietar: "Popescu Ion",
    });
  });

  it("person owner, same delegat → treats as person", () => {
    const r = resolveCerereDespagubireParties({
      client: "Popescu Ion",
      delegat: "popescu  ion",
    });
    expect(r.asCompanyOwner).toBe(false);
    expect(r.hasSeparateDelegat).toBe(false);
    expect(r.subsemnatul).toBe("Popescu Ion");
    expect(r.reprezentantSocietate).toBe("");
  });

  it("firm owner + delegat → Subsemnatul = delegat, societate = firmă", () => {
    const r = resolveCerereDespagubireParties({
      client: "SC Auto SRL",
      delegat: "Ionescu Maria",
    });
    expect(r.asCompanyOwner).toBe(true);
    expect(r.hasSeparateDelegat).toBe(true);
    expect(r.subsemnatul).toBe("Ionescu Maria");
    expect(r.reprezentantSocietate).toBe("SC Auto SRL");
  });

  it("firm owner without delegat → societate = firmă, Subsemnatul gol", () => {
    const r = resolveCerereDespagubireParties({
      client: "Beta Transport SA",
      delegat: "",
    });
    expect(r.asCompanyOwner).toBe(true);
    expect(r.subsemnatul).toBe("");
    expect(r.reprezentantSocietate).toBe("Beta Transport SA");
  });

  it("person owner + other delegat → Subsemnatul = delegat, societate goala", () => {
    const r = resolveCerereDespagubireParties({
      client: "Popescu Ion",
      delegat: "Ionescu Maria",
    });
    expect(r.asCompanyOwner).toBe(false);
    expect(r.subsemnatul).toBe("Ionescu Maria");
    expect(r.reprezentantSocietate).toBe("");
  });

  it("always uses delegat for Subsemnatul when proprietar differs (uppercase / diacritics)", () => {
    const r = resolveCerereDespagubireParties({
      client: "POPESCU ION",
      delegat: "IONESCU MARIA",
    });
    expect(r.hasSeparateDelegat).toBe(true);
    expect(r.subsemnatul).toBe("IONESCU MARIA");

    const r2 = resolveCerereDespagubireParties({
      client: "Ștefan Popescu",
      delegat: "Stefan Popescu",
    });
    expect(r2.hasSeparateDelegat).toBe(false);
    expect(r2.subsemnatul).toBe("Ștefan Popescu");
  });

  it("accepts proprietar alias instead of client", () => {
    const r = resolveCerereDespagubireParties({
      proprietar: "SC Auto SRL",
      delegat: "Delegat Unu",
    });
    expect(r.proprietar).toBe("SC Auto SRL");
    expect(r.subsemnatul).toBe("Delegat Unu");
    expect(r.reprezentantSocietate).toBe("SC Auto SRL");
  });
});

describe("asigurator → tip cerere", () => {
  it("matches Omniasig / Asirom", () => {
    expect(isOmniasigAsigurator("Omniasig VIG")).toBe(true);
    expect(isAsiromAsigurator("Asirom VIG")).toBe(true);
    expect(resolveCerereDespagubireKind("Omniasig VIG")).toBe("omniasig");
    expect(resolveCerereDespagubireKind("Asirom VIG")).toBe("asirom");
    expect(resolveCerereDespagubireKind("Allianz-Țiriac")).toBe(null);
  });
});
