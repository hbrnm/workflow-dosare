import React, { useState, useMemo, useEffect } from "react";
import { Phone, Trash2, ChevronUp, ChevronDown, AlertCircle, X } from "lucide-react";
import { STATUSES, getStatusDefinition, getClaimAlertDays, getStatusShortLabel, isPieseComandateStatus } from "../../constants/config";
import { fmtDate, telLink, getSinceMeta } from "../../utils/dateUtils";
import { isStageOverdue, getDaysInStage } from "../../utils/alertUtils";
import { downloadClaimsList } from "../../utils/exportClaimsList";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import FluxHeaderBar from "../common/FluxHeaderBar";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import {
  isSearchHighlighted,
  groupHasSearchHighlight,
  scrollToFirstHighlight,
} from "../../utils/searchUtils";
import { buildStatusCounts } from "../../utils/plateSchedule";
import { getClaimOpenedAt } from "../../utils/fluxClaimSort";

export default function ClaimTable({
  claims,
  onOpen,
  onDelete,
  canEditFn,
  highlightClaimIds = null,
  onNotify,
  onTogglePieseSosite,
  onScheduleFromPiese,
  onPatchPieseDates,
  density = "cozy",
}) {
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");
  const [focusedStage, setFocusedStage] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const statusCounts = useMemo(() => buildStatusCounts(claims), [claims]);

  const filtered = useMemo(() => {
    if (!focusedStage) return claims;
    return claims.filter((c) => c.status === focusedStage);
  }, [claims, focusedStage]);

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

  const cols = [
    { key: "numarDosar", label: "Nr. dosar", width: "6.5rem" },
    { key: "tipAsigurare", label: "Tip", width: "5.5rem" },
    { key: "asigurator", label: "Asigurător", width: "8.5rem" },
    { key: "client", label: "Client", width: "11rem" },
    { key: "numarInmatriculare", label: "Nr. înmatr.", width: "7rem" },
    { key: "marcaModel", label: "Marcă/Model", width: "9rem" },
    { key: "status", label: "Status", width: "12.5rem" },
    { key: "dataDeschiderii", label: "Deschis", width: "6rem" },
  ];

  const cell = "app-table-cell px-3 py-2 align-middle";
  const cellMuted = `${cell} text-[var(--app-muted)]`;

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

  const renderRow = (c, i, { inGroup = false } = {}) => {
    const s = getStatusDefinition(c.status);
    const days = getDaysInStage(c);
    const overdue = isStageOverdue(c);
    const phone = c.telefonClient || "";
    const stageSince = getSinceMeta(c.dataSchimbareStatus || c.dataDeschiderii || null);
    const blockedReason = String(c.motivBlocare || c.motivBlocat || "").trim();

    return (
      <tr
        key={c.id}
        id={`claim-row-${c.id}`}
        onClick={() => onOpen(c)}
        className={`group app-table-row cursor-pointer ${i % 2 ? "is-alt" : ""} ${inGroup ? "is-grouped" : ""} ${isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}`}
      >
        <td className={`${cell} font-mono font-semibold whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
          {inGroup && <span className="text-[var(--app-muted)] mr-1">↳</span>}
          <DosarNumber value={c.numarDosar} onNotify={onNotify} prefix="" />
        </td>
        <td className={cell}><Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill></td>
        <td className={`${cellMuted} truncate`} title={c.asigurator || ""}>{c.asigurator || "—"}</td>
        <td className={`${cell} truncate`} title={c.client || ""}>{c.client || "—"}</td>
        <td className={`${cell} font-mono`}>
          <div className="flex flex-col gap-0.5 min-w-0 items-start">
            <div className="whitespace-nowrap flex items-center gap-1.5">
              <span className="font-mono font-black text-[13px] text-[var(--app-text-strong)] tracking-wider uppercase bg-zinc-900/60 px-1.5 py-0.5 rounded border border-[var(--app-border)]">
                {c.numarInmatriculare || "—"}
              </span>
              {c.blocat && <span className="text-[9px] bg-[var(--app-danger)] text-white px-1 py-0.5 rounded font-bold">BLOCAT</span>}
            </div>
            {c.blocat && blockedReason ? (
              <span className="text-[10px] text-[var(--app-danger)] truncate" title={`Motiv blocare: ${blockedReason}`}>
                Motiv: {blockedReason}
              </span>
            ) : null}
          </div>
        </td>
        <td className={`${cellMuted} truncate`} title={c.marcaModel || ""}>{c.marcaModel || "—"}</td>
        <td className={`${cell}`} title={`${String(s.num).padStart(2, "0")}. ${s.label}`}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="app-type-xs font-medium whitespace-nowrap truncate">
                {String(s.num).padStart(2, "0")}. {getStatusShortLabel(c.status)}
              </span>
              {overdue && <AlertBadge days={days} threshold={getClaimAlertDays(c)} />}
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
            {stageSince.dateTimeLabel ? (
              <span className="text-[10px] text-[var(--app-muted)] truncate" title={`În etapă din ${stageSince.dateTimeLabel}`}>
                În etapă din {stageSince.dateTimeLabel}
              </span>
            ) : null}
            {c.blocat ? (
              <span className="text-[10px] text-[var(--app-danger)] truncate" title={`Motiv blocare: ${blockedReason}`}>
                Motiv: {blockedReason}
              </span>
            ) : null}
          </div>
        </td>
        <td className={`${cellMuted} whitespace-nowrap`}>{fmtDate(c.dataDeschiderii)}</td>
        <td className={`${cell} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {phone && (
              <>
                <WhatsAppButton phone={phone} claim={c} size={12} />
                <a href={telLink(phone)} className="app-table-contact-btn p-1 rounded transition-colors" title={`Sună ${phone}`} aria-label={`Sună ${phone}`}>
                  <Phone size={12} />
                </a>
              </>
            )}
            {canEditFn(c) ? (
              <button
                type="button"
                aria-label="Șterge dosar"
                onClick={() => onDelete && onDelete(c.id)}
                className="app-table-delete-btn inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors"
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <Pill tone="ghost">vizualizare</Pill>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2" data-density={density}>
      <FluxHeaderBar
        statusCounts={statusCounts}
        focusedStage={focusedStage}
        onFocusStage={setFocusedStage}
        exportCount={sorted.length}
        onExport={handleDownloadList}
      />

      {focusedStage && (
        <div className="flex items-center justify-between bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 rounded-lg px-4 py-2.5 text-[12px] text-[var(--app-text)] shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={15} className="text-[var(--app-accent)]" />
            <span>Vezi doar dosarele din stadiul <strong>{getStatusDefinition(focusedStage)?.label}</strong>.</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFocusedStage(null)}
            className="flex items-center gap-1 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-3)] px-2 py-1.5 rounded transition-colors font-bold"
          >
            <X size={14} /> Șterge filtrul
          </button>
        </div>
      )}

      <div className="app-table-wrap overflow-x-auto rounded-lg flex-1 min-h-0">
        <table className="app-table w-full min-w-[960px] text-[12.5px]">
          <colgroup>
            {cols.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: "7.5rem" }} />
          </colgroup>
          <thead className="app-table-head sticky top-0 z-10">
            <tr>
              {cols.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className="app-table-cell px-3 py-2 text-left font-semibold cursor-pointer select-none whitespace-nowrap">
                  {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
              ))}
              <th className="app-table-cell px-3 py-2 text-right whitespace-nowrap">Contact</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(({ key, group }, gi) => {
              if (group.length === 1) {
                return renderRow(group[0], gi);
              }

              const expanded = expandedGroups[key];
              const first = group[0];
              const sharedClient = group.every((c) => (c.client || "") === (first.client || ""))
                ? (first.client || "—")
                : "—";
              const sharedModel = group.every((c) => (c.marcaModel || "") === (first.marcaModel || ""))
                ? (first.marcaModel || "—")
                : "—";
              const sharedInsurer = group.every((c) => (c.asigurator || "") === (first.asigurator || ""))
                ? (first.asigurator || "—")
                : "—";

              return (
                <React.Fragment key={key}>
                  <tr
                    className={`app-table-group-header cursor-pointer select-none ${expanded ? "is-expanded" : ""}`}
                    onClick={() => toggleGroup(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleGroup(key);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    title={expanded ? "Click pentru a restrânge" : "Click pentru a extinde dosarele"}
                  >
                    <td className={`${cellMuted} font-mono text-[11px] whitespace-nowrap`}>×{group.length}</td>
                    <td className={cell} />
                    <td className={`${cellMuted} truncate`} title={sharedInsurer !== "—" ? sharedInsurer : undefined}>
                      {sharedInsurer}
                    </td>
                    <td className={`${cell} truncate font-semibold`} title={sharedClient !== "—" ? sharedClient : undefined}>
                      {sharedClient}
                    </td>
                    <td className={`${cell} font-mono font-extrabold uppercase whitespace-nowrap`}>
                      {first.numarInmatriculare || "—"}
                    </td>
                    <td className={`${cellMuted} truncate`} title={sharedModel !== "—" ? sharedModel : undefined}>
                      {sharedModel}
                    </td>
                    <td className={cell}>
                      <span className="app-table-group-badge text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {group.length} dosare
                      </span>
                    </td>
                    <td className={cellMuted}>—</td>
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
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6">
                  <div className="app-empty border-0 bg-transparent">Niciun dosar găsit.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
