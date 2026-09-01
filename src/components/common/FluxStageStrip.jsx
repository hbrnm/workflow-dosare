import React, { useState } from "react";
import { STATUSES } from "../../constants/config";
import { alertTabClass } from "./alertTabClasses";
import StageTabLabel from "./StageTabLabel";

/** Bandă etape — aceeași în Flux și Tabel. Suportă drag and drop pentru mutarea dosarelor în stadii. */
export default function FluxStageStrip({
  statusCounts = {},
  focusedStage = null,
  onFocusStage,
  matchingStageCounts = {},
  claims = [],
  onMoveToStatus,
  onNotify,
  className = "",
}) {
  const [dragOverStageKey, setDragOverStageKey] = useState(null);

  const handleDragOver = (e, stageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageKey !== stageKey) {
      setDragOverStageKey(stageKey);
    }
  };

  const handleDragLeave = (e, stageKey) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStageKey((prev) => (prev === stageKey ? null : prev));
    }
  };

  const handleDrop = (e, stage) => {
    e.preventDefault();
    setDragOverStageKey(null);
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData || !onMoveToStatus) return;

    let targetIds = [];
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed.claimIds) && parsed.claimIds.length > 0) {
        targetIds = parsed.claimIds;
      } else if (parsed.claimId) {
        targetIds = [parsed.claimId];
      }
    } catch (err) {
      targetIds = [rawData];
    }

    const targetClaims = (claims || []).filter((c) => targetIds.map(String).includes(String(c.id)));
    if (targetClaims.length > 0) {
      let movedCount = 0;
      targetClaims.forEach((claim) => {
        if (claim.status !== stage.key) {
          onMoveToStatus(claim, stage.key);
          movedCount += 1;
        }
      });

      if (movedCount > 0) {
        const identifier = targetClaims.length > 1
          ? `${targetClaims.length} dosare (${targetClaims[0].numarInmatriculare || "stivuite"})`
          : (targetClaims[0].numarInmatriculare || targetClaims[0].numarDosar || "Dosarul");
        onNotify?.(`${identifier} ${targetClaims.length > 1 ? "au fost mutate" : "a fost mutat"} în „${stage.label}”.`, "success");
      }
    }
  };

  return (
    <div className={`app-brief-panel rounded-xl p-2 shrink-0 min-w-0 ${className}`}>
      <div className="app-flux-stage-strip flex flex-nowrap items-center gap-1.5 text-[13px] sm:text-[14px] overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => onFocusStage?.(null)}
          className={`${alertTabClass("toate_etape", focusedStage === null ? "toate_etape" : "")} shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] sm:text-[14px] font-semibold rounded-full transition-all ${
            focusedStage !== null 
              ? "bg-slate-200/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200" 
              : "bg-[var(--app-surface)] text-[var(--app-text-strong)] shadow-sm border-[var(--app-border)] hover:border-[var(--app-accent)]"
          }`}
        >
          Toate
        </button>
        {STATUSES.map((s) => {
          const matchCount = matchingStageCounts[s.key] || 0;
          const isDragOver = dragOverStageKey === s.key;
          return (
            <StageTabLabel
              key={s.key}
              as="button"
              num={s.num}
              label={s.label}
              count={statusCounts[s.key] || 0}
              selected={focusedStage === s.key}
              isSearchMatch={matchCount > 0}
              searchCount={matchCount}
              onClick={() => onFocusStage?.(focusedStage === s.key ? null : s.key)}
              onDragEnter={(e) => handleDragOver(e, s.key)}
              onDragOver={(e) => handleDragOver(e, s.key)}
              onDragLeave={(e) => handleDragLeave(e, s.key)}
              onDrop={(e) => handleDrop(e, s)}
              isDragOver={isDragOver}
              className="shrink-0"
            />
          );
        })}
      </div>
    </div>
  );
}
