import { darkenHex } from "./branding";

/**
 * Tokeni desktop — dark shell (inspirat Cursor: negru, contrast soft, accent branding).
 */
export const APP_TOKEN_DEFAULTS = {
  "--app-bg": "#0a0a0a",
  "--app-surface": "#141414",
  "--app-surface-2": "#1a1a1a",
  "--app-surface-muted": "#242424",
  "--app-text": "#ededed",
  "--app-text-strong": "#ffffff",
  "--app-muted": "#8a8a8a",
  "--app-muted-2": "#666666",
  "--app-border": "#2a2a2a",
  "--app-border-soft": "#222222",
  "--app-chrome": "#0a0a0a",
  "--app-chrome-text": "#ededed",
  "--app-chrome-muted": "#737373",
  "--app-accent": "#C98A2B",
  "--app-accent-hover": "#B37A22",
  "--app-accent-text": "#ffffff",
  "--app-danger": "#e05a4f",
  "--app-success": "#4ade80",
  "--app-radius": "8px",
  "--app-radius-sm": "6px",
  "--app-radius-lg": "12px",
  "--app-shadow": "none",
  "--app-font-body": "'Inter', system-ui, sans-serif",
  "--app-font-display": "'Inter', system-ui, sans-serif",
};

/** Aplică tokeni desktop pe root (documentElement). */
export function applyAppTokens(element, { accentColor } = {}) {
  if (!element) return;
  Object.entries(APP_TOKEN_DEFAULTS).forEach(([key, val]) => {
    element.style.setProperty(key, val);
  });
  const accent = accentColor || APP_TOKEN_DEFAULTS["--app-accent"];
  element.style.setProperty("--app-accent", accent);
  element.style.setProperty("--brand-accent", accent);
  element.style.setProperty("--app-accent-hover", darkenHex(accent, 0.12));
}
