import { describe, it, expect } from "vitest";
import {
  getClientStatusCopy,
  getClientProgressPercent,
  getClientPhaseIndex,
} from "../trackingCopy";

describe("trackingCopy", () => {
  it("returns friendly copy for known status", () => {
    const c = getClientStatusCopy("in_lucru");
    expect(c.title).toMatch(/reparație/i);
    expect(c.body.length).toBeGreaterThan(10);
  });

  it("maps phase index", () => {
    expect(getClientPhaseIndex("deschidere")).toBe(0);
    expect(getClientPhaseIndex("in_lucru")).toBe(1);
    expect(getClientPhaseIndex("accept_plata")).toBe(2);
  });

  it("progress peaks when ready or delivered", () => {
    expect(getClientProgressPercent({ status: "deschidere" })).toBeLessThan(50);
    expect(getClientProgressPercent({ status: "in_lucru", gataDeRidicare: true })).toBe(88);
    expect(getClientProgressPercent({ status: "accept_plata", ridicata: true })).toBe(100);
    expect(getClientProgressPercent({ status: "facturat" })).toBe(100);
  });
});
