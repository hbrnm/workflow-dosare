import React, { useState, useMemo } from "react";
import { CheckCircle2, Clock, ShieldCheck, Filter } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import StatCard from "../common/StatCard";
import { nowISO, fmtDate } from "../../utils/dateUtils";

export default function Rapoarte({ claims, totalClaimsCount = null, onPatch, canEditFn }) {
  const [filterIncasare, setFilterIncasare] = useState("toate"); // 'toate' | 'incasate' | 'neincasate'

  const facturate = useMemo(() => claims.filter((c) => c.status === "facturat"), [claims]);

  const withMargin = useMemo(() => facturate.map((c) => {
    const venitPiese = (c.valoarePieseAudatex || 0) - (c.valoareAchizitiePiese || 0);
    const venitManopera = (c.manopera?.tinichigerie?.facturat || 0) + (c.manopera?.vopsitorie?.facturat || 0);
    return { ...c, venitPiese, venitManopera, venitTotal: venitPiese + venitManopera };
  }), [facturate]);

  const totalPiese = withMargin.reduce((a, c) => a + c.venitPiese, 0);
  const totalManopera = withMargin.reduce((a, c) => a + c.venitManopera, 0);
  const totalGeneral = totalPiese + totalManopera;

  const totalIncasat = withMargin.filter((c) => c.incasat).reduce((a, c) => a + c.venitTotal, 0);
  const totalNeincasat = withMargin.filter((c) => !c.incasat).reduce((a, c) => a + c.venitTotal, 0);

  const leiFmt = (n) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

  const perLuna = useMemo(() => {
    const map = {};
    withMargin.forEach((c) => {
      const luna = (c.dataUltimeiActualizari || c.dataDeschiderii || "").slice(0, 7);
      if (!luna) return;
      if (!map[luna]) map[luna] = { luna, piese: 0, manopera: 0 };
      map[luna].piese += c.venitPiese;
      map[luna].manopera += c.venitManopera;
    });
    return Object.values(map).sort((a, b) => a.luna.localeCompare(b.luna));
  }, [withMargin]);

  const perAsigurator = useMemo(() => {
    const map = {};
    withMargin.forEach((c) => {
      const key = c.asigurator?.trim() || "Neprecizat";
      map[key] = (map[key] || 0) + c.venitTotal;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [withMargin]);

  // Breakdown of Uncollected Money by Insurer
  const neincasatPerAsigurator = useMemo(() => {
    const map = {};
    withMargin.forEach((c) => {
      const asig = c.asigurator?.trim() || "Neprecizat";
      if (!map[asig]) {
        map[asig] = { asigurator: asig, total: 0, incasat: 0, neincasat: 0, countTotal: 0, countNeincasat: 0 };
      }
      map[asig].total += c.venitTotal;
      map[asig].countTotal += 1;
      if (c.incasat) {
        map[asig].incasat += c.venitTotal;
      } else {
        map[asig].neincasat += c.venitTotal;
        map[asig].countNeincasat += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.neincasat - a.neincasat);
  }, [withMargin]);

  const filteredIncasare = useMemo(() => {
    if (filterIncasare === "incasate") return withMargin.filter((c) => c.incasat);
    if (filterIncasare === "neincasate") return withMargin.filter((c) => !c.incasat);
    return withMargin;
  }, [withMargin, filterIncasare]);

  const sorted = [...filteredIncasare].sort((a, b) => b.venitTotal - a.venitTotal);

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid var(--app-border)",
    background: "var(--app-surface)",
    color: "var(--app-text)",
  };

  return (
    <div className="space-y-4 text-[var(--app-text)]">
      {totalClaimsCount != null && totalClaimsCount > claims.length && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 flex items-center justify-between text-xs text-amber-200">
          <span className="flex items-center gap-2 font-medium">
            <Filter size={14} className="text-amber-400 shrink-0" />
            Rapoarte calculate pe baza filtrelor active: <strong>{claims.length}</strong> din <strong>{totalClaimsCount}</strong> dosare afișate.
          </span>
        </div>
      )}

      {/* Financial Stat Cards */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Venit Piese (Marjă)" value={leiFmt(totalPiese)} tone="amber" />
        <StatCard label="Venit Manoperă" value={leiFmt(totalManopera)} tone="steel" />
        <StatCard label="Total Facturat" value={leiFmt(totalGeneral)} tone="steel" />
        <StatCard label="Încasat (Plătit)" value={leiFmt(totalIncasat)} sub={`${withMargin.filter(c => c.incasat).length} dosare încasate`} tone="green" />
        <StatCard label="În Așteptare (Restanțe)" value={leiFmt(totalNeincasat)} sub={`${withMargin.filter(c => !c.incasat).length} dosare neîncasate`} tone={totalNeincasat > 0 ? "danger" : "green"} />
      </div>

      {/* Financial Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <div className="text-[12px] font-bold text-[var(--app-text-strong)] mb-2">Venit lunar (piese vs manoperă)</div>
          {perLuna.length === 0 ? <div className="text-[12px] text-[var(--app-muted)] py-10 text-center">Fără dosare facturate încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perLuna} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-soft)" />
                <XAxis dataKey="luna" tick={{ fontSize: 10, fill: "var(--app-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--app-muted)" }} />
                <Tooltip itemStyle={{ color: "var(--app-text-strong)" }} contentStyle={tooltipStyle} formatter={(v) => `${Math.round(v)} lei`} />
                <Bar dataKey="piese" name="Piese" stackId="a" fill="var(--app-accent)" />
                <Bar dataKey="manopera" name="Manoperă" stackId="a" fill="var(--app-muted)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
          <div className="text-[12px] font-bold text-[var(--app-text-strong)] mb-2">Venit pe asigurător</div>
          {perAsigurator.length === 0 ? <div className="text-[12px] text-[var(--app-muted)] py-10 text-center">Fără date încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perAsigurator} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-soft)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--app-muted)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--app-muted)" }} width={95} />
                <Tooltip itemStyle={{ color: "var(--app-text-strong)" }} contentStyle={tooltipStyle} formatter={(v) => `${v} lei`} />
                <Bar dataKey="value" fill="var(--app-muted)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Uncollected Breakdown by Insurer */}
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
        <div className="px-3 py-2 bg-[var(--app-surface-2)] border-b border-[var(--app-border)] text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--app-muted)]" /> Situație Restanțe Încasare per Asigurător</span>
          <span className="text-[11px] font-semibold text-[var(--app-muted)] hidden sm:inline">Centralizator plăților pe asigurători</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--app-surface-muted)] text-[var(--app-muted)] border-b border-[var(--app-border)]">
                <th className="text-left px-3 py-2 font-semibold">Societate Asigurări</th>
                <th className="text-right px-3 py-2 font-semibold">Total Facturat</th>
                <th className="text-right px-3 py-2 font-semibold">Total Încasat</th>
                <th className="text-right px-3 py-2 font-semibold">Restanță În Așteptare</th>
                <th className="text-center px-3 py-2 font-semibold">Dosare Neîncasate</th>
              </tr>
            </thead>
            <tbody>
              {neincasatPerAsigurator.map((item) => (
                <tr key={item.asigurator} className="border-t border-[var(--app-border-soft)] hover:bg-[var(--app-surface-2)]">
                  <td className="px-3 py-2 font-semibold text-[var(--app-text-strong)]">{item.asigurator}</td>
                  <td className="px-3 py-2 text-right font-mono">{leiFmt(item.total)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--app-success)] font-semibold">{leiFmt(item.incasat)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${item.neincasat > 0 ? "text-[var(--app-danger)]" : "text-[var(--app-success)]"}`}>
                    {leiFmt(item.neincasat)}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
                    {item.countNeincasat > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-[var(--app-danger)]/15 text-[var(--app-danger)] text-[11px]">
                        {item.countNeincasat} / {item.countTotal} dosare
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[var(--app-success)]/15 text-[var(--app-success)] text-[11px]">
                        Toate achitate ({item.countTotal})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {neincasatPerAsigurator.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--app-muted)] italic">
                    Nicio factură înregistrată pentru calculul pe asigurători.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Invoice Collection Table */}
      <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden">
        <div className="px-3 py-2.5 bg-[var(--app-surface-2)] border-b border-[var(--app-border)] text-[12.5px] font-bold text-[var(--app-text-strong)] flex flex-wrap items-center justify-between gap-2">
          <span>Detaliu dosare facturate &amp; Status încasare</span>

          <div className="flex items-center gap-1 app-segment-track border border-[var(--app-border)] p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setFilterIncasare("toate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "toate" ? "app-segment-active" : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              Toate ({withMargin.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterIncasare("incasate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "incasate" ? "app-segment-active" : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              Încasate ({withMargin.filter((c) => c.incasat).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterIncasare("neincasate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "neincasate" ? "app-segment-active" : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              În așteptare ({withMargin.filter((c) => !c.incasat).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--app-surface-muted)] text-[var(--app-muted)] border-b border-[var(--app-border)]">
                <th className="text-left px-3 py-2 font-semibold">Nr. dosar</th>
                <th className="text-left px-3 py-2 font-semibold">Asigurător</th>
                <th className="text-left px-3 py-2 font-semibold">Client / Auto</th>
                <th className="text-right px-3 py-2 font-semibold">Venit Piese</th>
                <th className="text-right px-3 py-2 font-semibold">Venit Manoperă</th>
                <th className="text-right px-3 py-2 font-semibold">Total Facturat</th>
                <th className="text-center px-3 py-2 font-semibold">Status Încasare</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const editable = canEditFn ? canEditFn(c) : true;

                return (
                  <tr key={c.id} className="border-t border-[var(--app-border-soft)] hover:bg-[var(--app-surface-2)]">
                    <td className="px-3 py-2 font-mono font-bold text-[var(--app-muted)]">{c.numarDosar || "—"}</td>
                    <td className="px-3 py-2">{c.asigurator || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-[var(--app-text-strong)]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[var(--app-muted)]">{c.numarInmatriculare}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{leiFmt(c.venitPiese)}</td>
                    <td className="px-3 py-2 text-right font-mono">{leiFmt(c.venitManopera)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[var(--app-text-strong)]">{leiFmt(c.venitTotal)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={!editable || !onPatch}
                        onClick={() => {
                          if (onPatch) {
                            onPatch(c.id, {
                              incasat: !c.incasat,
                              dataIncasarii: !c.incasat ? nowISO() : null,
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all inline-flex items-center gap-1 disabled:opacity-50 ${
                          c.incasat
                            ? "bg-[var(--app-success)]/15 text-[var(--app-success)] border-[var(--app-success)]/40 hover:bg-[var(--app-success)]/25"
                            : "bg-[var(--app-danger)]/15 text-[var(--app-danger)] border-[var(--app-danger)]/40 hover:bg-[var(--app-danger)]/25"
                        }`}
                        title={c.incasat ? `Încasat pe ${fmtDate(c.dataIncasarii)} · Click pentru schimbare` : "Click pentru a marca ca încasat"}
                      >
                        {c.incasat ? (
                          <>
                            <CheckCircle2 size={13} /> Încasat {c.dataIncasarii ? `(${fmtDate(c.dataIncasarii)})` : ""}
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> În Așteptare
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[var(--app-muted)]">
                    Niciun dosar facturat în această categorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
