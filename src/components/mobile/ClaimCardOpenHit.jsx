import React from "react";

/** Invisible hit target so empty card padding opens the claim; actions sit above. */
export default function ClaimCardOpenHit({ onOpen, label = "Deschide dosarul" }) {
  if (!onOpen) return null;
  return (
    <button
      type="button"
      className="m-flow-card-open-hit"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={label}
    />
  );
}
