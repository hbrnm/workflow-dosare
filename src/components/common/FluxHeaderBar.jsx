import React from "react";
import FluxStageStrip from "./FluxStageStrip";
import ExportFormatMenu from "./ExportFormatMenu";

/**
 * Antet comun pentru Flux Operational și ClaimTable (bandă etape + meniu export).
 *
 * @param {object} statusCounts - Număr dosare per status
 * @param {string|null} focusedStage - Etapa pe care se filtrează (sau null pentru toate)
 * @param {function} onFocusStage - Handler schimbare etapă
 * @param {number} exportCount - Număr dosare disponibile pentru export
 * @param {function} onExport - Handler export (pdf/csv/excel)
 * @param {string} [className=""] - Clasă CSS opțională
 */
export default function FluxHeaderBar({
  statusCounts = {},
  focusedStage = null,
  onFocusStage,
  exportCount = 0,
  onExport,
  className = "",
}) {
  return (
    <div className={`flex items-stretch gap-2 min-w-0 ${className}`}>
      <FluxStageStrip
        className="flex-1 min-w-0"
        statusCounts={statusCounts}
        focusedStage={focusedStage}
        onFocusStage={onFocusStage}
      />
      <ExportFormatMenu
        count={exportCount}
        disabled={exportCount === 0}
        onExport={onExport}
        className="shrink-0 self-center"
      />
    </div>
  );
}
