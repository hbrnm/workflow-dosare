import { describe, it, expect } from "vitest";
import { isCompactMobileViewport } from "../viewport";

describe("isCompactMobileViewport", () => {
  it("treats portrait phone as mobile", () => {
    expect(isCompactMobileViewport({ innerWidth: 390, innerHeight: 844 })).toBe(true);
  });

  it("keeps landscape phone as mobile (shortest side)", () => {
    expect(isCompactMobileViewport({ innerWidth: 844, innerHeight: 390 })).toBe(true);
  });

  it("treats wide desktop as desktop", () => {
    expect(isCompactMobileViewport({ innerWidth: 1280, innerHeight: 800 })).toBe(false);
  });

  it("treats landscape tablet as desktop when both sides are wide", () => {
    expect(isCompactMobileViewport({ innerWidth: 1180, innerHeight: 820 })).toBe(false);
  });
});
