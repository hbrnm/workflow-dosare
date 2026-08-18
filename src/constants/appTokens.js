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

/** Noapte — Warm Charcoal / Slate cu accent Sky Blue vibrant. */
export const APP_TOKEN_DARK = {
  ...SHARED_TOKENS,
  "--app-bg": "#0f172a",           // slate-900 canvas
  "--app-surface": "#1e293b",      // slate-800 container/surface
  "--app-surface-2": "#334155",    // slate-700 interactive level
  "--app-surface-muted": "#334155",
  "--app-text": "#cbd5e1",         // slate-300
  "--app-text-strong": "#f8fafc",  // slate-50
  "--app-muted": "#94a3b8",        // slate-400
  "--app-muted-2": "#64748b",      // slate-500
  "--app-border": "rgba(255,255,255,0.08)",
  "--app-border-soft": "rgba(255,255,255,0.04)",
  "--app-chrome": "#0f172a",       // dark slate sidebar/header
  "--app-chrome-text": "#f8fafc",
  "--app-chrome-muted": "#94a3b8",
  "--app-accent": "#0284c7",       // vibrant sky-600 accent
  "--app-accent-hover": "#0369a1", // sky-700
  "--app-accent-text": "#ffffff",  // white text over sky blue
  "--app-danger-muted": "#450a0a",
  "--app-success-muted": "#064e3b",
  "--app-warning-muted": "#451a03",
};

/** Zi — alb curat & bg-slate-50, ca aplicațiile SaaS moderne. */
export const APP_TOKEN_LIGHT = {
  ...SHARED_TOKENS,
  "--app-bg": "#f8fafc",          // slate-50 canvas
  "--app-surface": "#ffffff",     // white cards/containers
  "--app-surface-2": "#f1f5f9",   // slate-100 minor surfaces
  "--app-surface-muted": "#f1f5f9",
  "--app-text": "#334155",        // slate-700
  "--app-text-strong": "#0f172a", // slate-900
  "--app-muted": "#64748b",       // slate-500
  "--app-muted-2": "#94a3b8",     // slate-400
  "--app-border": "#e2e8f0",      // slate-200
  "--app-border-soft": "#f1f5f9", // slate-100
  "--app-chrome": "#0f172a",      // slate-900 Dark chrome
  "--app-chrome-text": "#f8fafc", // slate-50
  "--app-chrome-muted": "#94a3b8",// slate-400
  "--app-accent": "#0284c7",      // vibrant sky-600 accent
  "--app-accent-hover": "#0369a1",// sky-700
  "--app-accent-text": "#ffffff", // white text over sky blue
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
