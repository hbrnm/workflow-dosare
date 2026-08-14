import React from "react";
import { STATUSES } from "../../constants/config";
import { alertTabClass } from "./alertTabClasses";
import StageTabLabel from "./StageTabLabel";

/** Bandă etape — aceeași în Flux și Tabel. */
export default function FluxStageStrip({
  statusCounts = {},
  focusedStage = null,
  onFocusStage,
  className = "",
}) {
  return (
    <div className={`app-brief-panel rounded-xl p-2 shrink-0 min-w-0 ${className}`}>
      <div className="app-flux-stage-strip flex flex-nowrap items-center gap-1.5 text-[11px] overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => onFocusStage?.(null)}
          className={`${alertTabClass("toate_etape", focusedStage === null ? "toate_etape" : "")} shrink-0 whitespace-nowrap`}
        >
          Toate
        </button>
        {STATUSES.map((s) => (
          <StageTabLabel
            key={s.key}
            as="button"
            num={s.num}
            label={s.label}
            count={statusCounts[s.key] || 0}
            selected={focusedStage === s.key}
            onClick={() => onFocusStage?.(focusedStage === s.key ? null : s.key)}
            className="shrink-0"
          />
        ))}
      </div>
    </div>
  );
}
