import React, { useState, useMemo } from "react";
import {
  Layers, AlertTriangle, PackageCheck, CalendarClock, Car, Truck,
  ChevronRight, ArrowRight, Clock, MessageSquare, ExternalLink,
  Search, Check, Bell, AlertOctagon, X, Phone
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { daysBetween, telLink, fmtDate } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";

// Culori oficiale per fază din redesign
const PHASE_COLOR_MAP = {
  start: { bg: "#1E2A44", soft: "#E9EBF1" },
  eval:  { bg: "#2E5C8A", soft: "#E7EEF5" },
  lucru: { bg: "#B8791E", soft: "#FBF0DE" },
  final: { bg: "#2F6B4E", soft: "#E7F1EC" },
};

const PART_OVERDUE_DAYS = 4; // prag alertă piese comandate fără confirmare

// ---------------------------------------------------------------------------
// KANBAN CARD REDESIGN (OPTIMIZAT COMPACT PE VERTICALĂ)
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, onTogglePieseSosite, canEdit, pragRidicare }) {
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = isStageOverdue(claim);
  const phaseColorHex = PHASE_COLOR_MAP[statusDef.phase]?.bg || "#1E2A44";

  const currentStatusKey = statusDef.key;
  const currentIndex = Math.max(0, STATUSES.findIndex((s) => s.key === currentStatusKey));
  const nextStatus = currentIndex < STATUSES.length - 1 ? STATUSES[currentIndex + 1] : null;

  // Calcul stare aging (sub 2 zile = ok, 2-4 zile = warn, peste 4 zile sau intarziat = danger)
  let agingClass = "bg-[#E9F5EE] text-[#2F8F5B]";
  if (days >= 2 && days <= 4) agingClass = "bg-[#FCF3DF] text-[#D69A1E]";
  if (days > 4 || overdue || claim.blocat) agingClass = "bg-[#FBEAE9] text-[#D6473F]";

  const commentsCount = (claim.poze?.length || 0) + (claim.documente?.length || 0);
  const isPartOverdue = (claim.status === "piese_comandate" || currentStatusKey === "piese_comandate") && !claim.pieseSosite && days > PART_OVERDUE_DAYS;

  return (
    <div
      id={`claim-card-${claim.id}`}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(claim)}
      className={`card group relative bg-white border border-[#E4E1D9] rounded-xl p-2.5 shadow-xs transition-all duration-150 cursor-pointer select-none space-y-1.5 hover:shadow-md ${
        claim.blocat || overdue
          ? "border-[#EAC3C0] bg-gradient-to-b from-[#FBEAE9]/60 to-white"
          : "hover:border-[#1B2430]"
      }`}
    >
      {/* 1. TOP ROW: Nr. Înmatriculare + Asigurare Badge + Vehicul */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-[13px] text-[#1B2430] tracking-tight group-hover:text-[#B8791E] transition-colors truncate">
            {claim.numarInmatriculare || "FĂRĂ NR."}
          </span>
          {claim.numarDosar && (
            <span className="text-[10px] font-mono font-bold bg-[#EFEAE1] border border-[#DAD4C6] px-1.5 py-0.2 rounded text-[#3B5166] shrink-0" title={`Dosar #${claim.numarDosar}`}>
              #{claim.numarDosar}
            </span>
          )}
          <span
            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
              claim.tipAsigurare === "CASCO"
                ? "bg-[#F4E3C6] text-[#8A5A0E]"
                : "bg-[#DDE7F0] text-[#2E5C8A]"
            }`}
          >
            {claim.tipAsigurare || "RCA"}
          </span>
        </div>
        <span className="text-[11px] text-[#5B6572] font-medium truncate max-w-[110px]" title={claim.marcaModel || claim.client}>
          {claim.marcaModel || claim.client || "—"}
        </span>
      </div>

      {/* 2. VISUAL STEPPER (9 SEGMENTE RESTRÂNS PE VERTICALĂ) */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-0.5 h-1.5 w-full bg-[#E4E1D9] rounded-full overflow-hidden p-0.5 my-0.5">
          {STATUSES.map((s, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={s.key}
                className="h-full flex-1 rounded-xs transition-all"
                style={{
                  backgroundColor: isDone || isCurrent ? phaseColorHex : "#D1CDC0",
                  opacity: isCurrent ? 1 : isDone ? 0.75 : 0.35
                }}
              />
            );
          })}
        </div>
        <div className="text-[10.5px] font-bold text-[#1B2430] flex items-center justify-between">
          <span>
            <span className="text-[#5B6572] font-semibold">{statusDef.num}/9</span> · {statusDef.label}
          </span>
          {claim.blocat && <span className="text-[#D6473F] text-[9.5px] font-extrabold">🛑 BLOCAT</span>}
        </div>
      </div>

      {/* 3. CHECKBOX INTERACTIV PIESE SOSITE (Etapa Piese comandate) */}
      {claim.status === "piese_comandate" && (
        <div className="space-y-1">
          {claim.dataComandaPiese && (
            <div className="text-[10px] text-[#7A5316] font-bold bg-[#FDF8EE] border border-[#F5E2C4] px-2 py-0.5 rounded-md flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CalendarClock size={11} className="text-[#C98A2B]" /> Comandat la:
              </span>
              <span className="font-mono">{fmtDate(claim.dataComandaPiese)}</span>
            </div>
          )}
          <label
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center justify-between gap-1.5 text-[10.5px] font-bold cursor-pointer select-none py-0.5 px-2 rounded-md border transition-all ${
              claim.pieseSosite
                ? "bg-[#E9F5EE] text-[#2F8F5B] border-[#B9D9C6]"
                : "bg-[#F3F2EE] text-[#5B6572] border-[#E4E1D9] hover:border-[#1B2430]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!claim.pieseSosite}
                onChange={(e) => {
                  if (onTogglePieseSosite) onTogglePieseSosite(claim, e.target.checked);
                }}
                className="rounded accent-[#2F8F5B] w-3.5 h-3.5 cursor-pointer"
              />
              <span>Piese sosite</span>
            </div>
            {claim.pieseSosite && <span className="text-[9px] font-extrabold bg-[#2F8F5B] text-white px-1.5 py-0.2 rounded">✓ SOSITE</span>}
          </label>
        </div>
      )}

      {/* 4. PART OVERDUE ALERT BANNER ON CARD */}
      {isPartOverdue && (
        <div className="flex items-center gap-1 bg-[#FBEAE9] text-[#8C2E28] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-[#EFC3C0]">
          <Bell size={10} className="shrink-0 animate-bounce" />
          <span>Fără confirmare sosire ({days} zile)</span>
        </div>
      )}

      {/* 5. CARD FOOTER: AGING + PHONE / WHATSAPP + ADVANCE BUTTON */}
      <div className="flex items-center gap-1.5 pt-0.5 border-t border-[#E4E1D9]/60 text-[10px]">
        {/* Aging Pill */}
        <span className={`font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${agingClass}`}>
          <Clock size={10} /> {days} zile
        </span>

        {/* Apel Telefon & WhatsApp (în loc de iconiță număr mesaje) */}
        {claim.telefonClient && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={telLink(claim.telefonClient)}
              onClick={(e) => e.stopPropagation()}
              title={`Sună clientul: ${claim.telefonClient}`}
              className="p-1 rounded bg-[#EFEAE1] hover:bg-[#3B5166] text-[#3B5166] hover:text-white transition-colors"
            >
              <Phone size={11} />
            </a>
            <WhatsAppButton phone={claim.telefonClient} claim={claim} size={10} />
          </div>
        )}

        <span className="flex-1" />

        {/* 1-Click Advance Button */}
        {nextStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToStatus(claim, nextStatus.key);
            }}
            className="w-6 h-6 rounded-md bg-[#B8791E] hover:bg-[#9E6517] text-white flex items-center justify-center text-[12px] font-bold shadow-2xs transition-all active:scale-90"
            title={`1-Click Avansează în „${nextStatus.label}”`}
          >
            →
          </button>
        )}
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN FLUX OPERAȚIONAL REDESIGN
// ---------------------------------------------------------------------------
export default function TablouPeFazeRedesign({
  claims,
  onOpen,
  onMoveToStatus,
  onTogglePieseSosite,
  onAddInStatus,
  onDuplicate,
  canEditFn,
  pragRidicare,
  quickFilter,
  setQuickFilter
}) {
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);

  // Dosare cu piese întârziate (peste pragul de zile fără confirmare de sosire)
  const overduePartClaims = useMemo(() => {
    return claims.filter((c) => c.status === "piese_comandate" && !c.pieseSosite && daysBetween(c.dataSchimbareStatus) > PART_OVERDUE_DAYS);
  }, [claims]);

  // Alerte și grupări dosare
  const attentionClaims = useMemo(() => claims.filter((c) => isStageOverdue(c) || c.blocat), [claims]);
  const inLucruClaims = useMemo(() => claims.filter((c) => c.status === "in_lucru"), [claims]);
  const programateClaims = useMemo(() => claims.filter((c) => c.status === "programat"), [claims]);

  const filteredClaims = useMemo(() => {
    let list = claims;

    // Filtru rapid din chips
    if (quickFilter === "atentie") list = attentionClaims;
    else if (quickFilter === "piese") list = overduePartClaims;
    else if (quickFilter === "programate") list = programateClaims;
    else if (quickFilter === "lucru") list = inLucruClaims;

    // Filtru sub-etapă
    if (selectedSubStatus) {
      list = list.filter((c) => c.status === selectedSubStatus);
    }

    return list;
  }, [claims, quickFilter, selectedSubStatus, attentionClaims, overduePartClaims, programateClaims, inLucruClaims]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2.5 font-sans text-[#1B2430]">

      {/* 1. ALERT BANNER AUTO-GENERAT (PIESE ÎNTÂRZIATE Overdue Threshold) */}
      {overduePartClaims.length > 0 && !dismissAlertBanner && (
        <div className="flex items-center justify-between gap-3 bg-[#FBEAE9] border border-[#EFC3C0] rounded-xl p-2.5 text-[12px] text-[#8C2E28] shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px]">🔔</span>
            <span>
              <b>{overduePartClaims.length} dosare</b> peste pragul de <b>{PART_OVERDUE_DAYS} zile</b> fără confirmare de sosire piese:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {overduePartClaims.map((c) => (
                <span key={c.id} className="bg-white border border-[#EFC3C0] px-2 py-0.5 rounded-full font-mono font-bold text-[11px] text-[#1B2430]">
                  {c.numarInmatriculare || "—"} · {daysBetween(c.dataSchimbareStatus)}z
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissAlertBanner(true)}
            className="text-[#8C2E28] hover:bg-[#EFC3C0]/40 p-1 rounded-md text-[13px] font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CONTROL STRIP & CHIPS FILTRARE */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap bg-white border border-[#E4E1D9] rounded-xl p-2 shadow-2xs">
        {/* Chips de filtrare rapidă */}
        <div className="flex items-center gap-2 flex-wrap text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "atentie" ? "toate" : "atentie")}
            className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              quickFilter === "atentie" ? "bg-[#1B2430] text-white border-[#1B2430]" : "bg-white border-[#E4E1D9] text-[#1B2430] hover:bg-[#F3F2EE]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D6473F]" />
            <span>Atenție</span>
            <span className="opacity-70">({attentionClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "piese" ? "toate" : "piese")}
            className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              quickFilter === "piese" ? "bg-[#1B2430] text-white border-[#1B2430]" : "bg-white border-[#E4E1D9] text-[#1B2430] hover:bg-[#F3F2EE]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D69A1E]" />
            <span>Piese întârziate</span>
            <span className="opacity-70">({overduePartClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "programate" ? "toate" : "programate")}
            className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              quickFilter === "programate" ? "bg-[#1B2430] text-white border-[#1B2430]" : "bg-white border-[#E4E1D9] text-[#1B2430] hover:bg-[#F3F2EE]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2E5C8A]" />
            <span>Programate</span>
            <span className="opacity-70">({programateClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "lucru" ? "toate" : "lucru")}
            className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
              quickFilter === "lucru" ? "bg-[#1B2430] text-white border-[#1B2430]" : "bg-white border-[#E4E1D9] text-[#1B2430] hover:bg-[#F3F2EE]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2F6B4E]" />
            <span>În lucru</span>
            <span className="opacity-70">({inLucruClaims.length})</span>
          </button>

          {selectedSubStatus && (
            <button
              type="button"
              onClick={() => setSelectedSubStatus(null)}
              className="px-2.5 py-0.5 rounded-full bg-[#D6473F] text-white font-bold text-[11px]"
            >
              Filtru sub-etapă ✕
            </button>
          )}
        </div>

        {/* Legendă Timp în Fază */}
        <div className="ml-auto hidden xl:flex items-center gap-3 text-[11px] text-[#5B6572] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#2F8F5B]" /> sub 2z
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#D69A1E]" /> 2–4z
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-[#D6473F]" /> peste 4z
          </span>
        </div>
      </div>

      {/* 3. VIZUALIZARE KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        {PIPELINE_PHASES.map((phase) => {
          const phaseClaims = filteredClaims.filter((c) => phase.statuses.includes(c.status));
          const phaseColors = PHASE_COLOR_MAP[phase.key] || { bg: "#1E2A44" };

          return (
            <div
              key={phase.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const claimId = e.dataTransfer.getData("text/plain");
                if (claimId && onMoveToStatus) {
                  const claim = claims.find((cl) => cl.id === claimId);
                  if (claim) onMoveToStatus(claim, phase.statuses[0]);
                }
              }}
              className="bg-white border border-[#E4E1D9] rounded-2xl overflow-hidden flex flex-col h-auto md:h-full shadow-2xs"
            >
              {/* Header Coloană Fază */}
              <div
                className="p-3 text-white shrink-0"
                style={{ background: phaseColors.bg }}
              >
                <div className="flex items-center justify-between font-extrabold text-[14px]">
                  <span>{phase.label}</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11.5px] font-mono">
                    {phaseClaims.length}
                  </span>
                </div>
                <div className="text-[11px] opacity-85 mt-0.5 leading-tight">
                  {phase.description}
                </div>
              </div>

              {/* Sub-steps Pills inside Phase Header */}
              <div className="flex items-center gap-1 flex-wrap p-2 bg-black/5 border-b border-[#E4E1D9]">
                {phase.statuses.map((stKey) => {
                  const stDef = getStatusDefinition(stKey);
                  const stCount = filteredClaims.filter((c) => c.status === stKey).length;
                  const isActive = selectedSubStatus === stKey;

                  return (
                    <button
                      key={stKey}
                      type="button"
                      onClick={() => setSelectedSubStatus(isActive ? null : stKey)}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-all ${
                        isActive
                          ? "bg-[#1B2430] text-white border-[#1B2430]"
                          : "bg-white/80 text-[#5B6572] border-[#E4E1D9] hover:bg-white"
                      }`}
                    >
                      {stDef.num}. {stDef.label} {stCount > 0 ? `(${stCount})` : ""}
                    </button>
                  );
                })}
              </div>

              {/* Zona cu cardurile din coloană */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {phaseClaims.length === 0 ? (
                  <div className="border-1.5 border-dashed border-[#E4E1D9] rounded-xl p-5 text-center text-[#5B6572] text-[12px] italic my-auto">
                    Niciun dosar în această fază
                  </div>
                ) : (
                  phaseClaims.map((c) => (
                    <PhaseCardRedesign
                      key={c.id}
                      claim={c}
                      onOpen={onOpen}
                      onMoveToStatus={onMoveToStatus}
                      onTogglePieseSosite={onTogglePieseSosite}
                      canEdit={canEditFn(c)}
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
