/**
 * Mobile / PWA back-stack helpers — overlays & tabs stay in History API
 * so Android back / iOS swipe / browser back return to the previous screen
 * instead of leaving the app.
 */

export function getHistoryState() {
  try {
    return window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  } catch {
    return {};
  }
}

export function pushAppState(partial, url) {
  const next = { appShell: true, ...getHistoryState(), ...partial };
  window.history.pushState(next, "", url || window.location.href);
  return next;
}

export function replaceAppState(partial, url) {
  const next = { appShell: true, ...getHistoryState(), ...partial };
  window.history.replaceState(next, "", url || window.location.href);
  return next;
}

/**
 * Close via UI (X): drop matching history entry.
 * Closes React state first, then history.back() with a guard so popstate
 * does not double-handle.
 */
export function backIfOverlay(overlayKey, isNavigatingRef, closeFn) {
  const state = getHistoryState();
  if (state.overlay === overlayKey) {
    if (isNavigatingRef) isNavigatingRef.current = true;
    try {
      closeFn?.();
    } catch {
      /* ignore */
    }
    window.history.back();
    globalThis.setTimeout(() => {
      if (isNavigatingRef) isNavigatingRef.current = false;
    }, 80);
    return true;
  }
  return false;
}
