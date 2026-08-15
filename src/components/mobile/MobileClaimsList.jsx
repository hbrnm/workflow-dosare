import React, { useState, useMemo } from "react";
import {
  ChevronRight, Phone, ChevronDown, ChevronUp,
  ClipboardCheck, Package, CalendarDays, Wrench, BadgeCheck, CheckCircle2,
} from "lucide-react";
import {
  getStatusDefinition,
  isPieseComandateStatus,
  getStatusShortLabel,
  getStageAccent,
} from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import ClaimPhoneActions from "../common/ClaimPhoneActions";
import DosarNumber from "../common/DosarNumber";
import { telLink, formatProgramareDate, getSinceMeta } from "../../utils/dateUtils";
import MobilePieseSositeRow from "./MobilePieseSositeRow";
import { isSearchHighlighted } from "../../utils/searchUtils";
import { getLatestClaimNoteText, isPartsArrivedUnscheduled } from "../../utils/alertUtils";
import { glossaryTitle, GLOSSARY } from "../../constants/glossary";

const STAGE_ICONS = {
  deschidere: ClipboardCheck,
  piese_comandate: Package,
  programat: CalendarDays,
  in_lucru: Wrench,
  accept_plata: BadgeCheck,
  facturat: CheckCircle2,
};

function stageIconFor(status) {
  const key = getStatusDefinition(status).key;
  return STAGE_ICONS[key] || ClipboardCheck;
}

