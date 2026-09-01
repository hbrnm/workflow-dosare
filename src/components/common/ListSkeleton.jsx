import React from "react";

/** Lightweight skeleton for Brief / Flux / list loading. */
export default function ListSkeleton({ rows = 5, variant = "cards", columns = 6 }) {
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

  if (variant === "kanban") {
    return (
      <div className="app-skeleton flex flex-nowrap overflow-hidden gap-3 p-2 h-full" aria-busy="true" aria-label="Se încarcă">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div key={colIdx} className="flex-shrink-0 w-80 sm:w-[360px] flex flex-col bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl relative">
            <div className="px-3 py-4 rounded-t-xl bg-[var(--app-surface-muted)] shrink-0 border-b border-[var(--app-border-soft)]">
              <div className="app-skeleton-line w-24 h-4 rounded opacity-50" />
            </div>
            <div className="p-2 space-y-2 flex-1">
              {Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, cardIdx) => (
                <div key={cardIdx} className="app-skeleton-card h-28 rounded-2xl" />
              ))}
            </div>
          </div>
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
