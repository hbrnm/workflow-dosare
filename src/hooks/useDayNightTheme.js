import { useEffect, useState } from "react";
import {
  applyAppTokens,
  msUntilNextSchemeChange,
  resolveColorScheme,
} from "../constants/appTokens";

/**
 * Temă automată zi/noapte — alb 07:00–19:00, negru restul.
 * Programează următoarea schimbare și re-verifică periodic (tab în fundal).
 */
export function useDayNightTheme() {
  const [scheme, setScheme] = useState(() => resolveColorScheme());

  useEffect(() => {
    let timeoutId;
    let intervalId;

    const sync = () => {
      const next = resolveColorScheme();
      setScheme(next);
      applyAppTokens(document.documentElement, next);
      try {
        delete document.documentElement.dataset.mtheme;
      } catch {
        /* ignore */
      }
    };

    const scheduleNext = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        sync();
        scheduleNext();
      }, msUntilNextSchemeChange());
    };

    sync();
    scheduleNext();
    intervalId = window.setInterval(sync, 60_000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return scheme;
}
