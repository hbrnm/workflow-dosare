import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, LayoutGrid, List, AlertTriangle, X, Trash2,
  FileText, Link as LinkIcon, ChevronRight, ChevronLeft, Clock,
  Car, ShieldCheck, MessageSquare, Save, Loader2,
  BarChart3, Download, TrendingUp, Boxes, Wrench, Paintbrush, Play
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STATUSES = [
  { key: "primit",           num: 1, label: "Dosar primit",              phase: "start" },
  { key: "cerere_reparatie", num: 2, label: "Cerere intrare reparație",  phase: "start" },
  { key: "reconstatare",     num: 3, label: "Reconstatare",              phase: "eval"  },
  { key: "accept_plata",     num: 4, label: "Accept de plată",           phase: "eval"  },
  { key: "piese_comandate",  num: 5, label: "Piese comandate",           phase: "lucru" },
  { key: "piese_sosite",     num: 6, label: "Piese sosite",              phase: "lucru" },
  { key: "programat",        num: 7, label: "Programat",                 phase: "lucru" },
  { key: "in_lucru",         num: 8, label: "În lucru",                  phase: "lucru" },
  { key: "facturat",         num: 9, label: "Facturat",                  phase: "final" },
];

const PHASE_COLORS = {
  start: { bar: "#3B5166", tint: "#EEF1F3" },
  eval:  { bar: "#4A6FA5", tint: "#ECF1F7" },
  lucru: { bar: "#C98A2B", tint: "#FBF3E6" },
  final: { bar: "#3E6B45", tint: "#EEF5EE" },
};

const INSURERS = [
  "Asirom VIG", "Omniasig VIG", "Allianz-Țiriac", "Groupama Asigurări",
  "Euroins România", "Grawe România", "Generali România", "Uniqa Asigurări",
  "Axeria IARD", "Hellas Direct",
];

const PIE_COLORS = ["#3B5166", "#4A6FA5", "#C98A2B", "#3E6B45", "#B23A2E", "#8A8375", "#7A5316", "#2C4160", "#294A2E"];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

function daysBetween(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function emptyClaim(status = "primit") {
  return {
    id: uid(),
    numarDosar: "", tipAsigurare: "CASCO", asigurator: "", client: "", telefonClient: "",
    numarInmatriculare: "", vin: "", marcaModel: "", status,
    dataDeschiderii: todayISO(), dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(),
    termenAlertaZile: 5, note: [], documente: [],
    adusaFizic: false, ceEsteDeReparat: "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    pieseAudatex: 0, valoareAchizitieService: 0,
    masinaSchimb: "", dataPredareClient: "", zileChirieAudatex: 0,
  };
}

// --- mapare JS (camelCase) <-> coloane Supabase (snake_case) --------------
function toDb(c) {
  return {
    id: c.id,
    numar_dosar: c.numarDosar,
    tip_asigurare: c.tipAsigurare,
    asigurator: c.asigurator,
    client: c.client,
    telefon_client: c.telefonClient,
    numar_inmatriculare: c.numarInmatriculare,
    vin: c.vin,
    marca_model: c.marcaModel,
    status: c.status,
    data_deschiderii: c.dataDeschiderii || null,
    data_schimbare_status: c.dataSchimbareStatus,
    data_ultimei_actualizari: c.dataUltimeiActualizari,
    termen_alerta_zile: c.termenAlertaZile,
    note: c.note,
    documente: c.documente,
    adusa_fizic: c.adusaFizic,
    ce_este_de_reparat: c.ceEsteDeReparat,
    manopera: c.manopera,
    piese_audatex: c.pieseAudatex || 0,
    valoare_achizitie_service: c.valoareAchizitieService || 0,
    masina_schimb: c.masinaSchimb,
    data_predare_client: c.dataPredareClient || null,
    zile_chirie_audatex: c.zileChirieAudatex || 0,
    data_darii_la_schimb: c.dataDariiLaSchimb || null,
  };
}
function fromDb(r) {
  return {
    id: r.id,
    numarDosar: r.numar_dosar || "",
    tipAsigurare: r.tip_asigurare || "CASCO",
    asigurator: r.asigurator || "",
    client: r.client || "",
    telefonClient: r.telefon_client || "",
    numarInmatriculare: r.numar_inmatriculare || "",
    vin: r.vin || "",
    marcaModel: r.marca_model || "",
    status: r.status || "primit",
    dataDeschiderii: r.data_deschiderii || todayISO(),
    dataSchimbareStatus: r.data_schimbare_status || nowISO(),
    dataUltimeiActualizari: r.data_ultimei_actualizari || nowISO(),
    termenAlertaZile: r.termen_alerta_zile ?? 5,
    note: r.note || [],
    documente: r.documente || [],
    adusaFizic: !!r.adusa_fizic,
    ceEsteDeReparat: r.ce_este_de_reparat || "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.tinichigerie || {}) },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.vopsitorie || {}) },
    },
    pieseAudatex: r.piese_audatex || 0,
    valoareAchizitieService: r.valoare_achizitie_service || 0,
    masinaSchimb: r.masina_schimb || "",
    dataPredareClient: r.data_predare_client || "",
    zileChirieAudatex: r.zile_chirie_audatex || 0,
    dataDariiLaSchimb: r.data_darii_la_schimb || "",
  };
}

