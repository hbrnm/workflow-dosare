/** Ore locale — zi: fundal deschis, noapte: fundal întunecat. */
export const DAY_START_HOUR = 7;
export const NIGHT_START_HOUR = 19;

/**
 * Design system shared tokens.
 * Type scale: xs 12 / sm 13 / md 14 / lg 16 / xl 20
 * Weights: regular 400, medium 500, semibold 600
 * Radius: sm 6 / md 8 / lg 12 / pill 9999
 */
const SHARED_TOKENS = {
  "--app-danger": "#cf222e",
  "--app-danger-hover": "#a40e26",
  "--app-danger-muted": "#ffebe9",
  "--app-danger-text": "#ffffff",
  "--app-success": "#1a7f37",
  "--app-success-muted": "#dafbe1",
  "--app-warning": "#9a6700",
  "--app-warning-muted": "#fff8c5",
  "--app-radius": "8px",
  "--app-radius-sm": "6px",
  "--app-radius-lg": "12px",
  "--app-radius-pill": "9999px",
  "--app-shadow": "none",
  "--app-shadow-overlay": "0 16px 48px rgba(0, 0, 0, 0.18)",
  "--app-font-body": "'Inter', system-ui, sans-serif",
  "--app-font-display": "'Inter', system-ui, sans-serif",
  "--app-font-mono": "'JetBrains Mono', ui-monospace, monospace",
  "--app-type-xs": "0.75rem",
  "--app-type-sm": "0.8125rem",
  "--app-type-md": "0.875rem",
  "--app-type-lg": "1rem",
  "--app-type-xl": "1.25rem",
  "--app-btn-height": "2rem",
  "--app-btn-height-lg": "2.5rem",
};

/** Noapte — dark confortabil (GitHub-inspired). */
export const APP_TOKEN_DARK = {
  ...SHARED_TOKENS,
  "--app-bg": "#09090b",
  "--app-surface": "#121217",
  "--app-surface-2": "#18181f",
  "--app-surface-muted": "#21262d",
  "--app-text": "#c9d1d9",
  "--app-text-strong": "#e6edf3",
  "--app-muted": "#8b949e",
  "--app-muted-2": "#6e7681",
  "--app-border": "rgba(39, 39, 42, 0.6)",
  "--app-border-soft": "rgba(39, 39, 42, 0.3)",
  "--app-chrome": "#09090b",
  "--app-chrome-text": "#c9d1d9",
  "--app-chrome-muted": "#8b949e",
  "--app-accent": "#e6edf3",
  "--app-accent-hover": "#c9d1d9",
  "--app-accent-text": "#09090b",
  "--app-danger-muted": "#3d1f1f",
  "--app-success-muted": "#1a2e1f",
  "--app-warning-muted": "#3d2e00",
};

/** Zi — alb curat, ca aplicațiile native light. */
export const APP_TOKEN_LIGHT = {
  ...SHARED_TOKENS,
  "--app-bg": "#f8fafc",          // slate-50 canvas
  "--app-surface": "#ffffff",     // white cards/containers
  "--app-surface-2": "#f1f5f9",   // slate-100 borders/minor surfaces
  "--app-surface-muted": "#f1f5f9",
  "--app-text": "#334155",        // slate-700
  "--app-text-strong": "#0f172a", // slate-900
  "--app-muted": "#64748b",       // slate-500
  "--app-muted-2": "#94a3b8",     // slate-400
  "--app-border": "#e2e8f0",      // slate-200
  "--app-border-soft": "#f1f5f9", // slate-100
  "--app-chrome": "#09090b",      // zinc-950 (Dark chrome)
  "--app-chrome-text": "#d4d4d8", // zinc-300
  "--app-chrome-muted": "#a1a1aa",// zinc-400
  "--app-accent": "#fbbf24",      // amber-400
  "--app-accent-hover": "#fcd34d",// amber-300
  "--app-accent-text": "#09090b", // zinc-950
};

/** @deprecated — folosește APP_TOKEN_DARK */
export const APP_TOKEN_DEFAULTS = APP_TOKEN_DARK;

export const COLOR_SCHEME_META = {
  light: "#ffffff",
  dark: "#0d1117",
};

/** @returns {"light"|"dark"} */
export function resolveColorScheme(date = new Date()) {
  const hour = date.getHours();
  if (hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR) return "light";
  return "dark";
}

/** Milisecunde până la următoarea schimbare automată de temă. */
export function msUntilNextSchemeChange(date = new Date()) {
  const hour = date.getHours();
  const next = new Date(date);

  if (hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR) {
    next.setHours(NIGHT_START_HOUR, 0, 0, 0);
  } else if (hour >= NIGHT_START_HOUR) {
    next.setDate(next.getDate() + 1);
    next.setHours(DAY_START_HOUR, 0, 0, 0);
  } else {
    next.setHours(DAY_START_HOUR, 0, 0, 0);
  }

  return Math.max(1000, next.getTime() - date.getTime());
}

export function getTokensForScheme(scheme = "dark") {
  return scheme === "light" ? APP_TOKEN_LIGHT : APP_TOKEN_DARK;
}

/** Aplică tokeni pe root — temă zi/noapte automată sau forțată. */
export function applyAppTokens(element, scheme = resolveColorScheme()) {
  if (!element) return;
  const tokens = getTokensForScheme(scheme);
  Object.entries(tokens).forEach(([key, val]) => {
    element.style.setProperty(key, val);
  });
  element.style.setProperty("--brand-accent", tokens["--app-accent"]);
  element.dataset.appTheme = scheme;
  element.style.colorScheme = scheme;

  const metaColor = COLOR_SCHEME_META[scheme] || COLOR_SCHEME_META.dark;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", metaColor);
}
