import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getHistoryState,
  pushAppState,
  replaceAppState,
  backIfOverlay,
} from "../appHistory";

function installHistoryMock() {
  let state = {};
  let href = "https://app.test/";
  const history = {
    get state() {
      return state;
    },
    replaceState(next, _t, url) {
      state = next || {};
      if (url) href = String(url);
    },
    pushState(next, _t, url) {
      state = next || {};
      if (url) href = String(url);
    },
    back: vi.fn(),
  };
  globalThis.window = {
    history,
    location: {
      get href() {
        return href;
      },
      get hash() {
        const i = href.indexOf("#");
        return i >= 0 ? href.slice(i) : "";
      },
    },
  };
  return history;
}

describe("appHistory", () => {
  let history;

  beforeEach(() => {
    history = installHistoryMock();
  });

  it("pushAppState merges into history.state", () => {
    pushAppState({ overlay: "alerte", mobileTab: "brief" }, "#alerte");
    expect(getHistoryState().overlay).toBe("alerte");
    expect(getHistoryState().appShell).toBe(true);
    expect(window.location.hash).toBe("#alerte");
  });

  it("replaceAppState updates current entry", () => {
    pushAppState({ overlay: "setari" }, "#setari");
    replaceAppState({ overlay: null, mobileTab: "dosare" }, "#m-dosare");
    expect(getHistoryState().overlay).toBe(null);
    expect(getHistoryState().mobileTab).toBe("dosare");
  });

  it("backIfOverlay closes and calls history.back when overlay matches", () => {
    const closeFn = vi.fn();
    const ref = { current: false };
    pushAppState({ overlay: "alerte" }, "#alerte");
    const ok = backIfOverlay("alerte", ref, closeFn);
    expect(ok).toBe(true);
    expect(closeFn).toHaveBeenCalledTimes(1);
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(true);
  });

  it("backIfOverlay returns false when overlay does not match", () => {
    const closeFn = vi.fn();
    replaceAppState({ overlay: null }, "/");
    expect(backIfOverlay("alerte", { current: false }, closeFn)).toBe(false);
    expect(closeFn).not.toHaveBeenCalled();
    expect(history.back).not.toHaveBeenCalled();
  });
});
