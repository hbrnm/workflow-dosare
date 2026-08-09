import { describe, it, expect } from "vitest";
import {
  resolveCerereDespagubireParties,
  isOmniasigAsigurator,
} from "../cerereDespagubire";

describe("resolveCerereDespagubireParties", () => {
  it("uses client when no separate delegat", () => {
    expect(resolveCerereDespagubireParties({ client: "Popescu Ion", delegat: "" })).toEqual({
      subsemnatul: "Popescu Ion",
      reprezentant: "",
      asCompanyRep: false,
      proprietar: "Popescu Ion",
    });
  });

  it("uses client when delegat equals owner", () => {
    const r = resolveCerereDespagubireParties({
      client: "Popescu Ion",
      delegat: "popescu  ion",
    });
    expect(r.asCompanyRep).toBe(false);
    expect(r.subsemnatul).toBe("Popescu Ion");
    expect(r.reprezentant).toBe("");
  });

  it("uses delegat as subsemnatul when different from owner", () => {
    const r = resolveCerereDespagubireParties({
      client: "SC Auto SRL",
      delegat: "Ionescu Maria",
    });
    expect(r.asCompanyRep).toBe(true);
    expect(r.subsemnatul).toBe("Ionescu Maria");
    expect(r.reprezentant).toBe("Ionescu Maria");
    expect(r.proprietar).toBe("SC Auto SRL");
  });
});

describe("isOmniasigAsigurator", () => {
  it("matches Omniasig variants", () => {
    expect(isOmniasigAsigurator("Omniasig VIG")).toBe(true);
    expect(isOmniasigAsigurator("OMNIASIG")).toBe(true);
    expect(isOmniasigAsigurator("Allianz")).toBe(false);
  });
});
