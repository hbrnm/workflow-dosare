/**
 * Tokeni vizuali partajați desktop ↔ mobil (bază Atelier).
 * Mobil le extinde via mobileThemes.css; desktop via .app-shell.
 */
export const APP_TOKEN_DEFAULTS = {
  "--app-bg": "#F5F2EB",
  "--app-surface": "#FFFFFF",
  "--app-surface-2": "#FAF8F5",
  "--app-surface-muted": "#EFEAE1",
  "--app-text": "#23282E",
  "--app-text-strong": "#1B2430",
  "--app-muted": "#6B6558",
  "--app-muted-2": "#8A8375",
  "--app-border": "#DAD4C6",
  "--app-border-soft": "#E0D9CC",
  "--app-chrome": "#1C2127",
  "--app-chrome-text": "#FFFFFF",
  "--app-accent": "#C98A2B",
  "--app-accent-hover": "#B37A22",
  "--app-accent-text": "#FFFFFF",
  "--app-danger": "#B23A2E",
  "--app-success": "#3E6B45",
  "--app-radius": "12px",
  "--app-radius-sm": "8px",
  "--app-radius-lg": "16px",
  "--app-shadow": "0 1px 2px rgba(0,0,0,0.06)",
  "--app-font-body": "'Inter', system-ui, sans-serif",
  "--app-font-display": "'Space Grotesk', sans-serif",
};

/** Aplică tokeni pe un element (root desktop shell). */
export function applyAppTokens(element, { accentColor } = {}) {
  if (!element) return;
  Object.entries(APP_TOKEN_DEFAULTS).forEach(([key, val]) => {
    element.style.setProperty(key, val);
  });
  if (accentColor) {
    element.style.setProperty("--app-accent", accentColor);
    element.style.setProperty("--brand-accent", accentColor);
  }
}
