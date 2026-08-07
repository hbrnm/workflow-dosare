/** Clase shell modale — desktop minimalist vs mobil tematic. */

export function modalOverlayClass(desktopUi, { dense = false } = {}) {
  if (desktopUi) {
    return dense
      ? "app-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 overflow-hidden"
      : "app-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto";
  }
  // z-[9000]: above floating search (z-50). Edge-to-edge — no leftover bottom chrome.
  return dense
    ? "m-themed-modal fixed inset-0 z-[9000] bg-[var(--app-bg)] flex items-stretch justify-center p-0 overflow-hidden"
    : "m-themed-modal fixed inset-0 z-[9000] bg-[var(--app-bg)] flex items-stretch justify-center p-0 overflow-hidden";
}

export function modalOverlayProps(desktopUi, themeId) {
  return desktopUi ? {} : { "data-mtheme": themeId || "atelier" };
}

export function modalPanelClass(desktopUi, extra = "") {
  const base = desktopUi ? "app-modal-panel" : "m-modal-panel";
  return extra ? `${base} ${extra}` : base;
}

export function modalHeaderClass(desktopUi, extra = "") {
  const base = desktopUi ? "app-modal-header" : "m-modal-header";
  return extra ? `${base} ${extra}` : base;
}
