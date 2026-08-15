import React from "react";

export default function Pill({ children, tone = "steel" }) {
  const tones = {
    steel: "bg-slate-200 text-slate-700 dark:bg-[#3B5166] dark:text-white",
    amber: "bg-amber-100 text-amber-800 dark:bg-[#C98A2B] dark:text-white",
    ghost: "bg-[var(--app-surface-muted)] text-[var(--app-muted)]",
    danger: "bg-red-100 text-red-800 dark:bg-[#B23A2E] dark:text-white",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
