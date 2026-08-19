import React, { useState, useMemo, useEffect } from "react";
import {
  Phone, Trash2, ChevronUp, ChevronDown, AlertCircle, X,
  ChevronsUpDown, Search, FileUp, Plus, ExternalLink,
} from "lucide-react";
import {
  STATUSES,
  getStatusDefinition,
  getClaimAlertDays,
  getStatusShortLabel,
  isPieseComandateStatus,
} from "../../constants/config";
import { fmtDate, telLink, getSinceMeta } from "../../utils/dateUtils";
import { isStageOverdue, getDaysInStage } from "../../utils/alertUtils";
import { downloadClaimsList } from "../../utils/exportClaimsList";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import FluxHeaderBar from "../common/FluxHeaderBar";
import ClaimPlate from "../common/ClaimPlate";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import {
  isSearchHighlighted,
  groupHasSearchHighlight,
  scrollToFirstHighlight,
} from "../../utils/searchUtils";
import { buildStatusCounts } from "../../utils/plateSchedule";
import { getClaimOpenedAt } from "../../utils/fluxClaimSort";

/* ─────────────── helpers ─────────────── */
const selectCls =
  "h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 " +
  "text-[11px] text-slate-700 dark:text-zinc-300 px-2.5 pr-7 font-medium " +
  "focus:outline-none focus:ring-2 focus:ring-amber-400/60 cursor-pointer " +
  "appearance-none bg-no-repeat bg-[right_8px_center] bg-[length:12px]";

const SortIcon = ({ col, sortKey, sortDir }) => {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp size={11} className="ml-1 text-amber-500" />
    : <ChevronDown size={11} className="ml-1 text-amber-500" />;
};

