import { describe, it, expect } from "vitest";
import PartsLifecyclePanel, { PART_STATUSES, COMMON_SUPPLIERS } from "../PartsLifecyclePanel";
import { Tag, Package, Plus, Trash2, Building, DollarSign, Truck } from "lucide-react";

describe("PartsLifecyclePanel", () => {
  it("exports default component and status constants", () => {
    expect(typeof PartsLifecyclePanel).toBe("function");
    expect(Array.isArray(PART_STATUSES)).toBe(true);
    expect(PART_STATUSES.length).toBeGreaterThan(0);
    expect(PART_STATUSES.some((s) => s.id === "comandat")).toBe(true);
    expect(PART_STATUSES.some((s) => s.id === "sosit")).toBe(true);
  });

  it("exports common suppliers list", () => {
    expect(Array.isArray(COMMON_SUPPLIERS)).toBe(true);
    expect(COMMON_SUPPLIERS).toContain("Autonet");
    expect(COMMON_SUPPLIERS).toContain("Unix Auto");
  });

  it("verifies all required Lucide icons exist", () => {
    [Tag, Package, Plus, Trash2, Building, DollarSign, Truck].forEach((Icon) => {
      expect(Icon).toBeDefined();
    });
  });
});
