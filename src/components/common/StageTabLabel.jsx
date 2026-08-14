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
}) {
  const isNavButton = Tag === "button" && onClick;
  const active = selected || (!isNavButton && count > 0);
  const isStrip = variant === "strip";
  const displayTitle = title ?? (count > 0 ? `${count} dosare — ${label}` : `Niciun dosar — ${label}`);

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      title={displayTitle}
      className={`app-brief-tab app-brief-tab--etapa px-2.5 py-1 rounded-full font-bold border transition-colors text-left ${active ? "is-active" : ""} ${selected ? "is-selected" : ""} ${isStrip ? "app-brief-tab--etapa-strip" : ""} ${className}`}
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
          {active && <span className="opacity-50 ml-0.5">→</span>}
        </>
      )}
    </Tag>
  );
}
