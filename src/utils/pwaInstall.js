const PWA_INSTALL_DISMISS_KEY = "workflow_dosare_pwa_install_dismiss_v1";

export function isIosDevice(nav = typeof navigator !== "undefined" ? navigator : null) {
  if (!nav) return false;
  const ua = String(nav.userAgent || "");
  const iPhone = /iphone|ipad|ipod/i.test(ua);
  const iPadOs = nav.platform === "MacIntel" && Number(nav.maxTouchPoints || 0) > 1;
  return iPhone || iPadOs;
}

export function isStandaloneDisplay(win = typeof window !== "undefined" ? window : null) {
  if (!win) return false;
  try {
    if (win.matchMedia?.("(display-mode: standalone)")?.matches) return true;
    if (win.matchMedia?.("(display-mode: fullscreen)")?.matches) return true;
    if (win.navigator?.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function shouldPromptPwaInstall({
  standalone = isStandaloneDisplay(),
  dismissed = isPwaInstallDismissed(),
} = {}) {
  return !standalone && !dismissed;
}

export function isPwaInstallDismissed() {
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaInstallPrompt() {
  try {
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

let deferredInstallPrompt = null;

export function capturePwaInstallEvent(event) {
  if (!event) return;
  event.preventDefault?.();
  deferredInstallPrompt = event;
}

export function hasNativePwaInstallPrompt() {
  return Boolean(deferredInstallPrompt);
}

export async function promptNativePwaInstall() {
  const event = deferredInstallPrompt;
  if (!event?.prompt) return { outcome: "unavailable" };
  deferredInstallPrompt = null;
  event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" }));
  return choice || { outcome: "dismissed" };
}

export function listenForPwaInstallPrompt(target = typeof window !== "undefined" ? window : null) {
  if (!target?.addEventListener) return () => {};
  const onPrompt = (event) => capturePwaInstallEvent(event);
  target.addEventListener("beforeinstallprompt", onPrompt);
  return () => target.removeEventListener("beforeinstallprompt", onPrompt);
}
