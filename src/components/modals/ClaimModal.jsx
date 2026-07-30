import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, FileDown, Copy, X, ShieldCheck, History, Loader2, Car, Phone, MessageCircle,
  Clock, AlertOctagon, Wrench, Paintbrush, ImageIcon, Upload, Trash2, Save, MessageSquare, Plus
} from "lucide-react";
import { STATUSES, INSURERS, getStatusDefinition } from "../../constants/config";
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
      <span className="block text-[11px] text-[#6B6558] mb-0.5">{label}</span>
      {children}
    </label>
  );
}

export default function ClaimModal({ claim, onClose, onSave, onDelete, readOnly, allClaims, onJumpTo, onNotify }) {
  const safeClaim = useMemo(() => sanitizeClaim(claim), [claim]);
  const [form, setForm] = useState(safeClaim);
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
  const setStage = (dept, val) => setForm((f) => ({ ...f, manopera: { ...f.manopera, [dept]: val } }));
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
          <div className="flex items-center gap-2 text-white"><FileText size={16} /><span className="font-semibold text-[14px]">{isNew ? "Dosar nou" : `Dosar ${form.numarDosar || ""}`}</span></div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isNew && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => generateazaPDF(form, istoric)}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1 hover:bg-white/10"
                  title="Descarcă Proces-Verbal General & Istoric"
                >
                  <FileDown size={12} /> PDF Dosar
                </button>
                <button
                  type="button"
                  onClick={() => generateazaFisaIntrareService(form)}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1 hover:bg-white/10"
                  title="Descarcă Fișă de Intrare Service & Ordin de Lucru"
                >
                  <FileDown size={12} /> Fișă Service
                </button>
                {form.masinaSchimb && (
                  <button
                    type="button"
                    onClick={() => generateazaProcesVerbalMasinaSchimb(form)}
                    className="flex items-center gap-1 text-[#F3D9A8] hover:text-white text-[11px] font-bold border border-[#C98A2B]/40 rounded px-2 py-1 bg-[#C98A2B]/20 hover:bg-[#C98A2B]/40"
                    title="Descarcă Proces-Verbal Predare/Primire Mașină la Schimb"
                  >
                    <Car size={12} /> PV Auto Schimb
                  </button>
                )}
              </div>
            )}
            {!isNew && (
              <button onClick={handleDuplicate} className="flex items-center gap-1 text-white/70 hover:text-white text-[11px] font-semibold border border-white/20 rounded px-2 py-1">
                <Copy size={12} /> Duplică
              </button>
            )}
            {!isNew && (form.createdByEmail || form.updatedByEmail) && (
              <span className="hidden sm:block text-[10.5px] text-white/45 text-right leading-tight">
                {form.createdByEmail && <div>creat de {form.createdByEmail}</div>}
                {form.updatedByEmail && <div>ultima modificare: {form.updatedByEmail}</div>}
              </span>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
          </div>
        </div>
        {readOnly && (
          <div className="px-4 py-2 bg-[#EFEAE1] text-[#6B6558] text-[12px] flex items-center gap-1.5 shrink-0 border-b border-[#DAD4C6]">
            <ShieldCheck size={13} /> Doar vizualizare — acest dosar a fost creat de {form.createdByEmail || "alt coleg"}, doar el îl poate edita sau șterge.
          </div>
        )}
        {!isNew && (
          <div className="px-4 py-3 border-b border-[#DAD4C6] bg-white">
            <ClaimTimeline
              currentStatus={form.status}
              dataSchimbareStatus={form.dataSchimbareStatus}
              istoric={istoric}
              loading={loadingIstoric}
            />
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
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] flex items-center gap-1"><Wrench size={12} /> Flux fizic în service</div>
                  {!isNew && (
                    <button
                      type="button"
                      onClick={() => generateazaFisaIntrareService(form)}
                      className="text-[10.5px] font-semibold text-[#3B5166] hover:underline flex items-center gap-1"
                    >
                      <FileDown size={11} /> Fișă service
                    </button>
                  )}
                </div>
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
                <div className="mt-3 pt-2 border-t border-[#DAD4C6]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#8A8375] flex items-center gap-1"><Car size={12} /> Mașină la schimb</div>
                    {!isNew && form.masinaSchimb && (
                      <button
                        type="button"
                        onClick={() => generateazaProcesVerbalMasinaSchimb(form)}
                        className="text-[10.5px] font-semibold text-[#7A5316] hover:underline flex items-center gap-1"
                      >
                        <FileDown size={11} /> PV Predare Auto la Schimb
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Mașină la schimb (nr.)"><input className="in" placeholder="lasă gol dacă nu se oferă" value={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.value)} /></Field>
                    <Field label="Data dării la schimb"><DatePickerInput value={form.dataDariiLaSchimb} onChange={(v) => set("dataDariiLaSchimb", v)} withTime={false} placeholder="zi/luna/an" /></Field>
                    <Field label="Zile chirie Audatex"><input type="number" min={0} className="in" value={form.zileChirieAudatex} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} /></Field>
                  </div>
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
