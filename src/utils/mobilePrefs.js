export const MOBILE_TAB_KEY = "workflow_dosare_mobile_tab";
export const MOBILE_LAST_CLAIM_KEY = "workflow_dosare_mobile_last_claim";
export const MOBILE_COACH_KEY = "workflow_dosare_mobile_coach_v1";

export const MOBILE_TABS = ["capture", "brief", "dosare", "programari"];

export function loadMobileTab() {
  try {
    const id = localStorage.getItem(MOBILE_TAB_KEY);
    return MOBILE_TABS.includes(id) ? id : "brief";
  } catch {
    return "brief";
  }
}

export function saveMobileTab(id) {
  try {
    if (MOBILE_TABS.includes(id)) localStorage.setItem(MOBILE_TAB_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadLastCaptureClaimId() {
  try {
    return localStorage.getItem(MOBILE_LAST_CLAIM_KEY) || null;
  } catch {
    return null;
  }
}

export function saveLastCaptureClaimId(id) {
  try {
    if (id) localStorage.setItem(MOBILE_LAST_CLAIM_KEY, id);
    else localStorage.removeItem(MOBILE_LAST_CLAIM_KEY);
  } catch {
    /* ignore */
  }
}

export function isMobileCoachDismissed() {
  try {
    return localStorage.getItem(MOBILE_COACH_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissMobileCoach() {
  try {
    localStorage.setItem(MOBILE_COACH_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Short tactile pulse when the device supports it (ignored if blocked). */
export function softHaptic(ms = 12) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}