function CompactClaimCard({
  claim: c,
  onOpen,
  onNotify,
  canEditFn,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  highlightClaimIds = null,
}) {
  const sDef = getStatusDefinition(c.status);
  const phone = c.telefonClient || "";
  const stageAccent = getStageAccent(c.status);
  const stShort = getStatusShortLabel(c.status);
  const Icon = stageIconFor(c.status);
  const stageSince = getSinceMeta(c.dataSchimbareStatus || c.dataDeschiderii || null);
  const sinceBits = [stageSince.dateTimeShort, stageSince.daysLabel].filter(Boolean);
  const noteText = getLatestClaimNoteText(c, { maxLen: 72 });
  const blockedReason = String(c.motivBlocare || c.motivBlocat || "").trim();
  const programareLabel = formatProgramareDate(c.dataProgramare);
  const subline = noteText || c.client || "";
  const showPieseRow = isPieseComandateStatus(c.status);
  const canEdit = !canEditFn || canEditFn(c);
  const insurerOrClient = c.asigurator || c.client || "";

  return (
    <article
      id={`mobile-claim-${c.id}`}
      className={`m-flow-card is-compact ${showPieseRow ? "has-piese-meta" : ""} ${stageAccent.className} ${isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""} bg-[#202225] border border-zinc-700/40 rounded-xl p-3.5 flex items-center justify-between gap-2.5 active:scale-[0.99] transition-transform`}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(c);
        }
      }}
      role="button"
      tabIndex={0}
      style={{ background: "#202225", borderColor: "rgba(63,63,70,0.4)" }}
    >
      {/* Stânga — badge stadiu */}
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white"
          style={{ background: stageAccent.color || "#3B5166" }}
          title={sDef.label}
        >
          <Icon size={16} strokeWidth={2.4} />
        </span>

        {/* Centru — plate + asigurător/client */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-base font-bold text-white truncate">
              {c.numarInmatriculare || "—"}
            </span>
            <span
              className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md text-white/90"
              style={{ background: stageAccent.color || "#3B5166" }}
              title={sDef.label}
            >
              {stShort}
            </span>
            {c.blocat ? (
              <span className="m-brief-claim-blocked" title={blockedReason || "Blocat"}>
                B
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
            <DosarNumber
              value={c.numarDosar}
              onNotify={onNotify}
              empty="fără nr."
              className="app-alerte-dosar shrink-0"
            />
            {insurerOrClient ? (
              <span className="truncate">· {insurerOrClient}</span>
            ) : null}
          </div>
          {sinceBits.length ? (
            <span className="m-brief-alerte-since block text-[10px]" title={stageSince.title || undefined}>
              {sinceBits.join(" · ")}
            </span>
          ) : null}
          {programareLabel ? (
            <p className="m-brief-claim-date" title={`Programare ${programareLabel}`}>
              {programareLabel}
            </p>
          ) : null}
          {showPieseRow ? (
            <MobilePieseSositeRow
              claim={c}
              canEdit={canEdit}
              layout="inline"
              onToggle={onTogglePieseSosite}
              onSchedule={onScheduleFromPiese}
              onPatchDates={onPatchPieseDates}
            />
          ) : null}
          {c.blocat && blockedReason ? (
            <p className="m-brief-alerte-why text-[var(--app-danger)]" title={`Motiv blocare: ${blockedReason}`}>
              Motiv blocare: {blockedReason}
            </p>
          ) : null}
          {subline && subline !== insurerOrClient ? (
            <p className="m-brief-alerte-why is-muted" title={subline}>
              {subline}
            </p>
          ) : null}
        </div>

        {/* Dreapta — acțiuni rapide + săgeată */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <ClaimPhoneActions phone={phone} claim={c} waSize={11} phoneSize={13} />
          <button
            type="button"
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 bg-zinc-800/70"
            onClick={() => onOpen(c)}
            aria-label="Deschide dosarul"
          >
            <ChevronRight size={16} />
          </button>
        </div>
    </article>
  );
}

export default function MobileClaimsList({
  claims,
  allClaimsCount,
  searchQuery = "",
  onOpen,
  onNew,
  onPatch,
  canEditFn,
  onNotify,
  highlightClaimIds = null,
  onBackToBrief = null,
  statusFilter: statusFilterProp = null,
  initialStatusFilter = "toate",
  onStatusFilterChange = null,
}) {
  const [internalFilter, setInternalFilter] = useState(initialStatusFilter || "toate");
  const controlled = statusFilterProp != null;
  const statusFilter = controlled ? statusFilterProp : internalFilter;

  const setStatusFilter = (id) => {
    if (!controlled) setInternalFilter(id);
    onStatusFilterChange?.(id);
  };

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      const key = getStatusDefinition(c.status).key;
      if (statusFilter === "blocate") return !!c.blocat;
      // Blocked dossiers live only under „Blocate”, not in pipeline stages.
      if (c.blocat) return false;
      if (statusFilter === "deschidere" && key !== "deschidere") return false;
      if (statusFilter === "in_lucru" && key !== "in_lucru") return false;
      if (statusFilter === "programat" && key !== "programat") return false;
      if (statusFilter === "accept_plata" && key !== "accept_plata") return false;
      if (statusFilter === "piese_comandate" && !isPieseComandateStatus(c.status)) return false;
      if (statusFilter === "piese_sosite" && !isPartsArrivedUnscheduled(c)) return false;
      if (statusFilter === "facturat" && key !== "facturat") return false;
      return true;
    });
  }, [claims, statusFilter]);

  const pieseSositeCount = useMemo(
    () => claims.filter((c) => !c.blocat && isPartsArrivedUnscheduled(c)).length,
    [claims]
  );

  const handleTogglePieseSosite = async (claim, val) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    const ok = await onPatch?.(claim.id, { pieseSosite: val });
    if (ok === false) return;
    onNotify?.(
      val
        ? "Piese marcate ca sosite — apasă Programare ca să alegi data."
        : "Bifa „Piese sosite” a fost stearsă.",
      val ? "success" : "info"
    );
  };

  const handleScheduleFromPiese = async (claim, iso) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return false;
    }
    const ok = await onPatch?.(claim.id, { dataProgramare: iso });
    if (ok === false) return false;
    onNotify?.(
      `Programare salvată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""}`.trim(),
      "success"
    );
    return true;
  };

  const handlePatchPieseDates = async (claim, patch) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return false;
    }
    const ok = await onPatch?.(claim.id, patch);
    if (ok === false) return false;
    onNotify?.("Date piese actualizate.", "success");
    return true;
  };

  const groupedClaims = useMemo(() => {
    const map = new Map();
    filtered.forEach((c) => {
      const plate = (c.numarInmatriculare || "").trim().toUpperCase();
      const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="m-ui space-y-3 flex flex-col flex-1 min-h-0 pb-4">
      <header className="m-ui-hero">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {onBackToBrief ? (
              <button
                type="button"
                className="m-ui-back m-press"
                onClick={onBackToBrief}
              >
                ← Brief
              </button>
            ) : null}
            <h1 className="m-ui-title">
              {statusFilter === "blocate" ? "Dosare blocate" : "Toate dosarele"}
            </h1>
          </div>
          <span className="m-ui-count">{filtered.length}</span>
        </div>
        {statusFilter === "blocate" ? (
          <button
            type="button"
            className="m-ui-back m-press mt-2"
            onClick={() => setStatusFilter("toate")}
          >
            ← Arată toate dosarele
          </button>
        ) : null}
      </header>

      <div className="m-brief-alert-stage-filters" role="toolbar" aria-label="Filtre dosare">
        {[
          { id: "toate", label: "Toate", count: allClaimsCount ?? claims.length, tip: "Toate dosarele din inventar" },
          { id: "deschidere", label: "AIR", tip: glossaryTitle("deschidere") },
          { id: "piese_comandate", label: "Piese", tip: glossaryTitle("piese_comandate") },
          { id: "piese_sosite", label: "Sosite", count: pieseSositeCount, tip: glossaryTitle("sosite") || GLOSSARY.sosite.hint },
          { id: "programat", label: "Prog.", tip: glossaryTitle("programat") },
          { id: "in_lucru", label: "Repar.", tip: glossaryTitle("in_lucru") },
          { id: "accept_plata", label: "AP", tip: glossaryTitle("accept_plata") },
          { id: "facturat", label: "Fact.", tip: glossaryTitle("facturat") },
          { id: "blocate", label: "Blocate", tip: "Dosare blocate — necesită deblocare" },
        ].map(({ id, label, count, tip }) => {
          const active = statusFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`m-brief-alert-stage-chip m-press ${active ? "is-active" : ""}`}
              aria-pressed={active}
              title={tip}
            >
              <span>{label}</span>
              {count != null ? (
                <span className="m-brief-alert-stage-chip-count">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {groupedClaims.length === 0 ? (
          <div className="m-brief-empty space-y-3">
            <p className="font-bold text-[13px]">
              {searchQuery.trim() || statusFilter !== "toate"
                ? "Niciun dosar pentru filtrele alese"
                : "Niciun dosar încă"}
            </p>
            <p className="text-[11.5px] m-muted">
              {searchQuery.trim() || statusFilter !== "toate"
                ? "Schimbă filtrul sau șterge căutarea."
                : "Creează primul dosar ca să apară în listă."}
            </p>
            {!searchQuery.trim() && statusFilter === "toate" && onNew ? (
              <button type="button" className="m-hub-cta mx-auto" onClick={onNew}>
                + Dosar nou
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="app-alerte-rows m-brief-alerte-rows m-flow-list">
            {groupedClaims.map((group) => {
              if (group.length === 1) {
                return (
                  <li key={group[0].id}>
                    <CompactClaimCard
                      claim={group[0]}
                      onOpen={onOpen}
                      onNotify={onNotify}
                      canEditFn={canEditFn}
                      onTogglePieseSosite={handleTogglePieseSosite}
                      onScheduleFromPiese={handleScheduleFromPiese}
                      onPatchPieseDates={handlePatchPieseDates}
                      highlightClaimIds={highlightClaimIds}
                    />
                  </li>
                );
              }
              return (
                <li key={group[0].id}>
                  <MobileStackedGroupCard
                    group={group}
                    onOpen={onOpen}
                    onNotify={onNotify}
                    canEditFn={canEditFn}
                    onTogglePieseSosite={handleTogglePieseSosite}
                    onScheduleFromPiese={handleScheduleFromPiese}
                    onPatchPieseDates={handlePatchPieseDates}
                    highlightClaimIds={highlightClaimIds}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function MobileStackedGroupCard({
  group,
  onOpen,
  onNotify,
  canEditFn,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  highlightClaimIds,
}) {
  const [expanded, setExpanded] = useState(false);
  const first = group[0];
  const plate = first.numarInmatriculare || "—";
  const stageAccent = getStageAccent(first.status);
  const stShort = getStatusShortLabel(first.status);

  return (
    <div className={`m-stack-group m-flow-card ${stageAccent.className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="m-stack-head m-flow-stack-head"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="app-alerte-row-main" style={{ display: "flex" }}>
            <span className="app-alerte-plate font-mono font-bold">{plate}</span>
            <span className="app-alerte-status-chip">{stShort}</span>
            <span className="m-brief-claim-chip">×{group.length}</span>
          </div>
          {!expanded ? (
            <p className="m-brief-alerte-why is-muted">
              {group.map((g) => `#${g.numarDosar || "?"}`).join(" · ")}
            </p>
          ) : null}
        </div>
        <span className="m-brief-alerte-since shrink-0 flex items-center gap-0.5">
          {expanded ? "Restrânge" : "Extinde"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded ? (
        <ul className="m-stack-flow-list">
          {group.map((c) => (
            <li key={c.id}>
              <CompactClaimCard
                claim={c}
                onOpen={onOpen}
                onNotify={onNotify}
                canEditFn={canEditFn}
                onTogglePieseSosite={onTogglePieseSosite}
                onScheduleFromPiese={onScheduleFromPiese}
                onPatchPieseDates={onPatchPieseDates}
                highlightClaimIds={highlightClaimIds}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
