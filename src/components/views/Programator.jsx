import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, Search, ChevronLeft, ChevronRight, Car, Clock, Plus
} from "lucide-react";
import {
  todayISO, daysBetween, getMondayOfISOWeek, getDaysOfWeek
} from "../../utils/dateUtils";
import Pill from "../common/Pill";

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
/* Mini appointment card shown inside a day column                          */
/* ───────────────────────────────────────────────────────────────────────── */
function AppointmentCard({ claim, onOpen, allClaims }) {
  const conflict = checkMasinaSchimbConflict(allClaims, claim.id, claim.masinaSchimb, claim.dataProgramare || "");
  return (
    <div
      onClick={() => onOpen(claim)}
      className="bg-white border border-[#DAD4C6] rounded-md p-1 cursor-pointer hover:border-[#3B5166] hover:shadow-xs transition-all flex flex-col justify-between min-h-[54px] select-none"
      title={`Dosar: ${claim.numarDosar}\nClient: ${claim.client || "—"}\nTip: ${claim.marcaModel || "—"}\nReparație: ${claim.ceEsteDeReparat || "—"}`}
    >
      <div className="flex items-center justify-between text-[8.5px] gap-0.5">
        <span className="font-mono font-bold text-[#3B5166]">
          {claim.dataProgramare ? claim.dataProgramare.slice(11, 16) : "08:00"}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${claim.tipAsigurare === "CASCO" ? "bg-[#C98A2B]" : "bg-[#3B5166]"}`} title={claim.tipAsigurare} />
      </div>
      <div className="font-mono font-bold text-[#23282E] text-[9.5px] leading-tight truncate uppercase mt-0.5">
        {claim.numarInmatriculare || "—"}
      </div>
      <div className="text-[8.5px] text-[#6B6558] truncate leading-none mt-0.5">
        {claim.marcaModel || claim.client || "—"}
      </div>
      {claim.masinaSchimb && (
        <div className={`text-[7.5px] font-bold px-0.5 py-px rounded flex items-center justify-between mt-0.5 truncate shrink-0 ${conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
          <span>🚗 {claim.masinaSchimb.slice(0, 7)}</span>
          {conflict && <span title="Conflict auto schimb!">⚠️</span>}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Pending alert banner — dosare piese_sosite fără dată programată          */
/* ───────────────────────────────────────────────────────────────────────── */
function PendingBanner({ claims, onOpen }) {
  const pending = useMemo(() =>
    claims.filter((c) => c.status === "piese_sosite" && !c.dataProgramare),
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

export default function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate, onAddInStatus }) {
  const today = new Date();
  const [activeDateStr, setActiveDateStr] = useState(() => today.toISOString().slice(0, 10));
  const [weekOffset, setWeekOffset] = useState(0);
  const [capInput, setCapInput] = useState(capacitate || 5);
  
  // State for scheduling a specific slot
  const [activeSlotForScheduling, setActiveSlotForScheduling] = useState(null);
  const [selectingFromArrived, setSelectingFromArrived] = useState(false);

  const prevWeek = () => {
    setWeekOffset(prev => Math.max(0, prev - 1));
  };

  const nextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleSetToday = () => {
    setWeekOffset(0);
    setActiveDateStr(today.toISOString().slice(0, 10));
    setActiveSlotForScheduling(null);
    setSelectingFromArrived(false);
  };

  // Generate calendar cells (rolling 35 days starting from today + weekOffset)
  const calendarCells = useMemo(() => {
    const cells = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    for (let i = 0; i < 35; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      cells.push({
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        iso,
        isCurrentMonth: true
      });
    }
    return cells;
  }, [weekOffset]);

  // Rolling weekday headers starting from today's weekday
  const headers = useMemo(() => {
    const list = [];
    const todayDay = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    for (let i = 0; i < 7; i++) {
      const idx = (todayDay + i) % 7;
      const name = WEEKDAYS_RO[idx];
      list.push(i === 0 ? `${name} (Azi)` : name);
    }
    return list;
  }, []);

  // Claims on the active date
  const activeDayClaims = useMemo(() => {
    if (!activeDateStr) return [];
    return claims
      .filter(c => c.dataProgramare && c.dataProgramare.slice(0, 10) === activeDateStr)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims, activeDateStr]);

  const activeDayFormatted = useMemo(() => {
    if (!activeDateStr) return "";
    return activeDateStr.split("-").reverse().join(".");
  }, [activeDateStr]);

  // Arrived claims that do not have dateProgramare yet
  const arrivedClaims = useMemo(() => {
    return claims.filter(c => c.status === "piese_sosite" && !c.dataProgramare);
  }, [claims]);

  const dateRangeLabel = useMemo(() => {
    if (calendarCells.length === 0) return "";
    const start = calendarCells[0].iso.split("-").reverse().slice(0, 2).join("/");
    const end = calendarCells[calendarCells.length - 1].iso.split("-").reverse().slice(0, 2).join("/");
    return `${start} — ${end}`;
  }, [calendarCells]);

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
            th, td { border: 1px solid #dad4c6; padding: 8px 10px; text-align: left; font-size: 12.5px; }
            th { background-color: #faf8f5; font-weight: bold; color: #3b5166; }
            .time { font-family: monospace; font-weight: bold; }
            .plate { font-family: monospace; font-weight: bold; font-size: 13.5px; }
          </style>
        </head>
        <body>
          <h2>Programări Service - ${activeDayFormatted}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Ora</th>
                <th style="width: 130px;">Nr. Înmatriculare</th>
                <th style="width: 180px;">Autoturism</th>
                <th>Operațiuni de efectuat</th>
              </tr>
            </thead>
            <tbody>
              ${activeDayClaims.map(c => `
                <tr>
                  <td class="time">${c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}</td>
                  <td class="plate">${c.numarInmatriculare || "—"}</td>
                  <td>${c.marcaModel || "—"}</td>
                  <td>${c.ceEsteDeReparat || "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
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
          
          {/* Calendar controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevWeek}
              disabled={weekOffset === 0}
              className={`p-1.5 rounded border border-[#DAD4C6] text-[#3B5166] transition-colors ${weekOffset === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-[#EFEAE1]"}`}
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

      {/* Main Grid View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-3 items-stretch">
        
        {/* Rolling Calendar Grid */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
          {/* Days names */}
          <div className="grid grid-cols-7 text-center bg-[#FAF8F5] border-b border-[#EFEAE1]">
            {headers.map(d => (
              <span key={d} className="text-[10.5px] font-bold text-[#8A8375] py-2">{d}</span>
            ))}
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 auto-rows-fr gap-px bg-[#DAD4C6] flex-grow flex-1">
            {calendarCells.map((cell, idx) => {
              const dayClaims = claims.filter(c => c.dataProgramare && c.dataProgramare.slice(0, 10) === cell.iso);
              const total = dayClaims.length;
              const isSelected = activeDateStr === cell.iso;
              const isToday = cell.iso === today.toISOString().slice(0, 10);
              
              let capClass = "bg-white text-[#23282E]";
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
                  key={idx}
                  onClick={() => {
                    setActiveDateStr(cell.iso);
                    setActiveSlotForScheduling(null);
                    setSelectingFromArrived(false);
                  }}
                  className={`p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-[#3B5166] z-10" : ""
                  } ${
                    cell.isCurrentMonth ? capClass : "bg-[#FAF8F5] text-[#C2BCB0]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-bold px-1 rounded ${isToday ? "bg-[#C98A2B] text-white" : "text-[#23282E]"}`}>
                      {cell.iso.slice(8, 10)}/{cell.iso.slice(5, 7)}
                    </span>
                    {total > 0 && (
                      <span className={`text-[10px] font-bold px-1 rounded-full ${badgeColor}`}>
                        {total}
                      </span>
                    )}
                  </div>
                  {/* Micro list of cars */}
                  <div className="mt-1 space-y-0.5 text-[9.5px] font-semibold text-[#3B5166] font-mono leading-none truncate max-w-full">
                    {dayClaims.slice(0, total > 5 ? 4 : 5).map(c => (
                      <div key={c.id} className="truncate">
                        🚗 {c.numarInmatriculare || "—"}
                      </div>
                    ))}
                    {total > 5 && (
                      <div className="text-[8.5px] text-[#8A8375] font-normal italic pl-3">
                        +{total - 4} altele
                      </div>
                    )}
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
              <div className="text-[12.5px] font-bold text-[#23282E]">Programări: {activeDayFormatted}</div>
              <div className="text-[10.5px] text-[#8A8375]">{activeDayClaims.length}/{capacitate} programate</div>
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
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8A8375] mb-1 font-bold">
                    <span>{slot}</span>
                    {!hasItems && !isSchedulingThisSlot && (
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
                      {items.map(c => {
                        const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, c.dataProgramare || "");
                        return (
                          <div
                            key={c.id}
                            onClick={() => onOpen(c)}
                            className="p-1.5 border border-[#DAD4C6] rounded-lg hover:border-[#3B5166] cursor-pointer transition-all bg-[#FAF8F5] text-[11px] flex flex-col hover:shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono font-bold text-[#3B5166] uppercase shrink-0">{c.numarInmatriculare}</span>
                                <span className="text-[#8A8375] shrink-0">·</span>
                                <span className="font-bold text-[#23282E] truncate">{c.client || "—"}</span>
                              </div>
                              <span className="text-[10px] text-[#6B6558] font-semibold truncate shrink-0 max-w-[150px]">{c.marcaModel || "—"}</span>
                            </div>
                            {c.ceEsteDeReparat && c.ceEsteDeReparat.trim() !== "—" && (
                              <div className="text-[9.5px] text-[#6B6558] border-t border-[#EFEAE1]/60 pt-1 mt-1 truncate flex items-center gap-1">
                                <span className="text-[#8A8375]">⚙️</span>
                                <span className="truncate">{c.ceEsteDeReparat}</span>
                              </div>
                            )}
                            {c.masinaSchimb && (
                              <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 w-max flex items-center gap-1 ${conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"}`}>
                                🚗 Auto Schimb: {c.masinaSchimb}
                                {conflict && <span>⚠️ Conflict!</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                                className="w-full text-left p-1 rounded hover:bg-[#FAF8F5] border-b border-[#EFEAE1]/50 text-[10px] flex items-center justify-between font-semibold"
                              >
                                <span className="font-mono text-[#3B5166] font-bold">{c.numarInmatriculare || c.numarDosar}</span>
                                <span className="text-[#8A8375] truncate max-w-[120px]">{c.client || "—"}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-[#C2BCB0] italic py-0.5 pl-1.5 select-none">Liber</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Masă Zilnică — overview pe sloturi de 30 min, o zi la un moment         */
/* ───────────────────────────────────────────────────────────────────────── */
function MasaZilnica({ claims, capacitate, onOpen }) {
  const [selectedDate, setSelectedDate] = useState(todayISO().slice(0, 10));

  const days7 = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" });
      list.push({ iso, label });
    }
    return list;
  }, []);

  const dayList = useMemo(() =>
    claims
      .filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === selectedDate)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || "")),
    [claims, selectedDate]
  );

  const bySlot = useMemo(() => {
    const map = {};
    SLOTURI_ORARE.forEach((s) => { map[s] = []; });
    dayList.forEach((c) => {
      const slot = getSlotForIso(c.dataProgramare);
      if (map[slot]) map[slot].push(c);
      else map[slot] = [c];
    });
    return map;
  }, [dayList]);

  const handleCopyList = () => {
    const sortedList = [...dayList].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    if (sortedList.length === 0) {
      alert("Nicio programare pentru această zi.");
      return;
    }
    const dateFormatted = selectedDate.split("-").reverse().join(".");
    let text = `📅 PROGRAMĂRI SERVICE - ${dateFormatted}\n\n`;
    sortedList.forEach((c, idx) => {
      const time = c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00";
      text += `${idx + 1}. [${time}] ${c.numarInmatriculare} | ${c.marcaModel || "—"} | ${c.ceEsteDeReparat || "Fără operațiuni specificate"}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      alert("Lista a fost copiată în clipboard! O poți trimite pe WhatsApp colegilor.");
    }).catch(() => {
      alert("Eroare la copiere.");
    });
  };

  const handlePrintList = () => {
    const sortedList = [...dayList].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    if (sortedList.length === 0) {
      alert("Nicio programare pentru această zi.");
      return;
    }
    const dateFormatted = selectedDate.split("-").reverse().join(".");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Programari Service - ${dateFormatted}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 25px; color: #111; }
            h2 { border-bottom: 2px solid #23282E; padding-bottom: 6px; margin-bottom: 12px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #dad4c6; padding: 8px 10px; text-align: left; font-size: 12.5px; }
            th { background-color: #faf8f5; font-weight: bold; color: #3b5166; }
            .time { font-family: monospace; font-weight: bold; }
            .plate { font-family: monospace; font-weight: bold; font-size: 13.5px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h2>Programări Service - ${dateFormatted}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Ora</th>
                <th style="width: 130px;">Nr. Înmatriculare</th>
                <th style="width: 180px;">Autoturism</th>
                <th>Operațiuni de efectuat</th>
              </tr>
            </thead>
            <tbody>
              ${sortedList.map(c => `
                <tr>
                  <td class="time">${c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}</td>
                  <td class="plate">${c.numarInmatriculare || "—"}</td>
                  <td>${c.marcaModel || "—"}</td>
                  <td>${c.ceEsteDeReparat || "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-3">
      {/* Day selector & Share tools */}
      <div className="bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex items-center flex-wrap gap-2 shadow-sm">
        <div className="flex items-center gap-1.5 mr-1 shrink-0">
          <span className="text-[11px] font-bold text-[#6B6558]">Alege dată:</span>
          <input
            type="date"
            className="bg-[#FAF8F5] border border-[#DAD4C6] rounded px-2 py-0.5 text-[11px] font-bold text-[#23282E] focus:outline-none focus:border-[#3B5166]"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 items-center border-l border-[#DAD4C6] pl-2">
          {days7.map((dh) => {
            const count = claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dh.iso).length;
            const active = dh.iso === selectedDate;
            return (
              <button
                key={dh.iso}
                onClick={() => setSelectedDate(dh.iso)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  active ? "bg-[#3B5166] text-white shadow-sm" : "bg-[#FAF8F5] text-[#23282E] border border-[#DAD4C6] hover:bg-[#EFEAE1]"
                }`}
              >
                {dh.label}
                <span className={`px-1 rounded-full text-[9px] ${active ? "bg-white/20 text-white" : "bg-[#3B5166]/10 text-[#3B5166]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Print / WhatsApp actions */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button
            onClick={handleCopyList}
            className="px-2.5 py-1 rounded bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] text-[11px] font-bold transition-all shadow-xs"
            title="Copiază textul listei pentru WhatsApp"
          >
            💬 Copiază pt. WhatsApp
          </button>
          <button
            onClick={handlePrintList}
            className="px-2.5 py-1 rounded bg-[#3B5166] hover:bg-[#2C4160] text-white text-[11px] font-bold transition-all shadow-xs"
            title="Printează lista de programări a zilei"
          >
            🖨️ Tipărește Programul
          </button>
          <span className="text-[11px] text-[#6B6558] font-bold border-l border-[#DAD4C6] pl-2">
            {dayList.length}/{capacitate}
          </span>
        </div>
      </div>

      {/* Slot grid */}
      <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-[90px_1fr] divide-x divide-[#EFEAE1]">
          {/* Header */}
          <div className="bg-[#FAF8F5] px-2.5 py-2 text-[10.5px] font-bold text-[#6B6558] border-b border-[#EFEAE1]">Slot orar</div>
          <div className="bg-[#FAF8F5] px-2.5 py-2 text-[10.5px] font-bold text-[#6B6558] border-b border-[#EFEAE1]">
            Programări ({selectedDate})
          </div>
          {/* Rows */}
          {SLOTURI_ORARE.map((slot) => {
            const items = bySlot[slot] || [];
            const hasItems = items.length > 0;
            return (
              <React.Fragment key={slot}>
                <div className={`px-2.5 py-1.5 text-[10px] font-mono font-bold border-b border-[#EFEAE1] flex items-center ${hasItems ? "text-[#3B5166]" : "text-[#C2BCB0]"}`}>
                  {slot}
                </div>
                <div className={`px-2 py-1 border-b border-[#EFEAE1] flex flex-wrap gap-1.5 min-h-[32px] ${hasItems ? "bg-white" : "bg-[#FAF8F5]/40"}`}>
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3B5166] text-white rounded text-[10px] font-semibold hover:bg-[#2C4160] transition-colors"
                    >
                      <Car size={9} />
                      {c.numarDosar} · {c.numarInmatriculare}
                      {c.client && <span className="text-white/70 font-normal truncate max-w-[80px]">{c.client}</span>}
                    </button>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Agendă Lunară — vizualizare calendaristică pe lună                      */
/* ───────────────────────────────────────────────────────────────────────── */
const MONTHS_RO = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

const WEEKDAYS_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

function AgendaLunara({ claims, capacitate, onOpen, onAddInStatus, onPatch }) {
  const today = new Date();
  
  // Selected day for the popover/details panel
  const [activeDateStr, setActiveDateStr] = useState(() => today.toISOString().slice(0, 10));

  const [showAddOptions, setShowAddOptions] = useState(false);
  const [selectingFromArrived, setSelectingFromArrived] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const prevWeek = () => {
    setWeekOffset(prev => Math.max(0, prev - 1));
  };

  const nextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const handleSetToday = () => {
    setWeekOffset(0);
    setActiveDateStr(today.toISOString().slice(0, 10));
  };

  // Generate calendar cells (rolling 35 days starting from today + weekOffset)
  const calendarCells = useMemo(() => {
    const cells = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    for (let i = 0; i < 35; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      cells.push({
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        iso,
        isCurrentMonth: true // all days in rolling view are active
      });
    }
    return cells;
  }, [weekOffset]);

  // Rolling weekday headers starting from today's weekday
  const headers = useMemo(() => {
    const list = [];
    const todayDay = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    for (let i = 0; i < 7; i++) {
      const idx = (todayDay + i) % 7;
      const name = WEEKDAYS_RO[idx];
      list.push(i === 0 ? `${name} (Azi)` : name);
    }
    return list;
  }, []);

  // Claims on the active date for the detail panel
  const activeDayClaims = useMemo(() => {
    if (!activeDateStr) return [];
    return claims
      .filter(c => c.dataProgramare && c.dataProgramare.slice(0, 10) === activeDateStr)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims, activeDateStr]);

  const activeDayFormatted = useMemo(() => {
    if (!activeDateStr) return "";
    return activeDateStr.split("-").reverse().join(".");
  }, [activeDateStr]);

  // Arrived claims that do not have dateProgramare yet
  const arrivedClaims = useMemo(() => {
    return claims.filter(c => c.status === "piese_sosite" && !c.dataProgramare);
  }, [claims]);

  const dateRangeLabel = useMemo(() => {
    if (calendarCells.length === 0) return "";
    const start = calendarCells[0].iso.split("-").reverse().slice(0, 2).join("/");
    const end = calendarCells[calendarCells.length - 1].iso.split("-").reverse().slice(0, 2).join("/");
    return `${start} — ${end}`;
  }, [calendarCells]);

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
            th, td { border: 1px solid #dad4c6; padding: 8px 10px; text-align: left; font-size: 12.5px; }
            th { background-color: #faf8f5; font-weight: bold; color: #3b5166; }
            .time { font-family: monospace; font-weight: bold; }
            .plate { font-family: monospace; font-weight: bold; font-size: 13.5px; }
          </style>
        </head>
        <body>
          <h2>Programări Service - ${activeDayFormatted}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Ora</th>
                <th style="width: 130px;">Nr. Înmatriculare</th>
                <th style="width: 180px;">Autoturism</th>
                <th>Operațiuni de efectuat</th>
              </tr>
            </thead>
            <tbody>
              ${activeDayClaims.map(c => `
                <tr>
                  <td class="time">${c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}</td>
                  <td class="plate">${c.numarInmatriculare || "—"}</td>
                  <td>${c.marcaModel || "—"}</td>
                  <td>${c.ceEsteDeReparat || "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3">
      {/* Month nav header */}
      <div className="bg-white border border-[#DAD4C6] rounded-lg px-3.5 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            disabled={weekOffset === 0}
            className={`p-1.5 rounded border border-[#DAD4C6] text-[#3B5166] transition-colors ${weekOffset === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-[#EFEAE1]"}`}
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
          <span className="font-bold text-[#23282E] text-[13px] ml-1">
            Interval afișat: {dateRangeLabel}
          </span>
        </div>
        <div className="text-[11px] text-[#6B6558] font-medium">
          Dă click pe o zi pentru a vedea programările detaliate
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-3 items-stretch">
        {/* Calendar Grid */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
          {/* Days names */}
          <div className="grid grid-cols-7 text-center bg-[#FAF8F5] border-b border-[#EFEAE1]">
            {headers.map(d => (
              <span key={d} className="text-[10.5px] font-bold text-[#8A8375] py-2">{d}</span>
            ))}
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 auto-rows-fr gap-px bg-[#DAD4C6] flex-grow flex-1">
            {calendarCells.map((cell, idx) => {
              const dayClaims = claims.filter(c => c.dataProgramare && c.dataProgramare.slice(0, 10) === cell.iso);
              const total = dayClaims.length;
              const isSelected = activeDateStr === cell.iso;
              const isToday = cell.iso === today.toISOString().slice(0, 10);
              
              let capClass = "bg-white text-[#23282E]";
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
                  key={idx}
                  onClick={() => {
                    setActiveDateStr(cell.iso);
                    setShowAddOptions(false);
                    setSelectingFromArrived(false);
                  }}
                  className={`p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-[#3B5166] z-10" : ""
                  } ${
                    cell.isCurrentMonth ? capClass : "bg-[#FAF8F5] text-[#C2BCB0]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-bold px-1 rounded ${isToday ? "bg-[#C98A2B] text-white" : cell.isCurrentMonth ? "text-[#23282E]" : "text-[#C2BCB0]"}`}>
                      {cell.iso.slice(8, 10)}/{cell.iso.slice(5, 7)}
                    </span>
                    {total > 0 && (
                      <span className={`text-[10px] font-bold px-1 rounded-full ${badgeColor}`}>
                        {total}
                      </span>
                    )}
                  </div>
                  {/* Micro list of cars */}
                  <div className="mt-1 space-y-0.5 text-[9.5px] font-semibold text-[#3B5166] font-mono leading-none truncate max-w-full">
                    {dayClaims.slice(0, total > 5 ? 4 : 5).map(c => (
                      <div key={c.id} className="truncate">
                        🚗 {c.numarInmatriculare || "—"}
                      </div>
                    ))}
                    {total > 5 && (
                      <div className="text-[8.5px] text-[#8A8375] font-normal italic pl-3">
                        +{total - 4} altele
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Details Panel */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3.5 shadow-sm space-y-3 flex flex-col h-full min-h-0">
          {activeDateStr ? (
            <>
              <div className="border-b border-[#EFEAE1] pb-2 flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-bold text-[#23282E]">Programări {activeDayFormatted}</div>
                  <div className="text-[10.5px] text-[#8A8375]">{activeDayClaims.length} programate</div>
                </div>
                {/* Add appointment button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOptions(prev => !prev);
                    setSelectingFromArrived(false);
                  }}
                  className="px-2 py-0.5 rounded bg-[#C98A2B]/15 hover:bg-[#C98A2B]/25 text-[#7A5316] text-[10px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                  title="Adaugă o programare nouă în această zi"
                >
                  <Plus size={11} /> Programează
                </button>
              </div>

              {/* Add options panel */}
              {showAddOptions && (
                <div className="bg-[#FDFCF9] border border-[#DAD4C6] rounded-lg p-2.5 space-y-2 text-[11px] shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1">
                    <span className="font-bold text-[#3B5166]">Programează pe {activeDayFormatted}</span>
                    <button type="button" onClick={() => setShowAddOptions(false)} className="text-[#8A8375] hover:text-[#23282E] font-bold">✕</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddOptions(false);
                        if (onAddInStatus) onAddInStatus("programat", activeDateStr);
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

                  {/* Selecting list from arrived claims */}
                  {selectingFromArrived && (
                    <div className="space-y-1 mt-2 max-h-[150px] overflow-y-auto border border-[#DAD4C6] rounded-md p-1 bg-white scrollbar-thin">
                      {arrivedClaims.length === 0 ? (
                        <div className="text-[10px] text-[#8A8375] italic text-center py-4">Niciun dosar în așteptare cu piese sosite.</div>
                      ) : (
                        arrivedClaims.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (onPatch) {
                                onPatch(c.id, { dataProgramare: `${activeDateStr}T08:00:00` });
                                setShowAddOptions(false);
                                setSelectingFromArrived(false);
                              }
                            }}
                            className="w-full text-left p-1 rounded hover:bg-[#FAF8F5] border-b border-[#EFEAE1]/50 text-[10px] flex items-center justify-between font-semibold"
                          >
                            <span className="font-mono text-[#3B5166] font-bold">{c.numarInmatriculare || c.numarDosar}</span>
                            <span className="text-[#8A8375] truncate max-w-[120px]">{c.client || "—"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeDayClaims.length === 0 ? (
                <div className="text-[11.5px] text-[#8A8375] italic text-center py-12">Nicio programare pentru această zi.</div>
              ) : (
                <>
                  <div className="space-y-1.5 flex-grow flex-1 overflow-y-auto scrollbar-thin pr-1">
                    {activeDayClaims.map(c => (
                      <div
                        key={c.id}
                        onClick={() => onOpen(c)}
                        className="p-1.5 border border-[#DAD4C6] rounded-lg hover:border-[#3B5166] cursor-pointer transition-all bg-[#FAF8F5] text-[11px] hover:shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold bg-[#3B5166] text-white px-1 py-0.2 rounded text-[9px] shrink-0">
                              {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                            </span>
                            <span className="font-mono font-bold text-[#3B5166] uppercase shrink-0">{c.numarInmatriculare}</span>
                            <span className="text-[#8A8375] shrink-0">·</span>
                            <span className="font-bold text-[#23282E] truncate">{c.client || "—"}</span>
                          </div>
                          <span className="text-[10px] text-[#6B6558] font-semibold truncate shrink-0 max-w-[120px]">{c.marcaModel || "—"}</span>
                        </div>
                        {c.ceEsteDeReparat && c.ceEsteDeReparat.trim() !== "—" && (
                          <div className="text-[9.5px] text-[#6B6558] border-t border-[#EFEAE1]/60 pt-1 mt-1 truncate flex items-center gap-1">
                            <span className="text-[#8A8375]">⚙️</span>
                            <span className="truncate">{c.ceEsteDeReparat}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#EFEAE1]">
                    <button
                      onClick={handleCopyList}
                      className="w-full py-1.5 rounded bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      💬 Copiază pt. WhatsApp
                    </button>
                    <button
                      onClick={handlePrintList}
                      className="w-full py-1.5 rounded bg-[#3B5166] hover:bg-[#2C4160] text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      🖨️ Tipărește Programul
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-[11.5px] text-[#8A8375] italic">
              Selectează o zi din calendar pentru a afișa programările.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Main export                                                               */
/* ───────────────────────────────────────────────────────────────────────── */
export default function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate, onAddInStatus }) {
  const [view, setView] = useState("agenda"); // 'agenda' | 'masa' | 'luna'
  const [capInput, setCapInput] = useState(capacitate || 5);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-bold text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <CalendarClock size={16} className="inline mr-1.5 text-[#3B5166] mb-0.5" />
            Programator Service
          </div>
          <div className="flex items-center gap-0.5 bg-[#FAF8F5] p-1 rounded-lg border border-[#DAD4C6]">
            <button
              onClick={() => setView("agenda")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${view === "agenda" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"}`}
            >
              Agendă Săptămânală
            </button>
            <button
              onClick={() => setView("masa")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${view === "masa" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"}`}
            >
              Masă Sloturi
            </button>
            <button
              onClick={() => setView("luna")}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${view === "luna" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"}`}
            >
              Agendă Lunară
            </button>
          </div>
        </div>

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

      {/* View */}
      {view === "agenda" ? (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <AgendaSaptamanala claims={claims} capacitate={capacitate || 5} onOpen={onOpen} />
        </div>
      ) : view === "masa" ? (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <MasaZilnica claims={claims} capacitate={capacitate || 5} onOpen={onOpen} />
        </div>
      ) : (
        <AgendaLunara claims={claims} capacitate={capacitate || 5} onOpen={onOpen} onAddInStatus={onAddInStatus} onPatch={onPatch} />
      )}
    </div>
  );
}
