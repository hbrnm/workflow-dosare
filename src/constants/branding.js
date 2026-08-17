/** Cold defaults — never show these as workshop identity. */
export const DEFAULT_BRANDING = {
  atelierNume: "",
  atelierShort: "",
  logoUrl: "",
};

export const PLACEHOLDER_ATELIER_NAMES = [
  "Dosare Daună",
  "Dosare Dauna",
  "Workflow Dosare",
  "Workflow Daune 2.0",
  "Daune 2.0",
];

export const PLACEHOLDER_ATELIER_SHORTS = ["WD", "DD"];

export const BRANDING_STORAGE_KEY = "workflow_dosare_branding";

function normalizeNameKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isPlaceholderAtelierName(name) {
  const raw = String(name || "").trim();
  if (!raw) return true;
  const key = normalizeNameKey(raw);
  return PLACEHOLDER_ATELIER_NAMES.some((n) => normalizeNameKey(n) === key);
}

export function isPlaceholderAtelierShort(short) {
  const s = String(short || "").trim().toUpperCase();
  if (!s) return true;
  return PLACEHOLDER_ATELIER_SHORTS.includes(s);
}

export function atelierInitials(name, fallback = "") {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  const letters = words
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (!letters.length) return fallback;
  if (letters.length === 1) return letters[0].slice(0, 2).toUpperCase();
  return `${letters[0][0]}${letters[1][0]}`.toUpperCase();
}

export function needsBrandingSetup(branding) {
  return isPlaceholderAtelierName(branding?.atelierNume);
}

function pickRealName(...candidates) {
  for (const c of candidates) {
    const name = String(c || "").trim();
    if (name && !isPlaceholderAtelierName(name)) return name;
  }
  return "";
}

function pickRealShort(...candidates) {
  for (const c of candidates) {
    const short = String(c || "").trim();
    if (short && !isPlaceholderAtelierShort(short)) return short.slice(0, 4).toUpperCase();
  }
  return "";
}

export function mergeAtelierBranding(settingsBranding = {}, atelier = null) {
  const settings = normalizeBranding(settingsBranding || {});
  const name = pickRealName(settings.atelierNume, atelier?.nume);
  const logoUrl = String(settings.logoUrl || atelier?.logo_url || "").trim();
  const atelierShort =
    pickRealShort(settings.atelierShort, atelier?.short) || atelierInitials(name);
  return {
    atelierNume: name,
    atelierShort,
    logoUrl,
  };
}

/** Branding safe for chrome (login, sidebar, header) — never product placeholders. */
export function resolveDisplayBranding(raw = {}) {
  const b = normalizeBranding(raw || {});
  if (isPlaceholderAtelierName(b.atelierNume)) {
    return {
      atelierNume: "",
      atelierShort: "",
      logoUrl: b.logoUrl || "",
    };
  }
  return {
    atelierNume: b.atelierNume,
    atelierShort: isPlaceholderAtelierShort(b.atelierShort)
      ? atelierInitials(b.atelierNume)
      : b.atelierShort,
    logoUrl: b.logoUrl || "",
  };
}

export function normalizeBranding(raw = {}) {
  const name = String(raw.atelierNume || raw.atelier_nume || "").trim();
  const shortRaw = String(raw.atelierShort || raw.atelier_short || "").trim();
  const short =
    (shortRaw || atelierInitials(name)).slice(0, 4).toUpperCase();
  const logoUrl = String(raw.logoUrl || raw.logo_url || "").trim();

  return {
    atelierNume: name,
    atelierShort: short,
    logoUrl,
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

/** Darken hex for gradients / hover. */
export function darkenHex(hex, amount = 0.15) {
  const fallback = "#e6edf3";
  const h = (hex || fallback).replace("#", "");
  if (h.length !== 6) return fallback;
  const nums = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  });
  return `#${nums.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
