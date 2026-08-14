import React from "react";

/** Lightweight skeleton for Brief / Flux / list loading. */
export default function ListSkeleton({ rows = 5, variant = "cards" }) {
  if (variant === "table") {
    return (
      <div className="app-skeleton space-y-2 p-2" aria-busy="true" aria-label="Se încarcă">
        <div className="app-skeleton-line w-1/3 h-4 rounded" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="app-skeleton-row h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="app-skeleton space-y-3 p-1" aria-busy="true" aria-label="Se încarcă">
      <div className="flex items-center justify-between gap-3">
        <div className="app-skeleton-line w-40 h-5 rounded" />
        <div className="app-skeleton-line w-16 h-5 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="app-skeleton-card h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
