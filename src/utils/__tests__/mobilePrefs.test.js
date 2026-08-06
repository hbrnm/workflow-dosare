import { describe, it, expect, beforeEach } from "vitest";
import {
  MOBILE_TAB_KEY,
  MOBILE_LAST_CLAIM_KEY,
  MOBILE_COACH_KEY,
  loadMobileTab,
  saveMobileTab,
  loadLastCaptureClaimId,
  saveLastCaptureClaimId,
  isMobileCoachDismissed,
  dismissMobileCoach,
} from "../mobilePrefs";

function installMemoryStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("mobilePrefs", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("persists valid tabs and falls back for invalid ones", () => {
    expect(loadMobileTab()).toBe("capture");
    saveMobileTab("brief");
    expect(localStorage.getItem(MOBILE_TAB_KEY)).toBe("brief");
    expect(loadMobileTab()).toBe("brief");
    saveMobileTab("not-a-tab");
    expect(loadMobileTab()).toBe("brief");
  });

  it("remembers last capture claim id", () => {
    expect(loadLastCaptureClaimId()).toBeNull();
    saveLastCaptureClaimId("claim-1");
    expect(localStorage.getItem(MOBILE_LAST_CLAIM_KEY)).toBe("claim-1");
    expect(loadLastCaptureClaimId()).toBe("claim-1");
    saveLastCaptureClaimId(null);
    expect(loadLastCaptureClaimId()).toBeNull();
  });

  it("tracks coach dismissal", () => {
    expect(isMobileCoachDismissed()).toBe(false);
    dismissMobileCoach();
    expect(localStorage.getItem(MOBILE_COACH_KEY)).toBe("1");
    expect(isMobileCoachDismissed()).toBe(true);
  });
});
