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

/**
 * Gap between the layout viewport bottom and the visual viewport bottom.
 * On some iOS PWAs this is non-zero and leaves a black letterbox under
 * `position: fixed; bottom: 0` chrome — pin fixed UI with this offset.
 */
export function getVisualViewportBottomGap(win = typeof window !== "undefined" ? window : null) {
  if (!win) return 0;
  try {
    const vv = win.visualViewport;
    if (!vv) return 0;
    const layoutH = Number(win.innerHeight) || 0;
    const visualBottom = (Number(vv.offsetTop) || 0) + (Number(vv.height) || 0);
    return Math.max(0, Math.round(layoutH - visualBottom));
  } catch {
    return 0;
  }
}

/** Writes --app-vvh / --app-vv-bottom-gap on <html> for CSS. */
export function syncAppViewportCssVars(win = typeof window !== "undefined" ? window : null) {
  if (!win?.document?.documentElement) return;
  const root = win.document.documentElement;
  try {
    const vv = win.visualViewport;
    const height = vv
      ? Math.round((Number(vv.height) || 0) + (Number(vv.offsetTop) || 0))
      : Number(win.innerHeight) || 0;
    const gap = getVisualViewportBottomGap(win);
    if (height > 0) root.style.setProperty("--app-vvh", `${height}px`);
    root.style.setProperty("--app-vv-bottom-gap", `${gap}px`);
  } catch {
    /* ignore */
  }
}
