import React from "react";
import { copyClaimNumber } from "../../utils/copyClaimNumber";

/**
 * Nr. dosar click-to-copy — folosit pe Flux, tabel, alerte, mobil etc.
 */
export default function DosarNumber({
  value,
  onNotify,
  className = "",
  prefix = "#",
  empty = "—",
  title,
  stopPropagation = true,
}) {
  const text = String(value || "").trim();
  if (!text) {
    return <span className={className || "font-mono text-[var(--app-muted)]"}>{empty}</span>;
  }

  return (
    <button
      type="button"
      className={
        className ||
        "font-mono font-bold text-[var(--app-text-strong)] hover:text-[var(--app-accent)] underline-offset-2 hover:underline transition-colors"
      }
      title={title || `Copiază nr. dosar ${text}`}
      onClick={(e) => {
        if (stopPropagation) {
          e.stopPropagation();
          e.preventDefault();
        }
        void copyClaimNumber(text, onNotify);
      }}
    >
      {prefix}
      {text}
    </button>
  );
}
