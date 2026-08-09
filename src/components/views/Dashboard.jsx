import React, { useState, useMemo } from "react";
import { Boxes, TrendingUp, AlertTriangle, Car, FileSpreadsheet, BarChart3, Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { STATUSES, PHASE_COLORS, PIE_COLORS, getStatusDefinition, getClaimAlertDays } from "../../constants/config";
import { daysBetween, fmtDate } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue, getDaysInStage } from "../../utils/alertUtils";
import StatCard from "../common/StatCard";
import ExportExcelModal from "../modals/ExportExcelModal";
import AppButton from "../common/AppButton";

export default function Dashboard({ claims, onOpen, pragRidicare = 3, onOpenRapoarte }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSecondaryKpis, setShowSecondaryKpis] = useState(false);
  const total = claims.length;
  const rca = claims.filter((c) => c.tipAsigurare === "RCA").length;
  const casco = claims.filter((c) => c.tipAsigurare === "CASCO").length;
  const active = claims.filter((c) => c.status !== "facturat").length;
  const blockedCount = claims.filter((c) => c.blocat).length;
  const gataNeridicateCount = claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)).length;

  const overdueList = claims.filter(isStageOverdue)
    .map((c) => ({ ...c, zileIntarziere: getDaysInStage(c) - getClaimAlertDays(c) }))
    .sort((a, b) => b.zileIntarziere - a.zileIntarziere);

  const masiniSchimbActive = useMemo(() => {
    return claims.filter((c) => c.masinaSchimb && c.masinaSchimb.trim() && c.status !== "facturat")
      .map((c) => {
        const zileChirieEfective = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
        const depasit = c.zileChirieAudatex > 0 && zileChirieEfective > c.zileChirieAudatex;
        const zileDepasite = Math.max(0, zileChirieEfective - (c.zileChirieAudatex || 0));
        return { ...c, zileChirieEfective, depasit, zileDepasite };
      }).sort((a, b) => b.zileDepasite - a.zileDepasite);
  }, [claims]);

  const perStatus = STATUSES.map((s) => ({ name: String(s.num).padStart(2, "0"), label: s.label, total: claims.filter((c) => c.status === s.key).length, color: PHASE_COLORS[s.phase].bar }));

  const perAsigurator = useMemo(() => {
    const map = {};
    claims.forEach((c) => { const key = c.asigurator?.trim() || "Neprecizat"; map[key] = (map[key] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [claims]);

  const avgDaysOpen = useMemo(() => {
    const finished = claims.filter((c) => c.status === "facturat");
    if (finished.length === 0) return null;
    return Math.round(finished.reduce((acc, c) => acc + daysBetween(c.dataDeschiderii), 0) / finished.length);
  }, [claims]);

  return (
    <div className="space-y-4 pb-4 text-[var(--app-text)]">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold app-type-md text-[var(--app-text-strong)] flex items-center gap-2">
            <BarChart3 size={18} className="text-[var(--app-muted)]" /> Statistici
          </h2>
          <p className="app-type-xs text-[var(--app-muted)] mt-0.5">Indicatori, etape și export</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenRapoarte ? (
            <AppButton variant="secondary" onClick={onOpenRapoarte}>
              <Wallet size={14} />
              <span>Rapoarte</span>
            </AppButton>
          ) : null}
          <AppButton variant="primary" onClick={() => setShowExportModal(true)}>
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </AppButton>
        </div>
      </div>

      {/* Max 4 KPIs above the fold */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total dosare" value={total} tone="steel" />
        <StatCard label="Active" value={active} tone="amber" />
        <StatCard label="Blocate" value={blockedCount} tone={blockedCount ? "danger" : "green"} />
        <StatCard label="Gata, neridicate" value={gataNeridicateCount} tone={gataNeridicateCount ? "danger" : "green"} />
      </div>

      {!showSecondaryKpis ? (
        <button
          type="button"
          onClick={() => setShowSecondaryKpis(true)}
          className="app-type-xs font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          + RCA/CASCO, auto schimb, zile medii
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="RCA / CASCO" value={`${rca} / ${casco}`} tone="steel" />
          <StatCard label="Auto la schimb" value={masiniSchimbActive.length} sub={`${masiniSchimbActive.filter((m) => m.depasit).length} depășite`} tone={masiniSchimbActive.some((m) => m.depasit) ? "amber" : "steel"} />
          <StatCard label="Zile medii" value={avgDaysOpen ?? "—"} sub="dosare facturate" tone="green" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <div className="app-type-xs font-semibold text-[var(--app-text-strong)] mb-2 flex items-center gap-1.5"><Boxes size={13} /> Dosare pe etapă</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perStatus} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-soft)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--app-muted)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--app-muted)" }} />
              <Tooltip formatter={(v, n, p) => [v, p.payload.label]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>{perStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <div className="app-type-xs font-semibold text-[var(--app-text-strong)] mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Dosare pe asigurător</div>
          {perAsigurator.length === 0 ? <div className="app-empty">Fără date încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={perAsigurator} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={{ fontSize: 10 }}>
                  {perAsigurator.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {masiniSchimbActive.length > 0 && (
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
          <div className="bg-[var(--app-surface-2)] border-b border-[var(--app-border)] px-3 py-2 app-type-sm font-semibold text-[var(--app-text-strong)] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Car size={15} /> Mașini la schimb ({masiniSchimbActive.length})</span>
            <span className="hidden sm:inline app-type-xs font-normal text-[var(--app-muted)]">Depășire zile Audatex</span>
          </div>
          <div className="divide-y divide-[var(--app-border-soft)] max-h-56 overflow-y-auto">
            {masiniSchimbActive.map((c) => {
              const statusDef = getStatusDefinition(c.status);
              return (
                <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[var(--app-surface-2)] app-type-xs">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-semibold">{c.numarDosar || "—"}</span>
                      <span className="font-medium text-[var(--app-text-strong)]">{c.client || "—"}</span>
                      <span className="text-[var(--app-muted)]">({c.numarInmatriculare})</span>
                    </div>
                    <div className="app-type-xs text-[var(--app-muted)] font-mono mt-0.5 flex items-center gap-1">
                      <Car size={11} className="shrink-0 opacity-70" />
                      <span className="font-semibold text-[var(--app-text)]">{c.masinaSchimb}</span>
                      <span>· predare: {c.dataDariiLaSchimb ? fmtDate(c.dataDariiLaSchimb) : "neprecizată"} · {statusDef.label}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="app-type-xs font-semibold font-mono text-[var(--app-muted)]">
                      {c.zileChirieEfective} zile
                    </span>
                    {c.depasit ? (
                      <span className="app-type-xs font-semibold px-2 py-0.5 rounded bg-[var(--app-danger)] text-[var(--app-danger-text)]">
                        +{c.zileDepasite}z peste Audatex ({c.zileChirieAudatex}z)
                      </span>
                    ) : (
                      <span className="app-type-xs font-medium px-2 py-0.5 rounded bg-[var(--app-success-muted)] text-[var(--app-success)]">
                        OK (max {c.zileChirieAudatex || "∞"}z)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
        <div className="bg-[var(--app-danger)] text-[var(--app-danger-text)] px-3 py-2 app-type-sm font-semibold flex items-center gap-1.5">
          <AlertTriangle size={14} /> Dosare cu termen depășit ({overdueList.length})
        </div>
        {overdueList.length === 0 ? (
          <div className="app-empty border-0 rounded-none">Niciun dosar depășit — totul e sub control.</div>
        ) : (
          <div className="divide-y divide-[var(--app-border-soft)] max-h-64 overflow-y-auto">
            {overdueList.map((c) => {
              const s = getStatusDefinition(c.status);
              return (
                <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[var(--app-surface-2)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-semibold app-type-sm">{c.numarDosar || "—"}</span>
                      <span className="app-type-xs text-[var(--app-muted)]">{c.client}</span>
                    </div>
                    <div className="app-type-xs text-[var(--app-muted)] mt-0.5">{String(s.num).padStart(2, "0")}. {s.label}</div>
                  </div>
                  <span className="app-type-xs font-semibold px-2 py-0.5 rounded bg-[var(--app-danger)] text-[var(--app-danger-text)] self-start sm:self-auto shrink-0">+{c.zileIntarziere}z restante</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showExportModal && (
        <ExportExcelModal
          claims={claims}
          pragRidicare={pragRidicare}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
