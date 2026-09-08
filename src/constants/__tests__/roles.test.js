import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  resolveUserRole,
  canCreateClaim,
  canEditClaimFull,
  canEditWorkshop,
  canManageUsers,
  canInspectVehicle,
  canEditFinancials,
} from "../roles";

describe("roles v2", () => {
  it("normalizes legacy operator to receptioner and supports inspector & contabil", () => {
    expect(normalizeRole("operator")).toBe("receptioner");
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("mecanic")).toBe("mecanic");
    expect(normalizeRole("inspector")).toBe("inspector");
    expect(normalizeRole("constatator")).toBe("inspector");
    expect(normalizeRole("contabil")).toBe("contabil");
    expect(normalizeRole("financiar")).toBe("contabil");
  });

  it("resolves role from users list", () => {
    expect(
      resolveUserRole("a@x.ro", {
        usersList: [{ email: "a@x.ro", role: "mecanic" }],
        adminEmails: [],
      })
    ).toBe("mecanic");

    expect(
      resolveUserRole("c@x.ro", {
        usersList: [{ email: "c@x.ro", role: "contabil" }],
        adminEmails: [],
      })
    ).toBe("contabil");
  });

  it("bootstraps admin when no users configured", () => {
    expect(resolveUserRole("first@x.ro", { usersList: [], adminEmails: [] })).toBe("admin");
  });

  it("permissions by role", () => {
    expect(canCreateClaim("receptioner")).toBe(true);
    expect(canCreateClaim("inspector")).toBe(true);
    expect(canCreateClaim("mecanic")).toBe(false);
    expect(canInspectVehicle("inspector")).toBe(true);
    expect(canEditFinancials("contabil")).toBe(true);
    expect(canEditWorkshop("mecanic")).toBe(true);
    expect(canEditClaimFull("mecanic", { createdBy: "1" }, "1", "m@x.ro")).toBe(false);
    expect(canEditClaimFull("admin", {}, null, null)).toBe(true);
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("receptioner")).toBe(false);
    expect(canManageUsers("contabil")).toBe(false);
  });
});
