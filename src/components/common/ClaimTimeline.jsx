import React from "react";
import { CheckCircle2, History, User } from "lucide-react";
import { PIPELINE_PHASES, getStatusDefinition } from "../../constants/config";
import { fmtDateTime, daysBetween } from "../../utils/dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "../../utils/claimUtils";
import { filterIstoricModificari } from "../../utils/claimAudit";

export default function ClaimTimeline({ currentStatus, dataSchimbareStatus, istoric = [], loading = false }) {
  const safeIstoric = Array.isArray(istoric) ? istoric : [];
  const currentPhase = getStatusDefinition(currentStatus).phase;
  const currentIdx = PIPELINE_PHASES.findIndex((phase) => phase.key === currentPhase);
  const daysInCurrent = daysBetween(dataSchimbareStatus);

  return (
    <div className="space-y-1">
      {/* Ultra-compact horizontal stepper */}
      <div className="flex items-center relative">
        {/* Background line */}
        <div className="absolute left-3 right-3 top-[11px] h-px bg-[var(--app-border)] z-0" />

        {PIPELINE_PHASES.map((phase, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={phase.key} className="relative z-10 flex flex-col items-center flex-1 group" title={phase.label}>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] transition-all ${
                  isCurrent
                    ? "bg-[var(--app-accent)] text-white ring-2 ring-[var(--app-accent)]/30"
                    : isPast
                    ? "bg-[var(--app-success)] text-white"
                    : "bg-[var(--app-surface-muted)] text-[var(--app-muted)] border border-[var(--app-border)]"
                }`}
              >
                {isPast ? <CheckCircle2 size={10} /> : String(idx + 1).padStart(2, "0")}
              </div>
              <span
                className={`text-[8px] mt-0.5 text-center font-semibold leading-tight max-w-[52px] truncate ${
                  isCurrent ? "text-[var(--app-text-strong)] font-bold" : isPast ? "text-[var(--app-success)]" : "text-[var(--app-muted)]"
                }`}
              >
                {phase.label.replace(/^\d+\.\s*/, "")}
              </span>
            </div>
          );
        })}

        {/* Days badge — right aligned */}
        <span className="ml-2 shrink-0 text-[9px] bg-[var(--app-accent)]/10 text-[var(--app-accent)] px-1.5 py-px rounded-full font-semibold whitespace-nowrap">
          {daysInCurrent === 0 ? "Azi" : `${daysInCurrent}z`}
        </span>
      </div>

      {/* Collapsible journal */}
      <details className="border-t border-[var(--app-border)]/60 pt-1">
        <summary className="text-[10px] font-bold text-[var(--app-muted)] cursor-pointer flex items-center gap-1 select-none hover:text-[var(--app-text-strong)]">
          <History size={10} /> Jurnal activitate &amp; modificări ({loading ? "…" : safeIstoric.length})
        </summary>

        <div className="mt-1.5 pl-2 max-h-36 overflow-y-auto space-y-1.5 pr-1">
          {loading ? (
            <div className="text-[10px] text-[var(--app-muted)] italic">Se încarcă...</div>
          ) : safeIstoric.length === 0 ? (
            <div className="text-[10px] text-[var(--app-muted)] italic">Nicio modificare înregistrată.</div>
          ) : (
            safeIstoric.map((h, i) => {
              const modificari = filterIstoricModificari(h.modificari);
              const entries = Object.entries(modificari);
              if (entries.length === 0) return null;
              return (
              <div key={h.id || i} className="relative pl-3 border-l-2 border-[var(--app-border)]">
                <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-[var(--app-muted)]" />
                <div className="flex items-center justify-between text-[9.5px] text-[var(--app-muted)] font-mono">
                  <span className="font-bold text-[var(--app-text-strong)]">{fmtDateTime(h.created_at)}</span>
                  <span className="flex items-center gap-0.5 text-[var(--app-muted)]">
                    <User size={9} /> {h.user_email || "necunoscut"}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5 text-[10px]">
                  {entries.map(([camp, diff]) => {
                    const oldVal = diff && typeof diff === "object" ? diff.old : undefined;
                    const newVal = diff && typeof diff === "object" ? diff.new : diff;
                    return (
                      <div key={camp} className="bg-[var(--app-surface)] border border-[var(--app-border)]/70 rounded px-1 py-px flex flex-wrap items-center gap-1">
                        <span className="font-semibold text-[var(--app-muted)]">{CAMP_LABELS[camp] || camp}:</span>
                        {camp === "_creat" ? (
                          <span className="text-[var(--app-success)] font-semibold">Dosar înregistrat</span>
                        ) : (
                          <span className="text-[var(--app-text-strong)]">
                            <span className="line-through text-[var(--app-muted)] mr-1">
                              {camp === "data_schimbare_status" ? fmtDateTime(oldVal) : formatIstoricValoare(camp, oldVal)}
                            </span>
                            ➔{" "}
                            <span className="font-bold text-[var(--app-accent)]">
                              {camp === "data_schimbare_status" ? fmtDateTime(newVal) : formatIstoricValoare(camp, newVal)}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })
          )}
        </div>
      </details>
    </div>
  );
}
