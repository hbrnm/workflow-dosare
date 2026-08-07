import React, { useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  PROGRAMARE_STATUS,
  getProgramareCardClass,
} from "../../utils/programareStatus";
import DosarNumber from "../common/DosarNumber";
import { normalizePlate } from "../../utils/plateSchedule";

export default function ProgramatorClaimCard({
  claim,
  claims,
  groupClaims = null,
  onOpen,
  onPatch,
  canEdit,
  onMarkNeonorata,
  checkMasinaSchimbConflict,
  onNotify,
}) {
  const stack = Array.isArray(groupClaims) && groupClaims.length > 1 ? groupClaims : null;
  const [expanded, setExpanded] = useState(false);
  const lead = claim;
  const conflict = checkMasinaSchimbConflict(
    claims,
    lead.id,
    lead.masinaSchimb,
    lead.dataProgramare || ""
  );
  const status = lead.programareStatus;
  const cardClass = getProgramareCardClass(status);
  const editable = canEdit?.(lead) !== false;
  const plate = normalizePlate(lead.numarInmatriculare) || "FĂRĂ NR.";

  const stopDrag = (e) => e.stopPropagation();

  if (stack) {
    return (
      <div className={`app-prog-claim-card border rounded-lg text-[13px] overflow-hidden ${cardClass}`}>
        <div
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", lead.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          className="p-1.5 cursor-pointer active:opacity-60"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="w-full flex items-start justify-between gap-1.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold uppercase shrink-0">{plate}</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[var(--app-accent)] text-white">
                  ×{stack.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-bold truncate text-[12px]">{lead.client || "—"}</span>
                <span className="text-[11px] text-[var(--app-muted)] font-semibold truncate shrink-0 max-w-[100px]">
                  {lead.marcaModel || "—"}
                </span>
              </div>
              {!expanded && (
                <div className="text-[10px] text-[var(--app-muted)] font-mono mt-1 truncate">
                  {stack.map((c) => `#${c.numarDosar || "?"}`).join(" · ")}
                </div>
              )}
            </div>
            <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-[var(--app-muted)] pt-0.5">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
        </div>

        {expanded && (
          <div className="border-t border-[var(--app-border)]/60 p-1 space-y-1 bg-[var(--app-surface-2)]/30">
            {stack.map((c) => (
              <ProgramatorClaimCard
                key={c.id}
                claim={c}
                claims={claims}
                onOpen={onOpen}
                onPatch={onPatch}
                canEdit={canEdit}
                onMarkNeonorata={onMarkNeonorata}
                checkMasinaSchimbConflict={checkMasinaSchimbConflict}
                onNotify={onNotify}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpen?.(claim)}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`app-prog-claim-card p-1.5 border rounded-lg cursor-pointer transition-colors text-[13px] flex flex-col active:opacity-60 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono font-bold uppercase shrink-0">
            {claim.numarInmatriculare || "FĂRĂ NR."}
          </span>
          {claim.numarDosar && (
            <DosarNumber
              value={claim.numarDosar}
              onNotify={onNotify}
              className="app-prog-claim-dosar text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0"
            />
          )}
        </div>

        {editable && (
          <div className="flex items-center gap-0.5 shrink-0" onClick={stopDrag}>
            <button
              type="button"
              title="Programare onorată — client prezent"
              onClick={(e) => {
                e.stopPropagation();
                onPatch?.(claim.id, { programareStatus: PROGRAMARE_STATUS.ONORATA });
              }}
              className={`app-prog-status-btn p-1 rounded-md border transition-colors ${
                status === PROGRAMARE_STATUS.ONORATA ? "is-onorata-active" : "is-onorata"
              }`}
            >
              <Check size={12} strokeWidth={3} />
            </button>
            <button
              type="button"
              title="Programare neonorată — client absent"
              onClick={(e) => {
                e.stopPropagation();
                onMarkNeonorata?.(claim);
              }}
              className={`app-prog-status-btn p-1 rounded-md border transition-colors ${
                status === PROGRAMARE_STATUS.NEONORATA ? "is-neonorata-active" : "is-neonorata"
              }`}
            >
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-bold truncate text-[12px]">{claim.client || "—"}</span>
        <span className="text-[11px] text-[var(--app-muted)] font-semibold truncate shrink-0 max-w-[120px]">
          {claim.marcaModel || "—"}
        </span>
      </div>

      {claim.ceEsteDeReparat && claim.ceEsteDeReparat.trim() !== "—" && (
        <div className="app-prog-claim-footer text-[11px] text-[var(--app-muted)] border-t pt-1 mt-1 truncate flex items-center gap-1">
          <span>⚙️</span>
          <span className="truncate">{claim.ceEsteDeReparat}</span>
        </div>
      )}

      {status === PROGRAMARE_STATUS.ONORATA && (
        <div className="text-[10px] font-bold text-[var(--app-success)] mt-1">✓ Programare onorată</div>
      )}

      {claim.masinaSchimb && (
        <div
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-max flex items-center gap-1 ${
            conflict ? "app-prog-schimb-conflict" : "app-prog-schimb-ok"
          }`}
        >
          🚗 Auto Schimb: {claim.masinaSchimb}
          {conflict && <span>⚠️ Conflict!</span>}
        </div>
      )}
    </div>
  );
}
