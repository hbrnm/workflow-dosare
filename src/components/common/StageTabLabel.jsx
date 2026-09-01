import React from "react";

/** Etichetă etapă — același format vizual în Brief (Pulsul) și Flux (coloane). */
export default function StageTabLabel({
  num,
  label,
  count = 0,
  as: Tag = "span",
  className = "",
  onClick,
  title,
  selected = false,
  variant = "default",
  isSearchMatch = false,
  searchCount = 0,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
}) {
  const isNavButton = Tag === "button" && onClick;
  const active = selected || (!isNavButton && count > 0);
  const isStrip = variant === "strip";
  const displayTitle = title ?? (count > 0 ? `${count} dosare — ${label}` : `Niciun dosar — ${label}`);

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      title={isDragOver ? `Mută dosarul în „${label}”` : displayTitle}
      className={`app-brief-tab app-brief-tab--etapa px-3 py-1.5 rounded-full text-[13px] sm:text-[14px] font-semibold border transition-all text-left ${
        active ? "is-active" : ""
      } ${selected ? "is-selected" : ""} ${isStrip ? "app-brief-tab--etapa-strip" : ""} ${
        isSearchMatch ? "is-search-match ring-2 ring-[#0284c7] border-[#0284c7] font-extrabold" : ""
      } ${
        isDragOver
          ? "ring-2 ring-[var(--app-accent)] bg-[var(--app-accent)]/20 scale-105 shadow-md border-[var(--app-accent)] text-[var(--app-accent)] font-bold"
          : active
          ? ""
          : "bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
      } ${className}`}
    >
      <span className="font-mono opacity-70">{String(num).padStart(2, "0")}.</span>
      {isStrip ? (
        <>
          {" "}
          <span className="opacity-70">({count})</span>
        </>
      ) : (
        <>
          {" "}
          {label}{" "}
          <span className="opacity-70">({count})</span>
          {isSearchMatch && (
            <span className="ml-1 text-[11px] font-extrabold text-[#0284c7] dark:text-[#38bdf8]">
              🔍{searchCount > 0 ? `(${searchCount})` : ""}
            </span>
          )}
          {active && !isSearchMatch && <span className="opacity-50 ml-0.5">→</span>}
        </>
      )}
    </Tag>
  );
}
