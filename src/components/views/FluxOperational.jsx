import React, { useState, useMemo } from "react";
import {
  Layers, AlertTriangle, AlertOctagon, PackageCheck, Car, Phone,
  ChevronDown, Check, Clock, Copy, CalendarClock, Truck,
  Minimize2, Maximize2, ExternalLink, ArrowRight, ArrowLeft,
  ChevronRight, Sparkles, MessageCircle, ShieldAlert, LayoutList, LayoutGrid
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";

export function PhaseCard({ claim, onOpen, onMoveToStatus, onDuplicate, canEdit, pragRidicare, compactMode = true }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = isStageOverdue(claim);
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = isReadyForPickupOverdue(claim, pragRidicare || 3);

  const currentIndex = STATUSES.findIndex((s) => s.key === claim.status);
  const prevStatus = currentIndex > 0 ? STATUSES[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUSES.length - 1 ? STATUSES[currentIndex + 1] : null;

  // MOD ULTRA-COMPACT 1-RÂND (15+ DOSARE VISIBILE PE ECRAN FĂRĂ SCROLL)
  if (compactMode) {
    return (
      <div
        id={`claim-card-${claim.id}`}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", claim.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => onOpen(claim)}
        className={`group flex items-center justify-between gap-1.5 py-1 px-2 rounded-lg border transition-all text-[11px] cursor-pointer select-none hover:shadow-xs ${
          claim.blocat
            ? "bg-red-50/70 border-[#B23A2E] text-[#B23A2E] font-bold"
            : overdue
            ? "bg-amber-50/50 border-[#C98A2B]"
            : "bg-white border-[#DAD4C6] hover:border-[#2C4160]"
        }`}
        style={{ borderLeftWidth: 3.5, borderLeftColor: getPhaseColors(claim.status).bar }}
      >
        {/* Nr Înmatriculare & Tip Asigurare & Model */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono font-extrabold text-[11.5px] text-[#23282E] group-hover:text-[#C98A2B] transition-colors truncate shrink-0">
            {claim.numarInmatriculare || "(fără nr)"}
          </span>
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
          <span className="text-[10.5px] text-[#6B6558] font-semibold truncate hidden sm:inline">
            {claim.marcaModel || claim.client || "—"}
          </span>
        </div>

        {/* Badges alerte (Blocat / Auto Schimb / Zile) */}
        <div className="flex items-center gap-1 shrink-0">
          {claim.blocat && (
            <span className="text-[9px] bg-[#B23A2E] text-white px-1 py-0.2 rounded font-extrabold flex items-center gap-0.5">
              <AlertOctagon size={9} /> Blocat
            </span>
          )}
          {claim.masinaSchimb && (
            <span className="text-[9px] bg-[#FBF3E6] text-[#7A5316] border border-[#C98A2B]/40 px-1 py-0.2 rounded font-bold">
              🚗 Auto
            </span>
          )}
          <span className="font-mono text-[9.5px] text-[#8A8375] bg-[#FAF8F5] px-1 rounded border border-[#DAD4C6] font-semibold">
            {days}z
          </span>
        </div>

        {/* Acțiuni rapide de 1-Click: WhatsApp + Schimbă Status + Avansează */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {claim.telefonClient && <WhatsAppButton phone={claim.telefonClient} claim={claim} size={10} />}

          {/* Popover selectare etapă */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
              className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-white text-[10px] font-bold text-[#23282E] flex items-center gap-0.5"
              title="Apasă pentru a alege etapa"
            >
              <span className="font-mono text-[9px] text-[#8A8375]">{statusDef.num}.</span>
              <span className="truncate max-w-[85px]">{statusDef.label}</span>
              <ChevronDown size={10} className="text-[#8A8375]" />
            </button>

            {showStatusPicker && (
              <>
                <div
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-[#DAD4C6] shadow-2xl p-1 text-[11px] space-y-0.5 w-48 max-h-56 overflow-y-auto scrollbar-thin"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-0.5 text-[9.5px] font-extrabold text-[#8A8375] uppercase border-b border-[#EFEAE1]">
                    Schimbă etapa:
                  </div>
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStatus(claim, s.key);
                        setShowStatusPicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-left transition-colors font-medium text-[10.5px] ${
                        claim.status === s.key ? "bg-[#2C4160] text-white font-bold" : "hover:bg-[#EEF5EE] text-[#23282E]"
                      }`}
                    >
                      <span className="truncate">{s.num}. {s.label}</span>
                      {claim.status === s.key && <Check size={11} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 1-Click Avansează */}
          {nextStatus && (
            <button
              type="button"
              onClick={() => onMoveToStatus(claim, nextStatus.key)}
              className="p-1 rounded bg-[#C98A2B] hover:bg-[#B37A22] text-white font-extrabold text-[10px] shadow-2xs transition-all active:scale-95 flex items-center gap-0.5"
              title={`1-Click Avansează în „${nextStatus.label}”`}
            >
              <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // MOD CARD DETALIAT (OPȚIONAL VIA TOGGLE HEADER)
  return (
    <div
      id={`claim-card-${claim.id}`}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(claim)}
      className={`group relative bg-white rounded-xl border p-3 text-[11.5px] transition-all duration-200 hover:shadow-lg cursor-pointer select-none space-y-2 ${
        claim.blocat
          ? "border-[#B23A2E] ring-2 ring-[#B23A2E]/20 bg-red-50/10"
          : overdue
          ? "border-[#C98A2B] ring-1 ring-[#C98A2B]/30"
          : "border-[#DAD4C6] hover:border-[#2C4160]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
    >
      <div className="flex items-start justify-between gap-1 border-b border-[#EFEAE1] pb-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-extrabold text-[13px] text-[#23282E] group-hover:text-[#C98A2B] transition-colors truncate">
              {claim.numarInmatriculare || "FĂRĂ NR."}
            </span>
            <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
          </div>
          <span className="text-[10.5px] font-mono text-[#8A8375] font-semibold mt-0.5 truncate">
            Dosar: {claim.numarDosar || "—"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {overdue && <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(claim); }}
            title="Deschide dosar complet"
            className="p-1 rounded-md hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-0.5 text-[11px]">
        <div className="flex items-center justify-between text-[#23282E] font-bold">
          <span className="truncate" title={claim.client}>{claim.client || "Client neintrodus"}</span>
          <span className="text-[10px] text-[#6B6558] font-mono shrink-0">{claim.marcaModel || claim.asigurator || "—"}</span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-[#EFEAE1] flex items-center justify-between gap-1">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {claim.telefonClient && <WhatsAppButton phone={claim.telefonClient} claim={claim} size={11} />}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {nextStatus && (
            <button
              type="button"
              onClick={() => onMoveToStatus(claim, nextStatus.key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C98A2B] hover:bg-[#B37A22] text-white font-extrabold text-[11px] shadow-2xs transition-all"
            >
              <span>Avansează</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TablouPeFaze({
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
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [compactMode, setCompactMode] = useState(true); // Default: Ultra-compact (15+ claims per column without scroll)
  const [mobileExpandedPhases, setMobileExpandedPhases] = useState({ start: true });

  const togglePhaseMobile = (phaseKey) => {
    setMobileExpandedPhases((prev) => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  };

  const alertClaims = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const attentionClaims = useMemo(() => claims.filter((c) => isStageOverdue(c) || c.blocat), [claims]);
  const inLucruClaims = useMemo(() => claims.filter((c) => c.adusaFizic && !c.gataDeRidicare && !c.ridicata && c.status !== "facturat"), [claims]);
  const pieseSositeClaims = useMemo(() => claims.filter((c) => c.status === "piese_sosite"), [claims]);
  const programateClaims = useMemo(() => claims.filter((c) => c.status === "programat"), [claims]);
  const gataRidicareIntarziateClaims = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare || 3)), [claims, pragRidicare]);

  const claimsForCounts = useMemo(() => {
    let list = claims;
    if (quickFilter === "intarziate") list = alertClaims;
    else if (quickFilter === "atentie") list = attentionClaims;
    else if (quickFilter === "in_lucru") list = inLucruClaims;
    else if (quickFilter === "piese_sosite") list = pieseSositeClaims;
    else if (quickFilter === "programate") list = programateClaims;
    else if (quickFilter === "gata_ridicare_intarziate") list = gataRidicareIntarziateClaims;

    return list;
  }, [claims, quickFilter, alertClaims, attentionClaims, inLucruClaims, pieseSositeClaims, programateClaims, gataRidicareIntarziateClaims]);

  const displayClaims = useMemo(() => {
    let list = claimsForCounts;
    if (selectedSubStatus) {
      list = list.filter((c) => c.status === selectedSubStatus);
    }
    return list;
  }, [claimsForCounts, selectedSubStatus]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
      
      {/* HEADER DE TRIAJ RAPID FLUX OPERAȚIONAL */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] px-3.5 py-2 shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setQuickFilter("toate"); setSelectedSubStatus(null); }}
            className="font-bold text-[#23282E] text-[13.5px] flex items-center gap-1.5 hover:text-[#C98A2B] transition-colors"
            title="Arată toate dosarele"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Layers size={17} className="text-[#C98A2B]" />
            <span>Flux Operațional Kanban</span>
          </button>
          <span className="text-[11px] font-mono font-extrabold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#2C4160]">
            {displayClaims.length} / {claims.length} dosare
          </span>

          {/* TOGGLE AFISARE COMPACTĂ (15+ DOSARE FĂRĂ SCROLL) VS CARDURI */}
          <button
            type="button"
            onClick={() => setCompactMode(!compactMode)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 ${
              compactMode ? "bg-[#2C4160] text-white border-[#2C4160]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"
            }`}
            title={compactMode ? "Comută pe carduri detaliate" : "Comută pe modul ultra-compact (15+ dosare pe ecran fără scroll)"}
          >
            {compactMode ? <LayoutList size={13} /> : <LayoutGrid size={13} />}
            <span>{compactMode ? "Mod Compact 1-Rând" : "Mod Carduri"}</span>
          </button>
        </div>

        {/* BUTOANE DE TRIAJ RAPID PE FLUX */}
        <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setQuickFilter(quickFilter === "atentie" ? "toate" : "atentie")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              quickFilter === "atentie"
                ? "bg-[#B23A2E] text-white shadow-xs"
                : "bg-red-50 text-[#B23A2E] border border-red-200 hover:bg-red-100"
            }`}
          >
            <AlertTriangle size={12} /> Atenție ({attentionClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "piese_sosite" ? "toate" : "piese_sosite")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              quickFilter === "piese_sosite"
                ? "bg-[#C98A2B] text-white shadow-xs"
                : "bg-amber-50 text-[#7A5316] border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <PackageCheck size={12} /> Piese Sosite ({pieseSositeClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "programate" ? "toate" : "programate")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              quickFilter === "programate"
                ? "bg-[#3B5166] text-white shadow-xs"
                : "bg-blue-50 text-[#2C4160] border border-blue-200 hover:bg-blue-100"
            }`}
          >
            <CalendarClock size={12} /> Programate ({programateClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "in_lucru" ? "toate" : "in_lucru")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
              quickFilter === "in_lucru"
                ? "bg-[#3B5166] text-white shadow-xs"
                : "bg-[#EEF1F3] text-[#3B5166] border border-[#DAD4C6] hover:bg-[#E2E7EB]"
            }`}
          >
            <Car size={12} /> În lucru ({inLucruClaims.length})
          </button>

          {/* Reset Sub-status Filter */}
          {selectedSubStatus && (
            <button
              onClick={() => setSelectedSubStatus(null)}
              className="px-2.5 py-1 rounded-lg font-extrabold transition-all bg-[#B23A2E] text-white hover:bg-[#922D24] shadow-xs flex items-center gap-1 text-[11px] whitespace-nowrap"
              title="Resetează filtrul de etapă selectat"
            >
              <span>{getStatusDefinition(selectedSubStatus).label} ✕</span>
            </button>
          )}
        </div>
      </div>

      {/* CELE 4 COLOANE PRINCIPALE ALE FLUXULUI OPERAȚIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        {PIPELINE_PHASES.map((phase) => {
          const phaseClaimsForCount = claimsForCounts.filter((c) => phase.statuses.includes(c.status));
          const phaseClaims = displayClaims.filter((c) => phase.statuses.includes(c.status));
          const isExpandedMobile = mobileExpandedPhases[phase.key] ?? false;

          return (
            <div
              key={phase.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={(e) => {
                e.currentTarget.classList.add("ring-2", "ring-[#C98A2B]", "ring-inset");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-[#C98A2B]", "ring-inset");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-[#C98A2B]", "ring-inset");
                const claimId = e.dataTransfer.getData("text/plain");
                if (claimId && onMoveToStatus) {
                  const claim = claims.find(cl => cl.id === claimId);
                  if (claim) {
                    const targetStatus = phase.statuses[0];
                    onMoveToStatus(claim, targetStatus);
                  }
                }
              }}
              className="flex flex-col h-auto md:h-full rounded-2xl overflow-hidden border border-[#DAD4C6] shadow-sm shrink-0 bg-[#FAF8F5]"
            >
              {/* Antet Coloană Fază */}
              <div
                onClick={() => {
                  if (window.innerWidth < 768) {
                    togglePhaseMobile(phase.key);
                  }
                }}
                className="p-2.5 text-white shrink-0 md:cursor-default cursor-pointer select-none shadow-xs"
                style={{ background: phase.barColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-extrabold text-[13px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <span className="md:hidden mr-1 text-[10px]">
                      {isExpandedMobile ? "▼" : "▶"}
                    </span>
                    {phase.label}
                  </div>
                  <span className="min-w-[24px] h-[24px] px-1.5 flex items-center justify-center rounded-full bg-white/20 text-[11.5px] font-extrabold font-mono text-white shadow-xs">
                    {phaseClaimsForCount.length}
                  </span>
                </div>
                <div className={`mt-0.5 text-[10.5px] opacity-90 leading-tight ${isExpandedMobile ? "block" : "hidden md:block"}`}>
                  {phase.description}
                </div>

                {/* Sub-status Pills de filtrare rapidă */}
                <div className={`mt-2 flex items-center gap-1 flex-wrap ${isExpandedMobile ? "flex" : "hidden md:flex"}`}>
                  {phase.statuses.map((stKey) => {
                    const stDef = getStatusDefinition(stKey);
                    const stCount = phaseClaimsForCount.filter((c) => c.status === stKey).length;
                    const hasClaims = stCount > 0;
                    const isActive = selectedSubStatus === stKey;
                    return (
                      <span
                        key={stKey}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasClaims) {
                            setSelectedSubStatus(isActive ? null : stKey);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDragEnter={(e) => {
                          e.stopPropagation();
                          e.currentTarget.classList.add("bg-white", "text-[#23282E]", "font-bold");
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          e.currentTarget.classList.remove("bg-white", "text-[#23282E]", "font-bold");
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove("bg-white", "text-[#23282E]", "font-bold");
                          const claimId = e.dataTransfer.getData("text/plain");
                          if (claimId && onMoveToStatus) {
                            const claim = claims.find(cl => cl.id === claimId);
                            if (claim) onMoveToStatus(claim, stKey);
                          }
                        }}
                        className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-white text-[#23282E] shadow-sm font-black scale-105"
                            : hasClaims
                            ? "bg-white/20 text-white hover:bg-white hover:text-[#23282E]"
                            : "bg-white/10 text-white/50 cursor-default"
                        }`}
                        title={hasClaims ? `Filtrează sub-etapa „${stDef.label}” (${stCount} dosare)` : `Niciun dosar în sub-etapa „${stDef.label}”`}
                      >
                        {stDef.num}. {stDef.label} ({stCount})
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Zonă scrolabilă cu rândurile compacte de dosare */}
              <div className={`flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin ${isExpandedMobile ? "block" : "hidden md:block"}`}>
                {phaseClaims.length === 0 ? (
                  <div className="text-[11.5px] text-[#8A8375] italic p-6 text-center border-2 border-dashed border-[#DAD4C6] rounded-xl bg-white/50 my-auto">
                    Niciun dosar în această fază
                  </div>
                ) : (
                  phaseClaims.map((c) => (
                    <PhaseCard
                      key={c.id}
                      claim={c}
                      onOpen={onOpen}
                      onMoveToStatus={onMoveToStatus}
                      onDuplicate={onDuplicate}
                      canEdit={canEditFn(c)}
                      pragRidicare={pragRidicare}
                      compactMode={compactMode}
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
