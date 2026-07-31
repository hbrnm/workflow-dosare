import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, FileDown, Copy, X, ShieldCheck, History, Loader2, Car, Phone, MessageCircle,
  Clock, AlertOctagon, Wrench, Paintbrush, ImageIcon, Upload, Trash2, Save, MessageSquare, Plus,
  FolderOpen, PackageCheck, CheckCircle2
} from "lucide-react";
import {
  STATUSES, INSURERS, getStatusDefinition,
  MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR
} from "../../constants/config";
import { fmtDate, fmtDateTime, daysBetween, nowISO, telLink, waLink, uid, fmtProgramare } from "../../utils/dateUtils";
import {
  emptyClaim, sanitizeClaim, normalizedText, isValidPhone, storagePath, refreshStorageUrls, formatIstoricValoare, CAMP_LABELS
} from "../../utils/claimUtils";
import {
  generateazaPDF, generateazaProcesVerbalMasinaSchimb, generateazaFisaIntrareService
} from "../../utils/pdfGenerator";
import { supabase } from "../../supabaseClient";
import DatePickerInput from "../common/DatePickerInput";
import StageBar from "../common/StageBar";
import ClaimTimeline from "../common/ClaimTimeline";
import { SLOTURI_ORARE, getSlotForIso, makeIsoFromSlot } from "../views/Programator";

function Field({ label, children, full }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="block text-[10px] font-semibold text-[#6B6558] mb-0">{label}</span>
      {children}
    </label>
  );
}

const MONTH_NAMES_RO = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES_RO = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

