import React from "react";

const TONE_CLASS = {
  steel: "text-[var(--app-muted)]",
  amber: "text-[var(--app-accent)]",
  green: "text-[var(--app-success)]",
  danger: "text-[var(--app-danger)]",
};

export default function StatCard({ label, value, sub, tone = "steel" }) {
  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 flex-1 min-w-[130px]">
      <div className="text-[11px] text-[var(--app-muted)] font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-[24px] font-bold mt-0.5 app-display ${TONE_CLASS[tone] || TONE_CLASS.steel}`}>
        {value}
      </div>
      {sub ? <div className="text-[11px] text-[var(--app-muted)] mt-0.5">{sub}</div> : null}
    </div>
  );
}
