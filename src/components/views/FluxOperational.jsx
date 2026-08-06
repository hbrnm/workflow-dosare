import React, { useState, useMemo } from "react";
import {
  Clock, Bell, Phone, ChevronDown, ChevronUp
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, isPieseComandateStatus, getStatusAlertDays, getClaimAlertDays } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue, isDeliveryDeadlineOverdue, isPartsOrderOverdue, getDaysPastDeliveryDeadline } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";

// Culori oficiale per fază din redesign
const PHASE_COLOR_MAP = {
  start: { bg: "#1E2A44", soft: "#E9EBF1" },
  eval:  { bg: "#2E5C8A", soft: "#E7EEF5" },
  lucru: { bg: "#B8791E", soft: "#FBF0DE" },
  final: { bg: "#2F6B4E", soft: "#E7F1EC" },
};

const copyClaimNumber = async (numarDosar, onNotify) => {
  if (!numarDosar?.trim()) return;
  try {
    await navigator.clipboard.writeText(numarDosar.trim());
    onNotify?.(`Nr. dosar copiat: ${numarDosar.trim()}`, "success");
  } catch {
    onNotify?.("Nu am putut copia în clipboard.", "error");
  }
};

const SHORT_STATUS_LABELS = {
  deschidere: "1.Acord",
  reconstatare: "2.Reconst",
  accept_plata: "3.Accept",
  piese_comandate: "4.Piese",
  programat: "5.Progr",
  in_lucru: "6.Lucru",
  gata_de_ridicare: "7.Gata",
  predat_client: "8.Predat",
  facturat: "9.Fact",
};