function InlineMiniCalendar({ value, onChange, status }) {
  const parseVal = (v) => {
    if (!v) return { dateStr: "", timeStr: "08:00" };
    const s = String(v);
    if (s.includes("T")) {
      const [d, t] = s.split("T");
      return { dateStr: d, timeStr: t ? t.slice(0, 5) : "08:00" };
    }
    return { dateStr: s, timeStr: "08:00" };
  };

  const { dateStr: selectedDateStr, timeStr: selectedTime } = parseVal(value);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const initDate = selectedDateStr ? new Date(selectedDateStr) : today;
  const [viewYear, setViewYear] = React.useState(isNaN(initDate.getTime()) ? today.getFullYear() : initDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(isNaN(initDate.getTime()) ? today.getMonth() : initDate.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const days = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, current: false, year: viewMonth === 0 ? viewYear - 1 : viewYear, month: viewMonth === 0 ? 11 : viewMonth - 1 });
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push({ day: i, current: true, year: viewYear, month: viewMonth });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false, year: viewMonth === 11 ? viewYear + 1 : viewYear, month: viewMonth === 11 ? 0 : viewMonth + 1 });
  }

  const handleSelectDay = (year, month, day) => {
    const dateS = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(`${dateS}T${selectedTime || "08:00"}`);
  };

  const handleTimeChange = (newTime) => {
    const d = selectedDateStr || todayStr;
    onChange(`${d}T${newTime}`);
  };

  return (
    <div className="flex-1 min-w-0 border border-[#DAD4C6] rounded-md bg-white overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-[#3B5166] text-white px-2 py-0.5">
        <button type="button" onClick={prevMonth} className="p-0.5 rounded hover:bg-white/20 transition-colors">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[10.5px] font-bold">{MONTH_NAMES_RO[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="p-0.5 rounded hover:bg-white/20 transition-colors">
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 text-center bg-[#FAF8F5] border-b border-[#EFEAE1]">
        {DAY_NAMES_RO.map((d) => (
          <span key={d} className="text-[8px] font-bold text-[#8A8375] py-0.5">{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 text-center px-0.5 pt-0.5 pb-0.5 gap-y-0">
        {days.map((item, idx) => {
          const itemStr = `${item.year}-${String(item.month + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
          const isSelected = selectedDateStr === itemStr;
          const isToday = itemStr === todayStr;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDay(item.year, item.month, item.day)}
              className={`h-[15px] w-full rounded text-[9px] font-medium transition-colors mx-auto ${
                isSelected
                  ? "bg-[#3B5166] text-white font-bold"
                  : isToday
                  ? "border border-[#C98A2B] text-[#C98A2B] font-bold"
                  : item.current
                  ? "hover:bg-[#EFEAE1] text-[#23282E]"
                  : "text-[#C2BCB0] hover:bg-[#F5F2EA]"
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Time selector */}
      <div className="border-t border-[#EFEAE1] px-1.5 py-0.5 flex items-center gap-1">
        <Clock size={10} className="text-[#6B6558] shrink-0" />
        <select
          className="flex-1 border border-[#DAD4C6] rounded px-1 py-0 text-[9.5px] bg-[#FAF8F5] font-mono"
          value={selectedTime.split(":")[0] || "08"}
          onChange={(e) => handleTimeChange(`${e.target.value}:${selectedTime.split(":")[1] || "00"}`)}
        >
          {Array.from({ length: 24 }).map((_, h) => {
            const hh = String(h).padStart(2, "0");
            return <option key={hh} value={hh}>{hh}</option>;
          })}
        </select>
        <span className="text-[10px] font-bold text-[#8A8375]">:</span>
        <select
          className="flex-1 border border-[#DAD4C6] rounded px-1 py-0 text-[9.5px] bg-[#FAF8F5] font-mono"
          value={["00", "30"].includes(selectedTime.split(":")[1]) ? selectedTime.split(":")[1] : "00"}
          onChange={(e) => handleTimeChange(`${selectedTime.split(":")[0] || "08"}:${e.target.value}`)}
        >
          <option value="00">:00</option>
          <option value="30">:30</option>
        </select>
        {selectedDateStr && (
          <span className="text-[9px] text-[#3B5166] font-bold truncate ml-0.5">
            {String(selectedDateStr.split("-")[2]).padStart(2, "0")}/{String(selectedDateStr.split("-")[1]).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Status note */}
      {value && status === "piese_sosite" && (
        <div className="px-1.5 pb-0.5 text-[9px] text-[#C98A2B] font-semibold">→ va fi mutat în „Programat"</div>
      )}
    </div>
  );
}

export default function ClaimModal({ claim, onClose, onSave, onDelete, readOnly, allClaims, onJumpTo, onNotify }) {
  const safeClaim = useMemo(() => sanitizeClaim(claim), [claim]);
  const [form, setForm] = useState(safeClaim);
  const [activeTab, setActiveTab] = useState("date"); // "date", "service", "media", "note"
  const [noteText, setNoteText] = useState("");
  const [istoric, setIstoric] = useState([]);
  const [loadingIstoric, setLoadingIstoric] = useState(false);
  const [uploadingPoze, setUploadingPoze] = useState(false);
  const [uploadingDocumente, setUploadingDocumente] = useState(false);
  const isNew = !safeClaim.numarDosar && (safeClaim.note || []).length === 0 && (safeClaim.documente || []).length === 0;

  useEffect(() => setForm(sanitizeClaim(claim)), [claim]);

  useEffect(() => {
    let cancelled = false;

    const loadStorageUrls = async () => {
      if (!claim?.id) return;

      const [poze, documente] = await Promise.all([
        refreshStorageUrls(claim.poze || [], "poze-dosare", supabase),
        refreshStorageUrls(claim.documente || [], "documente-dosare", supabase),
      ]);

      if (!cancelled) {
        setForm((current) => ({ ...current, poze, documente }));
      }
    };

    loadStorageUrls();
    return () => { cancelled = true; };
  }, [claim]);

  useEffect(() => {
    if (isNew || !claim?.id) { setIstoric([]); return; }
    setLoadingIstoric(true);
    supabase.from("istoric_dosar").select("*").eq("dosar_id", claim.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setIstoric(data || []))
      .finally(() => setLoadingIstoric(false));
  }, [claim?.id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...(f.manopera || {}), [dept]: val } }));
  const toggleGata = (checked) => setForm((f) => ({ ...f, gataDeRidicare: checked, dataGataRidicare: checked && !f.dataGataRidicare ? nowISO() : f.dataGataRidicare }));
  const toggleRidicata = (checked) => setForm((f) => ({ ...f, ridicata: checked, dataRidicare: checked && !f.dataRidicare ? nowISO() : f.dataRidicare }));

  const handleDuplicate = () => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: form.numarInmatriculare,
      vin: form.vin,
      marcaModel: form.marcaModel,
      client: form.client,
      telefonClient: form.telefonClient,
      tipAsigurare: form.tipAsigurare,
      asigurator: form.asigurator,
    };
    onNotify("Date duplicate — completează numărul de dosar nou și verifică restul.", "success");
    onJumpTo(dup);
  };

  const istoricClientVehicul = useMemo(() => {
    if (!allClaims) return [];
    const tel = (form.telefonClient || "").trim();
    const vin = (form.vin || "").trim().toUpperCase();
    if (!tel && !vin) return [];
    return allClaims.filter((c) => c.id !== claim.id && (
      (tel && (c.telefonClient || "").trim() === tel) || (vin && (c.vin || "").trim().toUpperCase() === vin)
    ));
  }, [allClaims, form.telefonClient, form.vin, claim?.id]);

  const handleSave = () => {
    const numarDosar = (form.numarDosar || "").trim();
    const numarInmatriculare = (form.numarInmatriculare || "").trim().toUpperCase();
    const vin = (form.vin || "").trim().toUpperCase();
    const telefonClient = (form.telefonClient || "").trim();

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

  const handleUploadPoze = async (fileList) => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const locMax = MAX_POZE_PER_DOSAR - form.poze.length;
    if (locMax <= 0) {
      onNotify(`Ai atins limita de ${MAX_POZE_PER_DOSAR} poze pentru acest dosar.`, "error");
      return;
    }

    const files = [];
    const respinse = [];
    for (const file of requested) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) { respinse.push(file.name); continue; }
      if (files.length >= locMax) break;
      files.push(file);
    }
    if (respinse.length) {
      onNotify(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify(`Doar ${locMax} poze au fost încărcate — limita e ${MAX_POZE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) return;

    setUploadingPoze(true);
    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const path = storagePath(claimId, file);
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

  const handleUploadDocumente = async (fileList) => {
    const requested = Array.from(fileList || []);
    if (requested.length === 0) return;

    const locMax = MAX_DOCUMENTE_PER_DOSAR - form.documente.length;
    if (locMax <= 0) {
      onNotify(`Ai atins limita de ${MAX_DOCUMENTE_PER_DOSAR} documente pentru acest dosar.`, "error");
      return;
    }

    const files = [];
    const respinse = [];
    for (const file of requested) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) { respinse.push(file.name); continue; }
      if (files.length >= locMax) break;
      files.push(file);
    }
    if (respinse.length) {
      onNotify(`${respinse.length} fișier(e) peste ${MAX_UPLOAD_SIZE_MB}MB au fost ignorate: ${respinse.join(", ")}`, "error");
    }
    if (requested.length > locMax && files.length === locMax) {
      onNotify(`Doar ${locMax} documente au fost încărcate — limita e ${MAX_DOCUMENTE_PER_DOSAR}/dosar.`, "error");
    }
    if (files.length === 0) return;

    setUploadingDocumente(true);
    const noi = [];
    const claimId = form.id || claim?.id || uid();
    for (const file of files) {
      const path = storagePath(claimId, file, "documente");
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="bg-[#FCFAF5] w-full max-w-4xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#23282E] text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[#C98A2B]" />
            <span className="font-bold text-[13px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {isNew ? "Creare dosar nouă daună" : `Dosar ${form.numarDosar || "(fără nr.)"}`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isNew && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => generateazaPDF(form, istoric)}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold border border-white/20 rounded-md px-2.5 py-1 hover:bg-white/10 transition-colors"
                  title="Descarcă Proces-Verbal General & Istoric"
                >
                  <FileDown size={12} /><span className="hidden sm:inline"> PDF Dosar</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateazaFisaIntrareService(form)}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold border border-white/20 rounded-md px-2.5 py-1 hover:bg-white/10 transition-colors"
                  title="Descarcă Fișă de Intrare Service & Ordin de Lucru"
                >
                  <FileDown size={12} /><span className="hidden sm:inline"> Fișă Service</span>
                </button>
                {form.masinaSchimb && (
                  <button
                    type="button"
                    onClick={() => generateazaProcesVerbalMasinaSchimb(form)}
                    className="flex items-center gap-1 text-[#F3D9A8] hover:text-white text-[11px] font-bold border border-[#C98A2B]/40 rounded-md px-2.5 py-1 bg-[#C98A2B]/20 hover:bg-[#C98A2B]/40 transition-colors"
                    title="Descarcă Proces-Verbal Predare/Primire Mașină la Schimb"
                  >
                    <Car size={12} /><span className="hidden sm:inline"> PV Auto Schimb</span>
                  </button>
                )}
              </div>
            )}
            {!isNew && (
              <button onClick={handleDuplicate} className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold border border-white/20 rounded-md px-2 py-1 hover:bg-white/10">
                <Copy size={12} /><span className="hidden sm:inline"> Duplică</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="px-3 py-1 bg-[#EFEAE1] text-[#6B6558] text-[11px] flex items-center gap-1 shrink-0 border-b border-[#DAD4C6]">
            <ShieldCheck size={12} /> Doar vizualizare — creat de {form.createdByEmail || "alt coleg"}.
          </div>
        )}

        {/* Compact Stepper Row */}
        {!isNew && (
          <div className="px-3 py-1 border-b border-[#DAD4C6] bg-white shrink-0">
            <ClaimTimeline
              currentStatus={form.status}
              dataSchimbareStatus={form.dataSchimbareStatus}
              istoric={istoric}
              loading={loadingIstoric}
            />
          </div>
        )}

        {/* Modal Internal Sub-Tabs Navigation Bar */}
        <div className="flex items-center gap-0.5 px-3 py-1 bg-[#FAF8F5] border-b border-[#DAD4C6] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("date")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              activeTab === "date" ? "bg-[#3B5166] text-white font-bold" : "text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            <ShieldCheck size={12} /> Date Principale
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("service")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              activeTab === "service" ? "bg-[#3B5166] text-white font-bold" : "text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            <Wrench size={12} /> Service &amp; Reparație
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              activeTab === "media" ? "bg-[#3B5166] text-white font-bold" : "text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            <ImageIcon size={12} /> Poze &amp; Documente
            {(form.poze.length > 0 || form.documente.length > 0) && (
              <span className="ml-0.5 px-1 text-[9.5px] rounded-full bg-white/20 font-bold">
                {form.poze.length + form.documente.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("note")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
              activeTab === "note" ? "bg-[#3B5166] text-white font-bold" : "text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            <MessageSquare size={12} /> Note &amp; Istoric
            {form.note.length > 0 && (
              <span className="ml-0.5 px-1 text-[9.5px] rounded-full bg-white/20 font-bold">
                {form.note.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Tab Content Body — no scroll needed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 bg-white">
          <fieldset disabled={readOnly} className="border-0 m-0 p-0 min-w-0">
            
            {/* TAB 1: DATE PRINCIPALE */}
            {activeTab === "date" && (
              <div className="grid md:grid-cols-2 gap-3">
                {/* Stânga: Identificare & Status */}
                <div className="space-y-2">
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-2 space-y-1.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center gap-1 border-b border-[#DAD4C6] pb-1">
                      <ShieldCheck size={12} /> Identificare &amp; Asigurare
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Nr. dosar daună">
                        <input className="in font-bold text-[#23282E]" value={form.numarDosar} onChange={(e) => set("numarDosar", e.target.value)} placeholder="ex: 2026-00451" required />
                      </Field>
                      <Field label="Tip asigurare">
                        <select className="in font-bold" value={form.tipAsigurare} onChange={(e) => set("tipAsigurare", e.target.value)}>
                          <option value="CASCO">CASCO</option>
                          <option value="RCA">RCA</option>
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

                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-2 space-y-1.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center gap-1 border-b border-[#DAD4C6] pb-1">
                      <Clock size={12} /> Tracking Status &amp; Programare
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Status dosar">
                        <select className="in font-bold text-[#23282E]" value={form.status} onChange={(e) => set("status", e.target.value)}>
                          {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Alertă după (zile în etapă)">
                        <input type="number" min={1} className="in font-bold text-center" value={form.termenAlertaZile} onChange={(e) => set("termenAlertaZile", Number(e.target.value) || 1)} />
                      </Field>
                      <Field label="Data deschiderii">
                        <DatePickerInput value={form.dataDeschiderii} onChange={(v) => set("dataDeschiderii", v)} withTime={false} placeholder="zi/luna/an" />
                      </Field>
                      <Field label="Ultima actualizare">
                        <div className="in bg-[#EFEAE1] text-[#6B6558] font-mono text-[11px] flex items-center">{fmtDateTime(form.dataUltimeiActualizari)}</div>
                      </Field>

                      <Field label="Programare service (Intrare)" full>
                        <div className="flex gap-2 items-start">
                          {/* Scrollable slot list */}
                          <div className="flex flex-col gap-px h-[130px] overflow-y-auto border border-[#DAD4C6] rounded-md p-0.5 bg-[#FAF8F5] shrink-0 w-[112px] scrollbar-thin">
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
                                  className={`w-full px-1 py-px rounded text-[9.5px] font-semibold border text-left transition-colors ${
                                    active ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-white text-[#23282E] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>

                          {/* Inline mini calendar */}
                          <InlineMiniCalendar
                            value={form.dataProgramare}
                            onChange={(v) => set("dataProgramare", v)}
                            status={form.status}
                          />
                        </div>
                      </Field>
                    </div>

                    <label className={`flex items-center gap-1.5 text-[11px] cursor-pointer px-2 py-1 rounded border transition-all ${form.blocat ? "bg-[#B23A2E]/10 border-[#B23A2E] text-[#8C2E2E] font-bold" : "border-[#DAD4C6] text-[#23282E]"}`}>
                      <input type="checkbox" checked={form.blocat} onChange={(e) => set("blocat", e.target.checked)} /> Dosar blocat
                    </label>
                    {form.blocat && (
                      <div className="px-2 py-1 bg-[#B23A2E] text-white rounded text-[11px] flex items-center gap-1.5">
                        <AlertOctagon size={12} />
                        <span className="font-semibold">Motiv:</span>
                        <input className="flex-1 bg-white/10 border border-white/20 rounded px-1.5 py-px text-white text-[11px] placeholder:text-white/60 focus:outline-hidden" placeholder="Motiv blocare..." value={form.motivBlocare || ""} onChange={(e) => set("motivBlocare", e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Dreapta: Client & Vehicul */}
                <div className="space-y-2">
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-2 space-y-1.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center gap-1 border-b border-[#DAD4C6] pb-1">
                      <Car size={12} /> Informații Client &amp; Vehicul
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Nume / Denumire asigurat" full>
                        <input className="in font-semibold text-[#23282E]" value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="Nume complet client" />
                      </Field>
                      <Field label="Telefon client" full>
                        <div className="flex items-center gap-1">
                          <input className="in font-mono" type="tel" inputMode="tel" placeholder="07xx xxx xxx" value={form.telefonClient} onChange={(e) => set("telefonClient", e.target.value)} />
                          {form.telefonClient && (
                            <>
                              <a href={telLink(form.telefonClient)} title="Sună client" className="shrink-0 p-1.5 rounded bg-white border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"><Phone size={12} /></a>
                              <a href={waLink(form.telefonClient, `Buna ziua! Va contactam de la service referitor la dosarul dvs. ${form.numarDosar || ""} (${form.numarInmatriculare || ""}).`)} target="_blank" rel="noreferrer" title="Mesaj WhatsApp" className="shrink-0 p-1.5 rounded bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors"><MessageCircle size={12} /></a>
                            </>
                          )}
                        </div>
                      </Field>
                      <Field label="Nr. înmatriculare">
                        <input className="in font-mono font-bold text-[#23282E] uppercase" value={form.numarInmatriculare} onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())} placeholder="ex: B111AAA" required />
                      </Field>
                      <Field label="Serie șasiu (VIN)">
                        <input className="in font-mono text-[11.5px] uppercase" value={form.vin} onChange={(e) => set("vin", e.target.value.toUpperCase())} maxLength={17} placeholder="17 caractere VIN" />
                      </Field>
                      <Field label="Marcă / Model autovehicul" full>
                        <input className="in" value={form.marcaModel} onChange={(e) => set("marcaModel", e.target.value)} placeholder="ex: Volkswagen Passat 2.0 TDI" />
                      </Field>
                    </div>

                    {istoricClientVehicul.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#DAD4C6]/60">
                        <span className="text-[9.5px] font-bold text-[#2C4160] flex items-center gap-1 shrink-0">
                          <History size={10} /> {istoricClientVehicul.length} dosar(e) anterioare:
                        </span>
                        {istoricClientVehicul.slice(0, 4).map((c) => {
                          const s = getStatusDefinition(c.status);
                          return (
                            <button key={c.id} type="button" onClick={() => onJumpTo && onJumpTo(c)}
                              className="text-[9.5px] text-[#2C4160] hover:underline font-semibold bg-[#ECF1F7] border border-[#3B5166]/20 rounded px-1.5 py-px truncate max-w-[160px]">
                              {c.numarDosar || "—"} · {String(s.num).padStart(2,"0")}. {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SERVICE & REPARAȚIE */}
            {activeTab === "service" && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                    <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <span className="flex items-center gap-1.5"><Wrench size={14} /> Stare Fizică &amp; Lucrări</span>
                      {!isNew && (
                        <button
                          type="button"
                          onClick={() => generateazaFisaIntrareService(form)}
                          className="text-[11px] font-semibold text-[#3B5166] hover:underline flex items-center gap-1"
                        >
                          <FileDown size={12} /> Fișă service
                        </button>
                      )}
                    </div>

                    {/* Interactive 3-Step Physical Status Stepper */}
                    <div className="bg-white border border-[#DAD4C6] rounded-xl p-2 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-1 text-[11.5px] shadow-2xs">
                      {/* Step 1: Adusă fizic */}
                      <button
                        type="button"
                        onClick={() => set("adusaFizic", !form.adusaFizic)}
                        className={`w-full sm:flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all text-center ${
                          form.adusaFizic
                            ? "bg-[#3B5166] text-white border-[#3B5166] font-bold shadow-xs"
                            : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <Car size={13} /> 1. Adusă în service
                        </span>
                        <span className="text-[10px] opacity-85 mt-0.5 font-medium">
                          {form.adusaFizic ? "Fizic în curte" : "Neintrată încă"}
                        </span>
                      </button>

                      <span className="text-[#8A8375] font-bold text-[11px] rotate-90 sm:rotate-0">➔</span>

                      {/* Step 2: Gata de ridicare */}
                      <button
                        type="button"
                        onClick={() => toggleGata(!form.gataDeRidicare)}
                        className={`w-full sm:flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all text-center ${
                          form.gataDeRidicare
                            ? "bg-[#C98A2B] text-white border-[#C98A2B] font-bold shadow-xs"
                            : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <PackageCheck size={13} /> 2. Gata de ridicare
                        </span>
                        <span className="text-[10px] opacity-85 mt-0.5 font-medium">
                          {form.gataDeRidicare ? `${form.dataGataRidicare ? daysBetween(form.dataGataRidicare) : 0}z în curte` : "În reparație"}
                        </span>
                      </button>

                      <span className="text-[#8A8375] font-bold text-[11px] rotate-90 sm:rotate-0">➔</span>

                      {/* Step 3: Ridicată de client */}
                      <button
                        type="button"
                        onClick={() => toggleRidicata(!form.ridicata)}
                        disabled={!form.gataDeRidicare && !form.ridicata}
                        className={`w-full sm:flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all text-center ${
                          form.ridicata
                            ? "bg-[#3E6B45] text-white border-[#3E6B45] font-bold shadow-xs"
                            : !form.gataDeRidicare
                            ? "opacity-50 cursor-not-allowed bg-[#FAF8F5] text-[#8A8375] border-[#DAD4C6]"
                            : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-bold">
                          <CheckCircle2 size={13} /> 3. Predată client
                        </span>
                        <span className="text-[10px] opacity-85 mt-0.5 font-medium">
                          {form.ridicata && form.dataRidicare ? fmtDate(form.dataRidicare) : "Nepredată"}
                        </span>
                      </button>
                    </div>

                    <Field label="Ce este de reparat (Descriere operațiuni)" full>
                      <textarea className="in min-h-[75px]" placeholder="Ex: aripă dreapta față + ușă — îndreptat și vopsit; sau: doar înlocuit parbriz" value={form.ceEsteDeReparat} onChange={(e) => set("ceEsteDeReparat", e.target.value)} />
                    </Field>
                  </div>

                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                    <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <span className="flex items-center gap-1.5"><Car size={14} /> Mașină la Schimb</span>
                      {!isNew && form.masinaSchimb && (
                        <button
                          type="button"
                          onClick={() => generateazaProcesVerbalMasinaSchimb(form)}
                          className="text-[11px] font-semibold text-[#7A5316] hover:underline flex items-center gap-1"
                        >
                          <FileDown size={12} /> PV Auto Schimb
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <Field label="Mașină la schimb (nr.)">
                        <input className="in font-semibold" placeholder="lasă gol dacă nu" value={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.value)} />
                      </Field>
                      <Field label="Data dării la schimb">
                        <DatePickerInput value={form.dataDariiLaSchimb} onChange={(v) => set("dataDariiLaSchimb", v)} withTime={false} placeholder="zi/luna/an" />
                      </Field>
                      <Field label="Zile chirie Audatex">
                        <input type="number" min={0} className="in font-bold text-center" value={form.zileChirieAudatex} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} />
                      </Field>
                    </div>

                    {form.masinaSchimb && form.dataDariiLaSchimb && (
                      <div className="mt-2 text-[11.5px] font-semibold flex items-center justify-between px-3 py-1.5 bg-white border border-[#DAD4C6] rounded-lg">
                        <span className="text-[#6B6558]">Zile utilizate mașină la schimb:</span>
                        <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                          form.zileChirieAudatex > 0 && daysBetween(form.dataDariiLaSchimb) > form.zileChirieAudatex
                            ? "bg-[#B23A2E] text-white"
                            : "bg-[#3E6B45]/10 text-[#3E6B45]"
                        }`}>
                          {daysBetween(form.dataDariiLaSchimb)}z {form.zileChirieAudatex > 0 ? `/ ${form.zileChirieAudatex}z Audatex` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                    <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center gap-1.5 border-b border-[#DAD4C6] pb-1.5">
                      <Paintbrush size={14} /> Manoperă Facturată pe Etape
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <StageBar label="Tinichigerie" icon={<Wrench size={13} className="text-[#3B5166]" />} data={form.manopera?.tinichigerie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }} onChange={(v) => setStage("tinichigerie", v)} />
                      <StageBar label="Vopsitorie" icon={<Paintbrush size={13} className="text-[#7A4A9B]" />} data={form.manopera?.vopsitorie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }} onChange={(v) => setStage("vopsitorie", v)} />
                    </div>
                  </div>

                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                    <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                      <span className="flex items-center gap-1.5">💰 Decontare Piese &amp; Marjă Estimată</span>
                      {((Number(form.valoarePieseAudatex) || 0) > 0 || (Number(form.valoareAchizitiePiese) || 0) > 0) && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          ((Number(form.valoarePieseAudatex) || 0) - (Number(form.valoareAchizitiePiese) || 0)) >= 0
                            ? "bg-[#3E6B45]/15 text-[#3E6B45]"
                            : "bg-[#B23A2E]/15 text-[#B23A2E]"
                        }`}>
                          Marjă: {((Number(form.valoarePieseAudatex) || 0) - (Number(form.valoareAchizitiePiese) || 0)).toLocaleString("ro-RO")} lei
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="border border-[#DAD4C6] rounded-lg p-3 bg-white space-y-1">
                        <div className="text-[11.5px] font-bold text-[#23282E]">Valoare piese Audatex</div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={0} className="in font-mono font-bold text-[#23282E]" value={form.valoarePieseAudatex} onChange={(e) => set("valoarePieseAudatex", Number(e.target.value) || 0)} />
                          <span className="text-[11px] text-[#8A8375] font-bold">lei</span>
                        </div>
                      </div>
                      <div className="border border-[#DAD4C6] rounded-lg p-3 bg-white space-y-1">
                        <div className="text-[11.5px] font-bold text-[#23282E]">Achiziție piese service</div>
                        <div className="flex items-center gap-1.5">
                          <input type="number" min={0} className="in font-mono font-bold text-[#23282E]" value={form.valoareAchizitiePiese} onChange={(e) => set("valoareAchizitiePiese", Number(e.target.value) || 0)} />
                          <span className="text-[11px] text-[#8A8375] font-bold">lei</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: POZE & DOCUMENTE */}
            {activeTab === "media" && (
              <div className="grid md:grid-cols-2 gap-5">
                {/* Poze */}
                <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3 flex flex-col">
                  <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                    <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Galerie Poze Dosar ({form.poze.length})</span>
                  </div>

                  <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-3 text-[12px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-white border-[#C98A2B]/40 text-[#7A5316] font-semibold"}`}>
                    {uploadingPoze ? <><Loader2 size={15} className="animate-spin" /> Se încarcă pozele...</> : <><Upload size={15} /> Încărcare poze noi</>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files)} />
                  </label>

                  {form.poze.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
                      {form.poze.map((p) => (
                        <div key={p.id} className="relative group rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                          <a href={p.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                            <img src={p.url} alt={p.nume} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </a>
                          <button type="button" onClick={() => removePoza(p)} className="absolute top-1 right-1 bg-black/70 hover:bg-[#B23A2E] text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#8A8375] italic p-6 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                      Nicio fotografie adăugată pentru acest dosar.
                    </div>
                  )}
                </div>

                {/* Documente */}
                <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3 flex flex-col">
                  <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center justify-between border-b border-[#DAD4C6] pb-1.5">
                    <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documente &amp; Fișiere PDF ({form.documente.length})</span>
                  </div>

                  <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-3 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-white border-[#3B5166]/40 text-[#3B5166] font-semibold"}`}>
                    {uploadingDocumente ? <><Loader2 size={15} className="animate-spin" /> Se încarcă documentele...</> : <><Upload size={15} /> Încărcare documente</>}
                    <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
                  </label>

                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {form.documente.map((d) => (
                      <div key={d.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText size={14} className="text-[#3B5166] shrink-0" />
                          <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] font-semibold hover:underline truncate flex-1">{d.nume}</a>
                        </div>
                        <button type="button" onClick={() => removeDoc(d.id)} className="text-[#B23A2E] hover:opacity-70 ml-2 p-1"><Trash2 size={13} /></button>
                      </div>
                    ))}
                    {form.documente.length === 0 && (
                      <div className="text-[12px] text-[#8A8375] italic p-6 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                        Niciun document atașat.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: NOTE & ISTORIC */}
            {activeTab === "note" && (
              <div className="space-y-4">
                <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                  <div className="text-[11.5px] font-bold uppercase tracking-wide text-[#3B5166] flex items-center gap-1.5 border-b border-[#DAD4C6] pb-1.5">
                    <MessageSquare size={14} /> Note Interne Echipa ({form.note.length})
                  </div>

                  <div className="flex gap-2">
                    <input className="in flex-1" placeholder="Scrie o notă internă despre dosar..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
                    <button type="button" onClick={addNote} className="px-3.5 py-1.5 rounded-lg bg-[#3B5166] text-white font-semibold hover:bg-[#2C4160] transition-colors flex items-center gap-1 text-[12px]">
                      <Plus size={15} /> Adaugă Notă
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {form.note.map((n) => (
                      <div key={n.id} className="bg-white border border-[#DAD4C6] rounded-lg p-2.5 text-[12px]">
                        <div className="flex items-center justify-between text-[10.5px] text-[#8A8375] font-mono border-b border-[#EFEAE1] pb-1 mb-1">
                          <span>{fmtDateTime(n.data)}</span>
                          <button type="button" onClick={() => removeNote(n.id)} className="text-[#B23A2E] hover:opacity-70"><Trash2 size={12} /></button>
                        </div>
                        <div className="text-[#23282E] whitespace-pre-wrap font-sans">{n.text}</div>
                      </div>
                    ))}
                    {form.note.length === 0 && <div className="text-[12px] text-[#8A8375] italic p-4 text-center">Nicio notă înregistrată încă.</div>}
                  </div>
                </div>
              </div>
            )}

          </fieldset>
        </div>

        {/* Footer Actions Docked Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#DAD4C6] bg-white shrink-0">
          {readOnly ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (confirm("Ștergi definitiv acest dosar?")) onDelete(claim.id);
              }}
              className="flex items-center gap-1 text-[#B23A2E] text-[11.5px] font-semibold hover:opacity-70 px-2 py-1 rounded hover:bg-[#B23A2E]/5 transition-colors"
            >
              <Trash2 size={12} /> Șterge dosar
            </button>
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded border border-[#C7C0B0] text-[12px] font-semibold text-[#4A443A] hover:bg-[#EFEAE1] transition-colors"
            >
              {readOnly ? "Închide" : "Anulează"}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1 px-4 py-1 rounded bg-[#C98A2B] text-white text-[12px] font-bold hover:bg-[#B37A22] shadow-sm transition-colors"
              >
                <Save size={13} /> Salvează modificările
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
