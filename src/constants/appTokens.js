import { darkenHex } from "./branding";

/**
 * Tokeni vizuali desktop — stil minimalist, independent de temele mobile.
 */
export const APP_TOKEN_DEFAULTS = {
  "--app-bg": "#F7F7F5",
  "--app-surface": "#FFFFFF",
  "--app-surface-2": "#F3F3F1",
  "--app-surface-muted": "#EBEBE8",
  "--app-text": "#1A1A1A",
  "--app-text-strong": "#0D0D0D",
  "--app-muted": "#737373",
  "--app-muted-2": "#A3A3A3",
  "--app-border": "#E5E5E0",
  "--app-border-soft": "#EDEDEA",
  "--app-chrome": "#FFFFFF",
  "--app-chrome-text": "#1A1A1A",
  "--app-chrome-muted": "#737373",
  "--app-accent": "#C98A2B",
  "--app-accent-hover": "#B37A22",
  "--app-accent-text": "#FFFFFF",
  "--app-danger": "#B23A2E",
  "--app-success": "#3E6B45",
  "--app-radius": "8px",
  "--app-radius-sm": "6px",
  "--app-radius-lg": "12px",
  "--app-shadow": "0 1px 2px rgba(0,0,0,0.04)",
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
