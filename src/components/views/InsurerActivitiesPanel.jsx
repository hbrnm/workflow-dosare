import React, { useState, useMemo } from "react";
import {
  Building2,
  AlertTriangle,
  FileCheck,
  BadgeCheck,
  ChevronRight,
  User,
  ShieldCheck,
  Coins,
} from "lucide-react";
import DosarNumber from "../common/DosarNumber";
import WhatsAppButton from "../common/WhatsAppButton";
import { daysBetween } from "../../utils/dateUtils";

const formatNumberRo = (n) => Math.round(Number(n) || 0).toLocaleString("ro-RO");

/**
 * Panou Activități Birocratice în Relația cu Asigurătorii
 * Aliniat 100% la limbajul vizual al aplicației (fără suprapuneri cu fluxul operațional)
 */
export default function InsurerActivitiesPanel({
  claims = [],
  onOpen,
  onNotify,
  onSelectStatusFilter,
}) {
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  // Clasificare dosare strict pe procesele birocratice cu asigurătorii
  const categories = useMemo(() => {
    // 1. Daune Totale (Epavă / Depășire Prag Economic)
    const dauneTotale = claims.filter(
      (c) =>
        !c.blocat &&
        (c.daunaTotala ||
          c.motivBlocare?.toLowerCase().includes("dauna totala") ||
          (c.valoareDevizAudatex > 0 &&
            c.valoareDevizAudatex > (c.valoareVehicul || 50000) * 0.8))
    );

    // 2. Reconstatări & Suplimentări la Asigurător
    const reconstatari = claims.filter(
      (c) =>
        !c.blocat &&
        (c.reconstatareCeruta ||
          c.status === "reconstatare" ||
          c.note?.some((n) => /reconstat|supliment/i.test(n.text || "")))
    );

    // 3. Deconturi & Accept Plată
    const cereriDepuse = claims.filter(
      (c) => !c.blocat && c.status === "in_lucru" && Number(c.valoareDevizAudatex || 0) > 0
    );
    const acceptPlata = claims.filter(
      (c) => !c.blocat && (c.status === "accept_plata" || (c.status === "facturat" && !c.incasat))
    );

    return {
      dauneTotale,
      reconstatari,
      deconturi: {
        total: cereriDepuse.length + acceptPlata.length,
        cereriDepuse,
        acceptPlata,
      },
    };
  }, [claims]);

  const activeList = useMemo(() => {
    if (!selectedSubCategory) return [];
    if (selectedSubCategory === "dauneTotale") return categories.dauneTotale;
    if (selectedSubCategory === "reconstatari") return categories.reconstatari;
    if (selectedSubCategory === "decont_cereri") return categories.deconturi.cereriDepuse;
    if (selectedSubCategory === "decont_accept") return categories.deconturi.acceptPlata;
    return [];
  }, [selectedSubCategory, categories]);

  const toggleSubCategory = (subKey) => {
    setSelectedSubCategory((prev) => (prev === subKey ? null : subKey));
  };

  return (
    <div className="app-brief-panel rounded-xl p-3.5 space-y-3 shrink-0 border border-[var(--app-border)] bg-[var(--app-surface)]">
      {/* Header Panou */}
      <div className="app-brief-panel-header flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[var(--app-accent)]" />
          <h3
            className="font-bold text-[13px] text-[var(--app-text-strong)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Activități &amp; Relație Asigurători
          </h3>
          <span className="app-brief-meta-chip text-[10.5px] font-mono px-2 py-0.5 rounded font-semibold">
            Birocrație &amp; Deconturi
          </span>
        </div>
        <p className="text-[11px] text-[var(--app-muted)] font-medium">
          Dosare filtrate după stadiul de avizare și decontare la asigurător
        </p>
      </div>

      {/* Grid Carduri Aliniate Vizual la Design System */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CARD 1: DAUNE TOTALE */}
        <div
          className={`app-card rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer ${
            selectedSubCategory === "dauneTotale"
              ? "border-[var(--app-accent)] ring-1 ring-[var(--app-accent)] shadow-xs"
              : "hover:border-[var(--app-accent)]"
          }`}
          onClick={() => toggleSubCategory("dauneTotale")}
        >
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 border-b border-[var(--app-border-soft)]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-[var(--app-danger)]" />
              <span className="text-[12px] font-bold text-[var(--app-text-strong)]">
                Daune Totale
              </span>
            </div>
            <span className="app-brief-meta-chip font-mono text-[11px] font-bold px-2 py-0.5 rounded-full">
              {categories.dauneTotale.length}
            </span>
          </div>

          <div className="mt-2 text-[11.5px]">
            <p className="text-[var(--app-muted)] leading-relaxed">
              {categories.dauneTotale.length === 0
                ? "Nicio daună totală economică identificată."
                : `${categories.dauneTotale.length} dosare cu avarii majore / depășire valoare.`}
            </p>
          </div>

          <div className="mt-2 pt-1 flex items-center justify-between text-[11px] font-semibold text-[var(--app-muted)]">
            <span>Click pentru vizualizare</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* CARD 2: RECONSTATĂRI */}
        <div
          className={`app-card rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer ${
            selectedSubCategory === "reconstatari"
              ? "border-[var(--app-accent)] ring-1 ring-[var(--app-accent)] shadow-xs"
              : "hover:border-[var(--app-accent)]"
          }`}
          onClick={() => toggleSubCategory("reconstatari")}
        >
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 border-b border-[var(--app-border-soft)]">
            <div className="flex items-center gap-2">
              <FileCheck size={15} className="text-[var(--app-accent)]" />
              <span className="text-[12px] font-bold text-[var(--app-text-strong)]">
                Reconstatări Daune
              </span>
            </div>
            <span className="app-brief-meta-chip font-mono text-[11px] font-bold px-2 py-0.5 rounded-full">
              {categories.reconstatari.length}
            </span>
          </div>

          <div className="mt-2 text-[11.5px]">
            <p className="text-[var(--app-muted)] leading-relaxed">
              {categories.reconstatari.length === 0
                ? "Nicio reconstatare în așteptare."
                : `${categories.reconstatari.length} dosare cu piese suplimentare sau deviz adițional.`}
            </p>
          </div>

          <div className="mt-2 pt-1 flex items-center justify-between text-[11px] font-semibold text-[var(--app-muted)]">
            <span>Click pentru vizualizare</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* CARD 3: DECONTURI & ACCEPT DE PLATĂ */}
        <div className="app-card rounded-xl p-3 flex flex-col justify-between">
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 border-b border-[var(--app-border-soft)]">
            <div className="flex items-center gap-2">
              <Coins size={15} className="text-[var(--app-success)]" />
              <span className="text-[12px] font-bold text-[var(--app-text-strong)]">
                Deconturi &amp; Accept Plată
              </span>
            </div>
            <span className="app-brief-meta-chip font-mono text-[11px] font-bold px-2 py-0.5 rounded-full">
              {categories.deconturi.total}
            </span>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => toggleSubCategory("decont_cereri")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "decont_cereri"
                  ? "bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold shadow-xs"
                  : "text-[var(--app-text)] hover:bg-[var(--app-surface)] font-medium"
              }`}
            >
              <span>Cereri depuse spre avizare</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "decont_cereri"
                    ? "bg-white/20 text-white"
                    : "app-brief-meta-chip text-[var(--app-text-strong)]"
                }`}
              >
                {categories.deconturi.cereriDepuse.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleSubCategory("decont_accept")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all text-left ${
                selectedSubCategory === "decont_accept"
                  ? "bg-[var(--app-success)] text-white font-bold shadow-xs"
                  : "text-[var(--app-text)] hover:bg-[var(--app-surface)] font-medium"
              }`}
            >
              <span>Accept de plată / De încasat</span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${
                  selectedSubCategory === "decont_accept"
                    ? "bg-white/20 text-white"
                    : "app-brief-meta-chip text-[var(--app-text-strong)]"
                }`}
              >
                {categories.deconturi.acceptPlata.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista detaliată a dosarelor pentru sub-categoria selectată */}
      {selectedSubCategory && (
        <div className="mt-3 p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] space-y-2 shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--app-border)]">
            <h4 className="font-bold text-xs text-[var(--app-text-strong)] flex items-center gap-1.5">
              <span>Dosare selectate:</span>
              <span className="font-mono px-2.5 py-0.5 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-strong)] font-bold">
                {activeList.length} dosare
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedSubCategory(null)}
              className="text-xs text-[var(--app-muted)] hover:text-[var(--app-text-strong)] font-semibold transition-colors cursor-pointer"
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
                    className="app-brief-list-item p-2.5 rounded-lg border border-[var(--app-border)] hover:border-[var(--app-accent)] transition-all flex items-center justify-between gap-3 cursor-pointer"
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
                        <span className="app-brief-meta-chip text-[10px] px-1.5 py-0.5 rounded font-semibold">
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
                        <span className="font-mono font-bold text-xs text-[var(--app-success)]">
                          {formatNumberRo(sum)} lei
                        </span>
                      )}
                      {phone && <WhatsAppButton phone={phone} claim={c} size={11} />}
                      <button
                        type="button"
                        onClick={() => onOpen(c)}
                        className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text-strong)] rounded transition-colors"
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
