import React, { useMemo, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors, INSURERS } from "../../constants/config";
import { canCreateClaim } from "../../constants/roles";

export default function ClaimsList({
  claims,
  loading,
  role,
  onOpen,
  onNewReception,
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [asigurator, setAsigurator] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (claims || []).filter((c) => {
      if (status && c.status !== status) return false;
      if (asigurator && c.asigurator !== asigurator) return false;
      if (!query) return true;
      const hay = [
        c.numarInmatriculare,
        c.client,
        c.asigurator,
        c.numarDosar,
        c.nrDosarAsigurator,
        c.vin,
        c.marca,
        c.model,
        c.marcaModel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [claims, q, status, asigurator]);

  const insurerOptions = useMemo(() => {
    const set = new Set(INSURERS);
    (claims || []).forEach((c) => c.asigurator && set.add(c.asigurator));
    return Array.from(set);
  }, [claims]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold tracking-tight text-[var(--v2-text)]">
              Dosare
            </h1>
            <p className="text-xs text-[var(--v2-muted)]">
              {filtered.length} din {claims?.length || 0}
            </p>
          </div>
          {canCreateClaim(role) && (
            <button type="button" className="v2-btn-primary" onClick={onNewReception}>
              <Plus size={16} /> Recepție
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--v2-muted)]" />
          <input
            className="v2-input pl-9"
            placeholder="Caută nr. auto, client, asigurător…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <span className="inline-flex items-center gap-1 text-xs text-[var(--v2-muted)]">
            <Filter size={12} />
          </span>
          <select className="v2-input !w-auto min-w-[8rem] py-1.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Toate statusurile</option>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.num}. {s.label}</option>
            ))}
          </select>
          <select className="v2-input !w-auto min-w-[8rem] py-1.5 text-xs" value={asigurator} onChange={(e) => setAsigurator(e.target.value)}>
            <option value="">Toți asigurătorii</option>
            {insurerOptions.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-[var(--v2-muted)]">Se încarcă…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[var(--v2-muted)]">
            Niciun dosar. {canCreateClaim(role) ? "Pornește o recepție nouă." : ""}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--v2-border)]">
            {filtered.map((c) => {
              const st = getStatusDefinition(c.status);
              const colors = getPhaseColors(c.status);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--v2-surface-2)]"
                  >
                    <span
                      className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                      style={{ background: colors.bar }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-[var(--v2-text)]">
                          {c.numarInmatriculare || "Fără nr."}
                        </span>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--v2-muted)]">
                          {c.tipAsigurare}
                        </span>
                      </div>
                      <div className="truncate text-sm text-[var(--v2-muted)]">
                        {[c.marca || c.marcaModel, c.model, c.client].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: colors.bg }}
                        >
                          {st.num}. {st.label}
                        </span>
                        {c.asigurator && (
                          <span className="text-[10px] text-[var(--v2-muted)]">{c.asigurator}</span>
                        )}
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
