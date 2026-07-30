import React from "react";
import { CheckCircle2, Clock, History, User } from "lucide-react";
import { STATUSES, getStatusDefinition } from "../../constants/config";
import { fmtDateTime, daysBetween } from "../../utils/dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "../../utils/claimUtils";

export default function ClaimTimeline({ currentStatus, dataSchimbareStatus, istoric = [], loading = false }) {
  const currentIdx = STATUSES.findIndex((s) => s.key === currentStatus);
  const daysInCurrent = daysBetween(dataSchimbareStatus);

  return (
    <div className="bg-[#FCFAF5] border border-[#DAD4C6] rounded-lg p-2.5 space-y-2">
      {/* 1. Horizontal Phase Progress Stepper */}
      <div>
        <div className="flex items-center justify-between text-[10.5px] font-bold text-[#6B6558] mb-1 uppercase tracking-wide">
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-[#C98A2B]" /> Parcurs Etapizat Dosar
          </span>
          <span className="bg-[#C98A2B]/10 text-[#7A5316] px-1.5 py-0.2 rounded-full text-[10px] font-semibold">
            {daysInCurrent === 0 ? "Actualizat azi" : `${daysInCurrent} zi(le) în statusul curent`}
          </span>
        </div>

        <div className="overflow-x-auto pb-0.5">
          <div className="flex items-center min-w-[650px] justify-between relative px-2">
            {/* Connecting line */}
            <div className="absolute left-5 right-5 top-3 h-0.5 bg-[#DAD4C6] z-0" />

            {STATUSES.map((s, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center group cursor-default min-w-[62px]">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9.5px] transition-all ${
                      isCurrent
                        ? "bg-[#C98A2B] text-white ring-2 ring-[#C98A2B]/30 shadow-xs scale-105"
                        : isPast
                        ? "bg-[#3E6B45] text-white"
                        : "bg-[#EFEAE1] text-[#8A8375] border border-[#DAD4C6]"
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={13} /> : String(s.num).padStart(2, "0")}
                  </div>
                  <span
                    className={`text-[9.5px] mt-1 text-center font-semibold max-w-[68px] leading-tight truncate ${
                      isCurrent ? "text-[#23282E] font-bold" : isPast ? "text-[#3E6B45]" : "text-[#8A8375]"
                    }`}
                    title={s.label}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Detailed Vertical History Logs */}
      <details className="border-t border-[#DAD4C6]/80 pt-1.5">
        <summary className="text-[11px] font-bold text-[#3B5166] cursor-pointer flex items-center gap-1 select-none hover:text-[#23282E]">
          <History size={12} /> Jurnal activitate &amp; modificări ({loading ? "..." : istoric.length})
        </summary>

        <div className="mt-2 pl-2 max-h-48 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-[11px] text-[#8A8375] italic py-1">Se încarcă istoricul...</div>
          ) : istoric.length === 0 ? (
            <div className="text-[11px] text-[#8A8375] italic py-1">Nicio modificare înregistrată în jurnal.</div>
          ) : (
            istoric.map((h, i) => (
              <div key={h.id || i} className="relative pl-4 border-l-2 border-[#DAD4C6] pb-0.5">
                {/* Bullet */}
                <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-[#3B5166]" />

                <div className="flex items-center justify-between text-[10px] text-[#6B6558] font-mono">
                  <span className="font-bold text-[#23282E]">{fmtDateTime(h.created_at)}</span>
                  <span className="flex items-center gap-1 text-[#8A8375]">
                    <User size={10} /> {h.user_email || "utilizator necunoscut"}
                  </span>
                </div>

                <div className="mt-0.5 space-y-0.5 text-[11px]">
                  {Object.entries(h.modificari || {}).map(([camp, diff]) => {
                    const oldVal = diff && typeof diff === "object" ? diff.old : undefined;
                    const newVal = diff && typeof diff === "object" ? diff.new : diff;
                    return (
                      <div key={camp} className="bg-white border border-[#DAD4C6]/70 rounded px-1.5 py-0.5 flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-[#3B5166]">{CAMP_LABELS[camp] || camp}:</span>
                        {camp === "_creat" ? (
                          <span className="text-[#3E6B45] font-semibold">Dosar înregistrat în sistem</span>
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
