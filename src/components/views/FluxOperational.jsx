import React, { useState, useMemo } from "react";
import {
  Bell, Phone, ChevronDown, ChevronUp
} from "lucide-react";
import { PIPELINE_PHASES, STATUSES, getStatusDefinition, isPieseComandateStatus, getStatusAlertDays, getClaimAlertDays, getPhaseColumnColors } from "../../constants/config";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { isStageOverdue, isDeliveryDeadlineOverdue, isPartsOrderOverdue, getDaysPastDeliveryDeadline } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";

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

const SHORT_STATUS_LABELS = {
  deschidere: "Acord",
  reconstatare: "Reconst",
  accept_plata: "Accept",
  piese_comandate: "Piese",
  programat: "Progr",
  in_lucru: "Lucru",
  gata_de_ridicare: "Gata",
  predat_client: "Predat",
  facturat: "Fact",
};

// ---------------------------------------------------------------------------
// KANBAN CARD — vizual minimal, funcții păstrate (status, piese, contact)
// ---------------------------------------------------------------------------
export function PhaseCardRedesign({ claim, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEdit, pragRidicare, onNotify }) {
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

      {/* Rând 2: stadiu — select compact */}
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
              {SHORT_STATUS_LABELS[s.key] || s.label}
            </option>
          ))}
        </select>
      </div>

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

