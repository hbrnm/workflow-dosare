import { describe, it, expect, beforeEach } from "vitest";
import {
  ONBOARDING_KEY,
  isOnboardingDismissed,
  dismissOnboarding,
  resetOnboarding,
} from "../onboardingPrefs";

function installMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("onboardingPrefs", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("starts not dismissed and persists dismiss", () => {
    expect(isOnboardingDismissed()).toBe(false);
    dismissOnboarding();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe("1");
    expect(isOnboardingDismissed()).toBe(true);
  });

  it("reset clears the flag", () => {
    dismissOnboarding();
    resetOnboarding();
    expect(isOnboardingDismissed()).toBe(false);
  });
});
