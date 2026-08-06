/** Default white-label branding for a single workshop. */
export const DEFAULT_BRANDING = {
  atelierNume: "Dosare Daună",
  atelierShort: "WD",
  logoUrl: "",
  accentColor: "#C98A2B",
};

export const BRANDING_STORAGE_KEY = "workflow_dosare_branding";

export function normalizeBranding(raw = {}) {
  const accent = String(raw.accentColor || raw.accent_color || DEFAULT_BRANDING.accentColor).trim();
  const short = String(raw.atelierShort || raw.atelier_short || DEFAULT_BRANDING.atelierShort)
    .trim()
    .slice(0, 4)
    .toUpperCase() || DEFAULT_BRANDING.atelierShort;
  const name = String(raw.atelierNume || raw.atelier_nume || DEFAULT_BRANDING.atelierNume).trim()
    || DEFAULT_BRANDING.atelierNume;
  const logoUrl = String(raw.logoUrl || raw.logo_url || "").trim();

  return {
    atelierNume: name,
    atelierShort: short,
    logoUrl,
    accentColor: /^#[0-9A-Fa-f]{6}$/.test(accent) ? accent : DEFAULT_BRANDING.accentColor,
  };
}

export function loadCachedBranding() {
  try {
    const raw = JSON.parse(localStorage.getItem(BRANDING_STORAGE_KEY) || "null");
    return raw ? normalizeBranding(raw) : { ...DEFAULT_BRANDING };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export function cacheBranding(branding) {
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalizeBranding(branding)));
  } catch {
    /* ignore quota */
  }
}

/** Darken accent for gradients / hover. */
export function darkenHex(hex, amount = 0.15) {
  const h = (hex || DEFAULT_BRANDING.accentColor).replace("#", "");
  if (h.length !== 6) return DEFAULT_BRANDING.accentColor;
  const nums = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  });
  return `#${nums.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
