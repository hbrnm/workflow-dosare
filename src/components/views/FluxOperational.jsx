import React, { useState, useMemo, useEffect } from "react";
import {
  Bell, Phone, ChevronDown, ChevronUp, X
} from "lucide-react";
import { STATUSES, getStatusDefinition, isPieseComandateStatus, getStatusAlertDays, getClaimAlertDays, getPhaseColumnColors } from "../../constants/config";
import ClaimPlate from "../common/ClaimPlate";
import { telLink, formatProgramareShort, getSinceMeta } from "../../utils/dateUtils";
import { isStageOverdue, isDeliveryDeadlineOverdue, isPartsOrderOverdue, getDaysPastDeliveryDeadline, getDaysInStage } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import StageTabLabel from "../common/StageTabLabel";
import { glossaryTitle } from "../../constants/glossary";
import FluxHeaderBar from "../common/FluxHeaderBar";
import {
  isSearchHighlighted,
  groupHasSearchHighlight,
  scrollToFirstHighlight,
} from "../../utils/searchUtils";
import { groupAndSortStageClaims, getClaimStageDays, getFluxExportClaims } from "../../utils/fluxClaimSort";
import { downloadClaimsList } from "../../utils/exportClaimsList";
import { copyClaimNumber } from "../../utils/copyClaimNumber";
import { buildStatusCounts } from "../../utils/plateSchedule";

const STAGE_SORT_KEY = "deschidere";

// Culori oficiale per fază — sursă unică config.js

