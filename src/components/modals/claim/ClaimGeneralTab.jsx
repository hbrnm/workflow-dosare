import React from "react";
import {
  FileText, Calendar, ShieldCheck, CalendarClock, AlertOctagon, Wrench,
  Car, Tag, User as UserIcon, Phone, MessageCircle, Trash2, Sparkles, FileDown,
  Link2, ExternalLink, Copy, Check, RefreshCw, Gauge
} from "lucide-react";

import {
  STATUSES, INSURERS, INSURANCE_TYPES, getStatusDefinition, getPhaseColors, isPieseComandateStatus
} from "../../../constants/config";
import { fmtDateTime, todayISO, nowISO, telLink, waLink, uid } from "../../../utils/dateUtils";
import DatePickerInput from "../../common/DatePickerInput";
import ClaimScheduleFields from "../../common/ClaimScheduleFields";
import MobilePieseSositeRow from "../../mobile/MobilePieseSositeRow";
import {
  generateazaFisaIntrareService,
  generateazaProcesVerbalMasinaSchimb
} from "../../../utils/pdfGenerator";
import { loadCachedBranding } from "../../../constants/branding";
import { buildTrackingUrl } from "../../../constants/trackingCopy";
import { generateTrackingToken } from "../../../utils/claimModel";
import PartsLifecyclePanel from "../../common/PartsLifecyclePanel";

