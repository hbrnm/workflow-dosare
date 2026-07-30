import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus, Search, LayoutGrid, List, AlertTriangle, X, Trash2,
  FileText, Link as LinkIcon, ChevronRight, ChevronLeft, Clock, Calendar,
  Car, ShieldCheck, MessageSquare, Save, Loader2,
  BarChart3, Download, TrendingUp, Boxes, Wrench, Paintbrush, Play,
  Phone, CalendarClock, ArrowRight, Wallet, Image as ImageIcon, Upload,
  FileDown, History, AlertOctagon, Sunrise, PackageCheck, Copy, MessageCircle, ChevronDown, Check, Layers
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

const FALLBACK_STATUS = STATUSES[0];

function getStatusDefinition(statusKey) {
  return STATUSES.find((status) => status.key === statusKey) || FALLBACK_STATUS;
}

function getPhaseColors(statusKey) {
  return PHASE_COLORS[getStatusDefinition(statusKey).phase] || PHASE_COLORS.start;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

function normalizedText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function storagePath(claimId, file, directory = "") {
  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex > -1 ? file.name.slice(dotIndex) : "";
  const prefix = directory ? `${claimId}/${directory}` : claimId;
  return `${prefix}/${uid()}${extension}`;
}

async function refreshStorageUrls(items, bucket) {
  return Promise.all((items || []).map(async (item) => {
    if (!item?.path) return item;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(item.path, 60 * 60);

    if (error) {
      console.error(`Nu s-a putut genera URL-ul temporar pentru ${item.path}:`, error);
      return { ...item, url: "" };
    }

    return { ...item, url: data?.signedUrl || "" };
  }));
}

function daysBetween(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}
function fmtDate(iso) {
  if (!iso) return "—";
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

// Format dată programare: zi/luna/an, ore simple 24h (ex: 30/07/2026, 14:30)
function fmtProgramare(iso) {
  if (!iso) return "—";
  return fmtDateTime(iso);
}

// Linkuri rapide de contact — tel: pentru apel, wa.me pentru WhatsApp
// (normalizează un nr. RO gen "07xx xxx xxx" la formatul internațional 40...)
function telLink(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}
function waLink(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `4${digits}`;
  else if (!digits.startsWith("40")) digits = `40${digits}`;
  return `https://wa.me/${digits}`;
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
    createdBy: null, createdByEmail: "", updatedByEmail: "",
    poze: [],
    gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null,
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
    documente: (c.documente || []).map(({ url, ...document }) => document),
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
    created_by: c.createdBy || null,
    created_by_email: c.createdByEmail || null,
    updated_by_email: c.updatedByEmail || null,
    poze: (c.poze || []).map(({ url, ...photo }) => photo),
    gata_de_ridicare: c.gataDeRidicare,
    data_gata_ridicare: c.dataGataRidicare || null,
    ridicata: c.ridicata,
    data_ridicare: c.dataRidicare || null,
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
    gataDeRidicare: !!r.gata_de_ridicare,
    dataGataRidicare: r.data_gata_ridicare || null,
    ridicata: !!r.ridicata,
    dataRidicare: r.data_ridicare || null,
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
  if (camp === "data_programare" || camp === "data_darii_la_schimb" || camp === "data_schimbare_status" || camp === "data_ultimei_actualizari") return fmtDateTime(val);
  if (camp === "data_deschiderii" || camp === "data_ridicare" || camp === "data_gata_ridicare") return fmtDate(val);
  if (typeof val === "boolean") return val ? "da" : "nu";
  if (COMPLEX_FIELDS.has(camp)) return "actualizat(ă)";
  return String(val);
}


function generateazaPDF(claim, istoric = []) {
  const doc = new jsPDF();
  const s = getStatusDefinition(claim.status);
  let y = 20;

  function stripDiacritics(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/[ăâî]/g, (c) => ({'ă':'a','â':'a','î':'i'}[c] || c))
      .replace(/[ĂÂÎ]/g, (c) => ({'Ă':'A','Â':'A','Î':'I'}[c] || c))
      .replace(/[șş]/g, 's').replace(/[ȘŞ]/g, 'S')
      .replace(/[țţ]/g, 't').replace(/[ȚŢ]/g, 'T');
  }

  const sd = (t) => stripDiacritics(t || "—");

  doc.setFontSize(16);
  doc.text(sd("Proces verbal / Fișă dosar"), 14, y); y += 10;
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Generat la ${fmtDateTime(new Date())}`, 14, y); y += 10;
  doc.setTextColor(0); doc.setFontSize(11);

  const linie = (label, val) => { doc.setFont(undefined, "bold"); doc.text(`${sd(label)}:`, 14, y); doc.setFont(undefined, "normal"); doc.text(sd(val), 70, y); y += 7; };

  linie("Nr. dosar", claim.numarDosar);
  linie("Tip asigurare", claim.tipAsigurare);
  linie("Asigurător", claim.asigurator);
  linie("Status", `${s.num}. ${sd(s.label)}`);
  y += 3;
  linie("Client", claim.client);
  linie("Telefon", claim.telefonClient);
  linie("Nr. înmatriculare", claim.numarInmatriculare);
  linie("VIN", claim.vin);
  linie("Marcă/Model", claim.marcaModel);
  y += 3;
  doc.setFont(undefined, "bold"); doc.text(sd("Ce este de reparat:"), 14, y); y += 6;
  doc.setFont(undefined, "normal");
  const descText = sd(claim.ceEsteDeReparat || "—");
  const desc = doc.splitTextToSize(descText, 180);
  doc.text(desc, 14, y); y += desc.length * 6 + 4;
  linie("Masină la schimb", claim.masinaSchimb);
  linie("Zile chirie Audatex", claim.zileChirieAudatex);
  y += 3;
  linie("Valoare piese Audatex", `${claim.valoarePieseAudatex || 0} lei`);
  linie("Valoare achiziție piese", `${claim.valoareAchizitiePiese || 0} lei`);
  linie("Manoperă tinichigerie", `${(claim.manopera && claim.manopera.tinichigerie && claim.manopera.tinichigerie.facturat) || 0} lei`);
  linie("Manoperă vopsitorie", `${(claim.manopera && claim.manopera.vopsitorie && claim.manopera.vopsitorie.facturat) || 0} lei`);
  y += 6;
  doc.setDrawColor(180); doc.line(14, y, 90, y + 25); doc.line(120, y, 196, y + 25);
  doc.setFontSize(9); doc.text(sd("Semnătură client"), 14, y + 30); doc.text(sd("Semnătură service"), 120, y + 30);

  // Istoric modificari (daca exista)
  y += 44;
  if ((istoric || []).length > 0) {
    const ensureSpace = (needed = 20) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    ensureSpace(12);
    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.text(sd("Istoric modificări"), 14, y); y += 8;
    doc.setFont(undefined, "normal"); doc.setFontSize(10);
    for (const h of istoric) {
      ensureSpace(18);
      const when = fmtDateTime(h.created_at);
      doc.setFontSize(9); doc.setTextColor(110);
      doc.text(`${when} · ${sd(h.user_email || "necunoscut")}`, 14, y); y += 6;
      doc.setTextColor(0); doc.setFontSize(10);
      const mods = h.modificari || {};
      for (const [camp, diff] of Object.entries(mods)) {
        ensureSpace(10);
        const label = sd(CAMP_LABELS[camp] || camp);
        let oldVal = camp === "data_schimbare_status" ? fmtDateTime(diff.old) : formatIstoricValoare(camp, diff.old);
        let newVal = camp === "data_schimbare_status" ? fmtDateTime(diff.new) : formatIstoricValoare(camp, diff.new);
        const line = `${label}: ${sd(String(oldVal))} → ${sd(String(newVal))}`;
        const parts = doc.splitTextToSize(line, 180);
        doc.text(parts, 14, y);
        y += parts.length * 6;
      }
      y += 4;
    }
    doc.setTextColor(0);
  }

  doc.save(`dosar-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

// ---------------------------------------------------------------------------
// Atomi UI
// ---------------------------------------------------------------------------
function DatePickerInput({
  value,
  onChange,
  withTime = false,
  placeholder,
  className = "in",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const parseVal = (valStr) => {
    if (!valStr) return { dateStr: "", timeStr: "08:00" };
    if (valStr.includes("T")) {
      const [d, t] = valStr.split("T");
      return { dateStr: d, timeStr: t ? t.slice(0, 5) : "08:00" };
    }
    return { dateStr: valStr, timeStr: "08:00" };
  };

  const parsed = parseVal(value);
  const selectedDate = parsed.dateStr;
  const selectedTime = parsed.timeStr;

  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const validInitialDate = isNaN(initialDateObj.getTime()) ? new Date() : initialDateObj;

  const [viewYear, setViewYear] = useState(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitialDate.getMonth());

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (value && !open) {
      const { dateStr } = parseVal(value);
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  }, [value, open]);

  const handleSelectDay = (year, month, day) => {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const newDateStr = `${yStr}-${mStr}-${dStr}`;

    if (withTime) {
      const timeToUse = selectedTime || "08:00";
      onChange(`${newDateStr}T${timeToUse}`);
    } else {
      onChange(newDateStr);
      setOpen(false);
    }
  };

  const handleSelectTime = (newTime) => {
    const dateToUse = selectedDate || todayISO();
    onChange(`${dateToUse}T${newTime}`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = todayISO();
    if (withTime) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      onChange(`${today}T${hh}:${mm}`);
    } else {
      onChange(today);
    }
    setOpen(false);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: viewMonth - 1,
        year: viewMonth === 0 ? viewYear - 1 : viewYear,
        currentMonth: false,
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        currentMonth: true,
      });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        currentMonth: false,
      });
    }
    return days;
  }, [viewYear, viewMonth]);

  const monthNames = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
  ];

  const formattedDisplay = withTime ? fmtDateTime(value) : fmtDate(value);
  const defaultPlaceholder = placeholder || (withTime ? "zi/luna/an, ore" : "zi/luna/an");

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        className={`${className} flex items-center justify-between cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
        }`}
      >
        <span className={`truncate ${value ? "text-[#23282E] font-medium" : "text-[#8A8375]"}`}>
          {value ? formattedDisplay : defaultPlaceholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && (
            <X
              size={13}
              className="text-[#8A8375] hover:text-[#B23A2E] cursor-pointer"
              onClick={handleClear}
            />
          )}
          <Calendar size={14} className="text-[#6B6558]" />
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#DAD4C6] shadow-2xl rounded-lg p-3 w-[290px] text-[#23282E] text-[12px]">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#EFEAE1]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-[#EFEAE1] text-[#6B6558]"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-[13px]">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-[#EFEAE1] text-[#6B6558]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center font-semibold text-[#8A8375] text-[10.5px] mb-1">
            <span>Lu</span><span>Ma</span><span>Mi</span><span>Jo</span><span>Vi</span><span>Sâ</span><span>Du</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item, idx) => {
              const itemY = item.year;
              const itemM = (item.month + 12) % 12;
              const itemDateStr = `${itemY}-${String(itemM + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
              const isSelected = selectedDate === itemDateStr;
              const isToday = itemDateStr === todayISO();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  className={`h-7 w-7 rounded-md flex items-center justify-center text-[11.5px] font-medium transition-colors mx-auto ${
                    isSelected
                      ? "bg-[#3B5166] text-white font-bold"
                      : isToday
                      ? "border border-[#C98A2B] text-[#C98A2B] font-bold"
                      : item.currentMonth
                      ? "hover:bg-[#EFEAE1] text-[#23282E]"
                      : "text-[#C2BCB0] hover:bg-[#F5F2EA]"
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 pt-2.5 border-t border-[#EFEAE1]">
              <div className="text-[11px] font-bold text-[#6B6558] mb-1.5 flex items-center gap-1">
                <Clock size={12} /> Ora (HH:mm)
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <select
                  className="border border-[#DAD4C6] rounded px-1.5 py-1 text-[11.5px] bg-[#FAF8F5] focus:bg-white font-mono flex-1"
                  value={selectedTime.split(":")[0] || "08"}
                  onChange={(e) => {
                    const mins = selectedTime.split(":")[1] || "00";
                    handleSelectTime(`${e.target.value}:${mins}`);
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const hh = String(h).padStart(2, "0");
                    return <option key={hh} value={hh}>{hh}:00h</option>;
                  })}
                </select>
                <span className="font-bold text-[#8A8375]">:</span>
                <select
                  className="border border-[#DAD4C6] rounded px-1.5 py-1 text-[11.5px] bg-[#FAF8F5] focus:bg-white font-mono flex-1"
                  value={selectedTime.split(":")[1] || "00"}
                  onChange={(e) => {
                    const hrs = selectedTime.split(":")[0] || "08";
                    handleSelectTime(`${hrs}:${e.target.value}`);
                  }}
                >
                  {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((mm) => (
                    <option key={mm} value={mm}>{mm} min</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1">
                {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTime(t)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      selectedTime === t
                        ? "bg-[#3B5166] text-white border-[#3B5166]"
                        : "bg-[#F5F2EA] text-[#3B5166] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-[#EFEAE1] flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-[#B23A2E] hover:underline font-semibold"
            >
              Șterge
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] text-[#3B5166] hover:underline font-semibold"
              >
                {withTime ? "Acum" : "Azi"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160]"
              >
                Gata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
function ClaimCard({ claim, onOpen, onMove, onDuplicate, canEdit, pragRidicare, compact = false }) {
  const idx = STATUSES.findIndex((s) => s.key === claim.status);
  const hasKnownStatus = idx >= 0;
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const phase = getStatusDefinition(claim.status).phase;
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);

  if (compact) {
    return (
      <div
        onClick={() => onOpen(claim)}
        draggable={canEdit}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", claim.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group relative bg-white rounded-md border cursor-pointer transition-all duration-150 hover:shadow-md ${
          claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
        }`}
        style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase]?.bar || "#DAD4C6" }}
      >
        <div className="p-2 space-y-1">
          {/* Row 1: Nr. dosar + Tip + Alert badge */}
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11.5px] font-bold text-[#23282E] truncate">
              {claim.numarDosar || "(fără nr.)"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
              <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
            </div>
          </div>

          {/* Row 2: Client & Nr inmatriculare */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="font-semibold text-[#23282E] truncate" title={claim.client}>
              {claim.client || "Client neintrodus"}
            </span>
            <span className="font-mono text-[10.5px] text-[#6B6558] shrink-0">
              {claim.numarInmatriculare || "—"}
            </span>
          </div>

          {/* Row 3: Badges & status info (only if present) */}
          {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
            <div className="flex items-center gap-1 flex-wrap text-[10px]">
              {claim.blocat && <Pill tone="danger">blocat</Pill>}
              {claim.masinaSchimb && (
                <span className="px-1 py-0.2 rounded bg-[#FBF3E6] text-[#7A5316] font-bold text-[9.5px]">
                  🚗 {claim.masinaSchimb}
                </span>
              )}
              {claim.gataDeRidicare && !claim.ridicata && (
                <span className={`px-1 py-0.2 rounded font-bold text-[9.5px] ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                  gata ({zileNeridicata}z)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Compact Footer Bar */}
        <div
          className="flex items-center justify-between border-t border-[#EFEAE1] px-1.5 py-0.5 bg-[#FCFAF5]/80 text-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5">
            <button
              disabled={!canEdit || !hasKnownStatus || idx === 0}
              onClick={() => onMove(claim, -1)}
              className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
              title="Mută înapoi"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => onDuplicate(claim)}
              title="Duplică dosarul"
              className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166]"
            >
              <Copy size={11} />
            </button>
          </div>
          <span className="text-[#8A8375] font-mono text-[9.5px]">
            {days}z
          </span>
          <button
            disabled={!canEdit || !hasKnownStatus || idx === STATUSES.length - 1}
            onClick={() => onMove(claim, 1)}
            className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
            title="Mută înainte"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(claim)}
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group relative bg-white rounded-lg border cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase]?.bar || "#DAD4C6" }}
    >
      <div className="p-3.5 pb-3">
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-mono text-[12.5px] font-bold text-[#23282E] truncate">
            {claim.numarDosar || "(fără nr.)"}
          </span>
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
        </div>
        <div className="mt-2 text-[13.5px] font-medium text-[#23282E] truncate">
          {claim.client || "Client neintrodus"}
        </div>
        {claim.telefonClient && (
          <div className="flex items-center justify-between gap-1 mt-1 text-[11.5px] text-[#6B6558]">
            <span className="flex items-center gap-1"><Phone size={11} />{claim.telefonClient}</span>
            <span className="flex items-center gap-1">
              <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
                <Phone size={12} />
              </a>
              <a href={waLink(claim.telefonClient)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3E6B45]">
                <MessageCircle size={12} />
              </a>
            </span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#6B6558]">
          <Car size={12} />
          <span className="font-mono">{claim.numarInmatriculare || "—"}</span>
          <span className="truncate">{claim.marcaModel}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <span className="text-[11px] text-[#8A8375] truncate">{claim.asigurator || "asigurător —"}</span>
          <div className="flex items-center gap-1 shrink-0">
            {!canEdit && <Pill tone="ghost">doar vizualizare</Pill>}
            {claim.blocat && (
              <Pill tone="danger">
                <AlertTriangle size={10} />
                blocat
              </Pill>
            )}
            <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
          </div>
        </div>
        {claim.gataDeRidicare && !claim.ridicata && (
          <div className="mt-2.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
              <PackageCheck size={11} /> gata, neridicată de {zileNeridicata}z
            </span>
          </div>
        )}
        {(claim.adusaFizic ||
          claim.manopera?.tinichigerie?.dataIntrareEtapa ||
          claim.manopera?.vopsitorie?.dataIntrareEtapa) && (
          <div className="mt-2.5 flex items-center gap-1 flex-wrap">
            {claim.adusaFizic && (
              <Pill tone="ghost">
                <Car size={10} />
                adusă fizic
              </Pill>
            )}
            {claim.manopera?.tinichigerie?.dataIntrareEtapa &&
              !claim.manopera?.vopsitorie?.dataIntrareEtapa && (
                <Pill tone="ghost">
                  <Wrench size={10} />
                  tinichigerie
                </Pill>
              )}
            {claim.manopera?.vopsitorie?.dataIntrareEtapa && (
              <Pill tone="ghost">
                <Paintbrush size={10} />
                vopsitorie
              </Pill>
            )}
          </div>
        )}
      </div>
      <div
        className="flex items-center justify-between border-t border-[#EFEAE1] px-2.5 py-2 bg-[#FCFAF5]/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <button
            disabled={!canEdit || !hasKnownStatus || idx === 0}
            onClick={() => onMove(claim, -1)}
            className="p-1.5 rounded-md hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onDuplicate(claim)}
            title="Duplică dosarul"
            className="p-1.5 rounded-md hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166] transition-colors"
          >
            <Copy size={13} />
          </button>
        </div>
        <span className="text-[10.5px] text-[#8A8375] flex items-center gap-1">
          <Clock size={11} />
          {days}z în etapă
        </span>
        <button
          disabled={!canEdit || !hasKnownStatus || idx === STATUSES.length - 1}
          onClick={() => onMove(claim, 1)}
          className="p-1.5 rounded-md hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166] transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Tablou Pe Faze (Cel Mai Eficient Sistem de Vizualizare Dosare)
// ---------------------------------------------------------------------------
const PIPELINE_PHASES = [
  {
    key: "start",
    label: "1. Deschidere & Intrare",
    description: "Preluare dosar și cerere intrare reparație",
    barColor: "#3B5166",
    bgColor: "#EEF1F3",
    statuses: ["primit", "cerere_reparatie"]
  },
  {
    key: "eval",
    label: "2. Evaluare & Aprobare",
    description: "Reconstatare și obținere accept de plată",
    barColor: "#4A6FA5",
    bgColor: "#ECF1F7",
    statuses: ["reconstatare", "accept_plata"]
  },
  {
    key: "lucru",
    label: "3. Piese & Service",
    description: "Comandă, recepție piese, atelier și lucru",
    barColor: "#C98A2B",
    bgColor: "#FBF3E6",
    statuses: ["piese_comandate", "piese_sosite", "programat", "in_lucru"]
  },
  {
    key: "final",
    label: "4. Finalizare & Predare",
    description: "Facturare dosar și eliberare mașină",
    barColor: "#3E6B45",
    bgColor: "#EEF5EE",
    statuses: ["facturat"]
  }
];

function PhaseCard({ claim, onOpen, onMoveToStatus, onDuplicate, canEdit, pragRidicare }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);

  return (
    <div
      className={`group relative bg-white rounded-lg border p-3 transition-all duration-150 hover:shadow-md ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
    >
      {/* Header Row: Nr Dosar + Asigurare */}
      <div className="flex items-center justify-between gap-1">
        <span
          onClick={() => onOpen(claim)}
          className="font-mono text-[13px] font-bold text-[#23282E] hover:text-[#C98A2B] cursor-pointer truncate"
        >
          {claim.numarDosar || "(fără nr.)"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
          <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
        </div>
      </div>

      {/* Interactive 1-Click Status Dropdown Badge */}
      <div className="mt-2 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
          className="w-full flex items-center justify-between px-2 py-1 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] transition-colors text-[11.5px] font-semibold text-[#23282E]"
          title="Apasă pentru a schimba etapa dosarului"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getPhaseColors(claim.status).bar }} />
            <span className="font-mono text-[10.5px] text-[#6B6558] shrink-0">{String(statusDef.num).padStart(2, "0")}.</span>
            <span className="truncate">{statusDef.label}</span>
          </span>
          <ChevronDown size={13} className="text-[#8A8375] shrink-0" />
        </button>

        {showStatusPicker && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-lg border border-[#DAD4C6] shadow-lg p-1 text-[11.5px] space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-bold text-[#8A8375] uppercase border-b border-[#EFEAE1]">
              Schimbă etapa dosarului:
            </div>
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  onMoveToStatus(claim, s.key);
                  setShowStatusPicker(false);
                }}
                className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-colors ${
                  claim.status === s.key ? "bg-[#3B5166] text-white font-bold" : "hover:bg-[#F3EFE6] text-[#23282E]"
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="font-mono text-[10.5px] opacity-75">{String(s.num).padStart(2, "0")}.</span>
                  <span className="truncate">{s.label}</span>
                </span>
                {claim.status === s.key && <Check size={12} className="shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Client & Phone */}
      <div className="mt-2 flex items-center justify-between gap-1 text-[12px]">
        <span
          onClick={() => onOpen(claim)}
          className="font-medium text-[#23282E] truncate cursor-pointer hover:underline"
        >
          {claim.client || "Client neintrodus"}
        </span>
        {claim.telefonClient && (
          <div className="flex items-center gap-1 shrink-0">
            <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
              <Phone size={12} />
            </a>
            <a href={waLink(claim.telefonClient)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3E6B45]">
              <MessageCircle size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Auto & Insurer */}
      <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] text-[#6B6558]">
        <span className="flex items-center gap-1 font-mono font-bold text-[#23282E]">
          <Car size={12} className="text-[#8A8375]" />
          {claim.numarInmatriculare || "—"}
        </span>
        <span className="truncate max-w-[110px]" title={claim.marcaModel}>
          {claim.marcaModel || claim.asigurator}
        </span>
      </div>

      {/* Active Badges */}
      {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
        <div className="mt-2 flex items-center gap-1 flex-wrap text-[10px]">
          {claim.blocat && <Pill tone="danger">⚠️ blocat</Pill>}
          {claim.masinaSchimb && (
            <span className="px-1.5 py-0.5 rounded bg-[#FBF3E6] text-[#7A5316] font-bold text-[10px]">
              🚗 {claim.masinaSchimb}
            </span>
          )}
          {claim.gataDeRidicare && !claim.ridicata && (
            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
              📦 gata ({zileNeridicata}z)
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Days + Quick Actions */}
      <div className="mt-2.5 pt-2 border-t border-[#EFEAE1] flex items-center justify-between text-[10.5px]">
        <span className="text-[#8A8375] font-mono flex items-center gap-1">
          <Clock size={11} /> {days} zile în etapă
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicate(claim)}
            title="Duplică dosarul"
            className="px-1.5 py-0.5 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166] text-[10px] font-semibold transition-colors"
          >
            <Copy size={11} className="inline mr-0.5" /> Duplică
          </button>
          <button
            onClick={() => onOpen(claim)}
            className="px-2 py-0.5 rounded bg-[#3B5166] text-white text-[10.5px] font-bold hover:bg-[#2C4160] transition-colors"
          >
            Detalii
          </button>
        </div>
      </div>
    </div>
  );
}

function TablouPeFaze({ claims, onOpen, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare }) {
  const [quickFilter, setQuickFilter] = useState("toate"); // "toate", "intarziate", "blocate", "masini_schimb", "piese_sosite"

  const alertClaims = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)), [claims]);
  const blockedClaims = useMemo(() => claims.filter((c) => c.blocat), [claims]);
  const masinaSchimbClaims = useMemo(() => claims.filter((c) => c.masinaSchimb), [claims]);
  const pieseSositeClaims = useMemo(() => claims.filter((c) => c.status === "piese_sosite"), [claims]);

  const displayClaims = useMemo(() => {
    if (quickFilter === "intarziate") return alertClaims;
    if (quickFilter === "blocate") return blockedClaims;
    if (quickFilter === "masini_schimb") return masinaSchimbClaims;
    if (quickFilter === "piese_sosite") return pieseSositeClaims;
    return claims;
  }, [claims, quickFilter, alertClaims, blockedClaims, masinaSchimbClaims, pieseSositeClaims]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      {/* Top Smart Quick Filters Bar */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-3 shadow-xs flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#23282E] text-[13px] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Layers size={16} className="text-[#C98A2B]" /> Flux Operațional
          </span>
          <span className="text-[11.5px] text-[#8A8375]">({claims.length} dosare)</span>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11.5px]">
          <button
            onClick={() => setQuickFilter("toate")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
              quickFilter === "toate"
                ? "bg-[#23282E] text-white shadow-xs font-bold"
                : "bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            Toate ({claims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "intarziate" ? "toate" : "intarziate")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "intarziate"
                ? "bg-[#B23A2E] text-white shadow-xs font-bold"
                : "bg-[#B23A2E]/10 text-[#B23A2E] hover:bg-[#B23A2E]/20"
            }`}
          >
            <AlertTriangle size={12} /> Depășite ({alertClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "blocate" ? "toate" : "blocate")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "blocate"
                ? "bg-[#23282E] text-white shadow-xs font-bold"
                : "bg-[#23282E]/10 text-[#23282E] hover:bg-[#23282E]/20"
            }`}
          >
            <AlertOctagon size={12} /> Blocate ({blockedClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "piese_sosite" ? "toate" : "piese_sosite")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "piese_sosite"
                ? "bg-[#C98A2B] text-white shadow-xs font-bold"
                : "bg-[#C98A2B]/15 text-[#7A5316] hover:bg-[#C98A2B]/25"
            }`}
          >
            <PackageCheck size={12} /> Piese Sosite ({pieseSositeClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "masini_schimb" ? "toate" : "masini_schimb")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "masini_schimb"
                ? "bg-[#3B5166] text-white shadow-xs font-bold"
                : "bg-[#3B5166]/10 text-[#3B5166] hover:bg-[#3B5166]/20"
            }`}
          >
            <Car size={12} /> Auto la Schimb ({masinaSchimbClaims.length})
          </button>
        </div>
      </div>

      {/* 4 Phase Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        {PIPELINE_PHASES.map((phase) => {
          const phaseClaims = displayClaims.filter((c) => phase.statuses.includes(c.status));

          return (
            <div
              key={phase.key}
              className="flex flex-col h-full rounded-xl overflow-hidden border border-[#DAD4C6] shadow-sm shrink-0"
              style={{ background: phase.bgColor }}
            >
              {/* Phase Column Header */}
              <div className="p-3 text-white shrink-0" style={{ background: phase.barColor }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[13px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {phase.label}
                  </div>
                  <span className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center rounded-full bg-white/20 text-[12px] font-bold text-white">
                    {phaseClaims.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[10.5px] opacity-80 leading-tight">
                  {phase.description}
                </div>

                {/* Sub-status Pills inside Phase */}
                <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                  {phase.statuses.map((stKey) => {
                    const stDef = getStatusDefinition(stKey);
                    const stCount = phaseClaims.filter((c) => c.status === stKey).length;
                    return (
                      <span
                        key={stKey}
                        className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-semibold flex items-center gap-1"
                      >
                        <span className="opacity-75">{stDef.num}.</span>
                        <span>{stDef.label}</span>
                        <span className="bg-white/25 px-1 rounded-full text-[9.5px] font-bold">{stCount}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Claims List inside Phase */}
              <div className="p-2.5 flex flex-col gap-2.5 overflow-y-auto flex-1 min-h-0">
                {phaseClaims.length === 0 ? (
                  <div className="text-center py-10 text-[12px] text-[#8A8375]/70 italic">
                    Niciun dosar în această fază
                  </div>
                ) : (
                  phaseClaims.map((claim) => (
                    <PhaseCard
                      key={claim.id}
                      claim={claim}
                      onOpen={onOpen}
                      onMoveToStatus={onMoveToStatus}
                      onDuplicate={onDuplicate}
                      canEdit={canEditFn(claim)}
                      pragRidicare={pragRidicare}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function KanbanBoard({ claims, onOpen, onMove, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const [compactMode, setCompactMode] = useState(true);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-[#DAD4C6] px-3 py-1.5 shadow-xs shrink-0 flex-wrap gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#23282E] flex items-center gap-1.5">
            <LayoutGrid size={15} className="text-[#C98A2B]" /> Kanban Board ({claims.length} dosare)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] font-semibold transition-all ${
              compactMode
                ? "bg-[#3B5166] text-white border-[#3B5166] shadow-xs"
                : "bg-[#FAF8F5] text-[#3B5166] border-[#DAD4C6] hover:bg-[#EFEAE1]"
            }`}
          >
            {compactMode ? <List size={14} /> : <LayoutGrid size={14} />}
            {compactMode ? "Mod Compact (Toate pe pagină)" : "Mod Detaliat"}
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex gap-2 overflow-x-auto overflow-y-hidden flex-1 min-h-0 -mx-1 px-1">
        {STATUSES.map((s) => {
          const colClaims = claims.filter((c) => c.status === s.key);
          const colors = PHASE_COLORS[s.phase];
          return (
            <div
              key={s.key}
              className="flex-shrink-0 w-[195px] xl:w-[215px] h-full flex flex-col rounded-xl overflow-hidden border border-[#DAD4C6] shadow-xs"
              style={{ background: colors.tint }}
            >
              <div
                className="px-2.5 py-2 flex items-center justify-between shrink-0"
                style={{ background: colors.bar }}
              >
                <div className="flex items-center gap-1 text-white min-w-0">
                  <span className="font-mono text-[10.5px] opacity-75 shrink-0">
                    {String(s.num).padStart(2, "0")}
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight truncate" title={s.label}>
                    {s.label}
                  </span>
                </div>
                <span className="min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full bg-white/20 text-[10.5px] font-bold text-white shrink-0 ml-1">
                  {colClaims.length}
                </span>
              </div>
              <div
                className={`p-2 flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 transition-colors ${
                  dragOverKey === s.key ? "bg-white/60 ring-2 ring-[#3B5166] ring-inset" : ""
                }`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDragEnter={() => setDragOverKey(s.key)}
                onDragLeave={(e) => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDragOverKey(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const claimId = e.dataTransfer.getData("text/plain");
                  const draggedClaim = claims.find((c) => c.id === claimId);
                  if (draggedClaim && draggedClaim.status !== s.key) onMoveToStatus(draggedClaim, s.key);
                  setDragOverKey(null);
                }}
              >
                {colClaims.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-[#8A8375]/80">
                    Niciun dosar în această etapă
                  </div>
                )}
                {colClaims.map((c) => (
                  <ClaimCard
                    key={c.id}
                    claim={c}
                    onOpen={onOpen}
                    onMove={onMove}
                    onDuplicate={onDuplicate}
                    canEdit={canEditFn(c)}
                    pragRidicare={pragRidicare}
                    compact={compactMode}
                  />
                ))}
                <button
                  onClick={() => onAddInStatus(s.key)}
                  className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-[#6B6558] rounded-lg border border-dashed border-[#C7C0B0] hover:bg-white/70 hover:text-[#23282E] hover:border-[#A89F8A] transition-colors shrink-0"
                >
                  <Plus size={12} /> dosar nou
                </button>
              </div>
            </div>
          );
        })}
      </div>
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
      if (sortKey === "status") {
        av = STATUSES.findIndex((s) => s.key === a.status);
        bv = STATUSES.findIndex((s) => s.key === b.status);
        av = av < 0 ? Number.MAX_SAFE_INTEGER : av;
        bv = bv < 0 ? Number.MAX_SAFE_INTEGER : bv;
      }
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
            const s = getStatusDefinition(c.status);
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

function Dashboard({ claims, onOpen, pragRidicare = 3 }) {
  const total = claims.length;
  const rca = claims.filter((c) => c.tipAsigurare === "RCA").length;
  const casco = claims.filter((c) => c.tipAsigurare === "CASCO").length;
  const active = claims.filter((c) => c.status !== "facturat").length;
  const blockedCount = claims.filter((c) => c.blocat).length;
  const gataNeridicateCount = claims.filter((c) => c.gataDeRidicare && !c.ridicata && daysBetween(c.dataGataRidicare) >= pragRidicare).length;
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
        <StatCard label="Gata, neridicate" value={gataNeridicateCount} tone={gataNeridicateCount ? "danger" : "green"} />
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
              const s = getStatusDefinition(c.status);
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

function Notification({ notice, onClose }) {
  if (!notice) return null;
  const isError = notice.type === "error";
  return (
    <div className={`fixed top-4 right-4 z-[70] max-w-md rounded-lg border shadow-lg px-3 py-2.5 flex items-start gap-2 text-[12.5px] ${
      isError
        ? "bg-[#FFF2F0] border-[#B23A2E]/40 text-[#7E251D]"
        : "bg-[#EEF5EE] border-[#3E6B45]/40 text-[#285032]"
    }`} role="status">
      {isError ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <ShieldCheck size={16} className="mt-0.5 shrink-0" />}
      <span className="leading-5">{notice.message}</span>
      <button onClick={onClose} className="ml-1 shrink-0 opacity-70 hover:opacity-100" aria-label="Închide notificarea"><X size={15} /></button>
    </div>
  );
}

function ClaimModal({ claim, onClose, onSave, onDelete, readOnly, allClaims, onJumpTo, onNotify }) {
  const [form, setForm] = useState(claim);
  const [noteText, setNoteText] = useState("");
  const [istoric, setIstoric] = useState([]);
  const [loadingIstoric, setLoadingIstoric] = useState(false);
  const [uploadingPoze, setUploadingPoze] = useState(false);
  const [uploadingDocumente, setUploadingDocumente] = useState(false);
  const isNew = !claim.numarDosar && claim.note.length === 0 && claim.documente.length === 0;

  useEffect(() => setForm(claim), [claim]);

  useEffect(() => {
    let cancelled = false;

    const loadStorageUrls = async () => {
      if (!claim?.id) return;

      const [poze, documente] = await Promise.all([
        refreshStorageUrls(claim.poze, "poze-dosare"),
        refreshStorageUrls(claim.documente, "documente-dosare"),
      ]);

      if (!cancelled) {
        setForm((current) => ({ ...current, poze, documente }));
      }
    };

    loadStorageUrls();
    return () => { cancelled = true; };
  }, [claim]);

  useEffect(() => {
    if (isNew) { setIstoric([]); return; }
    setLoadingIstoric(true);
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setIstoric(data || []))
      .finally(() => setLoadingIstoric(false));
  }, [claim.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...f.manopera, [dept]: val } }));
  const toggleGata = (checked) => setForm((f) => ({ ...f, gataDeRidicare: checked, dataGataRidicare: checked && !f.dataGataRidicare ? nowISO() : f.dataGataRidicare }));
  const toggleRidicata = (checked) => setForm((f) => ({ ...f, ridicata: checked, dataRidicare: checked && !f.dataRidicare ? nowISO() : f.dataRidicare }));

  const handleDuplicate = () => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: claim.numarInmatriculare,
      vin: claim.vin,
      marcaModel: claim.marcaModel,
      client: claim.client,
      telefonClient: claim.telefonClient,
      tipAsigurare: claim.tipAsigurare,
      asigurator: claim.asigurator,
    };
    onNotify("Date duplicate — completează numărul de dosar nou și verifică restul.", "success");
    onJumpTo(dup);
  };

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
    const numarDosar = form.numarDosar.trim();
    const numarInmatriculare = form.numarInmatriculare.trim().toUpperCase();
    const vin = form.vin.trim().toUpperCase();
    const telefonClient = form.telefonClient.trim();

    if (!numarDosar) { onNotify("Introduceți numărul dosarului.", "error"); return; }
    if (!numarInmatriculare) { onNotify("Introduceți numărul de înmatriculare.", "error"); return; }
    if (telefonClient && !isValidPhone(telefonClient)) {
      onNotify("Telefonul trebuie să conțină între 7 și 15 cifre.", "error");
      return;
    }

    const duplicateDosar = allClaims?.find((c) =>
      c.id !== claim.id && normalizedText(c.numarDosar) === normalizedText(numarDosar)
    );
    if (duplicateDosar) {
      onNotify(`Numărul de dosar „${numarDosar}” este deja folosit de un alt dosar.`, "error");
      return;
    }

    if (isNew && allClaims) {
      const duplicat = allClaims.find((c) =>
        c.numarInmatriculare.trim().toUpperCase() === numarInmatriculare &&
        c.status !== "facturat"
      );
      if (duplicat) {
        const ok = confirm(`Există deja un dosar activ pentru ${form.numarInmatriculare} (dosarul ${duplicat.numarDosar || "—"}, status „${getStatusDefinition(duplicat.status).label}"). Continui oricum?`);
        if (!ok) return;
      }
    }

    // Auto-mutare în „Programat" când se setează o dată de programare
    let effectiveStatus = form.status;
    if (form.dataProgramare && form.status === "piese_sosite") {
      effectiveStatus = "programat";
    }
    const statusChanged = effectiveStatus !== claim.status;
    if (statusChanged && effectiveStatus === "facturat") {
      const faraValori = !form.manopera.tinichigerie.facturat && !form.manopera.vopsitorie.facturat &&
        !form.valoarePieseAudatex && !form.valoareAchizitiePiese;
      if (faraValori) {
        const ok = confirm("Nu ai completat nicio valoare de manoperă sau piese pentru acest dosar. Sigur vrei să-l marchezi ca facturat?");
        if (!ok) return;
      }
    }

    onSave({
      ...form,
      status: effectiveStatus,
      numarDosar,
      numarInmatriculare,
      vin,
      telefonClient,
      dataUltimeiActualizari: nowISO(),
      dataSchimbareStatus: statusChanged ? nowISO() : form.dataSchimbareStatus,
    });
  };
  const addNote = () => { if (!noteText.trim()) return; setForm((f) => ({ ...f, note: [{ id: uid(), data: nowISO(), text: noteText.trim() }, ...f.note] })); setNoteText(""); };
  const removeNote = (id) => setForm((f) => ({ ...f, note: f.note.filter((n) => n.id !== id) }));
  const removeDoc = async (id) => {
    const doc = form.documente.find((d) => d.id === id);
    if (doc?.path) {
      const { error } = await supabase.storage.from("documente-dosare").remove([doc.path]);
      if (error) {
        onNotify(`Nu am putut șterge documentul „${doc.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    setForm((f) => ({ ...f, documente: f.documente.filter((d) => d.id !== id) }));
  };

  // Upload images to the dedicated photos bucket. Only paths are persisted; URLs are temporary.
  const handleUploadPoze = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingPoze(true);
    const noi = [];
    for (const file of files) {
      const path = storagePath(claim.id, file);
      const { error } = await supabase.storage.from("poze-dosare").upload(path, file, { upsert: false });
      if (error) { onNotify(`Eroare la încărcarea „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("poze-dosare").createSignedUrl(path, 60 * 60);
      if (signedError) {
        await supabase.storage.from("poze-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, poze: [...noi, ...f.poze] }));
    setUploadingPoze(false);
    if (noi.length) onNotify(`${noi.length} fotografie(i) încărcată(e).`, "success");
  };

  // Upload documents to a separate storage bucket. Only paths are persisted; URLs are temporary.
  const handleUploadDocumente = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setUploadingDocumente(true);
    const noi = [];
    for (const file of files) {
      const path = storagePath(claim.id, file, "documente");
      const { error } = await supabase.storage.from("documente-dosare").upload(path, file, { upsert: false });
      if (error) { onNotify(`Eroare la încărcarea documentului „${file.name}”: ${error.message}`, "error"); continue; }
      const { data: signed, error: signedError } = await supabase.storage.from("documente-dosare").createSignedUrl(path, 60 * 60);
      if (signedError) {
        await supabase.storage.from("documente-dosare").remove([path]);
        onNotify(`Eroare la generarea linkului pentru „${file.name}”: ${signedError.message}`, "error");
        continue;
      }
      noi.push({ id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() });
    }
    setForm((f) => ({ ...f, documente: [...noi, ...f.documente] }));
    setUploadingDocumente(false);
    if (noi.length) onNotify(`${noi.length} document(e) încărcat(e).`, "success");
  };

  const removePoza = async (poza) => {
    if (poza?.path) {
      const { error } = await supabase.storage.from("poze-dosare").remove([poza.path]);
      if (error) {
        onNotify(`Nu am putut șterge fotografia „${poza.nume || ""}”: ${error.message}`, "error");
        return;
      }
    }
    setForm((f) => ({ ...f, poze: f.poze.filter((p) => p.id !== poza.id) }));
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="mx-auto my-4 bg-[#FCFAF5] w-full max-w-5xl rounded-lg shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#23282E] rounded-t-lg shrink-0">
          <div className="flex items-center gap-2 text-white"><FileText size={16} /><span className="font-semibold text-[14px]">{isNew ? "Dosar nou" : `Dosar ${claim.numarDosar}`}</span></div>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button onClick={() => generateazaPDF(form, istoric)} className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1">
                <FileDown size={12} /> PDF
              </button>
            )}
            {!isNew && (
              <button onClick={handleDuplicate} className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1">
                <Copy size={12} /> Duplică
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
        {!isNew && (
          <div className="px-4 py-3 border-b border-[#DAD4C6] bg-white">
            <details className="border border-[#DAD4C6] rounded-md bg-[#FCFAF5]">
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
                    <div className="text-[10px] text-[#8A8375] font-mono">{fmtDateTime(h.created_at)} · {h.user_email || "necunoscut"}</div>
                    {Object.entries(h.modificari || {}).map(([camp, diff]) => (
                      <div key={camp} className="text-[#23282E]">
                        <span className="font-semibold">{CAMP_LABELS[camp] || camp}</span>
                        {camp !== "_creat" && (
                          <>: {camp === "data_schimbare_status" ? fmtDateTime(diff.old) : formatIstoricValoare(camp, diff.old)} → {camp === "data_schimbare_status" ? fmtDateTime(diff.new) : formatIstoricValoare(camp, diff.new)}</>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <fieldset disabled={readOnly} className="p-4 grid md:grid-cols-2 gap-x-5 gap-y-4 border-0 m-0 min-w-0">
          <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><ShieldCheck size={12} /> Identificare</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nr. dosar daună"><input className="in" value={form.numarDosar} onChange={(e) => set("numarDosar", e.target.value)} placeholder="ex: 2026-00451" required /></Field>
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
              <Field label="Telefon client">
                <div className="flex items-center gap-1.5">
                  <input className="in" type="tel" inputMode="tel" placeholder="07xx xxx xxx" value={form.telefonClient} onChange={(e) => set("telefonClient", e.target.value)} />
                  {form.telefonClient && (
                    <>
                      <a href={telLink(form.telefonClient)} title="Sună" className="shrink-0 p-1.5 rounded-md border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3B5166]"><Phone size={14} /></a>
                      <a href={waLink(form.telefonClient)} target="_blank" rel="noreferrer" title="WhatsApp" className="shrink-0 p-1.5 rounded-md border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3E6B45]"><MessageCircle size={14} /></a>
                    </>
                  )}
                </div>
              </Field>
              <Field label="Nr. înmatriculare"><input className="in font-mono" value={form.numarInmatriculare} onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())} required /></Field>
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
                    const s = getStatusDefinition(c.status);
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
              <Field label="Data deschiderii"><DatePickerInput value={form.dataDeschiderii} onChange={(v) => set("dataDeschiderii", v)} withTime={false} placeholder="zi/luna/an" /></Field>
              <Field label="Ultima actualizare"><div className="in bg-[#EFEAE1] text-[#6B6558]">{fmtDateTime(form.dataUltimeiActualizari)}</div></Field>
              <Field label="Programare service" full>
                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                  <span className="text-[11px] text-[#6B6558] mr-1">Slot orar rapid:</span>
                  {SLOTURI_ORARE.map((slot) => {
                    const active = getSlotForIso(form.dataProgramare) === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          const newIso = makeIsoFromSlot(form.dataProgramare, slot);
                          set("dataProgramare", newIso);
                        }}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border transition-colors ${
                          active ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-white text-[#23282E] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                <DatePickerInput value={form.dataProgramare} onChange={(v) => set("dataProgramare", v)} withTime={true} placeholder="zi/luna/an, ore" />
                {form.dataProgramare && (
                  <div className="text-[11px] text-[#3B5166] mt-1 font-semibold">
                    {fmtProgramare(form.dataProgramare)}
                    {form.status === "piese_sosite" && <span className="text-[#C98A2B]"> — va fi mutat automat în „Programat"</span>}
                  </div>
                )}
              </Field>
            </div>
            <label className={`flex items-center gap-2 text-[12.5px] mt-2.5 cursor-pointer px-2.5 py-2 rounded-md border ${form.blocat ? "bg-[#B23A2E]/10 border-[#B23A2E] text-[#8C2E2E]" : "border-[#DAD4C6] text-[#23282E]"}`}>
              <input type="checkbox" checked={form.blocat} onChange={(e) => set("blocat", e.target.checked)} /> Dosar blocat
            </label>
            {form.blocat && (
              <div className="px-4 py-2.5 bg-[#B23A2E] text-white text-[12.5px] flex items-center gap-2 shrink-0">
                <AlertOctagon size={15} />
                <span className="font-semibold">Dosar blocat</span>
                {form.motivBlocare && (
                  <span className="opacity-90">— {form.motivBlocare}</span>
                )}
              </div>
            )}
          </div>
          </div>

          <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><Wrench size={12} /> Flux fizic în service</div>
            <label className="flex items-center gap-2 text-[12.5px] text-[#23282E] mb-2 cursor-pointer">
              <input type="checkbox" checked={form.adusaFizic} onChange={(e) => set("adusaFizic", e.target.checked)} /> Mașina este adusă fizic în service
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <label className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border cursor-pointer ${form.gataDeRidicare ? "bg-[#FBF3E6] border-[#C98A2B] text-[#7A5316]" : "border-[#DAD4C6] text-[#23282E]"}`}>
                <input type="checkbox" checked={form.gataDeRidicare} onChange={(e) => toggleGata(e.target.checked)} />
                Gata de ridicare{form.gataDeRidicare && form.dataGataRidicare && ` (de ${daysBetween(form.dataGataRidicare)}z)`}
              </label>
              <label className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md border cursor-pointer ${form.ridicata ? "bg-[#EEF5EE] border-[#3E6B45] text-[#294A2E]" : "border-[#DAD4C6] text-[#23282E]"}`}>
                <input type="checkbox" checked={form.ridicata} onChange={(e) => toggleRidicata(e.target.checked)} disabled={!form.gataDeRidicare} />
                Ridicată de client{form.ridicata && form.dataRidicare && ` — ${fmtDate(form.dataRidicare)}`}
              </label>
            </div>
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
              <Field label="Data dării la schimb"><DatePickerInput value={form.dataDariiLaSchimb} onChange={(v) => set("dataDariiLaSchimb", v)} withTime={false} placeholder="zi/luna/an" /></Field>
              <Field label="Zile chirie Audatex"><input type="number" min={0} className="in" value={form.zileChirieAudatex} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} /></Field>
            </div>
          </div>
          <div className="border border-[#DAD4C6] rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> Poze dosar</div>
            {!isNew && (
              <label className={`flex items-center justify-center gap-1.5 border border-dashed rounded-md py-2 text-[12px] mb-2 cursor-pointer ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[#F5F2EA]"} border-[#C7C0B0] text-[#6B6558]`}>
                {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Adaugă poze (poți selecta mai multe)</>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files)} />
              </label>
            )}
            {isNew && <div className="text-[11px] text-[#8A8375] mb-2">Salvează dosarul întâi, apoi poți adăuga poze.</div>}
            {form.poze.length > 0 && (
              <div className="grid grid-cols-6 gap-1 max-h-[18rem] overflow-y-auto w-full min-w-0">
                {form.poze.map((p) => (
                  <div key={p.id} className="relative group min-w-0">
                    <a href={p.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                      <img src={p.url} alt={p.nume} className="w-full h-16 object-cover rounded border border-[#DAD4C6] max-w-full" />
                    </a>
                    <button onClick={() => removePoza(p)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border border-[#DAD4C6] rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {!isNew && (
                <label className={`flex items-center justify-center gap-1.5 border border-dashed rounded-md py-2 px-3 text-[12px] cursor-pointer ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[#F5F2EA]"} border-[#C7C0B0] text-[#6B6558]`}>
                  {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Încarcă documente</>}
                  <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
                </label>
              )}
            </div>
            <div className="space-y-1 max-h-[18rem] overflow-y-auto">
              {form.documente.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded px-2.5 py-1.5 text-[12.5px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] underline truncate flex-1">{d.nume}</a>
                    <span className="text-[10px] text-[#8A8375] whitespace-nowrap">{d.path ? "stocat intern" : "link extern"}</span>
                  </div>
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
                    <span className="text-[10px] text-[#8A8375] font-mono">{fmtDateTime(n.data)}</span>
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
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-[#DAD4C6] bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
  {readOnly ? (
    <span />
  ) : (
    <button
      onClick={() => {
        if (confirm("Ștergi definitiv acest dosar?")) onDelete(claim.id);
      }}
      className="flex items-center gap-1.5 text-[#B23A2E] text-[13px] font-medium hover:opacity-70 px-2 py-1 rounded-md hover:bg-[#B23A2E]/5 transition-colors"
    >
      <Trash2 size={14} /> Șterge dosar
    </button>
  )}
  <div className="flex gap-2">
    <button
      onClick={onClose}
      className="px-4 py-2 rounded-lg border border-[#C7C0B0] text-[13px] text-[#4A443A] hover:bg-[#EFEAE1] transition-colors"
    >
      {readOnly ? "Închide" : "Anulează"}
    </button>
    {!readOnly && (
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#C98A2B] text-white text-[13px] font-semibold hover:bg-[#B37A22] shadow-sm transition-colors"
      >
        <Save size={14} /> Salvează
      </button>
    )}
  </div>
</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programator: Agendă săptămânală pe coloane + Panou lateral de așteptare
// ---------------------------------------------------------------------------
const SLOTURI_ORARE = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

function getSlotForIso(iso) {
  if (!iso || !iso.includes("T")) return null;
  const time = iso.slice(11, 16);
  if (time >= "08:00" && time < "10:00") return "08:00 - 10:00";
  if (time >= "10:00" && time < "12:00") return "10:00 - 12:00";
  if (time >= "12:00" && time < "14:00") return "12:00 - 14:00";
  if (time >= "14:00" && time < "16:00") return "14:00 - 16:00";
  if (time >= "16:00" && time <= "18:00") return "16:00 - 18:00";
  return null;
}

function makeIsoFromSlot(dateStr, slotStr) {
  const baseDate = dateStr ? dateStr.slice(0, 10) : todayISO();
  const startTime = slotStr ? slotStr.split(" - ")[0] : "08:00";
  return `${baseDate}T${startTime}`;
}

function checkMasinaSchimbConflict(claims, claimId, masinaSchimb, dateStr) {
  if (!masinaSchimb || !masinaSchimb.trim() || !dateStr) return null;
  const nameClean = masinaSchimb.trim().toLowerCase();
  const targetDate = dateStr.slice(0, 10);
  const conflict = claims.find((c) => 
    c.id !== claimId &&
    c.masinaSchimb &&
    c.masinaSchimb.trim().toLowerCase() === nameClean &&
    (
      (c.dataProgramare && c.dataProgramare.slice(0, 10) === targetDate) ||
      (c.dataDariiLaSchimb && c.dataDariiLaSchimb.slice(0, 10) === targetDate)
    )
  );
  return conflict || null;
}

function getMondayOfISOWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getDaysOfWeek(mondayDate) {
  const days = [];
  for (let i = 0; i < 6; i++) {
    const day = new Date(mondayDate);
    day.setDate(mondayDate.getDate() + i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function formatWeekRange(mondayDate) {
  const saturday = new Date(mondayDate);
  saturday.setDate(mondayDate.getDate() + 5);
  return `${fmtDate(mondayDate)} – ${fmtDate(saturday)}`;
}

function CalendarLunar({ claims, capacitate, canEditFn, onOpen, onPatch, monthOffset = 0, setMonthOffset }) {
  const [searchTerm, setSearchTerm] = useState("");

  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const todayStr = todayISO();

  const prevMonth = () => setMonthOffset((m) => m - 1);
  const nextMonth = () => setMonthOffset((m) => m + 1);
  const jumpToday = () => setMonthOffset(0);

  const daysGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, month: m, year: y, dateStr, currentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, month: month, year: year, dateStr, currentMonth: true });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ day: i, month: m, year: y, dateStr, currentMonth: false });
    }
    return days;
  }, [year, month]);

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter((c) =>
      (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.numarDosar && c.numarDosar.toLowerCase().includes(term)) ||
      (c.masinaSchimb && c.masinaSchimb.toLowerCase().includes(term))
    );
  }, [claims, searchTerm]);

  const unassignedQueue = useMemo(() => {
    return filteredClaims.filter(
      (c) => STADII_PROGRAMABILE.includes(c.status) && (!c.dataProgramare || c.status === "piese_sosite")
    );
  }, [filteredClaims]);

  const claimsByDay = useMemo(() => {
    const map = {};
    daysGrid.forEach(({ dateStr }) => (map[dateStr] = []));
    filteredClaims.forEach((c) => {
      if (!c.dataProgramare) return;
      const d = c.dataProgramare.slice(0, 10);
      if (map[d]) {
        map[d].push(c);
      }
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    });
    return map;
  }, [filteredClaims, daysGrid]);

  const totalMonthScheduled = useMemo(() => {
    return Object.values(claimsByDay).reduce((acc, list) => acc + list.length, 0);
  }, [claimsByDay]);

  const totalMasiniSchimbMonth = useMemo(() => {
    return Object.values(claimsByDay).reduce(
      (acc, list) => acc + list.filter((c) => c.masinaSchimb).length,
      0
    );
  }, [claimsByDay]);

  const weekDayNames = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

  return (
    <div className="space-y-3">
      {/* Navigation & Summary Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            <ChevronLeft size={16} /> Înapoi
          </button>
          <button onClick={jumpToday} className="px-3 py-1.5 rounded-md border border-[#DAD4C6] bg-[#3B5166] text-white hover:bg-[#2C3E4C] text-[12px] font-semibold shadow-sm">
            Azi
          </button>
          <button onClick={nextMonth} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            Înainte <ChevronRight size={16} />
          </button>
          <span className="text-[14px] font-bold text-[#23282E] ml-2 capitalize">
            🗓️ Luna: {monthLabel}
          </span>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="px-2.5 py-1 rounded-full bg-[#E8F3E9] text-[#3E6B45] font-bold border border-[#3E6B45]/20">
            {totalMonthScheduled} programări pe lună
          </span>
          {totalMasiniSchimbMonth > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#FBF3E6] text-[#7A5316] font-bold border border-[#C98A2B]/30 flex items-center gap-1">
              🚗 {totalMasiniSchimbMonth} auto la schimb
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-[#F5F2EA] text-[#6B6558] font-bold border border-[#DAD4C6]">
            📦 {unassignedQueue.length} de programat
          </span>
        </div>

        {/* Quick Search */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#8A8375]" />
            <input
              type="text"
              placeholder="Caută dosar, client, nr auto..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#DAD4C6] rounded-md bg-[#FAF8F5] focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Month Days Grid + Right Queue Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Month Grid (9 cols) */}
        <div className="lg:col-span-9 space-y-1.5">
          {/* Weekdays Header Row */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-bold text-[#3B5166] bg-white p-2 rounded-lg border border-[#DAD4C6] shadow-sm">
            {weekDayNames.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysGrid.map(({ day, month: itemMonth, dateStr, currentMonth }) => {
              const dayList = claimsByDay[dateStr] || [];
              const count = dayList.length;
              const isOverbooked = count > capacitate;
              const isCapacityReached = count === capacitate;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={`border rounded-lg flex flex-col justify-between overflow-hidden bg-white shadow-sm transition-all min-h-[140px] ${
                    isToday ? "border-[#C98A2B] ring-2 ring-[#C98A2B]/40" : currentMonth ? "border-[#DAD4C6]" : "border-[#EFEAE1] opacity-75 bg-[#FAF9F5]"
                  }`}
                >
                  {/* Day Header */}
                  <div
                    className={`p-1.5 border-b ${
                      isOverbooked
                        ? "bg-[#F9E3E1] border-[#B23A2E]/30"
                        : isToday
                        ? "bg-[#FBF3E6] border-[#C98A2B]/30"
                        : currentMonth
                        ? "bg-[#F5F2EA] border-[#DAD4C6]"
                        : "bg-[#EFEAE1]/50 border-[#EFEAE1]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11.5px] font-bold ${currentMonth ? "text-[#23282E]" : "text-[#8A8375]"}`}>
                        {day} {!currentMonth && <span className="text-[9.5px] font-normal">({itemMonth + 1})</span>}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold px-1 py-0.2 bg-[#C98A2B] text-white rounded">
                          Azi
                        </span>
                      )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-0.5 flex items-center justify-between text-[9.5px]">
                      <span className={`font-bold ${isOverbooked ? "text-[#B23A2E]" : "text-[#6B6558]"}`}>
                        {count} / {capacitate}
                      </span>
                      {isOverbooked && (
                        <span className="text-[8.5px] font-bold text-[#B23A2E]">
                          ⚠ Depășit
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-[#EFEAE1] h-1 rounded-full mt-0.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverbooked
                            ? "bg-[#B23A2E]"
                            : isCapacityReached
                            ? "bg-[#C98A2B]"
                            : "bg-[#3E6B45]"
                        }`}
                        style={{ width: `${Math.min(100, (count / (capacitate || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Day Content Cards */}
                  <div className="p-1 space-y-1.5 flex-1 min-h-[90px] max-h-[220px] overflow-y-auto bg-[#FAF8F5]/40">
                    {dayList.length === 0 ? (
                      <div className="text-[10px] text-[#C2BCB0] italic text-center py-4">
                        —
                      </div>
                    ) : (
                      dayList.map((c) => {
                        const editable = canEditFn ? canEditFn(c) : true;
                        const slot = getSlotForIso(c.dataProgramare);
                        const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, dateStr);

                        return (
                          <div
                            key={c.id}
                            className={`bg-white border rounded p-1.5 text-[10.5px] shadow-xs space-y-0.5 hover:border-[#3B5166] transition-all relative ${
                              conflict ? "border-[#B23A2E] bg-[#FFF8F8]" : "border-[#DAD4C6]"
                            }`}
                          >
                            {/* Slot time pill & numar dosar */}
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-[#3B5166] text-white">
                                ⏰ {slot ? slot.split(" - ")[0] : c.dataProgramare.slice(11, 16)}
                              </span>
                              <span
                                className="font-mono font-bold text-[10.5px] text-[#3B5166] cursor-pointer hover:underline"
                                onClick={() => onOpen && onOpen(c)}
                              >
                                {c.numarDosar}
                              </span>
                            </div>

                            {/* Client & Car info */}
                            <div>
                              <div className="font-bold text-[#23282E] truncate text-[10px]" title={c.client}>
                                {c.client || "Client nespecificat"}
                              </div>
                              <div className="text-[9.5px] font-mono text-[#6B6558] flex items-center justify-between">
                                <span className="font-bold text-[#23282E]">{c.numarInmatriculare}</span>
                                <span className="truncate max-w-[65px]">{c.marcaModel}</span>
                              </div>
                            </div>

                            {/* Replacement Car if present */}
                            {c.masinaSchimb && (
                              <div
                                className={`text-[9px] font-bold p-0.5 rounded flex items-center justify-between ${
                                  conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"
                                }`}
                              >
                                <span>🚗 {c.masinaSchimb}</span>
                                {conflict && <span>⚠️</span>}
                              </div>
                            )}

                            {/* Quick Slot Selector Pill Row */}
                            {editable && (
                              <div className="pt-0.5 border-t border-[#EFEAE1] flex flex-wrap gap-0.5">
                                {SLOTURI_ORARE.map((s) => {
                                  const active = slot === s;
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        const newIso = makeIsoFromSlot(c.dataProgramare, s);
                                        if (onPatch) onPatch(c.id, { dataProgramare: newIso });
                                      }}
                                      className={`px-0.5 py-0.1 text-[8px] font-semibold rounded border ${
                                        active
                                          ? "bg-[#3B5166] text-white border-[#3B5166]"
                                          : "bg-white text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                                      }`}
                                    >
                                      {s.split(" - ")[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Confirm Programat Action */}
                            {c.status === "piese_sosite" && (
                              <button
                                disabled={!editable}
                                onClick={() =>
                                  onPatch && onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })
                                }
                                className="w-full mt-0.5 py-0.5 rounded bg-[#3B5166] text-white text-[9.5px] font-bold hover:bg-[#2C3E4C] flex items-center justify-center gap-1 shadow-sm"
                              >
                                Confirmă <ArrowRight size={9} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Drawer Sidebar: Queue "De Programat" (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2">
              <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                <PackageCheck size={15} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
                {unassignedQueue.length}
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {unassignedQueue.length === 0 ? (
                <div className="text-[11px] text-[#8A8375] italic py-8 text-center">
                  Toate dosarele cu piese sosite sunt programate.
                </div>
              ) : (
                unassignedQueue.map((c) => {
                  const editable = canEditFn ? canEditFn(c) : true;
                  return (
                    <div
                      key={c.id}
                      className="border border-[#DAD4C6] rounded-md p-2 text-[11.5px] bg-[#FAF8F5] space-y-1 hover:border-[#3B5166] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
                          onClick={() => onOpen && onOpen(c)}
                        >
                          {c.numarDosar}
                        </span>
                        <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>
                          {c.tipAsigurare}
                        </Pill>
                      </div>

                      <div className="font-bold text-[#23282E]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[#6B6558]">{c.numarInmatriculare}</div>

                      {/* Quick Assign Bar */}
                      <div className="pt-1.5 mt-1 border-t border-[#DAD4C6]/60 space-y-1">
                        <div className="text-[10px] font-bold text-[#6B6558]">Programează pe:</div>
                        <div className="flex items-center gap-1">
                          <DatePickerInput
                            value={c.dataProgramare || ""}
                            withTime={true}
                            disabled={!editable}
                            placeholder="zi/luna/an, ore"
                            className="w-full text-[11px] border border-[#DAD4C6] rounded px-1.5 py-0.5 bg-white min-h-[26px]"
                            onChange={(val) => {
                              if (onPatch) {
                                onPatch(c.id, {
                                  dataProgramare: val,
                                  status: "programat",
                                  dataSchimbareStatus: nowISO(),
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#EFEAE1] text-[10.5px] text-[#8A8375]">
            💡 Selectează data și ora din casetă pentru a programa automat dosarul în calendarul lunii.
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaSaptamanala({ claims, capacitate, onPatch, canEditFn, onOpen }) {
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfISOWeek(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  const daysOfWeek = useMemo(() => getDaysOfWeek(currentMonday), [currentMonday]);
  const weekStrRange = useMemo(() => formatWeekRange(currentMonday), [currentMonday]);

  const prevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };
  const nextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };
  const jumpToday = () => {
    setCurrentMonday(getMondayOfISOWeek(new Date()));
  };

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter((c) =>
      (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.numarDosar && c.numarDosar.toLowerCase().includes(term)) ||
      (c.masinaSchimb && c.masinaSchimb.toLowerCase().includes(term))
    );
  }, [claims, searchTerm]);

  const unassignedQueue = useMemo(() => {
    return filteredClaims.filter(
      (c) => STADII_PROGRAMABILE.includes(c.status) && (!c.dataProgramare || c.status === "piese_sosite")
    );
  }, [filteredClaims]);

  const claimsByDay = useMemo(() => {
    const map = {};
    daysOfWeek.forEach((d) => (map[d] = []));
    filteredClaims.forEach((c) => {
      if (!c.dataProgramare) return;
      const d = c.dataProgramare.slice(0, 10);
      if (map[d]) {
        map[d].push(c);
      }
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    });
    return map;
  }, [filteredClaims, daysOfWeek]);

  const totalWeekScheduled = useMemo(() => {
    return Object.values(claimsByDay).reduce((acc, list) => acc + list.length, 0);
  }, [claimsByDay]);

  const totalMasiniSchimbWeek = useMemo(() => {
    return Object.values(claimsByDay).reduce(
      (acc, list) => acc + list.filter((c) => c.masinaSchimb).length,
      0
    );
  }, [claimsByDay]);

  return (
    <div className="space-y-3">
      {/* Navigation & Summary Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            <ChevronLeft size={16} /> Înapoi
          </button>
          <button onClick={jumpToday} className="px-3 py-1.5 rounded-md border border-[#DAD4C6] bg-[#3B5166] text-white hover:bg-[#2C3E4C] text-[12px] font-semibold shadow-sm">
            Azi
          </button>
          <button onClick={nextWeek} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            Înainte <ChevronRight size={16} />
          </button>
          <span className="text-[14px] font-bold text-[#23282E] ml-2 capitalize">
            🗓️ Săptămâna: {weekStrRange}
          </span>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="px-2.5 py-1 rounded-full bg-[#E8F3E9] text-[#3E6B45] font-bold border border-[#3E6B45]/20">
            {totalWeekScheduled} programări pe săptămână
          </span>
          {totalMasiniSchimbWeek > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#FBF3E6] text-[#7A5316] font-bold border border-[#C98A2B]/30 flex items-center gap-1">
              🚗 {totalMasiniSchimbWeek} auto la schimb
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-[#F5F2EA] text-[#6B6558] font-bold border border-[#DAD4C6]">
            📦 {unassignedQueue.length} de programat
          </span>
        </div>

        {/* Quick Search */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#8A8375]" />
            <input
              type="text"
              placeholder="Caută dosar, client, nr auto..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#DAD4C6] rounded-md bg-[#FAF8F5] focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: 6 Day Columns + Right Queue Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Days Columns (9 cols) */}
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {daysOfWeek.map((dayStr) => {
            const dateObj = new Date(dayStr);
            const isToday = dayStr === todayISO();
            const dayName = dateObj.toLocaleDateString("ro-RO", { weekday: "short" });
            const dayNum = dateObj.getDate();
            const monthShort = dateObj.toLocaleDateString("ro-RO", { month: "short" });

            const dayList = claimsByDay[dayStr] || [];
            const count = dayList.length;
            const isOverbooked = count > capacitate;
            const isCapacityReached = count === capacitate;

            return (
              <div
                key={dayStr}
                className={`border rounded-lg flex flex-col justify-between overflow-hidden bg-white shadow-sm transition-all ${
                  isToday ? "border-[#C98A2B] ring-2 ring-[#C98A2B]/40" : "border-[#DAD4C6]"
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-2 border-b ${
                    isOverbooked
                      ? "bg-[#F9E3E1] border-[#B23A2E]/30"
                      : isToday
                      ? "bg-[#FBF3E6] border-[#C98A2B]/30"
                      : "bg-[#F5F2EA] border-[#DAD4C6]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold capitalize text-[#23282E]">
                      {dayName} {dayNum} {monthShort}
                    </span>
                    {isToday && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-[#C98A2B] text-white rounded">
                        Azi
                      </span>
                    )}
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={`font-bold ${isOverbooked ? "text-[#B23A2E]" : "text-[#6B6558]"}`}>
                      {count} / {capacitate} mașini
                    </span>
                    {isOverbooked && (
                      <span className="text-[9px] font-bold text-[#B23A2E] bg-white px-1 rounded">
                        ⚠ Depășit
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#EFEAE1] h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverbooked
                          ? "bg-[#B23A2E]"
                          : isCapacityReached
                          ? "bg-[#C98A2B]"
                          : "bg-[#3E6B45]"
                      }`}
                      style={{ width: `${Math.min(100, (count / (capacitate || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Day Content Cards */}
                <div className="p-1.5 space-y-2 flex-1 min-h-[340px] max-h-[650px] overflow-y-auto bg-[#FAF8F5]/50">
                  {dayList.length === 0 ? (
                    <div className="text-[11px] text-[#8A8375] italic text-center py-10">
                      Fără programări
                    </div>
                  ) : (
                    dayList.map((c) => {
                      const editable = canEditFn(c);
                      const slot = getSlotForIso(c.dataProgramare);
                      const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, dayStr);

                      return (
                        <div
                          key={c.id}
                          className={`bg-white border rounded-md p-2 text-[11px] shadow-sm space-y-1 hover:border-[#3B5166] transition-all relative ${
                            conflict ? "border-[#B23A2E] bg-[#FFF8F8]" : "border-[#DAD4C6]"
                          }`}
                        >
                          {/* Slot time pill */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#3B5166] text-white">
                              ⏰ {slot || c.dataProgramare.slice(11, 16)}
                            </span>
                            <span
                              className="font-mono font-bold text-[11.5px] text-[#3B5166] cursor-pointer hover:underline"
                              onClick={() => onOpen(c)}
                            >
                              {c.numarDosar}
                            </span>
                          </div>

                          {/* Client & Car info */}
                          <div>
                            <div className="font-bold text-[#23282E] truncate" title={c.client}>
                              {c.client || "Client nespecificat"}
                            </div>
                            <div className="text-[10px] font-mono text-[#6B6558] flex items-center justify-between">
                              <span className="font-bold text-[#23282E]">{c.numarInmatriculare}</span>
                              <span className="truncate max-w-[80px]">{c.marcaModel}</span>
                            </div>
                          </div>

                          {/* Replacement Car if present */}
                          {c.masinaSchimb && (
                            <div
                              className={`text-[9.5px] font-bold p-1 rounded flex items-center justify-between ${
                                conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"
                              }`}
                            >
                              <span>🚗 {c.masinaSchimb}</span>
                              {conflict && <span>⚠️ Conflict!</span>}
                            </div>
                          )}

                          {/* Quick Slot Selector Pill Row */}
                          {editable && (
                            <div className="pt-1 border-t border-[#EFEAE1] flex flex-wrap gap-0.5">
                              {SLOTURI_ORARE.map((s) => {
                                const active = slot === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      const newIso = makeIsoFromSlot(c.dataProgramare, s);
                                      onPatch(c.id, { dataProgramare: newIso });
                                    }}
                                    className={`px-1 py-0.2 text-[8.5px] font-semibold rounded border ${
                                      active
                                        ? "bg-[#3B5166] text-white border-[#3B5166]"
                                        : "bg-white text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                                    }`}
                                  >
                                    {s.split(" - ")[0]}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Confirm Programat Action */}
                          {c.status === "piese_sosite" && (
                            <button
                              disabled={!editable}
                              onClick={() =>
                                onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })
                              }
                              className="w-full mt-1 py-1 rounded bg-[#3B5166] text-white text-[10px] font-bold hover:bg-[#2C3E4C] flex items-center justify-center gap-1 shadow-sm"
                            >
                              Confirmă Programat <ArrowRight size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Drawer Sidebar: Queue "De Programat" (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2">
              <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                <PackageCheck size={15} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
                {unassignedQueue.length}
              </span>
            </div>

            {unassignedQueue.length === 0 ? (
              <div className="text-[12px] text-[#8A8375] italic text-center py-12">
                Niciun dosar în așteptare pentru programare. 🎉
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {unassignedQueue.map((c) => {
                  const editable = canEditFn(c);
                  return (
                    <div
                      key={c.id}
                      className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-md p-2 text-[11.5px] space-y-1 hover:border-[#3B5166] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
                          onClick={() => onOpen(c)}
                        >
                          {c.numarDosar || "—"}
                        </span>
                        <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>
                          {c.tipAsigurare}
                        </Pill>
                      </div>

                      <div className="font-bold text-[#23282E]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[#6B6558]">{c.numarInmatriculare}</div>

                      {/* Quick Assign Bar */}
                      <div className="pt-1.5 mt-1 border-t border-[#DAD4C6]/60 space-y-1">
                        <div className="text-[10px] font-bold text-[#6B6558]">Programează pe:</div>
                        <div className="flex items-center gap-1">
                          <DatePickerInput
                            value={c.dataProgramare || ""}
                            withTime={true}
                            disabled={!editable}
                            placeholder="zi/luna/an, ore"
                            className="w-full text-[11px] border border-[#DAD4C6] rounded px-1.5 py-0.5 bg-white min-h-[26px]"
                            onChange={(val) => {
                              onPatch(c.id, {
                                dataProgramare: val,
                                status: "programat",
                                dataSchimbareStatus: nowISO(),
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate }) {
  const [viewMode, setViewMode] = useState("saptamanal"); // 'saptamanal' | 'lunar'
  const [capInput, setCapInput] = useState(capacitate);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => setCapInput(capacitate), [capacitate]);

  return (
    <div className="space-y-3">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg border border-[#DAD4C6] p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#6B6558]">Capacitate zilnică (mașini/zi):</span>
          <input type="number" min={1} className="w-16 border border-[#DAD4C6] rounded px-2 py-1 text-[12.5px] text-center font-bold" value={capInput} onChange={(e) => setCapInput(Number(e.target.value) || 1)} />
          <button onClick={() => onSetCapacitate(capInput)} className="px-3 py-1 rounded bg-[#3B5166] text-white text-[11.5px] font-semibold hover:bg-[#2C3E4C] shadow-sm">Salvează</button>
          <span className="text-[10.5px] text-[#8A8375]">valabilă pentru toată echipa</span>
        </div>

        <div className="flex items-center gap-1 bg-[#F5F2EA] p-1 rounded-md border border-[#DAD4C6]">
          <button
            onClick={() => setViewMode("saptamanal")}
            className={`px-3 py-1 rounded text-[11.5px] font-bold transition-colors ${
              viewMode === "saptamanal" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            Agendă Săptămânală
          </button>
          <button
            onClick={() => setViewMode("lunar")}
            className={`px-3 py-1 rounded text-[11.5px] font-bold transition-colors ${
              viewMode === "lunar" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            Calendar Lunar
          </button>
        </div>
      </div>

      {/* Selected View */}
      {viewMode === "saptamanal" ? (
        <AgendaSaptamanala claims={claims} capacitate={capacitate} canEditFn={canEditFn} onOpen={onOpen} onPatch={onPatch} />
      ) : (
        <CalendarLunar claims={claims} capacitate={capacitate} canEditFn={canEditFn} onOpen={onOpen} onPatch={onPatch} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />
      )}
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
// Brief zilnic — rezumatul dimineții: ce intră azi, ce iese azi, cine de sunat
// ---------------------------------------------------------------------------
function BriefZilnic({ claims, onOpen, pragRidicare, onSetPrag }) {
  const [pragInput, setPragInput] = useState(pragRidicare);
  useEffect(() => setPragInput(pragRidicare), [pragRidicare]);
  const todayStr = todayISO();

  const programariAzi = useMemo(() =>
    claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr)
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr && !c.ridicata),
    [claims, todayStr]);

  const neridicateVechi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && !c.ridicata && daysBetween(c.dataGataRidicare) >= pragRidicare)
      .sort((a, b) => daysBetween(b.dataGataRidicare) - daysBetween(a.dataGataRidicare)),
    [claims, pragRidicare]);

  const restante = useMemo(() =>
    claims.filter((c) => c.status !== "facturat" && daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3))
      .sort((a, b) => daysBetween(b.dataSchimbareStatus) - daysBetween(a.dataSchimbareStatus)),
    [claims]);

  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const azi = fmtDate(new Date());

  const Sectiune = ({ icon, titlu, tone, items, gol, renderItem }) => (
    <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden">
      <div className={`px-3 py-2 text-white text-[12.5px] font-bold flex items-center gap-1.5 ${tone}`}>{icon} {titlu} ({items.length})</div>
      {items.length === 0 ? (
        <div className="px-3 py-3 text-[12.5px] text-[#8A8375]">{gol}</div>
      ) : (
        <div className="divide-y divide-[#EFEAE1] max-h-56 overflow-y-auto">
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );

  const rand = (c, extra) => (
    <div key={c.id} onClick={() => onOpen(c)} className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[#FCFAF5]">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-[12.5px]">{c.numarDosar || "—"}</span>
          <span className="text-[12px] text-[#6B6558] truncate">{c.client}</span>
        </div>
        {c.telefonClient && <div className="text-[11px] text-[#8A8375] flex items-center gap-1"><Phone size={10} />{c.telefonClient}</div>}
      </div>
      {extra}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-[#23282E] rounded-lg p-4 text-white flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[15px] font-bold capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Rezumat zilnic</div>
          <div className="text-[12px] text-white/60 capitalize">{azi}</div>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-white/70">
          <span>Alertă neridicate după</span>
          <input type="number" min={1} className="w-14 border border-white/30 bg-white/10 rounded px-2 py-1 text-white text-center" value={pragInput} onChange={(e) => setPragInput(Number(e.target.value) || 1)} />
          <span>zile</span>
          <button onClick={() => onSetPrag(pragInput)} className="px-2 py-1 rounded bg-[#C98A2B] text-white font-semibold">Salvează</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Sectiune
          icon={<CalendarClock size={14} />} titlu="Programate azi" tone="bg-[#3B5166]"
          items={programariAzi} gol="Nicio programare azi."
          renderItem={(c) => rand(c, <span className="text-[11px] font-mono text-[#6B6558]">{c.dataProgramare.slice(11, 16)}</span>)}
        />
        <Sectiune
          icon={<PackageCheck size={14} />} titlu="Finalizate azi (gata de ridicare)" tone="bg-[#3E6B45]"
          items={gataAzi} gol="Nicio mașină finalizată azi încă."
          renderItem={(c) => rand(c, <Pill tone="amber">gata azi</Pill>)}
        />
        <Sectiune
          icon={<PackageCheck size={14} />} titlu="Gata, neridicate — de sunat" tone="bg-[#C98A2B]"
          items={neridicateVechi} gol="Nicio mașină uitată în curte."
          renderItem={(c) => rand(c, <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">{daysBetween(c.dataGataRidicare)}z</span>)}
        />
        <Sectiune
          icon={<AlertTriangle size={14} />} titlu="Dosare restante — de urmărit" tone="bg-[#B23A2E]"
          items={restante} gol="Niciun dosar restant."
          renderItem={(c) => rand(c, <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">{daysBetween(c.dataSchimbareStatus)}z</span>)}
        />
      </div>

      {blocate.length > 0 && (
        <Sectiune
          icon={<AlertOctagon size={14} />} titlu="Dosare blocate" tone="bg-[#23282E]"
          items={blocate} gol=""
          renderItem={(c) => rand(c, <span className="text-[11px] text-[#8A8375] max-w-[160px] truncate">{c.motivBlocare || "fără motiv notat"}</span>)}
        />
      )}
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
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState("flux");
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [onlyGataNeridicate, setOnlyGataNeridicate] = useState(false);
  const [modalClaim, setModalClaim] = useState(null);
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;
  const canEdit = (c) => Boolean(myId) && c.createdBy === myId;
  const showNotice = useCallback((message, type = "success") => setNotice({ message, type }), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) showNotice(error.message, "error");
    else setClaims((data || []).map(fromDb));
    setLoading(false);
  }, [showNotice]);

  useEffect(() => { if (session) loadAll(); }, [loadAll, session]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("setari").select("capacitate_zilnica, prag_ridicare_zile").eq("id", 1).maybeSingle();
      if (data?.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
      if (data?.prag_ridicare_zile) setPragRidicare(data.prag_ridicare_zile);
    })();
  }, [session]);

  const saveCapacitate = async (n) => {
    setCapacitateZilnica(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, capacitate_zilnica: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragRidicare = async (n) => {
    setPragRidicare(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_ridicare_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const handleSave = async (claim) => {
    setSaving(true);
    const isNewClaim = !claims.some((c) => c.id === claim.id);
    const payload = toDb({
      ...claim,
      createdBy: isNewClaim ? myId : (claim.createdBy || myId),
      createdByEmail: isNewClaim ? myEmail : (claim.createdByEmail || myEmail),
      updatedByEmail: myEmail,
    });
    const { error } = await supabase.from("dosare").upsert(payload);
    setSaving(false);
    if (error) { showNotice(error.message, "error"); return; }
    setModalClaim(null);
    showNotice(isNewClaim ? "Dosarul a fost creat." : "Dosarul a fost salvat.");
    loadAll();
  };

  const handleDelete = async (id) => {
    const target = claims.find((c) => c.id === id);
    if (target && !canEdit(target)) { showNotice("Poți șterge doar dosarele create de tine.", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("dosare").delete().eq("id", id);
    setSaving(false);
    if (error) { showNotice(error.message, "error"); return; }
    setModalClaim(null);
    showNotice("Dosarul a fost șters.");
    loadAll();
  };

  const handleMoveToStatus = async (claim, newStatusKey) => {
    if (!canEdit(claim)) { showNotice("Poți muta doar dosarele create de tine.", "error"); return; }
    if (claim.status === newStatusKey) return;
    const updated = { ...claim, status: newStatusKey, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { showNotice(error.message, "error"); loadAll(); }
  };

  const handleMove = async (claim, dir) => {
    if (!canEdit(claim)) { showNotice("Poți muta doar dosarele create de tine.", "error"); return; }
    const idx = STATUSES.findIndex((s) => s.key === claim.status);
    if (idx < 0) {
      showNotice("Dosarul are un status necunoscut și nu poate fi mutat automat.", "error");
      return;
    }
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    const updated = { ...claim, status: STATUSES[nextIdx].key, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { showNotice(error.message, "error"); loadAll(); }
  };

  const openNew = (status = "primit") => setModalClaim(emptyClaim(status));
  const openExisting = (claim) => setModalClaim(claim);

  const duplicateClaim = (source) => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: source.numarInmatriculare,
      vin: source.vin,
      marcaModel: source.marcaModel,
      client: source.client,
      telefonClient: source.telefonClient,
      tipAsigurare: source.tipAsigurare,
      asigurator: source.asigurator,
    };
    showNotice("Date duplicate — completează numărul de dosar nou și verifică restul.");
    setModalClaim(dup);
  };

  const patchClaim = async (id, patch) => {
    const current = claims.find((c) => c.id === id);
    if (!current) return;
    if (!canEdit(current)) { showNotice("Poți edita programarea doar la dosarele create de tine.", "error"); return; }
    // Auto-mutare în „Programat" când se setează o dată de programare
    let effectivePatch = { ...patch };
    if (patch.dataProgramare && current.status === "piese_sosite") {
      effectivePatch = { ...effectivePatch, status: "programat", dataSchimbareStatus: nowISO() };
      showNotice('Dosar mutat automat în „Programat".', "success");
    }
    const updated = { ...current, ...effectivePatch, dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c))); // optimist
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { showNotice(error.message, "error"); loadAll(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (onlyAlerts && daysBetween(c.dataSchimbareStatus) < (c.termenAlertaZile || 3)) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (onlyGataNeridicate && !(c.gataDeRidicare && !c.ridicata)) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });
  }, [claims, search, filterTip, filterStatus, onlyAlerts, onlyBlocked, onlyGataNeridicate]);

  const alertCount = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)).length, [claims]);
  const blockedCount = useMemo(() => claims.filter((c) => c.blocat).length, [claims]);
  const gataNeridicateCount = useMemo(() => claims.filter((c) => c.gataDeRidicare && !c.ridicata && daysBetween(c.dataGataRidicare) >= pragRidicare).length, [claims, pragRidicare]);

  const exportExcel = () => {
    const rows = claims.map((c) => ({
      "Nr. dosar": c.numarDosar, "Tip": c.tipAsigurare, "Asigurător": c.asigurator, "Client": c.client,
      "Nr. înmatriculare": c.numarInmatriculare, "VIN": c.vin, "Marcă/Model": c.marcaModel,
      "Status": getStatusDefinition(c.status).label, "Data deschiderii": fmtDate(c.dataDeschiderii),
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
    <div className="h-screen flex flex-col overflow-hidden bg-[#EFEAE1]">
      <Notification notice={notice} onClose={() => setNotice(null)} />
      <div className="bg-[#23282E] px-4 py-3 shrink-0 z-30">
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
              <button onClick={() => setOnlyAlerts((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyAlerts ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {alertCount} depășite
              </button>
            )}
            {blockedCount > 0 && (
              <button onClick={() => setOnlyBlocked((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyBlocked ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {blockedCount} blocate
              </button>
            )}
            {gataNeridicateCount > 0 && (
              <button onClick={() => setOnlyGataNeridicate((v) => !v)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[12px] font-semibold ${onlyGataNeridicate ? "bg-[#C98A2B] text-white" : "bg-[#C98A2B]/20 text-[#F3D9A8]"}`}>
                <PackageCheck size={13} /> {gataNeridicateCount} neridicate
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/25 bg-black/20 p-1">
              {[
                { id: "flux", label: "Flux Operațional", icon: Layers },
                { id: "brief", label: "Brief", icon: Sunrise },
                { id: "kanban", label: "Kanban", icon: LayoutGrid },
                { id: "list", label: "Listă", icon: List },
                { id: "dashboard", label: "Statistici", icon: BarChart3 },
                { id: "programator", label: "Calendar", icon: CalendarClock },
                { id: "rapoarte", label: "Financiar", icon: Wallet },
              ].map(({ id, label, icon: Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                      active
                        ? "bg-[#C98A2B] text-white shadow-sm font-bold"
                        : "text-white/80 hover:text-white hover:bg-white/15"
                    }`}
                    title={label}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                    <span className="hidden md:inline">{label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 rounded border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/10"><Download size={14} /> Excel</button>
            <button onClick={() => openNew()} className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#C98A2B] text-white text-[12.5px] font-semibold hover:bg-[#B37A22]"><Plus size={14} /> Dosar nou</button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-white border-b border-[#DAD4C6] flex flex-wrap items-center gap-2 shrink-0 z-20">
        <div className="relative w-full sm:w-[210px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8A8375]" />
          <input className="w-full pl-7 pr-2 py-1.5 rounded border border-[#DAD4C6] text-[13px]" placeholder="Caută dosar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="in max-w-[110px]" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
          <option value="toate">Toate tipurile</option><option value="CASCO">CASCO</option><option value="RCA">RCA</option>
        </select>
        <select className="in max-w-[200px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="toate">Toate statusurile</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
        </select>
      </div>

      <div className={`flex-1 min-h-0 p-4 ${view === "kanban" || view === "flux" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă dosarele...</div>
        ) : view === "flux" ? (
          <TablouPeFaze claims={filtered} onOpen={openExisting} onMoveToStatus={handleMoveToStatus} onAddInStatus={openNew} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} />
        ) : view === "brief" ? (
          <BriefZilnic claims={claims} onOpen={openExisting} pragRidicare={pragRidicare} onSetPrag={savePragRidicare} />
        ) : view === "kanban" ? (
          <KanbanBoard claims={filtered} onOpen={openExisting} onMove={handleMove} onMoveToStatus={handleMoveToStatus} onAddInStatus={openNew} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} />
        ) : view === "list" ? (
          <ClaimTable claims={filtered} onOpen={openExisting} canEditFn={canEdit} />
        ) : view === "dashboard" ? (
          <Dashboard claims={filtered} onOpen={openExisting} pragRidicare={pragRidicare} />
        ) : view === "programator" ? (
          <Programator claims={filtered} onOpen={openExisting} onPatch={patchClaim} canEditFn={canEdit} capacitate={capacitateZilnica} onSetCapacitate={saveCapacitate} />
        ) : (
          <Rapoarte claims={filtered} />
        )}
      </div>

      {modalClaim && <ClaimModal claim={modalClaim} onClose={() => setModalClaim(null)} onSave={handleSave} onDelete={handleDelete} readOnly={claims.some((claim) => claim.id === modalClaim.id) && !canEdit(modalClaim)} allClaims={claims} onJumpTo={(c) => setModalClaim(c)} onNotify={showNotice} />}
    </div>
  );
}
