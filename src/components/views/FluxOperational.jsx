import React, { useState, useMemo } from "react";
import {
  Layers, AlertTriangle, AlertOctagon, PackageCheck, Car, Phone,
  ChevronDown, Check, Clock, Copy, ShieldCheck
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, getPhaseColors, INSURERS } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";

export function PhaseCard({ claim, onOpen, onMoveToStatus, onDuplicate, canEdit, pragRidicare, compact = false }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);

  return (
    <div
      onClick={() => onOpen(claim)}
      className={`group relative bg-white rounded-lg border transition-all duration-150 hover:shadow-md cursor-pointer ${
        compact ? "p-1.5 text-[10.5px]" : "p-2.5 text-[11.5px]"
      } ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
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
        </div>
      </div>

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
          <Clock size={10} /> {days}z în etapă
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(claim); }}
            title="Duplică dosarul"
            className="px-1 py-0.2 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166] text-[9.5px] font-semibold transition-colors"
          >
            <Copy size={10} className="inline mr-0.5" /> Duplică
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TablouPeFaze({ claims, onOpen, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare }) {
  const [quickFilter, setQuickFilter] = useState("toate"); // "toate", "intarziate", "blocate", "masini_schimb", "piese_sosite"
  const [selectedInsurer, setSelectedInsurer] = useState("toti"); // "toti" or insurer name

  const alertClaims = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)), [claims]);
  const blockedClaims = useMemo(() => claims.filter((c) => c.blocat), [claims]);
  const masinaSchimbClaims = useMemo(() => claims.filter((c) => c.masinaSchimb), [claims]);
  const pieseSositeClaims = useMemo(() => claims.filter((c) => c.status === "piese_sosite"), [claims]);

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

  const displayClaims = useMemo(() => {
    let list = claims;
    if (quickFilter === "intarziate") list = alertClaims;
    else if (quickFilter === "blocate") list = blockedClaims;
    else if (quickFilter === "masini_schimb") list = masinaSchimbClaims;
    else if (quickFilter === "piese_sosite") list = pieseSositeClaims;

    if (selectedInsurer !== "toti") {
      list = list.filter((c) => c.asigurator === selectedInsurer);
    }
    return list;
  }, [claims, quickFilter, selectedInsurer, alertClaims, blockedClaims, masinaSchimbClaims, pieseSositeClaims]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2.5">
      {/* Top Smart Quick Filters & Insurer Filter Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3 py-2 shadow-2xs flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#23282E] text-[13px] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Layers size={15} className="text-[#C98A2B]" /> Flux Operațional
          </span>
          <span className="text-[11.5px] text-[#8A8375]">({displayClaims.length} / {claims.length} dosare)</span>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <button
            onClick={() => setQuickFilter("toate")}
            className={`px-2.5 py-0.5 rounded-md font-semibold transition-all ${
              quickFilter === "toate"
                ? "bg-[#23282E] text-white shadow-xs font-bold"
                : "bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"
            }`}
          >
            Toate ({claims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "intarziate" ? "toate" : "intarziate")}
            className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "intarziate"
                ? "bg-[#B23A2E] text-white shadow-xs font-bold"
                : "bg-[#B23A2E]/10 text-[#B23A2E] hover:bg-[#B23A2E]/20"
            }`}
          >
            <AlertTriangle size={11} /> Depășite ({alertClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "blocate" ? "toate" : "blocate")}
            className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "blocate"
                ? "bg-[#23282E] text-white shadow-xs font-bold"
                : "bg-[#23282E]/10 text-[#23282E] hover:bg-[#23282E]/20"
            }`}
          >
            <AlertOctagon size={11} /> Blocate ({blockedClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "piese_sosite" ? "toate" : "piese_sosite")}
            className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "piese_sosite"
                ? "bg-[#C98A2B] text-white shadow-xs font-bold"
                : "bg-[#C98A2B]/15 text-[#7A5316] hover:bg-[#C98A2B]/25"
            }`}
          >
            <PackageCheck size={11} /> Piese Sosite ({pieseSositeClaims.length})
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "masini_schimb" ? "toate" : "masini_schimb")}
            className={`px-2.5 py-0.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
              quickFilter === "masini_schimb"
                ? "bg-[#3B5166] text-white shadow-xs font-bold"
                : "bg-[#3B5166]/10 text-[#3B5166] hover:bg-[#3B5166]/20"
            }`}
          >
            <Car size={11} /> Auto la Schimb ({masinaSchimbClaims.length})
          </button>

          {/* Insurer Quick Filter Selector */}
          {insurerStats.length > 0 && (
            <div className="flex items-center gap-1 pl-2 border-l border-[#DAD4C6] ml-1">
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
        </div>
      </div>

      {/* 4 Phase Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        {PIPELINE_PHASES.map((phase) => {
          const phaseClaims = displayClaims.filter((c) => phase.statuses.includes(c.status));

          return (
            <div
              key={phase.key}
              className="flex flex-col h-full rounded-lg overflow-hidden border border-[#DAD4C6] shadow-2xs shrink-0"
              style={{ background: phase.bgColor }}
            >
              {/* Phase Column Header */}
              <div className="p-2.5 text-white shrink-0" style={{ background: phase.barColor }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[12.5px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {phase.label}
                  </div>
                  <span className="min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">
                    {phaseClaims.length}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] opacity-80 leading-tight">
                  {phase.description}
                </div>

                {/* Sub-status Pills inside Phase */}
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {phase.statuses.map((stKey) => {
                    const stDef = getStatusDefinition(stKey);
                    const stCount = phaseClaims.filter((c) => c.status === stKey).length;
                    return (
                      <span
                        key={stKey}
                        className="px-1.5 py-0.2 rounded bg-white/15 text-[9.5px] font-semibold flex items-center gap-1"
                      >
                        <span className="opacity-75">{stDef.num}.</span>
                        <span>{stDef.label}</span>
                        <span className="bg-white/25 px-1 rounded-full text-[9px] font-bold">{stCount}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Claims Grid (2 Cards per row when width permits) */}
              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto flex-1 min-h-0 items-start auto-rows-max">
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
