import React, { useState, useMemo } from "react";
import {
  Layers, AlertTriangle, AlertOctagon, PackageCheck, Car, Phone,
  ChevronDown, Check, Clock, Copy, ShieldCheck, CalendarClock, Truck,
  Minimize2, Maximize2, ExternalLink
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, getPhaseColors, INSURERS } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";

export function PhaseCard({ claim, onOpen, onMoveToStatus, onDuplicate, canEdit, pragRidicare }) {
  const compact = true;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);

  const expanded = isExpanded;

  const handleCardClick = (e) => {
    // If click was on an interactive element, let its own handler execute
    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("select")) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      id={`claim-card-${claim.id}`}
      onClick={handleCardClick}
      onDoubleClick={(e) => { e.stopPropagation(); onOpen(claim); }}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group relative bg-white rounded-lg border transition-all duration-150 hover:shadow-md cursor-pointer select-none active:opacity-60 ${
        compact ? "p-1.5 text-[10.5px]" : "p-2.5 text-[11.5px]"
      } ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
      title={compact && !isExpanded ? "Dublu-click pentru a deschide sau click simplu pentru detalii" : ""}
    >
      {/* Header Row: Nr Dosar + Asigurare */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`font-mono font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate ${
            compact ? "text-[11.5px]" : "text-[12.5px]"
          }`}
        >
          {claim.numarDosar || "(fără nr.)"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
          <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
          
          {/* Quick open button in compact collapsed view */}
          {compact && !isExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(claim); }}
              title="Deschide detalii complet"
              className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Client & License Plate (Collapsed view version) */}
      {!expanded && (
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="font-semibold text-[#23282E] truncate max-w-[60%]" title={claim.client}>
            {claim.client || "Client neintrodus"}
          </span>
          <span className="font-mono font-bold text-[#23282E] shrink-0 text-[10px] bg-[#FAF8F5] px-1 border border-[#DAD4C6] rounded">
            {claim.numarInmatriculare || "—"}
          </span>
        </div>
      )}

      {/* Row 3: Active Badges when collapsed */}
      {!expanded && (claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
        <div className="mt-1 flex items-center gap-1 flex-wrap text-[9px]">
          {claim.blocat && <span className="text-[#B23A2E] font-bold" title="Blocat">⚠️ bl</span>}
          {claim.masinaSchimb && (
            <span className="px-0.5 rounded bg-[#FBF3E6] text-[#7A5316] font-bold" title={`Mașină la schimb: ${claim.masinaSchimb}`}>
              🚗
            </span>
          )}
          {claim.gataDeRidicare && !claim.ridicata && (
            <span className={`px-0.5 rounded font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`} title={`Gata de ridicare (${zileNeridicata} zile)`}>
              📦 {zileNeridicata}z
            </span>
          )}
        </div>
      )}

      {/* Expandable fields (only visible when expanded) */}
      {expanded && (
        <>
          {/* Interactive 1-Click Status Dropdown Badge */}
          <div className={`${compact ? "mt-1" : "mt-1.5"} relative`}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
              className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] transition-colors font-semibold text-[#23282E] ${
                compact ? "text-[10px]" : "text-[11px]"
              }`}
              title="Apasă pentru a schimba etapa dosarului"
            >
              <span className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getPhaseColors(claim.status).bar }} />
                <span className="font-mono text-[9.5px] text-[#6B6558] shrink-0">{String(statusDef.num).padStart(2, "0")}.</span>
                <span className="truncate">{statusDef.label}</span>
              </span>
              <ChevronDown size={11} className="text-[#8A8375] shrink-0" />
            </button>

            {showStatusPicker && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStatusPicker(false);
                  }}
                />
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-lg border border-[#DAD4C6] shadow-lg p-1 text-[11px] space-y-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-0.5 text-[9.5px] font-bold text-[#8A8375] uppercase border-b border-[#EFEAE1]">
                    Schimbă etapa dosarului:
                  </div>
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStatus(claim, s.key);
                        setShowStatusPicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-left transition-colors ${
                        claim.status === s.key ? "bg-[#3B5166] text-white font-bold" : "hover:bg-[#F3EFE6] text-[#23282E]"
                      }`}
                    >
                      <span className="flex items-center gap-1 truncate">
                        <span className="font-mono text-[10px] opacity-75">{String(s.num).padStart(2, "0")}.</span>
                        <span className="truncate">{s.label}</span>
                      </span>
                      {claim.status === s.key && <Check size={11} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Client & Phone */}
          <div className={`${compact ? "mt-1 text-[10.5px]" : "mt-1.5 text-[11.5px]"} flex items-center justify-between gap-1`}>
            <span className="font-semibold text-[#23282E] truncate group-hover:underline">
              {claim.client || "Client neintrodus"}
            </span>
            {claim.telefonClient && (
              <div className="flex items-center gap-0.5 shrink-0">
                <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
                  <Phone size={compact ? 10 : 11} />
                </a>
                <WhatsAppButton phone={claim.telefonClient} claim={claim} size={compact ? 10 : 11} />
              </div>
            )}
          </div>

          {/* Auto & Insurer */}
          <div className={`${compact ? "mt-0.5 text-[9.5px]" : "mt-1 text-[10.5px]"} flex items-center justify-between gap-1 text-[#6B6558]`}>
            <span className="flex items-center gap-1 font-mono font-bold text-[#23282E]">
              <Car size={compact ? 10 : 11} className="text-[#8A8375]" />
              {claim.numarInmatriculare || "—"}
            </span>
            <span className="truncate max-w-[90px]" title={claim.marcaModel || claim.asigurator}>
              {claim.marcaModel || claim.asigurator}
            </span>
          </div>

          {/* Active Badges */}
          {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
            <div className="mt-1 flex items-center gap-1 flex-wrap text-[9px]">
              {claim.blocat && <Pill tone="danger">⚠️ blocat</Pill>}
              {claim.masinaSchimb && (
                <span className="px-1 py-0.1 rounded bg-[#FBF3E6] text-[#7A5316] font-bold">
                  🚗 {claim.masinaSchimb}
                </span>
              )}
              {claim.gataDeRidicare && !claim.ridicata && (
                <span className={`px-1 py-0.1 rounded font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                  📦 gata ({zileNeridicata}z)
                </span>
              )}
            </div>
          )}

          {/* Card Footer: Days + Quick Actions */}
          <div className={`${compact ? "mt-1 pt-1 text-[9.5px]" : "mt-1.5 pt-1.5 text-[10px]"} border-t border-[#EFEAE1] flex items-center justify-between`}>
            <span className="text-[#8A8375] font-mono flex items-center gap-1">
              <Clock size={compact ? 9 : 10} /> {days}z în etapă
            </span>

            <div className="flex items-center gap-1">
              {compact && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(claim); }}
                  title="Deschide detalii complet"
                  className="px-1.5 py-0.5 rounded bg-[#3B5166] text-white hover:bg-[#2C4160] text-[9.5px] font-bold transition-colors"
                >
                  Deschide
                </button>
              )}
              {claim.status === "piese_sosite" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(claim); }}
                  title="Programează service"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#C98A2B]/15 text-[#7A5316] hover:bg-[#C98A2B]/30 text-[9px] font-bold transition-colors border border-[#C98A2B]/30"
                >
                  <CalendarClock size={9} /> Programează
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(claim); }}
                title="Duplică dosarul"
                className="px-1 py-0.2 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166] text-[9.5px] font-semibold transition-colors"
              >
                <Copy size={10} className="inline mr-0.5" /> Duplică
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TablouPeFaze({ claims, onOpen, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare, quickFilter, setQuickFilter }) {
  const [selectedInsurer, setSelectedInsurer] = useState("toti"); // "toti" or insurer name
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [mobileExpandedPhases, setMobileExpandedPhases] = useState({ start: true });

  const togglePhaseMobile = (phaseKey) => {
    setMobileExpandedPhases((prev) => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  };

  const alertClaims = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)), [claims]);
  const blockedClaims = useMemo(() => claims.filter((c) => c.blocat), [claims]);
  const masinaSchimbClaims = useMemo(() => claims.filter((c) => c.masinaSchimb), [claims]);
  const pieseSositeClaims = useMemo(() => claims.filter((c) => c.status === "piese_sosite"), [claims]);
  const gataRidicareClaims = useMemo(() => claims.filter((c) => c.gataDeRidicare && !c.ridicata), [claims]);

  // Unique list of active insurers with claim counts
  const insurerStats = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      if (c.asigurator) {
        map[c.asigurator] = (map[c.asigurator] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [claims]);

  const claimsForCounts = useMemo(() => {
    let list = claims;
    if (quickFilter === "intarziate") list = alertClaims;
    else if (quickFilter === "blocate") list = blockedClaims;
    else if (quickFilter === "masini_schimb") list = masinaSchimbClaims;
    else if (quickFilter === "piese_sosite") list = pieseSositeClaims;
    else if (quickFilter === "gata_ridicare") list = gataRidicareClaims;

    if (selectedInsurer !== "toti") {
      list = list.filter((c) => c.asigurator === selectedInsurer);
    }
    return list;
  }, [claims, quickFilter, selectedInsurer, alertClaims, blockedClaims, masinaSchimbClaims, pieseSositeClaims, gataRidicareClaims]);

  const displayClaims = useMemo(() => {
    let list = claimsForCounts;
    if (selectedSubStatus) {
      list = list.filter((c) => c.status === selectedSubStatus);
    }
    return list;
  }, [claimsForCounts, selectedSubStatus]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3 py-2 shadow-2xs shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1.5 md:mb-0">
          <span className="font-bold text-[#23282E] text-[13px] flex items-center gap-1.5 shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Layers size={15} className="text-[#C98A2B]" /> Flux Operațional
          </span>
          <span className="text-[11.5px] text-[#8A8375] shrink-0">({displayClaims.length} / {claims.length})</span>
        </div>

        {/* Quick Filter Buttons - scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <div className="flex items-center gap-1.5 text-[11px] min-w-max">
            <button
              onClick={() => setQuickFilter("toate")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                quickFilter === "toate"
                  ? "bg-[#23282E] text-white shadow-xs font-bold"
                  : "bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"
              }`}
            >
              Toate ({claims.length})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "intarziate" ? "toate" : "intarziate")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                quickFilter === "intarziate"
                  ? "bg-[#B23A2E] text-white shadow-xs font-bold"
                  : "bg-[#B23A2E]/10 text-[#B23A2E] hover:bg-[#B23A2E]/20"
              }`}
            >
              <AlertTriangle size={11} /> Depășite ({alertClaims.length})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "blocate" ? "toate" : "blocate")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                quickFilter === "blocate"
                  ? "bg-[#23282E] text-white shadow-xs font-bold"
                  : "bg-[#23282E]/10 text-[#23282E] hover:bg-[#23282E]/20"
              }`}
            >
              <AlertOctagon size={11} /> Blocate ({blockedClaims.length})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "piese_sosite" ? "toate" : "piese_sosite")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                quickFilter === "piese_sosite"
                  ? "bg-[#C98A2B] text-white shadow-xs font-bold"
                  : "bg-[#C98A2B]/15 text-[#7A5316] hover:bg-[#C98A2B]/25"
              }`}
            >
              <PackageCheck size={11} /> Piese ({pieseSositeClaims.length})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "masini_schimb" ? "toate" : "masini_schimb")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                quickFilter === "masini_schimb"
                  ? "bg-[#3B5166] text-white shadow-xs font-bold"
                  : "bg-[#3B5166]/10 text-[#3B5166] hover:bg-[#3B5166]/20"
              }`}
            >
              <Car size={11} /> Auto ({masinaSchimbClaims.length})
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "gata_ridicare" ? "toate" : "gata_ridicare")}
              className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                quickFilter === "gata_ridicare"
                  ? "bg-[#4A7C3E] text-white shadow-xs font-bold"
                  : "bg-[#4A7C3E]/15 text-[#3A5C2E] hover:bg-[#4A7C3E]/25"
              }`}
            >
              <Truck size={11} /> Gata ({gataRidicareClaims.length})
            </button>

            {/* Insurer Quick Filter - hidden on mobile */}
            {insurerStats.length > 0 && (
              <div className="hidden md:flex items-center gap-1 pl-2 border-l border-[#DAD4C6] ml-1">
                <ShieldCheck size={12} className="text-[#3B5166]" />
                <select
                  className="bg-[#FAF8F5] border border-[#DAD4C6] rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#23282E] focus:outline-hidden"
                  value={selectedInsurer}
                  onChange={(e) => setSelectedInsurer(e.target.value)}
                >
                  <option value="toti">Toti Asigurătorii</option>
                  {insurerStats.map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </div>
            )}



            {/* Reset Sub-status Filter */}
            {selectedSubStatus && (
              <button
                onClick={() => setSelectedSubStatus(null)}
                className="px-2.5 py-0.5 rounded-md font-bold transition-all bg-[#B23A2E] text-white hover:bg-[#922D24] shadow-xs flex items-center gap-1 text-[11px] whitespace-nowrap"
                title="Resetează filtrul de etapă selectat"
              >
                <span>{getStatusDefinition(selectedSubStatus).label} ✕</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Phase Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
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
              className="flex flex-col h-auto md:h-full rounded-lg overflow-hidden border border-[#DAD4C6] shadow-2xs shrink-0"
              style={{ background: phase.bgColor }}
            >
              {/* Phase Column Header */}
              <div
                onClick={() => {
                  if (window.innerWidth < 768) {
                    togglePhaseMobile(phase.key);
                  }
                }}
                className="p-2.5 text-white shrink-0 md:cursor-default cursor-pointer select-none"
                style={{ background: phase.barColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[12.5px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <span className="md:hidden mr-1 text-[10px]">
                      {isExpandedMobile ? "▼" : "▶"}
                    </span>
                    {phase.label}
                  </div>
                  <span className="min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">
                    {phaseClaimsForCount.length}
                  </span>
                </div>
                <div className={`mt-0.5 text-[10px] opacity-80 leading-tight ${isExpandedMobile ? "block" : "hidden md:block"}`}>
                  {phase.description}
                </div>

                {/* Sub-status Pills inside Phase */}
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
                            if (claim) {
                              onMoveToStatus(claim, stKey);
                            }
                          }
                        }}
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold flex items-center gap-1 transition-all select-none ${
                          isActive
                            ? "bg-white text-[#23282E] font-bold shadow-xs scale-105"
                            : hasClaims
                            ? "bg-white/15 hover:bg-white/30 cursor-pointer active:scale-95"
                            : "bg-white/5 opacity-40 cursor-not-allowed"
                        }`}
                        title={
                          isActive
                            ? "Apasă pentru a șterge filtrul"
                            : hasClaims
                            ? `Filtrează după: ${stDef.label}`
                            : "Niciun dosar în această etapă"
                        }
                      >
                        <span className="opacity-75">{stDef.num}.</span>
                        <span>{stDef.label}</span>
                        <span className={`px-1 rounded-full text-[9px] font-bold ${isActive ? "bg-[#3B5166] text-white" : "bg-white/25"}`}>{stCount}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Claims Grid (2 Cards per row when width permits) */}
              <div className={`p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto scrollbar-thin flex-1 max-h-[500px] md:max-h-none md:min-h-0 items-start auto-rows-max ${
                isExpandedMobile ? "block" : "hidden md:grid"
              }`}>
                {phaseClaims.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-[11.5px] text-[#8A8375]/70 italic">
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
                      canEdit={canEditFn ? canEditFn(claim) : true}
                      pragRidicare={pragRidicare}
                      compact={true}
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
