import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle2, Phone, ExternalLink, Camera, AlertTriangle,
  List, Plus, ArrowRight, ChevronRight, FolderOpen, CalendarDays,
  Package, ClipboardCheck, BadgeCheck, Ban, Wrench,
} from "lucide-react";
import { telLink, fmtDate, formatProgramareShort, todayISO, getSinceMeta } from "../../utils/dateUtils";
import {
  buildAlertBuckets,
  filterAlertItems,
  getLatestClaimNoteText,
  getAlertMetric,
  alertSeverityClass,
} from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import { softHaptic } from "../../utils/mobilePrefs";
import { ALERT_GROUPS, countAlertsForGroup } from "../../constants/alertCategories";
import { getStatusDefinition, getStatusShortLabel } from "../../constants/config";

const FILTER_CHIPS = [
  { key: "toate", label: "Toate" },
  ...ALERT_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

const HUB_PILLS = FILTER_CHIPS;

const BRIEF_FOCUS_KEY = "workflow_brief_focus";
const FOCUS_KEYS = new Set([
  "air",
  "piese",
  "programat",
  "lucru",
  "accept",
  "facturat",
  "atentie",
]);

/** Filtre pe stadiu pentru lista Atenție (meniul din badge-ul N). */
const ATTENTION_FILTERS = [
  { key: "toate", label: "Toate", statusKey: null },
  { key: "air", label: "AIR", statusKey: "deschidere" },
  { key: "piese", label: "Piese", statusKey: "piese_comandate" },
  { key: "programat", label: "Programări", statusKey: "programat" },
  { key: "lucru", label: "Reparație", statusKey: "in_lucru" },
  { key: "accept", label: "AP", statusKey: "accept_plata" },
  { key: "facturat", label: "Facturat", statusKey: "facturat" },
  { key: "blocate", label: "Blocate", statusKey: null, blockedOnly: true },
];

/** Brief stage tiles — pipeline + Atenție (probleme). */
const STAGE_FOCUS = {
  air: {
    title: "AIR",
    hint: "Acord intrare în reparație.",
    emptyTitle: "Niciun dosar AIR",
    emptyHint: "Dosarele în acord de intrare apar aici.",
    statusKey: "deschidere",
    Icon: ClipboardCheck,
  },
  piese: {
    title: "Piese",
    hint: "Piese comandate — așteaptă livrare / programare.",
    emptyTitle: "Niciun dosar pe piese",
    emptyHint: "Dosarele cu piese comandate apar aici.",
    statusKey: "piese_comandate",
    Icon: Package,
  },
  programat: {
    title: "Programări",
    hint: "Mașini programate în atelier.",
    emptyTitle: "Nicio programare",
    emptyHint: "Dosarele cu status Programări apar aici.",
    statusKey: "programat",
    Icon: CalendarDays,
  },
  lucru: {
    title: "Reparație",
    hint: "Mașini aflate acum în reparație.",
    emptyTitle: "Niciun dosar în reparație",
    emptyHint: "Dosarele în reparație apar aici.",
    statusKey: "in_lucru",
    Icon: Wrench,
  },
  accept: {
    title: "Accept plată",
    hint: "AP = stadiul Accept plată — după reparație, înainte de facturare.",
    emptyTitle: "Niciun dosar în Accept plată",
    emptyHint: "Când un dosar ajunge în stadiul Accept plată (AP), apare aici.",
    statusKey: "accept_plata",
    Icon: BadgeCheck,
  },
  facturat: {
    title: "Facturat",
    hint: "Dosare facturate / închise operațional.",
    emptyTitle: "Niciun dosar facturat",
    emptyHint: "Dosarele facturate apar aici.",
    statusKey: "facturat",
    Icon: CheckCircle2,
  },
  atentie: {
    title: "Atenție",
    hint: "Probleme, blocaje, întârzieri și alte alerte.",
    emptyTitle: "Nimic care necesită atenție",
    emptyHint: "Blocate, întârzieri și alte alerte apar aici.",
    statusKey: null,
    Icon: Ban,
  },
};

function readStoredFocus() {
  try {
    const v = sessionStorage.getItem(BRIEF_FOCUS_KEY);
    return FOCUS_KEYS.has(v) ? v : "atentie";
  } catch {
    return "atentie";
  }
}

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

function filterAttentionItems(items, filterKey) {
  const list = items || [];
  if (!filterKey || filterKey === "toate") return list;
  const def = ATTENTION_FILTERS.find((f) => f.key === filterKey);
  if (!def) return list;
  if (def.blockedOnly) return list.filter((item) => item?.claim?.blocat);
  if (def.statusKey) {
    return list.filter((item) => claimStatusKey(item?.claim) === def.statusKey);
  }
  return list;
}

function countAttentionByFilter(items) {
  const list = items || [];
  const out = { toate: list.length };
  ATTENTION_FILTERS.forEach((f) => {
    if (f.key === "toate") return;
    out[f.key] = filterAttentionItems(list, f.key).length;
  });
  return out;
}

/** Dată/oră + zile calendaristice de când dosarul e în stadiul curent. */
function getStageSinceMeta(claim) {
  return getSinceMeta(claim?.dataSchimbareStatus || claim?.dataDeschiderii || null);
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Bună dimineața";
  if (h < 18) return "Bună ziua";
  return "Bună seara";
}

export default function MobileBrief({
  claims,
  listClaims = null,
  onOpen,
  onNew,
  onGoTab,
  onGoCapture,
  onOpenAlerts,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onPatchClaim,
  onNotify,
  homeStyle = "inbox",
  atelierNume = "Dosare Daună",
}) {
  const [activeAlertTab, setActiveAlertTab] = useState("toate");
  const [focus, setFocus] = useState(readStoredFocus);
  const [attentionFilter, setAttentionFilter] = useState("toate");
  const [alertMenuOpen, setAlertMenuOpen] = useState(false);
  const [schedulingId, setSchedulingId] = useState(null);
  const [editDate, setEditDate] = useState(todayISO);
  const [editTime, setEditTime] = useState("09:00");
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const [flashIds, setFlashIds] = useState(() => new Set());
  const boardRef = useRef(null);
  const alertMenuRef = useRef(null);
  const EXIT_MS = 220;
  const FLASH_MS = 480;

  useEffect(() => {
    try {
      sessionStorage.setItem(BRIEF_FOCUS_KEY, focus);
    } catch {
      /* ignore */
    }
  }, [focus]);

  useEffect(() => {
    if (!alertMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (alertMenuRef.current && !alertMenuRef.current.contains(e.target)) {
        setAlertMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setAlertMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [alertMenuOpen]);

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount, items } = buckets;

  const alertsList = useMemo(
    () => filterAlertItems(items, activeAlertTab),
    [items, activeAlertTab]
  );

  const attentionFilterCounts = useMemo(() => countAttentionByFilter(items), [items]);
  const attentionRows = useMemo(
    () => filterAttentionItems(items, attentionFilter),
    [items, attentionFilter]
  );
  const attentionFilterMeta =
    ATTENTION_FILTERS.find((f) => f.key === attentionFilter) || ATTENTION_FILTERS[0];

  const chipCount = (key) =>
    key === "toate" ? totalAlertsCount : countAlertsForGroup(counts, key);

  const stageLists = useMemo(() => {
    const list = claims || [];
    return {
      air: sortClaimsForFocus(claimsForStatus(list, "deschidere"), "air"),
      piese: sortClaimsForFocus(claimsForStatus(list, "piese_comandate"), "piese"),
      programat: sortClaimsForFocus(claimsForStatus(list, "programat"), "programat"),
      lucru: sortClaimsForFocus(claimsForStatus(list, "in_lucru"), "lucru"),
      accept: sortClaimsForFocus(claimsForStatus(list, "accept_plata"), "accept"),
      facturat: sortClaimsForFocus(claimsForStatus(list, "facturat"), "facturat"),
    };
  }, [claims]);

  const focusBoard = useMemo(() => {
    const meta = STAGE_FOCUS[focus] || STAGE_FOCUS.atentie;
    if (focus === "atentie") {
      const filtered = attentionFilter !== "toate";
      return {
        kind: "alerts",
        title: filtered ? `Atenție · ${attentionFilterMeta.label}` : meta.title,
        hint: filtered
          ? `Filtru: ${attentionFilterMeta.label} (${attentionRows.length})`
          : meta.hint,
        emptyTitle: filtered ? `Nimic pe ${attentionFilterMeta.label}` : meta.emptyTitle,
        emptyHint: filtered
          ? "Schimbă filtrul din bulina N sau alege Toate."
          : meta.emptyHint,
        rows: attentionRows,
      };
    }
    const rows = stageLists[focus] || [];
    return {
      kind: "claims",
      title: meta.title,
      hint: meta.hint,
      emptyTitle: meta.emptyTitle,
      emptyHint: meta.emptyHint,
      rows,
    };
  }, [focus, stageLists, attentionRows, attentionFilter, attentionFilterMeta]);

  const featured = alertsList[0] || items[0] || null;

  const ackAlert = async (e, claimId) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    softHaptic(8);
    const ok = await runWithExit(claimId, () =>
      onPatchClaim(claimId, { alerteAck: true })
    );
    onNotify?.(
      ok !== false
        ? "Alertă ascunsă. Revine automat la următoarea schimbare de status."
        : "Eroare la marcarea alertei.",
      ok !== false ? "success" : "error"
    );
  };

  const canAck = (type) =>
    [
      "blocate",
      "neridicate",
      "accept_plata",
      "masini_schimb",
      "piese",
      "livrare_piese",
      "stagnate",
      "inactivitate",
      "restante",
    ].includes(type);

  const go = (tab) => {
    softHaptic(8);
    onGoTab?.(tab);
  };

  const alertIconColor = (type) => {
    switch (type) {
      case "blocate": return "#B23A2E";
      case "piese": return "#3E6B45";
      case "livrare_piese": return "#D6473F";
      case "neridicate": return "#3E6B45";
      case "stagnate": return "#2C4160";
      case "accept_plata": return "#2C4160";
      case "masini_schimb": return "#C98A2B";
      case "inactivitate": return "#6B6558";
      default: return "#2C4160";
    }
  };

  const pipelineTiles = [
    { key: "air", label: "AIR", count: stageLists.air.length, tone: "steel" },
    { key: "piese", label: "Piese", count: stageLists.piese.length, tone: "steel" },
    { key: "programat", label: "Prog.", count: stageLists.programat.length, tone: "accent" },
    { key: "lucru", label: "Repar.", count: stageLists.lucru.length, tone: "accent" },
    { key: "accept", label: "AP", count: stageLists.accept.length, tone: "ok", title: "AP — Accept plată" },
    { key: "facturat", label: "Fact.", count: stageLists.facturat.length, tone: "ok" },
  ];

  const shortcuts = [
    { id: "capture", label: "Foto", Icon: Camera, action: () => go("capture") },
    { id: "programari", label: "Prog.", Icon: CalendarDays, action: () => go("programari") },
    { id: "dosare", label: "Toate", Icon: FolderOpen, action: () => go("dosare"), title: "Toate dosarele" },
    { id: "new", label: "Nou", Icon: Plus, action: () => (onNew ? onNew() : go("dosare")) },
  ];

  const setBoardFocus = (next) => {
    softHaptic(8);
    setFocus(next);
    setAlertMenuOpen(false);
    setSchedulingId(null);
    setExitingIds(new Set());
    requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openAttentionAll = () => {
    setAttentionFilter("toate");
    setBoardFocus("atentie");
  };

  const applyAttentionFilter = (filterKey) => {
    softHaptic(8);
    setAttentionFilter(filterKey);
    setAlertMenuOpen(false);
    setFocus("atentie");
    setSchedulingId(null);
    setExitingIds(new Set());
    requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const renderAlertRow = (item) => {
    const c = item.claim;
    const phone = c.telefonClient || "";
    const noteText = (item.noteSnippet || getLatestClaimNoteText(c) || "").trim();
    const reasonText = String(item.reason || "").trim();
    const isExiting = exitingIds.has(c.id) || exitingIds.has(item.id);
    const stageSince = getStageSinceMeta(c);
    const metric = getAlertMetric(item);
    const stShort = getStatusShortLabel(c.status);
    const stFull = getStatusDefinition(c.status).label;
    const showFactureaza = item.type === "accept_plata";
    const showActions = Boolean(
      phone || showFactureaza || (onPatchClaim && canAck(item.type))
    );

    return (
      <li key={item.id}>
        <article
          className={`app-alerte-row m-brief-alerte-card ${alertSeverityClass(item.severity)} ${isExiting ? "is-exiting" : ""}`}
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
          {metric ? (
            <div className="app-alerte-metric" title={metric.hint}>
              <span className="app-alerte-metric-value">{metric.value}</span>
              <span className="app-alerte-metric-unit">{metric.unit}</span>
            </div>
          ) : (
            <div
              className="app-alerte-metric is-icon"
              style={{ color: alertIconColor(item.type) }}
              title={item.title || "Alertă"}
            >
              <AlertTriangle size={18} />
            </div>
          )}

          <div className="app-alerte-row-body min-w-0">
            <div className="app-alerte-row-main">
              <DosarNumber
                value={c.numarDosar}
                onNotify={onNotify}
                empty="fără nr."
                className="app-alerte-dosar"
              />
              <span className="app-alerte-plate font-mono font-bold">
                {c.numarInmatriculare || "—"}
              </span>
              <span className="app-alerte-status-chip" title={stFull}>
                {stShort}
              </span>
            </div>
            {item.title ? (
              <p className="m-brief-alerte-title" title={item.title}>
                {item.title}
              </p>
            ) : null}
            {reasonText ? (
              <p className="app-alerte-reason" title={reasonText}>
                <span className="app-alerte-meta-label">Motiv</span>
                {reasonText}
              </p>
            ) : null}
            {noteText ? (
              <p className="app-alerte-note" title={noteText}>
                <span className="app-alerte-meta-label">Notă</span>
                {noteText}
              </p>
            ) : null}
            {stageSince.dateTimeShort || stageSince.daysLabel ? (
              <p className="m-brief-alerte-since" title={stageSince.title || undefined}>
                <span className="app-alerte-meta-label">În stadiu</span>
                {[stageSince.dateTimeShort, stageSince.daysLabel].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>

          {showActions ? (
            <div
              className="app-alerte-actions"
              onClick={(e) => e.stopPropagation()}
            >
              {phone ? (
                <>
                  <WhatsAppButton phone={phone} claim={c} size={12} />
                  <a href={telLink(phone)} className="app-alerte-btn-ghost" title="Sună">
                    <Phone size={14} />
                  </a>
                </>
              ) : null}
              {showFactureaza ? (
                <button
                  type="button"
                  className="app-alerte-btn-primary"
                  onClick={() => onOpen(c)}
                >
                  Deschide AP
                </button>
              ) : null}
              {onPatchClaim && canAck(item.type) ? (
                <button
                  type="button"
                  className="app-alerte-btn-secondary"
                  onClick={(e) => ackAlert(e, c.id)}
                >
                  Rezolvat
                </button>
              ) : null}
              <button
                type="button"
                className="app-alerte-btn-open"
                onClick={() => onOpen(c)}
                aria-label="Deschide dosarul"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="app-alerte-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="app-alerte-btn-open"
                onClick={() => onOpen(c)}
                aria-label="Deschide dosarul"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </article>
      </li>
    );
  };

  const markExiting = (claimId) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.add(claimId);
      return next;
    });
  };

  const clearExiting = (claimId) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(claimId);
      return next;
    });
  };

  const flashRow = (claimId) => {
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(claimId);
      return next;
    });
    window.setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(claimId);
        return next;
      });
    }, FLASH_MS);
  };

  const runWithExit = async (claimId, action, { nextFocus } = {}) => {
    markExiting(claimId);
    await new Promise((resolve) => window.setTimeout(resolve, EXIT_MS));
    const ok = await action();
    clearExiting(claimId);
    if (ok !== false && nextFocus) setFocus(nextFocus);
    return ok;
  };

  const openCapture = (e, claimId) => {
    e.stopPropagation();
    softHaptic(8);
    if (onGoCapture) onGoCapture(claimId);
    else onGoTab?.("capture");
  };

  const markPartsArrived = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    softHaptic(8);
    const ok = await onPatchClaim(claim.id, { pieseSosite: true });
    if (ok !== false) flashRow(claim.id);
    onNotify?.(
      ok
        ? "Piese marcate ca sosite — poți seta programarea."
        : "Eroare la actualizare.",
      ok ? "success" : "error"
    );
  };

  const openScheduler = (e, claim) => {
    e.stopPropagation();
    softHaptic(6);
    setEditDate(todayISO());
    setEditTime("09:00");
    setSchedulingId(claim.id);
  };

  const saveSchedule = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim || !editDate) return;
    softHaptic(8);
    const iso = `${editDate}T${editTime || "09:00"}:00`;
    setSchedulingId(null);
    const ok = await runWithExit(
      claim.id,
      () => onPatchClaim(claim.id, { dataProgramare: iso }),
      { nextFocus: "programat" }
    );
    onNotify?.(
      ok !== false
        ? 'Dosar programat — mutat în „Programări".'
        : "Eroare la programare.",
      ok !== false ? "success" : "error"
    );
  };

  const startRepair = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    softHaptic(8);
    const ok = await runWithExit(
      claim.id,
      () => onPatchClaim(claim.id, { status: "in_lucru", adusaFizic: true }),
      { nextFocus: "lucru" }
    );
    onNotify?.(
      ok !== false
        ? 'Dosar mutat în „Reparație".'
        : "Eroare la actualizare.",
      ok !== false ? "success" : "error"
    );
  };

  const renderClaimRow = (c, idx, total) => {
    const phone = c.telefonClient || "";
    const noteText = getLatestClaimNoteText(c, { maxLen: 90 });
    const programareLabel = c.dataProgramare
      ? (focus === "programat"
        ? formatProgramareShort(c.dataProgramare) || fmtDate(String(c.dataProgramare).slice(0, 10))
        : fmtDate(String(c.dataProgramare).slice(0, 10)))
      : "";
    const stageSince = getStageSinceMeta(c);
    const statusTitle = [
      stageSince.title,
      focus === "programat" && programareLabel ? `Programare ${programareLabel}` : "",
    ].filter(Boolean).join(" · ");
    const RowIcon = STAGE_FOCUS[focus]?.Icon || Wrench;
    const showStartRepair = focus === "programat" && onPatchClaim && !c.blocat;
    const showPartsArrived =
      focus === "piese" && onPatchClaim && !c.blocat && !c.pieseSosite;
    const showSchedule =
      focus === "piese" && onPatchClaim && !c.blocat && !c.dataProgramare;
    const isScheduling = schedulingId === c.id;
    const showFoto = Boolean(onGoCapture || onGoTab);
    const showActions = Boolean(
      phone || showStartRepair || showPartsArrived || showSchedule || showFoto || isScheduling
    );
    const isExiting = exitingIds.has(c.id);
    const isFlash = flashIds.has(c.id);

    return (
      <div
        key={c.id}
        className={`m-brief-row ${idx < total - 1 ? "has-divider" : ""} ${isExiting ? "is-exiting" : ""} ${isFlash ? "is-flash" : ""}`}
      >
        <button
          type="button"
          className="m-brief-row-main m-press m-brief-claim-row"
          onClick={() => onOpen(c)}
        >
          <span className="m-brief-row-icon is-work">
            <RowIcon size={14} />
          </span>
          <span className="m-brief-claim-body min-w-0 flex-1 text-left">
            <span className="m-brief-claim-identity">
              <span className="m-plate">{c.numarInmatriculare || "—"}</span>
              <span className="m-dosar-num">{c.numarDosar || "fără nr."}</span>
              {c.blocat ? (
                <span className="m-brief-claim-blocked" title={c.motivBlocare || "Blocat"}>
                  B
                </span>
              ) : null}
              {c.pieseSosite && focus === "piese" ? (
                <span className="m-brief-claim-chip" title="Piese sosite">
                  Sosite
                </span>
              ) : null}
              {focus === "accept" ? (
                <span className="m-brief-claim-chip is-ap" title="Stadiul Accept plată">
                  AP
                </span>
              ) : null}
            </span>
            {noteText ? (
              <span className="m-brief-row-note">{noteText}</span>
            ) : null}
          </span>
          <span className="m-brief-claim-status" title={statusTitle || undefined}>
            <span className="m-brief-claim-status-label">{getStatusShortLabel(c.status)}</span>
            {stageSince.dateTimeShort ? (
              <span className="m-brief-claim-date">{stageSince.dateTimeShort}</span>
            ) : null}
            {stageSince.daysLabel ? (
              <span className="m-brief-claim-days">{stageSince.daysLabel}</span>
            ) : null}
            {focus === "programat" && programareLabel ? (
              <span className="m-brief-claim-appt">{programareLabel}</span>
            ) : null}
          </span>
          <ChevronRight size={16} className="m-brief-chevron shrink-0" />
        </button>
        {showActions ? (
          <div className="m-brief-row-actions">
            {phone ? (
              <>
                <WhatsAppButton phone={phone} claim={c} size={12} />
                <a
                  href={telLink(phone)}
                  className="m-call-btn flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold"
                  onClick={() => softHaptic(6)}
                >
                  <Phone size={11} /> Apel
                </a>
              </>
            ) : null}
            {showFoto ? (
              <button
                type="button"
                className="m-brief-ghost-btn m-brief-action-icon"
                onClick={(e) => openCapture(e, c.id)}
                title="Foto & Doc"
              >
                <Camera size={12} /> Foto
              </button>
            ) : null}
            {showPartsArrived ? (
              <button
                type="button"
                className="m-brief-ghost-btn"
                onClick={(e) => markPartsArrived(e, c)}
              >
                <Package size={11} /> Sosite
              </button>
            ) : null}
            {showSchedule && !isScheduling ? (
              <button
                type="button"
                className="m-brief-ghost-btn m-brief-action-primary"
                onClick={(e) => openScheduler(e, c)}
              >
                <CalendarDays size={11} /> Programare
              </button>
            ) : null}
            {showStartRepair ? (
              <button
                type="button"
                className="m-brief-ghost-btn m-brief-action-primary"
                onClick={(e) => startRepair(e, c)}
              >
                <Wrench size={11} /> Reparație
              </button>
            ) : null}
          </div>
        ) : null}
        {isScheduling ? (
          <div
            className="m-brief-schedule"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="m-brief-schedule-input"
            />
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="m-brief-schedule-input"
            />
            <button
              type="button"
              className="m-brief-ghost-btn m-brief-action-primary"
              onClick={(e) => saveSchedule(e, c)}
            >
              Salvează
            </button>
            <button
              type="button"
              className="m-brief-ghost-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSchedulingId(null);
              }}
            >
              Anulează
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  if (homeStyle === "inbox") {
    return (
      <div className="m-brief space-y-3.5 flex flex-col flex-1 min-h-0 pb-2">
        <header className="m-brief-hero">
          <div className="flex items-end justify-between gap-3">
            <h1 className="m-brief-title">Brief</h1>
            <div className="m-brief-alert-menu-wrap" ref={alertMenuRef}>
              <button
                type="button"
                className={`m-brief-count m-brief-count--badge m-press ${totalAlertsCount > 0 ? "has-items" : ""} ${attentionFilter !== "toate" ? "is-filtered" : ""} ${alertMenuOpen ? "is-open" : ""}`}
                onClick={() => {
                  softHaptic(8);
                  setAlertMenuOpen((v) => !v);
                }}
                aria-label={`${totalAlertsCount} alerte — filtrează pe stadiu`}
                aria-expanded={alertMenuOpen}
                aria-haspopup="menu"
                title="Filtrează alertele pe stadiu"
              >
                {totalAlertsCount}
              </button>
              {alertMenuOpen ? (
                <div className="m-brief-alert-menu" role="menu">
                  <div className="m-brief-alert-menu-label">Filtru Atenție</div>
                  {ATTENTION_FILTERS.map((f) => {
                    const n = attentionFilterCounts[f.key] || 0;
                    const active = attentionFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={`m-brief-alert-menu-item ${active ? "is-active" : ""} ${n === 0 && f.key !== "toate" ? "is-empty" : ""}`}
                        onClick={() => applyAttentionFilter(f.key)}
                      >
                        <span className="m-brief-alert-menu-item-label">{f.label}</span>
                        <span className="m-brief-alert-menu-item-count">{n}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="m-brief-tiles m-brief-tiles--stages" aria-label="Stadii operaționale">
          {pipelineTiles.map((tile) => {
            const active = focus === tile.key;
            const Icon = STAGE_FOCUS[tile.key].Icon;
            const empty = tile.count === 0;
            return (
              <button
                key={tile.key}
                type="button"
                className={`m-brief-tile is-compact tone-${tile.tone} ${active ? "is-active" : ""} ${empty ? "is-empty" : ""}`}
                onClick={() => setBoardFocus(tile.key)}
                aria-pressed={active}
                title={tile.title || STAGE_FOCUS[tile.key]?.hint}
              >
                <span className="m-brief-tile-top">
                  <span className="m-brief-tile-icon">
                    <Icon size={13} strokeWidth={2.4} />
                  </span>
                  <span className="m-brief-tile-count">{tile.count}</span>
                </span>
                <span className="m-brief-tile-label">{tile.label}</span>
              </button>
            );
          })}
        </section>

        <button
          type="button"
          className={`m-brief-attention m-press ${focus === "atentie" ? "is-active" : ""} ${totalAlertsCount > 0 ? "has-items" : ""}`}
          onClick={openAttentionAll}
          aria-pressed={focus === "atentie" && attentionFilter === "toate"}
          title={STAGE_FOCUS.atentie.hint}
        >
          <span className="m-brief-attention-icon">
            <Ban size={14} strokeWidth={2.4} />
          </span>
          <span className="m-brief-attention-copy">
            <span className="m-brief-attention-title">Atenție</span>
            <span className="m-brief-attention-hint">
              {totalAlertsCount > 0
                ? attentionFilter !== "toate" && focus === "atentie"
                  ? `Filtru activ: ${attentionFilterMeta.label}`
                  : "Probleme, blocaje și întârzieri"
                : "Nicio alertă activă"}
            </span>
          </span>
          <span className="m-brief-attention-count">{totalAlertsCount}</span>
        </button>

        <section
          ref={boardRef}
          className="m-brief-board space-y-2 flex-1 min-h-0 flex flex-col"
          aria-live="polite"
        >
          <div className="m-brief-board-head">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="m-brief-board-title">
                  {focus === "accept" ? "Accept plată (AP)" : focusBoard.title}
                </h2>
                <span className="m-brief-board-count shrink-0">
                  {focusBoard.rows.length}
                </span>
              </div>
              <p className="m-brief-board-hint">{focusBoard.hint}</p>
            </div>
            {onNew ? (
              <button
                type="button"
                className="m-fab-plus m-press shrink-0 self-start"
                onClick={onNew}
                aria-label="Dosar nou"
                title="Dosar nou"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>

          <div key={focus} className="m-brief-panel m-brief-list m-brief-list-swap flex-1 overflow-hidden">
            {focusBoard.rows.length === 0 ? (
              <div className="m-brief-empty">
                <CheckCircle2 size={26} className="mx-auto m-brief-empty-icon" />
                <div className="font-bold text-[13px]">{focusBoard.emptyTitle}</div>
                <p className="text-[11.5px] m-muted">{focusBoard.emptyHint}</p>
              </div>
            ) : focusBoard.kind === "claims" ? (
              focusBoard.rows.map((c, idx) => renderClaimRow(c, idx, focusBoard.rows.length))
            ) : (
              <ul className="app-alerte-rows m-brief-alerte-rows">
                {focusBoard.rows.map((item) => renderAlertRow(item))}
              </ul>
            )}
          </div>
        </section>

        <nav className="m-brief-quick" aria-label="Acces rapid">
          {shortcuts.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`m-brief-quick-btn m-press ${item.id === "dosare" ? "is-secondary" : ""}`}
              onClick={item.action}
              title={item.title || item.label}
            >
              <item.Icon size={14} strokeWidth={2.3} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  if (homeStyle === "hub") {
    return (
      <div className="space-y-4 flex flex-col flex-1 min-h-0 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] m-muted">{atelierNume}</p>
          <h1 className="m-hub-greeting mt-1">{greetingForNow()}</h1>
        </div>

        {featured ? (
          <button
            type="button"
            className="m-hub-featured m-press w-full text-left space-y-2"
            onClick={() => onOpen(featured.claim)}
          >
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider opacity-70">
              Prioritate acum
            </div>
            <div className="font-extrabold text-[18px] leading-tight" style={{ fontFamily: "var(--m-font-display)" }}>
              {featured.claim.numarInmatriculare || featured.title}
            </div>
            <div className="text-[12.5px] font-semibold opacity-80 line-clamp-2">
              {featured.reason || featured.title}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <span className="m-hub-cta inline-flex items-center gap-1.5">
                Deschide <ArrowRight size={14} />
              </span>
              <span className="text-[11px] font-bold opacity-70">
                {totalAlertsCount} alerte active
              </span>
            </div>
          </button>
        ) : (
          <div className="m-hub-featured space-y-2">
            <div className="font-extrabold text-[18px]" style={{ fontFamily: "var(--m-font-display)" }}>
              Totul e calm
            </div>
            <p className="text-[12.5px] font-semibold opacity-80">
              Nicio alertă urgentă. Poți fotografia sau crea un dosar nou.
            </p>
            <div className="flex gap-2 pt-1">
              <button type="button" className="m-hub-cta" onClick={() => go("capture")}>Fotografiază</button>
              {onNew && (
                <button type="button" className="m-hub-cta" style={{ background: "transparent", border: "1.5px solid #111", color: "#111" }} onClick={onNew}>
                  + Dosar
                </button>
              )}
            </div>
          </div>
        )}

        <div className="m-hub-grid">
          {[
            { id: "capture", label: "Foto & Doc", Icon: Camera, color: "var(--m-hub-c)", action: () => go("capture") },
            { id: "alerte", label: `Alerte (${totalAlertsCount})`, Icon: AlertTriangle, color: "var(--m-hub-b)", action: () => setActiveAlertTab("toate") },
            { id: "dosare", label: "Toate dosarele", Icon: List, color: "var(--m-hub-d)", action: () => go("dosare") },
            { id: "new", label: "Dosar nou", Icon: Plus, color: "var(--m-accent)", action: () => (onNew ? onNew() : go("dosare")), iconColor: "#000" },
          ].map((tile) => (
            <button key={tile.id} type="button" className="m-hub-tile" onClick={tile.action}>
              <span className="m-hub-tile-icon" style={{ background: tile.color, color: tile.iconColor || "#fff" }}>
                <tile.Icon size={18} />
              </span>
              <span className="truncate">{tile.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="m-type-title">De urmărit</h2>
            <button type="button" className="text-[11px] font-bold m-accent-text" onClick={() => go("programari")}>
              Agenda →
            </button>
          </div>
          <div className="m-hub-pills">
            {HUB_PILLS.map((pill) => (
              <button
                key={pill.key}
                type="button"
                className={`m-hub-pill ${activeAlertTab === pill.key ? "is-active" : ""}`}
                onClick={() => { softHaptic(8); setActiveAlertTab(pill.key); }}
              >
                {pill.label}
                {chipCount(pill.key) > 0 ? ` · ${chipCount(pill.key)}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
          {alertsList.length === 0 ? (
            <div className="m-hub-card text-center py-8 space-y-2">
              <CheckCircle2 size={28} className="mx-auto" style={{ color: "var(--m-accent)" }} />
              <div className="font-extrabold text-[13px]">Nicio alertă pe filtrul ăsta</div>
              <p className="text-[11.5px] m-muted font-semibold">Schimbă pastila sau treci la Foto.</p>
            </div>
          ) : (
            alertsList.map((item) => {
              const c = item.claim;
              const phone = c.telefonClient || "";
              return (
                <div key={item.id} className="m-hub-card space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="m-plate">
                      {c.numarInmatriculare || "—"}
                    </span>
                    <span className="m-vehicle-model truncate max-w-[55%]">
                      {item.title}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold m-muted flex justify-between gap-2">
                    <span className="m-vehicle-model truncate">{c.marcaModel || "Model neprecizat"}</span>
                    <span className="m-dosar-num shrink-0">{c.numarDosar || "—"}</span>
                  </div>
                  <div className="text-[11.5px] font-bold p-2 rounded-xl" style={{ background: "color-mix(in srgb, var(--m-danger) 16%, transparent)", color: "var(--m-danger)" }}>
                    {item.reason}
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={12} />
                          <a
                            href={telLink(phone)}
                            className="m-call-btn flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold"
                          >
                            <Phone size={12} /> Apel
                          </a>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {onPatchClaim && canAck(item.type) && (
                        <button
                          type="button"
                          onClick={(e) => ackAlert(e, c.id)}
                          className="px-2.5 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ background: "var(--m-surface-2)", color: "var(--m-muted)" }}
                        >
                          Rezolvat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpen(c)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11.5px] font-extrabold"
                        style={{ background: "var(--m-accent)", color: "var(--m-accent-text)" }}
                      >
                        <span>Deschide</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Legacy list — keep for fallback
  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold pb-0.5">
        {FILTER_CHIPS.map((chip) => {
          const n = chipCount(chip.key);
          const active = activeAlertTab === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveAlertTab(chip.key)}
              className={`shrink-0 py-2 px-3 rounded-xl border text-center transition-all whitespace-nowrap ${
                active
                  ? "bg-[#2C4160] text-white border-[#2C4160] shadow-xs"
                  : "bg-white text-[#6B6558] border-[#DAD4C6]"
              }`}
            >
              {chip.label}
              {n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {alertsList.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#3E6B45] bg-green-50 border border-green-200 rounded-2xl font-bold space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-[#3E6B45]" />
            <div>Nicio alertă urgentă pentru acest filtru!</div>
          </div>
        ) : (
          alertsList.map((item) => {
            const c = item.claim;
            const phone = c.telefonClient || "";

            return (
              <div key={item.id} className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="m-brief-row-plate">
                    <span className="m-plate">{c.numarInmatriculare || "—"}</span>
                    <span className="m-dosar-num">{c.numarDosar || "—"}</span>
                  </span>
                  <span className="text-[10px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#3B5166] truncate max-w-[40%]">
                    {item.title}
                  </span>
                </div>

                <div className="m-vehicle-model truncate">{c.marcaModel || "Model neprecizat"}</div>

                <div className="text-[11.5px] font-bold text-[#B23A2E] bg-red-50/60 border border-red-100 p-2 rounded-xl">
                  {item.reason}
                </div>

                <div className="pt-2 border-t border-[#EFEAE1] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <>
                        <WhatsAppButton phone={phone} claim={c} size={12} />
                        <a
                          href={telLink(phone)}
                          className="m-call-btn flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold"
                        >
                          <Phone size={12} /> Apel
                        </a>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {onPatchClaim && canAck(item.type) && (
                      <button
                        type="button"
                        onClick={(e) => ackAlert(e, c.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EFEAE1] text-[#3B5166] text-[11px] font-bold"
                      >
                        Rezolvat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#2C4160] text-white text-[11.5px] font-bold shadow-2xs"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
