import React, { useState, useMemo, useEffect } from "react";
import {
  CalendarClock, PackageCheck, ChevronLeft, ChevronRight, Clock, Plus
} from "lucide-react";
import {
  todayISO, daysBetween
} from "../../utils/dateUtils";
import { isProgramatorClaim } from "../../constants/config";
import { getProgramareChipClass } from "../../utils/programareStatus";
import { groupClaimsByPlate, countUniqueVehicles } from "../../utils/plateSchedule";
import { isPartsArrivedUnscheduled } from "../../utils/alertUtils";
import ProgramatorClaimCard from "./ProgramatorClaimCard";
import ProgramareNeonorataModal from "../modals/ProgramareNeonorataModal";

export const SLOTURI_ORARE = [
  "08:00 - 08:30",
  "08:30 - 09:00",
  "09:00 - 09:30",
  "09:30 - 10:00",
  "10:00 - 10:30",
  "10:30 - 11:00",
  "11:00 - 11:30",
  "11:30 - 12:00",
  "12:00 - 12:30",
  "12:30 - 13:00",
  "13:00 - 13:30",
  "13:30 - 14:00",
  "14:00 - 14:30",
  "14:30 - 15:00",
  "15:00 - 15:30",
  "15:30 - 16:00",
  "16:00 - 16:30",
  "16:30 - 17:00",
  "17:00 - 17:30",
  "17:30 - 18:00",
];

export function getSlotForIso(isoStr) {
  if (!isoStr) return "08:00 - 08:30";
  const [hPart, mPart] = (isoStr.slice(11, 16) || "08:00").split(":");
  const h = Number(hPart) || 8;
  const m = Number(mPart) || 0;
  for (const slot of SLOTURI_ORARE) {
    const [startStr] = slot.split(" - ");
    const [sh, sm] = startStr.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const currentMinutes = h * 60 + m;
    if (currentMinutes >= startMinutes && currentMinutes < startMinutes + 30) return slot;
  }
  return SLOTURI_ORARE[0];
}

export function makeIsoFromSlot(baseIsoStr, slot) {
  const datePart = (baseIsoStr || todayISO()).slice(0, 10);
  const startHour = slot.split(" - ")[0] || "08:00";
  return `${datePart}T${startHour}:00`;
}

