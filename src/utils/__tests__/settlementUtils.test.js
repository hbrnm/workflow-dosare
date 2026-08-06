import { describe, it, expect } from "vitest";
import {
  getEffectivePaymentDue,
  isPaymentOverdue,
  isSettlementCandidate,
  getSettlementAmount,
} from "../settlementUtils";

describe("settlementUtils", () => {
  it("uses explicit termenPlata", () => {
    expect(
      getEffectivePaymentDue({ termenPlata: "2026-09-01", financiar: { dataFactura: "2026-08-01" } })
    ).toBe("2026-09-01");
  });

  it("falls back to invoice + 30 days", () => {
    expect(getEffectivePaymentDue({ financiar: { dataFactura: "2026-08-01" } })).toBe("2026-08-31");
  });

  it("detects overdue unpaid invoiced claims", () => {
    const claim = {
      status: "facturat",
      incasat: false,
      termenPlata: "2020-01-01",
      sumaDecont: 1000,
    };
    expect(isSettlementCandidate(claim)).toBe(true);
    expect(isPaymentOverdue(claim)).toBe(true);
    expect(getSettlementAmount(claim)).toBe(1000);
  });

  it("ignores paid claims", () => {
    expect(
      isPaymentOverdue({ status: "facturat", incasat: true, termenPlata: "2020-01-01" })
    ).toBe(false);
  });
});
