import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isIosDevice,
  isStandaloneDisplay,
  shouldPromptPwaInstall,
  isPwaInstallDismissed,
  dismissPwaInstallPrompt,
  capturePwaInstallEvent,
  hasNativePwaInstallPrompt,
  promptNativePwaInstall,
} from "../pwaInstall";

function installMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("pwaInstall", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("detects iOS phones and iPadOS desktops with touch", () => {
    expect(isIosDevice({ userAgent: "Mozilla/iPhone", platform: "iPhone", maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
  });

  it("detects standalone display-mode", () => {
    expect(isStandaloneDisplay({
      matchMedia: (q) => ({ matches: q.includes("standalone") }),
      navigator: {},
    })).toBe(true);
    expect(isStandaloneDisplay({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    })).toBe(true);
    expect(isStandaloneDisplay({
      matchMedia: () => ({ matches: false }),
      navigator: {},
    })).toBe(false);
  });

  it("prompts only when not installed and not dismissed", () => {
    expect(shouldPromptPwaInstall({ standalone: false, dismissed: false })).toBe(true);
    expect(shouldPromptPwaInstall({ standalone: true, dismissed: false })).toBe(false);
    dismissPwaInstallPrompt();
    expect(isPwaInstallDismissed()).toBe(true);
    expect(shouldPromptPwaInstall({ standalone: false })).toBe(false);
  });

  it("stores and consumes a native beforeinstallprompt event", async () => {
    const prompt = vi.fn();
    capturePwaInstallEvent({
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    expect(hasNativePwaInstallPrompt()).toBe(true);
    const result = await promptNativePwaInstall();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("accepted");
    expect(hasNativePwaInstallPrompt()).toBe(false);
    expect(await promptNativePwaInstall()).toEqual({ outcome: "unavailable" });
  });
});
