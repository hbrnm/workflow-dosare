import React, { useState, useMemo } from "react";
import { STATUSES, getStatusDefinition } from "../../constants/config";
import { daysBetween, fmtDate } from "../../utils/dateUtils";
import { isStageOverdue } from "../../utils/alertUtils";
import Pill from "../common/Pill";
import AlertBadge from "../common/AlertBadge";

export default function ClaimTable({ claims, onOpen, canEditFn }) {
  const [sortKey, setSortKey] = useState("dataDeschiderii");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const arr = [...claims];
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
  }, [claims, sortKey, sortDir]);

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

  return (
    <div className="overflow-x-auto rounded-lg border border-[#DAD4C6] bg-white">
      <table className="w-full text-[12.5px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#23282E] text-white">
            {cols.map((c) => (
              <th key={c.key} onClick={() => toggleSort(c.key)} className="text-left px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap">
                {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
            ))}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const s = getStatusDefinition(c.status);
            const days = daysBetween(c.dataSchimbareStatus);
            const overdue = isStageOverdue(c);
            return (
              <tr key={c.id} onClick={() => onOpen(c)} className={`cursor-pointer border-t border-[#EFEAE1] hover:bg-[#F7F4EC] ${i % 2 ? "bg-[#FCFAF5]" : "bg-white"}`}>
                <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{c.numarDosar || "—"}</td>
                <td className="px-3 py-2"><Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill></td>
                <td className="px-3 py-2 whitespace-nowrap">{c.asigurator || "—"}</td>
                <td className="px-3 py-2">{c.client || "—"}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap">{c.numarInmatriculare || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{c.marcaModel || "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-[11px] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
                  {overdue && <AlertBadge days={days} threshold={c.termenAlertaZile || 3} />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.dataDeschiderii)}</td>
                <td className="px-3 py-2">{!canEditFn(c) && <Pill tone="ghost">doar vizualizare</Pill>}</td>
              </tr>
            );
          })}
          {sorted.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#8A8375]">Niciun dosar găsit.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
