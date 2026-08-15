import React from "react";
import { List, Grid } from "lucide-react";

export default function DensityToggle({ density, onDensityChange }) {
  if (!onDensityChange) return null;
  return (
    <div className="flex items-center bg-[var(--app-surface-2)] p-0.5 rounded-lg border border-[var(--app-border)]">
      <button
        onClick={() => onDensityChange("cozy")}
        className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
          density === "cozy"
            ? "bg-[var(--app-surface-hover)] shadow-sm text-[var(--app-text-strong)]"
            : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
        }`}
        title="Cozy View"
      >
        <Grid size={16} />
      </button>
      <button
        onClick={() => onDensityChange("compact")}
        className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
          density === "compact"
            ? "bg-[var(--app-surface-hover)] shadow-sm text-[var(--app-text-strong)]"
            : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
        }`}
        title="Compact View"
      >
        <List size={16} />
      </button>
    </div>
  );
}
