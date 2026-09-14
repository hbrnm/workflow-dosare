import React, { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Car, AlertTriangle } from "lucide-react";
import {
  PROGRAMARE_STATUS,
  getProgramareCardClass,
} from "../../utils/programareStatus";
import DosarNumber from "../common/DosarNumber";
import { normalizePlate } from "../../utils/plateSchedule";
import { getStageAccent } from "../../constants/config";

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
    lead.masinaSchimbNumar,
    lead.dataProgramare || ""
  );
  const status = lead.programareStatus;
  const cardClass = getProgramareCardClass(status);
  const editable = canEdit?.(lead) !== false;
  const plate = normalizePlate(lead.numarInmatriculare) || "FĂRĂ NR.";

  const stopDrag = (e) => e.stopPropagation();

  const stageAccent = getStageAccent(lead.status);

  if (stack) {
    return (
      <>
        <div
          className={`app-prog-claim-card border rounded-lg text-[13px] overflow-hidden ${cardClass} ${stageAccent.className}`}
          style={{ borderLeftWidth: 3, borderLeftColor: stageAccent.color }}
        >
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
                setExpanded(true);
              }}
              className="w-full flex items-start justify-between gap-1.5 text-left cursor-pointer"
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
                <div className="text-[10px] text-[var(--app-muted)] font-mono mt-1 truncate">
                  {stack.map((c) => `#${c.numarDosar || "?"}`).join(" · ")}
                </div>
              </div>
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-[var(--app-muted)] pt-0.5">
                <ChevronDown size={14} />
              </span>
            </button>
          </div>
        </div>

        {expanded && (
          <div
            className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setExpanded(false)}
          >
            <div
              className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 p-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg text-[var(--app-text-strong)] tracking-wider uppercase">
                      {plate}
                    </span>
                    <span className="bg-[var(--app-accent)] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      {stack.length} dosare programate
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--app-surface-hover)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer"
                  title="Închide"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-2 max-h-[calc(85vh-80px)] scrollbar-thin">
                {stack.map((c) => (
                  <ProgramatorClaimCard
                    key={c.id}
                    claim={c}
                    claims={claims}
                    onOpen={(claimToOpen) => {
                      setExpanded(false);
                      onOpen?.(claimToOpen);
                    }}
                    onPatch={onPatch}
                    canEdit={canEdit}
                    onMarkNeonorata={onMarkNeonorata}
                    checkMasinaSchimbConflict={checkMasinaSchimbConflict}
                    onNotify={onNotify}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </>
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
      className={`app-prog-claim-card p-1.5 border rounded-lg cursor-pointer transition-colors text-[13px] flex flex-col active:opacity-60 ${cardClass} ${stageAccent.className}`}
      style={{ borderLeftWidth: 3, borderLeftColor: stageAccent.color }}
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

      {claim.delegat && claim.delegat.trim().toLowerCase() !== (claim.client || "").trim().toLowerCase() && (
        <div className="text-[10.5px] text-[var(--app-muted)] truncate flex items-center gap-1 -mt-0.5" title={`Delegat: ${claim.delegat}`}>
          <span className="opacity-70">Del:</span>
          <span className="font-semibold text-[var(--app-text-strong)]">{claim.delegat}</span>
        </div>
      )}

      {claim.ceEsteDeReparat && claim.ceEsteDeReparat.trim() !== "—" && (
        <div className="app-prog-claim-footer text-[11px] text-[var(--app-muted)] border-t pt-1 mt-1 truncate flex items-center gap-1">
          <span>⚙️</span>
          <span className="truncate">{claim.ceEsteDeReparat}</span>
        </div>
      )}

      {status === PROGRAMARE_STATUS.ONORATA && (
        <div className="text-[10px] font-bold text-[var(--app-success)] mt-1">✓ Programare onorată</div>
      )}

      {claim.masinaSchimbNumar && (
        <div
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-max flex items-center gap-1 ${
            conflict ? "app-prog-schimb-conflict" : "app-prog-schimb-ok"
          }`}
        >
          <Car size={10} className="shrink-0" /> Auto schimb: {claim.masinaSchimbNumar}
          {conflict && <span className="inline-flex items-center gap-0.5"><AlertTriangle size={10} /> Conflict</span>}
        </div>
      )}
    </div>
  );
}
