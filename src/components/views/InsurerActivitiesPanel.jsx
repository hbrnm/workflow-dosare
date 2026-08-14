import React, { useState, useMemo } from "react";
import {
  Building2,
  Clock,
  AlertTriangle,
  FileCheck,
  ClipboardList,
  Wrench,
  BadgeAlert,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  Phone,
  Banknote,
} from "lucide-react";
import DosarNumber from "../common/DosarNumber";
import ClaimPhoneActions from "../common/ClaimPhoneActions";
import WhatsAppButton from "../common/WhatsAppButton";
import { daysBetween } from "../../utils/dateUtils";

const formatNumberRo = (n) => Math.round(Number(n) || 0).toLocaleString("ro-RO");

/**
 * Categorii de activități în relația cu Asigurătorii (inspirate din arhitectura Omniasig / VIG)
 */
export default function InsurerActivitiesPanel({
  claims = [],
  onOpen,
  onNotify,
  onSelectStatusFilter,
}) {
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  // Clasificare dosare după relația cu asigurătorul
  const categories = useMemo(() => {
    // 1. Daune Totale
    const dauneTotale = claims.filter(
      (c) =>
        !c.blocat &&
        (c.daunaTotala ||
          c.motivBlocare?.toLowerCase().includes("dauna totala") ||
          (c.valoareDevizAudatex > 0 &&
            c.valoareDevizAudatex > (c.valoareVehicul || 50000) * 0.8))
    );

    // 2. În Așteptare de la Asigurător (Pending)
    // AIR = Acord Intrare în Reparație (faza deschidere / deviz inițial neaprobat)
    const airAsteptare = claims.filter(
      (c) =>
        !c.blocat &&
        (c.status === "deschidere" || c.status === "primit") &&
        !c.acordReparatiePrimit
    );

    // Reconstatări = Mașini care au cerere de suplimentare / demontare în așteptare
    const reconstatariAsteptare = claims.filter(
      (c) =>
        !c.blocat &&
        (c.reconstatareCeruta ||
          c.status === "reconstatare" ||
          c.note?.some((n) => /reconstat|supliment/i.test(n.text || "")))
    );

    // Cereri de Despăgubire în așteptare = Devize finale / cereri depuse spre avizare
    const cereriDespagubireAsteptare = claims.filter(
      (c) =>
        !c.blocat &&
        (c.status === "in_lucru" || c.status === "piese_comandate") &&
        c.valoareDevizAudatex > 0
    );

    // Accept de Plată în așteptare = Dosare facturate / gata unde se așteaptă plata decontului
    const acceptPlataAsteptare = claims.filter(
      (c) =>
        !c.blocat &&
        (c.status === "accept_plata" ||
          (c.status === "facturat" && !c.incasat))
    );

    // 3. În Lucru / Aprobate (Active In-Progress)
    const cereriDespagubireInLucru = claims.filter(
      (c) => !c.blocat && c.status === "in_lucru" && !c.incasat
    );
    const acceptPlataInLucru = claims.filter(
      (c) => !c.blocat && c.status === "accept_plata"
    );

    return {
      dauneTotale,
      inAsteptare: {
        total:
          airAsteptare.length +
          reconstatariAsteptare.length +
          cereriDespagubireAsteptare.length +
          acceptPlataAsteptare.length,
        air: airAsteptare,
        reconstatari: reconstatariAsteptare,
        cereriDespagubire: cereriDespagubireAsteptare,
        acceptPlata: acceptPlataAsteptare,
      },
      inLucru: {
        total: cereriDespagubireInLucru.length + acceptPlataInLucru.length,
        cereriDespagubire: cereriDespagubireInLucru,
        acceptPlata: acceptPlataInLucru,
      },
    };
  }, [claims]);

  const activeList = useMemo(() => {
    if (!selectedSubCategory) return [];
    if (selectedSubCategory === "dauneTotale") return categories.dauneTotale;
    if (selectedSubCategory === "ast_air") return categories.inAsteptare.air;
    if (selectedSubCategory === "ast_reconstatari")
      return categories.inAsteptare.reconstatari;
    if (selectedSubCategory === "ast_cereri")
      return categories.inAsteptare.cereriDespagubire;
    if (selectedSubCategory === "ast_accept")
      return categories.inAsteptare.acceptPlata;
    if (selectedSubCategory === "lucru_cereri")
      return categories.inLucru.cereriDespagubire;
    if (selectedSubCategory === "lucru_accept")
      return categories.inLucru.acceptPlata;
    return [];
  }, [selectedSubCategory, categories]);

  const toggleSubCategory = (subKey) => {
    setSelectedSubCategory((prev) => (prev === subKey ? null : subKey));
  };

  return (
    <div className="app-brief-panel rounded-xl p-3.5 space-y-3 shrink-0 border border-[var(--app-border)] bg-[var(--app-surface)]">
      {/* Header Panou */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-emerald-500" />
          <h3
            className="font-bold text-[13px] text-[var(--app-text-strong)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Activități &amp; Relație Asigurători
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
            Gestiune Deconturi &amp; AIR
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          Filtrare rapidă pe dosare după stadiul birocratic la asigurător
        </p>
      </div>

      {/* Grid Carduri Activități (Stil Omniasig Tablou de Bord) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CARD 1: DAUNE TOTALE */}
        <div
          className={`rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer ${
            selectedSubCategory === "dauneTotale"
              ? "border-amber-500 bg-amber-500/20 shadow-md ring-2 ring-amber-500/30"
              : "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-500"
          }`}
          onClick={() => toggleSubCategory("dauneTotale")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                Daune totale
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100 border border-amber-400/60">
              <span>Σ</span>
              <span>{categories.dauneTotale.length}</span>
            </div>
          </div>
          <p className="text-[11.5px] font-medium text-slate-700 dark:text-slate-300 mt-3">
            {categories.dauneTotale.length === 0
              ? "Nicio daună totală identificată."
              : `${categories.dauneTotale.length} dosare cu avarii majore / depășire prag.`}
          </p>
        </div>

        {/* CARD 2: ÎN LUCRU */}
        <div className="rounded-xl border border-emerald-400/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                În lucru
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-400/60">
              <span>Σ</span>
              <span>{categories.inLucru.total}</span>
            </div>
          </div>

          <div className="mt-2.5 space-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => toggleSubCategory("lucru_cereri")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "lucru_cereri"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 font-semibold"
              }`}
            >
              <span>Cereri de despăgubire</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "lucru_cereri"
                    ? "bg-white/25 text-white"
                    : "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700"
                }`}
              >
                {categories.inLucru.cereriDespagubire.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleSubCategory("lucru_accept")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "lucru_accept"
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 font-semibold"
              }`}
            >
              <span>Accept de plată</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "lucru_accept"
                    ? "bg-white/25 text-white"
                    : "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700"
                }`}
              >
                {categories.inLucru.acceptPlata.length}
              </span>
            </button>
          </div>
        </div>

        {/* CARD 3: ÎN AȘTEPTARE */}
        <div className="rounded-xl border border-sky-400/60 bg-sky-50/60 dark:bg-sky-950/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-extrabold text-sky-950 dark:text-sky-200">
                În așteptare
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 border border-sky-400/60">
              <span>Σ</span>
              <span>{categories.inAsteptare.total}</span>
            </div>
          </div>

          <div className="mt-2.5 space-y-1 text-xs">
            <button
              type="button"
              onClick={() => toggleSubCategory("ast_cereri")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "ast_cereri"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-sky-100/60 dark:hover:bg-sky-950/50 font-semibold"
              }`}
            >
              <span>Cereri de despăgubire</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "ast_cereri"
                    ? "bg-white/25 text-white"
                    : "bg-sky-100 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 border border-sky-300 dark:border-sky-700"
                }`}
              >
                {categories.inAsteptare.cereriDespagubire.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleSubCategory("ast_reconstatari")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "ast_reconstatari"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-sky-100/60 dark:hover:bg-sky-950/50 font-semibold"
              }`}
            >
              <span>Reconstatări</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "ast_reconstatari"
                    ? "bg-white/25 text-white"
                    : "bg-sky-100 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 border border-sky-300 dark:border-sky-700"
                }`}
              >
                {categories.inAsteptare.reconstatari.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleSubCategory("ast_air")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "ast_air"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-sky-100/60 dark:hover:bg-sky-950/50 font-semibold"
              }`}
            >
              <span>AIR (Acord Intrare Reparație)</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "ast_air"
                    ? "bg-white/25 text-white"
                    : "bg-sky-100 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 border border-sky-300 dark:border-sky-700"
                }`}
              >
                {categories.inAsteptare.air.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleSubCategory("ast_accept")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "ast_accept"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "text-slate-800 dark:text-slate-200 hover:bg-sky-100/60 dark:hover:bg-sky-950/50 font-semibold"
              }`}
            >
              <span>Accept de plată</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "ast_accept"
                    ? "bg-white/25 text-white"
                    : "bg-sky-100 text-sky-950 dark:bg-sky-900/80 dark:text-sky-100 border border-sky-300 dark:border-sky-700"
                }`}
              >
                {categories.inAsteptare.acceptPlata.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista detaliată a dosarelor pentru sub-categoria selectată */}
      {selectedSubCategory && (
        <div className="mt-3 p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Dosare selectate:</span>
              <span className="font-mono px-2.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold">
                {activeList.length} dosare
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedSubCategory(null)}
              className="text-xs text-slate-700 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 font-bold transition-colors cursor-pointer"
            >
              Închide lista ×
            </button>
          </div>

          {activeList.length === 0 ? (
            <p className="text-xs text-[var(--app-muted)] italic py-3 text-center">
              Niciun dosar în această categorie.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {activeList.map((c) => {
                const phone = c.telefonClient || "";
                const days = daysBetween(c.dataDeschiderii);
                const sum = c.valoareDevizAudatex || c.sumaDecont || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => onOpen(c)}
                    className="p-2.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:border-[var(--app-accent)] transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs uppercase">
                          {c.numarInmatriculare || "FĂRĂ NR."}
                        </span>
                        <span className="text-[10px] text-[var(--app-muted)]">·</span>
                        <DosarNumber
                          value={c.numarDosar}
                          onNotify={onNotify}
                          empty="—"
                          className="font-mono text-xs text-[var(--app-muted)]"
                        />
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] font-semibold">
                          {c.asigurator || "Asigurător nespecificat"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--app-muted)] mt-1">
                        <span>{c.marcaModel || "Model nespecificat"}</span>
                        <span>·</span>
                        <span>Client: {c.client || "—"}</span>
                        {days > 0 && (
                          <>
                            <span>·</span>
                            <span>{days} zile în service</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {sum > 0 && (
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatNumberRo(sum)} lei
                        </span>
                      )}
                      {phone && <WhatsAppButton phone={phone} claim={c} size={11} />}
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="p-1 text-[var(--app-muted)] hover:text-emerald-500 transition-colors"
                          title={`Sune la ${phone}`}
                        >
                          <Phone size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpen(c)}
                        className="p-1 text-[var(--app-muted)] hover:text-[var(--app-accent)] transition-colors"
                        title="Deschide dosarul"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
