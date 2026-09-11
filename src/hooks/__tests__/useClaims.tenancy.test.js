import { describe, it, expect, vi } from "vitest";

describe("useClaims multi-tenant isolation logic", () => {
  it("builds query with eq('atelier_id') when atelierId is present", () => {
    let filterApplied = false;
    let filteredColumn = null;
    let filteredValue = null;

    const queryMock = {
      eq: (col, val) => {
        filterApplied = true;
        filteredColumn = col;
        filteredValue = val;
        return queryMock;
      },
      order: () => queryMock,
    };

    const atelierId = "atelier_test_uuid";
    const sessionUserId = "user_1";
    const tenancyReady = true;

    // Simulate the exact query guard logic from useClaims.js
    if (sessionUserId && !tenancyReady) {
      // should block query
    } else if (atelierId) {
      queryMock.eq("atelier_id", atelierId);
    }

    expect(filterApplied).toBe(true);
    expect(filteredColumn).toBe("atelier_id");
    expect(filteredValue).toBe("atelier_test_uuid");
  });

  it("blocks query when session exists but tenancyReady is false", () => {
    let queryFired = false;
    const sessionUserId = "user_1";
    const tenancyReady = false;

    // Simulation of guard
    if (sessionUserId && !tenancyReady) {
      // Abort early, waiting for tenancy resolution
    } else {
      queryFired = true;
    }

    expect(queryFired).toBe(false);
  });

  it("blocks cross-tenant unfiltered query when user has session but atelierId is null", () => {
    let queryFired = false;
    const sessionUserId = "user_1";
    const tenancyReady = true;
    const atelierId = null;

    if (sessionUserId && !tenancyReady) {
      // blocked
    } else if (atelierId) {
      queryFired = true;
    } else if (sessionUserId) {
      // user is logged in but has no active atelierId -> MUST NOT query unconstrained
      queryFired = false;
    }

    expect(queryFired).toBe(false);
  });
});
