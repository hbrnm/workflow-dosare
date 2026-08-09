import { describe, it, expect } from "vitest";
import { normalizeBilling } from "../billing";

describe("normalizeBilling", () => {
  it("defaults to trial with seat math", () => {
    const b = normalizeBilling({ memberCount: 3, seatLimit: 10 });
    expect(b.plan).toBe("trial");
    expect(b.seatsLeft).toBe(7);
    expect(b.canInvite).toBe(true);
    expect(b.canCreateClaim).toBe(true);
  });

  it("blocks invite when over seats or canceled", () => {
    expect(normalizeBilling({ plan: "active", memberCount: 10, seatLimit: 10 }).canInvite).toBe(false);
    expect(normalizeBilling({ plan: "canceled", memberCount: 1, seatLimit: 10 }).canInvite).toBe(false);
    expect(normalizeBilling({ plan: "canceled" }).canCreateClaim).toBe(false);
  });

  it("marks expired trial as past_due", () => {
    const b = normalizeBilling({
      plan: "trial",
      trialEndsAt: "2020-01-01T00:00:00.000Z",
      memberCount: 1,
      seatLimit: 5,
    });
    expect(b.plan).toBe("past_due");
    expect(b.trialEnded).toBe(true);
  });
});
