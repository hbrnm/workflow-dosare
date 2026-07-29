import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Search, LayoutGrid, List, AlertTriangle, X, Trash2,
  FileText, Link as LinkIcon, ChevronRight, ChevronLeft, Clock,
  Car, ShieldCheck, MessageSquare, Save, Loader2,
  BarChart3, Download, TrendingUp, Boxes, Wrench, Paintbrush, Play,
  Phone, CalendarClock, ArrowRight, Wallet, Image as ImageIcon, Upload,
  FileDown, History, AlertOctagon
} from "lucide-react";
import { jsPDF } from "jspdf";
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

// chei vechi -> chei noi, pentru dosarele salvate înainte de această actualizare
const STATUS_MIGRATION = { chemat_lucru: "programat", finalizat: "in_lucru" };
// stadii din care un dosar poate fi programat în service
const STADII_PROGRAMABILE = ["piese_sosite", "programat", "in_lucru"];

const PHASE_COLORS = {
  start: { bar: "#3B5166", tint: "#EEF1F3" },
  eval:  { bar: "#4A6FA5", tint: "#ECF1F7" },
  lucru: { bar: "#C98A2B", tint: "#FBF3E6" },
  final: { bar: "#3E6B45", tint: "#EEF5EE" },
};

const INSURERS = [
  "Omniasig VIG", "Asirom VIG", "Allianz-Țiriac", "Groupama Asigurări",
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
    termenAlertaZile: 3, dataProgramare: "", note: [], documente: [],
    adusaFizic: false, ceEsteDeReparat: "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    masinaSchimb: "", dataDariiLaSchimb: "", zileChirieAudatex: 0,
    valoarePieseAudatex: 0, valoareAchizitiePiese: 0,
    blocat: false, motivBlocare: "",
    createdByEmail: "", updatedByEmail: "",
    poze: [],
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
    data_programare: c.dataProgramare || null,
    note: c.note,
    documente: c.documente,
    adusa_fizic: c.adusaFizic,
    ce_este_de_reparat: c.ceEsteDeReparat,
    manopera: c.manopera,
    masina_schimb: c.masinaSchimb,
    data_darii_la_schimb: c.dataDariiLaSchimb || null,
    zile_chirie_audatex: c.zileChirieAudatex,
    valoare_piese_audatex: c.valoarePieseAudatex,
    valoare_achizitie_piese: c.valoareAchizitiePiese,
    blocat: c.blocat,
    motiv_blocare: c.motivBlocare,
    created_by_email: c.createdByEmail || null,
    updated_by_email: c.updatedByEmail || null,
    poze: c.poze,
  };
}
function fromDb(r) {
  const migratedStatus = STATUS_MIGRATION[r.status] || r.status || "primit";
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
    status: migratedStatus,
    dataDeschiderii: r.data_deschiderii || todayISO(),
    dataSchimbareStatus: r.data_schimbare_status || nowISO(),
    dataUltimeiActualizari: r.data_ultimei_actualizari || nowISO(),
    termenAlertaZile: r.termen_alerta_zile ?? 3,
    dataProgramare: r.data_programare ? String(r.data_programare).slice(0, 16) : "",
    note: r.note || [],
    documente: r.documente || [],
    adusaFizic: !!r.adusa_fizic,
    ceEsteDeReparat: r.ce_este_de_reparat || "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.tinichigerie || {}) },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.vopsitorie || {}) },
    },
    masinaSchimb: r.masina_schimb || "",
    dataDariiLaSchimb: r.data_darii_la_schimb || "",
    zileChirieAudatex: r.zile_chirie_audatex ?? 0,
    valoarePieseAudatex: r.valoare_piese_audatex ?? 0,
    valoareAchizitiePiese: r.valoare_achizitie_piese ?? 0,
    blocat: !!r.blocat,
    motivBlocare: r.motiv_blocare || "",
    createdByEmail: r.created_by_email || "",
    updatedByEmail: r.updated_by_email || "",
    createdBy: r.created_by || null,
    poze: r.poze || [],
  };
}

// ---------------------------------------------------------------------------
// Istoric modificări — traducere nume coloane pentru afișare umană
// ---------------------------------------------------------------------------
const CAMP_LABELS = {
  numar_dosar: "Nr. dosar", tip_asigurare: "Tip asigurare", asigurator: "Asigurător",
  client: "Client", telefon_client: "Telefon client", numar_inmatriculare: "Nr. înmatriculare",
  vin: "VIN", marca_model: "Marcă/Model", status: "Status", data_deschiderii: "Data deschiderii",
  data_schimbare_status: "Data schimbării statusului", termen_alerta_zile: "Termen alertă (zile)",
  data_programare: "Programare service", note: "Note", documente: "Documente",
  adusa_fizic: "Adusă fizic", ce_este_de_reparat: "Ce e de reparat", manopera: "Manoperă",
  masina_schimb: "Mașină la schimb", data_darii_la_schimb: "Data dării la schimb",
  zile_chirie_audatex: "Zile chirie Audatex", valoare_piese_audatex: "Valoare piese Audatex",
  valoare_achizitie_piese: "Valoare achiziție piese", blocat: "Dosar blocat", motiv_blocare: "Motiv blocare",
  poze: "Poze", _creat: "Dosar creat",
};
const COMPLEX_FIELDS = new Set(["note", "documente", "manopera", "poze"]);

function formatIstoricValoare(camp, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (camp === "status") { const s = STATUSES.find((x) => x.key === val); return s ? s.label : val; }
  if (typeof val === "boolean") return val ? "da" : "nu";
  if (COMPLEX_FIELDS.has(camp)) return "actualizat(ă)";
  return String(val);
}

