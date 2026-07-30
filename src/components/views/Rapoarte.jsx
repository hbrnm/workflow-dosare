import React, { useState, useMemo } from "react";
import { CheckCircle2, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import StatCard from "../common/StatCard";
import { nowISO, fmtDate } from "../../utils/dateUtils";

export default function Rapoarte({ claims, onPatch, canEditFn }) {
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

  return (
    <div className="space-y-4">
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
        <div className="bg-white rounded-lg border border-[#DAD4C6] p-3">
          <div className="text-[12px] font-bold text-[#23282E] mb-2">Venit lunar (piese vs manoperă)</div>
          {perLuna.length === 0 ? <div className="text-[12px] text-[#8A8375] py-10 text-center">Fără dosare facturate încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perLuna} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEAE1" />
                <XAxis dataKey="luna" tick={{ fontSize: 10, fill: "#6B6558" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B6558" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DAD4C6" }} formatter={(v) => `${Math.round(v)} lei`} />
                <Bar dataKey="piese" name="Piese" stackId="a" fill="#C98A2B" />
                <Bar dataKey="manopera" name="Manoperă" stackId="a" fill="#3B5166" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-lg border border-[#DAD4C6] p-3">
          <div className="text-[12px] font-bold text-[#23282E] mb-2">Venit pe asigurător</div>
          {perAsigurator.length === 0 ? <div className="text-[12px] text-[#8A8375] py-10 text-center">Fără date încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perAsigurator} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEAE1" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6B6558" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6B6558" }} width={95} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DAD4C6" }} formatter={(v) => `${v} lei`} />
                <Bar dataKey="value" fill="#4A6FA5" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* NEW SECTION: Uncollected Breakdown by Insurer */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden shadow-xs">
        <div className="px-3 py-2 bg-[#3B5166] text-white text-[12.5px] font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Situație Restanțe Încasare per Asigurător</span>
          <span className="text-[11px] font-semibold opacity-85">Centralizator plăților pe asigurători</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#FAF8F5] text-[#6B6558] border-b border-[#DAD4C6]">
                <th className="text-left px-3 py-2">Societate Asigurări</th>
                <th className="text-right px-3 py-2">Total Facturat</th>
                <th className="text-right px-3 py-2">Total Încasat</th>
                <th className="text-right px-3 py-2">Restanță În Așteptare</th>
                <th className="text-center px-3 py-2">Dosare Neîncasate</th>
              </tr>
            </thead>
            <tbody>
              {neincasatPerAsigurator.map((item) => (
                <tr key={item.asigurator} className="border-t border-[#EFEAE1] hover:bg-[#FCFAF5]">
                  <td className="px-3 py-2 font-semibold text-[#23282E]">{item.asigurator}</td>
                  <td className="px-3 py-2 text-right font-mono">{leiFmt(item.total)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#3E6B45] font-semibold">{leiFmt(item.incasat)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${item.neincasat > 0 ? "text-[#B23A2E]" : "text-[#3E6B45]"}`}>
                    {leiFmt(item.neincasat)}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
                    {item.countNeincasat > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-[#B23A2E]/10 text-[#B23A2E] text-[11px]">
                        {item.countNeincasat} / {item.countTotal} dosare
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#3E6B45]/10 text-[#3E6B45] text-[11px]">
                        Toate achitate ({item.countTotal})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {neincasatPerAsigurator.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[#8A8375] italic">
                    Nicio factură înregistrată pentru calculul pe asigurători.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Invoice Collection Table */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden shadow-sm">
        <div className="px-3 py-2.5 bg-[#23282E] text-white text-[12.5px] font-bold flex flex-wrap items-center justify-between gap-2">
          <span>Detaliu dosare facturate &amp; Status încasare</span>

          {/* Collection Status Filter Pills */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md border border-white/20">
            <button
              onClick={() => setFilterIncasare("toate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "toate" ? "bg-white text-[#23282E]" : "text-white/70 hover:text-white"
              }`}
            >
              Toate ({withMargin.length})
            </button>
            <button
              onClick={() => setFilterIncasare("incasate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "incasate" ? "bg-[#3E6B45] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              Încasate ({withMargin.filter((c) => c.incasat).length})
            </button>
            <button
              onClick={() => setFilterIncasare("neincasate")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                filterIncasare === "neincasate" ? "bg-[#B23A2E] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              În așteptare ({withMargin.filter((c) => !c.incasat).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F5F2EA] text-[#6B6558]">
                <th className="text-left px-3 py-2">Nr. dosar</th>
                <th className="text-left px-3 py-2">Asigurător</th>
                <th className="text-left px-3 py-2">Client / Auto</th>
                <th className="text-right px-3 py-2">Venit Piese</th>
                <th className="text-right px-3 py-2">Venit Manoperă</th>
                <th className="text-right px-3 py-2">Total Facturat</th>
                <th className="text-center px-3 py-2">Status Încasare</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const editable = canEditFn ? canEditFn(c) : true;

                return (
                  <tr key={c.id} className="border-t border-[#EFEAE1] hover:bg-[#FCFAF5]">
                    <td className="px-3 py-2 font-mono font-bold text-[#3B5166]">{c.numarDosar || "—"}</td>
                    <td className="px-3 py-2">{c.asigurator || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-[#23282E]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[#8A8375]">{c.numarInmatriculare}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{leiFmt(c.venitPiese)}</td>
                    <td className="px-3 py-2 text-right font-mono">{leiFmt(c.venitManopera)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[#23282E]">{leiFmt(c.venitTotal)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        disabled={!editable || !onPatch}
                        onClick={() => {
                          if (onPatch) {
                            onPatch(c.id, {
                              incasat: !c.incasat,
                              dataIncasarii: !c.incasat ? nowISO() : null,
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all inline-flex items-center gap-1 ${
                          c.incasat
                            ? "bg-[#E8F3E9] text-[#3E6B45] border-[#3E6B45]/40 hover:bg-[#D3E8D5]"
                            : "bg-[#FFF2F0] text-[#B23A2E] border-[#B23A2E]/40 hover:bg-[#FCE3E0]"
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
                  <td colSpan={7} className="px-3 py-8 text-center text-[#8A8375]">
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
