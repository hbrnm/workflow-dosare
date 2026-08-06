import React, { useMemo } from "react";
import { BarChart3, Clock, Wallet } from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { daysBetween } from "../../utils/dateUtils";

/** Dashboard KPI scurt — Faza 1B (fără export Excel greu). */
export default function KpiDashboard({ claims, onOpen }) {
  const stats = useMemo(() => {
    const list = claims || [];
    const active = list.filter((c) => c.status !== "facturat" && c.status !== "predat_client");
    const facturate = list.filter((c) => c.status === "facturat");
    const avgDays =
      facturate.length === 0
        ? null
        : Math.round(
            facturate.reduce((acc, c) => acc + daysBetween(c.dataDeschiderii), 0) /
              facturate.length
          );

    const restanteByInsurer = {};
    list
      .filter((c) => c.status === "facturat" && !c.incasat)
      .forEach((c) => {
        const key = c.asigurator || "Neprecizat";
        const amount =
          Number(c.financiar?.valoareAcceptPlata) ||
          Number(c.valoareAcceptataReglata) ||
          Number(c.financiar?.pieseFacturateFaraTva) ||
          0;
        restanteByInsurer[key] = (restanteByInsurer[key] || 0) + amount;
      });

    const perStatus = STATUSES.map((s) => ({
      ...s,
      count: list.filter((c) => getStatusDefinition(c.status).key === s.key).length,
    }));

    return {
      total: list.length,
      active: active.length,
      avgDays,
      restanteByInsurer: Object.entries(restanteByInsurer)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      perStatus,
      overdue: active
        .filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 5))
        .slice(0, 8),
    };
  }, [claims]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          <BarChart3 size={20} className="text-[var(--v2-accent)]" />
          Dashboard
        </h1>
        <p className="text-xs text-[var(--v2-muted)]">KPI-uri rapide — dosare active, timp mediu, restanțe</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total dosare" value={stats.total} />
        <Kpi label="Active" value={stats.active} accent />
        <Kpi
          label="Timp mediu"
          value={stats.avgDays == null ? "—" : `${stats.avgDays}z`}
          sub="până la facturat"
          icon={<Clock size={14} />}
        />
        <Kpi
          label="Asigurători cu restanțe"
          value={stats.restanteByInsurer.length}
          icon={<Wallet size={14} />}
        />
      </div>

      <section className="mb-4 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
        <h2 className="mb-2 text-sm font-semibold text-[var(--v2-text)]">Pe status</h2>
        <div className="space-y-1.5">
          {stats.perStatus.filter((s) => s.count > 0).map((s) => {
            const colors = getPhaseColors(s.key);
            return (
              <div key={s.key} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: colors.bar }} />
                <span className="flex-1 truncate text-[var(--v2-muted)]">{s.label}</span>
                <span className="font-semibold text-[var(--v2-text)]">{s.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
        <h2 className="mb-2 text-sm font-semibold text-[var(--v2-text)]">Restanțe pe asigurător</h2>
        {stats.restanteByInsurer.length === 0 ? (
          <p className="text-xs text-[var(--v2-muted)]">Nicio restanță marcată (facturat & neîncasat).</p>
        ) : (
          <ul className="space-y-1.5">
            {stats.restanteByInsurer.map((r) => (
              <li key={r.name} className="flex justify-between text-sm">
                <span className="text-[var(--v2-muted)]">{r.name}</span>
                <span className="font-semibold text-[var(--v2-accent)]">
                  {r.value > 0 ? `${r.value.toLocaleString("ro-RO")} RON` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
        <h2 className="mb-2 text-sm font-semibold text-[var(--v2-text)]">Stagnante (atenție)</h2>
        {stats.overdue.length === 0 ? (
          <p className="text-xs text-[var(--v2-muted)]">Niciun dosar peste termenul de alertă.</p>
        ) : (
          <ul className="divide-y divide-[var(--v2-border)]">
            {stats.overdue.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full justify-between py-2 text-left text-sm hover:opacity-80"
                  onClick={() => onOpen(c.id)}
                >
                  <span className="font-medium text-[var(--v2-text)]">{c.numarInmatriculare}</span>
                  <span className="text-[var(--v2-danger)]">{daysBetween(c.dataSchimbareStatus)}z</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, accent, icon }) {
  return (
    <div className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-[var(--v2-accent)]" : "text-[var(--v2-text)]"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--v2-muted)]">{sub}</div>}
    </div>
  );
}