// ---------------------------------------------------------------------------
// KANBAN CARD REDESIGN (OPTIMIZAT COMPACT PE VERTICALĂ)
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEdit, pragRidicare, onNotify }) {
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = isStageOverdue(claim);
  const alertThreshold = getClaimAlertDays(claim);
  const phaseColorHex = PHASE_COLOR_MAP[statusDef.phase]?.bg || "#1E2A44";

  const currentStatusKey = statusDef.key;
  const currentIndex = Math.max(0, STATUSES.findIndex((s) => s.key === currentStatusKey));

  let agingClass = "text-[#5B6572]";
  if (days >= 3 && days <= 5) agingClass = "bg-[#FCF3DF] text-[#D69A1E]";
  if (days > 5 || overdue || claim.blocat) agingClass = "bg-[#FBEAE9] text-[#D6473F]";

  const pieseAlertDays = getStatusAlertDays("piese_comandate");
  const isPartOverdue = isPartsOrderOverdue(claim, pieseAlertDays);
  const termenDepasit = isDeliveryDeadlineOverdue(claim);

  return (
    <div
      id={`claim-card-${claim.id}`}
      draggable={true}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && claim.numarDosar) {
          e.preventDefault();
          e.stopPropagation();
          copyClaimNumber(claim.numarDosar, onNotify);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(claim)}
      className={`card group relative bg-white border rounded-xl p-2.5 shadow-xs transition-all duration-150 cursor-pointer select-none space-y-1.5 hover:shadow-md ${
        claim.blocat || overdue
          ? "border-[#EAC3C0] bg-gradient-to-b from-[#FBEAE9]/60 to-white"
          : "border-[#E4E1D9] hover:border-[#1B2430]"
      }`}
    >
      {/* 1. TOP ROW: Nr. Înmatriculare + Asigurare Badge + Vehicul */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-[13px] text-[#1B2430] tracking-tight group-hover:text-[#B8791E] transition-colors truncate">
            {claim.numarInmatriculare || "FĂRĂ NR."}
          </span>
          {claim.numarDosar && (
            <span
              role="button"
              tabIndex={0}
              className="text-[10px] font-mono text-[#8A8375] hover:text-[#C98A2B] cursor-copy select-all"
              title={`Dosar #${claim.numarDosar} — Ctrl+C sau click pentru copiere`}
              onClick={(e) => {
                e.stopPropagation();
                copyClaimNumber(claim.numarDosar, onNotify);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  copyClaimNumber(claim.numarDosar, onNotify);
                }
              }}
            >
              #{claim.numarDosar}
            </span>
          )}
          {/* Tip asigurare — discret, doar relevant vizual */}
          <span
            className={`text-[9px] font-bold px-1 py-0.2 rounded ${
              claim.tipAsigurare === "CASCO"
                ? "bg-[#F4E3C6] text-[#8A5A0E]"
                : "text-[#8A8375]"  
            }`}
          >
            {claim.tipAsigurare || "RCA"}
          </span>
        </div>
        <span className="text-[11px] text-[#5B6572] font-medium truncate max-w-[110px]" title={claim.marcaModel || claim.client}>
          {claim.marcaModel || claim.client || "—"}
        </span>
      </div>

      {/* 2. BARA VIZUALĂ DE PROGRES & SELEKTOR UNIC DE STADIU */}
      <div className="space-y-1 my-0.5" onClick={(e) => e.stopPropagation()}>
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
                  opacity: isCurrent ? 1 : isDone ? 0.75 : 0.35,
                }}
              />
            );
          })}
        </div>

        <div className="text-[10.5px] font-bold text-[#1B2430] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[#5B6572] font-semibold">{statusDef.num}/9</span> ·
            <select
              value={claim.status}
              onChange={(e) => {
                e.stopPropagation();
                onMoveToStatus(claim, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-md px-2 py-0.5 font-extrabold text-[#1B2430] text-[11px] cursor-pointer hover:bg-white focus:outline-none transition-colors shadow-2xs"
              title="Alege stadiul dosarului din listă"
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.num}. {s.label}
                </option>
              ))}
            </select>
          </div>

          {claim.blocat && <span className="text-[#D6473F] text-[9.5px] font-extrabold">🛑 BLOCAT</span>}
        </div>
      </div>

      {/* 3. CHECKBOX INTERACTIV PIESE SOSITE (+ Programare) */}
      {isPieseComandateStatus(claim.status) && (
        <MobilePieseSositeRow
          claim={claim}
          canEdit={canEdit}
          compact
          onToggle={(c, val) => onTogglePieseSosite?.(c, val)}
          onSchedule={onScheduleFromPiese}
          onPatchDates={onPatchPieseDates}
        />
      )}

      {/* 4. PART OVERDUE ALERT BANNER ON CARD */}
      {isPartOverdue && (
        <div className="flex items-center gap-1 bg-[#FBEAE9] text-[#8C2E28] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-[#EFC3C0]">
          <Bell size={10} className="shrink-0 animate-bounce" />
          <span>
            {termenDepasit
              ? `Termen livrare depășit (+${getDaysPastDeliveryDeadline(claim)}z) — verifică stocul`
              : `Fără confirmare sosire (${days} zile)`}
          </span>
        </div>
      )}

      {/* 5. FOOTER CURAT: AGING + APEL & WHATSAPP */}
      <div className="flex items-center justify-between pt-1 border-t border-[#E4E1D9]/60 text-[10px]">
        <span className={`font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${agingClass}`}>
          <Clock size={10} /> {days}z / {alertThreshold}z
        </span>

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
      </div>

    </div>
  );
}

