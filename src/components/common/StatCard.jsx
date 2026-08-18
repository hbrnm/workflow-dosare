import React from "react";

const TONE_CLASS = {
  steel: "text-[var(--app-muted)]",
  amber: "text-[var(--app-accent)]",
  green: "text-[var(--app-success)]",
  danger: "text-[var(--app-danger)]",
};

export default function StatCard({ label, value, sub, tone = "steel" }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 flex-1 min-w-[130px] shadow-sm hover:shadow-md hover:border-[var(--app-border-soft)] transition-all">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{label}</div>
      <div className={`text-[24px] font-extrabold mt-0.5 app-display ${TONE_CLASS[tone] || TONE_CLASS.steel}`}>
        {value}
      </div>
      {sub ? <div className="text-xs text-[var(--app-muted)] mt-0.5">{sub}</div> : null}
    </div>
  );
}
