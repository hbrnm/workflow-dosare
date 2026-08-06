import React, { useState, useMemo } from "react";
import {
  Bell, Phone, ChevronDown, ChevronUp
} from "lucide-react";
import { STATUSES, getStatusDefinition, isPieseComandateStatus, getStatusAlertDays, getClaimAlertDays, getPhaseColumnColors } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { isStageOverdue, isDeliveryDeadlineOverdue, isPartsOrderOverdue, getDaysPastDeliveryDeadline } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import { alertTabClass } from "../common/alertTabClasses";
import StageTabLabel from "../common/StageTabLabel";

const FLUX_STAGE_SORTS = [
  { key: "alerte", tabKey: "sort_alerte", label: "Alerte" },
  { key: "vechime", tabKey: "sort_vechime", label: "Vechime" },
];

function getClaimStageDays(claim) {
  return claim?.dataSchimbareStatus ? daysBetween(claim.dataSchimbareStatus) : 0;
}

/** Scor alertă — mai mare = mai urgent (blocat > termen > piese > stagnare). */
function getClaimAlertScore(claim, pieseAlertDays) {
  let score = 0;
  if (claim.blocat) score += 10_000;
  if (isDeliveryDeadlineOverdue(claim)) score += 5_000 + getDaysPastDeliveryDeadline(claim);
  if (isPartsOrderOverdue(claim, pieseAlertDays)) score += 2_000 + getClaimStageDays(claim);
  if (isStageOverdue(claim)) score += 1_000 + getClaimStageDays(claim);
  return score;
}

function getGroupSortValue(groupClaims, sortKey, pieseAlertDays) {
  if (sortKey === "vechime") {
    return Math.max(...groupClaims.map(getClaimStageDays));
  }
  return Math.max(...groupClaims.map((c) => getClaimAlertScore(c, pieseAlertDays)));
}

function groupAndSortStageClaims(stageClaims, sortKey, pieseAlertDays) {
  const groupedMap = new Map();
  stageClaims.forEach((c) => {
    const plate = (c.numarInmatriculare || "").trim().toUpperCase();
    const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key).push(c);
  });

  const compareClaims = (a, b) => {
    if (sortKey === "vechime") return getClaimStageDays(b) - getClaimStageDays(a);
    const diff = getClaimAlertScore(b, pieseAlertDays) - getClaimAlertScore(a, pieseAlertDays);
    return diff !== 0 ? diff : getClaimStageDays(b) - getClaimStageDays(a);
  };

  groupedMap.forEach((group) => group.sort(compareClaims));

  return Array.from(groupedMap.entries()).sort(([, ga], [, gb]) => {
    const diff = getGroupSortValue(gb, sortKey, pieseAlertDays) - getGroupSortValue(ga, sortKey, pieseAlertDays);
    if (diff !== 0) return diff;
    const plateA = (ga[0]?.numarInmatriculare || "").trim();
    const plateB = (gb[0]?.numarInmatriculare || "").trim();
    return plateA.localeCompare(plateB, "ro");
  });
}

// Culori oficiale per fază — sursă unică config.js

const copyClaimNumber = async (numarDosar, onNotify) => {
  if (!numarDosar?.trim()) return;
  try {
    await navigator.clipboard.writeText(numarDosar.trim());
    onNotify?.(`Nr. dosar copiat: ${numarDosar.trim()}`, "success");
  } catch {
    onNotify?.("Nu am putut copia în clipboard.", "error");
  }
};

