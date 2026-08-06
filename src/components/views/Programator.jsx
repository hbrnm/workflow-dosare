import React, { useState, useMemo, useEffect } from "react";
import {
  CalendarClock, PackageCheck, ChevronLeft, ChevronRight, Clock, Plus
} from "lucide-react";
import {
  todayISO, daysBetween
} from "../../utils/dateUtils";
import { isProgramatorClaim } from "../../constants/config";
import { getProgramareChipClass } from "../../utils/programareStatus";
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
  const pending = useMemo(() =>
    claims.filter((c) => (c.pieseSosite || c.status === "piese_sosite") && !c.dataProgramare),
    [claims]
  );
  if (pending.length === 0) return null;

  return (
    <div className="bg-[#FBF3E6] border border-[#C98A2B]/40 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <PackageCheck size={15} className="text-[#C98A2B]" />
        <span className="text-[12px] font-bold text-[#7A5316]">
          {pending.length} dosar{pending.length > 1 ? "e" : ""} cu piese sosite — neprogramat{pending.length > 1 ? "e" : ""}
        </span>
        <span className="ml-auto text-[10.5px] text-[#7A5316] font-medium">
          Deschide dosarul pentru a programa data și ora
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#C98A2B]/40 rounded-lg text-[10.5px] font-semibold text-[#7A5316] hover:bg-[#FBF3E6] hover:border-[#C98A2B] transition-colors shadow-sm"
          >
            <CalendarClock size={11} />
            {c.numarDosar} · {c.client || c.numarInmatriculare}
            <span className="text-[#8A8375] font-normal">{daysBetween(c.dataSchimbareStatus)}z</span>
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
}) {
  const today = new Date();
  const [activeDateStr, setActiveDateStr] = useState(() => initialDate || todayISO());
  const [weekOffset, setWeekOffset] = useState(0);
  const [capInput, setCapInput] = useState(capacitate || 5);
  
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

  // Generate calendar cells (rolling 35 days starting from today + weekOffset)
  const calendarCells = useMemo(() => {
    const cells = [];
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    for (let i = 0; i < 35; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${year}-${month}-${day}`;
      cells.push({
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        iso,
        weekday: d.getDay(),
      });
    }
    return cells;
  }, [weekOffset]);

  // Weekday headers follow the rolling window (not stuck on "today" when navigating)
  const headers = useMemo(() => {
    if (calendarCells.length === 0) return WEEKDAYS_RO;
    return calendarCells.slice(0, 7).map((cell, i) => {
      const name = WEEKDAYS_RO[cell.weekday];
      const isTodayCol = cell.iso === todayISO();
      return isTodayCol ? `${name} (Azi)` : name;
    });
  }, [calendarCells]);

  // Claims on the active date
  const activeDayClaims = useMemo(() => {
    if (!activeDateStr) return [];
    return claims
      .filter(c => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) === activeDateStr)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims, activeDateStr]);

  const upcomingClaims = useMemo(() => {
    const today = todayISO();
    return claims
      .filter((c) => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) >= today)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims]);

  const activeDayFormatted = useMemo(() => {
    if (!activeDateStr) return "";
    return activeDateStr.split("-").reverse().join(".");
  }, [activeDateStr]);

  // Arrived claims that do not have dateProgramare yet
  const arrivedClaims = useMemo(() => {
    return claims.filter(c => (c.pieseSosite || c.status === "piese_sosite") && !c.dataProgramare);
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
          <title>Programari Service - ${activeDayFormatted}</title>
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
      <div className="bg-white rounded-xl border border-[#DAD4C6] px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-bold text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <CalendarClock size={16} className="inline mr-1.5 text-[#3B5166] mb-0.5" />
            Programator Service
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-[#6B6558]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#2F8F5B]" /> Onorată</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#D6473F]" /> Neonorată</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#E7EEF5] border border-[#2E5C8A]/30" /> Neconfirmată</span>
          </div>
          
          {/* Calendar controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded border border-[#DAD4C6] text-[#3B5166] transition-colors hover:bg-[#EFEAE1]"
              title="Săptămâna anterioară"
            >
              <ChevronLeft size={15} />
            </button>
            <button onClick={handleSetToday} className="px-3 py-1 rounded bg-[#3B5166] text-white font-semibold text-[11.5px] hover:bg-[#2C4160] transition-colors">
              Mergi la azi
            </button>
            <button onClick={nextWeek} className="p-1.5 rounded hover:bg-[#EFEAE1] border border-[#DAD4C6] text-[#3B5166] transition-colors" title="Săptămâna următoare">
              <ChevronRight size={15} />
            </button>
            <span className="font-bold text-[#23282E] text-[12.5px] ml-1 bg-[#FAF8F5] px-2 py-1 rounded border border-[#DAD4C6]">
              Interval: {dateRangeLabel}
            </span>
          </div>
        </div>

        {/* Capacity Input */}
        <div className="flex items-center gap-2 text-[11.5px] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#DAD4C6]">
          <Clock size={13} className="text-[#6B6558]" />
          <span className="text-[#6B6558] font-medium">Capacitate zilnică:</span>
          <input
            type="number"
            min={1} max={30}
            className="w-11 border border-[#DAD4C6] rounded px-1.5 py-0.5 text-center font-bold text-[#23282E] bg-white text-[11.5px]"
            value={capInput}
            onChange={(e) => setCapInput(Number(e.target.value) || 1)}
          />
          <span className="text-[#6B6558]">mașini/zi</span>
          <button
            onClick={() => onSetCapacitate && onSetCapacitate(capInput)}
            className="px-2.5 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160] transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>

      {/* Pending dosare banner */}
      <div className="shrink-0">
        <PendingBanner claims={claims} onOpen={onOpen} />
      </div>

      {/* Listă viitoare — aceeași logică ca pe mobil */}
      {upcomingClaims.length > 0 && (
        <div className="shrink-0 bg-white border border-[#DAD4C6] rounded-xl px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-extrabold text-[#23282E]">
              Programări viitoare ({upcomingClaims.length})
            </div>
            <div className="text-[10.5px] text-[#8A8375] font-medium">
              Click pe o mașină ca să sari la ziua ei în calendar
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
            {upcomingClaims.map((c) => {
              const day = c.dataProgramare.slice(0, 10);
              const time = c.dataProgramare.slice(11, 16) || "08:00";
              const isActive = day === activeDateStr;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => jumpToProgramare(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${
                    isActive
                      ? "bg-[#3B5166] text-white border-[#3B5166]"
                      : "bg-[#FAF8F5] text-[#3B5166] border-[#DAD4C6] hover:border-[#C98A2B] hover:bg-[#FBF3E6]"
                  }`}
                  title={`${c.client || ""} · ${c.marcaModel || ""} · dosar ${c.numarDosar || "—"}`}
                >
                  <span className="font-mono">{day.slice(8, 10)}/{day.slice(5, 7)} {time}</span>
                  <span className="uppercase font-mono">{c.numarInmatriculare || "—"}</span>
                  {c.numarDosar ? <span className="opacity-70">#{c.numarDosar}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-3 items-stretch">
        
        {/* Rolling Calendar Grid */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
          {/* Days names */}
          <div className="grid grid-cols-7 text-center bg-[#FAF8F5] border-b border-[#EFEAE1]">
            {headers.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[13.5px] font-bold text-[#6B6558] py-2.5">{d}</span>
            ))}
          </div>

          {/* Days cells — toate zilele din fereastra rolling (nu ascunde luna următoare) */}
          <div className="grid grid-cols-7 auto-rows-fr gap-px bg-[#DAD4C6] flex-grow flex-1">
            {calendarCells.map((cell, idx) => {
              const dayClaims = claims.filter(c => isProgramatorClaim(c) && c.dataProgramare.slice(0, 10) === cell.iso);
              const total = dayClaims.length;
              const isSelected = activeDateStr === cell.iso;
              const isToday = cell.iso === todayISO();
              const crossesMonth =
                idx > 0 && calendarCells[idx - 1] && calendarCells[idx - 1].monthNum !== cell.monthNum;
              
              let capClass = crossesMonth ? "bg-[#FAF8F5] text-[#23282E]" : "bg-white text-[#23282E]";
              let badgeColor = "bg-[#FAF8F5] text-[#6B6558]";
              
              if (total > 0) {
                if (total > capacitate) {
                  capClass = "bg-[#B23A2E]/5 hover:bg-[#B23A2E]/10";
                  badgeColor = "bg-[#B23A2E] text-white";
                } else if (total === capacitate) {
                  capClass = "bg-[#C98A2B]/5 hover:bg-[#C98A2B]/10";
                  badgeColor = "bg-[#C98A2B] text-white";
                } else {
                  capClass = "bg-[#3E6B45]/5 hover:bg-[#3E6B45]/10";
                  badgeColor = "bg-[#3E6B45] text-white";
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
                    e.currentTarget.classList.add("ring-2", "ring-[#C98A2B]", "ring-inset");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("ring-2", "ring-[#C98A2B]", "ring-inset");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-[#C98A2B]", "ring-inset");
                    const claimId = e.dataTransfer.getData("text/plain");
                    if (claimId && onPatch) {
                      const claim = claims.find(cl => cl.id === claimId);
                      if (claim) {
                        const oldTime = claim.dataProgramare ? claim.dataProgramare.slice(11, 16) : "08:00";
                        onPatch(claim.id, { dataProgramare: `${cell.iso}T${oldTime}:00` });
                      }
                    }
                  }}
                  className={`p-1 flex flex-col justify-between cursor-pointer transition-all min-h-[4.75rem] ${
                    isSelected ? "ring-2 ring-[#3B5166] z-10" : ""
                  } ${capClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[14px] font-mono font-bold px-1.5 py-0.5 rounded ${isToday ? "bg-[#C98A2B] text-white" : "text-[#23282E]"}`}>
                      {cell.iso.slice(8, 10)}/{cell.iso.slice(5, 7)}
                    </span>
                    {total > 0 && (
                      <span className={`text-[12.5px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                        {total}
                      </span>
                    )}
                  </div>
                  {/* Compact chips — mai multe programări pe aceeași zi */}
                  <div className="mt-1 flex flex-wrap gap-0.5 content-start min-h-[1.25rem]">
                    {dayClaims.map((c) => {
                      const time = c.dataProgramare?.slice(11, 16) || "";
                      const plate = (c.numarInmatriculare || "—").slice(-7);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData("text/plain", c.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDateStr(cell.iso);
                            setActiveSlotForScheduling(null);
                            setSelectingFromArrived(false);
                            if (onOpen) onOpen(c);
                          }}
                          className={`max-w-[54px] truncate text-[8.5px] font-mono font-extrabold px-1 py-0.5 rounded border leading-tight hover:opacity-80 active:scale-95 transition-all ${getProgramareChipClass(c.programareStatus)}`}
                          title={`${time ? `${time} · ` : ""}${c.numarInmatriculare || "—"}${c.numarDosar ? ` (#${c.numarDosar})` : ""} · ${c.client || ""}`}
                        >
                          {plate}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Details Panel broken down by Hourly Slots */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3.5 shadow-sm space-y-3 flex flex-col h-full min-h-0">
          <div className="border-b border-[#EFEAE1] pb-2 flex items-center justify-between shrink-0">
            <div>
              <div className="text-[15px] font-bold text-[#23282E]">Programări: {activeDayFormatted}</div>
              <div className="text-[12.5px] text-[#8A8375]">{activeDayClaims.length}/{capacitate} programate</div>
            </div>
            
            {/* Quick Share / Print tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyList}
                disabled={activeDayClaims.length === 0}
                className="px-2 py-1 rounded bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copiază textul programului pentru WhatsApp"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={handlePrintList}
                disabled={activeDayClaims.length === 0}
                className="px-2 py-1 rounded bg-[#3B5166] hover:bg-[#2C4160] text-white text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Printează programul zilei"
              >
                🖨️ Tipărește
              </button>
            </div>
          </div>

          {/* Slots List (Scrollable) */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 divide-y divide-[#EFEAE1]/60 scrollbar-thin">
            {SLOTURI_ORARE.map(slot => {
              const items = activeDayClaims.filter(c => getSlotForIso(c.dataProgramare) === slot);
              const hasItems = items.length > 0;
              const isSchedulingThisSlot = activeSlotForScheduling === slot;

              return (
                <div key={slot} className="group py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-[12.5px] font-mono text-[#8A8375] mb-1 font-bold">
                    <span>{slot}</span>
                    {!isSchedulingThisSlot && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlotForScheduling(slot);
                          setSelectingFromArrived(false);
                        }}
                        className="text-[#C98A2B] hover:text-[#7A5316] font-bold transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        + Programează
                      </button>
                    )}
                  </div>

                  {hasItems ? (
                    <div className="space-y-1">
                      {items.map((c) => (
                        <ProgramatorClaimCard
                          key={c.id}
                          claim={c}
                          claims={claims}
                          onOpen={onOpen}
                          onPatch={onPatch}
                          canEdit={canEditFn}
                          onMarkNeonorata={handleMarkNeonorata}
                          checkMasinaSchimbConflict={checkMasinaSchimbConflict}
                        />
                      ))}
                    </div>
                  ) : isSchedulingThisSlot ? (
                    <div className="bg-[#FDFCF9] border border-[#DAD4C6] rounded-lg p-2.5 space-y-2 text-[11px] shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1">
                        <span className="font-bold text-[#3B5166]">Programează la {slot.split(" - ")[0]}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSlotForScheduling(null);
                            setSelectingFromArrived(false);
                          }}
                          className="text-[#8A8375] hover:text-[#23282E] font-bold"
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
                          className="py-1.5 rounded border border-[#DAD4C6] bg-white hover:bg-[#FAF8F5] text-center font-bold text-[#23282E] shadow-2xs transition-colors"
                        >
                          📄 Dosar Nou
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectingFromArrived(prev => !prev)}
                          className={`py-1.5 rounded border text-center font-bold shadow-2xs transition-colors ${selectingFromArrived ? "bg-[#3B5166] text-white border-[#3B5166]" : "border-[#DAD4C6] bg-white hover:bg-[#FAF8F5] text-[#23282E]"}`}
                        >
                          📦 Piese Sosite
                        </button>
                      </div>

                      {selectingFromArrived && (
                        <div className="space-y-1 mt-2 max-h-[140px] overflow-y-auto border border-[#DAD4C6] rounded bg-white p-1.5 scrollbar-thin">
                          {arrivedClaims.length === 0 ? (
                            <div className="text-[10px] text-[#8A8375] italic text-center py-4">Niciun dosar în așteptare cu piese sosite.</div>
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
                                className="w-full text-left p-1 rounded hover:bg-[#FAF8F5] border-b border-[#EFEAE1]/50 text-[10px] flex items-center justify-between font-semibold gap-2 min-w-0"
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="font-mono text-[#3B5166] font-bold uppercase shrink-0">{c.numarInmatriculare || "FĂRĂ NR."}</span>
                                  {c.numarDosar && (
                                    <span className="text-[9.5px] font-mono font-bold bg-[#EFEAE1] px-1.5 py-0.2 rounded text-[#3B5166] shrink-0" title={`Dosar #${c.numarDosar}`}>
                                      #{c.numarDosar}
                                    </span>
                                  )}
                                  {c.ceEsteDeReparat && c.ceEsteDeReparat.trim() !== "—" && (
                                    <>
                                      <span className="text-[#8A8375] shrink-0">·</span>
                                      <span className="text-[#6B6558] font-normal truncate" title={c.ceEsteDeReparat}>{c.ceEsteDeReparat}</span>
                                    </>
                                  )}
                                </div>
                                <span className="text-[#8A8375] truncate shrink-0 max-w-[100px] font-normal">{c.client || "—"}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[12.5px] text-[#C2BCB0] italic py-0.5 pl-1.5 select-none">Liber</div>
                  )}
                </div>
              );
            })}
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