/* ─────────────── component ─────────────── */
export default function ClaimTable({
  claims,
  onOpen,
  onOpenNew,
  onImportClick,
  onDelete,
  canEditFn,
  highlightClaimIds = null,
  onNotify,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  density = "cozy",
  activeClaimId,
}) {
  /* ── sort ── */
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");

  /* ── stage focus (FluxHeaderBar pill) ── */
  const [focusedStage, setFocusedStage] = useState(null);

  /* ── group expand ── */
  const [expandedGroups, setExpandedGroups] = useState({});

  /* ── inline filters (local) ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAsigurator, setFilterAsigurator] = useState("");
  const [filterTip, setFilterTip] = useState("");
  const [filterStadiu, setFilterStadiu] = useState("");

  const statusCounts = useMemo(() => buildStatusCounts(claims), [claims]);

  /* unique asiguratori for dropdown */
  const asiguratorOptions = useMemo(() => {
    const set = new Set(claims.map((c) => c.asigurator || "").filter(Boolean));
    return [...set].sort();
  }, [claims]);

  /* ── filter chain ── */
  const filtered = useMemo(() => {
    let arr = focusedStage ? claims.filter((c) => c.status === focusedStage) : claims;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          (c.numarInmatriculare || "").toLowerCase().includes(q) ||
          (c.numarDosar || "").toLowerCase().includes(q) ||
          (c.client || "").toLowerCase().includes(q)
      );
    }
    if (filterAsigurator) arr = arr.filter((c) => (c.asigurator || "") === filterAsigurator);
    if (filterTip)        arr = arr.filter((c) => (c.tipAsigurare || "") === filterTip);
    if (filterStadiu)     arr = arr.filter((c) => c.status === filterStadiu);

    return arr;
  }, [claims, focusedStage, searchTerm, filterAsigurator, filterTip, filterStadiu]);

  /* ── sort ── */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === "dataDeschiderii") {
        const diff = getClaimOpenedAt(a) - getClaimOpenedAt(b);
        if (diff !== 0) return sortDir === "asc" ? diff : -diff;
        return String(b.numarDosar || "").localeCompare(String(a.numarDosar || ""), "ro");
      }
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "status") {
        av = STATUSES.findIndex((s) => s.key === a.status);
        bv = STATUSES.findIndex((s) => s.key === b.status);
        av = av < 0 ? Number.MAX_SAFE_INTEGER : av;
        bv = bv < 0 ? Number.MAX_SAFE_INTEGER : bv;
      }
      av = av || ""; bv = bv || "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* ── group by plate + status ── */
  const groupedRows = useMemo(() => {
    const map = new Map();
    sorted.forEach((c) => {
      const plate = (c.numarInmatriculare || "").trim().toUpperCase();
      const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return Array.from(map.entries()).map(([key, group]) => ({ key, group }));
  }, [sorted]);

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
    const t = window.setTimeout(() => scrollToFirstHighlight(highlightClaimIds, "claim-row"), 120);
    return () => window.clearTimeout(t);
  }, [highlightClaimIds]);

  useEffect(() => {
    if (!highlightClaimIds?.size) return;
    groupedRows.forEach(({ key, group }) => {
      if (group.length > 1 && groupHasSearchHighlight(group, highlightClaimIds)) {
        setExpandedGroups((prev) => ({ ...prev, [key]: true }));
      }
    });
  }, [highlightClaimIds, groupedRows]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadList = async (format) => {
    await downloadClaimsList(sorted, { focusedStage, format });
  };

  const hasActiveFilters = searchTerm || filterAsigurator || filterTip || filterStadiu;

  /* ─── styles ─── */
  const cell = "px-4 py-3.5 align-middle";
  const cellMuted = `${cell} text-[var(--app-muted)]`;
  const thCls =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider " +
    "text-slate-400 dark:text-slate-400 cursor-pointer select-none whitespace-nowrap " +
    "bg-slate-50 dark:bg-slate-900/60";

  /* ─── 5-column stacked row ─── */
  const renderRow = (c, i, { inGroup = false } = {}) => {
    const s = getStatusDefinition(c.status);
    const days = getDaysInStage(c);
    const overdue = isStageOverdue(c);
    const phone = c.telefonClient || "";
    const stageSince = getSinceMeta(c.dataSchimbareStatus || c.dataDeschiderii || null);
    const blockedReason = String(c.motivBlocare || c.motivBlocat || "").trim();
    const isActive = activeClaimId === c.id;

    return (
      <tr
        key={c.id}
        id={`claim-row-${c.id}`}
        onClick={() => onOpen(c)}
        className={`group cursor-pointer transition-colors
          ${i % 2 === 0 ? "bg-[var(--app-surface)]" : "bg-[var(--app-surface-2)]/40"}
          hover:bg-amber-50/30 dark:hover:bg-amber-400/5
          border-b border-slate-100 dark:border-zinc-800/50 last:border-b-0
          ${inGroup ? "opacity-90" : ""}
          ${isActive ? "ring-2 ring-inset ring-amber-400 !bg-amber-50/40 dark:!bg-amber-400/10 z-10 relative" : ""}
          ${isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}
        `}
      >
        {/* ── Col 1: Vehicul ── */}
        <td className={cell}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-mono font-black text-[13px] tracking-wider uppercase text-[var(--app-text-strong)] flex items-center gap-1.5">
              {inGroup && <span className="text-[var(--app-muted)] text-[10px]">↳</span>}
              <ClaimPlate value={c.numarInmatriculare} />
              {c.blocat && (
                <span className="text-[9px] bg-[var(--app-danger)] text-white px-1 py-0.5 rounded font-bold">BLOCAT</span>
              )}
            </span>
            <span className="text-[13.5px] font-medium text-slate-500 dark:text-zinc-400 truncate" title={c.marcaModel || ""}>
              {c.marcaModel || "—"}
            </span>
          </div>
        </td>

        {/* ── Col 2: Dosar & Asigurător ── */}
        <td className={cell} onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <DosarNumber value={c.numarDosar} onNotify={onNotify} prefix="" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill>
              <span className="text-[13px] font-medium text-slate-500 dark:text-zinc-400 truncate" title={c.asigurator || ""}>
                {c.asigurator || "—"}
              </span>
            </div>
          </div>
        </td>

        {/* ── Col 3: Client ── */}
        <td className={cell}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-semibold text-[var(--app-text-strong)] truncate" title={c.client || ""}>
              {c.client || "—"}
            </span>
            {phone ? (
              <a
                href={telLink(phone)}
                onClick={(e) => e.stopPropagation()}
                className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1 w-fit"
                title={`Sună ${phone}`}
              >
                <Phone size={11} />
                {phone}
              </a>
            ) : (
              <span className="text-[12.5px] text-slate-400 dark:text-zinc-600">—</span>
            )}
          </div>
        </td>

        {/* ── Col 4: Piese / Stadiu Tehnic ── */}
        <td className={cell}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1">
              {overdue && <AlertBadge days={days} threshold={getClaimAlertDays(c)} />}
              {stageSince.dateTimeLabel && !overdue && (
                <span className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                  {stageSince.shortLabel || stageSince.dateTimeLabel}
                </span>
              )}
            </div>
            {isPieseComandateStatus(c.status) && (
              <div onClick={(e) => e.stopPropagation()} className="max-w-full overflow-hidden">
                <MobilePieseSositeRow
                  claim={c}
                  canEdit={canEditFn?.(c) !== false}
                  layout="inline"
                  onToggle={onTogglePieseSosite}
                  onSchedule={onScheduleFromPiese}
                  onPatchDates={onPatchPieseDates}
                />
              </div>
            )}
            {c.blocat && blockedReason && (
              <span className="text-[12px] font-bold text-[var(--app-danger)] truncate" title={`Motiv blocare: ${blockedReason}`}>
                {blockedReason}
              </span>
            )}
          </div>
        </td>

        {/* ── Col 5: Status & Acțiuni ── */}
        <td className={`${cell} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-bold truncate">
                {String(s.num).padStart(2, "0")}. {getStatusShortLabel(c.status)}
              </span>
              <span className="text-[11.5px] font-medium text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                {fmtDate(c.dataDeschiderii)}
              </span>
            </div>

            {/* Action cluster — hidden by default, visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {phone && (
                <>
                  <WhatsAppButton phone={phone} claim={c} size={12} />
                  <a
                    href={telLink(phone)}
                    className="app-table-contact-btn p-1 rounded transition-colors"
                    title={`Sună ${phone}`}
                    aria-label={`Sună ${phone}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={12} />
                  </a>
                </>
              )}
              <button
                type="button"
                aria-label="Deschide dosar"
                onClick={() => onOpen(c)}
                className="app-table-contact-btn p-1 rounded transition-colors"
                title="Fișă completă"
              >
                <ExternalLink size={12} />
              </button>
              {canEditFn(c) && (
                <button
                  type="button"
                  aria-label="Șterge dosar"
                  onClick={() => onDelete && onDelete(c.id)}
                  className="app-table-delete-btn inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        </td>
      </tr>
    );
  };

  /* ─── 5-column group header ─── */
  const renderGroupHeader = (key, group, gi) => {
    const expanded = expandedGroups[key];
    const first = group[0];
    const sharedClient = group.every((c) => (c.client || "") === (first.client || ""))
      ? (first.client || "—") : "—";
    const sharedModel = group.every((c) => (c.marcaModel || "") === (first.marcaModel || ""))
      ? (first.marcaModel || "—") : "—";
    const sharedInsurer = group.every((c) => (c.asigurator || "") === (first.asigurator || ""))
      ? (first.asigurator || "—") : "—";

    return (
      <React.Fragment key={key}>
        <tr
          className={`app-table-group-header cursor-pointer select-none ${expanded ? "is-expanded" : ""}`}
          onClick={() => toggleGroup(key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleGroup(key); }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          title={expanded ? "Click pentru a restrânge" : "Click pentru a extinde dosarele"}
        >
          {/* Vehicul */}
          <td className={`${cell} font-mono text-[11px] whitespace-nowrap`}>
            <ClaimPlate value={first.numarInmatriculare} />
            <span className="ml-2 text-[var(--app-muted)] text-[10px]">{sharedModel}</span>
          </td>
          {/* Dosar */}
          <td className={cellMuted}>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
              {group.length} dosare
            </span>
            <span className="ml-1.5 text-[11px]">{sharedInsurer}</span>
          </td>
          {/* Client */}
          <td className={`${cell} truncate font-semibold`} title={sharedClient !== "—" ? sharedClient : undefined}>
            {sharedClient}
          </td>
          {/* Piese */}
          <td className={cellMuted}>—</td>
          {/* Status & toggle */}
          <td className={`${cell} text-right whitespace-nowrap`}>
            <span className="app-table-group-toggle inline-flex items-center gap-1 text-[11px] font-bold">
              {expanded ? "Restrânge" : "Extinde"}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </td>
        </tr>
        {expanded && group.map((c, i) => renderRow(c, i, { inGroup: true }))}
      </React.Fragment>
    );
  };

  /* ─── render ─── */
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2" data-density={density}>
      {/* ── FluxHeaderBar (stage pills + export) ── */}
      <FluxHeaderBar
        statusCounts={statusCounts}
        focusedStage={focusedStage}
        onFocusStage={setFocusedStage}
        exportCount={sorted.length}
        onExport={handleDownloadList}
      />

      {/* ── Inline Filter Bar ── */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 shrink-0 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută nr. auto, dosar sau client…"
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Asigurător */}
        <div className="relative">
          <select
            value={filterAsigurator}
            onChange={(e) => setFilterAsigurator(e.target.value)}
            className={selectCls}
            aria-label="Filtrează după asigurător"
          >
            <option value="">Toți asigurătorii</option>
            {asiguratorOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Tip */}
        <div className="relative">
          <select
            value={filterTip}
            onChange={(e) => setFilterTip(e.target.value)}
            className={selectCls}
            aria-label="Filtrează după tip"
          >
            <option value="">CASCO & RCA</option>
            <option value="CASCO">CASCO</option>
            <option value="RCA">RCA</option>
          </select>
        </div>

        {/* Stadiu */}
        <div className="relative">
          <select
            value={filterStadiu}
            onChange={(e) => setFilterStadiu(e.target.value)}
            className={selectCls}
            aria-label="Filtrează după stadiu"
          >
            <option value="">Toate stadiile</option>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setSearchTerm(""); setFilterAsigurator(""); setFilterTip(""); setFilterStadiu(""); }}
            className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[11px] font-medium hover:bg-amber-100 dark:hover:bg-amber-800/30 transition"
          >
            <X size={11} /> Șterge filtrele
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Import Deviz */}
        {onImportClick && (
          <button
            type="button"
            onClick={onImportClick}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition shadow-sm"
          >
            <FileUp size={13} />
            <span className="hidden sm:inline">Import Deviz</span>
          </button>
        )}

        {/* + Dosar Nou */}
        {onOpenNew && (
          <button
            type="button"
            onClick={() => onOpenNew()}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-[var(--app-accent,#0284c7)] hover:bg-[var(--app-accent-hover,#0369a1)] text-white text-[11px] font-bold transition shadow-sm"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Dosar nou</span>
          </button>
        )}
      </div>

      {/* ── Focused stage banner ── */}
      {focusedStage && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-2 text-[12px] text-[var(--app-text)] shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={14} className="text-amber-500" />
            <span>
              Filtru activ: <strong>{getStatusDefinition(focusedStage)?.label}</strong>
              <span className="ml-2 text-slate-400 dark:text-zinc-500 font-normal">{sorted.length} dosare</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFocusedStage(null)}
            className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition font-medium text-[11px]"
          >
            <X size={13} /> Șterge
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="app-table-wrap overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 flex-1 min-h-0 shadow-sm">
        <table className="w-full min-w-[760px] text-[12.5px] border-collapse">
          <colgroup>
            <col style={{ width: "13rem" }} />
            <col style={{ width: "13rem" }} />
            <col style={{ width: "12rem" }} />
            <col style={{ width: "11rem" }} />
            <col />
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr>
              {[
                { key: "numarInmatriculare", label: "Vehicul", sortable: false },
                { key: "numarDosar",         label: "Dosar & Asigurător", sortable: true },
                { key: "client",             label: "Client",  sortable: true },
                { key: "dataDeschiderii",    label: "Piese / Stadiu", sortable: true },
                { key: "status",             label: "Status & Acțiuni", sortable: true },
              ].map(({ key, label, sortable }) => (
                <th
                  key={key}
                  onClick={sortable ? () => toggleSort(key) : undefined}
                  className={`${thCls} ${sortable ? "cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200" : "cursor-default"} border-b border-slate-200 dark:border-zinc-800`}
                >
                  <span className="inline-flex items-center">
                    {label}
                    {sortable && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groupedRows.map(({ key, group }, gi) =>
              group.length === 1
                ? renderRow(group[0], gi)
                : renderGroupHeader(key, group, gi)
            )}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-slate-400 dark:text-zinc-600">
                  {hasActiveFilters
                    ? "Niciun dosar nu corespunde filtrelor active."
                    : "Niciun dosar găsit."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
