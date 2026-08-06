import { useCallback, useEffect, useState } from "react";
import {
  applyAppTokens,
  msUntilNextSchemeChange,
} from "../constants/appTokens";
import {
  loadThemePreference,
  resolveEffectiveScheme,
  saveThemePreference,
  THEME_PREF_EVENT,
} from "../utils/themePrefs";

/**
 * Temă zi/noapte — Auto (07–19 light) sau forțată light/dark din Setări.
 */
export function useDayNightTheme() {
  const [preference, setPreference] = useState(() => loadThemePreference());
  const [scheme, setScheme] = useState(() => resolveEffectiveScheme());

  const sync = useCallback(() => {
    const pref = loadThemePreference();
    const next = resolveEffectiveScheme(pref);
    setPreference(pref);
    setScheme(next);
    applyAppTokens(document.documentElement, next);
    try {
      delete document.documentElement.dataset.mtheme;
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.appThemePref = pref;
  }, []);

  const setThemePreference = useCallback((mode) => {
    saveThemePreference(mode);
    sync();
  }, [sync]);

  useEffect(() => {
    let timeoutId;
    let intervalId;

    const scheduleNext = () => {
      clearTimeout(timeoutId);
      if (loadThemePreference() !== "auto") return;
      timeoutId = window.setTimeout(() => {
        sync();
        scheduleNext();
      }, msUntilNextSchemeChange());
    };

    const onPrefChange = () => sync();

    sync();
    scheduleNext();
    intervalId = window.setInterval(() => {
      if (loadThemePreference() === "auto") sync();
    }, 60_000);

    window.addEventListener(THEME_PREF_EVENT, onPrefChange);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener(THEME_PREF_EVENT, onPrefChange);
    };
  }, [sync]);

  return { scheme, preference, setThemePreference };
}