function checkMasinaSchimbConflict(claims, currentId, masinaSchimb, dateStr) {
  if (!masinaSchimb || !masinaSchimb.trim()) return false;
  const targetDate = dateStr.slice(0, 10);
  return claims.some(
    (c) =>
      c.id !== currentId &&
      c.masinaSchimb &&
      c.masinaSchimb.trim().toLowerCase() === masinaSchimb.trim().toLowerCase() &&
      c.dataProgramare &&
      c.dataProgramare.slice(0, 10) === targetDate
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Pending alert banner — dosare piese_sosite fără dată programată          */
/* ───────────────────────────────────────────────────────────────────────── */
function PendingBanner({ claims, onOpen }) {
  const pending = useMemo(
    () => claims.filter(isPartsArrivedUnscheduled),
    [claims]
  );
  if (pending.length === 0) return null;

  return (
    <div className="app-prog-pending-banner rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <PackageCheck size={15} className="text-[var(--app-accent)]" />
        <span className="text-[12px] font-bold">
          {pending.length} dosar{pending.length > 1 ? "e" : ""} cu piese sosite — neprogramat{pending.length > 1 ? "e" : ""}
        </span>
        <span className="ml-auto text-[10.5px] font-medium">
          Deschide dosarul pentru a programa data și ora
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-colors"
          >
            <CalendarClock size={11} />
            {c.numarDosar} · {c.client || c.numarInmatriculare}
            <span className="text-[var(--app-muted)] font-normal">{daysBetween(c.dataSchimbareStatus)}z</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Unified Super Programator component                                       */
/* ───────────────────────────────────────────────────────────────────────── */
const WEEKDAYS_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

export default function Programator({
  claims,
  onOpen,
  onPatch,
  canEditFn,
  capacitate,
  onSetCapacitate,
  onAddInStatus,
  initialDate = null,
  onNotify,
}) {
  const today = new Date();
  const [activeDateStr, setActiveDateStr] = useState(() => initialDate || todayISO());
  const [weekOffset, setWeekOffset] = useState(0);
  const [capInput, setCapInput] = useState(capacitate || 5);
  const [weekView, setWeekView] = useState(true);
  const [hideEmpty, setHideEmpty] = useState(true);
  
  useEffect(() => {
    if (!initialDate) return;
    setActiveDateStr(initialDate);
    setWeekOffset(0);
  }, [initialDate]);
  
  // State for scheduling a specific slot
  const [activeSlotForScheduling, setActiveSlotForScheduling] = useState(null);
  const [selectingFromArrived, setSelectingFromArrived] = useState(false);
  const [neonorataClaim, setNeonorataClaim] = useState(null);

  const handleMarkNeonorata = (claim) => {
    if (onPatch) {
      onPatch(claim.id, { programareStatus: "neonorata" });
    }
    setNeonorataClaim(claim);
  };

  const handleCloseNeonorataModal = () => {
    const claimId = neonorataClaim?.id;
    if (claimId && onPatch) {
      const current = claims.find((c) => c.id === claimId);
      if (current?.programareStatus === "neonorata") {
        onPatch(claimId, { programareStatus: null });
      }
    }
    setNeonorataClaim(null);
  };

  const handleCancelProgramare = async (claim) => {
    if (onPatch) {
      await onPatch(claim.id, { dataProgramare: null, programareStatus: null });
    }
    setNeonorataClaim(null);
  };

  const handleRescheduleProgramare = async (claim, iso) => {
    if (onPatch) {
      await onPatch(claim.id, { dataProgramare: iso, programareStatus: null });
    }
    setNeonorataClaim(null);
    const day = iso.slice(0, 10);
    setActiveDateStr(day);
    setWeekOffset(0);
  };

  const prevWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const nextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleSetToday = () => {
    setWeekOffset(0);
    setActiveDateStr(todayISO());
    setActiveSlotForScheduling(null);
    setSelectingFromArrived(false);
  };

  // Generate calendar cells (rolling 35 days starting from today + weekOffset or 5 days for Mon-Fri)
  const calendarCells = useMemo(() => {
    const cells = [];
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);

    if (weekView) {
      // Find Monday
      const day = baseDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diff = day === 0 ? -6 : 1 - day;
      baseDate.setDate(baseDate.getDate() + diff + weekOffset * 7);

      for (let i = 0; i < 5; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const dayStr = String(d.getDate()).padStart(2, "0");
        cells.push({
          dayNum: d.getDate(),
          monthNum: d.getMonth() + 1,
          iso: `${year}-${month}-${dayStr}`,
          weekday: d.getDay(),
        });
      }
    } else {
      baseDate.setDate(baseDate.getDate() + weekOffset * 7);
      for (let i = 0; i < 35; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const dayStr = String(d.getDate()).padStart(2, "0");
        cells.push({
          dayNum: d.getDate(),
          monthNum: d.getMonth() + 1,
          iso: `${year}-${month}-${dayStr}`,
          weekday: d.getDay(),
        });
      }
    }
    return cells;
  }, [weekOffset, weekView]);

  // Weekday headers follow the rolling window (not stuck on "today" when navigating)
  const headers = useMemo(() => {
    if (calendarCells.length === 0) return WEEKDAYS_RO;
    return calendarCells.slice(0, weekView ? 5 : 7).map((cell, i) => {
      const name = WEEKDAYS_RO[cell.weekday];
      const isTodayCol = cell.iso === todayISO();
      return isTodayCol ? `${name} (Azi)` : name;
    });
  }, [calendarCells, weekView]);

  // Claims on the active date
  const activeDayClaims = useMemo(() => {
    if (!activeDateStr) return [];
    return claims
      .filter(c => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) === activeDateStr)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims, activeDateStr]);

  const activeDayVehicleCount = useMemo(
    () => countUniqueVehicles(activeDayClaims),
    [activeDayClaims]
  );

  const upcomingClaims = useMemo(() => {
    const today = todayISO();
    return claims
      .filter((c) => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) >= today)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims]);

  const upcomingByPlate = useMemo(
    () => groupClaimsByPlate(upcomingClaims),
    [upcomingClaims]
  );

  const activeDayFormatted = useMemo(() => {
    if (!activeDateStr) return "";
    return activeDateStr.split("-").reverse().join(".");
  }, [activeDateStr]);

  // Arrived claims that do not have dateProgramare yet (and not already in service)
  const arrivedClaims = useMemo(() => {
    return claims.filter(isPartsArrivedUnscheduled);
  }, [claims]);

  const dateRangeLabel = useMemo(() => {
    if (calendarCells.length === 0) return "";
    const start = calendarCells[0].iso.split("-").reverse().slice(0, 2).join("/");
    const end = calendarCells[calendarCells.length - 1].iso.split("-").reverse().slice(0, 2).join("/");
    return `${start} — ${end}`;
  }, [calendarCells]);

  const jumpToProgramare = (claim) => {
    const iso = claim?.dataProgramare?.slice(0, 10);
    if (!iso) return;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const target = new Date(`${iso}T12:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    setWeekOffset(Math.floor(diffDays / 7));
    setActiveDateStr(iso);
    setActiveSlotForScheduling(null);
    setSelectingFromArrived(false);
  };

  const handleCopyList = () => {
    if (activeDayClaims.length === 0) return;
    let text = `📅 PROGRAMĂRI SERVICE - ${activeDayFormatted}\n\n`;
    activeDayClaims.forEach((c, idx) => {
      const time = c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00";
      text += `${idx + 1}. [${time}] ${c.numarInmatriculare} | ${c.marcaModel || "—"} | ${c.ceEsteDeReparat || "Fără operațiuni specificate"}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      alert("Lista a fost copiată în clipboard!");
    });
  };

  const handlePrintList = () => {
    if (activeDayClaims.length === 0) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Programări Service - ${activeDayFormatted}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 25px; color: #111; }
            h2 { border-bottom: 2px solid #23282E; padding-bottom: 6px; margin-bottom: 12px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #dad4c6; padding: 8px 10px; text-align: left; font-size: 12.5px; vertical-align: top; }
            th { background-color: #faf8f5; font-weight: bold; color: #3b5166; }
            .time { font-family: monospace; font-weight: bold; }
            .plate { font-family: monospace; font-weight: bold; font-size: 13.5px; }
            .operations { white-space: pre-wrap; word-break: break-word; font-size: 13.5px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <h2>Programări Service - ${activeDayFormatted}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 1%; white-space: nowrap;">Ora</th>
                <th style="width: 1%; white-space: nowrap;">Nr. Înmatriculare</th>
                <th style="width: 1%; white-space: nowrap;">Autoturism</th>
                <th>Operațiuni de efectuat</th>
              </tr>
            </thead>
            <tbody>
              ${activeDayClaims.map(c => `
                <tr>
                  <td class="time" style="white-space: nowrap;">${c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}</td>
                  <td class="plate" style="white-space: nowrap;">${c.numarInmatriculare || "—"}</td>
                  <td style="white-space: nowrap;">${c.marcaModel || "—"}</td>
                  <td class="operations">${c.ceEsteDeReparat || "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
      {/* Header */}
      <div className="app-prog-panel app-prog-panel-header rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-bold text-[var(--app-text-strong)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <CalendarClock size={16} className="inline mr-1.5 text-[var(--app-muted)] mb-0.5" />
            Programator Service
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-[var(--app-muted)]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2F8F5B]" /> Onorată</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#D6473F]" /> Neonorată</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#E7EEF5] border border-[#2E5C8A]/30" /> Neconfirmată</span>
          </div>
          
          {/* Calendar controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevWeek}
              className="app-prog-nav-btn p-1.5 rounded transition-colors"
              title="Săptămâna anterioară"
              aria-label="Săptămâna anterioară"
            >
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={handleSetToday} className="app-prog-nav-today px-3 py-1 rounded font-semibold text-[11.5px] transition-colors">
              Mergi la azi
            </button>
            <button type="button" onClick={nextWeek} className="app-prog-nav-btn p-1.5 rounded transition-colors" title="Săptămâna următoare" aria-label="Săptămâna următoare">
              <ChevronRight size={15} />
            </button>
            <span className="app-prog-range font-bold text-[12.5px] ml-1 px-2 py-1 rounded">
              Interval: {dateRangeLabel}
            </span>
          </div>
        </div>

        {/* Capacity Input and Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="app-prog-capacity flex items-center gap-3 text-[11.5px] px-3 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={weekView} onChange={(e) => setWeekView(e.target.checked)} className="rounded border-[var(--app-border)]" />
              <span className="font-medium">Luni-Vineri</span>
            </label>
            <div className="w-px h-4 bg-[var(--app-border)]" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="rounded border-[var(--app-border)]" />
              <span className="font-medium">Ascunde sloturi goale</span>
            </label>
          </div>

          <div className="app-prog-capacity flex items-center gap-2 text-[11.5px] px-3 py-1.5 rounded-lg">
            <Clock size={13} className="text-[var(--app-muted)]" />
            <span className="font-medium">Capacitate zilnică:</span>
            <input
              type="number"
              min={1} max={30}
              className="w-11 rounded px-1.5 py-0.5 text-center font-bold text-[11.5px]"
              value={capInput}
              onChange={(e) => setCapInput(Number(e.target.value) || 1)}
            />
            <span>mașini/zi</span>
            <button
              onClick={() => onSetCapacitate && onSetCapacitate(capInput)}
              className="app-prog-nav-today px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
            >
              Salvează
            </button>
          </div>
        </div>
      </div>

      {/* Pending dosare banner */}
      <div className="shrink-0">
        <PendingBanner claims={claims} onOpen={onOpen} />
      </div>

      {/* Listă viitoare — aceeași logică ca pe mobil */}
      {upcomingByPlate.length > 0 && (
        <div className="shrink-0 app-prog-upcoming rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-extrabold text-[var(--app-text-strong)]">
              Programări viitoare ({upcomingByPlate.length} mașini)
            </div>
            <div className="text-[10.5px] text-[var(--app-muted)] font-medium">
              Click pe o mașină ca să sari la ziua ei în calendar
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
            {upcomingByPlate.map((group) => {
              const c = group[0];
              const day = c.dataProgramare.slice(0, 10);
              const time = c.dataProgramare.slice(11, 16) || "08:00";
              const isActive = day === activeDateStr;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => jumpToProgramare(c)}
                  className={`app-prog-upcoming-chip flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    isActive ? "is-active" : ""
                  }`}
                  title={`${c.client || ""} · ${c.marcaModel || ""} · ${group.length > 1 ? `${group.length} dosare` : `dosar ${c.numarDosar || "—"}`}`}
                >
                  <span className="font-mono">{day.slice(8, 10)}/{day.slice(5, 7)} {time}</span>
                  <span className="uppercase font-mono">{c.numarInmatriculare || "—"}</span>
                  {group.length > 1 ? (
                    <span className="opacity-70">×{group.length}</span>
                  ) : c.numarDosar ? <span className="opacity-70">#{c.numarDosar}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-3 items-stretch">
        
        {/* Rolling Calendar Grid */}
        <div className="app-prog-panel rounded-xl overflow-hidden flex flex-col h-full">
          {/* Days names */}
          <div className={`app-prog-cal-header grid ${weekView ? "grid-cols-5" : "grid-cols-7"} text-center`}>
            {headers.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[13.5px] font-bold py-2.5">{d}</span>
            ))}
          </div>

          {/* Days cells */}
          <div className={`app-prog-cal-grid grid ${weekView ? "grid-cols-5" : "grid-cols-7"} auto-rows-fr gap-px flex-grow flex-1`}>
            {calendarCells.map((cell, idx) => {
              const dayClaims = claims.filter(c => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) === cell.iso);
              const total = countUniqueVehicles(dayClaims);
              const isSelected = activeDateStr === cell.iso;
              const isToday = cell.iso === todayISO();
              const crossesMonth =
                idx > 0 && calendarCells[idx - 1] && calendarCells[idx - 1].monthNum !== cell.monthNum;

              let capState = "";
              let badgeState = "";
              if (total > 0) {
                if (total > capacitate) {
                  capState = "is-over";
                  badgeState = "is-over";
                } else if (total === capacitate) {
                  capState = "is-full";
                  badgeState = "is-full";
                } else {
                  capState = "is-ok";
                  badgeState = "is-ok";
                }
              }

              return (
                <div
                  key={cell.iso}
                  onClick={() => {
                    setActiveDateStr(cell.iso);
                    setActiveSlotForScheduling(null);
                    setSelectingFromArrived(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={(e) => {
                    e.currentTarget.classList.add("ring-2", "ring-[var(--app-accent)]", "ring-inset");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("ring-2", "ring-[var(--app-accent)]", "ring-inset");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-[var(--app-accent)]", "ring-inset");
                    const claimId = e.dataTransfer.getData("text/plain");
                    if (claimId && onPatch) {
                      const claim = claims.find(cl => cl.id === claimId);
                      if (claim) {
                        const oldTime = claim.dataProgramare ? claim.dataProgramare.slice(11, 16) : "08:00";
                        onPatch(claim.id, { dataProgramare: `${cell.iso}T${oldTime}:00` });
                      }
                    }
                  }}
                  className={`app-prog-cal-cell p-1 flex flex-col justify-between cursor-pointer transition-all min-h-[4.75rem] ${
                    crossesMonth ? "is-alt-month" : ""
                  } ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${capState}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`app-prog-cal-date text-[14px] font-mono font-bold px-1.5 py-0.5 rounded`}>
                      {cell.iso.slice(8, 10)}/{cell.iso.slice(5, 7)}
                    </span>
                    {total > 0 && (
                      <span className={`app-prog-cal-badge text-[12.5px] font-bold px-1.5 py-0.5 rounded-full ${badgeState}`}>
                        {total}
                      </span>
                    )}
                  </div>
                  {/* Compact chips — comasate pe nr. înmatriculare */}
                  <div className="mt-1 flex flex-wrap gap-0.5 content-start min-h-[1.25rem]">
                    {(() => {
                      const groups = groupClaimsByPlate(dayClaims);
                      const visible = groups.slice(0, 2);
                      const hidden = groups.slice(2);

                      const renderChip = (group, isHidden = false) => {
                        const lead = group[0];
                        const time = lead.dataProgramare?.slice(11, 16) || "";
                        const plate = (lead.numarInmatriculare || "—").slice(-7);
                        const stacked = group.length > 1;
                        const title = stacked
                          ? `${time ? `${time} · ` : ""}${lead.numarInmatriculare || "—"} ×${group.length}: ${group.map((c) => `#${c.numarDosar || "?"}`).join(", ")}`
                          : `${time ? `${time} · ` : ""}${lead.numarInmatriculare || "—"}${lead.numarDosar ? ` (#${lead.numarDosar})` : ""} · ${lead.client || ""}`;
                        return (
                          <button
                            key={stacked ? `g-${lead.numarInmatriculare}-${lead.id}` : lead.id}
                            type="button"
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.setData("text/plain", lead.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDateStr(cell.iso);
                              setActiveSlotForScheduling(null);
                              setSelectingFromArrived(false);
                              if (onOpen) onOpen(lead);
                            }}
                            className={`app-prog-chip max-w-full truncate text-[10px] font-mono font-bold px-1.5 py-1 rounded leading-tight hover:opacity-80 active:scale-95 transition-all ${getProgramareChipClass(lead.programareStatus)} ${isHidden ? 'w-full text-left' : ''}`}
                            title={title}
                          >
                            {stacked ? `${plate}×${group.length}` : plate}
                          </button>
                        );
                      };

                      return (
                        <>
                          {visible.map(g => renderChip(g, false))}
                          {hidden.length > 0 && (
                            <div className="relative group/more z-10 hover:z-50">
                              <span className="app-prog-chip flex items-center justify-center max-w-full text-[10px] font-mono font-bold px-1.5 py-1 rounded leading-tight bg-[var(--app-surface-3)] text-[var(--app-muted)] border border-[var(--app-border)] cursor-default select-none hover:bg-[var(--app-border-soft)] transition-colors h-full">
                                +{hidden.length}
                              </span>
                              <div className="absolute hidden group-hover/more:flex flex-col gap-1 top-full mt-1 left-1/2 -translate-x-1/2 p-2 bg-[var(--app-surface-2)] border border-[var(--app-border)] shadow-2xl rounded-md min-w-[120px] max-h-[150px] overflow-y-auto custom-scrollbar z-[100]">
                                {hidden.map(g => renderChip(g, true))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Details Panel broken down by Hourly Slots */}
        <div className="app-prog-panel rounded-xl p-3.5 space-y-3 flex flex-col h-full min-h-0">
          <div className="app-prog-sidebar-header pb-2 flex items-center justify-between shrink-0">
            <div>
              <div className="text-[15px] font-bold text-[var(--app-text-strong)]">Programări: {activeDayFormatted}</div>
              <div className="text-[12.5px] text-[var(--app-muted)]">{activeDayVehicleCount}/{capacitate} programate (mașini)</div>
            </div>
            
            {/* Quick Share / Print tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyList}
                disabled={activeDayClaims.length === 0}
                className="app-prog-tool-wa px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copiază textul programului pentru WhatsApp"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={handlePrintList}
                disabled={activeDayClaims.length === 0}
                className="app-prog-tool-print px-2 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Printează programul zilei"
              >
                🖨️ Tipărește
              </button>
            </div>
          </div>

          {/* Slots List (Scrollable) */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 divide-y divide-[var(--app-border)]/60 scrollbar-thin">
            {(() => {
              const groupedSlots = [];
              let currentRange = null;

              SLOTURI_ORARE.forEach((slot) => {
                const items = activeDayClaims.filter((c) => getSlotForIso(c.dataProgramare) === slot);
                const hasItems = items.length > 0;
                const isScheduling = activeSlotForScheduling === slot;

                if (hasItems || isScheduling) {
                  if (currentRange) {
                    if (!hideEmpty) groupedSlots.push(currentRange);
                    currentRange = null;
                  }
                  groupedSlots.push({ type: "slot", slot, items, hasItems, isScheduling });
                } else {
                  if (!currentRange) {
                    currentRange = {
                      type: "range",
                      startSlot: slot,
                      endSlot: slot,
                      slots: [slot],
                    };
                  } else {
                    currentRange.slots.push(slot);
                    currentRange.endSlot = slot;
                  }
                }
              });

              if (currentRange && !hideEmpty) {
                groupedSlots.push(currentRange);
              }

              return groupedSlots.map((entry) => {
                if (entry.type === "range") {
                  const isSingle = entry.slots.length === 1;
                  const label = isSingle
                    ? entry.startSlot
                    : `${entry.startSlot.split(" - ")[0]} – ${entry.endSlot.split(" - ")[1]}`;

                  return (
                    <div
                      key={entry.startSlot}
                      onClick={() => {
                        setActiveSlotForScheduling(entry.slots[0]);
                        setSelectingFromArrived(false);
                      }}
                      className="group py-2 px-3 my-1 rounded-lg border border-dashed border-[var(--app-border)]/60 hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-2)] transition-all cursor-pointer flex items-center justify-between text-[12px] select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--app-muted)]">{label}</span>
                        <span className="text-[10.5px] font-semibold text-[var(--app-muted)] bg-[var(--app-surface-muted)] px-2 py-0.5 rounded-full">
                          {isSingle ? "Liber" : `${entry.slots.length} sloturi libere`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] font-bold text-[var(--app-accent)] opacity-80 group-hover:opacity-100 hover:underline"
                      >
                        + Programează
                      </button>
                    </div>
                  );
                }

                const { slot, items, hasItems, isScheduling } = entry;
                return (
                  <div key={slot} className="group py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between text-[12.5px] font-mono text-[var(--app-muted)] mb-1 font-bold">
                      <span>{slot}</span>
                      {!isScheduling && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlotForScheduling(slot);
                            setSelectingFromArrived(false);
                          }}
                          className="app-prog-slot-add font-bold transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          + Programează
                        </button>
                      )}
                    </div>

                    {hasItems ? (
                      <div className="space-y-1">
                        {groupClaimsByPlate(items).map((group) => (
                          <ProgramatorClaimCard
                            key={group.length > 1 ? `stack-${group[0].id}` : group[0].id}
                            claim={group[0]}
                            groupClaims={group.length > 1 ? group : null}
                            claims={claims}
                            onOpen={onOpen}
                            onPatch={onPatch}
                            canEdit={canEditFn}
                            onMarkNeonorata={handleMarkNeonorata}
                            checkMasinaSchimbConflict={checkMasinaSchimbConflict}
                            onNotify={onNotify}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="app-prog-schedule-popover rounded-lg p-2.5 space-y-2 text-[11px]">
                        <div className="app-prog-schedule-popover-header flex items-center justify-between pb-1">
                          <span className="font-bold">Programează la {slot.split(" - ")[0]}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotForScheduling(null);
                              setSelectingFromArrived(false);
                            }}
                            className="text-[var(--app-muted)] hover:text-[var(--app-text-strong)] font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotForScheduling(null);
                              if (onAddInStatus) {
                                onAddInStatus("programat", makeIsoFromSlot(activeDateStr, slot));
                              }
                            }}
                            className="app-prog-action py-1.5 rounded text-center font-bold transition-colors"
                          >
                            Dosar nou
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectingFromArrived(prev => !prev)}
                            className={`app-prog-action py-1.5 rounded text-center font-bold transition-colors ${selectingFromArrived ? "is-active" : ""}`}
                          >
                            Piese sosite
                          </button>
                        </div>

                        {selectingFromArrived && (
                          <div className="app-prog-arrived-list space-y-1 mt-2 max-h-[140px] overflow-y-auto rounded p-1.5 scrollbar-thin">
                            {arrivedClaims.length === 0 ? (
                              <div className="text-[10px] text-[var(--app-muted)] italic text-center py-4">Niciun dosar în așteptare cu piese sosite.</div>
                            ) : (
                              arrivedClaims.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    if (onPatch) {
                                      onPatch(c.id, { dataProgramare: makeIsoFromSlot(activeDateStr, slot) });
                                      setActiveSlotForScheduling(null);
                                      setSelectingFromArrived(false);
                                    }
                                  }}
                                  className="w-full text-left p-1 rounded border-b text-[10px] flex items-center justify-between font-semibold gap-2 min-w-0"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="font-mono font-bold uppercase shrink-0">{c.numarInmatriculare || "FĂRĂ NR."}</span>
                                    {c.numarDosar && (
                                      <span className="text-[9.5px] font-mono font-bold bg-[var(--app-surface-muted)] px-1.5 py-0.2 rounded shrink-0" title={`Dosar #${c.numarDosar}`}>
                                        #{c.numarDosar}
                                      </span>
                                    )}
                                    {c.ceEsteDeReparat && c.ceEsteDeReparat.trim() !== "—" && (
                                      <>
                                        <span className="text-[var(--app-muted)] shrink-0">·</span>
                                        <span className="text-[var(--app-muted)] font-normal truncate" title={c.ceEsteDeReparat}>{c.ceEsteDeReparat}</span>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[var(--app-muted)] truncate shrink-0 max-w-[100px] font-normal">{c.client || "—"}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {neonorataClaim && (
        <ProgramareNeonorataModal
          claim={claims.find((c) => c.id === neonorataClaim.id) || neonorataClaim}
          onClose={handleCloseNeonorataModal}
          onCancel={handleCancelProgramare}
          onReschedule={handleRescheduleProgramare}
        />
      )}
    </div>
  );
}
