import React, { useState, useMemo } from "react";
import { Boxes, TrendingUp, AlertTriangle, Car, FileSpreadsheet, BarChart3, Wallet, Filter, ChevronRight, Clock, Gauge } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { STATUSES, PHASE_COLORS, PIE_COLORS, getStatusDefinition } from "../../constants/config";
import { daysBetween, fmtDate } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import { buildAtelierFunnel } from "../../utils/atelierFunnel";
import { countClaimsForStatus } from "../../utils/plateSchedule";
import { computeFleetCycleMetrics } from "../../utils/cycleTimeUtils";
import StatCard from "../common/StatCard";
import ExportExcelModal from "../modals/ExportExcelModal";
import AppButton from "../common/AppButton";

export default function Dashboard({
  claims,
  totalClaimsCount = null,
  onOpen,
  pragRidicare = 3,
  onOpenRapoarte,
  onOpenAlerts,
  onOpenBlocked,
  /** Same stagnate count as Centrul de Alerte (excludes blocate). */
  stageOverdueCount = null,
}) {
  const funnel = useMemo(() => buildAtelierFunnel(claims, { pragRidicare }), [claims, pragRidicare]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSecondaryKpis, setShowSecondaryKpis] = useState(false);
  const total = claims.length;
  const rca = claims.filter((c) => c.tipAsigurare === "RCA").length;
  const casco = claims.filter((c) => c.tipAsigurare === "CASCO").length;
  const active = claims.filter((c) => c.status !== "facturat").length;
  const blockedCount = claims.filter((c) => c.blocat).length;
  const gataNeridicateCount = claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)).length;
  // Same rule as buildAlertBuckets: blocate = inventar, not „termen depășit”
  const overdueCount = useMemo(() => {
    if (typeof stageOverdueCount === "number") return stageOverdueCount;
    return claims.filter((c) => !c?.blocat && isStageOverdue(c)).length;
  }, [claims, stageOverdueCount]);

  const masiniSchimbActive = useMemo(() => {
    return claims.filter((c) => c.masinaSchimb && c.status !== "facturat")
      .map((c) => {
        const zileChirieEfective = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
        const depasit = c.zileChirieAudatex > 0 && zileChirieEfective > c.zileChirieAudatex;
        const zileDepasite = Math.max(0, zileChirieEfective - (c.zileChirieAudatex || 0));
        return { ...c, zileChirieEfective, depasit, zileDepasite };
      }).sort((a, b) => b.zileDepasite - a.zileDepasite);
  }, [claims]);

  const perStatus = STATUSES.map((s) => ({
    name: String(s.num).padStart(2, "0"),
    label: s.label,
    total: countClaimsForStatus(claims, s.key),
    color: PHASE_COLORS[s.phase].bar,
  }));

  const perAsigurator = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      const a = c.asigurator || "Fără asigurător";
      map[a] = (map[a] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [claims]);

  const fleetMetrics = useMemo(() => computeFleetCycleMetrics(claims), [claims]);
  const avgDaysOpen = fleetMetrics.avgTotalCycleDays || null;

  return (
    <div className="space-y-4 pb-4 text-[var(--app-text)]">
      {totalClaimsCount != null && totalClaimsCount > claims.length && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 flex items-center justify-between text-xs text-amber-200">
          <span className="flex items-center gap-2 font-medium">
            <Filter size={14} className="text-amber-400 shrink-0" />
            Statistici calculate pe baza filtrelor active: <strong>{claims.length}</strong> din <strong>{totalClaimsCount}</strong> dosare afișate.
          </span>
        </div>
      )}

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

      {/* Funnel: create → programare → alerte */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-[var(--app-muted)]" />
          <div>
            <h3 className="font-semibold text-[13px] text-[var(--app-text-strong)]">Funnel atelier</h3>
            <p className="text-[11px] text-[var(--app-muted)]">Create → programare → alerte (din dosarele încărcate)</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {funnel.steps.map((step, idx) => {
            const alerteClickable = step.id === "alerte" && typeof onOpenAlerts === "function";
            const className = `rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2.5 text-left w-full${
              alerteClickable ? " hover:bg-[var(--app-surface-muted)] transition-colors cursor-pointer" : ""
            }`;
            const body = (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
                  {idx + 1}. {step.label}
                </div>
                <div className="text-[22px] font-semibold text-[var(--app-text-strong)] leading-tight mt-0.5">
                  {step.count}
                </div>
                <div className="text-[10px] text-[var(--app-muted)] mt-0.5">
                  {step.hint}
                  {step.rateFromPrev != null ? ` · ${step.rateFromPrev}% din create` : null}
                </div>
              </>
            );
            if (alerteClickable) {
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onOpenAlerts("toate")}
                  className={className}
                >
                  {body}
                </button>
              );
            }
            return (
              <div key={step.id} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      </div>

      {/* Max 4 KPIs above the fold */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total dosare" value={total} tone="steel" />
        <StatCard label="Active" value={active} tone="amber" />
        {onOpenBlocked && blockedCount > 0 ? (
          <button type="button" onClick={onOpenBlocked} className="text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]">
            <StatCard label="Blocate" value={blockedCount} sub="Click → inventar" tone="danger" />
          </button>
        ) : (
          <StatCard label="Blocate" value={blockedCount} tone={blockedCount ? "danger" : "green"} />
        )}
        {onOpenAlerts && gataNeridicateCount > 0 ? (
          <button
            type="button"
            onClick={() => onOpenAlerts("neridicate")}
            className="text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            <StatCard label="Gata, neridicate" value={gataNeridicateCount} sub="Click → Alerte" tone="danger" />
          </button>
        ) : (
          <StatCard label="Gata, neridicate" value={gataNeridicateCount} tone={gataNeridicateCount ? "danger" : "green"} />
        )}
      </div>

      {/* SLA & Durată Medie Reparație Atelier */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--app-accent)]" />
            <h3 className="font-semibold text-[13px] text-[var(--app-text-strong)]">
              Ciclu Mediu Reparație &amp; Eficiență Atelier
            </h3>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              borderColor: fleetMetrics.benchmarkColor + "55",
              backgroundColor: fleetMetrics.benchmarkColor + "15",
              color: fleetMetrics.benchmarkColor,
            }}
          >
            {fleetMetrics.benchmarkRating}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="rounded-lg bg-[var(--app-surface-2)] p-2.5 border border-[var(--app-border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Timp Efectiv Atelier</div>
            <div className="text-[20px] font-bold text-[var(--app-text-strong)] mt-0.5">
              {fleetMetrics.avgRepairDays > 0 ? `${fleetMetrics.avgRepairDays} zile` : "—"}
            </div>
            <div className="text-[10px] text-[var(--app-muted)]">intrare fizică → finalizare</div>
          </div>

          <div className="rounded-lg bg-[var(--app-surface-2)] p-2.5 border border-[var(--app-border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Ciclu Total Daună</div>
            <div className="text-[20px] font-bold text-[var(--app-text-strong)] mt-0.5">
              {fleetMetrics.avgTotalCycleDays > 0 ? `${fleetMetrics.avgTotalCycleDays} zile` : "—"}
            </div>
            <div className="text-[10px] text-[var(--app-muted)]">deschidere → facturare</div>
          </div>

          <div className="rounded-lg bg-[var(--app-surface-2)] p-2.5 border border-[var(--app-border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Staționare Curte</div>
            <div className="text-[20px] font-bold text-[var(--app-text-strong)] mt-0.5">
              {fleetMetrics.avgStationingDays > 0 ? `${fleetMetrics.avgStationingDays} zile` : "0 zile"}
            </div>
            <div className="text-[10px] text-[var(--app-muted)]">gata → ridicare client</div>
          </div>

          <div className="rounded-lg bg-[var(--app-surface-2)] p-2.5 border border-[var(--app-border)]">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Reparații Finalizate</div>
            <div className="text-[20px] font-bold text-[var(--app-text-strong)] mt-0.5">
              {fleetMetrics.completedRepairsCount}
            </div>
            <div className="text-[10px] text-[var(--app-muted)]">{fleetMetrics.activeInRepairCount} în lucru activ</div>
          </div>
        </div>
      </div>

      {!showSecondaryKpis ? (
        <button
          type="button"
          onClick={() => setShowSecondaryKpis(true)}
          className="app-type-xs font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]"
        >
          + RCA/CASCO, auto schimb
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <StatCard label="RCA / CASCO" value={`${rca} / ${casco}`} tone="steel" />
          <StatCard label="Auto la schimb" value={masiniSchimbActive.length} sub={`${masiniSchimbActive.filter((m) => m.depasit).length} depășite`} tone={masiniSchimbActive.some((m) => m.depasit) ? "amber" : "steel"} />
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
              <Tooltip itemStyle={{ color: "var(--app-text-strong)" }} formatter={(v, n, p) => [v, p.payload.label]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }} />
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
                <Tooltip itemStyle={{ color: "var(--app-text-strong)" }} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)" }} />
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
                      <span className="font-semibold text-[var(--app-text)]">{c.masinaSchimbNumar || "Rent-a-car"}</span>
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

      {/* Termen depășit lives in Centrul de Alerte / Brief — stats only link out */}
      {onOpenAlerts && overdueCount > 0 ? (
        <button
          type="button"
          onClick={() => onOpenAlerts("depasite")}
          className="w-full rounded-lg border border-[var(--app-danger)]/40 bg-[var(--app-danger)]/10 px-3 py-2.5 flex items-center gap-2 text-left hover:bg-[var(--app-danger)]/15 transition-colors"
        >
          <AlertTriangle size={15} className="text-[var(--app-danger)] shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="app-type-sm font-semibold text-[var(--app-text-strong)]">
              {overdueCount} {overdueCount === 1 ? "dosar cu termen depășit" : "dosare cu termen depășit"}
            </span>
            <span className="block app-type-xs text-[var(--app-muted)]">
              Aceeași listă ca în Centrul de Alerte (fără dosare blocate)
            </span>
          </span>
          <ChevronRight size={16} className="text-[var(--app-muted)] shrink-0" />
        </button>
      ) : null}

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
