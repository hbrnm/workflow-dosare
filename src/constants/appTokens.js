/**
 * Tokeni desktop — dark confortabil (inspirat GitHub dark: off-black, text moale).
 * Contrast redus față de negru pur + alb strident — mai puțin obositor la citire lungă.
 */
export const APP_TOKEN_DEFAULTS = {
  "--app-bg": "#0d1117",
  "--app-surface": "#161b22",
  "--app-surface-2": "#1c2128",
  "--app-surface-muted": "#21262d",
  "--app-text": "#c9d1d9",
  "--app-text-strong": "#e6edf3",
  "--app-muted": "#8b949e",
  "--app-muted-2": "#6e7681",
  "--app-border": "#30363d",
  "--app-border-soft": "#21262d",
  "--app-chrome": "#010409",
  "--app-chrome-text": "#c9d1d9",
  "--app-chrome-muted": "#8b949e",
  "--app-accent": "#e6edf3",
  "--app-accent-hover": "#c9d1d9",
  "--app-accent-text": "#0d1117",
  "--app-danger": "#f85149",
  "--app-danger-muted": "#3d1f1f",
  "--app-success": "#3fb950",
  "--app-success-muted": "#1a2e1f",
  "--app-radius": "8px",
  "--app-radius-sm": "6px",
  "--app-radius-lg": "12px",
  "--app-shadow": "none",
  "--app-font-body": "'Inter', system-ui, sans-serif",
  "--app-font-display": "'Inter', system-ui, sans-serif",
};

/** Aplică tokeni pe root (documentElement) — temă fixă neagră, fără accent personalizabil. */
export function applyAppTokens(element) {
  if (!element) return;
  Object.entries(APP_TOKEN_DEFAULTS).forEach(([key, val]) => {
    element.style.setProperty(key, val);
  });
  element.style.setProperty("--brand-accent", APP_TOKEN_DEFAULTS["--app-accent"]);
}
