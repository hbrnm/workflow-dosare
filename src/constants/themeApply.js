import { APP_TOKEN_DEFAULTS } from "./appTokens";
import { getMobileTheme } from "./mobileThemes";
import { darkenHex } from "./branding";

/** Map mobile theme CSS vars to desktop app tokens. */
const M_TO_APP = {
  "--m-bg": ["--app-bg", "--app-surface-muted"],
  "--m-surface": ["--app-surface"],
  "--m-surface-2": ["--app-surface-2"],
  "--m-text": ["--app-text", "--app-text-strong"],
  "--m-muted": ["--app-muted", "--app-muted-2"],
  "--m-border": ["--app-border", "--app-border-soft"],
  "--m-header": ["--app-chrome"],
  "--m-header-text": ["--app-chrome-text"],
  "--m-nav": ["--app-chrome"],
  "--m-accent": ["--app-accent"],
  "--m-accent-text": ["--app-accent-text"],
  "--m-danger": ["--app-danger"],
  "--m-radius": ["--app-radius"],
  "--m-radius-sm": ["--app-radius-sm"],
  "--m-shadow": ["--app-shadow"],
};

/**
 * Build desktop `--app-*` tokens from a mobile theme definition.
 */
export function buildAppTokensFromTheme(theme) {
  const tokens = { ...APP_TOKEN_DEFAULTS };
  const vars = theme?.vars || {};

  Object.entries(M_TO_APP).forEach(([mKey, appKeys]) => {
    const val = vars[mKey];
    if (val == null) return;
    appKeys.forEach((appKey) => {
      tokens[appKey] = val;
    });
  });

  if (theme?.fonts?.body) tokens["--app-font-body"] = theme.fonts.body;
  if (theme?.fonts?.display) tokens["--app-font-display"] = theme.fonts.display;

  return tokens;
}

/**
 * Apply theme vars on `root` (documentElement): `--m-*` for modals, `--app-*` for desktop shell.
 * Optional `accentColor` from branding overrides theme accent.
 */
export function applyThemeToRoot(root, { themeId = "atelier", accentColor } = {}) {
  if (!root) return;

  const theme = getMobileTheme(themeId);
  root.dataset.mtheme = theme.id;

  Object.entries(theme.vars || {}).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  if (theme.fonts?.body) root.style.setProperty("--m-font-body", theme.fonts.body);
  if (theme.fonts?.display) root.style.setProperty("--m-font-display", theme.fonts.display);

  const appTokens = buildAppTokensFromTheme(theme);
  Object.entries(appTokens).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  const accent = accentColor || appTokens["--app-accent"];
  if (accent) {
    root.style.setProperty("--app-accent", accent);
    root.style.setProperty("--brand-accent", accent);
    root.style.setProperty("--app-accent-hover", darkenHex(accent, 0.12));
  }
}