// ---------------------------------------------------------------------------
// Atomi UI
// ---------------------------------------------------------------------------
function Pill({ children, tone = "steel" }) {
  const tones = {
    steel: "bg-[#3B5166] text-white", amber: "bg-[#C98A2B] text-white",
    ghost: "bg-[#E4DFD3] text-[#4A443A]", danger: "bg-[#B23A2E] text-white",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}>{children}</span>;
}

function AlertBadge({ days, threshold }) {
  if (days < threshold) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#B23A2E] text-white text-[10px] font-bold">
      <AlertTriangle size={11} strokeWidth={2.5} />{days}z
    </span>
  );
}

function StageBar({ label, icon, data, onChange }) {
  const pct = data.alocat > 0 ? Math.min(100, Math.round((data.facturat / data.alocat) * 100)) : 0;
  const started = !!data.dataIntrareEtapa;
  const days = daysBetween(data.dataIntrareEtapa);
  return (
    <div className="border border-[#DAD4C6] rounded-lg p-2.5 bg-white">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#23282E]">{icon}{label}</span>
        {started ? (
          <span className="text-[10.5px] text-[#8A8375]">{days} zile în etapă</span>
        ) : (
          <button onClick={() => onChange({ ...data, dataIntrareEtapa: nowISO() })} className="flex items-center gap-1 text-[10.5px] font-semibold text-[#3B5166] hover:underline">
            <Play size={10} /> pornește
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min={0} className="w-20 border border-[#DAD4C6] rounded px-1.5 py-1 text-[12.5px]"
          value={data.facturat} onChange={(e) => onChange({ ...data, facturat: Number(e.target.value) || 0 })} />
        <div className="flex-1 h-1.5 bg-[#EFEAE1] rounded overflow-hidden">
          <div className="h-full bg-[#C98A2B]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-[10.5px] text-[#8A8375]">
        alocat{" "}
        <input type="number" min={0} className="w-16 border border-[#DAD4C6] rounded px-1 py-0.5 text-[10.5px]"
          value={data.alocat} onChange={(e) => onChange({ ...data, alocat: Number(e.target.value) || 0 })} />
        lei
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card Kanban
// ---------------------------------------------------------------------------
function ClaimCard({ claim, onOpen, onMove }) {
  const idx = STATUSES.findIndex((s) => s.key === claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 5);
  const phase = STATUSES[idx].phase;

  return (
    <div onClick={() => onOpen(claim)}
      className={`group relative bg-white rounded-md border cursor-pointer transition-shadow hover:shadow-md ${overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}
      style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase].bar }}>
      <div className="p-2.5 pb-2">
        <div className="flex items-start justify-between gap-1">
          <span className="font-mono text-[12px] font-bold text-[#23282E] truncate">{claim.numarDosar || "(fără nr.)"}</span>
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
        </div>
        <div className="mt-1 text-[13px] font-medium text-[#23282E] truncate">{claim.client || "Client neintrodus"}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6B6558]">
          <Car size={12} /><span className="font-mono">{claim.numarInmatriculare || "—"}</span><span className="truncate">{claim.marcaModel}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-[#8A8375] truncate">{claim.asigurator || "asigurător —"}</span>
          <AlertBadge days={days} threshold={claim.termenAlertaZile || 5} />
        </div>
        {(claim.adusaFizic || claim.manopera?.tinichigerie?.dataIntrareEtapa || claim.manopera?.vopsitorie?.dataIntrareEtapa) && (
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            {claim.adusaFizic && <Pill tone="ghost"><Car size={10} />adusă fizic</Pill>}
            {claim.manopera?.tinichigerie?.dataIntrareEtapa && !claim.manopera?.vopsitorie?.dataIntrareEtapa && <Pill tone="ghost"><Wrench size={10} />tinichigerie</Pill>}
            {claim.manopera?.vopsitorie?.dataIntrareEtapa && <Pill tone="ghost"><Paintbrush size={10} />vopsitorie</Pill>}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-[#EFEAE1] px-1.5 py-1" onClick={(e) => e.stopPropagation()}>
        <button disabled={idx === 0} onClick={() => onMove(claim, -1)} className="p-1 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"><ChevronLeft size={14} /></button>
        <span className="text-[10px] text-[#8A8375] flex items-center gap-1"><Clock size={10} />{days}z în etapă</span>
        <button disabled={idx === STATUSES.length - 1} onClick={() => onMove(claim, 1)} className="p-1 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function KanbanBoard({ claims, onOpen, onMove, onAddInStatus }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {STATUSES.map((s) => {
        const colClaims = claims.filter((c) => c.status === s.key);
        const colors = PHASE_COLORS[s.phase];
        return (
          <div key={s.key} className="flex-shrink-0 w-[240px] flex flex-col rounded-lg overflow-hidden border border-[#DAD4C6]" style={{ background: colors.tint }}>
            <div className="px-2.5 py-2 flex items-center justify-between" style={{ background: colors.bar }}>
              <div className="flex items-center gap-1.5 text-white">
                <span className="font-mono text-[11px] opacity-70">{String(s.num).padStart(2, "0")}</span>
                <span className="text-[12px] font-semibold">{s.label}</span>
              </div>
              <span className="text-[11px] font-bold text-white/80">{colClaims.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 min-h-[80px]">
              {colClaims.map((c) => <ClaimCard key={c.id} claim={c} onOpen={onOpen} onMove={onMove} />)}
              <button onClick={() => onAddInStatus(s.key)} className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-[#6B6558] rounded border border-dashed border-[#C7C0B0] hover:bg-white/60 hover:text-[#23282E] transition-colors">
                <Plus size={12} /> dosar nou
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClaimTable({ claims, onOpen }) {
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");
  const sorted = useMemo(() => {
    const arr = [...claims];
    arr.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "status") { av = STATUSES.findIndex((s) => s.key === a.status); bv = STATUSES.findIndex((s) => s.key === b.status); }
      av = av || ""; bv = bv || "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [claims, sortKey, sortDir]);
  const cols = [
    { key: "numarDosar", label: "Nr. dosar" }, { key: "tipAsigurare", label: "Tip" },
    { key: "asigurator", label: "Asigurător" }, { key: "client", label: "Client" },
    { key: "numarInmatriculare", label: "Nr. înmatr." }, { key: "marcaModel", label: "Marcă/Model" },
    { key: "status", label: "Status" }, { key: "dataDeschiderii", label: "Deschis" },
  ];
  const toggleSort = (k) => { if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir("asc"); } };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#DAD4C6] bg-white">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-[#23282E] text-white">
            {cols.map((c) => (
              <th key={c.key} onClick={() => toggleSort(c.key)} className="text-left px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap">
                {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
            ))}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const s = STATUSES.find((x) => x.key === c.status);
            const days = daysBetween(c.dataSchimbareStatus);
            const overdue = days >= (c.termenAlertaZile || 5);
            return (
              <tr key={c.id} onClick={() => onOpen(c)} className={`cursor-pointer border-t border-[#EFEAE1] hover:bg-[#F7F4EC] ${i % 2 ? "bg-[#FCFAF5]" : "bg-white"}`}>
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{c.numarDosar || "—"}</td>
                <td className="px-3 py-2"><Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill></td>
                <td className="px-3 py-2 whitespace-nowrap">{c.asigurator || "—"}</td>
                <td className="px-3 py-2">{c.client || "—"}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{c.numarInmatriculare || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{c.marcaModel || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-[11px] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
                  {overdue && <AlertBadge days={days} threshold={c.termenAlertaZile || 5} />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.dataDeschiderii)}</td>
                <td className="px-3 py-2"></td>
              </tr>
            );
          })}
          {sorted.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#8A8375]">Niciun dosar găsit.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, sub, tone = "steel" }) {
  const tones = { steel: "#3B5166", amber: "#C98A2B", green: "#3E6B45", danger: "#B23A2E" };
  return (
    <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex-1 min-w-[130px]">
      <div className="text-[11px] text-[#8A8375] font-medium uppercase tracking-wide">{label}</div>
      <div className="text-[24px] font-bold mt-0.5" style={{ color: tones[tone], fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      {sub && <div className="text-[11px] text-[#8A8375] mt-0.5">{sub}</div>}
    </div>
  );
}

function Dashboard({ claims, onOpen }) {
  const total = claims.length;
  const rca = claims.filter((c) => c.tipAsigurare === "RCA").length;
  const casco = claims.filter((c) => c.tipAsigurare === "CASCO").length;
  const active = claims.filter((c) => c.status !== "facturat").length;
  const overdueList = claims.map((c) => ({ ...c, zileIntarziere: daysBetween(c.dataSchimbareStatus) - (c.termenAlertaZile || 5) }))
    .filter((c) => c.zileIntarziere >= 0).sort((a, b) => b.zileIntarziere - a.zileIntarziere);
  const perStatus = STATUSES.map((s) => ({ name: String(s.num).padStart(2, "0"), label: s.label, total: claims.filter((c) => c.status === s.key).length, color: PHASE_COLORS[s.phase].bar }));
  const perAsigurator = useMemo(() => {
    const map = {};
    claims.forEach((c) => { const key = c.asigurator?.trim() || "Neprecizat"; map[key] = (map[key] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [claims]);
  const avgDaysOpen = useMemo(() => {
    const finished = claims.filter((c) => c.status === "facturat" || c.status === "finalizat");
    if (finished.length === 0) return null;
    return Math.round(finished.reduce((acc, c) => acc + daysBetween(c.dataDeschiderii), 0) / finished.length);
  }, [claims]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total dosare" value={total} tone="steel" />
        <StatCard label="RCA / CASCO" value={`${rca} / ${casco}`} tone="steel" />
        <StatCard label="Active (nefacturate)" value={active} tone="amber" />
        <StatCard label="Alerte depășite" value={overdueList.length} tone={overdueList.length ? "danger" : "green"} />
        <StatCard label="Zile medii pe dosar" value={avgDaysOpen ?? "—"} sub="dosare finalizate/facturate" tone="green" />
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
      <div className="bg-white rounded-lg border border-[#B23A2E]/40 overflow-hidden">
        <div className="bg-[#B23A2E] text-white px-3 py-2 text-[12.5px] font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> Dosare cu termen depășit ({overdueList.length})</div>
        {overdueList.length === 0 ? <div className="p-4 text-[12.5px] text-[#8A8375]">Niciun dosar depășit — totul e sub control.</div> : (
          <div className="divide-y divide-[#EFEAE1] max-h-64 overflow-y-auto">
            {overdueList.map((c) => {
              const s = STATUSES.find((x) => x.key === c.status);
              return (
                <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#FCFAF5]">
                  <div>
                    <span className="font-mono font-semibold text-[12.5px]">{c.numarDosar || "—"}</span>
                    <span className="text-[12px] text-[#6B6558] ml-2">{c.client}</span>
                    <div className="text-[11px] text-[#8A8375]">{String(s.num).padStart(2, "0")}. {s.label}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">+{c.zileIntarziere}z</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? "col-span-1 md:col-span-2 lg:col-span-3" : ""}`}>
      <span className="block text-[11px] text-[#6B6558] mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function ClaimModal({ claim, onClose, onSave, onDelete, programariList = [], onAddProgramare, onDeleteProgramare }) {
  const [form, setForm] = useState(claim);
  const [noteText, setNoteText] = useState("");
  const [docName, setDocName] = useState("");
  const [docLink, setDocLink] = useState("");
  const [programareDate, setProgramareDate] = useState("");
  const [programareNote, setProgramareNote] = useState("");
  useEffect(() => setForm(claim), [claim]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...f.manopera, [dept]: val } }));

  const handleSave = () => {
    if (!form.numarDosar.trim()) { alert("Introduceți numărul dosarului."); return; }
    const statusChanged = form.status !== claim.status;
    onSave({ ...form, dataUltimeiActualizari: nowISO(), dataSchimbareStatus: statusChanged ? nowISO() : form.dataSchimbareStatus });
  };
  const addNote = () => { if (!noteText.trim()) return; setForm((f) => ({ ...f, note: [{ id: uid(), data: nowISO(), text: noteText.trim() }, ...f.note] })); setNoteText(""); };
  const addDoc = () => { if (!docName.trim() || !docLink.trim()) return; setForm((f) => ({ ...f, documente: [{ id: uid(), nume: docName.trim(), link: docLink.trim() }, ...f.documente] })); setDocName(""); setDocLink(""); };
  const removeNote = (id) => setForm((f) => ({ ...f, note: f.note.filter((n) => n.id !== id) }));
  const removeDoc = (id) => setForm((f) => ({ ...f, documente: f.documente.filter((d) => d.id !== id) }));
  const isNew = !claim.numarDosar && claim.note.length === 0 && claim.documente.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[#FCFAF5] w-full max-w-6xl rounded-lg shadow-2xl my-6 border border-[#DAD4C6] flex flex-col" style={{ maxHeight: "calc(100vh - 4rem)" }}>
        <div className="flex items-center justify-between px-4 py-3 bg-[#23282E] rounded-t-lg">
          <div className="flex items-center gap-2 text-white"><FileText size={16} /><span className="font-semibold text-[14px]">{isNew ? "Dosar nou" : `Dosar ${claim.numarDosar}`}</span></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 12rem)" }}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
            <div className="lg:w-2/3 space-y-4 pr-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><ShieldCheck size={12} /> Identificare</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Field label="Nr. dosar daună"><input className="in" value={form.numarDosar} onChange={(e) => set("numarDosar", e.target.value)} placeholder="ex: 2026-00451" /></Field>
                  <Field label="Tip asigurare">
                    <select className="in" value={form.tipAsigurare} onChange={(e) => set("tipAsigurare", e.target.value)}>
                      <option value="RCA">RCA</option><option value="CASCO">CASCO</option>
                    </select>
                  </Field>
                  <Field label="Societate de asigurări" full>
                    <input className="in" list="insurers" value={form.asigurator} onChange={(e) => set("asigurator", e.target.value)} placeholder="ex: Allianz-Țiriac" />
                    <datalist id="insurers">{INSURERS.map((i) => <option key={i} value={i} />)}</datalist>
                  </Field>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Car size={12} /> Client &amp; auto</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Field label="Nume/Denumire asigurat"><input className="in" value={form.client} onChange={(e) => set("client", e.target.value)} /></Field>
                  <Field label="Telefon client"><input className="in" value={form.telefonClient} onChange={(e) => set("telefonClient", e.target.value)} /></Field>
                  <Field label="Nr. înmatriculare"><input className="in font-mono" value={form.numarInmatriculare} onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())} /></Field>
                  <Field label="Serie șasiu (VIN)"><input className="in font-mono" value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} maxLength={17} /></Field>
                  <Field label="Marcă / Model" full><input className="in" value={form.marcaModel} onChange={(e) => set("marcaModel", e.target.value)} /></Field>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Clock size={12} /> Tracking</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Field label="Status">
                    <select className="in" value={form.status} onChange={(e) => set("status", e.target.value)}>
                      {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Alertă după (zile în etapă)"><input type="number" min={1} className="in" value={form.termenAlertaZile} onChange={(e) => set("termenAlertaZile", Number(e.target.value) || 1)} /></Field>
                  <Field label="Data deschiderii"><input type="date" className="in" value={form.dataDeschiderii} onChange={(e) => set("dataDeschiderii", e.target.value)} /></Field>
                  <Field label="Ultima actualizare"><div className="in bg-[#EFEAE1] text-[#6B6558]">{fmtDate(form.dataUltimeiActualizari)}</div></Field>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Wrench size={12} /> Flux fizic în service</div>
                <label className="flex items-center gap-2 text-[12.5px] text-[#23282E] mb-2 cursor-pointer">
                  <input type="checkbox" checked={form.adusaFizic} onChange={(e) => set("adusaFizic", e.target.checked)} /> Mașina este adusă fizic în service
                </label>
                <Field label="Ce este de reparat" full>
                  <textarea className="in min-h-[64px]" placeholder="Ex: aripă dreapta față + ușă — îndreptat și vopsit; sau: doar înlocuit parbriz" value={form.ceEsteDeReparat} onChange={(e) => set("ceEsteDeReparat", e.target.value)} />
                </Field>
                <div className="text-[10.5px] text-[#8A8375] mt-2 mb-1.5">Manoperă facturată pe etape — se completează din „Accept de plată" încolo.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <StageBar label="Tinichigerie" icon={<Wrench size={12} className="text-[#3B5166]" />} data={form.manopera.tinichigerie} onChange={(v) => setStage("tinichigerie", v)} />
                  <StageBar label="Vopsitorie" icon={<Paintbrush size={12} className="text-[#7A4A9B]" />} data={form.manopera.vopsitorie} onChange={(v) => setStage("vopsitorie", v)} />
                    <Field label="Valoare piese Audatex"><input type="number" min={0} className="in" value={form.pieseAudatex} onChange={(e) => set("pieseAudatex", Number(e.target.value) || 0)} /></Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    <Field label="Mașină la schimb (nr.)"><input className="in" placeholder="lasă gol dacă nu se oferă" value={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.value)} /></Field>
                    <Field label="Data predare client"><input type="date" className="in" value={form.dataPredareClient || form.dataDariiLaSchimb} onChange={(e) => set("dataPredareClient", e.target.value)} /></Field>
                    <Field label="Zile chirie conform Audatex"><input type="number" min={0} className="in" value={form.zileChirieAudatex} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} /></Field>
                  </div>
              </div>
            </div>

            <div className="lg:w-1/3 space-y-4 mt-4 lg:mt-0">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><LinkIcon size={12} /> Documente (PV, deviz, factură, accept plată)</div>
                <div className="flex gap-2 mb-2">
                  <input className="in flex-1" placeholder="Denumire (ex: Deviz reparație)" value={docName} onChange={(e) => setDocName(e.target.value)} />
                  <input className="in flex-1" placeholder="Link fișier" value={docLink} onChange={(e) => setDocLink(e.target.value)} />
                  <button onClick={addDoc} className="px-2.5 rounded bg-[#3B5166] text-white hover:bg-[#2C3E4C]"><Plus size={16} /></button>
                </div>
                <div className="space-y-1">
                  {form.documente.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded px-2.5 py-1.5 text-[12.5px]">
                      <a href={d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] underline truncate flex-1">{d.nume}</a>
                      <button onClick={() => removeDoc(d.id)} className="text-[#B23A2E] hover:opacity-70 ml-2"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {form.documente.length === 0 && <div className="text-[12px] text-[#8A8375]">Niciun document adăugat.</div>}
                </div>
              </div>

              {form.status === "piese_sosite" && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Clock size={12} /> Programări</div>
                  <div className="flex gap-2 mb-2">
                    <input type="datetime-local" className="in flex-1" value={programareDate} onChange={(e) => setProgramareDate(e.target.value)} />
                    <input className="in flex-1" placeholder="Notă programare" value={programareNote} onChange={(e) => setProgramareNote(e.target.value)} />
                    <button onClick={() => { if (!programareDate) return; onAddProgramare(form.id, programareDate, programareNote); setProgramareDate(""); setProgramareNote(""); }} className="px-2.5 rounded bg-[#3B5166] text-white hover:bg-[#2C3E4C]"><Plus size={16} /></button>
                  </div>
                  <div className="space-y-1">
                    {programariList.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded px-2.5 py-1.5 text-[12.5px]">
                        <div className="text-[12px]">{new Date(p.data_programare).toLocaleString("ro-RO")}{p.nota ? ` — ${p.nota}` : ""}</div>
                        <button onClick={() => onDeleteProgramare(p.id)} className="text-[#B23A2E] hover:opacity-70 ml-2"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {programariList.length === 0 && <div className="text-[12px] text-[#8A8375]">Nicio programare.</div>}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><MessageSquare size={12} /> Istoric note</div>
                <div className="flex gap-2 mb-2">
                  <input className="in flex-1" placeholder="Adaugă o notă..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
                  <button onClick={addNote} className="px-2.5 rounded bg-[#3B5166] text-white hover:bg-[#2C3E4C]"><Plus size={16} /></button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {form.note.map((n) => (
                    <div key={n.id} className="bg-white border border-[#DAD4C6] rounded px-2.5 py-1.5 text-[12.5px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8375] font-mono">{new Date(n.data).toLocaleString("ro-RO")}</span>
                        <button onClick={() => removeNote(n.id)} className="text-[#B23A2E] hover:opacity-70"><Trash2 size={12} /></button>
                      </div>
                      <div className="mt-0.5">{n.text}</div>
                    </div>
                  ))}
                  {form.note.length === 0 && <div className="text-[12px] text-[#8A8375]">Nicio notă încă.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#DAD4C6]">
          <button onClick={() => { if (confirm("Ștergi definitiv acest dosar?")) onDelete(claim.id); }} className="flex items-center gap-1 text-[#B23A2E] text-[13px] font-medium hover:opacity-70"><Trash2 size={14} /> Șterge dosar</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-[#C7C0B0] text-[13px] text-[#4A443A] hover:bg-[#EFEAE1]">Anulează</button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#C98A2B] text-white text-[13px] font-semibold hover:bg-[#B37A22]"><Save size={14} /> Salvează</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [modalClaim, setModalClaim] = useState(null);

  const [programari, setProgramari] = useState([]);
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [schedForClaim, setSchedForClaim] = useState(null);

  const missingSupabase = !(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) setErrorMsg(error.message);
    else setClaims((data || []).map(fromDb));
    setLoading(false);
  }, []);

  const loadProgramari = useCallback(async () => {
    const { data, error } = await supabase.from("programari").select("*").order("data_programare", { ascending: true });
    if (error) { console.error(error); return; }
    setProgramari(data || []);
  }, []);

  useEffect(() => { if (missingSupabase) { setLoading(false); return; } loadAll(); loadProgramari(); }, [loadAll, loadProgramari, missingSupabase]);

  const handleSave = async (claim) => {
    setSaving(true);
    const { error } = await supabase.from("dosare").upsert(toDb(claim));
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    setModalClaim(null);
    loadAll();
  };

  const handleDelete = async (id) => {
    setSaving(true);
    const { error } = await supabase.from("dosare").delete().eq("id", id);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    setModalClaim(null);
    loadAll();
  };

  const addProgramare = async (dosarId, dataProgramare, nota = "") => {
    const payload = { dosar_id: dosarId, data_programare: dataProgramare, nota };
    setSaving(true);
    const { error } = await supabase.from("programari").insert(payload);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    loadProgramari();
  };

  const deleteProgramare = async (id) => {
    setSaving(true);
    const { error } = await supabase.from("programari").delete().eq("id", id);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    loadProgramari();
  };

  const handleMove = async (claim, dir) => {
    const idx = STATUSES.findIndex((s) => s.key === claim.status);
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    const updated = { ...claim, status: STATUSES[nextIdx].key, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO() };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { setErrorMsg(error.message); loadAll(); }
  };

  const openNew = (status = "primit") => setModalClaim(emptyClaim(status));
  const openExisting = (claim) => setModalClaim(claim);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (onlyAlerts && daysBetween(c.dataSchimbareStatus) < (c.termenAlertaZile || 5)) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });
  }, [claims, search, filterTip, filterStatus, onlyAlerts]);

  const alertCount = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 5)).length, [claims]);

  const exportExcel = () => {
    const rows = claims.map((c) => ({
      "Nr. dosar": c.numarDosar, "Tip": c.tipAsigurare, "Asigurător": c.asigurator, "Client": c.client,
      "Nr. înmatriculare": c.numarInmatriculare, "VIN": c.vin, "Marcă/Model": c.marcaModel,
      "Status": STATUSES.find((s) => s.key === c.status)?.label, "Data deschiderii": c.dataDeschiderii,
      "Facturat Tinichigerie": c.manopera.tinichigerie.facturat, "Facturat Vopsitorie": c.manopera.vopsitorie.facturat,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosare");
    XLSX.writeFile(wb, `dosare-dauna-${todayISO()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#EFEAE1]">
      {missingSupabase && (
        <div className="bg-[#B23A2E] text-white text-[12.5px] px-4 py-2 flex items-center justify-between">
          <span>Lipsesc variabilele de mediu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Vezi .env.example și README.md.</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-[#B23A2E] text-white text-[12.5px] px-4 py-2 flex items-center justify-between">
          <span>Eroare Supabase: {errorMsg}</span>
          <button onClick={() => setErrorMsg("")}><X size={14} /></button>
        </div>
      )}
      <div className="bg-[#23282E] px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#C98A2B] flex items-center justify-center"><ShieldCheck size={18} className="text-white" /></div>
            <div>
              <div className="text-white font-semibold text-[15px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dosare Daună · Flux Administrativ &amp; Fizic</div>
              <div className="text-[11px] text-white/50">{claims.length} dosare {saving && <span className="inline-flex items-center gap-1 ml-1"><Loader2 size={10} className="animate-spin" />se salvează</span>}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <button onClick={() => setOnlyAlerts((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyAlerts ? "bg-[#B23A2E] text-white" : "bg-[#B23A2E]/20 text-[#F3C0BA]"}`}>
                <AlertTriangle size={13} /> {alertCount} depășite
              </button>
            )}
            <div className="flex rounded overflow-hidden border border-white/20">
              <button onClick={() => setView("kanban")} className={`p-1.5 ${view === "kanban" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`}><LayoutGrid size={15} /></button>
              <button onClick={() => setView("list")} className={`p-1.5 ${view === "list" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`}><List size={15} /></button>
              <button onClick={() => setView("dashboard")} className={`p-1.5 ${view === "dashboard" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`}><BarChart3 size={15} /></button>
            </div>
            <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 rounded border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/10"><Download size={14} /> Excel</button>
            <button onClick={() => openNew()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#C98A2B] text-white text-[12.5px] font-semibold hover:bg-[#B37A22]"><Plus size={14} /> Dosar nou</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-white border-b border-[#DAD4C6] flex flex-wrap items-center gap-2 sticky top-[57px] z-20">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8A8375]" />
          <input className="w-full pl-7 pr-2 py-1.5 rounded border border-[#DAD4C6] text-[13px]" placeholder="Caută: nr. dosar, client, nr. înmatriculare, asigurător, VIN..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="in max-w-[110px]" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
          <option value="toate">Toate tipurile</option><option value="RCA">RCA</option><option value="CASCO">CASCO</option>
        </select>
        <select className="in max-w-[200px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="toate">Toate statusurile</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
        </select>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă dosarele...</div>
        ) : view === "kanban" ? (
          <KanbanBoard claims={filtered} onOpen={openExisting} onMove={handleMove} onAddInStatus={openNew} />
        ) : view === "list" ? (
          <ClaimTable claims={filtered} onOpen={openExisting} />
        ) : (
          <Dashboard claims={filtered} onOpen={openExisting} />
        )}
      </div>

      {modalClaim && <ClaimModal
        claim={modalClaim}
        onClose={() => setModalClaim(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        programariList={programari.filter((p) => p.dosar_id === modalClaim.id)}
        onAddProgramare={(d, dt, note) => addProgramare(d, dt, note)}
        onDeleteProgramare={(id) => deleteProgramare(id)}
      />}
    </div>
  );
}