function generateazaPDF(claim) {
  const doc = new jsPDF();
  const s = STATUSES.find((x) => x.key === claim.status);
  let y = 20;
  doc.setFontSize(16); doc.text("Proces verbal / Fișă dosar", 14, y); y += 10;
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Generat la ${new Date().toLocaleString("ro-RO")}`, 14, y); y += 10;
  doc.setTextColor(0); doc.setFontSize(11);
  const linie = (label, val) => { doc.setFont(undefined, "bold"); doc.text(`${label}:`, 14, y); doc.setFont(undefined, "normal"); doc.text(String(val || "—"), 70, y); y += 7; };
  linie("Nr. dosar", claim.numarDosar);
  linie("Tip asigurare", claim.tipAsigurare);
  linie("Asigurător", claim.asigurator);
  linie("Status", s ? `${s.num}. ${s.label}` : claim.status);
  y += 3;
  linie("Client", claim.client);
  linie("Telefon", claim.telefonClient);
  linie("Nr. înmatriculare", claim.numarInmatriculare);
  linie("VIN", claim.vin);
  linie("Marcă/Model", claim.marcaModel);
  y += 3;
  doc.setFont(undefined, "bold"); doc.text("Ce este de reparat:", 14, y); y += 6;
  doc.setFont(undefined, "normal");
  const desc = doc.splitTextToSize(claim.ceEsteDeReparat || "—", 180);
  doc.text(desc, 14, y); y += desc.length * 6 + 4;
  linie("Mașină la schimb", claim.masinaSchimb);
  linie("Zile chirie Audatex", claim.zileChirieAudatex);
  y += 3;
  linie("Valoare piese Audatex", `${claim.valoarePieseAudatex || 0} lei`);
  linie("Valoare achiziție piese", `${claim.valoareAchizitiePiese || 0} lei`);
  linie("Manoperă tinichigerie", `${claim.manopera.tinichigerie.facturat || 0} lei`);
  linie("Manoperă vopsitorie", `${claim.manopera.vopsitorie.facturat || 0} lei`);
  y += 6;
  doc.setDrawColor(180); doc.line(14, y, 90, y + 25); doc.line(120, y, 196, y + 25);
  doc.setFontSize(9); doc.text("Semnătură client", 14, y + 30); doc.text("Semnătură service", 120, y + 30);
  doc.save(`dosar-${claim.numarDosar || "nou"}.pdf`);
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
function ClaimCard({ claim, onOpen, onMove, canEdit }) {
  const idx = STATUSES.findIndex((s) => s.key === claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const phase = STATUSES[idx].phase;

  return (
    <div onClick={() => onOpen(claim)}
      className={`group relative bg-white rounded-md border cursor-pointer transition-shadow hover:shadow-md ${claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}
      style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase].bar }}>
      <div className="p-2.5 pb-2">
        <div className="flex items-start justify-between gap-1">
          <span className="font-mono text-[12px] font-bold text-[#23282E] truncate">{claim.numarDosar || "(fără nr.)"}</span>
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
        </div>
        <div className="mt-1 text-[13px] font-medium text-[#23282E] truncate">{claim.client || "Client neintrodus"}</div>
        {claim.telefonClient && <div className="flex items-center gap-1 text-[11px] text-[#6B6558]"><Phone size={11} />{claim.telefonClient}</div>}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6B6558]">
          <Car size={12} /><span className="font-mono">{claim.numarInmatriculare || "—"}</span><span className="truncate">{claim.marcaModel}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] text-[#8A8375] truncate">{claim.asigurator || "asigurător —"}</span>
          <div className="flex items-center gap-1">
            {!canEdit && <Pill tone="ghost">doar vizualizare</Pill>}
            {claim.blocat && <Pill tone="danger"><AlertTriangle size={10} />blocat</Pill>}
            <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
          </div>
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
        <button disabled={!canEdit || idx === 0} onClick={() => onMove(claim, -1)} className="p-1 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"><ChevronLeft size={14} /></button>
        <span className="text-[10px] text-[#8A8375] flex items-center gap-1"><Clock size={10} />{days}z în etapă</span>
        <button disabled={!canEdit || idx === STATUSES.length - 1} onClick={() => onMove(claim, 1)} className="p-1 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function KanbanBoard({ claims, onOpen, onMove, onAddInStatus, canEditFn }) {
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
              {colClaims.map((c) => <ClaimCard key={c.id} claim={c} onOpen={onOpen} onMove={onMove} canEdit={canEditFn(c)} />)}
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

function ClaimTable({ claims, onOpen, canEditFn }) {
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
            const overdue = days >= (c.termenAlertaZile || 3);
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
                  {overdue && <AlertBadge days={days} threshold={c.termenAlertaZile || 3} />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.dataDeschiderii)}</td>
                <td className="px-3 py-2">{!canEditFn(c) && <Pill tone="ghost">doar vizualizare</Pill>}</td>
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
  const blockedCount = claims.filter((c) => c.blocat).length;
  const overdueList = claims.map((c) => ({ ...c, zileIntarziere: daysBetween(c.dataSchimbareStatus) - (c.termenAlertaZile || 3) }))
    .filter((c) => c.zileIntarziere >= 0).sort((a, b) => b.zileIntarziere - a.zileIntarziere);
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total dosare" value={total} tone="steel" />
        <StatCard label="RCA / CASCO" value={`${rca} / ${casco}`} tone="steel" />
        <StatCard label="Active (nefacturate)" value={active} tone="amber" />
        <StatCard label="Dosare blocate" value={blockedCount} tone={blockedCount ? "danger" : "green"} />
        <StatCard label="Alerte depășite" value={overdueList.length} tone={overdueList.length ? "danger" : "green"} />
        <StatCard label="Zile medii pe dosar" value={avgDaysOpen ?? "—"} sub="dosare facturate" tone="green" />
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
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="block text-[11px] text-[#6B6558] mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function ClaimModal({ claim, onClose, onSave, onDelete, readOnly, allClaims, onJumpTo }) {
  const [form, setForm] = useState(claim);
  const [noteText, setNoteText] = useState("");
  const [docName, setDocName] = useState("");
  const [docLink, setDocLink] = useState("");
  const [istoric, setIstoric] = useState([]);
  const [loadingIstoric, setLoadingIstoric] = useState(false);
  const [uploadingPoze, setUploadingPoze] = useState(false);
  const [uploadingDocumente, setUploadingDocumente] = useState(false);
  const isNew = !claim.numarDosar && claim.note.length === 0 && claim.documente.length === 0;

  useEffect(() => setForm(claim), [claim]);

  useEffect(() => {
    if (isNew) { setIstoric([]); return; }
    setLoadingIstoric(true);
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setIstoric(data || []))
      .finally(() => setLoadingIstoric(false));
  }, [claim.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...f.manopera, [dept]: val } }));

  // client/vehicul recunoscut — alte dosare cu același telefon sau VIN
  const istoricClientVehicul = useMemo(() => {
    if (!allClaims) return [];
    const tel = form.telefonClient.trim();
    const vin = form.vin.trim().toUpperCase();
    if (!tel && !vin) return [];
    return allClaims.filter((c) => c.id !== claim.id && (
      (tel && c.telefonClient.trim() === tel) || (vin && c.vin.trim().toUpperCase() === vin)
    ));
  }, [allClaims, form.telefonClient, form.vin, claim.id]);

  const handleSave = () => {
    if (!form.numarDosar.trim()) { alert("Introduceți numărul dosarului."); return; }
    if (!form.numarInmatriculare.trim()) { alert("Introduceți numărul de înmatriculare."); return; }

    if (isNew && allClaims) {
      const duplicat = allClaims.find((c) =>
        c.numarInmatriculare.trim().toUpperCase() === form.numarInmatriculare.trim().toUpperCase() &&
        c.status !== "facturat"
      );
      if (duplicat) {
        const ok = confirm(`Există deja un dosar activ pentru ${form.numarInmatriculare} (dosarul ${duplicat.numarDosar || "—"}, status „${STATUSES.find((s) => s.key === duplicat.status)?.label}"). Continui oricum?`);
        if (!ok) return;
      }
    }

    const statusChanged = form.status !== claim.status;
    if (statusChanged && form.status === "facturat") {
      const faraValori = !form.manopera.tinichigerie.facturat && !form.manopera.vopsitorie.facturat &&
        !form.valoarePieseAudatex && !form.valoareAchizitiePiese;
      if (faraValori) {
        const ok = confirm("Nu ai completat nicio valoare de manoperă sau piese pentru acest dosar. Sigur vrei să-l marchezi ca facturat?");
        if (!ok) return;
      }
    }

    onSave({ ...form, dataUltimeiActualizari: nowISO(), dataSchimbareStatus: statusChanged ? nowISO() : form.dataSchimbareStatus });
  };
  const addNote = () => { if (!noteText.trim()) return; setForm((f) => ({ ...f, note: [{ id: uid(), data: nowISO(), text: noteText.trim() }, ...f.note] })); setNoteText(""); };
  const addDoc = () => { if (!docLink.trim()) return; const nume = docName.trim() || `Document ${form.documente.length + 1}`; setForm((f) => ({ ...f, documente: [{ id: uid(), nume, link: docLink.trim() }, ...f.documente] })); setDocName(""); setDocLink(""); };
  const removeNote = (id) => setForm((f) => ({ ...f, note: f.note.filter((n) => n.id !== id) }));
  const removeDoc = async (id) => {
    const doc = form.documente.find((d) => d.id === id);
    if (doc?.path) {
      await supabase.storage.from("poze-dosare").remove([doc.path]);
    }
    setForm((f) => ({ ...f, documente: f.documente.filter((d) => d.id !== id) }));
  };

  const handleUploadPoze = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingPoze(true);
    const noi = [];
    for (const file of files) {
      const path = `${claim.id}/${uid()}-${file.name}`;
      const { error } = await supabase.storage.from("poze-dosare").upload(path, file);
      if (error) { alert(`Eroare la încărcarea „${file.name}”: ${error.message}`); continue; }
      const { data: signed } = await supabase.storage.from("poze-dosare").createSignedUrl(path, 60 * 60 * 24 * 365);
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, poze: [...noi, ...f.poze] }));
    setUploadingPoze(false);
  };

  const handleUploadDocumente = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingDocumente(true);
    const noi = [];
    for (const file of files) {
      const path = `${claim.id}/documente/${uid()}-${file.name}`;
      const { error } = await supabase.storage.from("poze-dosare").upload(path, file);
      if (error) { alert(`Eroare la încărcarea documentului „${file.name}”: ${error.message}`); continue; }
      const { data: signed } = await supabase.storage.from("poze-dosare").createSignedUrl(path, 60 * 60 * 24 * 365);
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, documente: [...noi, ...f.documente] }));
    setUploadingDocumente(false);
  };

  const removePoza = async (poza) => {
    await supabase.storage.from("poze-dosare").remove([poza.path]);
    setForm((f) => ({ ...f, poze: f.poze.filter((p) => p.id !== poza.id) }));
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <div onClick={(e) => e.stopPropagation()} className="bg-[#FCFAF5] w-full max-w-5xl rounded-lg shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#23282E] rounded-t-lg shrink-0">
          <div className="flex items-center gap-2 text-white"><FileText size={16} /><span className="font-semibold text-[14px]">{isNew ? "Dosar nou" : `Dosar ${claim.numarDosar}`}</span></div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button onClick={() => generateazaPDF(form)} className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1">
                <FileDown size={12} /> PDF
              </button>
            )}
            {!isNew && (claim.createdByEmail || claim.updatedByEmail) && (
              <span className="hidden sm:block text-[10.5px] text-white/45 text-right leading-tight">
                {claim.createdByEmail && <div>creat de {claim.createdByEmail}</div>}
                {claim.updatedByEmail && <div>ultima modificare: {claim.updatedByEmail}</div>}
              </span>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
          </div>
        </div>
        {readOnly && (
          <div className="px-4 py-2 bg-[#EFEAE1] text-[#6B6558] text-[12px] flex items-center gap-1.5 shrink-0 border-b border-[#DAD4C6]">
            <ShieldCheck size={13} /> Doar vizualizare — acest dosar a fost creat de {claim.createdByEmail || "alt coleg"}, doar el îl poate edita sau șterge.
          </div>
        )}
        <fieldset disabled={readOnly} className="p-4 overflow-y-auto grid md:grid-cols-2 gap-x-5 gap-y-4 border-0 m-0 min-w-0">
          <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><ShieldCheck size={12} /> Identificare</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nr. dosar daună"><input className="in" value={form.numarDosar} onChange={(e) => set("numarDosar", e.target.value)} placeholder="ex: 2026-00451" /></Field>
              <Field label="Tip asigurare">
                <select className="in" value={form.tipAsigurare} onChange={(e) => set("tipAsigurare", e.target.value)}>
                  <option value="CASCO">CASCO</option><option value="RCA">RCA</option>
                </select>
              </Field>
              <Field label="Societate de asigurări" full>
                <select className="in" value={form.asigurator} onChange={(e) => set("asigurator", e.target.value)}>
                  <option value="" disabled>-- Alege societatea --</option>
                  {INSURERS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Car size={12} /> Client &amp; auto</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nume/Denumire asigurat" full><input className="in" value={form.client} onChange={(e) => set("client", e.target.value)} /></Field>
              <Field label="Telefon client"><input className="in" type="tel" placeholder="07xx xxx xxx" value={form.telefonClient} onChange={(e) => set("telefonClient", e.target.value)} /></Field>
              <Field label="Nr. înmatriculare"><input className="in font-mono" value={form.numarInmatriculare} onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())} /></Field>
              <Field label="Serie șasiu (VIN)"><input className="in font-mono" value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} maxLength={17} /></Field>
              <Field label="Marcă / Model" full><input className="in" value={form.marcaModel} onChange={(e) => set("marcaModel", e.target.value)} /></Field>
            </div>
            {istoricClientVehicul.length > 0 && (
              <div className="mt-2 rounded-md border border-[#4A6FA5]/40 bg-[#ECF1F7] p-2">
                <div className="text-[11px] font-bold text-[#2C4160] flex items-center gap-1 mb-1">
                  <History size={11} /> Client/vehicul cunoscut — {istoricClientVehicul.length} dosar(e) anterior(oare)
                </div>
                <div className="space-y-0.5">
                  {istoricClientVehicul.slice(0, 5).map((c) => {
                    const s = STATUSES.find((x) => x.key === c.status);
                    return (
                      <button key={c.id} type="button" onClick={() => onJumpTo && onJumpTo(c)} className="block w-full text-left text-[11.5px] text-[#2C4160] hover:underline">
                        {c.numarDosar || "—"} · {c.marcaModel} · {String(s.num).padStart(2, "0")}. {s.label} · {fmtDate(c.dataDeschiderii)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Clock size={12} /> Tracking</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Status">
                <select className="in" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
                </select>
              </Field>
              <Field label="Alertă după (zile în etapă)"><input type="number" min={1} className="in" value={form.termenAlertaZile} onChange={(e) => set("termenAlertaZile", Number(e.target.value) || 1)} /></Field>
              <Field label="Data deschiderii"><input type="date" className="in" value={form.dataDeschiderii} onChange={(e) => set("dataDeschiderii", e.target.value)} /></Field>
              <Field label="Ultima actualizare"><div className="in bg-[#EFEAE1] text-[#6B6558]">{fmtDate(form.dataUltimeiActualizari)}</div></Field>
              <Field label="Programare service" full><input type="datetime-local" className="in" value={form.dataProgramare} onChange={(e) => set("dataProgramare", e.target.value)} /></Field>
            </div>
            <label className={`flex items-center gap-2 text-[12.5px] mt-2.5 cursor-pointer px-2.5 py-2 rounded-md border ${form.blocat ? "bg-[#B23A2E]/10 border-[#B23A2E] text-[#8C2E2E]" : "border-[#DAD4C6] text-[#23282E]"}`}>
              <input type="checkbox" checked={form.blocat} onChange={(e) => set("blocat", e.target.checked)} /> Dosar blocat
            </label>
            {form.blocat && (
              <input className="in mt-1.5" placeholder="Motivul blocării (ex: litigiu cu asigurătorul, lipsă piese pe stoc...)" value={form.motivBlocare} onChange={(e) => set("motivBlocare", e.target.value)} />
            )}
          </div>
          </div>

          <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Wrench size={12} /> Flux fizic în service</div>
            <label className="flex items-center gap-2 text-[12.5px] text-[#23282E] mb-2 cursor-pointer">
              <input type="checkbox" checked={form.adusaFizic} onChange={(e) => set("adusaFizic", e.target.checked)} /> Mașina este adusă fizic în service
            </label>
            <Field label="Ce este de reparat" full>
              <textarea className="in min-h-[52px]" placeholder="Ex: aripă dreapta față + ușă — îndreptat și vopsit; sau: doar înlocuit parbriz" value={form.ceEsteDeReparat} onChange={(e) => set("ceEsteDeReparat", e.target.value)} />
            </Field>
            <div className="text-[10.5px] text-[#8A8375] mt-2 mb-1.5">Manoperă facturată pe etape — se completează din „Accept de plată" încolo.</div>
            <div className="grid grid-cols-2 gap-2">
              <StageBar label="Tinichigerie" icon={<Wrench size={12} className="text-[#3B5166]" />} data={form.manopera.tinichigerie} onChange={(v) => setStage("tinichigerie", v)} />
              <StageBar label="Vopsitorie" icon={<Paintbrush size={12} className="text-[#7A4A9B]" />} data={form.manopera.vopsitorie} onChange={(v) => setStage("vopsitorie", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="border border-[#DAD4C6] rounded-lg p-2.5 bg-white">
                <div className="text-[12px] font-bold text-[#23282E] mb-1">Valoare piese Audatex</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} className="in" value={form.valoarePieseAudatex} onChange={(e) => set("valoarePieseAudatex", Number(e.target.value) || 0)} />
                  <span className="text-[11px] text-[#8A8375]">lei</span>
                </div>
              </div>
              <div className="border border-[#DAD4C6] rounded-lg p-2.5 bg-white">
                <div className="text-[12px] font-bold text-[#23282E] mb-1">Valoare achiziție piese service</div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} className="in" value={form.valoareAchizitiePiese} onChange={(e) => set("valoareAchizitiePiese", Number(e.target.value) || 0)} />
                  <span className="text-[11px] text-[#8A8375]">lei</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Field label="Mașină la schimb (nr.)"><input className="in" placeholder="lasă gol dacă nu se oferă" value={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.value)} /></Field>
              <Field label="Data dării la schimb"><input type="date" className="in" value={form.dataDariiLaSchimb} onChange={(e) => set("dataDariiLaSchimb", e.target.value)} /></Field>
              <Field label="Zile chirie Audatex"><input type="number" min={0} className="in" value={form.zileChirieAudatex} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} /></Field>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> Poze dosar</div>
            {!isNew && (
              <label className={`flex items-center justify-center gap-1.5 border border-dashed rounded-md py-2 text-[12px] mb-2 cursor-pointer ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[#F5F2EA]"} border-[#C7C0B0] text-[#6B6558]`}>
                {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Adaugă poze (poți selecta mai multe)</>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files)} />
              </label>
            )}
            {isNew && <div className="text-[11px] text-[#8A8375] mb-2">Salvează dosarul întâi, apoi poți adăuga poze.</div>}
            {form.poze.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {form.poze.map((p) => (
                  <div key={p.id} className="relative group">
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt={p.nume} className="w-full aspect-square object-cover rounded border border-[#DAD4C6]" />
                    </a>
                    <button onClick={() => removePoza(p)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><LinkIcon size={12} /> Documente (PV, deviz, factură, accept plată)</div>
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex gap-2 flex-wrap">
                <input className="in flex-1 min-w-[200px]" placeholder="Denumire (opțional, ex: Deviz reparație)" value={docName} onChange={(e) => setDocName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDoc()} />
                <input className="in flex-1 min-w-[200px]" placeholder="Link fișier (Drive, OneDrive etc.)" value={docLink} onChange={(e) => setDocLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDoc()} />
                <button onClick={addDoc} className="px-2.5 rounded bg-[#3B5166] text-white hover:bg-[#2C3E4C]"><Plus size={16} /></button>
              </div>
              {!isNew && (
                <label className={`flex items-center justify-center gap-1.5 border border-dashed rounded-md py-2 text-[12px] cursor-pointer ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[#F5F2EA]"} border-[#C7C0B0] text-[#6B6558]`}>
                  {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Se încarcă documente...</> : <><Upload size={13} /> Adaugă documente (poți selecta mai multe)</>}
                  <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
                </label>
              )}
              {isNew && <div className="text-[11px] text-[#8A8375]">Salvează dosarul întâi, apoi poți adăuga documente sau linkuri.</div>}
            </div>
            <div className="space-y-1">
              {form.documente.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded px-2.5 py-1.5 text-[12.5px]">
                  <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] underline truncate flex-1">{d.nume}</a>
                  <button onClick={() => removeDoc(d.id)} className="text-[#B23A2E] hover:opacity-70 ml-2"><Trash2 size={14} /></button>
                </div>
              ))}
              {form.documente.length === 0 && <div className="text-[12px] text-[#8A8375]">Niciun document adăugat.</div>}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><MessageSquare size={12} /> Istoric note</div>
            <div className="flex gap-2 mb-2">
              <input className="in flex-1" placeholder="Adaugă o notă..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
              <button onClick={addNote} className="px-2.5 rounded bg-[#3B5166] text-white hover:bg-[#2C3E4C]"><Plus size={16} /></button>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
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
        </fieldset>
        {!isNew && (
          <div className="px-4 pb-3 shrink-0">
            <details className="border border-[#DAD4C6] rounded-md bg-white">
              <summary className="px-3 py-2 text-[11.5px] font-bold text-[#6B6558] cursor-pointer flex items-center gap-1.5 select-none">
                <History size={12} /> Istoric modificări {loadingIstoric ? "" : `(${istoric.length})`}
              </summary>
              <div className="px-3 pb-2 max-h-40 overflow-y-auto space-y-1.5 border-t border-[#EFEAE1] pt-2">
                {loadingIstoric ? (
                  <div className="text-[11.5px] text-[#8A8375] flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Se încarcă...</div>
                ) : istoric.length === 0 ? (
                  <div className="text-[11.5px] text-[#8A8375]">Fără modificări înregistrate.</div>
                ) : istoric.map((h) => (
                  <div key={h.id} className="text-[11.5px]">
                    <div className="text-[10px] text-[#8A8375] font-mono">{new Date(h.created_at).toLocaleString("ro-RO")} · {h.user_email || "necunoscut"}</div>
                    {Object.entries(h.modificari || {}).map(([camp, diff]) => (
                      <div key={camp} className="text-[#23282E]">
                        <span className="font-semibold">{CAMP_LABELS[camp] || camp}</span>
                        {camp !== "_creat" && (
                          <>: {formatIstoricValoare(camp, diff.old)} → {formatIstoricValoare(camp, diff.new)}</>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#DAD4C6] shrink-0">
          {readOnly ? <span /> : (
            <button onClick={() => { if (confirm("Ștergi definitiv acest dosar?")) onDelete(claim.id); }} className="flex items-center gap-1 text-[#B23A2E] text-[13px] font-medium hover:opacity-70"><Trash2 size={14} /> Șterge dosar</button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-[#C7C0B0] text-[13px] text-[#4A443A] hover:bg-[#EFEAE1]">{readOnly ? "Închide" : "Anulează"}</button>
            {!readOnly && (
              <button onClick={handleSave} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#C98A2B] text-white text-[13px] font-semibold hover:bg-[#B37A22]"><Save size={14} /> Salvează</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programator: agendă de programări în service, pornind din „Piese sosite"
// ---------------------------------------------------------------------------
function CalendarLunar({ claims, capacitate, selectedDay, onSelectDay, monthOffset, setMonthOffset }) {
  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // luni = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const todayStr = todayISO();

  const countByDay = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      if (!c.dataProgramare) return;
      const d = c.dataProgramare.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [claims]);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg border border-[#DAD4C6] p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonthOffset((m) => m - 1)} className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]"><ChevronLeft size={16} /></button>
        <span className="text-[13px] font-bold text-[#23282E] capitalize">{monthLabel}</span>
        <button onClick={() => setMonthOffset((m) => m + 1)} className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#8A8375] mb-1">
        {["L", "Ma", "Mi", "J", "V", "S", "D"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const count = countByDay[dateStr] || 0;
          const pct = capacitate > 0 ? count / capacitate : 0;
          const bg = count === 0 ? "bg-[#F5F2EA]" : pct < 1 ? "bg-[#E8F3E9]" : pct === 1 ? "bg-[#FBF3E6]" : "bg-[#F9E3E1]";
          const isSelected = selectedDay === dateStr;
          const isToday = dateStr === todayStr;
          return (
            <button key={i} onClick={() => onSelectDay(isSelected ? null : dateStr)}
              className={`aspect-square rounded flex flex-col items-center justify-center text-[11px] border transition-colors ${isSelected ? "border-[#23282E] border-2" : isToday ? "border-[#C98A2B]" : "border-transparent"} ${bg} hover:brightness-95`}>
              <span className="font-semibold text-[#23282E]">{d}</span>
              {count > 0 && <span className={`text-[9.5px] font-bold ${pct > 1 ? "text-[#B23A2E]" : "text-[#6B6558]"}`}>{count}/{capacitate}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8A8375]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#E8F3E9] inline-block" /> sub capacitate</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FBF3E6] inline-block" /> la capacitate</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#F9E3E1] inline-block" /> suprarezervat</span>
      </div>
    </div>
  );
}

function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [capInput, setCapInput] = useState(capacitate);
  useEffect(() => setCapInput(capacitate), [capacitate]);

  const countForDate = (dateStr) => claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dateStr).length;

  const eligibile = useMemo(() => {
    let list = claims.filter((c) => STADII_PROGRAMABILE.includes(c.status));
    if (selectedDay) list = list.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === selectedDay);
    return list.sort((a, b) => {
      if (!a.dataProgramare && !b.dataProgramare) return 0;
      if (!a.dataProgramare) return 1;
      if (!b.dataProgramare) return -1;
      return new Date(a.dataProgramare) - new Date(b.dataProgramare);
    });
  }, [claims, selectedDay]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-[#DAD4C6] p-2.5">
        <span className="text-[12px] text-[#6B6558]">Capacitate zilnică (mașini programate/zi):</span>
        <input type="number" min={1} className="w-16 border border-[#DAD4C6] rounded px-2 py-1 text-[12.5px]" value={capInput} onChange={(e) => setCapInput(Number(e.target.value) || 1)} />
        <button onClick={() => onSetCapacitate(capInput)} className="px-2.5 py-1 rounded bg-[#3B5166] text-white text-[11.5px] font-semibold hover:bg-[#2C3E4C]">Salvează</button>
        <span className="text-[10.5px] text-[#8A8375]">valabilă pentru toată echipa</span>
      </div>

      <CalendarLunar claims={claims} capacitate={capacitate} selectedDay={selectedDay} onSelectDay={setSelectedDay} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />

      <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden">
        <div className="px-3 py-2.5 bg-[#23282E] text-white text-[12.5px] font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CalendarClock size={14} /> {selectedDay ? `Programări din ${fmtDate(selectedDay)}` : "Toate programările"} ({eligibile.length})</span>
          {selectedDay && <button onClick={() => setSelectedDay(null)} className="text-white/70 hover:text-white text-[11px] underline">arată tot</button>}
        </div>
        {eligibile.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[#8A8375]">Niciun dosar în stadiul „Piese sosite" sau ulterior încă pentru această selecție.</div>
        ) : (
          <div className="divide-y divide-[#EFEAE1]">
            {eligibile.map((c) => {
              const s = STATUSES.find((x) => x.key === c.status);
              const editable = canEditFn(c);
              const dayCount = c.dataProgramare ? countForDate(c.dataProgramare.slice(0, 10)) : 0;
              const overbooked = c.dataProgramare && dayCount > capacitate;
              return (
                <div key={c.id} className="p-3 flex flex-wrap items-center gap-2.5">
                  <div className="min-w-[140px] flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[12.5px] cursor-pointer hover:underline" onClick={() => onOpen(c)}>{c.numarDosar || "—"}</span>
                      <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill>
                      {!editable && <Pill tone="ghost">doar vizualizare</Pill>}
                    </div>
                    <div className="text-[12.5px] text-[#23282E]">{c.client || "—"} <span className="text-[#8A8375] font-mono">{c.numarInmatriculare}</span></div>
                    {c.telefonClient && <div className="text-[11px] text-[#6B6558] flex items-center gap-1"><Phone size={10} />{c.telefonClient}</div>}
                  </div>
                  <span className="text-[10.5px] font-semibold px-2 py-1 rounded" style={{ background: PHASE_COLORS[s.phase].tint, color: "#4A443A" }}>
                    {String(s.num).padStart(2, "0")}. {s.label}
                  </span>
                  <div>
                    <input type="datetime-local" disabled={!editable} className="border border-[#DAD4C6] rounded px-2 py-1.5 text-[12.5px] disabled:opacity-50 disabled:bg-[#EFEAE1]" value={c.dataProgramare || ""} onChange={(e) => onPatch(c.id, { dataProgramare: e.target.value })} />
                    {c.dataProgramare && (
                      <div className={`text-[10px] mt-0.5 ${overbooked ? "text-[#B23A2E] font-bold" : "text-[#8A8375]"}`}>{dayCount}/{capacitate} în acea zi{overbooked ? " — suprarezervat" : ""}</div>
                    )}
                  </div>
                  {c.status === "piese_sosite" && (
                    <button disabled={!editable} onClick={() => onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })} className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#3B5166] text-white text-[11.5px] font-semibold hover:bg-[#2C3E4C] disabled:opacity-40">
                      Programat <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rapoarte financiare: marjă piese + manoperă, pe lună și pe asigurător
// ---------------------------------------------------------------------------
function Rapoarte({ claims }) {
  const facturate = claims.filter((c) => c.status === "facturat");
  const withMargin = useMemo(() => facturate.map((c) => {
    const venitPiese = (c.valoarePieseAudatex || 0) - (c.valoareAchizitiePiese || 0);
    const venitManopera = (c.manopera.tinichigerie.facturat || 0) + (c.manopera.vopsitorie.facturat || 0);
    return { ...c, venitPiese, venitManopera, venitTotal: venitPiese + venitManopera };
  }), [facturate]);

  const totalPiese = withMargin.reduce((a, c) => a + c.venitPiese, 0);
  const totalManopera = withMargin.reduce((a, c) => a + c.venitManopera, 0);
  const totalGeneral = totalPiese + totalManopera;
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

  const sorted = [...withMargin].sort((a, b) => b.venitTotal - a.venitTotal);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Venit piese (marjă)" value={leiFmt(totalPiese)} tone="amber" />
        <StatCard label="Venit manoperă" value={leiFmt(totalManopera)} tone="steel" />
        <StatCard label="Total (dosare facturate)" value={leiFmt(totalGeneral)} tone="green" />
        <StatCard label="Nr. dosare facturate" value={facturate.length} tone="steel" />
      </div>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
      <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden">
        <div className="px-3 py-2.5 bg-[#23282E] text-white text-[12.5px] font-bold">Detaliu dosare facturate</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F5F2EA] text-[#6B6558]">
                <th className="text-left px-3 py-1.5">Nr. dosar</th><th className="text-left px-3 py-1.5">Client</th>
                <th className="text-right px-3 py-1.5">Venit piese</th><th className="text-right px-3 py-1.5">Venit manoperă</th><th className="text-right px-3 py-1.5">Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-t border-[#EFEAE1]">
                  <td className="px-3 py-1.5 font-mono">{c.numarDosar || "—"}</td>
                  <td className="px-3 py-1.5">{c.client || "—"}</td>
                  <td className="px-3 py-1.5 text-right">{leiFmt(c.venitPiese)}</td>
                  <td className="px-3 py-1.5 text-right">{leiFmt(c.venitManopera)}</td>
                  <td className="px-3 py-1.5 text-right font-bold">{leiFmt(c.venitTotal)}</td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#8A8375]">Niciun dosar facturat încă.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login — conturi individuale pentru colegi (Supabase Auth)
// ---------------------------------------------------------------------------
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Email sau parolă greșite." : error.message);
  };

  return (
    <div className="min-h-screen bg-[#EFEAE1] flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-lg border border-[#DAD4C6] shadow-xl p-6 w-full max-w-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded bg-[#C98A2B] flex items-center justify-center"><ShieldCheck size={18} className="text-white" /></div>
          <div className="font-bold text-[15px] text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dosare Daună</div>
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Email</label>
          <input type="email" required className="in" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Parolă</label>
          <input type="password" required className="in" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="text-[12px] text-[#B23A2E]">{error}</div>}
        <button type="submit" disabled={loading} className="w-full py-2 rounded-md bg-[#C98A2B] text-white text-[13px] font-semibold hover:bg-[#B37A22] disabled:opacity-60">
          {loading ? "Se conectează..." : "Conectare"}
        </button>
        <div className="text-[11px] text-[#8A8375] text-center">Cont nou? Cere administratorului să-ți creeze unul din Supabase.</div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [modalClaim, setModalClaim] = useState(null);
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;
  const canEdit = (c) => !c.createdBy || c.createdBy === myId;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) setErrorMsg(error.message);
    else setClaims((data || []).map(fromDb));
    setLoading(false);
  }, []);

  useEffect(() => { if (session) loadAll(); }, [loadAll, session]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("setari").select("capacitate_zilnica").eq("id", 1).maybeSingle();
      if (data?.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
    })();
  }, [session]);

  const saveCapacitate = async (n) => {
    setCapacitateZilnica(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, capacitate_zilnica: n });
    if (error) setErrorMsg(error.message);
  };

  const handleSave = async (claim) => {
    setSaving(true);
    const isNewClaim = !claims.some((c) => c.id === claim.id);
    const payload = toDb({
      ...claim,
      createdByEmail: isNewClaim ? myEmail : (claim.createdByEmail || myEmail),
      updatedByEmail: myEmail,
    });
    const { error } = await supabase.from("dosare").upsert(payload);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    setModalClaim(null);
    loadAll();
  };

  const handleDelete = async (id) => {
    const target = claims.find((c) => c.id === id);
    if (target && !canEdit(target)) { setErrorMsg("Poți șterge doar dosarele create de tine."); return; }
    setSaving(true);
    const { error } = await supabase.from("dosare").delete().eq("id", id);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    setModalClaim(null);
    loadAll();
  };

  const handleMove = async (claim, dir) => {
    if (!canEdit(claim)) { setErrorMsg("Poți muta doar dosarele create de tine."); return; }
    const idx = STATUSES.findIndex((s) => s.key === claim.status);
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    const updated = { ...claim, status: STATUSES[nextIdx].key, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { setErrorMsg(error.message); loadAll(); }
  };

  const openNew = (status = "primit") => setModalClaim(emptyClaim(status));
  const openExisting = (claim) => setModalClaim(claim);

  const patchClaim = async (id, patch) => {
    const current = claims.find((c) => c.id === id);
    if (!current) return;
    if (!canEdit(current)) { setErrorMsg("Poți edita programarea doar la dosarele create de tine."); return; }
    const updated = { ...current, ...patch, dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { setErrorMsg(error.message); loadAll(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (onlyAlerts && daysBetween(c.dataSchimbareStatus) < (c.termenAlertaZile || 3)) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });
  }, [claims, search, filterTip, filterStatus, onlyAlerts, onlyBlocked]);

  const alertCount = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)).length, [claims]);
  const blockedCount = useMemo(() => claims.filter((c) => c.blocat).length, [claims]);

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

  if (authLoading) {
    return <div className="min-h-screen bg-[#EFEAE1] flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...</div>;
  }
  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#EFEAE1]">
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
            <span className="hidden sm:inline text-[11px] text-white/50">{myEmail}</span>
            <button onClick={() => supabase.auth.signOut()} className="px-2.5 py-1.5 rounded border border-white/20 text-white/70 text-[11.5px] font-semibold hover:bg-white/10 hover:text-white">
              Delogare
            </button>
            {alertCount > 0 && (
              <button onClick={() => setOnlyAlerts((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyAlerts ? "bg-[#B23A2E] text-white" : "bg-[#B23A2E]/20 text-[#F3C0BA]"}`}>
                <AlertTriangle size={13} /> {alertCount} depășite
              </button>
            )}
            {blockedCount > 0 && (
              <button onClick={() => setOnlyBlocked((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyBlocked ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {blockedCount} blocate
              </button>
            )}
            <div className="flex rounded overflow-hidden border border-white/20">
              <button onClick={() => setView("kanban")} className={`p-1.5 ${view === "kanban" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`} title="Kanban"><LayoutGrid size={15} /></button>
              <button onClick={() => setView("list")} className={`p-1.5 ${view === "list" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`} title="Listă"><List size={15} /></button>
              <button onClick={() => setView("dashboard")} className={`p-1.5 ${view === "dashboard" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`} title="Dashboard"><BarChart3 size={15} /></button>
              <button onClick={() => setView("programator")} className={`p-1.5 ${view === "programator" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`} title="Programator"><CalendarClock size={15} /></button>
              <button onClick={() => setView("rapoarte")} className={`p-1.5 ${view === "rapoarte" ? "bg-[#C98A2B] text-white" : "text-white/60 hover:text-white"}`} title="Rapoarte"><Wallet size={15} /></button>
            </div>
            <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 rounded border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/10"><Download size={14} /> Excel</button>
            <button onClick={() => openNew()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#C98A2B] text-white text-[12.5px] font-semibold hover:bg-[#B37A22]"><Plus size={14} /> Dosar nou</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-white border-b border-[#DAD4C6] flex flex-wrap items-center gap-2 sticky top-[57px] z-20">
        <div className="relative w-full sm:w-[210px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8A8375]" />
          <input className="w-full pl-7 pr-2 py-1.5 rounded border border-[#DAD4C6] text-[13px]" placeholder="Caută dosar..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <KanbanBoard claims={filtered} onOpen={openExisting} onMove={handleMove} onAddInStatus={openNew} canEditFn={canEdit} />
        ) : view === "list" ? (
          <ClaimTable claims={filtered} onOpen={openExisting} canEditFn={canEdit} />
        ) : view === "dashboard" ? (
          <Dashboard claims={filtered} onOpen={openExisting} />
        ) : view === "programator" ? (
          <Programator claims={filtered} onOpen={openExisting} onPatch={patchClaim} canEditFn={canEdit} capacitate={capacitateZilnica} onSetCapacitate={saveCapacitate} />
        ) : (
          <Rapoarte claims={filtered} />
        )}
      </div>

      {modalClaim && <ClaimModal claim={modalClaim} onClose={() => setModalClaim(null)} onSave={handleSave} onDelete={handleDelete} readOnly={!canEdit(modalClaim)} allClaims={claims} onJumpTo={(c) => setModalClaim(c)} />}
    </div>
  );
}
