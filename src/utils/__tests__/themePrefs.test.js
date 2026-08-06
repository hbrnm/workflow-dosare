import { describe, it, expect, beforeEach } from "vitest";
import {
  loadThemePreference,
  saveThemePreference,
  resolveEffectiveScheme,
  THEME_PREFERENCE_KEY,
} from "../themePrefs";

function installMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("themePrefs", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("defaults to auto", () => {
    expect(loadThemePreference()).toBe("auto");
  });

  it("saveThemePreference persists valid mode", () => {
    saveThemePreference("dark");
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("dark");
    expect(loadThemePreference()).toBe("dark");
  });

  it("resolveEffectiveScheme respects manual override", () => {
    expect(resolveEffectiveScheme("light")).toBe("light");
    expect(resolveEffectiveScheme("dark")).toBe("dark");
  });

  it("resolveEffectiveScheme uses clock when auto", () => {
    expect(resolveEffectiveScheme("auto", new Date(2026, 7, 6, 12, 0))).toBe("light");
    expect(resolveEffectiveScheme("auto", new Date(2026, 7, 6, 22, 0))).toBe("dark");
  });
});