export default function ClaimGeneralTab({
  form,
  setForm,
  set,
  readOnly = false,
  isNew = false,
  insurersList = INSURERS,
  toggleGata,
  toggleRidicata,
  applyClaimStatusChange,
  onNotify,
}) {
  const isAiExtracted = Boolean(form.aiExtracted || form.financiar?.audatexImport);
  const aiSource = form.aiDocumentType || form.financiar?.audatexImport?.source || "Deviz / Document OCR";

  return (
    <div className="space-y-3">
      {/* Top Bar: AI-Extracted Badge & ID Dosar */}
      <div className="flex items-center justify-between">
        {isAiExtracted ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[11px] font-medium animate-in fade-in duration-200">
            <Sparkles size={12} className="text-indigo-400 shrink-0" />
            <span>Date extrase automat ({aiSource}) — Te rugăm să verifici acuratețea câmpurilor</span>
          </div>
        ) : (
          <div />
        )}
        <span className="text-[9.5px] font-mono text-[#B0A99A] hover:text-[var(--app-muted)] transition-colors select-all cursor-help" title="ID intern dosar">
          #{form.id?.slice(0, 8) || "Nou"}
        </span>
      </div>



      {/* Grid cu 2 Coloane Spațioase: Date Dosar & Date Vehicul */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">

        {/* COLOANA 1: DATE DOSAR */}
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
            <FileText size={13} className="text-[var(--app-muted)]" /> 1. Date Dosar
          </div>

          {/* 1. Nr. Dosar Daună */}
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
              <FileText size={12} className="text-[var(--app-muted)]" /> Nr. Dosar Daună
            </label>
            <input
              className="w-full font-bold text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
              value={form.numarDosar}
              onChange={(e) => set("numarDosar", e.target.value.toUpperCase())}
              placeholder="ex: 2026-00451"
              required
            />
          </div>

          {/* Dată Deschidere & Dată Eveniment (Accident) în grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
                <Calendar size={12} className="text-[var(--app-muted)]" /> Dată Deschidere Dosar
              </label>
              <DatePickerInput
                value={form.dataDeschiderii}
                onChange={(v) => set("dataDeschiderii", v)}
                withTime={false}
                placeholder="zi/lună/an"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
                <Calendar size={12} className="text-[var(--app-warning)]" /> Dată Eveniment (Accident)
              </label>
              <DatePickerInput
                value={form.dataEveniment}
                onChange={(v) => set("dataEveniment", v)}
                withTime={false}
                placeholder="zi/lună/an (accident)"
              />
            </div>
          </div>

          {/* Asigurător & Tip */}
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-0.5 flex items-center gap-1">
              <ShieldCheck size={12} className="text-[var(--app-muted)]" /> Asigurător &amp; Tip Asigurare
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                className="col-span-1 font-bold text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)]"
                value={form.tipAsigurare}
                onChange={(e) => {
                  const val = e.target.value;
                  set("tipAsigurare", val);
                  if (val === "Fără asigurare") {
                    set("asigurator", "");
                  }
                }}
              >
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                disabled={form.tipAsigurare === "Fără asigurare"}
                className={`col-span-2 text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] font-semibold text-[var(--app-text-strong)] ${
                  form.tipAsigurare === "Fără asigurare" ? "opacity-50 bg-[var(--app-border-soft)] cursor-not-allowed" : ""
                }`}
                value={form.asigurator}
                onChange={(e) => set("asigurator", e.target.value)}
              >
                <option value="">{form.tipAsigurare === "Fără asigurare" ? "-- Fără asigurător --" : "-- Societate Asigurare --"}</option>
                {(Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS).map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Dată Comandă Piese — detalii în coloana Date Dosar */}
          {isPieseComandateStatus(form.status) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="block text-[10.5px] font-bold text-[var(--app-warning)] mb-0.5 flex items-center gap-1">
                  <CalendarClock size={12} className="text-[var(--app-warning)]" /> Dată Comandă Piese
                </label>
                <DatePickerInput
                  value={form.dataComandaPiese}
                  onChange={(v) => set("dataComandaPiese", v)}
                  withTime={false}
                  placeholder="zi/lună/an"
                />
              </div>
              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                <label className="block text-[10.5px] font-bold text-[var(--app-warning)] mb-0.5 flex items-center gap-1">
                  <Calendar size={12} className="text-[var(--app-warning)]" /> Termen Livrare Piese
                </label>
                <DatePickerInput
                  value={form.termenLivrarePiese}
                  onChange={(v) => set("termenLivrarePiese", v)}
                  withTime={false}
                  placeholder="zi/lună/an"
                />
              </div>
            </div>
          )}

          {form.blocat && (
            <div className="p-2 bg-red-50/80 border border-red-200 rounded-xl space-y-1">
              <label className="block text-[10.5px] font-bold text-[var(--app-danger)] flex items-center gap-1">
                <AlertOctagon size={12} /> Motiv blocare dosar
              </label>
              <input
                className="w-full text-[11.5px] p-1.5 border border-red-200 rounded-lg bg-[var(--app-surface)] font-semibold text-[var(--app-text-strong)]"
                placeholder="ex: Litigiu, așteptare deviz..."
                value={form.motivBlocare || ""}
                onChange={(e) => set("motivBlocare", e.target.value)}
              />
            </div>
          )}

          {/* Linii reparații */}
          <div className="space-y-1.5 border-t border-[var(--app-border)]/60 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10.5px] font-extrabold text-[var(--app-muted)] uppercase flex items-center gap-1">
                <Wrench size={12} className="text-[var(--app-muted)]" /> Operațiuni de efectuat (linii &amp; bife)
              </label>
              <button
                type="button"
                onClick={() => {
                  const newList = [...(form.operatiuni || []), { id: uid(), piesa: "", inl: false, rev: false, rep: false, uni: false }];
                  set("operatiuni", newList);
                }}
                className="text-[10px] font-extrabold text-[var(--app-muted)] hover:bg-[var(--app-border-soft)] px-2 py-0.5 rounded border border-[var(--app-border)] flex items-center gap-1 cursor-pointer"
              >
                + Adaugă Linie
              </button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {(!form.operatiuni || form.operatiuni.length === 0) ? (
                <div className="text-[10.5px] text-[var(--app-muted)] italic p-2 border border-dashed border-[var(--app-border)] rounded-lg text-center">
                  Nicio linie adăugată. Apasă pe „+ Adaugă Linie” de mai sus.
                </div>
              ) : (
                form.operatiuni.map((op, idx) => (
                  <div key={op.id || idx} className="flex items-center gap-1 bg-[var(--app-surface)] p-1 rounded-lg border border-[var(--app-border)]">
                    <input
                      className="flex-1 font-semibold text-[11px] px-1.5 py-0.5 border border-[var(--app-border)] rounded uppercase text-[var(--app-text-strong)]"
                      placeholder="ex: Oglindă ext. stanga, Bara față..."
                      value={op.piesa || ""}
                      onChange={(e) => {
                        const newList = [...form.operatiuni];
                        newList[idx] = { ...newList[idx], piesa: e.target.value.toUpperCase() };
                        set("operatiuni", newList);
                        set("ceEsteDeReparat", newList.map((o) => o.piesa).filter(Boolean).join(", "));
                      }}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.inl ? "bg-[#B8791E] text-white border-[#B8791E]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"}`} title="Înlocuire">
                        <input type="checkbox" checked={!!op.inl} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], inl: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> INL
                      </label>
                      <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rev ? "bg-[var(--app-muted)] text-white border-[var(--app-muted)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"}`} title="Revopsire">
                        <input type="checkbox" checked={!!op.rev} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rev: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REV
                      </label>
                      <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.rep ? "bg-[var(--app-success)] text-white border-[var(--app-success)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"}`} title="Reparație">
                        <input type="checkbox" checked={!!op.rep} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], rep: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> REP
                      </label>
                      <label className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all border ${op.uni ? "bg-[var(--app-text)] text-white border-[var(--app-text)]" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"}`} title="Demontare / Remontare (D/R)">
                        <input type="checkbox" checked={!!op.uni} onChange={(e) => { const newList = [...form.operatiuni]; newList[idx] = { ...newList[idx], uni: e.target.checked }; set("operatiuni", newList); }} className="hidden" /> D/R
                      </label>
                      <button type="button" onClick={() => { const newList = form.operatiuni.filter((_, i) => i !== idx); set("operatiuni", newList); set("ceEsteDeReparat", newList.map((o) => o.piesa).filter(Boolean).join(", ")); }} className="p-1 text-[var(--app-danger)] hover:bg-red-50 rounded-lg transition-colors ml-0.5 cursor-pointer" title="Șterge linia">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gestiune Piese Comandate & Ciclu de Viață */}
          <PartsLifecyclePanel
            form={form}
            set={set}
            readOnly={readOnly}
            onNotify={onNotify}
          />
        </div>

        {/* COLOANA 2: VEHICUL, PROPRIETAR & DELEGAT */}
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
            <Car size={13} className="text-[var(--app-muted)]" /> 2. Date Vehicul, Proprietar &amp; Delegat
          </div>

          {/* Nr. Înmatriculare */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
              <Car size={13} className="text-[var(--app-muted)]" /> Nr. Înmatriculare
            </label>
            <input
              className="w-full font-mono font-bold text-[12.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
              value={form.numarInmatriculare}
              onChange={(e) => set("numarInmatriculare", e.target.value.toUpperCase())}
              placeholder="ex: B111AAA"
              required
            />
          </div>

          {/* Serie Șasiu (VIN) */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
              <Tag size={13} className="text-[var(--app-muted)]" /> Serie Șasiu (VIN 17 caractere)
            </label>
            <input
              className="w-full font-mono text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
              value={form.vin}
              onChange={(e) => set("vin", e.target.value.toUpperCase())}
              maxLength={17}
              placeholder="Cod VIN 17 caractere"
            />
          </div>

          {/* Marcă & Model + Kilometraj */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <Car size={13} className="text-[var(--app-muted)]" /> Marcă &amp; Model Vehicul
              </label>
              <input
                className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                value={form.marcaModel}
                onChange={(e) => set("marcaModel", e.target.value.toUpperCase())}
                placeholder="ex: VOLKSWAGEN PASSAT 2.0 TDI"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <Gauge size={13} className="text-[var(--app-muted)]" /> Kilometraj (km)
              </label>
              <input
                type="number"
                className="w-full font-mono text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                value={form.kilometraj ?? ""}
                onChange={(e) => set("kilometraj", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="ex: 145000"
              />
            </div>
          </div>

          {/* Proprietar & Delegat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <UserIcon size={13} className="text-[var(--app-muted)]" /> Proprietar Auto
              </label>
              <input
                className="w-full font-semibold text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                value={form.client}
                onChange={(e) => set("client", e.target.value.toUpperCase())}
                placeholder="Nume proprietar auto"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <UserIcon size={13} className="text-[var(--app-muted)]" /> Delegat
              </label>
              <input
                className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] uppercase text-[var(--app-text-strong)] focus:border-[var(--app-muted)]"
                value={form.delegat || ""}
                onChange={(e) => set("delegat", e.target.value.toUpperCase())}
                placeholder="Nume delegat (opțional)"
              />
            </div>
          </div>

          {/* Telefon contact */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
              <Phone size={13} className="text-[var(--app-muted)]" /> Telefon Contact
            </label>
            <div className="flex items-center gap-1">
              <input
                className="flex-1 font-mono text-[11.5px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)]"
                type="tel"
                placeholder="07xx xxx xxx"
                value={form.telefonClient}
                onChange={(e) => set("telefonClient", e.target.value)}
              />
              {form.telefonClient && (
                <>
                  <a href={telLink(form.telefonClient)} title="Sună client" aria-label="Sună client" className="shrink-0 p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-border-soft)] text-[var(--app-muted)] transition-colors"><Phone size={12} /></a>
                  <a href={waLink(form.telefonClient, `Buna ziua! Va contactam de la ${loadCachedBranding()?.atelierNume || "service"} referitor la dosarul dvs. ${form.numarDosar || ""} (${form.numarInmatriculare || ""}).`)} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="Trimite WhatsApp" className="shrink-0 p-1.5 rounded-lg bg-[var(--app-success-muted)] border border-[var(--app-success)]/30 hover:bg-[var(--app-success)]/15 text-[var(--app-success)] transition-colors"><MessageCircle size={12} /></a>
                </>
              )}
            </div>

            {/* Widget Urmărire Reparație Client (Live Tracking Portal) */}
            {form.trackingToken && (
              <div className="pt-2 mt-2 border-t border-[var(--app-border)]/70 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-sky-700 flex items-center gap-1">
                    <Link2 size={12} className="text-sky-600" /> Urmărire Client (Live)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-sky-800 font-mono font-bold bg-sky-100/80 px-1.5 py-0.5 rounded border border-sky-200">
                      Cod: {form.trackingToken.length > 10 ? `${form.trackingToken.slice(0, 8)}…` : form.trackingToken}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newToken = generateTrackingToken();
                          set("trackingToken", newToken);
                          onNotify?.(`Cod scurt generat: ${newToken}`, "success");
                        }}
                        className="p-1 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded transition-colors cursor-pointer"
                        title={form.trackingToken.length > 10 ? "Convertește în cod scurt profesional (TK-XXXXX)" : "Regenerează cod scurt"}
                      >
                        <RefreshCw size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    readOnly
                    value={buildTrackingUrl(form.trackingToken)}
                    className="flex-1 font-mono text-[10px] p-1.5 border border-sky-200 bg-sky-50/50 rounded-lg text-sky-950 select-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const url = buildTrackingUrl(form.trackingToken);
                      try {
                        await navigator.clipboard.writeText(url);
                        onNotify?.("Link-ul de urmărire a fost copiat în clipboard!", "success");
                      } catch {
                        window.prompt("Copiază link-ul:", url);
                      }
                    }}
                    className="shrink-0 p-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-800 transition-colors flex items-center gap-1 text-[10.5px] font-bold cursor-pointer"
                    title="Copiază linkul public pentru client"
                  >
                    <Copy size={11} /> Copiază
                  </button>
                  <a
                    href={buildTrackingUrl(form.trackingToken) || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 p-1.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors flex items-center gap-1 text-[10.5px] font-bold"
                    title="Deschide pagina publică în filă nouă"
                  >
                    <ExternalLink size={11} /> Previzualizează
                  </a>
                </div>

                {form.telefonClient && (
                  <a
                    href={waLink(
                      form.telefonClient,
                      `Buna ziua! Puteti urmari stadiul reparatiei autovehiculului dvs. ${form.marcaModel ? `${form.marcaModel} ` : ""}(${form.numarInmatriculare || ""}) in timp real accesand link-ul: ${buildTrackingUrl(form.trackingToken)} — Echipa ${loadCachedBranding()?.atelierNume || "service"}.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                  >
                    <MessageCircle size={12} /> Trimite Link pe WhatsApp Client
                  </a>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-[var(--app-muted)] mb-0.5">
                    Mesaj afișat clientului pe link (opțional):
                  </label>
                  <input
                    className="w-full text-[11px] p-1.5 border border-[var(--app-border)] rounded-lg bg-[var(--app-surface)] text-[var(--app-text-strong)]"
                    placeholder="ex: Piesele au sosit; mașina intră mâine în vopsitorie."
                    value={form.mesajClient || ""}
                    onChange={(e) => set("mesajClient", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STARE FIZICĂ & MAȘINĂ LA SCHIMB */}
      <div className="grid md:grid-cols-2 gap-3 pt-1">
        {/* Stepper Stare Fizică */}
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-3 shadow-2xs">
          <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
            <span className="flex items-center gap-1.5"><Wrench size={14} /> Stare Fizică &amp; Lucrări</span>
            {!isNew && (
              <button type="button" onClick={() => generateazaFisaIntrareService(form)} className="text-[11px] font-semibold text-[var(--app-muted)] hover:underline flex items-center gap-1 cursor-pointer">
                <FileDown size={12} /> Fișă service
              </button>
            )}
          </div>

          {/* Stepper cu 3 casete interactive bidirecționale */}
          <div className="space-y-2 text-[11.5px]">
            {/* 1. Adusă fizic */}
            <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.adusaFizic ? "bg-amber-50/60 border-amber-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.adusaFizic}
                  onChange={(e) => setForm((f) => {
                    const checked = e.target.checked;
                    const updates = {
                      adusaFizic: checked,
                      dataAdusaFizic: checked ? nowISO() : null,
                    };
                    // Side-effect: adus fizic pe Programat → În lucru
                    if (checked && f.status === "programat") {
                      updates.status = "in_lucru";
                      updates.dataSchimbareStatus = nowISO();
                    }
                    return { ...f, ...updates };
                  })}
                  className="rounded border-[var(--app-border)]"
                />
                <span className="font-bold text-[var(--app-text-strong)]">1. Vehicul adus fizic în service</span>
              </div>
              {form.adusaFizic && (
                <span className="text-[10px] font-mono text-[var(--app-muted)]">{fmtDateTime(form.dataAdusaFizic)}</span>
              )}
            </label>

            {/* 2. Gata de ridicare */}
            <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.gataDeRidicare ? "bg-emerald-50/60 border-emerald-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.gataDeRidicare}
                  onChange={(e) => toggleGata(e.target.checked)}
                  className="rounded border-[var(--app-border)]"
                />
                <span className="font-bold text-[var(--app-text-strong)]">2. Lucrare finalizată (Gata de ridicare)</span>
              </div>
              {form.gataDeRidicare && (
                <span className="text-[10px] font-mono text-[var(--app-success)] font-bold">{fmtDateTime(form.dataGataRidicare)}</span>
              )}
            </label>

            {/* 3. Predată client */}
            <label className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${form.ridicata ? "bg-blue-50/60 border-blue-300" : "bg-[var(--app-surface-2)] border-[var(--app-border)]"}`}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.ridicata}
                  onChange={(e) => toggleRidicata(e.target.checked)}
                  className="rounded border-[var(--app-border)]"
                />
                <span className="font-bold text-[var(--app-text-strong)]">3. Predată clientului</span>
              </div>
              {form.ridicata && (
                <span className="text-[10px] font-mono text-[var(--app-text)] font-bold">{fmtDateTime(form.dataRidicare)}</span>
              )}
            </label>
          </div>
        </div>

        {/* Mașină la Schimb */}
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
          <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
            <span className="flex items-center gap-1.5"><Car size={14} /> Mașină la Schimb</span>
          </div>

          <label className="flex items-center gap-2 text-[11.5px] font-bold text-[var(--app-muted)] cursor-pointer">
            <input type="checkbox" checked={form.masinaSchimb} onChange={(e) => set("masinaSchimb", e.target.checked)} className="rounded border-[var(--app-border)]" />
            <span>S-a oferit mașină la schimb (Rent-a-car)</span>
          </label>

          {form.masinaSchimb && (
            <div className="space-y-2 pt-1 border-t border-[var(--app-border)]">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Model Mașină Oferită</label>
                  <input className="w-full text-[12px] p-1.5 border border-[var(--app-border)] rounded-lg uppercase bg-[var(--app-surface-2)]" placeholder="ex: HYUNDAI I20" value={form.masinaSchimbModel || ""} onChange={(e) => set("masinaSchimbModel", e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Nr. Înmatriculare Închiriere</label>
                  <input className="w-full text-[12px] font-bold p-1.5 border border-[var(--app-border)] rounded-lg uppercase bg-[var(--app-surface-2)]" placeholder="ex: B100ABC" value={form.masinaSchimbNumar || ""} onChange={(e) => set("masinaSchimbNumar", e.target.value.toUpperCase())} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Dată Predare Auto</label>
                  <DatePickerInput value={form.dataPredareMasinaSchimb} onChange={(v) => set("dataPredareMasinaSchimb", v)} withTime={false} placeholder="zi/lună/an" />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Zile Chirie Audatex</label>
                  <input type="number" min={0} className="w-full p-1.5 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12px] bg-[var(--app-surface-2)]" value={form.zileChirieAudatex || 0} onChange={(e) => set("zileChirieAudatex", Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
