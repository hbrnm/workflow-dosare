import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CheckCircle2, Phone, ExternalLink, Camera, AlertTriangle,
  List, Plus, ArrowRight, ChevronRight, ChevronLeft, FolderOpen, CalendarDays,
  Package, ClipboardCheck, BadgeCheck, Ban, Wrench,
  LayoutGrid, Crosshair, RotateCcw, Folder,
} from "lucide-react";
import { telLink, formatProgramareDate, todayISO, getSinceMeta, formatDateDMY } from "../../utils/dateUtils";
import {
  buildAlertBuckets,
  filterAlertItems,
  getLatestClaimNoteText,
  getAlertMetric,
} from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import ClaimPhoneActions from "../common/ClaimPhoneActions";
import DosarNumber from "../common/DosarNumber";
import { softHaptic } from "../../utils/mobilePrefs";
import { countUniqueVehicles } from "../../utils/plateSchedule";
import {
  ALERT_GROUPS,
  ALERT_TYPE_META,
  countAlertsForGroup,
} from "../../constants/alertCategories";
import { getStatusDefinition, getStatusShortLabel, getStageAccent } from "../../constants/config";

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

/** Filtre Atenție: stadii unde există alerte active. */
const ATTENTION_STAGE_FILTERS = [
  { key: "toate", label: "Toate", statusKey: null },
  { key: "air", label: "AIR", statusKey: "deschidere" },
  { key: "piese", label: "Piese", statusKey: "piese_comandate" },
  { key: "programat", label: "Prog.", statusKey: "programat" },
  { key: "lucru", label: "Repar.", statusKey: "in_lucru" },
  { key: "accept", label: "AP", statusKey: "accept_plata" },
  { key: "facturat", label: "Fact.", statusKey: "facturat" },
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
    hint: "Întârzieri, piese, predare și plăți care cer reacție.",
    emptyTitle: "Nimic care necesită atenție",
    emptyHint: "Alertele operaționale apar aici.",
    statusKey: null,
    Icon: Ban,
  },
};

function readStoredFocus() {
  try {
    const v = sessionStorage.getItem(BRIEF_FOCUS_KEY);
    if (v === "home" || v === "") return null;
    return FOCUS_KEYS.has(v) ? v : null;
  } catch {
    return null;
  }
}

function claimStatusKey(claim) {
  return getStatusDefinition(claim?.status).key;
}

function filterAlertsByStage(items, filterKey) {
  const list = items || [];
  if (!filterKey || filterKey === "toate") return list;
  const def = ATTENTION_STAGE_FILTERS.find((f) => f.key === filterKey);
  if (!def) return list;
  if (def.statusKey) {
    return list.filter((item) => claimStatusKey(item?.claim) === def.statusKey);
  }
  return list;
}

function buildAttentionStageChips(items) {
  const list = items || [];
  const chips = [{ key: "toate", label: "Toate", count: list.length }];
  ATTENTION_STAGE_FILTERS.forEach((f) => {
    if (f.key === "toate") return;
    const count = filterAlertsByStage(list, f.key).length;
    if (count > 0) chips.push({ key: f.key, label: f.label, count });
  });
  return chips;
}

