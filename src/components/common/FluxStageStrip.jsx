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
    const claimId = e.dataTransfer.getData("text/plain");
    if (claimId && onMoveToStatus) {
      const claim = claims.find((c) => String(c.id) === String(claimId));
      if (claim) {
        if (claim.status === stage.key) return;
        onMoveToStatus(claim, stage.key);
        const identifier = claim.numarInmatriculare || claim.numarDosar || "Dosarul";
        onNotify?.(`${identifier} a fost mutat în „${stage.label}”.`, "success");
      }
    }
  };

  return (
    <div className={`app-brief-panel rounded-xl p-2 shrink-0 min-w-0 ${className}`}>
      <div className="app-flux-stage-strip flex flex-nowrap items-center gap-1.5 text-[13px] sm:text-[14px] overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => onFocusStage?.(null)}
          className={`${alertTabClass("toate_etape", focusedStage === null ? "toate_etape" : "")} shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] sm:text-[14px] font-semibold`}
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
