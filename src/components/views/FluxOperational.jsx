import React, { useState, useMemo } from "react";
import {
  Layers, AlertTriangle, PackageCheck, CalendarClock, Car, Truck,
  ChevronRight, ArrowRight, Clock, MessageSquare, ExternalLink,
  Search, Check
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";

// Culori oficiale per fază din redesign
const PHASE_COLOR_MAP = {
  start: { bg: "#1E2A44", soft: "#E9EBF1" },
  eval:  { bg: "#2E5C8A", soft: "#E7EEF5" },
  lucru: { bg: "#B8791E", soft: "#FBF0DE" },
  final: { bg: "#2F6B4E", soft: "#E7F1EC" },
};

function getOperatorInitials(name) {
  if (!name) return "OP";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// KANBAN CARD REDESIGN
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, canEdit, pragRidicare }) {
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = isStageOverdue(claim);
  const phaseColors = getPhaseColors(claim.status);
  const phaseColorHex = PHASE_COLOR_MAP[statusDef.phase]?.bg || "#1E2A44";

  const currentIndex = STATUSES.findIndex((s) => s.key === claim.status);
  const nextStatus = currentIndex < STATUSES.length - 1 ? STATUSES[currentIndex + 1] : null;

  // Calcul stare aging (sub 2 zile = ok, 2-4 zile = warn, peste 4 zile sau intarziat = danger)
  let agingClass = "bg-[#E9F5EE] text-[#2F8F5B]";
  if (days >= 2 && days <= 4) agingClass = "bg-[#FCF3DF] text-[#D69A1E]";
  if (days > 4 || overdue || claim.blocat) agingClass = "bg-[#FBEAE9] text-[#D6473F]";

  const commentsCount = (claim.poze?.length || 0) + (claim.documente?.length || 0);

  return (
    <div
      id={`claim-card-${claim.id}`}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(claim)}
      className={`card group relative bg-white border border-[#E4E1D9] rounded-xl p-3 shadow-xs transition-all duration-150 cursor-pointer select-none space-y-2.5 hover:shadow-md ${
        claim.blocat || overdue ? "border-[#EAC3C0] bg-gradient-to-b from-[#FBEAE9]/60 to-white" : "hover:border-[#1B2430]"
      }`}
    >
      {/* 1. TOP ROW: Nr. Înmatriculare + Asigurare Badge + Vehicul */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-[13.5px] text-[#1B2430] tracking-tight group-hover:text-[#B8791E] transition-colors truncate">
            {claim.numarInmatriculare || "FĂRĂ NR."}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              claim.tipAsigurare === "CASCO"
                ? "bg-[#F4E3C6] text-[#8A5A0E]"
                : "bg-[#DDE7F0] text-[#2E5C8A]"
            }`}
          >
            {claim.tipAsigurare || "RCA"}
          </span>
        </div>
        <span className="text-[11.5px] text-[#5B6572] font-medium truncate max-w-[110px]" title={claim.marcaModel || claim.client}>
          {claim.marcaModel || claim.client || "—"}
        </span>
      </div>

      {/* 2. VISUAL STEPPER (11 SEGMENTE) */}
      <div className="space-y-1">
        <div className="flex items-center gap-0.5 h-1.5 w-full bg-[#E4E1D9] rounded-full overflow-hidden p-0.5">
          {STATUSES.map((s, idx) => {
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={s.key}
                className="h-full flex-1 rounded-sm transition-all"
                style={{
                  background: isDone || isCurrent ? phaseColorHex : "#E4E1D9",
                  opacity: isCurrent ? 1 : isDone ? 0.75 : 0.3
                }}
              />
            );
          })}
        </div>
        <div className="text-[11px] font-bold text-[#1B2430] flex items-center justify-between">
          <span>
            <span className="text-[#5B6572] font-semibold">{statusDef.num}/11</span> · {statusDef.label}
          </span>
          {claim.blocat && <span className="text-[#D6473F] text-[10px] font-extrabold">🛑 BLOCAT</span>}
        </div>
      </div>

      {/* 3. CARD FOOTER: AGING + TECH + COMMENTS + ADVANCE BUTTON */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#E4E1D9]/60 text-[10.5px]">
        {/* Aging Pill */}
        <span className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${agingClass}`}>
          <Clock size={11} /> {days} zile
        </span>

        {/* Responsabil Tech Bubble */}
        <span
          className="w-6 h-6 rounded-full bg-[#EEE9DC] text-[#5B4A2A] text-[10px] font-extrabold flex items-center justify-center font-sans shadow-2xs shrink-0"
          title={`Responsabil: ${claim.operator || "Operator"}`}
        >
          {getOperatorInitials(claim.operator)}
        </span>

        {/* WhatsApp & Comments */}
        <div className="flex items-center gap-1 text-[#5B6572] font-semibold" onClick={(e) => e.stopPropagation()}>
          {claim.telefonClient && <WhatsAppButton phone={claim.telefonClient} claim={claim} size={10} />}
          {commentsCount > 0 && (
            <span className="flex items-center gap-0.5 ml-1 text-[11px]">
              💬 {commentsCount}
            </span>
          )}
        </div>

        <span className="flex-1" />

        {/* 1-Click Advance Button (Avansare rapidă cu 1 singur click) */}
        {nextStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToStatus(claim, nextStatus.key);
            }}
            className="w-7 h-7 rounded-lg bg-[#B8791E] hover:bg-[#9E6517] text-white flex items-center justify-center text-[13px] font-bold shadow-2xs transition-all active:scale-90"
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
  onAddInStatus,
  onDuplicate,
  canEditFn,
  pragRidicare,
  quickFilter,
  setQuickFilter
}) {
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const alertClaims = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const attentionClaims = useMemo(() => claims.filter((c) => isStageOverdue(c) || c.blocat), [claims]);
  const inLucruClaims = useMemo(() => claims.filter((c) => c.adusaFizic && !c.gataDeRidicare && !c.ridicata && c.status !== "facturat"), [claims]);
  const pieseSositeClaims = useMemo(() => claims.filter((c) => c.status === "piese_sosite"), [claims]);
  const programateClaims = useMemo(() => claims.filter((c) => c.status === "programat"), [claims]);

  const filteredClaims = useMemo(() => {
    let list = claims;

    // Filtru rapid din chips
    if (quickFilter === "atentie") list = attentionClaims;
    else if (quickFilter === "piese") list = pieseSositeClaims;
    else if (quickFilter === "programate") list = programateClaims;
    else if (quickFilter === "lucru") list = inLucruClaims;

    // Filtru sub-etapă
    if (selectedSubStatus) {
      list = list.filter((c) => c.status === selectedSubStatus);
    }

    // Căutare rapidă text
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(q)) ||
          (c.numarDosar && c.numarDosar.toLowerCase().includes(q)) ||
          (c.client && c.client.toLowerCase().includes(q)) ||
          (c.marcaModel && c.marcaModel.toLowerCase().includes(q))
      );
    }

    return list;
  }, [claims, quickFilter, selectedSubStatus, searchTerm, attentionClaims, pieseSositeClaims, programateClaims, inLucruClaims]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 font-sans text-[#1B2430]">
      
      {/* 1. TOP BAR INTEGRAT */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-[#E4E1D9] rounded-xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2 font-extrabold text-[15px]">
          <span>Workflow Dosare</span>
          <span className="text-[#5B6572] font-normal">›</span>
          <span className="bg-[#B8791E] text-white px-3.5 py-1 rounded-lg text-[13px] font-bold">
            Flux Operațional
          </span>
        </div>

        {/* Căutare rapidă */}
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search size={15} className="absolute left-3 top-2.5 text-[#5B6572]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută după nr. înmatriculare, client..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E4E1D9] text-[13px] bg-white focus:outline-none focus:border-[#B8791E] font-medium"
          />
        </div>
      </div>

      {/* 2. CONTROL STRIP & CHIPS FILTRARE */}
      <div className="flex items-center gap-2.5 flex-wrap bg-white border border-[#E4E1D9] rounded-xl p-2.5 shadow-2xs">
        {/* Toggle Vizualizare Kanban vs Listă */}
        <div className="flex bg-[#F3F2EE] p-1 rounded-lg gap-1 border border-[#E4E1D9]">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1 rounded-md text-[12.5px] font-bold transition-all ${
              viewMode === "kanban" ? "bg-[#1B2430] text-white shadow-xs" : "text-[#5B6572] hover:text-[#1B2430]"
            }`}
          >
            ▦ Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-md text-[12.5px] font-bold transition-all ${
              viewMode === "list" ? "bg-[#1B2430] text-white shadow-xs" : "text-[#5B6572] hover:text-[#1B2430]"
            }`}
          >
            ☰ Listă
          </button>
        </div>

        <div className="w-[1px] h-6 bg-[#E4E1D9]" />

        {/* Chips de filtrare rapidă */}
        <div className="flex items-center gap-2 flex-wrap text-[12.5px] font-semibold">
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
            <span>Piese sosite</span>
            <span className="opacity-70">({pieseSositeClaims.length})</span>
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
              className="px-3 py-1 rounded-full bg-[#D6473F] text-white font-bold text-[11.5px]"
            >
              Filtru sub-etapă ✕
            </button>
          )}
        </div>

        {/* Legendă Timp în Fază */}
        <div className="ml-auto hidden xl:flex items-center gap-3.5 text-[11.5px] text-[#5B6572] font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2F8F5B]" /> sub 2 zile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D69A1E]" /> 2–4 zile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D6473F]" /> peste 4 zile
          </span>
        </div>
      </div>

      {/* 3. VIZUALIZARE KANBAN BOARD */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
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
                  className="p-3.5 text-white shrink-0"
                  style={{ background: phaseColors.bg }}
                >
                  <div className="flex items-center justify-between font-extrabold text-[14.5px]">
                    <span>{phase.label}</span>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[12px] font-mono">
                      {phaseClaims.length}
                    </span>
                  </div>
                  <div className="text-[11.5px] opacity-85 mt-0.5 leading-tight">
                    {phase.description}
                  </div>
                </div>

                {/* Sub-steps Pills inside Phase Header */}
                <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-black/5 border-b border-[#E4E1D9]">
                  {phase.statuses.map((stKey) => {
                    const stDef = getStatusDefinition(stKey);
                    const stCount = filteredClaims.filter((c) => c.status === stKey).length;
                    const isActive = selectedSubStatus === stKey;
                    return (
                      <button
                        key={stKey}
                        type="button"
                        onClick={() => setSelectedSubStatus(isActive ? null : stKey)}
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
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
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                  {phaseClaims.length === 0 ? (
                    <div className="border-1.5 border-dashed border-[#E4E1D9] rounded-xl p-6 text-center text-[#5B6572] text-[12.5px] italic my-auto">
                      Niciun dosar în această fază
                    </div>
                  ) : (
                    phaseClaims.map((c) => (
                      <PhaseCardRedesign
                        key={c.id}
                        claim={c}
                        onOpen={onOpen}
                        onMoveToStatus={onMoveToStatus}
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
      )}

      {/* 4. VIZUALIZARE LISTĂ TABELARĂ (LIST VIEW) */}
      {viewMode === "list" && (
        <div className="bg-white border border-[#E4E1D9] rounded-2xl overflow-hidden shadow-xs flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#F3F2EE] border-b border-[#E4E1D9] text-[#5B6572] text-[11px] uppercase tracking-wider font-extrabold">
                <th className="p-3">Nr. Înmatriculare</th>
                <th className="p-3">Asigurare</th>
                <th className="p-3">Vehicul / Client</th>
                <th className="p-3">Fază</th>
                <th className="p-3">Progres (11 Pași)</th>
                <th className="p-3">Timp în Fază</th>
                <th className="p-3">Responsabil</th>
                <th className="p-3 text-right">Acțiune</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1D9]">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#5B6572] italic">
                    Niciun dosar găsit pentru criteriile selectate.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((c) => {
                  const statusDef = getStatusDefinition(c.status);
                  const days = daysBetween(c.dataSchimbareStatus);
                  const phaseColorHex = PHASE_COLOR_MAP[statusDef.phase]?.bg || "#1E2A44";
                  const currentIndex = STATUSES.findIndex((s) => s.key === c.status);
                  const nextStatus = currentIndex < STATUSES.length - 1 ? STATUSES[currentIndex + 1] : null;

                  let agingClass = "bg-[#E9F5EE] text-[#2F8F5B]";
                  if (days >= 2 && days <= 4) agingClass = "bg-[#FCF3DF] text-[#D69A1E]";
                  if (days > 4 || c.blocat) agingClass = "bg-[#FBEAE9] text-[#D6473F]";

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onOpen(c)}
                      className="hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-[13px] text-[#1B2430]">
                        {c.numarInmatriculare || "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.tipAsigurare === "CASCO"
                              ? "bg-[#F4E3C6] text-[#8A5A0E]"
                              : "bg-[#DDE7F0] text-[#2E5C8A]"
                          }`}
                        >
                          {c.tipAsigurare || "RCA"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#1B2430]">
                        <div>{c.marcaModel || "—"}</div>
                        <div className="text-[11px] text-[#5B6572] font-normal">{c.client || "Client neintrodus"}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-full text-white inline-block shadow-2xs"
                          style={{ background: phaseColorHex }}
                        >
                          {statusDef.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-0.5 w-24 h-1.5 bg-[#E4E1D9] rounded overflow-hidden p-0.5">
                          {STATUSES.map((s, idx) => (
                            <div
                              key={s.key}
                              className="flex-1 h-full rounded-xs"
                              style={{
                                background: idx <= currentIndex ? phaseColorHex : "#E4E1D9",
                                opacity: idx === currentIndex ? 1 : idx < currentIndex ? 0.7 : 0.3
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${agingClass}`}>
                          ⏱ {days} zile
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="w-6 h-6 rounded-full bg-[#EEE9DC] text-[#5B4A2A] text-[10px] font-extrabold flex items-center justify-center font-sans">
                          {getOperatorInitials(c.operator)}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {nextStatus && (
                          <button
                            type="button"
                            onClick={() => onMoveToStatus(c, nextStatus.key)}
                            className="w-7 h-7 rounded-lg bg-[#B8791E] hover:bg-[#9E6517] text-white font-bold text-[13px] inline-flex items-center justify-center shadow-2xs transition-transform active:scale-90"
                            title={`1-Click Avansează în „${nextStatus.label}”`}
                          >
                            →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
