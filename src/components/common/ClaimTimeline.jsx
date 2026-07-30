import React from "react";
import { CheckCircle2, Clock, Circle, History, User } from "lucide-react";
import { STATUSES, getStatusDefinition } from "../../constants/config";
import { fmtDateTime, daysBetween } from "../../utils/dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "../../utils/claimUtils";

export default function ClaimTimeline({ currentStatus, dataSchimbareStatus, istoric = [], loading = false }) {
  const currentDef = getStatusDefinition(currentStatus);
  const currentIdx = STATUSES.findIndex((s) => s.key === currentStatus);
  const daysInCurrent = daysBetween(dataSchimbareStatus);

  return (
    <div className="bg-[#FCFAF5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-4">
      {/* 1. Horizontal Phase Progress Stepper */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-[#6B6558] mb-2 uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#C98A2B]" /> Parcurs Etapizat Dosar
          </span>
          <span className="bg-[#C98A2B]/10 text-[#7A5316] px-2 py-0.5 rounded-full font-semibold">
            {daysInCurrent === 0 ? "Actualizat azi" : `${daysInCurrent} zi(le) în statusul curent`}
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex items-center min-w-[700px] justify-between relative px-2">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-[#DAD4C6] z-0" />

            {STATUSES.map((s, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div key={s.key} className="relative z-10 flex flex-col items-center group cursor-default min-w-[68px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10.5px] transition-all ${
                      isCurrent
                        ? "bg-[#C98A2B] text-white ring-4 ring-[#C98A2B]/20 shadow-md scale-110"
                        : isPast
                        ? "bg-[#3E6B45] text-white"
                        : "bg-[#EFEAE1] text-[#8A8375] border border-[#DAD4C6]"
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={15} /> : String(s.num).padStart(2, "0")}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 text-center font-semibold max-w-[72px] leading-tight truncate ${
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
      <details className="border-t border-[#DAD4C6]/80 pt-2.5">
        <summary className="text-[11.5px] font-bold text-[#3B5166] cursor-pointer flex items-center gap-1.5 select-none hover:text-[#23282E]">
          <History size={13} /> Jurnal complet activitate &amp; modificări ({loading ? "..." : istoric.length})
        </summary>

        <div className="mt-3 pl-2 max-h-56 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-[11.5px] text-[#8A8375] italic py-2">Se încarcă istoricul...</div>
          ) : istoric.length === 0 ? (
            <div className="text-[11.5px] text-[#8A8375] italic py-2">Nicio modificare înregistrată în jurnal.</div>
          ) : (
            istoric.map((h, i) => (
              <div key={h.id || i} className="relative pl-5 border-l-2 border-[#DAD4C6] pb-1">
                {/* Bullet */}
                <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-[#3B5166]" />

                <div className="flex items-center justify-between text-[10.5px] text-[#6B6558] font-mono">
                  <span className="font-bold text-[#23282E]">{fmtDateTime(h.created_at)}</span>
                  <span className="flex items-center gap-1 text-[#8A8375]">
                    <User size={11} /> {h.user_email || "utilizator necunoscut"}
                  </span>
                </div>

                <div className="mt-1 space-y-0.5 text-[11.5px]">
                  {Object.entries(h.modificari || {}).map(([camp, diff]) => (
                    <div key={camp} className="bg-white border border-[#DAD4C6]/70 rounded px-2 py-1 flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-[#3B5166]">{CAMP_LABELS[camp] || camp}:</span>
                      {camp === "_creat" ? (
                        <span className="text-[#3E6B45] font-semibold">Dosar înregistrat în sistem</span>
                      ) : (
                        <span className="text-[#23282E]">
                          <span className="line-through text-[#8A8375] mr-1">
                            {camp === "data_schimbare_status" ? fmtDateTime(diff.old) : formatIstoricValoare(camp, diff.old)}
                          </span>
                          ➔{" "}
                          <span className="font-bold text-[#C98A2B]">
                            {camp === "data_schimbare_status" ? fmtDateTime(diff.new) : formatIstoricValoare(camp, diff.new)}
                          </span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
