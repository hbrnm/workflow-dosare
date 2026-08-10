import { useEffect } from "react";

/**
 * Escape closes an overlay. Use `ignore` to defer (nested confirm / lightbox).
 * @param {() => void} onClose
 * @param {{ enabled?: boolean, ignore?: () => boolean, onIgnored?: () => void }} [opts]
 */
export function useModalEscape(onClose, { enabled = true, ignore, onIgnored } = {}) {
  useEffect(() => {
    if (!enabled || typeof onClose !== "function") return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (typeof ignore === "function" && ignore()) {
        onIgnored?.();
        return;
      }
      e.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, onClose, ignore, onIgnored]);
}

/** Desktop dimmed overlay: click outside panel closes. */
export function overlayBackdropCloseProps(enabled, onClose) {
  if (!enabled || typeof onClose !== "function") return {};
  return {
    onMouseDown: (e) => {
      if (e.target === e.currentTarget) onClose();
    },
  };
}
