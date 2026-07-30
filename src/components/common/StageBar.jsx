import React from "react";
import { Play, CheckCircle2 } from "lucide-react";
import { daysBetween, nowISO } from "../../utils/dateUtils";

export default function StageBar({ label, icon, data, onChange }) {
  const safeData = data || { facturat: 0, alocat: 0, dataIntrareEtapa: null };
  const facturat = Number(safeData.facturat) || 0;
  const alocat = Number(safeData.alocat) || 0;
  const pct = alocat > 0 ? Math.min(100, Math.round((facturat / alocat) * 100)) : 0;
  const started = !!safeData.dataIntrareEtapa;
  const days = safeData.dataIntrareEtapa ? daysBetween(safeData.dataIntrareEtapa) : 0;

  return (
    <div className="border border-[#DAD4C6] rounded-xl p-3 bg-white space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#23282E]">
          {icon} {label}
        </span>
        {started ? (
          <span className="text-[10.5px] font-semibold text-[#3E6B45] bg-[#EEF5EE] px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 size={11} /> {days}z în lucru
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onChange({ ...safeData, dataIntrareEtapa: nowISO() })}
            className="flex items-center gap-1 text-[10.5px] font-bold text-[#3B5166] hover:bg-[#3B5166]/10 px-2 py-0.5 rounded transition-colors"
          >
            <Play size={10} /> pornește
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="block text-[10.5px] text-[#6B6558] mb-0.5 font-medium">Facturat (lei)</span>
          <input
            type="number"
            min={0}
            className="w-full border border-[#DAD4C6] rounded-md px-2 py-1 font-mono font-bold text-[#23282E] text-[12px]"
            value={facturat}
            onChange={(e) => onChange({ ...safeData, facturat: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <span className="block text-[10.5px] text-[#6B6558] mb-0.5 font-medium">Buget Alocat (lei)</span>
          <input
            type="number"
            min={0}
            className="w-full border border-[#DAD4C6] rounded-md px-2 py-1 font-mono text-[#6B6558] text-[12px]"
            value={alocat}
            onChange={(e) => onChange({ ...safeData, alocat: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      {alocat > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#8A8375] font-semibold">
            <span>Progres decontare</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-[#EFEAE1] rounded-full overflow-hidden">
            <div className="h-full bg-[#C98A2B] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
