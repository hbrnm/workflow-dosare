import React, { useState, useMemo } from "react";
import { STATUSES, getStatusDefinition } from "../../constants/config";
import { daysBetween, fmtDate, telLink } from "../../utils/dateUtils";
import { isStageOverdue } from "../../utils/alertUtils";
import { Trash2, Phone, ChevronDown, ChevronUp } from "lucide-react";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";
import WhatsAppButton from "../common/WhatsAppButton";

const QUICK_FILTERS = [
  { key: "toate", label: "Toate" },
  { key: "in_lucru", label: "În lucru" },
  { key: "piese_comandate", label: "Piese comandate" },
  { key: "gata_de_ridicare", label: "Gata ridicare" },
  { key: "blocate", label: "🛑 Blocate" },
];

export default function ClaimTable({ claims, onOpen, onDelete, canEditFn }) {
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [expandedGroups, setExpandedGroups] = useState({});

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter === "in_lucru" && c.status !== "in_lucru") return false;
      if (statusFilter === "piese_comandate" && c.status !== "piese_comandate") return false;
      if (statusFilter === "gata_de_ridicare" && c.status !== "gata_de_ridicare") return false;
      if (statusFilter === "blocate" && !c.blocat) return false;
      return true;
    });
  }, [claims, statusFilter]);

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

  const cols = [
    { key: "numarDosar", label: "Nr. dosar" }, { key: "tipAsigurare", label: "Tip" },
    { key: "asigurator", label: "Asigurător" }, { key: "client", label: "Client" },
    { key: "numarInmatriculare", label: "Nr. înmatr." }, { key: "marcaModel", label: "Marcă/Model" },
    { key: "status", label: "Status" }, { key: "dataDeschiderii", label: "Deschis" },
  ];

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
        onClick={() => onOpen(c)}
        className={`cursor-pointer border-t border-[#EFEAE1] hover:bg-[#F7F4EC] ${i % 2 ? "bg-[#FCFAF5]" : "bg-white"} ${inGroup ? "bg-[#F5F8FA]" : ""}`}
      >
        <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">
          {inGroup && <span className="text-[#8A8375] mr-1">↳</span>}
          {c.numarDosar || "—"}
        </td>
        <td className="px-3 py-2"><Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill></td>
        <td className="px-3 py-2 whitespace-nowrap">{c.asigurator || "—"}</td>
        <td className="px-3 py-2">{c.client || "—"}</td>
        <td className="px-3 py-2 font-mono whitespace-nowrap">
          {c.numarInmatriculare || "—"}
          {c.blocat && <span className="ml-1 text-[9px] bg-[#B23A2E] text-white px-1 py-0.5 rounded font-bold">BLOCAT</span>}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{c.marcaModel || "—"}</td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="text-[11px] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
          {c.status === "piese_comandate" && c.dataComandaPiese && (
            <span className="ml-1.5 text-[10px] text-[#7A5316] font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              📦 {c.dataComandaPiese}
            </span>
          )}
          {overdue && <AlertBadge days={days} threshold={c.termenAlertaZile || 3} />}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.dataDeschiderii)}</td>
        <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {phone && (
              <>
                <WhatsAppButton phone={phone} claim={c} size={12} />
                <a href={telLink(phone)} className="p-1 rounded bg-[#EEF1F3] text-[#3B5166] hover:bg-[#3B5166] hover:text-white transition-colors" title={`Sună ${phone}`}>
                  <Phone size={12} />
                </a>
              </>
            )}
            {canEditFn(c) ? (
              <button
                type="button"
                onClick={() => onDelete && onDelete(c.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#B23A2E] bg-[#FFF2F0] px-2 py-1 text-[11px] font-semibold text-[#B23A2E] hover:bg-[#FCE3E0] transition-colors"
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
    <div className="space-y-2">
      {/* Filtre rapide status — portate de pe mobil */}
      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        {QUICK_FILTERS.map(({ key, label }) => {
          const count = key === "toate"
            ? claims.length
            : key === "blocate"
              ? claims.filter((c) => c.blocat).length
              : claims.filter((c) => c.status === key).length;
          const active = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                active
                  ? key === "blocate" ? "bg-[#B23A2E] text-white border-[#B23A2E]" : "bg-[#2C4160] text-white border-[#2C4160]"
                  : "bg-white text-[#6B6558] border-[#DAD4C6] hover:bg-[#FAF8F5]"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#DAD4C6] bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#23282E] text-white">
              {cols.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)} className="text-left px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap">
                  {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
              ))}
              <th className="px-3 py-2 text-right whitespace-nowrap">Contact</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(({ key, group }, gi) => {
              if (group.length === 1) {
                return renderRow(group[0], gi);
              }

              const expanded = expandedGroups[key];
              const first = group[0];

              return (
                <React.Fragment key={key}>
                  <tr className="bg-[#EEF1F3] border-t border-[#DAD4C6]">
                    <td colSpan={9} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleGroup(key)}
                        className="flex items-center gap-2 text-[12px] font-extrabold text-[#3B5166] w-full text-left"
                      >
                        <span className="font-mono uppercase">🚗 {first.numarInmatriculare}</span>
                        <span className="bg-[#3B5166] text-white text-[10px] px-2 py-0.5 rounded-full">{group.length} dosare</span>
                        <span className="ml-auto flex items-center gap-1 text-[11px]">
                          {expanded ? "Restrânge" : "Extinde"}
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {expanded && group.map((c, i) => renderRow(c, i, { inGroup: true }))}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#8A8375]">Niciun dosar găsit.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
