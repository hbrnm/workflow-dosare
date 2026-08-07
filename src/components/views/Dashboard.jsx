import React, { useState, useMemo } from "react";
import { Boxes, TrendingUp, AlertTriangle, Car, ShieldCheck, Download, FileSpreadsheet, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { STATUSES, PHASE_COLORS, PIE_COLORS, getStatusDefinition, getClaimAlertDays } from "../../constants/config";
import { daysBetween, fmtDate } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import StatCard from "../common/StatCard";
import ExportExcelModal from "../modals/ExportExcelModal";

export default function Dashboard({ claims, onOpen, pragRidicare = 3 }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const total = claims.length;
  const rca = claims.filter((c) => c.tipAsigurare === "RCA").length;
  const casco = claims.filter((c) => c.tipAsigurare === "CASCO").length;
  const active = claims.filter((c) => c.status !== "facturat").length;
  const blockedCount = claims.filter((c) => c.blocat).length;
  const gataNeridicateCount = claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)).length;
  
  const overdueList = claims.filter(isStageOverdue)
    .map((c) => ({ ...c, zileIntarziere: daysBetween(c.dataSchimbareStatus) - getClaimAlertDays(c) }))
    .sort((a, b) => b.zileIntarziere - a.zileIntarziere);
  
  // Replacement car active monitoring
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
    <div className="space-y-4 pb-4">
      {/* Header Bar with Export Button */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-3.5 flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="font-extrabold text-[15px] text-[#23282E] flex items-center gap-2">
            <BarChart3 size={18} className="text-[#C98A2B]" /> Statistici & Tablou de Bord
          </h2>
          <p className="text-[11.5px] text-[#6B6558]">Centralizator indicatori, etape dosare și exporturi pe module</p>
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] shadow-sm transition-all active:scale-95 shrink-0"
        >
          <FileSpreadsheet size={16} />
          <span>Exportă Date în Excel</span>
        </button>
      </div>

      {/* Responsive Grid for Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="Total dosare" value={total} tone="steel" />
        <StatCard label="RCA / CASCO" value={`${rca} / ${casco}`} tone="steel" />
        <StatCard label="Active (nefacturate)" value={active} tone="amber" />
        <StatCard label="Dosare blocate" value={blockedCount} tone={blockedCount ? "danger" : "green"} />
        <StatCard label="Gata, neridicate" value={gataNeridicateCount} tone={gataNeridicateCount ? "danger" : "green"} />
        <StatCard label="Auto la schimb" value={masiniSchimbActive.length} sub={`${masiniSchimbActive.filter(m => m.depasit).length} depășite`} tone={masiniSchimbActive.some(m => m.depasit) ? "amber" : "steel"} />
        <StatCard label="Zile medii" value={avgDaysOpen ?? "—"} sub="dosare facturate" tone="green" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[#DAD4C6] p-3">
          <div className="text-[12px] font-bold text-[#23282E] mb-2 flex items-center gap-1.5"><Boxes size={13} /> Dosare pe etapă</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perStatus} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEAE1" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B6558" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6B6558" }} />
              <Tooltip formatter={(v, n, p) => [v, p.payload.label]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DAD4C6" }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>{perStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-[#DAD4C6] p-3">
          <div className="text-[12px] font-bold text-[#23282E] mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Dosare pe asigurător</div>
          {perAsigurator.length === 0 ? <div className="text-[12px] text-[#8A8375] py-10 text-center">Fără date încă.</div> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={perAsigurator} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={{ fontSize: 10 }}>
                  {perAsigurator.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #DAD4C6" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Replacement Cars Active Monitoring Widget */}
      {masiniSchimbActive.length > 0 && (
        <div className="bg-white rounded-lg border border-[#C98A2B]/40 overflow-hidden shadow-sm">
          <div className="bg-[#FBF3E6] border-b border-[#C98A2B]/30 px-3 py-2 text-[12.5px] font-bold text-[#7A5316] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Car size={15} /> Monitorizare Mașini la Schimb Active ({masiniSchimbActive.length})</span>
            <span className="hidden sm:inline text-[11px] font-normal">Alerte depășire zile aprobate Audatex</span>
          </div>
          <div className="divide-y divide-[#EFEAE1] max-h-56 overflow-y-auto">
            {masiniSchimbActive.map((c) => {
              const statusDef = getStatusDefinition(c.status);
              return (
                <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[#FCFAF5] text-[12px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-[#3B5166]">{c.numarDosar || "—"}</span>
                      <span className="text-[#23282E] font-semibold">{c.client || "—"}</span>
                      <span className="text-[#6B6558]">({c.numarInmatriculare})</span>
                    </div>
                    <div className="text-[11px] text-[#8A8375] font-mono mt-0.5">
                      🚗 <span className="font-bold text-[#7A5316]">{c.masinaSchimb}</span> · dată predare: {c.dataDariiLaSchimb ? fmtDate(c.dataDariiLaSchimb) : "neprecizată"} · status: {statusDef.label}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-bold font-mono text-[#6B6558]">
                      {c.zileChirieEfective} zile
                    </span>
                    {c.depasit ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">
                        +{c.zileDepasite}z peste Audatex ({c.zileChirieAudatex}z)
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded bg-[#EEF5EE] text-[#3E6B45]">
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

      {/* Overdue Alerts Box */}
      <div className="bg-white rounded-lg border border-[#B23A2E]/40 overflow-hidden">
        <div className="bg-[#B23A2E] text-white px-3 py-2 text-[12.5px] font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> Dosare cu termen depășit ({overdueList.length})</div>
        {overdueList.length === 0 ? <div className="p-4 text-[12.5px] text-[#8A8375]">Niciun dosar depășit — totul e sub control.</div> : (
          <div className="divide-y divide-[#EFEAE1] max-h-64 overflow-y-auto">
            {overdueList.map((c) => {
              const s = getStatusDefinition(c.status);
              return (
                <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-[#FCFAF5]">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-semibold text-[12.5px]">{c.numarDosar || "—"}</span>
                      <span className="text-[12px] text-[#6B6558]">{c.client}</span>
                    </div>
                    <div className="text-[11px] text-[#8A8375] mt-0.5">{String(s.num).padStart(2, "0")}. {s.label}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white self-start sm:self-auto shrink-0">+{c.zileIntarziere}z restante</span>
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
