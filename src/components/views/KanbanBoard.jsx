import React, { useState } from "react";
import {
  Phone, Car, AlertTriangle, PackageCheck, Wrench, Paintbrush,
  ChevronLeft, ChevronRight, Copy, Clock, LayoutGrid, List, Plus, ChevronDown, ChevronUp, Check
} from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors, getClaimAlertDays } from "../../constants/config";
import { daysBetween, telLink, formatProgramareShort } from "../../utils/dateUtils";
import { isStageOverdue, getDaysInStage } from "../../utils/alertUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";

function ClaimCard({ claim, onOpen, onMove, onDuplicate, canEdit, pragRidicare, compact = false, onNotify }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const idx = STATUSES.findIndex((s) => s.key === claim.status);
  const hasKnownStatus = idx >= 0;
  const statusDef = getStatusDefinition(claim.status);
  const days = getDaysInStage(claim);
  const alertThreshold = getClaimAlertDays(claim);
  const overdue = isStageOverdue(claim);
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);
  const scheduleLabel =
    claim.status === "programat" && claim.dataProgramare
      ? formatProgramareShort(claim.dataProgramare)
      : "";
  const stageMeta = scheduleLabel || `${days}z în etapă`;

  if (compact) {
    return (
      <div
        onClick={() => onOpen(claim)}
        draggable={canEdit}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", claim.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group relative bg-white rounded-lg border p-2 cursor-pointer transition-all duration-150 hover:shadow-md ${
          claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
        }`}
        style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <DosarNumber
              value={claim.numarDosar}
              onNotify={onNotify}
              empty="(fără nr.)"
              className="font-mono text-[11.5px] font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
              <AlertBadge days={days} threshold={alertThreshold} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="font-semibold text-[#23282E] truncate" title={claim.client}>
              {claim.client || "Client neintrodus"}
            </span>
            {claim.telefonClient && (
              <div className="flex items-center gap-0.5 shrink-0">
                <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
                  <Phone size={11} />
                </a>
                <WhatsAppButton phone={claim.telefonClient} claim={claim} size={11} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 text-[10.5px] text-[#6B6558]">
            <span className="font-mono font-bold text-[#23282E] flex items-center gap-1">
              <Car size={10} className="text-[#8A8375]" />
              {claim.numarInmatriculare || "—"}
            </span>
            <span className="truncate max-w-[90px]">{claim.marcaModel || claim.asigurator}</span>
          </div>

          {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
            <div className="flex items-center gap-1 flex-wrap text-[9.5px]">
              {claim.blocat && <Pill tone="danger">blocat</Pill>}
              {claim.masinaSchimb && (
                <span className="px-1 py-0.2 rounded bg-[#FBF3E6] text-[#7A5316] font-bold">
                  🚗 {claim.masinaSchimb}
                </span>
              )}
              {claim.gataDeRidicare && !claim.ridicata && (
                <span className={`px-1 py-0.2 rounded font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                  gata ({zileNeridicata}z)
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t border-[#EFEAE1] mt-1.5 pt-1 text-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5">
            <button
              disabled={!canEdit || !hasKnownStatus || idx === 0}
              onClick={() => onMove(claim, -1)}
              className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
              title="Mută înapoi"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => onDuplicate(claim)}
              title="Duplică dosarul"
              className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166]"
            >
              <Copy size={11} />
            </button>
          </div>
          <span className="text-[#8A8375] font-mono text-[9.5px]" title={scheduleLabel ? `Programat ${scheduleLabel}` : undefined}>
            {stageMeta}
          </span>
          <button
            disabled={!canEdit || !hasKnownStatus || idx === STATUSES.length - 1}
            onClick={() => onMove(claim, 1)}
            className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
            title="Mută înainte"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen(claim)}
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group relative bg-white rounded-lg border p-2.5 cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
    >
      <div className="space-y-1.5">
        {/* Header Row: Nr Dosar + Pill + Alert Badge */}
        <div className="flex items-center justify-between gap-1">
          <DosarNumber
            value={claim.numarDosar}
            onNotify={onNotify}
            empty="(fără nr.)"
            className="font-mono text-[12.5px] font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
            <AlertBadge days={days} threshold={alertThreshold} />
          </div>
        </div>

        {/* Status Dropdown Badge */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
            className="w-full flex items-center justify-between px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] transition-colors text-[11px] font-semibold text-[#23282E]"
            title="Schimbă etapa dosarului"
          >
            <span className="flex items-center gap-1 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPhaseColors(claim.status).bar }} />
              <span className="font-mono text-[10px] text-[#6B6558] shrink-0">{String(statusDef.num).padStart(2, "0")}.</span>
              <span className="truncate">{statusDef.label}</span>
            </span>
            <ChevronDown size={12} className="text-[#8A8375] shrink-0" />
          </button>

          {showStatusPicker && (
            <>
              <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }} />
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-lg border border-[#DAD4C6] shadow-lg p-1 text-[11px] space-y-0.5" onClick={(e) => e.stopPropagation()}>
                <div className="px-2 py-0.5 text-[9.5px] font-bold text-[#8A8375] uppercase border-b border-[#EFEAE1]">Schimbă etapa:</div>
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(claim, STATUSES.findIndex(x => x.key === s.key) - idx);
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

        {/* Client & Phone / WhatsApp */}
        <div className="flex items-center justify-between gap-1 text-[11.5px]">
          <span className="font-semibold text-[#23282E] truncate group-hover:underline">
            {claim.client || "Client neintrodus"}
          </span>
          {claim.telefonClient && (
            <div className="flex items-center gap-0.5 shrink-0">
              <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
                <Phone size={11} />
              </a>
              <WhatsAppButton phone={claim.telefonClient} claim={claim} size={11} />
            </div>
          )}
        </div>

        {/* Car & Insurer */}
        <div className="flex items-center justify-between gap-1 text-[10.5px] text-[#6B6558]">
          <span className="font-mono font-bold text-[#23282E] flex items-center gap-1">
            <Car size={11} className="text-[#8A8375]" />
            {claim.numarInmatriculare || "—"}
          </span>
          <span className="truncate max-w-[100px]" title={claim.marcaModel || claim.asigurator}>
            {claim.marcaModel || claim.asigurator}
          </span>
        </div>

        {/* Active Badges */}
        {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata) || claim.adusaFizic) && (
          <div className="flex items-center gap-1 flex-wrap text-[9.5px] pt-0.5">
            {claim.blocat && <Pill tone="danger">⚠️ blocat</Pill>}
            {claim.masinaSchimb && (
              <span className="px-1.5 py-0.2 rounded bg-[#FBF3E6] text-[#7A5316] font-bold">
                🚗 {claim.masinaSchimb}
              </span>
            )}
            {claim.gataDeRidicare && !claim.ridicata && (
              <span className={`px-1.5 py-0.2 rounded font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                📦 gata ({zileNeridicata}z)
              </span>
            )}
            {claim.adusaFizic && (
              <span className="px-1.5 py-0.2 rounded bg-[#3B5166]/10 text-[#3B5166] font-bold">
                fizic în curte
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div
        className="flex items-center justify-between border-t border-[#EFEAE1] mt-2 pt-1.5 text-[10px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <button
            disabled={!canEdit || !hasKnownStatus || idx === 0}
            onClick={() => onMove(claim, -1)}
            className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
            title="Mută înapoi"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => onDuplicate(claim)}
            title="Duplică dosarul"
            className="p-0.5 rounded hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166]"
          >
            <Copy size={11} />
          </button>
        </div>

        <span className="text-[#8A8375] font-mono text-[9.5px] flex items-center gap-1" title={scheduleLabel ? `Programat ${scheduleLabel}` : undefined}>
          <Clock size={10} /> {stageMeta}
        </span>

        <button
          disabled={!canEdit || !hasKnownStatus || idx === STATUSES.length - 1}
          onClick={() => onMove(claim, 1)}
          className="p-0.5 rounded hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166]"
          title="Mută înainte"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}



function StackedVehicleGroupCard({ groupKey, groupClaims, onOpen, onMoveToStatus, onDuplicate, canEditFn, pragRidicare, compact, onNotify }) {
  const [expanded, setExpanded] = useState(false);
  const first = groupClaims[0];
  const marcaModel = first.marcaModel || first.client || "";

  return (
    <div className="border-2 border-[#3B5166]/40 bg-[#F4F6F8] rounded-xl p-1.5 shadow-xs transition-all space-y-1.5">
      {/* Header Comasat Interactiv */}
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center justify-between cursor-pointer select-none py-1.5 px-2 rounded-lg bg-white border border-[#DAD4C6] hover:bg-[#EEF1F3] hover:border-[#3B5166] transition-colors"
        title={expanded ? "Restrânge dosarele" : "Apasă pentru a deschide toate dosarele comasate"}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-extrabold text-[12.5px] text-[#23282E] uppercase">
            🚗 {groupKey}
          </span>
          <span className="text-[10.5px] font-semibold text-[#6B6558] truncate max-w-[100px]">
            {marcaModel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-[#3B5166] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
            {groupClaims.length} dosare
          </span>
          <span className="text-[#3B5166] font-bold text-[11px] flex items-center gap-0.5">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Când este restrâns: Card Rezumat Interactiv */}
      {!expanded && (
        <div 
          onClick={() => setExpanded(true)}
          className="text-[11px] text-[#5B6572] bg-white/80 p-2 rounded-lg border border-dashed border-[#DAD4C6] cursor-pointer hover:bg-white transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-[10.5px] font-semibold">
            <span className="truncate">Client: {first.client || "—"}</span>
            <span className="font-mono text-[#8A8375]">Nr: {groupClaims.map(c => `#${c.numarDosar || '?'}`).join(", ")}</span>
          </div>
          <div className="text-[10.5px] text-[#3B5166] font-extrabold text-center flex items-center justify-center gap-1 pt-0.5 border-t border-[#EFEAE1]/60">
            <span>Apasă pentru a deschide cele {groupClaims.length} dosare</span>
            <ChevronDown size={13} />
          </div>
        </div>
      )}

      {/* Când este extins: Randează toate cardurile individuale */}
      {expanded && (
        <div className="space-y-1.5 pt-1 border-t border-[#3B5166]/20">
          {groupClaims.map((c) => (
            <div key={c.id} className="space-y-1">
              <ClaimCard
                claim={c}
                onOpen={onOpen}
                onMove={(claimToMove, dir) => {
                  const curIdx = STATUSES.findIndex((s) => s.key === claimToMove.status);
                  const next = STATUSES[curIdx + dir];
                  if (next) onMoveToStatus(claimToMove, next.key);
                }}
                onDuplicate={onDuplicate}
                canEdit={canEditFn ? canEditFn(c) : true}
                pragRidicare={pragRidicare}
                compact={compact}
                onNotify={onNotify}
              />
              {c.status === "piese_comandate" && c.dataComandaPiese && (
                <div className="text-[10px] text-[#7A5316] font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-center">
                  📦 Comandat la: {c.dataComandaPiese}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ claims, onOpen, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare, onNotify }) {
  const [viewMode, setViewMode] = useState("full");

  return (
    <div className="space-y-3">
      {/* Top Header Bar with view toggle */}
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#DAD4C6] shadow-2xs">
        <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-2">
          <span>Flux Vizual Pe Etape ({claims.length} dosare)</span>
        </div>
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-md border border-[#DAD4C6]">
          <button
            onClick={() => setViewMode("full")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              viewMode === "full" ? "bg-[#3B5166] text-white shadow-2xs" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            <LayoutGrid size={13} /> Card Detaliat
          </button>
          <button
            onClick={() => setViewMode("compact")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              viewMode === "compact" ? "bg-[#3B5166] text-white shadow-2xs" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            <List size={13} /> Card Compact
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 align-top scrollbar-thin">
        {STATUSES.map((status) => {
          const list = claims.filter((c) => c.status === status.key);
          const colorObj = getPhaseColors(status.key);

          return (
            <div
              key={status.key}
              className="flex-none w-72 bg-[#F5F2EA] border border-[#DAD4C6] rounded-xl flex flex-col max-h-[80vh] shadow-2xs"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const claimId = e.dataTransfer.getData("text/plain");
                const claim = claims.find((c) => c.id === claimId);
                if (claim && claim.status !== status.key) {
                  onMoveToStatus(claim, status.key);
                }
              }}
            >
              {/* Header Coloană */}
              <div
                className="px-3 py-2 rounded-t-xl flex items-center justify-between text-white text-[12px] font-bold shrink-0"
                style={{ backgroundColor: colorObj.bar }}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono text-[11px] opacity-80">{String(status.num).padStart(2, "0")}.</span>
                  <span className="truncate">{status.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-[10.5px] font-bold">
                    {list.length}
                  </span>
                  <button
                    onClick={() => onAddInStatus && onAddInStatus(status.key)}
                    className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                    title={`Adaugă dosar nou în etapa „${status.label}”`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Lista de Carduri Comasate pe Vehicul (Punctul 15) */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1">
                {(() => {
                  const groupedMap = new Map();
                  list.forEach((c) => {
                    const plate = (c.numarInmatriculare || "").trim().toUpperCase();
                    const key = plate && plate.length > 2 ? plate : c.id;
                    if (!groupedMap.has(key)) groupedMap.set(key, []);
                    groupedMap.get(key).push(c);
                  });

                  return Array.from(groupedMap.entries()).map(([groupKey, groupClaims]) => {
                    if (groupClaims.length === 1) {
                      const c = groupClaims[0];
                      return (
                        <div key={c.id} className="space-y-1">
                          <ClaimCard
                            claim={c}
                            onOpen={onOpen}
                            onMove={(claimToMove, dir) => {
                              const curIdx = STATUSES.findIndex((s) => s.key === claimToMove.status);
                              const next = STATUSES[curIdx + dir];
                              if (next) onMoveToStatus(claimToMove, next.key);
                            }}
                            onDuplicate={onDuplicate}
                            canEdit={canEditFn ? canEditFn(c) : true}
                            pragRidicare={pragRidicare}
                            compact={viewMode === "compact"}
                            onNotify={onNotify}
                          />
                          {c.status === "piese_comandate" && c.dataComandaPiese && (
                            <div className="text-[10px] text-[#7A5316] font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-center">
                              📦 Comandat la: {c.dataComandaPiese}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <StackedVehicleGroupCard
                        key={groupKey}
                        groupKey={groupKey}
                        groupClaims={groupClaims}
                        onOpen={onOpen}
                        onMoveToStatus={onMoveToStatus}
                        onDuplicate={onDuplicate}
                        canEditFn={canEditFn}
                        pragRidicare={pragRidicare}
                        compact={viewMode === "compact"}
                        onNotify={onNotify}
                      />
                    );
                  });
                })()}
                {list.length === 0 && (
                  <div className="text-[11.5px] text-[#8A8375] italic p-4 text-center border border-dashed border-[#DAD4C6] rounded-lg bg-white/50">
                    Niciun dosar în această etapă
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
