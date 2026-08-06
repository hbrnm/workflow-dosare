import React from "react";
import { Check, X } from "lucide-react";
import {
  PROGRAMARE_STATUS,
  getProgramareCardClass,
} from "../../utils/programareStatus";

export default function ProgramatorClaimCard({
  claim,
  claims,
  onOpen,
  onPatch,
  canEdit,
  onMarkNeonorata,
  checkMasinaSchimbConflict,
}) {
  const conflict = checkMasinaSchimbConflict(
    claims,
    claim.id,
    claim.masinaSchimb,
    claim.dataProgramare || ""
  );
  const status = claim.programareStatus;
  const cardClass = getProgramareCardClass(status);
  const editable = canEdit?.(claim) !== false;

  const stopDrag = (e) => e.stopPropagation();

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
            <span
              className="app-prog-claim-dosar text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0"
              title={`Dosar #${claim.numarDosar}`}
            >
              #{claim.numarDosar}
            </span>
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
