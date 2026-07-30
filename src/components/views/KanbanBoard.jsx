import React, { useState } from "react";
import {
  Phone, MessageCircle, Car, AlertTriangle, PackageCheck, Wrench, Paintbrush,
  ChevronLeft, ChevronRight, Copy, Clock, LayoutGrid, List, Plus
} from "lucide-react";
import { STATUSES, PHASE_COLORS, getStatusDefinition } from "../../constants/config";
import { daysBetween, telLink, waLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";

function ClaimCard({ claim, onOpen, onMove, onDuplicate, canEdit, pragRidicare, compact = false }) {
  const idx = STATUSES.findIndex((s) => s.key === claim.status);
  const hasKnownStatus = idx >= 0;
  const days = daysBetween(claim.dataSchimbareStatus);
  const overdue = days >= (claim.termenAlertaZile || 3);
  const phase = getStatusDefinition(claim.status).phase;
  const zileNeridicata = claim.gataDeRidicare && !claim.ridicata ? daysBetween(claim.dataGataRidicare) : 0;
  const neridicataAlert = claim.gataDeRidicare && !claim.ridicata && zileNeridicata >= (pragRidicare || 3);

  if (compact) {
    return (
      <div
        onClick={() => onOpen(claim)}
        draggable={canEdit}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", claim.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`group relative bg-white rounded-md border cursor-pointer transition-all duration-150 hover:shadow-md ${
          claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
        }`}
        style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase]?.bar || "#DAD4C6" }}
      >
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11.5px] font-bold text-[#23282E] truncate">
              {claim.numarDosar || "(fără nr.)"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
              <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="font-semibold text-[#23282E] truncate" title={claim.client}>
              {claim.client || "Client neintrodus"}
            </span>
            <span className="font-mono text-[10.5px] text-[#6B6558] shrink-0">
              {claim.numarInmatriculare || "—"}
            </span>
          </div>

          {(claim.blocat || claim.masinaSchimb || (claim.gataDeRidicare && !claim.ridicata)) && (
            <div className="flex items-center gap-1 flex-wrap text-[10px]">
              {claim.blocat && <Pill tone="danger">blocat</Pill>}
              {claim.masinaSchimb && (
                <span className="px-1 py-0.2 rounded bg-[#FBF3E6] text-[#7A5316] font-bold text-[9.5px]">
                  🚗 {claim.masinaSchimb}
                </span>
              )}
              {claim.gataDeRidicare && !claim.ridicata && (
                <span className={`px-1 py-0.2 rounded font-bold text-[9.5px] ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                  gata ({zileNeridicata}z)
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t border-[#EFEAE1] px-1.5 py-0.5 bg-[#FCFAF5]/80 text-[10px]"
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
          <span className="text-[#8A8375] font-mono text-[9.5px]">
            {days}z
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
      className={`group relative bg-white rounded-lg border cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
        claim.blocat ? "border-[#23282E] border-2" : overdue ? "border-[#B23A2E]" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: PHASE_COLORS[phase]?.bar || "#DAD4C6" }}
    >
      <div className="p-3.5 pb-3">
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-mono text-[12.5px] font-bold text-[#23282E] truncate">
            {claim.numarDosar || "(fără nr.)"}
          </span>
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
        </div>
        <div className="mt-2 text-[13.5px] font-medium text-[#23282E] truncate">
          {claim.client || "Client neintrodus"}
        </div>
        {claim.telefonClient && (
          <div className="flex items-center justify-between gap-1 mt-1 text-[11.5px] text-[#6B6558]">
            <span className="flex items-center gap-1"><Phone size={11} />{claim.telefonClient}</span>
            <span className="flex items-center gap-1">
              <a href={telLink(claim.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]">
                <Phone size={12} />
              </a>
              <a href={waLink(claim.telefonClient)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3E6B45]">
                <MessageCircle size={12} />
              </a>
            </span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#6B6558]">
          <Car size={12} />
          <span className="font-mono">{claim.numarInmatriculare || "—"}</span>
          <span className="truncate">{claim.marcaModel}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <span className="text-[11px] text-[#8A8375] truncate">{claim.asigurator || "asigurător —"}</span>
          <div className="flex items-center gap-1 shrink-0">
            {!canEdit && <Pill tone="ghost">doar vizualizare</Pill>}
            {claim.blocat && (
              <Pill tone="danger">
                <AlertTriangle size={10} />
                blocat
              </Pill>
            )}
            <AlertBadge days={days} threshold={claim.termenAlertaZile || 3} />
          </div>
        </div>
        {claim.gataDeRidicare && !claim.ridicata && (
          <div className="mt-2.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${neridicataAlert ? "bg-[#B23A2E] text-white" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
              <PackageCheck size={11} /> gata, neridicată de {zileNeridicata}z
            </span>
          </div>
        )}
        {(claim.adusaFizic ||
          claim.manopera?.tinichigerie?.dataIntrareEtapa ||
          claim.manopera?.vopsitorie?.dataIntrareEtapa) && (
          <div className="mt-2.5 flex items-center gap-1 flex-wrap">
            {claim.adusaFizic && (
              <Pill tone="ghost">
                <Car size={10} />
                adusă fizic
              </Pill>
            )}
            {claim.manopera?.tinichigerie?.dataIntrareEtapa &&
              !claim.manopera?.vopsitorie?.dataIntrareEtapa && (
                <Pill tone="ghost">
                  <Wrench size={10} />
                  tinichigerie
                </Pill>
              )}
            {claim.manopera?.vopsitorie?.dataIntrareEtapa && (
              <Pill tone="ghost">
                <Paintbrush size={10} />
                vopsitorie
              </Pill>
            )}
          </div>
        )}
      </div>
      <div
        className="flex items-center justify-between border-t border-[#EFEAE1] px-2.5 py-2 bg-[#FCFAF5]/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <button
            disabled={!canEdit || !hasKnownStatus || idx === 0}
            onClick={() => onMove(claim, -1)}
            className="p-1.5 rounded-md hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onDuplicate(claim)}
            title="Duplică dosarul"
            className="p-1.5 rounded-md hover:bg-[#EFEAE1] text-[#8A8375] hover:text-[#3B5166] transition-colors"
          >
            <Copy size={13} />
          </button>
        </div>
        <span className="text-[10.5px] text-[#8A8375] flex items-center gap-1">
          <Clock size={11} />
          {days}z în etapă
        </span>
        <button
          disabled={!canEdit || !hasKnownStatus || idx === STATUSES.length - 1}
          onClick={() => onMove(claim, 1)}
          className="p-1.5 rounded-md hover:bg-[#EFEAE1] disabled:opacity-25 text-[#3B5166] transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function KanbanBoard({ claims, onOpen, onMove, onMoveToStatus, onAddInStatus, onDuplicate, canEditFn, pragRidicare }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const [compactMode, setCompactMode] = useState(true);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2">
      {/* Controls Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-[#DAD4C6] px-3 py-1.5 shadow-xs shrink-0 flex-wrap gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#23282E] flex items-center gap-1.5">
            <LayoutGrid size={15} className="text-[#C98A2B]" /> Kanban Board ({claims.length} dosare)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] font-semibold transition-all ${
              compactMode
                ? "bg-[#3B5166] text-white border-[#3B5166] shadow-xs"
                : "bg-[#FAF8F5] text-[#3B5166] border-[#DAD4C6] hover:bg-[#EFEAE1]"
            }`}
          >
            {compactMode ? <List size={14} /> : <LayoutGrid size={14} />}
            {compactMode ? "Mod Compact (Toate pe pagină)" : "Mod Detaliat"}
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="flex gap-2 overflow-x-auto overflow-y-hidden flex-1 min-h-0 -mx-1 px-1">
        {STATUSES.map((s) => {
          const colClaims = claims.filter((c) => c.status === s.key);
          const colors = PHASE_COLORS[s.phase];
          return (
            <div
              key={s.key}
              className="flex-shrink-0 w-[195px] xl:w-[215px] h-full flex flex-col rounded-xl overflow-hidden border border-[#DAD4C6] shadow-xs"
              style={{ background: colors.tint }}
            >
              <div
                className="px-2.5 py-2 flex items-center justify-between shrink-0"
                style={{ background: colors.bar }}
              >
                <div className="flex items-center gap-1 text-white min-w-0">
                  <span className="font-mono text-[10.5px] opacity-75 shrink-0">
                    {String(s.num).padStart(2, "0")}
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight truncate" title={s.label}>
                    {s.label}
                  </span>
                </div>
                <span className="min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full bg-white/20 text-[10.5px] font-bold text-white shrink-0 ml-1">
                  {colClaims.length}
                </span>
              </div>
              <div
                className={`p-2 flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 transition-colors ${
                  dragOverKey === s.key ? "bg-white/60 ring-2 ring-[#3B5166] ring-inset" : ""
                }`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDragEnter={() => setDragOverKey(s.key)}
                onDragLeave={(e) => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDragOverKey(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const claimId = e.dataTransfer.getData("text/plain");
                  const draggedClaim = claims.find((c) => c.id === claimId);
                  if (draggedClaim && draggedClaim.status !== s.key) onMoveToStatus(draggedClaim, s.key);
                  setDragOverKey(null);
                }}
              >
                {colClaims.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-[#8A8375]/80">
                    Niciun dosar în această etapă
                  </div>
                )}
                {colClaims.map((c) => (
                  <ClaimCard
                    key={c.id}
                    claim={c}
                    onOpen={onOpen}
                    onMove={onMove}
                    onDuplicate={onDuplicate}
                    canEdit={canEditFn(c)}
                    pragRidicare={pragRidicare}
                    compact={compactMode}
                  />
                ))}
                <button
                  onClick={() => onAddInStatus(s.key)}
                  className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-[#6B6558] rounded-lg border border-dashed border-[#C7C0B0] hover:bg-white/70 hover:text-[#23282E] hover:border-[#A89F8A] transition-colors shrink-0"
                >
                  <Plus size={12} /> dosar nou
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