// ---------------------------------------------------------------------------
// KANBAN CARD — vizual minimal, funcții păstrate (status, piese, contact)
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEdit, pragRidicare, onNotify, hideStatusSelect = false, isSearchHighlight = false }) {
  const statusDef = getStatusDefinition(claim.status);
  const days = getDaysInStage(claim);
  const overdue = isStageOverdue(claim);
  const alertThreshold = getClaimAlertDays(claim);
  const phaseColorHex = getPhaseColumnColors(statusDef.phase).bg;

  let agingClass = "app-flux-aging";
  if (days >= 3 && days <= 5) agingClass = "app-flux-aging is-warn";
  if (days > 5 || overdue || claim.blocat) agingClass = "app-flux-aging is-danger";

  const pieseAlertDays = getStatusAlertDays("piese_comandate");
  const isPartOverdue = isPartsOrderOverdue(claim, pieseAlertDays);
  const termenDepasit = isDeliveryDeadlineOverdue(claim);

  const alertLine = isPartOverdue
    ? termenDepasit
      ? `Livrare +${getDaysPastDeliveryDeadline(claim)}z`
      : `Piese ${days}z`
    : null;

  const scheduleLabel =
    claim.status === "programat" && claim.dataProgramare
      ? formatProgramareShort(claim.dataProgramare)
      : "";
  const stageSince = getSinceMeta(claim.dataSchimbareStatus || claim.dataDeschiderii || null);
  const stageSinceLabel = stageSince.dateTimeLabel ? `În etapă din ${stageSince.dateTimeLabel}` : "";
  const blockedReason = String(claim.motivBlocare || claim.motivBlocat || "").trim();
  const ageTitle = scheduleLabel
    ? `Programat ${scheduleLabel}${overdue ? ` · +${days}z peste dată` : ""}`
    : `${days} zile în stadiu · prag ${alertThreshold} zile${stageSinceLabel ? ` · ${stageSinceLabel}` : ""}`;

  return (
    <div
      id={`claim-card-${claim.id}`}
      draggable={true}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && claim.numarDosar) {
          e.preventDefault();
          e.stopPropagation();
          copyClaimNumber(claim.numarDosar, onNotify);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(claim)}
      className={`group relative app-flux-card border-l-[3px] rounded-lg p-2.5 transition-all duration-150 cursor-pointer select-none ${
        claim.blocat || overdue ? "is-alert" : ""
      } ${isSearchHighlight ? "is-search-highlight" : ""}`}
      style={{ borderLeftColor: phaseColorHex }}
    >
      {/* Rând 1: identificare + vechime */}
      <div className="flex items-center justify-between gap-2 flex-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <ClaimPlate
              value={claim.numarInmatriculare}
              empty="FĂRĂ NR."
              className="text-[15px] sm:text-[16.5px] drop-shadow-sm truncate"
            />
            {claim.numarDosar && (
              <DosarNumber
                value={claim.numarDosar}
                onNotify={onNotify}
                className="text-[12px] md:text-[13px] font-mono text-[var(--app-muted)] hover:text-[var(--app-accent)] shrink-0"
              />
            )}
            {claim.tipAsigurare === "CASCO" && (
              <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded app-flux-casco">C</span>
            )}
            {claim.blocat && (
              <span className="text-[9px] font-extrabold text-[var(--app-danger)] uppercase">Blocat</span>
            )}
          </div>
          {(claim.client || claim.marcaModel) && (
            <p className="text-[11.5px] md:text-[12.5px] text-[var(--app-muted)] truncate mt-0.5 leading-tight" title={claim.client || claim.marcaModel}>
              {claim.client || claim.marcaModel}
            </p>
          )}
          {stageSinceLabel ? (
            <p className="text-[11.5px] md:text-[12.5px] text-[var(--app-muted)] truncate leading-tight mt-0.5" title={stageSinceLabel}>
              {stageSinceLabel}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-[12px] md:text-[13px] font-mono font-bold px-2 py-0.5 rounded ${agingClass}`}
          title={ageTitle}
        >
          {scheduleLabel || `${days}z`}
        </span>
      </div>

      {/* Stadiu — ascuns când cardul e deja în secțiunea etapei */}
      {!hideStatusSelect && (
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <select
          value={claim.status}
          onChange={(e) => onMoveToStatus(claim, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md px-2.5 py-1.5 font-bold text-[13px] md:text-[14px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          title="Schimbă stadiul dosarului"
        >
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key} title={s.label}>
              {String(s.num).padStart(2, "0")}. {s.label}
            </option>
          ))}
        </select>
      </div>
      )}

      {/* Alertă piese — o linie */}
      {alertLine && (
        <p className="mt-2 text-[12px] md:text-[13px] font-bold text-[var(--app-danger)] truncate flex items-center gap-1">
          <Bell size={12} className="shrink-0" />
          {alertLine}
        </p>
      )}
      {claim.blocat && blockedReason ? (
        <p className="mt-1 text-[12px] font-semibold text-[var(--app-danger)] truncate" title={`Motiv blocare: ${blockedReason}`}>
          Motiv blocare: {blockedReason}
        </p>
      ) : null}

      {/* Piese comandate — bloc funcțional compact */}
      {isPieseComandateStatus(claim.status) && (
        <div className="mt-1.5 app-flux-piese-inline">
          <MobilePieseSositeRow
            claim={claim}
            canEdit={canEdit}
            layout="inline"
            onToggle={(c, val) => onTogglePieseSosite?.(c, val)}
            onSchedule={onScheduleFromPiese}
            onPatchDates={onPatchPieseDates}
          />
        </div>
      )}

      {/* Contact — vizibil la hover */}
      {claim.telefonClient && (
        <div
          className="app-flux-contact-bar flex items-center justify-end gap-1 mt-1.5 pt-1 border-t opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={telLink(claim.telefonClient)}
            onClick={(e) => e.stopPropagation()}
            title={`Sună: ${claim.telefonClient}`}
            className="app-flux-contact-btn p-1 rounded-md transition-colors"
          >
            <Phone size={11} />
          </a>
          <WhatsAppButton phone={claim.telefonClient} claim={claim} size={10} />
        </div>
      )}
    </div>
  );
}

function renderClaimGroups(stageClaims, props, pieseAlertDays, highlightClaimIds) {
  return groupAndSortStageClaims(stageClaims, STAGE_SORT_KEY, pieseAlertDays).map(([groupKey, groupClaims]) => (
    <div key={groupKey} className="min-w-0">
      <StackedPhaseCardGroup groupKey={groupKey} groupClaims={groupClaims} highlightClaimIds={highlightClaimIds} hideStatusSelect {...props} />
    </div>
  ));
}

function getClaimAgingMeta(claim) {
  const days = getDaysInStage(claim);
  const overdue = isStageOverdue(claim);
  let agingClass = "app-flux-aging";
  if (days >= 3 && days <= 5) agingClass = "app-flux-aging is-warn";
  if (days > 5 || overdue || claim.blocat) agingClass = "app-flux-aging is-danger";
  const scheduleLabel =
    claim.status === "programat" && claim.dataProgramare
      ? formatProgramareShort(claim.dataProgramare)
      : "";
  return {
    days,
    agingClass,
    alertThreshold: getClaimAlertDays(claim),
    overdue,
    scheduleLabel,
    badgeText: scheduleLabel || `${days}z`,
    badgeTitle: scheduleLabel
      ? `Programat ${scheduleLabel}${overdue ? ` · +${days}z peste dată` : ""}`
      : `${days} zile (cel mai vechi) · prag ${getClaimAlertDays(claim)} zile`,
  };
}

function StackedPhaseCardGroup({ groupKey, groupClaims, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEditFn, pragRidicare, onNotify, hideStatusSelect, highlightClaimIds }) {
  const [expanded, setExpanded] = useState(false);
  const groupHighlighted = groupHasSearchHighlight(groupClaims, highlightClaimIds);

  useEffect(() => {
    if (!highlightClaimIds?.size) {
      setExpanded(false);
    }
  }, [highlightClaimIds]);
  const first = groupClaims[0];
  const plate = first.numarInmatriculare || groupKey;
  const subline = first.marcaModel || first.client || "";
  const statusDef = getStatusDefinition(first.status);
  const phaseColorHex = getPhaseColumnColors(statusDef.phase).bg;
  const groupHasAlert = groupClaims.some((c) => c.blocat || isStageOverdue(c));
  const leadClaim = groupClaims.reduce((best, c) => {
    const bestDays = getClaimStageDays(best);
    const cDays = getClaimStageDays(c);
    return cDays > bestDays ? c : best;
  }, first);
  const { days, agingClass, alertThreshold, badgeText, badgeTitle } = getClaimAgingMeta(leadClaim);

  const resolveCanEdit = (targetClaim) => {
    if (typeof canEditFn === "function") return canEditFn(targetClaim);
    if (typeof canEditFn === "boolean") return canEditFn;
    return true;
  };

  if (groupClaims.length === 1) {
    return (
      <PhaseCardRedesign
        claim={first}
        onOpen={onOpen}
        onMoveToStatus={onMoveToStatus}
        onTogglePieseSosite={onTogglePieseSosite}
        onScheduleFromPiese={onScheduleFromPiese}
        onPatchPieseDates={onPatchPieseDates}
        canEdit={resolveCanEdit(first)}
        pragRidicare={pragRidicare}
        onNotify={onNotify}
        hideStatusSelect={hideStatusSelect}
        isSearchHighlight={isSearchHighlighted(first.id, highlightClaimIds)}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`app-flux-card app-flux-stack-card w-full border-l-[3px] rounded-lg p-2.5 text-left transition-all cursor-pointer select-none ${groupHasAlert ? "is-alert" : ""} ${groupHighlighted ? "is-search-highlight" : ""}`}
        style={{ borderLeftColor: phaseColorHex }}
        title={`${groupClaims.length} dosare stivuite — click pentru a deschide în aer`}
      >
        <div className="flex items-center justify-between gap-2 flex-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              <span className="font-mono font-black text-[15px] sm:text-[16.5px] text-[var(--app-text-strong)] tracking-wider uppercase truncate">
                {plate}
              </span>
              <span className="app-flux-stack-badge text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                ×{groupClaims.length}
              </span>
            </div>
            <p className="text-[11px] text-[var(--app-muted)] truncate mt-0.5 min-h-[1.25rem] leading-5" title={subline}>
              {subline || "—"}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${agingClass}`}
              title={badgeTitle}
            >
              {badgeText}
            </span>
            <ChevronDown size={14} className="text-[var(--app-muted)]" />
          </div>
        </div>
      </button>

      {/* Pop-up în aer pentru dosarele stivuite (nu mai lungește celulele din grid) */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Pop-up */}
            <div
              className="flex items-center justify-between gap-3 p-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0"
              style={{ borderLeftWidth: 4, borderLeftColor: phaseColorHex }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-lg text-[var(--app-text-strong)] tracking-wider uppercase">
                    {plate}
                  </span>
                  <span className="bg-[var(--app-accent)] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    {groupClaims.length} dosare stivuite
                  </span>
                </div>
                {subline && (
                  <p className="text-[12px] text-[var(--app-muted)] font-semibold truncate mt-0.5">
                    {subline}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded-full hover:bg-[var(--app-surface-hover)] text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer"
                title="Închide"
              >
                <X size={18} />
              </button>
            </div>

            {/* Listă Carduri stivuite */}
            <div className="p-3 overflow-y-auto space-y-2.5 max-h-[calc(85vh-80px)] scrollbar-thin">
              {groupClaims.map((c) => (
                <PhaseCardRedesign
                  key={c.id}
                  claim={c}
                  onOpen={(claimToOpen) => {
                    setExpanded(false);
                    onOpen?.(claimToOpen);
                  }}
                  onMoveToStatus={onMoveToStatus}
                  onTogglePieseSosite={onTogglePieseSosite}
                  onScheduleFromPiese={onScheduleFromPiese}
                  onPatchPieseDates={onPatchPieseDates}
                  canEdit={resolveCanEdit(c)}
                  pragRidicare={pragRidicare}
                  onNotify={onNotify}
                  hideStatusSelect={hideStatusSelect}
                  isSearchHighlight={isSearchHighlighted(c.id, highlightClaimIds)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MAIN FLUX OPERAȚIONAL REDESIGN
// ---------------------------------------------------------------------------
export default function TablouPeFazeRedesign({
  claims,
  onOpen,
  onOpenClaim,
  onMoveToStatus,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  onAddInStatus,
  onDuplicate,
  canEditFn,
  pragRidicare,
  onNotify,
  highlightClaimIds = null,
  density = "cozy",
}) {
  const openFn = onOpen || onOpenClaim;
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);
  const [focusedStage, setFocusedStage] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const pieseAlertDays = getStatusAlertDays("piese_comandate");

  useEffect(() => {
    const handleSelectStageFilter = (e) => {
      setFocusedStage(e.detail || null);
    };
    window.addEventListener("app:select_stage_filter", handleSelectStageFilter);
    return () => window.removeEventListener("app:select_stage_filter", handleSelectStageFilter);
  }, []);

  useEffect(() => {
    if (!highlightClaimIds?.size) return;
    setFocusedStage(null);
    const t = window.setTimeout(() => scrollToFirstHighlight(highlightClaimIds, "claim-card"), 120);
    return () => window.clearTimeout(t);
  }, [highlightClaimIds]);

  const overduePartClaims = useMemo(() => {
    return claims.filter((c) => isPartsOrderOverdue(c, pieseAlertDays));
  }, [claims, pieseAlertDays]);

  const overdueDeliveryClaims = useMemo(() => {
    return claims.filter(isDeliveryDeadlineOverdue);
  }, [claims]);

  const statusCounts = useMemo(() => buildStatusCounts(claims), [claims]);

  const cardProps = {
    onOpen: openFn,
    onMoveToStatus,
    onTogglePieseSosite,
    onScheduleFromPiese,
    onPatchPieseDates,
    canEditFn,
    pragRidicare,
    onNotify,
    hideStatusSelect: true,
  };

  const visibleStages = useMemo(() => {
    if (focusedStage) {
      return STATUSES.filter((s) => s.key === focusedStage);
    }
    return STATUSES.filter((s) => claims.some((c) => c.status === s.key));
  }, [focusedStage, claims]);

  const exportClaims = useMemo(
    () => getFluxExportClaims(claims, { focusedStage, sortKey: STAGE_SORT_KEY, pieseAlertDays }),
    [claims, focusedStage, pieseAlertDays],
  );

  const handleDownloadList = async (format) => {
    await downloadClaimsList(exportClaims, { focusedStage, format });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full space-y-2.5 font-sans text-[var(--app-text)]" data-density={density}>

      {/* 1. ALERT BANNER AUTO-GENERAT (PIESE ÎNTÂRZIATE Overdue Threshold) */}
      {overduePartClaims.length > 0 && !dismissAlertBanner && (
        <div className="app-flux-alert-banner flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[12px]">
          <span>
            <b>{overduePartClaims.length}</b> dosare cu piese de verificat
            {overdueDeliveryClaims.length > 0 && (
              <> · <b>{overdueDeliveryClaims.length}</b> termen livrare depășit</>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {focusedStage !== "piese_comandate" && (
              <button
                type="button"
                onClick={() => setFocusedStage("piese_comandate")}
                className="text-[11px] font-bold px-2 py-0.5 rounded-md border"
              >
                Vezi etapa
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissAlertBanner(true)}
              className="hover:opacity-80 p-1 rounded-md font-bold"
              aria-label="Închide"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Etape — aceeași bandă ca în Tabel */}
      <FluxHeaderBar
        statusCounts={statusCounts}
        focusedStage={focusedStage}
        onFocusStage={setFocusedStage}
        exportCount={exportClaims.length}
        onExport={handleDownloadList}
      />

      {/* Board vertical — secțiuni etapă, grid responsive */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin space-y-4 pb-2">
        {visibleStages.length === 0 ? (
          <div className="app-empty">
            Niciun dosar pentru filtrele selectate.
          </div>
        ) : (
          visibleStages.map((status) => {
            const stageClaims = claims.filter((c) => c.status === status.key);
            const totalAll = statusCounts[status.key] || 0;
            const phaseAccent = getPhaseColumnColors(status.phase).bg;
            const isDragTarget = dragOverStage === status.key;

            return (
              <section
                key={status.key}
                id={`flux-stage-${status.key}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverStage(status.key);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverStage(status.key);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverStage((prev) => (prev === status.key ? null : prev));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const claimId = e.dataTransfer.getData("text/plain");
                  if (claimId && onMoveToStatus) {
                    const claim = claims.find((cl) => cl.id === claimId);
                    if (claim) onMoveToStatus(claim, status.key);
                  }
                }}
                className={`app-flux-stage-section rounded-xl overflow-hidden ${isDragTarget ? "is-drag-over" : ""}`}
                style={{ "--flux-phase-accent": phaseAccent }}
              >
                <div
                  className="app-flux-stage-header flex flex-wrap items-center justify-between gap-2 p-2 border-b border-[var(--app-border-soft)]"
                  style={{ borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: phaseAccent }}
                >
                  <StageTabLabel
                    num={status.num}
                    label={status.label}
                    count={totalAll}
                    title={glossaryTitle(status.key)}
                    className="flex-1 min-w-0 pointer-events-none"
                  />
                </div>

                {stageClaims.length === 0 ? (
                  <div className="app-flux-stage-drop m-2 py-6 border border-dashed rounded-lg text-center text-[11px] text-[var(--app-muted)]">
                    Niciun dosar aici · trage un card sau schimbă etapa din dosar
                  </div>
                ) : (
                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 items-start auto-rows-min">
                    {renderClaimGroups(stageClaims, cardProps, pieseAlertDays, highlightClaimIds)}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

    </div>
  );
}
