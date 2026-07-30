import React from "react";
import { Play } from "lucide-react";
import { daysBetween, nowISO } from "../../utils/dateUtils";

export default function StageBar({ label, icon, data, onChange }) {
  const safeData = data || { facturat: 0, alocat: 0, dataIntrareEtapa: null };
  const pct = safeData.alocat > 0 ? Math.min(100, Math.round(((safeData.facturat || 0) / safeData.alocat) * 100)) : 0;
  const started = !!safeData.dataIntrareEtapa;
  const days = daysBetween(safeData.dataIntrareEtapa);

  return (
    <div className="border border-[#DAD4C6] rounded-lg p-2.5 bg-white">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#23282E]">{icon}{label}</span>
        {started ? (
          <span className="text-[10.5px] text-[#8A8375]">{days} zile în etapă</span>
        ) : (
          <button onClick={() => onChange({ ...safeData, dataIntrareEtapa: nowISO() })} className="flex items-center gap-1 text-[10.5px] font-semibold text-[#3B5166] hover:underline">
            <Play size={10} /> pornește
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min={0} className="w-20 border border-[#DAD4C6] rounded px-1.5 py-1 text-[12.5px]"
          value={safeData.facturat || 0} onChange={(e) => onChange({ ...safeData, facturat: Number(e.target.value) || 0 })} />
        <div className="flex-1 h-1.5 bg-[#EFEAE1] rounded overflow-hidden">
          <div className="h-full bg-[#C98A2B]" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-[10.5px] text-[#8A8375]">
        alocat{" "}
        <input type="number" min={0} className="w-16 border border-[#DAD4C6] rounded px-1 py-0.5 text-[10.5px]"
          value={safeData.alocat || 0} onChange={(e) => onChange({ ...safeData, alocat: Number(e.target.value) || 0 })} />
        lei
      </div>
    </div>
  );
}