function StackedPhaseCardGroup({ groupKey, groupClaims, onOpen, onMoveToStatus, onTogglePieseSosite, onScheduleFromPiese, onPatchPieseDates, canEditFn, pragRidicare, onNotify }) {
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
  quickFilter,
  setQuickFilter,
  onNotify,
}) {
  const [selectedSubStatus, setSelectedSubStatus] = useState(null);
  const [dismissAlertBanner, setDismissAlertBanner] = useState(false);
  const pieseAlertDays = getStatusAlertDays("piese_comandate");

  const overduePartClaims = useMemo(() => {
    return claims.filter((c) => isPartsOrderOverdue(c, pieseAlertDays));
  }, [claims, pieseAlertDays]);

  const overdueDeliveryClaims = useMemo(() => {
    return claims.filter(isDeliveryDeadlineOverdue);
  }, [claims]);

  // Alerte și grupări dosare
  const attentionClaims = useMemo(() => claims.filter((c) => isStageOverdue(c) || c.blocat), [claims]);
  const inLucruClaims = useMemo(() => claims.filter((c) => c.status === "in_lucru"), [claims]);
  const programateClaims = useMemo(() => claims.filter((c) => c.status === "programat"), [claims]);

  const filteredClaims = useMemo(() => {
    let list = claims;

    // Filtru rapid din chips
    if (quickFilter === "atentie") list = attentionClaims;
    else if (quickFilter === "piese") list = overduePartClaims;
    else if (quickFilter === "programate") list = programateClaims;
    else if (quickFilter === "lucru") list = inLucruClaims;

    // Filtru sub-etapă
    if (selectedSubStatus) {
      list = list.filter((c) => c.status === selectedSubStatus);
    }

    return list;
  }, [claims, quickFilter, selectedSubStatus, attentionClaims, overduePartClaims, programateClaims, inLucruClaims]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2.5 font-sans text-[var(--app-text)]">

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
            {quickFilter !== "piese" && (
              <button
                type="button"
                onClick={() => setQuickFilter("piese")}
                className="text-[11px] font-bold px-2 py-0.5 rounded-md border"
              >
                Vezi filtru
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

      {/* 2. CONTROL STRIP & CHIPS FILTRARE */}
      <div className="app-flux-filter-bar flex items-center gap-2.5 flex-wrap rounded-xl p-2">
        {/* Chips de filtrare rapidă */}
        <div className="flex items-center gap-2 flex-wrap text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "atentie" ? "toate" : "atentie")}
            className={`app-flux-chip px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              quickFilter === "atentie" ? "is-active" : ""
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D6473F]" />
            <span>Atenție</span>
            <span className="opacity-70">({attentionClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "piese" ? "toate" : "piese")}
            className={`app-flux-chip px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              quickFilter === "piese" ? "is-active" : ""
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D69A1E]" />
            <span>Piese întârziate</span>
            <span className="opacity-70">({overduePartClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "programate" ? "toate" : "programate")}
            className={`app-flux-chip px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              quickFilter === "programate" ? "is-active" : ""
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2E5C8A]" />
            <span>Programate</span>
            <span className="opacity-70">({programateClaims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter(quickFilter === "lucru" ? "toate" : "lucru")}
            className={`app-flux-chip px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
              quickFilter === "lucru" ? "is-active" : ""
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2F6B4E]" />
            <span>În lucru</span>
            <span className="opacity-70">({inLucruClaims.length})</span>
          </button>

          {selectedSubStatus && (
            <button
              type="button"
              onClick={() => setSelectedSubStatus(null)}
              className="px-2.5 py-0.5 rounded-full bg-[var(--app-danger)] text-white font-bold text-[11px]"
            >
              Filtru sub-etapă ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. VIZUALIZARE KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-h-0 overflow-y-auto xl:overflow-hidden">
        {PIPELINE_PHASES.map((phase) => {
          const phaseClaims = filteredClaims.filter((c) => phase.statuses.includes(c.status));

          return (
            <div
              key={phase.key}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const claimId = e.dataTransfer.getData("text/plain");
                if (claimId && onMoveToStatus) {
                  const claim = claims.find((cl) => cl.id === claimId);
                  if (claim) onMoveToStatus(claim, phase.statuses[0]);
                }
              }}
              className="app-flux-column rounded-2xl overflow-hidden flex flex-col h-auto md:h-full"
            >
              {/* Header Coloană Fază — accent subtil, fundal neutru (confort vizual) */}
              <div
                className="app-flux-phase-header p-3 shrink-0"
                data-phase={phase.key}
              >
                <div className="flex items-center justify-between font-semibold text-[14px]">
                  <span>{phase.label}</span>
                  <span className="app-flux-phase-count px-2 py-0.5 rounded-full text-[11.5px] font-mono">
                    {phaseClaims.length}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--app-muted)] mt-0.5 leading-tight">
                  {phase.description}
                </div>
              </div>

              {/* Sub-steps Pills inside Phase Header */}
              <div className="app-flux-substep-bar flex items-center gap-1 flex-wrap p-2 border-b">
                {phase.statuses.map((stKey) => {
                  const stDef = getStatusDefinition(stKey);
                  const stCount = filteredClaims.filter((c) => c.status === stKey).length;
                  const isActive = selectedSubStatus === stKey;

                  return (
                    <button
                      key={stKey}
                      type="button"
                      onClick={() => setSelectedSubStatus(isActive ? null : stKey)}
                      className={`app-flux-substep text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all ${
                        isActive ? "is-active" : ""
                      }`}
                    >
                      {stDef.num}. {stDef.label} {stCount > 0 ? `(${stCount})` : ""}
                    </button>
                  );
                })}
              </div>

              {/* Zona carduri — 2 pe rând; grup comasat = linie întreagă */}
              <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-1.5 auto-rows-min content-start scrollbar-thin">
                {(() => {
                  const groupedMap = new Map();
                  phaseClaims.forEach((c) => {
                    const plate = (c.numarInmatriculare || "").trim().toUpperCase();
                    const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
                    if (!groupedMap.has(key)) groupedMap.set(key, []);
                    groupedMap.get(key).push(c);
                  });

                  const groups = Array.from(groupedMap.entries());

                  if (groups.length === 0) {
                    return (
                      <div className="app-flux-empty col-span-2 border border-dashed rounded-xl p-5 text-center text-[12px] italic">
                        Niciun dosar în această fază
                      </div>
                    );
                  }

                  return groups.map(([groupKey, groupClaims]) => (
                    <div
                      key={groupKey}
                      className={groupClaims.length > 1 ? "col-span-2 min-w-0" : "min-w-0"}
                    >
                      <StackedPhaseCardGroup
                        groupKey={groupKey}
                        groupClaims={groupClaims}
                        onOpen={onOpen}
                        onMoveToStatus={onMoveToStatus}
                        onTogglePieseSosite={onTogglePieseSosite}
                        onScheduleFromPiese={onScheduleFromPiese}
                        onPatchPieseDates={onPatchPieseDates}
                        canEditFn={canEditFn}
                        pragRidicare={pragRidicare}
                        onNotify={onNotify}
                      />
                    </div>
                  ));
                })()}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
