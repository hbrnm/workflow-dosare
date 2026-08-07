import { describe, it, expect } from "vitest";
import {
  isCompactMobileViewport,
  getVisualViewportBottomGap,
  syncAppViewportCssVars,
} from "../viewport";

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

describe("getVisualViewportBottomGap", () => {
  it("returns 0 when visual viewport fills the layout height", () => {
    const win = {
      innerHeight: 800,
      visualViewport: { offsetTop: 0, height: 800 },
    };
    expect(getVisualViewportBottomGap(win)).toBe(0);
  });

  it("returns the letterbox gap under the visual viewport", () => {
    const win = {
      innerHeight: 844,
      visualViewport: { offsetTop: 0, height: 760 },
    };
    expect(getVisualViewportBottomGap(win)).toBe(84);
  });
});

describe("syncAppViewportCssVars", () => {
  it("writes CSS vars on documentElement", () => {
    const props = {};
    const win = {
      innerHeight: 844,
      visualViewport: { offsetTop: 0, height: 800 },
      document: {
        documentElement: {
          style: {
            setProperty: (k, v) => {
              props[k] = v;
            },
          },
        },
      },
    };
    syncAppViewportCssVars(win);
    expect(props["--app-vvh"]).toBe("800px");
    expect(props["--app-vv-bottom-gap"]).toBe("44px");
  });
});
