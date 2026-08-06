import React from "react";
import Programator from "../../components/views/Programator";

/**
 * Wrapper: Programator v1 (UI light) într-un container scrollabil pe fundal 2.0.
 */
export default function SchedulePanel({
  claims,
  onOpen,
  onPatch,
  canEditFn,
  capacitate,
  onSetCapacitate,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-border)] px-4 py-3">
        <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          Programări
        </h1>
        <p className="text-xs text-[var(--v2-muted)]">Calendar și sloturi orare din atelier</p>
      </div>
      <div className="v2-legacy-light min-h-0 flex-1 overflow-y-auto bg-[#F7F5F0] p-3 text-[#23282E]">
        <Programator
          claims={claims}
          onOpen={(c) => onOpen(typeof c === "string" ? c : c?.id)}
          onPatch={onPatch}
          canEditFn={canEditFn}
          capacitate={capacitate}
          onSetCapacitate={onSetCapacitate}
        />
      </div>
    </div>
  );
}
