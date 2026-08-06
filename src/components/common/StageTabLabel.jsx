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
}) {
  const active = count > 0;
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      title={title ?? (active ? `${count} dosare — ${label}` : `Niciun dosar — ${label}`)}
      className={`app-brief-tab app-brief-tab--etapa px-2.5 py-1 rounded-lg font-bold border transition-colors text-left ${active ? "is-active" : ""} ${className}`}
    >
      <span className="font-mono opacity-70">{String(num).padStart(2, "0")}.</span>{" "}
      {label}{" "}
      <span className="opacity-70">({count})</span>
      {active && <span className="opacity-50 ml-0.5">→</span>}
    </Tag>
  );
}
