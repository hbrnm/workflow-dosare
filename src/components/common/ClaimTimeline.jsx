import React from "react";
import { CheckCircle2, History, User } from "lucide-react";
import { PIPELINE_PHASES, getStatusDefinition } from "../../constants/config";
import { fmtDateTime, daysBetween } from "../../utils/dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "../../utils/claimUtils";

export default function ClaimTimeline({ currentStatus, dataSchimbareStatus, istoric = [], loading = false }) {
  const currentPhase = getStatusDefinition(currentStatus).phase;
  const currentIdx = PIPELINE_PHASES.findIndex((phase) => phase.key === currentPhase);
  const daysInCurrent = daysBetween(dataSchimbareStatus);

  return (
    <div className="space-y-1">
      {/* Ultra-compact horizontal stepper */}
      <div className="flex items-center relative">
        {/* Background line */}
        <div className="absolute left-3 right-3 top-[11px] h-px bg-[#DAD4C6] z-0" />

        {PIPELINE_PHASES.map((phase, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={phase.key} className="relative z-10 flex flex-col items-center flex-1 group" title={phase.label}>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] transition-all ${
                  isCurrent
                    ? "bg-[#C98A2B] text-white ring-2 ring-[#C98A2B]/30"
                    : isPast
                    ? "bg-[#3E6B45] text-white"
                    : "bg-[#EFEAE1] text-[#8A8375] border border-[#DAD4C6]"
                }`}
              >
                {isPast ? <CheckCircle2 size={10} /> : String(idx + 1).padStart(2, "0")}
              </div>
              <span
                className={`text-[8px] mt-0.5 text-center font-semibold leading-tight max-w-[52px] truncate ${
                  isCurrent ? "text-[#23282E] font-bold" : isPast ? "text-[#3E6B45]" : "text-[#C2BCB0]"
                }`}
              >
                {phase.label.replace(/^\d+\.\s*/, "")}
              </span>
            </div>
          );
        })}

        {/* Days badge — right aligned */}
        <span className="ml-2 shrink-0 text-[9px] bg-[#C98A2B]/10 text-[#7A5316] px-1.5 py-px rounded-full font-semibold whitespace-nowrap">
          {daysInCurrent === 0 ? "Azi" : `${daysInCurrent}z`}
        </span>
      </div>

      {/* Collapsible journal */}
      <details className="border-t border-[#DAD4C6]/60 pt-1">
        <summary className="text-[10px] font-bold text-[#3B5166] cursor-pointer flex items-center gap-1 select-none hover:text-[#23282E]">
          <History size={10} /> Jurnal activitate &amp; modificări ({loading ? "…" : istoric.length})
        </summary>

        <div className="mt-1.5 pl-2 max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="text-[10px] text-[#8A8375] italic">Se încarcă...</div>
          ) : istoric.length === 0 ? (
            <div className="text-[10px] text-[#8A8375] italic">Nicio modificare înregistrată.</div>
          ) : (
            istoric.map((h, i) => (
              <div key={h.id || i} className="relative pl-3 border-l-2 border-[#DAD4C6]">
                <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-[#3B5166]" />
                <div className="flex items-center justify-between text-[9.5px] text-[#6B6558] font-mono">
                  <span className="font-bold text-[#23282E]">{fmtDateTime(h.created_at)}</span>
                  <span className="flex items-center gap-0.5 text-[#8A8375]">
                    <User size={9} /> {h.user_email || "necunoscut"}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5 text-[10px]">
                  {Object.entries(h.modificari || {}).map(([camp, diff]) => {
                    const oldVal = diff && typeof diff === "object" ? diff.old : undefined;
                    const newVal = diff && typeof diff === "object" ? diff.new : diff;
                    return (
                      <div key={camp} className="bg-white border border-[#DAD4C6]/70 rounded px-1 py-px flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-[#3B5166]">{CAMP_LABELS[camp] || camp}:</span>
                        {camp === "_creat" ? (
                          <span className="text-[#3E6B45] font-semibold">Dosar înregistrat</span>
                        ) : (
                          <span className="text-[#23282E]">
                            <span className="line-through text-[#8A8375] mr-1">
                              {camp === "data_schimbare_status" ? fmtDateTime(oldVal) : formatIstoricValoare(camp, oldVal)}
                            </span>
                            ➔{" "}
                            <span className="font-bold text-[#C98A2B]">
                              {camp === "data_schimbare_status" ? fmtDateTime(newVal) : formatIstoricValoare(camp, newVal)}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