function claimsForStatus(claims, statusKey) {
  return (claims || []).filter((c) => !c.blocat && claimStatusKey(c) === statusKey);
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
  onOpenBlocked = null,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onPatchClaim,
  onNotify,
  homeStyle = "inbox",
  atelierNume = "Dosare Daună",
  searchQuery = "",
  inboxFocus = undefined,
  onInboxFocusChange = null,
  onCloseInboxFocus = null,
  onOpenReceptie = null,
}) {
  const [activeAlertTab, setActiveAlertTab] = useState("toate");
  const [internalFocus, setInternalFocus] = useState(readStoredFocus);
  const focus = onInboxFocusChange ? inboxFocus ?? null : internalFocus;
  const setFocus = (next) => {
    if (onInboxFocusChange) onInboxFocusChange(next);
    else setInternalFocus(next);
  };
  const [attentionFilter, setAttentionFilter] = useState("toate");
  const [schedulingId, setSchedulingId] = useState(null);
  const [editDate, setEditDate] = useState(todayISO);
  const [editTime, setEditTime] = useState("09:00");
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const [flashIds, setFlashIds] = useState(() => new Set());
  const boardRef = useRef(null);
  const EXIT_MS = 220;
  const FLASH_MS = 480;

  useEffect(() => {
    try {
      sessionStorage.setItem(BRIEF_FOCUS_KEY, focus || "home");
    } catch {
      /* ignore */
    }
  }, [focus]);

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount, items } = buckets;
  const blockedCount = counts.blocate || 0;

  const alertsList = useMemo(
    () => filterAlertItems(items, activeAlertTab),
    [items, activeAlertTab]
  );

  const attentionStageChips = useMemo(() => buildAttentionStageChips(items), [items]);

  useEffect(() => {
    if (attentionFilter === "toate") return;
    const stillValid = attentionStageChips.some((c) => c.key === attentionFilter);
    if (!stillValid) setAttentionFilter("toate");
  }, [attentionFilter, attentionStageChips]);

  const attentionRows = useMemo(
    () => filterAlertsByStage(items, attentionFilter),
    [items, attentionFilter]
  );
  const attentionFilterMeta =
    ATTENTION_STAGE_FILTERS.find((f) => f.key === attentionFilter) || ATTENTION_STAGE_FILTERS[0];

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
          ? "Alege alt stadiu din filtre sau Toate."
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

  const focusBoardCount = useMemo(() => {
    if (focusBoard.kind !== "claims") return focusBoard.rows.length;
    if (focus === "programat" || focus === "lucru") return countUniqueVehicles(focusBoard.rows);
    return focusBoard.rows.length;
  }, [focusBoard, focus]);

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

  const pipelineTiles = [
    { key: "air", label: "AIR", count: stageLists.air.length, tone: "steel" },
    { key: "piese", label: "Piese", count: stageLists.piese.length, tone: "steel" },
    { key: "programat", label: "Prog.", count: countUniqueVehicles(stageLists.programat), tone: "accent" },
    { key: "lucru", label: "Repar.", count: countUniqueVehicles(stageLists.lucru), tone: "accent" },
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
    setSchedulingId(null);
    setExitingIds(new Set());
    requestAnimationFrame(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const closeBoard = () => {
    softHaptic(8);
    if (onCloseInboxFocus) onCloseInboxFocus();
    else setFocus(null);
  };

  const openReceptieForSearch = () => {
    softHaptic(8);
    const q = String(searchQuery || "").trim();
    if (!q) {
      onNotify?.("Caută un dosar, apoi apasă Recepție.", "info");
      return;
    }
    const hits = listClaims || claims || [];
    const hit = hits[0];
    if (!hit) {
      onNotify?.("Niciun dosar găsit. Ajustează căutarea.", "error");
      return;
    }
    if (hits.length > 1) {
      onNotify?.(
        `Recepție: ${hit.numarInmatriculare || hit.numarDosar || "dosar"} (${hits.length} rezultate).`,
        "info"
      );
    }
    onOpenReceptie?.(hit);
  };

  const openAttentionAll = () => {
    setAttentionFilter("toate");
    setBoardFocus("atentie");
  };

  const applyAttentionFilter = (filterKey) => {
    softHaptic(8);
    setAttentionFilter(filterKey);
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
    const noteText = (item.noteSnippet || getLatestClaimNoteText(c, { maxLen: 72 }) || "").trim();
    const reasonText = String(item.reason || "").trim();
    const typeMeta = ALERT_TYPE_META[item.type];
    const whyTitle = item.title || typeMeta?.label || "Alertă";
    const whyLine = reasonText && reasonText.toLowerCase() !== whyTitle.toLowerCase()
      ? `${whyTitle} · ${reasonText}`
      : whyTitle;
    const isExiting = exitingIds.has(c.id) || exitingIds.has(item.id);
    const stageSince = getStageSinceMeta(c);
    const metric = getAlertMetric(item);
    const stShort = getStatusShortLabel(c.status);
    const stFull = getStatusDefinition(c.status).label;
    const showFactureaza = item.type === "accept_plata";
    const sinceBits = [stageSince.dateTimeShort, stageSince.daysLabel].filter(Boolean);

    return (
      <li key={item.id}>
        <article
          className={`app-alerte-row m-flow-card is-compact is-attention ${isExiting ? "is-exiting" : ""}`}
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
              title={whyTitle}
            >
              <AlertTriangle size={14} />
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
              {sinceBits.length ? (
                <span className="m-brief-alerte-since" title={stageSince.title || undefined}>
                  {sinceBits.join(" · ")}
                </span>
              ) : null}
            </div>
            <p className="m-brief-alerte-why" title={whyLine}>
              {whyLine}
            </p>
            {noteText ? (
              <p className="app-alerte-note" title={noteText}>
                <span className="app-alerte-meta-label">Notă</span>
                {noteText}
              </p>
            ) : null}
          </div>

          <div
            className="app-alerte-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <ClaimPhoneActions phone={phone} claim={c} waSize={11} phoneSize={13} />
            {showFactureaza ? (
              <button
                type="button"
                className="app-alerte-btn-primary"
                onClick={() => onOpen(c)}
              >
                AP
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
              <ChevronRight size={16} />
            </button>
          </div>
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
    // Programări → folder recepție; Reparație → folder predare
    const category =
      focus === "programat" ? "receptie" : focus === "lucru" ? "predare" : null;
    if (onGoCapture) onGoCapture(claimId, category);
    else onGoTab?.("capture");
  };

  const markPartsArrived = async (e, claim) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    softHaptic(8);
    const next = !claim.pieseSosite;
    const ok = await onPatchClaim(claim.id, { pieseSosite: next });
    if (ok !== false) flashRow(claim.id);
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

  const renderClaimRow = (c) => {
    const phone = c.telefonClient || "";
    const noteText = getLatestClaimNoteText(c, { maxLen: 72 });
    const programareLabel = formatProgramareDate(c.dataProgramare);
    const stageSince = getStageSinceMeta(c);
    const sinceBits = [stageSince.dateTimeShort, stageSince.daysLabel].filter(Boolean);
    const statusTitle = [
      stageSince.title,
      programareLabel ? `Programare ${programareLabel}` : "",
    ].filter(Boolean).join(" · ");
    const RowIcon = STAGE_FOCUS[focus]?.Icon || Wrench;
    const stageAccent = getStageAccent(c.status);
    const stShort = getStatusShortLabel(c.status);
    const stFull = getStatusDefinition(c.status).label;
    const showStartRepair = focus === "programat" && onPatchClaim && !c.blocat;
    const showPartsArrived = focus === "piese" && onPatchClaim && !c.blocat;
    const showSchedule =
      focus === "piese" && onPatchClaim && !c.blocat && !c.dataProgramare;
    const isScheduling = schedulingId === c.id;
    const showFoto =
      Boolean(onGoCapture || onGoTab) && (focus === "programat" || focus === "lucru");
    const isExiting = exitingIds.has(c.id);
    const isFlash = flashIds.has(c.id);
    const subline = noteText || "";

    return (
      <li key={c.id}>
        <article
          className={`app-alerte-row m-flow-card is-compact ${stageAccent.className} ${isExiting ? "is-exiting" : ""} ${isFlash ? "is-flash" : ""}`}
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
          <div className="app-alerte-metric is-icon" title={stFull}>
            <RowIcon size={14} />
          </div>
          <div className="app-alerte-row-body min-w-0">
            <div className="app-alerte-row-main" title={statusTitle || undefined}>
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
              {c.blocat ? (
                <span className="m-brief-claim-blocked" title={c.motivBlocare || "Blocat"}>
                  B
                </span>
              ) : null}
              {sinceBits.length ? (
                <span className="m-brief-alerte-since" title={stageSince.title || undefined}>
                  {sinceBits.join(" · ")}
                </span>
              ) : null}
            </div>
            {programareLabel ? (
              <p className="m-brief-claim-date" title={`Programare ${programareLabel}`}>
                {programareLabel}
              </p>
            ) : null}
            {subline ? (
              <p className="m-brief-alerte-why is-muted" title={subline}>
                {subline}
              </p>
            ) : null}
          </div>
          <div
            className="app-alerte-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <ClaimPhoneActions phone={phone} claim={c} waSize={11} phoneSize={13} />
            {showFoto ? (
              <button
                type="button"
                className="app-alerte-btn-ghost"
                onClick={(e) => openCapture(e, c.id)}
                aria-label={
                  focus === "lucru"
                    ? "Fotografiază în folderul Predare"
                    : "Fotografiază în folderul Recepție"
                }
                title={
                  focus === "lucru"
                    ? "Fotografiază în folderul Predare"
                    : "Fotografiază în folderul Recepție"
                }
              >
                <Camera size={13} />
              </button>
            ) : null}
            {showPartsArrived ? (
              <button
                type="button"
                className={`app-alerte-btn-sosite ${c.pieseSosite ? "is-on" : "is-off"}`}
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
                className="app-alerte-btn-primary"
                onClick={(e) => openScheduler(e, c)}
              >
                Prog.
              </button>
            ) : null}
            {showStartRepair ? (
              <button
                type="button"
                className="app-alerte-btn-primary"
                onClick={(e) => startRepair(e, c)}
              >
                Repar.
              </button>
            ) : null}
            <button
              type="button"
              className="app-alerte-btn-open"
              onClick={() => onOpen(c)}
              aria-label="Deschide dosarul"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </article>
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
      </li>
    );
  };

  if (homeStyle === "inbox") {
    const inboxStats = [
      {
        key: "receptie",
        label: "Recepție",
        count: null,
        hideCount: true,
        Icon: LayoutGrid,
        tone: "all",
        action: openReceptieForSearch,
      },
      {
        key: "lucru",
        label: "Reparație",
        count: countUniqueVehicles(stageLists.lucru),
        Icon: Crosshair,
        tone: "work",
        action: () => setBoardFocus("lucru"),
      },
      {
        key: "atentie",
        label: "Atenție",
        count: totalAlertsCount,
        Icon: RotateCcw,
        tone: "attention",
        action: openAttentionAll,
      },
      {
        key: "air",
        label: "Acord reparație (AIR)",
        count: stageLists.air.length,
        Icon: CheckCircle2,
        tone: "review",
        action: () => setBoardFocus("air"),
      },
    ];

    const workspaces = [
      {
        id: "air",
        label: "AIR",
        count: stageLists.air.length,
        action: () => setBoardFocus("air"),
      },
      {
        id: "piese",
        label: "PIESE",
        count: stageLists.piese.length,
        action: () => setBoardFocus("piese"),
      },
      {
        id: "programari",
        label: "PROGRAMĂRI",
        count: countUniqueVehicles(stageLists.programat),
        action: () => go("programari"),
      },
      {
        id: "lucru",
        label: "Reparație",
        count: countUniqueVehicles(stageLists.lucru),
        action: () => setBoardFocus("lucru"),
      },
      {
        id: "accept",
        label: "Accept plată",
        count: stageLists.accept.length,
        action: () => setBoardFocus("accept"),
      },
      {
        id: "facturat",
        label: "Facturat",
        count: stageLists.facturat.length,
        action: () => setBoardFocus("facturat"),
      },
    ];

    const inboxBoard = (
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
                  {focusBoardCount}
                </span>
              </div>
              <p className="m-brief-board-hint">{focusBoard.hint}</p>
            </div>
          </div>

          {focus === "atentie" && attentionStageChips.length > 1 ? (
            <div className="m-brief-alert-stage-filters" role="toolbar" aria-label="Filtrează alertele pe stadiu">
              {attentionStageChips.map((chip) => {
                const active = attentionFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    className={`m-brief-alert-stage-chip m-press ${active ? "is-active" : ""}`}
                    onClick={() => applyAttentionFilter(chip.key)}
                    aria-pressed={active}
                  >
                    <span>{chip.label}</span>
                    <span className="m-brief-alert-stage-chip-count">{chip.count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div key={focus} className="m-brief-panel m-brief-list m-brief-list-swap flex-1 overflow-hidden">
            {focusBoard.rows.length === 0 ? (
              <div className="m-brief-empty">
                <CheckCircle2 size={26} className="mx-auto m-brief-empty-icon" />
                <div className="font-bold text-[13px]">{focusBoard.emptyTitle}</div>
                <p className="text-[11.5px] m-muted">{focusBoard.emptyHint}</p>
              </div>
            ) : (
              <ul className="app-alerte-rows m-brief-alerte-rows m-flow-list">
                {focusBoard.kind === "claims"
                  ? focusBoard.rows.map((c) => renderClaimRow(c))
                  : focusBoard.rows.map((item) => renderAlertRow(item))}
              </ul>
            )}
          </div>
        </section>
    );

    if (focus) {
      return (
        <div className="m-brief m-inbox space-y-0 flex flex-col flex-1 min-h-0 pb-2">
          <button
            type="button"
            className="m-inbox-back m-press"
            onClick={closeBoard}
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
            Înapoi
          </button>
          {inboxBoard}
        </div>
      );
    }

    return (
      <div className="m-brief m-inbox space-y-0 flex flex-col flex-1 min-h-0 pb-2">
        <header className="m-brief-hero">
          <h1 className="m-inbox-title">{formatDateDMY(new Date())}</h1>
        </header>

        <section className="m-inbox-grid" aria-label="Statusuri">
          {inboxStats.map((tile) => {
            const Icon = tile.Icon;
            return (
              <button
                key={tile.key}
                type="button"
                className="m-inbox-stat m-press"
                onClick={tile.action}
              >
                <span className={`m-inbox-stat-icon is-${tile.tone}`}>
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span className="m-inbox-stat-copy">
                  <span className="m-inbox-stat-label">{tile.label}</span>
                  {tile.hideCount ? null : (
                    <span className="m-inbox-stat-count">{tile.count}</span>
                  )}
                </span>
              </button>
            );
          })}
        </section>

        <section className="m-inbox-section" aria-label="Spații de lucru">
          <p className="m-inbox-section-label">Workspaces</p>
          <div className="m-inbox-workspaces">
            {workspaces.map((row) => (
              <button
                key={row.id}
                type="button"
                className="m-inbox-row m-press"
                onClick={row.action}
              >
                <span className="m-inbox-row-icon">
                  <Folder size={18} strokeWidth={1.8} />
                </span>
                <span className="m-inbox-row-label">{row.label}</span>
                {row.count != null && row.count > 0 ? (
                  <span className="m-inbox-row-meta">{row.count}</span>
                ) : null}
                <ChevronRight size={16} className="m-inbox-row-chevron" />
              </button>
            ))}
          </div>
        </section>
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
            {
              id: "alerte",
              label: `Alerte (${totalAlertsCount})`,
              Icon: AlertTriangle,
              color: "var(--m-hub-b)",
              action: () => {
                if (onOpenAlerts) onOpenAlerts(totalAlertsCount > 0 ? "depasite" : "toate");
                else setActiveAlertTab("toate");
              },
            },
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
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[var(--app-text)] pb-4">
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
                  : "bg-[var(--app-surface)] text-[var(--app-muted)] border-[var(--app-border)]"
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
              <div key={item.id} className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="m-brief-row-plate">
                    <span className="m-plate">{c.numarInmatriculare || "—"}</span>
                    <span className="m-dosar-num">{c.numarDosar || "—"}</span>
                  </span>
                  <span className="text-[10px] font-bold bg-[var(--app-surface-2)] border border-[var(--app-border)] px-2 py-0.5 rounded-md text-[var(--app-text)] truncate max-w-[40%]">
                    {item.title}
                  </span>
                </div>

                <div className="m-vehicle-model truncate">{c.marcaModel || "Model neprecizat"}</div>

                <div className="text-[11.5px] font-bold text-[#B23A2E] bg-red-50/60 border border-red-100 p-2 rounded-xl">
                  {item.reason}
                </div>

                <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between gap-2">
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
                        className="px-2.5 py-1.5 rounded-xl bg-[var(--app-surface-2)] text-[var(--app-text)] text-[11px] font-bold"
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
