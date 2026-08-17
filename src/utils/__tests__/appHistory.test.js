import { describe, it, expect, beforeEach, vi } from "vitest";
import { createBackStack } from "../appHistory";

function installHistoryMock() {
  let entries = [{ state: {}, url: "https://app.test/" }];
  let index = 0;
  const history = {
    get state() {
      return entries[index]?.state || {};
    },
    replaceState(next, _t, url) {
      entries[index] = { state: next || {}, url: url ? String(url) : entries[index].url };
    },
    pushState(next, _t, url) {
      entries = entries.slice(0, index + 1);
      entries.push({ state: next || {}, url: url ? String(url) : entries[index].url });
      index = entries.length - 1;
    },
    back: vi.fn(() => {
      if (index > 0) index -= 1;
    }),
    get length() {
      return entries.length;
    },
  };
  globalThis.window = {
    history,
    location: {
      get href() {
        return entries[index]?.url || "https://app.test/";
      },
      get hash() {
        const href = entries[index]?.url || "";
        const i = href.indexOf("#");
        return i >= 0 ? href.slice(i) : "";
      },
    },
  };
  return history;
}

describe("createBackStack", () => {
  let stack;
  let history;

  beforeEach(() => {
    history = installHistoryMock();
    stack = createBackStack();
    stack.resetHome();
  });

  it("starts at home with depth 1 (Back can exit)", () => {
    expect(stack.depth()).toBe(1);
    expect(stack.top()).toEqual({ t: "home" });
    expect(stack.handlePopState()).toBe(null);
  });

  it("tab push then browser Back returns home", () => {
    stack.push({ t: "tab", tab: "dosare" });
    expect(stack.depth()).toBe(2);
    expect(history.length).toBe(2);
    const frame = stack.handlePopState();
    expect(frame).toEqual({ t: "home" });
    expect(stack.depth()).toBe(1);
  });

  it("alerte overlay Back returns to previous tab/home", () => {
    stack.push({ t: "tab", tab: "dosare" });
    stack.push({ t: "overlay", name: "alerte", alerteTab: "blocate", tab: "dosare" });
    expect(stack.depth()).toBe(3);
    const frame = stack.handlePopState();
    expect(frame).toEqual({ t: "tab", tab: "dosare" });
    const home = stack.handlePopState();
    expect(home).toEqual({ t: "home" });
    expect(stack.handlePopState()).toBe(null);
  });

  it("dismiss via X pops without double-pop on next handlePopState", () => {
    stack.push({ t: "overlay", name: "setari", tab: "brief" });
    expect(stack.dismiss((f) => f.name === "setari")).toBe(true);
    expect(history.back).toHaveBeenCalled();
    // Simulated popstate after history.back
    const frame = stack.handlePopState();
    expect(frame).toEqual({ t: "home" });
    expect(stack.depth()).toBe(1);
  });

  it("replaceTop swaps alerte for field", () => {
    stack.push({ t: "overlay", name: "alerte", alerteTab: "blocate", tab: "brief" });
    stack.replaceTop({ t: "overlay", name: "field", id: "c1", tab: "brief" });
    expect(stack.top()).toMatchObject({ name: "field", id: "c1" });
    expect(stack.depth()).toBe(2);
    expect(stack.handlePopState()).toEqual({ t: "home" });
  });

  it("liveCamera on field Back returns to field", () => {
    stack.push({ t: "overlay", name: "field", id: "c1", tab: "brief" });
    stack.push({ t: "overlay", name: "liveCamera", id: "c1", tab: "brief" });
    expect(stack.handlePopState()).toMatchObject({ name: "field", id: "c1" });
    expect(stack.handlePopState()).toEqual({ t: "home" });
  });

  it("inbox overlay Back returns home", () => {
    stack.push({ t: "overlay", name: "inbox", id: "lucru", tab: "brief" });
    expect(stack.handlePopState()).toEqual({ t: "home" });
    expect(stack.handlePopState()).toBe(null);
  });

  it("dedupes identical pushes", () => {
    stack.push({ t: "tab", tab: "dosare" });
    stack.push({ t: "tab", tab: "dosare" });
    expect(stack.depth()).toBe(2);
  });
});
