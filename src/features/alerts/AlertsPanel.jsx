import React, { useMemo, useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";
import { ALERT_CATEGORIES, getAlertCategory } from "../../constants/alertCategories";
import { getStatusDefinition } from "../../constants/config";

export default function AlertsPanel({ buckets, onOpen }) {
  const [tab, setTab] = useState("toate");
  const items = buckets?.items || [];
  const counts = buckets?.counts || {};

  const filtered = useMemo(() => {
    if (tab === "toate") return items;
    return items.filter((i) => i.type === tab);
  }, [items, tab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-border)] px-4 py-3">
        <h1 className="flex items-center gap-2 font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          <Bell size={20} className="text-[var(--v2-accent)]" />
          Alerte
          {buckets?.totalAlertsCount > 0 && (
            <span className="rounded-full bg-[var(--v2-danger)] px-2 py-0.5 text-xs text-white">
              {buckets.totalAlertsCount}
            </span>
          )}
        </h1>
        <p className="text-xs text-[var(--v2-muted)]">Dosare care cer atenție acum</p>
        <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-none">
          <TabBtn active={tab === "toate"} onClick={() => setTab("toate")} label="Toate" count={items.length} />
          {ALERT_CATEGORIES.map((c) => (
            <TabBtn
              key={c.key}
              active={tab === c.key}
              onClick={() => setTab(c.key)}
              label={c.shortLabel || c.label}
              count={counts[c.key] || 0}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-[var(--v2-muted)]">
            <AlertTriangle size={28} className="opacity-40" />
            <p>Nicio alertă pe această categorie.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--v2-border)]">
            {filtered.map((item) => {
              const cat = getAlertCategory(item.type);
              const claim = item.claim;
              const st = getStatusDefinition(claim?.status);
              return (
                <li key={`${item.type}-${claim?.id}-${item.id || ""}`}>
                  <button
                    type="button"
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--v2-surface-2)]"
                    onClick={() => claim?.id && onOpen(claim.id)}
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: cat?.hex || "#C98A2B" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--v2-text)]">
                        {claim?.numarInmatriculare || claim?.numarDosar || "Dosar"}
                      </div>
                      <div className="text-sm text-[var(--v2-muted)]">
                        {item.title || cat?.label || item.type}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--v2-muted)]">
                        {item.reason || st.label} · {claim?.client || "—"}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
        active
          ? "bg-[var(--v2-accent)] text-[#1a1510]"
          : "bg-[var(--v2-surface-2)] text-[var(--v2-muted)]"
      }`}
    >
      {label}
      {count > 0 ? ` (${count})` : ""}
    </button>
  );
}
