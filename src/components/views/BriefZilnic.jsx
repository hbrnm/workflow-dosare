import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, Phone, Clock, CheckCircle2, ShieldAlert,
  BarChart3, ExternalLink, ChevronRight, User, Package, ClipboardCheck,
  BadgeCheck, Wrench,
} from "lucide-react";
import { todayISO, telLink, formatProgramareDate, getSinceMeta } from "../../utils/dateUtils";
import { buildAlertBuckets, filterAlertItems, getLatestClaimNoteText } from "../../utils/alertUtils";
import { isPendingArrivalToday } from "../../utils/scheduleStatusEffects";
import {
  STATUSES,
  getStatusDefinition,
  getStatusShortLabel,
  getStageAccent,
  isPieseComandateStatus,
} from "../../constants/config";
import { getAlertStyle, getAlertIcon, ALERT_GROUPS, countAlertsForGroup } from "../../constants/alertCategories";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import Pill from "../common/Pill";
import { alertTabClass } from "../common/alertTabClasses";
import StageTabLabel from "../common/StageTabLabel";
import { glossaryTitle } from "../../constants/glossary";
import { countUniqueVehicles } from "../../utils/plateSchedule";

const ALERT_TABS = [
  { key: "toate", label: "Toate" },
  ...ALERT_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

/** Tipuri de alertă cu accent roșu (parity cu Brief mobil Atenție). */
const ATTENTION_DANGER_TYPES = new Set([
  "stagnate",
  "livrare_piese",
  "restante",
  "inactivitate",
]);

const STAGE_FOCUS = {
  air: { title: "AIR", statusKey: "deschidere", Icon: ClipboardCheck, hint: "Acord intrare în reparație — dosar deschis, date și poze." },
  piese: { title: "Piese", statusKey: "piese_comandate", Icon: Package, hint: "Piese comandate. Marchează Sosite când ajung în atelier." },
  programat: { title: "Programări", statusKey: "programat", Icon: CalendarClock, hint: "Mașina are slot rezervat în calendar." },
  lucru: { title: "Reparație", statusKey: "in_lucru", Icon: Wrench, hint: "Lucrări de tinichigerie / vopsitorie în curs." },
  accept: { title: "Accept plată", statusKey: "accept_plata", Icon: BadgeCheck, hint: "AP — așteaptă acceptul / plata decontului." },
  facturat: { title: "Facturat", statusKey: "facturat", Icon: CheckCircle2, hint: "Dosar închis financiar." },
};

const STATUS_TO_FOCUS = {
  deschidere: "air",
  piese_comandate: "piese",
  programat: "programat",
  in_lucru: "lucru",
  accept_plata: "accept",
  facturat: "facturat",
};

function claimStatusKey(claim) {
  return getStatusDefinition(claim?.status).key;
}

function claimsForStatus(claims, statusKey) {
  return (claims || []).filter((c) => claimStatusKey(c) === statusKey);
}

function sortClaimsForFocus(rows, focusKey) {
  const list = [...(rows || [])];
  if (focusKey === "programat") {
    return list.sort((a, b) =>
      String(a.dataProgramare || "").localeCompare(String(b.dataProgramare || ""))
    );
  }
  return list.sort((a, b) =>
    String(b.dataSchimbareStatus || b.dataUltimeiActualizari || "").localeCompare(
      String(a.dataSchimbareStatus || a.dataUltimeiActualizari || "")
    )
  );
}

export default function BriefZilnic({
  claims,
  onOpen,
  onPatchClaim,
  canEditFn,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onSelectStatusFilter,
  onOpenBlocked = null,
  onNotify,
}) {
  const todayStr = todayISO();
  const [activeAlertTab, setActiveAlertTab] = useState("toate");
  const [stageFocus, setStageFocus] = useState(null);
  const [schedulingId, setSchedulingId] = useState(null);
  const [editDate, setEditDate] = useState(todayISO());
  const [editTime, setEditTime] = useState("09:00");

  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount: totalActiuniUrgente } = buckets;
  const blockedCount = counts.blocate || 0;

  const programariAzi = useMemo(() =>
    claims.filter((c) => isPendingArrivalToday(c, todayStr))
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && !c.ridicata && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr),
    [claims, todayStr]);

  const alertsList = useMemo(() => {
    return filterAlertItems(buckets.items, activeAlertTab).map((item) => ({
      ...item,
      icon: getAlertIcon(item.type) || Clock,
      ...getAlertStyle(item.type),
    }));
  }, [buckets.items, activeAlertTab]);

  const activeClaimsCount = useMemo(() =>
    claims.filter((c) => getStatusDefinition(c.status).key !== "facturat").length,
    [claims]);

  const statusStats = useMemo(() => {
    const map = {};
    STATUSES.forEach((s) => (map[s.key] = 0));
    claims.forEach((c) => {
      const key = getStatusDefinition(c.status).key;
      if (map[key] !== undefined) map[key] += 1;
    });
    // Business rule: multiple claims on same vehicle count once in Programări/Reparație.
    map.programat = countUniqueVehicles(claims.filter((c) => claimStatusKey(c) === "programat"));
    map.in_lucru = countUniqueVehicles(claims.filter((c) => claimStatusKey(c) === "in_lucru"));
    return map;
  }, [claims]);

  const stageLists = useMemo(() => ({
    air: sortClaimsForFocus(claimsForStatus(claims, "deschidere"), "air"),
    piese: sortClaimsForFocus(claimsForStatus(claims, "piese_comandate"), "piese"),
    programat: sortClaimsForFocus(claimsForStatus(claims, "programat"), "programat"),
    lucru: sortClaimsForFocus(claimsForStatus(claims, "in_lucru"), "lucru"),
    accept: sortClaimsForFocus(claimsForStatus(claims, "accept_plata"), "accept"),
    facturat: sortClaimsForFocus(claimsForStatus(claims, "facturat"), "facturat"),
  }), [claims]);

  const focusMeta = stageFocus ? STAGE_FOCUS[stageFocus] : null;
  const FocusIcon = focusMeta?.Icon || null;
  const focusRows = stageFocus ? (stageLists[stageFocus] || []) : [];
  const focusCount =
    stageFocus === "programat" || stageFocus === "lucru"
      ? countUniqueVehicles(focusRows)
      : focusRows.length;

  const canEditClaim = (c) => (typeof canEditFn === "function" ? canEditFn(c) : true);

  const markPartsArrived = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim || !canEditClaim(claim)) return;
    const next = !claim.pieseSosite;
    const ok = await onPatchClaim(claim.id, { pieseSosite: next });
    onNotify?.(
      ok === false
        ? "Eroare la actualizare."
        : next
          ? "Piese marcate ca sosite — poți seta programarea."
          : "Bifa „Piese sosite” a fost ștearsă.",
      ok === false ? "error" : next ? "success" : "info"
    );
  };

  const openScheduler = (e, claim) => {
    e.stopPropagation();
    setEditDate(todayISO());
    setEditTime("09:00");
    setSchedulingId(claim.id);
  };

  const saveSchedule = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim || !editDate) return;
    const iso = `${editDate}T${editTime || "09:00"}:00`;
    setSchedulingId(null);
    const ok = await onPatchClaim(claim.id, { dataProgramare: iso });
    if (ok !== false) setStageFocus("programat");
    onNotify?.(
      ok !== false
        ? 'Dosar programat — mutat în „Programări".'
        : "Eroare la programare.",
      ok !== false ? "success" : "error"
    );
  };

  const startRepair = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim || !canEditClaim(claim)) return;
    const ok = await onPatchClaim(claim.id, { status: "in_lucru", adusaFizic: true });
    if (ok !== false) setStageFocus("lucru");
    onNotify?.(
      ok !== false ? 'Dosar mutat în „Reparație".' : "Eroare la actualizare.",
      ok !== false ? "success" : "error"
    );
  };

  const selectStage = (statusKey) => {
    const focusKey = STATUS_TO_FOCUS[statusKey] || null;
    setStageFocus((prev) => (prev === focusKey ? null : focusKey));
    setSchedulingId(null);
  };

  const renderStageClaimRow = (c) => {
    const phone = c.telefonClient || "";
    const noteText = getLatestClaimNoteText(c, { maxLen: 72 });
    const programareLabel = formatProgramareDate(c.dataProgramare);
    const stageSince = getSinceMeta(c.dataSchimbareStatus || c.dataDeschiderii || null);
    const sinceBits = [stageSince.dateTimeShort, stageSince.daysLabel].filter(Boolean);
    const RowIcon = focusMeta?.Icon || Wrench;
    const stageAccent = getStageAccent(c.status);
    const stShort = getStatusShortLabel(c.status);
    const editable = canEditClaim(c) && !!onPatchClaim && !c.blocat;
    const showPartsArrived = stageFocus === "piese" && editable;
    const showSchedule = stageFocus === "piese" && editable && !c.dataProgramare;
    const showStartRepair = stageFocus === "programat" && editable;
    const isScheduling = schedulingId === c.id;
    const subline = noteText || "";

    return (
      <li key={c.id} className="space-y-1">
        <article
          className={`app-brief-flow-card ${stageAccent.className}`}
          onClick={() => onOpen(c)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(c);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="app-brief-flow-metric" title={getStatusDefinition(c.status).label}>
            <RowIcon size={14} />
          </div>
          <div className="app-brief-flow-body min-w-0">
            <div className="app-brief-flow-main">
              <DosarNumber
                value={c.numarDosar}
                onNotify={onNotify}
                empty="fără nr."
                className="app-brief-flow-dosar font-mono font-bold text-[12px]"
              />
              <span className="font-mono font-bold text-[12px] uppercase truncate">
                {c.numarInmatriculare || "—"}
              </span>
              <span className="app-brief-flow-status" title={getStatusDefinition(c.status).label}>
                {stShort}
              </span>
              {c.blocat ? (
                <span className="app-brief-flow-blocked" title={c.motivBlocare || "Blocat"}>B</span>
              ) : null}
              {sinceBits.length ? (
                <span className="app-brief-flow-since" title={stageSince.title || undefined}>
                  {sinceBits.join(" · ")}
                </span>
              ) : null}
            </div>
            {programareLabel ? (
              <p className="app-brief-flow-date" title={`Programare ${programareLabel}`}>
                {programareLabel}
              </p>
            ) : null}
            {subline ? (
              <p className="app-brief-flow-sub" title={subline}>{subline}</p>
            ) : null}
          </div>
          <div className="app-brief-flow-actions" onClick={(e) => e.stopPropagation()}>
            {phone ? (
              <>
                <WhatsAppButton phone={phone} claim={c} size={11} />
                <a href={telLink(phone)} className="app-brief-flow-icon-btn" title="Sună" aria-label="Sună">
                  <Phone size={13} />
                </a>
              </>
            ) : null}
            {showPartsArrived ? (
              <button
                type="button"
                className={`app-brief-btn-sosite ${c.pieseSosite ? "is-on" : "is-off"}`}
                onClick={(e) => markPartsArrived(e, c)}
                aria-pressed={!!c.pieseSosite}
                title={c.pieseSosite ? "Piese sosite — apasă ca să anulezi" : "Marchează piesele ca sosite"}
              >
                Sosite
              </button>
            ) : null}
            {showSchedule && !isScheduling ? (
              <button
                type="button"
                className="app-brief-flow-action-primary"
                onClick={(e) => openScheduler(e, c)}
              >
                Prog.
              </button>
            ) : null}
            {showStartRepair ? (
              <button
                type="button"
                className="app-brief-flow-action-primary"
                onClick={(e) => startRepair(e, c)}
              >
                Repar.
              </button>
            ) : null}
            <button
              type="button"
              className="app-brief-flow-icon-btn"
              onClick={() => onOpen(c)}
              aria-label="Deschide dosarul"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </article>
        {isScheduling ? (
          <div className="app-brief-schedule" onClick={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="app-brief-schedule-input"
            />
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="app-brief-schedule-input"
            />
            <button
              type="button"
              className="app-brief-flow-action-primary"
              onClick={(e) => saveSchedule(e, c)}
            >
              Salvează
            </button>
            <button
              type="button"
              className="app-brief-flow-cancel-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSchedulingId(null);
              }}
            >
              Anulează
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0 text-[var(--app-text)] pb-4">

      {/* 1. TOP HEADER — quiet: title + one status line + active count */}
      <div className="app-brief-panel rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="app-type-lg font-semibold tracking-tight text-[var(--app-text-strong)]">
            Brief · {formattedTodayDate}
          </h1>
          <p className="app-type-xs text-[var(--app-muted)] font-medium flex items-center gap-1.5 mt-1">
            {totalActiuniUrgente > 0 ? (
              <span className="app-brief-status-alert inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md">
                <ShieldAlert size={12} /> {totalActiuniUrgente} alerte de reacție
              </span>
            ) : (
              <span className="app-brief-status-ok inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md">
                <CheckCircle2 size={12} /> Fără alerte urgente
              </span>
            )}
          </p>
        </div>

        <div className="app-brief-stat-badge px-3 py-1 rounded-lg flex items-center gap-2 app-type-xs">
          <span className="text-[var(--app-muted)] font-medium">Active</span>
          <span className="font-semibold font-mono app-type-sm text-[var(--app-text-strong)]">{activeClaimsCount}</span>
        </div>
      </div>

      {/* 2. BLOCATE (inventar) + ALERTE */}
      {blockedCount > 0 && onOpenBlocked ? (
        <button
          type="button"
          onClick={onOpenBlocked}
          className="app-brief-panel rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 shrink-0 text-left border border-[#4A5568]/25 hover:border-[#4A5568]/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert size={16} className="text-[#4A5568] shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold app-type-sm text-[var(--app-text-strong)]">Dosare blocate</p>
              <p className="app-type-xs text-[var(--app-muted)]">Inventar separat — nu apar în alerte</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#4A5568] text-white shrink-0">
            {blockedCount}
          </span>
        </button>
      ) : null}

      <div className="app-brief-panel rounded-xl p-3 space-y-2 shrink-0">
        <div className="app-brief-panel-header flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className={totalActiuniUrgente > 0 ? "text-[var(--app-danger)]" : "text-[var(--app-success)]"} />
            <h2 className="font-semibold app-type-md text-[var(--app-text-strong)]">
              Alerte &amp; acțiuni
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${totalActiuniUrgente > 0 ? "bg-[var(--app-danger)] text-white" : "bg-[var(--app-success)] text-white"}`}>
              {totalActiuniUrgente}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {ALERT_TABS.map(({ key, label }) => {
              const n = key === "toate" ? totalActiuniUrgente : countAlertsForGroup(counts, key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveAlertTab(key)}
                  className={alertTabClass(key, activeAlertTab)}
                >
                  {label}
                  {n > 0 ? ` (${n})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {alertsList.length === 0 ? (
          <div className="app-brief-empty py-3.5 px-4 text-center text-[12px] rounded-xl font-medium">
            Nicio alertă detectată pentru filtrul selectat. Toate dosarele sunt în parametrii optimi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {alertsList.map((item) => {
              const c = item.claim;
              const IconComp = item.icon;
              const phone = c.telefonClient || "";
              const isAttention = ATTENTION_DANGER_TYPES.has(item.type);
              const showSosite =
                isPieseComandateStatus(c.status) &&
                onPatchClaim &&
                canEditClaim(c) &&
                !c.blocat;

              return (
                <div
                  key={item.id}
                  className={`app-brief-alert-card p-3 rounded-xl transition-all flex flex-col justify-between space-y-2.5 ${item.borderColor} ${isAttention ? "is-attention" : ""}`}
                >
                  <div>
                    <div className="app-brief-panel-header flex items-start justify-between gap-2 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp size={15} className="shrink-0" />
                        <span className="font-mono font-extrabold text-[13px] uppercase truncate">
                          {c.numarInmatriculare || "—"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${item.badgeColor}`}>
                        {item.title}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-[11.5px]">
                      <div className="flex items-center justify-between text-[var(--app-muted)] font-medium">
                        <span className="truncate">{c.marcaModel || "Model nespecificat"}</span>
                        <DosarNumber
                          value={c.numarDosar}
                          onNotify={onNotify}
                          prefix=""
                          className="app-brief-meta-chip font-mono text-[10.5px] px-1.5 py-0.5 rounded hover:text-[var(--app-accent)]"
                          empty="—"
                        />
                      </div>
                      <div className={`app-brief-reason-box text-[11px] font-bold p-2 rounded-lg leading-tight ${isAttention ? "is-attention" : ""}`}>
                        {item.reason}
                      </div>
                    </div>
                  </div>

                  <div className="app-brief-panel-header pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a
                            href={telLink(phone)}
                            className="app-brief-action-phone flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold transition-colors"
                            title={`Sune la ${phone}`}
                          >
                            <Phone size={11} /> Apel
                          </a>
                        </>
                      )}
                      {showSosite ? (
                        <button
                          type="button"
                          className={`app-brief-btn-sosite ${c.pieseSosite ? "is-on" : "is-off"}`}
                          onClick={(e) => markPartsArrived(e, c)}
                          aria-pressed={!!c.pieseSosite}
                          title={c.pieseSosite ? "Piese sosite — apasă ca să anulezi" : "Marchează piesele ca sosite"}
                        >
                          Sosite
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="app-brief-action-open flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-colors ml-auto"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. OPERATIV ZILNIC */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 shrink-0">

        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[320px]">
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <CalendarClock size={16} className="text-[var(--app-accent)]" /> Intrări Programate Astăzi ({programariAzi.length})
            </h3>
            <span className="app-brief-meta-chip text-[10.5px] font-mono px-2 py-0.5 rounded">Agendă Zi</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {programariAzi.length === 0 ? (
              <div className="app-brief-empty text-center py-6 text-[11.5px] italic rounded-xl my-auto">
                Nicio mașină programată azi în așteptare.
              </div>
            ) : (
              programariAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="app-brief-list-item flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="app-brief-time-badge font-mono font-extrabold text-[11.5px] px-2 py-0.5 rounded-lg shrink-0">
                      {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold uppercase text-[12px]">{c.numarInmatriculare}</span>
                        <span className="text-[var(--app-muted)] text-[10px]">·</span>
                        <span className="font-semibold text-[11px] text-[var(--app-muted)] truncate">{c.marcaModel || "—"}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-muted)] flex items-center gap-1 mt-0.5">
                        <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      aria-label="Deschide dosarul"
                      className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface-muted)] rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[320px]">
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <PackageCheck size={16} className="text-[var(--app-success)]" /> Finalizate Azi / Gata Predare ({gataAzi.length})
            </h3>
            <Pill tone="amber">GATA</Pill>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {gataAzi.length === 0 ? (
              <div className="app-brief-empty text-center py-6 text-[11.5px] italic rounded-xl my-auto">
                Nicio mașină finalizată astăzi.
              </div>
            ) : (
              gataAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="app-brief-list-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold uppercase text-[12.5px]">{c.numarInmatriculare}</span>
                      <span className="text-[var(--app-muted)] text-[10px]">·</span>
                      <span className="font-semibold text-[11.5px] text-[var(--app-muted)] truncate">{c.marcaModel || "—"}</span>
                    </div>
                    <div className="text-[10.5px] text-[var(--app-muted)] flex items-center gap-1 mt-0.5">
                      <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      aria-label="Deschide dosarul"
                      className="p-1 text-[var(--app-muted)] hover:text-[var(--app-success)] hover:bg-[var(--app-surface-muted)] rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[320px]">
          <div className="app-brief-panel-header pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <BarChart3 size={16} className="text-[var(--app-accent)]" /> Pulsul Atelierului
            </h3>
            <p className="text-[10px] text-[var(--app-muted)] mt-1 font-medium">
              Alege un stadiu ca să vezi lista și acțiunile rapide (Sosite / Prog. / Repar.).
            </p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-[10px] font-extrabold text-[var(--app-muted)] uppercase tracking-wider mb-1.5 shrink-0">
              AIR · Piese · Programări · Reparație · AP · Facturat
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {STATUSES.map((s) => {
                const count = statusStats[s.key] || 0;
                const focusKey = STATUS_TO_FOCUS[s.key];
                const active = stageFocus === focusKey;
                return (
                  <StageTabLabel
                    key={s.key}
                    as="button"
                    num={s.num}
                    label={s.short || s.label}
                    count={count}
                    selected={active}
                    title={glossaryTitle(s.key)}
                    onClick={() => selectStage(s.key)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOARD STADIU — parity cu Brief mobil */}
      {stageFocus && focusMeta ? (
        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-0 flex-1">
          <div className="app-brief-panel-header flex flex-wrap items-center justify-between gap-2 pb-2 mb-2">
            <div className="min-w-0">
              <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {FocusIcon ? <FocusIcon size={16} /> : null}
                {focusMeta.title}
                <span className="font-mono text-[12px] text-[var(--app-muted)]">({focusCount})</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {focusMeta.statusKey && onSelectStatusFilter ? (
                <button
                  type="button"
                  className="app-brief-action-open px-2.5 py-1 rounded text-[11px] font-bold"
                  onClick={() => onSelectStatusFilter(focusMeta.statusKey)}
                >
                  Deschide în Tabel
                </button>
              ) : null}
              <button
                type="button"
                className="app-brief-action-phone px-2.5 py-1 rounded text-[11px] font-bold"
                onClick={() => {
                  setStageFocus(null);
                  setSchedulingId(null);
                }}
              >
                Închide
              </button>
            </div>
          </div>

          {focusRows.length === 0 ? (
            <div className="app-brief-empty py-6 text-center text-[12px] rounded-xl font-medium">
              Niciun dosar în acest stadiu.
            </div>
          ) : (
            <ul className="app-brief-flow-list space-y-1.5 overflow-y-auto pr-1 max-h-[420px] scrollbar-thin">
              {focusRows.map(renderStageClaimRow)}
            </ul>
          )}
        </div>
      ) : null}

    </div>
  );
}