// ---------------------------------------------------------------------------
// KANBAN CARD — vizual minimal, funcții păstrate (status, piese, contact)
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEdit, pragRidicare, onNotify, hideStatusSelect = false }) {
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);
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
      className={`card group relative app-flux-card border-l-[3px] rounded-lg p-2 transition-colors duration-150 cursor-pointer select-none ${
        claim.blocat || overdue ? "is-alert" : ""
      }`}
      style={{ borderLeftColor: phaseColorHex }}
    >
      {/* Rând 1: identificare + vechime */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <span className="font-mono font-extrabold text-[13px] text-[var(--app-text-strong)] truncate">
              {claim.numarInmatriculare || "FĂRĂ NR."}
            </span>
            {claim.numarDosar && (
              <button
                type="button"
                className="text-[10px] font-mono text-[var(--app-muted)] hover:text-[var(--app-accent)] shrink-0"
                title={`Dosar #${claim.numarDosar} — click copiere`}
                onClick={(e) => {
                  e.stopPropagation();
                  copyClaimNumber(claim.numarDosar, onNotify);
                }}
              >
                #{claim.numarDosar}
              </button>
            )}
            {claim.tipAsigurare === "CASCO" && (
              <span className="text-[8px] font-bold uppercase px-1 rounded app-flux-casco">C</span>
            )}
            {claim.blocat && (
              <span className="text-[8px] font-extrabold text-[var(--app-danger)] uppercase">Blocat</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--app-muted)] truncate mt-0.5" title={claim.client || claim.marcaModel}>
            {claim.client || claim.marcaModel || "—"}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${agingClass}`}
          title={`${days} zile în stadiu · prag ${alertThreshold} zile`}
        >
          {days}z
        </span>
      </div>

      {/* Stadiu — ascuns când cardul e deja în secțiunea etapei */}
      {!hideStatusSelect && (
      <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
        <select
          value={claim.status}
          onChange={(e) => onMoveToStatus(claim, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md px-2 py-1 font-bold text-[11px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
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
        <p className="mt-1.5 text-[10px] font-bold text-[var(--app-danger)] truncate flex items-center gap-1">
          <Bell size={10} className="shrink-0" />
          {alertLine}
        </p>
      )}

      {/* Piese comandate — bloc funcțional compact */}
      {isPieseComandateStatus(claim.status) && (
        <div className="mt-1.5">
          <MobilePieseSositeRow
            claim={claim}
            canEdit={canEdit}
            compact
            hideDatesUntilHover
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

function renderClaimGroups(stageClaims, props, sortKey, pieseAlertDays) {
  return groupAndSortStageClaims(stageClaims, sortKey, pieseAlertDays).map(([groupKey, groupClaims]) => (
    <div key={groupKey} className="min-w-0">
      <StackedPhaseCardGroup groupKey={groupKey} groupClaims={groupClaims} hideStatusSelect {...props} />
    </div>
  ));
}

function StackedPhaseCardGroup({ groupKey, groupClaims, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEditFn, pragRidicare, onNotify, hideStatusSelect }) {
  const [expanded, setExpanded] = useState(false);
  const first = groupClaims[0];
  const plate = first.numarInmatriculare || groupKey;
  const brand = first.marcaModel || first.client || "";

  if (groupClaims.length === 1) {
    return (
      <PhaseCardRedesign
        claim={first}
        onOpen={onOpen}
        onMoveToStatus={onMoveToStatus}
        onTogglePieseSosite={onTogglePieseSosite}
        onScheduleFromPiese={onScheduleFromPiese}
        onPatchPieseDates={onPatchPieseDates}
        canEdit={canEditFn(first)}
        pragRidicare={pragRidicare}
        onNotify={onNotify}
        hideStatusSelect={hideStatusSelect}
      />
    );
  }

  return (
    <div className="app-flux-stack rounded-lg p-1 space-y-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="app-flux-stack-header w-full flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors text-left"
        title={expanded ? "Restrânge" : "Extinde dosarele"}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-extrabold text-[12px] uppercase truncate">
            {plate}
          </span>
          {brand && (
            <span className="text-[10px] text-[var(--app-muted)] truncate">{brand}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="app-flux-stack-badge text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {groupClaims.length}
          </span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-1 pt-0.5">
          {groupClaims.map((c) => (
            <PhaseCardRedesign
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              onTogglePieseSosite={onTogglePieseSosite}
              onScheduleFromPiese={onScheduleFromPiese}
              onPatchPieseDates={onPatchPieseDates}
              canEdit={canEditFn(c)}
              pragRidicare={pragRidicare}
              onNotify={onNotify}
              hideStatusSelect={hideStatusSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN FLUX OPERAȚIONAL REDESIGN
// ---------------------------------------------------------------------------
export default function TablouPeFazeRedesign({
  claims,
  onOpen,
  onMoveToStatus,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  onAddInStatus,
  onDuplicate,
  canEditFn,
  pragRidicare,
  onNotify,
}) {
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);
  const [focusedStage, setFocusedStage] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [stageSort, setStageSort] = useState("alerte");
  const pieseAlertDays = getStatusAlertDays("piese_comandate");

  const overduePartClaims = useMemo(() => {
    return claims.filter((c) => isPartsOrderOverdue(c, pieseAlertDays));
  }, [claims, pieseAlertDays]);

  const overdueDeliveryClaims = useMemo(() => {
    return claims.filter(isDeliveryDeadlineOverdue);
  }, [claims]);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUSES.forEach((s) => { counts[s.key] = 0; });
    claims.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [claims]);

  const cardProps = {
    onOpen,
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

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full space-y-2.5 font-sans text-[var(--app-text)]">

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

      {/* Etape + sortare — o singură linie sus */}
      <div className="app-brief-panel rounded-xl p-2 shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="app-flux-stage-strip flex flex-nowrap items-center gap-1.5 text-[11px] flex-1 min-w-0 overflow-x-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setFocusedStage(null)}
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
                onClick={() => setFocusedStage(focusedStage === s.key ? null : s.key)}
                className="shrink-0"
              />
            ))}
          </div>
          <div className="app-flux-sort-bar flex items-center gap-1.5 text-[11px] shrink-0 pl-2 border-l border-[var(--app-border-soft)]">
            <span className="text-[var(--app-muted)] font-medium whitespace-nowrap">Sortare</span>
            {FLUX_STAGE_SORTS.map(({ key, tabKey, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStageSort(key)}
                className={`${alertTabClass(tabKey, stageSort === key ? tabKey : "")} whitespace-nowrap`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board vertical — secțiuni etapă, grid responsive */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin space-y-4 pb-2">
        {visibleStages.length === 0 ? (
          <div className="app-flux-empty border border-dashed rounded-xl p-8 text-center text-[13px]">
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
                    className="flex-1 min-w-0 pointer-events-none"
                  />
                  {stageClaims.length > 0 && (
                    <span className="app-flux-stage-sort-hint text-[10px] text-[var(--app-muted)] shrink-0">
                      {stageSort === "alerte" ? "Urgent sus" : "Vechi sus"}
                    </span>
                  )}
                </div>

                {stageClaims.length === 0 ? (
                  <div className="app-flux-stage-drop m-2 py-6 border border-dashed rounded-lg text-center text-[11px] text-[var(--app-muted)]">
                    Niciun dosar aici · trage un card sau schimbă etapa din dosar
                  </div>
                ) : (
                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 auto-rows-min">
                    {renderClaimGroups(stageClaims, cardProps, stageSort, pieseAlertDays)}
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