function StackedPhaseCardGroup({ groupKey, groupClaims, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEditFn, pragRidicare, onNotify }) {
  const [expanded, setExpanded] = useState(false);
  const first = groupClaims[0];
  const plate = first.numarInmatriculare || groupKey;
  const brand = first.marcaModel || first.client || "";

  if (groupClaims.length === 1) {
    return (
      <PhaseCardRedesign
        claim={first}
        onOpen={onOpen}
        onMoveToStatus={onMoveToStatus}
        onTogglePieseSosite={onTogglePieseSosite}
        onScheduleFromPiese={onScheduleFromPiese}
        onPatchPieseDates={onPatchPieseDates}
        canEdit={canEditFn(first)}
        pragRidicare={pragRidicare}
        onNotify={onNotify}
      />
    );
  }

  return (
    <div className="border-2 border-[#1B2430]/30 rounded-xl p-1.5 bg-[#F4F6F8] space-y-1.5 shadow-xs">
      {/* Header Comasat Interactiv */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between bg-white p-2 rounded-lg border border-[#E4E1D9] hover:border-[#1B2430] cursor-pointer select-none transition-colors"
        title={expanded ? "Restrânge dosarele" : "Apasă pentru a deschide toate cele 3 dosare comasate"}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-extrabold text-[13px] text-[#1B2430] uppercase">
            🚗 {plate}
          </span>
          <span className="text-[11px] text-[#5B6572] font-semibold truncate max-w-[120px]">
            {brand}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-[#B8791E] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
            {groupClaims.length} dosare
          </span>
          <span className="text-[#1B2430] font-bold text-[12px] flex items-center gap-0.5">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Când este restrâns */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          className="bg-white/80 border border-dashed border-[#E4E1D9] p-2 rounded-lg text-[11px] text-[#1B2430] font-bold text-center flex items-center justify-center gap-1 cursor-pointer hover:bg-white transition-colors"
        >
          <span>Apasă pentru a deschide cele {groupClaims.length} dosare comasate</span>
          <ChevronDown size={13} />
        </div>
      )}

      {/* Când este extins */}
      {expanded && (
        <div className="space-y-1.5 pt-1 border-t border-[#1B2430]/15">
          {groupClaims.map((c) => (
            <PhaseCardRedesign
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              onTogglePieseSosite={onTogglePieseSosite}
              onScheduleFromPiese={onScheduleFromPiese}
              onPatchPieseDates={onPatchPieseDates}
              canEdit={canEditFn(c)}
              pragRidicare={pragRidicare}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}
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
  onScheduleFromPiese,
  onPatchPieseDates,
  onAddInStatus,
  onDuplicate,
  canEditFn,
  pragRidicare,
  quickFilter,
  setQuickFilter,
  onNotify,
}) {
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);
  const pieseAlertDays = getStatusAlertDays("piese_comandate");

  const overduePartClaims = useMemo(() => {
    return claims.filter((c) => isPartsOrderOverdue(c, pieseAlertDays));
  }, [claims, pieseAlertDays]);

  const overdueDeliveryClaims = useMemo(() => {
    return claims.filter(isDeliveryDeadlineOverdue);
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
              <b>{overduePartClaims.length} dosare</b> necesită verificare piese
              {overdueDeliveryClaims.length > 0 && (
                <> — <b>{overdueDeliveryClaims.length}</b> cu termen livrare depășit (verifică stocul fizic)</>
              )}
              {overdueDeliveryClaims.length === 0 && (
                <> — peste pragul de <b>{pieseAlertDays} zile</b> fără confirmare</>
              )}
              :
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {overduePartClaims.map((c) => (
                <span key={c.id} className="bg-white border border-[#EFC3C0] px-2 py-0.5 rounded-full font-mono font-bold text-[11px] text-[#1B2430]">
                  {c.numarInmatriculare || "—"}
                  {isDeliveryDeadlineOverdue(c)
                    ? ` · livrare +${getDaysPastDeliveryDeadline(c)}z`
                    : ` · ${daysBetween(c.dataSchimbareStatus)}z`}
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

              {/* Zona cu cardurile din coloană Comasate pe Vehicul */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {(() => {
                  const groupedMap = new Map();
                  phaseClaims.forEach((c) => {
                    const plate = (c.numarInmatriculare || "").trim().toUpperCase();
                    const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
                    if (!groupedMap.has(key)) groupedMap.set(key, []);
                    groupedMap.get(key).push(c);
                  });

                  const groups = Array.from(groupedMap.entries());

                  if (groups.length === 0) {
                    return (
                      <div className="border-1.5 border-dashed border-[#E4E1D9] rounded-xl p-5 text-center text-[#5B6572] text-[12px] italic my-auto">
                        Niciun dosar în această fază
                      </div>
                    );
                  }

                  return groups.map(([groupKey, groupClaims]) => (
                    <StackedPhaseCardGroup
                      key={groupKey}
                      groupKey={groupKey}
                      groupClaims={groupClaims}
                      onOpen={onOpen}
                      onMoveToStatus={onMoveToStatus}
                      onTogglePieseSosite={onTogglePieseSosite}
                      onScheduleFromPiese={onScheduleFromPiese}
                      onPatchPieseDates={onPatchPieseDates}
                      canEditFn={canEditFn}
                      pragRidicare={pragRidicare}
                      onNotify={onNotify}
                    />
                  ));
                })()}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
