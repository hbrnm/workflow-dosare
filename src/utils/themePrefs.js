import { resolveColorScheme } from "../constants/appTokens";

export const THEME_PREFERENCE_KEY = "workflow_dosare_theme_pref";
export const THEME_PREF_EVENT = "app-theme-preference-change";

/** @typedef {"auto"|"light"|"dark"} ThemePreference */
/** @typedef {"light"|"dark"} ColorScheme */

export const THEME_PREFERENCES = /** @type {const} */ (["auto", "light", "dark"]);

/** @returns {ThemePreference} */
export function loadThemePreference() {
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_KEY);
    return THEME_PREFERENCES.includes(raw) ? raw : "auto";
  } catch {
    return "auto";
  }
}

/** @param {ThemePreference} mode */
export function saveThemePreference(mode) {
  const valid = THEME_PREFERENCES.includes(mode) ? mode : "auto";
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, valid);
  } catch {
    /* ignore quota */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_PREF_EVENT, { detail: valid }));
  }
  return valid;
}

/**
 * @param {ThemePreference} [preference]
 * @param {Date} [date]
 * @returns {ColorScheme}
 */
export function resolveEffectiveScheme(preference = loadThemePreference(), date = new Date()) {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return resolveColorScheme(date);
}
