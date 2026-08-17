import React from "react";

/** Număr auto — același stil pe mobil și desktop. */
export default function ClaimPlate({ value, empty = "—", className = "" }) {
  const text = String(value || "").trim().toUpperCase();
  return <span className={`claim-plate ${className}`.trim()}>{text || empty}</span>;
}
