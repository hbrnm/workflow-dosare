/** Viewport helpers for mobile/desktop shell selection. */

/**
 * Prefer shortest side so phones stay "mobile" in landscape.
 * Using only width flips many phones to desktop when rotated.
 */
export function isCompactMobileViewport(win = typeof window !== "undefined" ? window : null) {
  if (!win) return false;
  try {
    const w = Number(win.innerWidth) || 0;
    const h = Number(win.innerHeight) || 0;
    return Math.min(w, h) < 768;
  } catch {
    return false;
  }
}
