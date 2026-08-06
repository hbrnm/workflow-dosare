import React, { useState, useMemo, useEffect } from "react";
import { STATUSES, getStatusDefinition } from "../../constants/config";
import { daysBetween, fmtDate, telLink } from "../../utils/dateUtils";
import { isStageOverdue } from "../../utils/alertUtils";
import { Trash2, Phone, ChevronDown, ChevronUp } from "lucide-react";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";
import FluxStageStrip from "../common/FluxStageStrip";
import {
  isSearchHighlighted,
  groupHasSearchHighlight,
  scrollToFirstHighlight,
} from "../../utils/searchUtils";

export default function ClaimTable({ claims, onOpen, onDelete, canEditFn, highlightClaimIds = null }) {
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");
  const [focusedStage, setFocusedStage] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUSES.forEach((s) => { counts[s.key] = 0; });
    claims.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [claims]);

  const filtered = useMemo(() => {
    if (!focusedStage) return claims;
    return claims.filter((c) => c.status === focusedStage);
  }, [claims, focusedStage]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
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
    { key: "status", label: "Status", width: "12rem" },
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

  const renderRow = (c, i, { inGroup = false } = {}) => {
    const s = getStatusDefinition(c.status);
    const days = daysBetween(c.dataSchimbareStatus);
    const overdue = isStageOverdue(c);
    const phone = c.telefonClient || "";

    return (
      <tr
        key={c.id}
        id={`claim-row-${c.id}`}
        onClick={() => onOpen(c)}
        className={`app-table-row cursor-pointer ${i % 2 ? "is-alt" : ""} ${inGroup ? "is-grouped" : ""} ${isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}`}
      >
        <td className={`${cell} font-mono font-semibold whitespace-nowrap`}>
          {inGroup && <span className="text-[var(--app-muted)] mr-1">↳</span>}
          {c.numarDosar || "—"}
        </td>
        <td className={cell}><Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill></td>
        <td className={`${cellMuted} truncate`} title={c.asigurator || ""}>{c.asigurator || "—"}</td>
        <td className={`${cell} truncate`} title={c.client || ""}>{c.client || "—"}</td>
        <td className={`${cell} font-mono whitespace-nowrap`}>
          {c.numarInmatriculare || "—"}
          {c.blocat && <span className="ml-1 text-[9px] bg-[var(--app-danger)] text-white px-1 py-0.5 rounded font-bold">BLOCAT</span>}
        </td>
        <td className={`${cellMuted} truncate`} title={c.marcaModel || ""}>{c.marcaModel || "—"}</td>
        <td className={`${cell} truncate`} title={`${String(s.num).padStart(2, "0")}. ${s.label}`}>
          <span className="text-[11px] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
          {c.status === "piese_comandate" && c.dataComandaPiese && (
            <span className="app-table-parts-badge ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
              📦 {c.dataComandaPiese}
            </span>
          )}
          {overdue && <AlertBadge days={days} threshold={c.termenAlertaZile || 3} />}
        </td>
        <td className={`${cellMuted} whitespace-nowrap`}>{fmtDate(c.dataDeschiderii)}</td>
        <td className={`${cell} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {phone && (
              <>
                <WhatsAppButton phone={phone} claim={c} size={12} />
                <a href={telLink(phone)} className="app-table-contact-btn p-1 rounded transition-colors" title={`Sună ${phone}`}>
                  <Phone size={12} />
                </a>
              </>
            )}
            {canEditFn(c) ? (
              <button
                type="button"
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
    <div className="flex flex-col flex-1 min-h-0 space-y-2">
      <FluxStageStrip
        statusCounts={statusCounts}
        focusedStage={focusedStage}
        onFocusStage={setFocusedStage}
      />

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
                <td colSpan={9} className="px-3 py-8 text-center text-[var(--app-muted)]">
                  Niciun dosar găsit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
