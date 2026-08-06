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
      className={`p-1.5 border rounded-lg cursor-pointer transition-all text-[13px] flex flex-col hover:shadow-2xs active:opacity-60 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-mono font-bold text-[#3B5166] uppercase shrink-0">
            {claim.numarInmatriculare || "FĂRĂ NR."}
          </span>
          {claim.numarDosar && (
            <span
              className="text-[10px] font-mono font-bold bg-white/70 px-1.5 py-0.2 rounded text-[#3B5166] shrink-0"
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
              className={`p-1 rounded-md border transition-all ${
                status === PROGRAMARE_STATUS.ONORATA
                  ? "bg-[#2F8F5B] border-[#2F8F5B] text-white shadow-sm"
                  : "bg-white/80 border-[#2F8F5B]/40 text-[#2F8F5B] hover:bg-[#2F8F5B] hover:text-white"
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
              className={`p-1 rounded-md border transition-all ${
                status === PROGRAMARE_STATUS.NEONORATA
                  ? "bg-[#D6473F] border-[#D6473F] text-white shadow-sm"
                  : "bg-white/80 border-[#D6473F]/40 text-[#D6473F] hover:bg-[#D6473F] hover:text-white"
              }`}
            >
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-[#23282E] truncate text-[12px]">{claim.client || "—"}</span>
        <span className="text-[11px] text-[#6B6558] font-semibold truncate shrink-0 max-w-[120px]">
          {claim.marcaModel || "—"}
        </span>
      </div>

      {claim.ceEsteDeReparat && claim.ceEsteDeReparat.trim() !== "—" && (
        <div className="text-[11px] text-[#6B6558] border-t border-[#EFEAE1]/60 pt-1 mt-1 truncate flex items-center gap-1">
          <span className="text-[#8A8375]">⚙️</span>
          <span className="truncate">{claim.ceEsteDeReparat}</span>
        </div>
      )}

      {status === PROGRAMARE_STATUS.ONORATA && (
        <div className="text-[10px] font-bold text-[#2F8F5B] mt-1">✓ Programare onorată</div>
      )}

      {claim.masinaSchimb && (
        <div
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 w-max flex items-center gap-1 ${
            conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"
          }`}
        >
          🚗 Auto Schimb: {claim.masinaSchimb}
          {conflict && <span>⚠️ Conflict!</span>}
        </div>
      )}
    </div>
  );
}
