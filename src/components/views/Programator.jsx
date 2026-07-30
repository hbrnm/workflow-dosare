import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, Search, ChevronLeft, ChevronRight, ArrowRight, Car, Plus
} from "lucide-react";
import { STADII_PROGRAMABILE, getStatusDefinition } from "../../constants/config";
import { todayISO, nowISO, fmtDate, daysBetween } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import DatePickerInput from "../common/DatePickerInput";

export const SLOTURI_ORARE = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

export function getSlotForIso(iso) {
  if (!iso || !iso.includes("T")) return null;
  const time = iso.slice(11, 16);
  if (time >= "08:00" && time < "10:00") return "08:00 - 10:00";
  if (time >= "10:00" && time < "12:00") return "10:00 - 12:00";
  if (time >= "12:00" && time < "14:00") return "12:00 - 14:00";
  if (time >= "14:00" && time < "16:00") return "14:00 - 16:00";
  if (time >= "16:00" && time <= "18:00") return "16:00 - 18:00";
  return null;
}

export function makeIsoFromSlot(dateStr, slotStr) {
  const baseDate = dateStr ? dateStr.slice(0, 10) : todayISO();
  const startTime = slotStr ? slotStr.split(" - ")[0] : "08:00";
  return `${baseDate}T${startTime}`;
}

export function checkMasinaSchimbConflict(claims, claimId, masinaSchimb, dateStr) {
  if (!masinaSchimb || !masinaSchimb.trim() || !dateStr) return null;
  const nameClean = masinaSchimb.trim().toLowerCase();
  const targetDate = dateStr.slice(0, 10);
  const conflict = claims.find((c) => 
    c.id !== claimId &&
    c.masinaSchimb &&
    c.masinaSchimb.trim().toLowerCase() === nameClean &&
    (
      (c.dataProgramare && c.dataProgramare.slice(0, 10) === targetDate) ||
      (c.dataDariiLaSchimb && c.dataDariiLaSchimb.slice(0, 10) === targetDate)
    )
  );
  return conflict || null;
}

function getMondayOfISOWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getDaysOfWeek(mondayDate) {
  const days = [];
  for (let i = 0; i < 6; i++) {
    const day = new Date(mondayDate);
    day.setDate(mondayDate.getDate() + i);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function formatWeekRange(mondayDate) {
  const saturday = new Date(mondayDate);
  saturday.setDate(mondayDate.getDate() + 5);
  return `${fmtDate(mondayDate)} – ${fmtDate(saturday)}`;
}

function CalendarLunar({ claims, capacitate, canEditFn, onOpen, onPatch, monthOffset = 0, setMonthOffset }) {
  const [searchTerm, setSearchTerm] = useState("");

  const base = new Date();
  const viewDate = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const todayStr = todayISO();

  const prevMonth = () => setMonthOffset((m) => m - 1);
  const nextMonth = () => setMonthOffset((m) => m + 1);
  const jumpToday = () => setMonthOffset(0);

  const daysGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, month: m, year: y, dateStr, currentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, month: month, year: year, dateStr, currentMonth: true });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ day: i, month: m, year: y, dateStr, currentMonth: false });
    }
    return days;
  }, [year, month]);

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter((c) =>
      (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.numarDosar && c.numarDosar.toLowerCase().includes(term)) ||
      (c.masinaSchimb && c.masinaSchimb.toLowerCase().includes(term))
    );
  }, [claims, searchTerm]);

  const unassignedQueue = useMemo(() => {
    return filteredClaims.filter(
      (c) => STADII_PROGRAMABILE.includes(c.status) && (!c.dataProgramare || c.status === "piese_sosite")
    );
  }, [filteredClaims]);

  const claimsByDay = useMemo(() => {
    const map = {};
    daysGrid.forEach(({ dateStr }) => (map[dateStr] = []));
    filteredClaims.forEach((c) => {
      if (!c.dataProgramare) return;
      const d = c.dataProgramare.slice(0, 10);
      if (map[d]) {
        map[d].push(c);
      }
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    });
    return map;
  }, [filteredClaims, daysGrid]);

  const totalMonthScheduled = useMemo(() => {
    return Object.values(claimsByDay).reduce((acc, list) => acc + list.length, 0);
  }, [claimsByDay]);

  const totalMasiniSchimbMonth = useMemo(() => {
    return Object.values(claimsByDay).reduce(
      (acc, list) => acc + list.filter((c) => c.masinaSchimb).length,
      0
    );
  }, [claimsByDay]);

  const weekDayNames = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

  return (
    <div className="space-y-3">
      {/* Navigation & Summary Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            <ChevronLeft size={16} /> Înapoi
          </button>
          <button onClick={jumpToday} className="px-3 py-1.5 rounded-md border border-[#DAD4C6] bg-[#3B5166] text-white hover:bg-[#2C3E4C] text-[12px] font-semibold shadow-sm">
            Azi
          </button>
          <button onClick={nextMonth} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            Înainte <ChevronRight size={16} />
          </button>
          <span className="text-[14px] font-bold text-[#23282E] ml-2 capitalize">
            🗓️ Luna: {monthLabel}
          </span>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
          <span className="px-2.5 py-1 rounded-full bg-[#E8F3E9] text-[#3E6B45] font-bold border border-[#3E6B45]/20">
            {totalMonthScheduled} programări pe lună
          </span>
          {totalMasiniSchimbMonth > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#FBF3E6] text-[#7A5316] font-bold border border-[#C98A2B]/30 flex items-center gap-1">
              🚗 {totalMasiniSchimbMonth} auto la schimb
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-[#F5F2EA] text-[#6B6558] font-bold border border-[#DAD4C6]">
            📦 {unassignedQueue.length} de programat
          </span>
        </div>

        {/* Quick Search */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#8A8375]" />
            <input
              type="text"
              placeholder="Caută dosar, client, nr auto..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#DAD4C6] rounded-md bg-[#FAF8F5] focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Month Days Grid + Right Queue Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Month Grid (9 cols) */}
        <div className="lg:col-span-9 space-y-1.5">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-bold text-[#3B5166] bg-white p-2 rounded-lg border border-[#DAD4C6] shadow-sm">
            {weekDayNames.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {daysGrid.map(({ day, dateStr, currentMonth }) => {
              const dayList = claimsByDay[dateStr] || [];
              const count = dayList.length;
              const isToday = dateStr === todayStr;
              const pct = Math.min(100, Math.round((count / capacitate) * 100));

              let barTone = "bg-[#3E6B45]";
              if (count === capacitate) barTone = "bg-[#C98A2B]";
              if (count > capacitate) barTone = "bg-[#B23A2E]";

              return (
                <div
                  key={dateStr}
                  className={`min-h-[140px] rounded-lg border flex flex-col p-2 space-y-1 transition-all ${
                    isToday
                      ? "border-[#C98A2B] bg-[#FFFDF9] ring-2 ring-[#C98A2B]/30"
                      : currentMonth
                      ? "border-[#DAD4C6] bg-white"
                      : "border-[#EFEAE1] bg-[#FCFAF5]/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1">
                    <span className={`text-[12px] font-bold ${isToday ? "text-[#C98A2B]" : "text-[#23282E]"}`}>
                      {day} {isToday && "· Azi"}
                    </span>
                    <span className="text-[10px] text-[#6B6558] font-semibold">
                      {count}/{capacitate} mașini
                    </span>
                  </div>

                  <div className="w-full h-1 bg-[#EFEAE1] rounded overflow-hidden">
                    <div className={`h-full ${barTone}`} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 pt-1 max-h-[160px]">
                    {dayList.map((c) => {
                      const slot = getSlotForIso(c.dataProgramare);
                      const editable = canEditFn(c);
                      const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, dateStr);

                      return (
                        <div
                          key={c.id}
                          className="bg-[#FAF8F5] border border-[#DAD4C6] rounded p-1.5 text-[11px] space-y-1 hover:border-[#3B5166] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-[#3B5166] text-white">
                              ⏰ {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                            </span>
                            <span
                              className="font-mono font-bold text-[11.5px] text-[#3B5166] cursor-pointer hover:underline"
                              onClick={() => onOpen(c)}
                            >
                              {c.numarDosar}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-[#23282E] truncate" title={c.client}>
                              {c.client || "Client nespecificat"}
                            </div>
                            <div className="text-[10px] font-mono text-[#6B6558] flex items-center justify-between">
                              <span className="font-bold text-[#23282E]">{c.numarInmatriculare}</span>
                              <span className="truncate max-w-[80px]">{c.marcaModel}</span>
                            </div>
                          </div>

                          {c.masinaSchimb && (
                            <div
                              className={`text-[9.5px] font-bold p-1 rounded flex items-center justify-between ${
                                conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"
                              }`}
                            >
                              <span>🚗 {c.masinaSchimb}</span>
                              {conflict && <span>⚠️ Conflict!</span>}
                            </div>
                          )}

                          {editable && (
                            <div className="pt-1 border-t border-[#EFEAE1] flex flex-wrap gap-0.5">
                              {SLOTURI_ORARE.map((s) => {
                                const active = slot === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      const newIso = makeIsoFromSlot(c.dataProgramare, s);
                                      onPatch(c.id, { dataProgramare: newIso });
                                    }}
                                    className={`px-1 py-0.2 text-[8.5px] font-semibold rounded border ${
                                      active
                                        ? "bg-[#3B5166] text-white border-[#3B5166]"
                                        : "bg-white text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                                    }`}
                                  >
                                    {s.split(" - ")[0]}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {c.status === "piese_sosite" && (
                            <button
                              disabled={!editable}
                              onClick={() =>
                                onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })
                              }
                              className="w-full mt-1 py-1 rounded bg-[#3B5166] text-white text-[10px] font-bold hover:bg-[#2C3E4C] flex items-center justify-center gap-1 shadow-sm"
                            >
                              Confirmă Programat <ArrowRight size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Drawer Sidebar: Queue "De Programat" (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2">
              <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                <PackageCheck size={15} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
                {unassignedQueue.length}
              </span>
            </div>

            {unassignedQueue.length === 0 ? (
              <div className="text-[12px] text-[#8A8375] italic text-center py-12">
                Niciun dosar în așteptare pentru programare. 🎉
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {unassignedQueue.map((c) => {
                  const editable = canEditFn(c);
                  return (
                    <div
                      key={c.id}
                      className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-md p-2 text-[11.5px] space-y-1 hover:border-[#3B5166] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
                          onClick={() => onOpen(c)}
                        >
                          {c.numarDosar || "—"}
                        </span>
                        <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>
                          {c.tipAsigurare}
                        </Pill>
                      </div>

                      <div className="font-bold text-[#23282E]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[#6B6558]">{c.numarInmatriculare}</div>

                      <div className="pt-1.5 mt-1 border-t border-[#DAD4C6]/60 space-y-1">
                        <div className="text-[10px] font-bold text-[#6B6558]">Programează pe:</div>
                        <div className="flex items-center gap-1">
                          <DatePickerInput
                            value={c.dataProgramare || ""}
                            withTime={true}
                            disabled={!editable}
                            placeholder="zi/luna/an, ore"
                            className="w-full text-[11px] border border-[#DAD4C6] rounded px-1.5 py-0.5 bg-white min-h-[26px]"
                            onChange={(val) => {
                              onPatch(c.id, {
                                dataProgramare: val,
                                status: "programat",
                                dataSchimbareStatus: nowISO(),
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaSaptamanala({ claims, capacitate, canEditFn, onOpen, onPatch }) {
  const [mondayDate, setMondayDate] = useState(() => getMondayOfISOWeek(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  const daysOfWeek = useMemo(() => getDaysOfWeek(mondayDate), [mondayDate]);
  const todayStr = todayISO();

  const prevWeek = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() - 7);
    setMondayDate(d);
  };
  const nextWeek = () => {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + 7);
    setMondayDate(d);
  };
  const currentWeek = () => setMondayDate(getMondayOfISOWeek(new Date()));

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter((c) =>
      (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.numarDosar && c.numarDosar.toLowerCase().includes(term)) ||
      (c.masinaSchimb && c.masinaSchimb.toLowerCase().includes(term))
    );
  }, [claims, searchTerm]);

  const unassignedQueue = useMemo(() => {
    return filteredClaims.filter(
      (c) => STADII_PROGRAMABILE.includes(c.status) && (!c.dataProgramare || c.status === "piese_sosite")
    );
  }, [filteredClaims]);

  const claimsByDay = useMemo(() => {
    const map = {};
    daysOfWeek.forEach((d) => (map[d] = []));
    filteredClaims.forEach((c) => {
      if (!c.dataProgramare) return;
      const d = c.dataProgramare.slice(0, 10);
      if (map[d]) {
        map[d].push(c);
      }
    });
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
    });
    return map;
  }, [filteredClaims, daysOfWeek]);

  const weekDayNames = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            <ChevronLeft size={16} /> Înapoi
          </button>
          <button onClick={currentWeek} className="px-3 py-1.5 rounded-md border border-[#DAD4C6] bg-[#3B5166] text-white hover:bg-[#2C3E4C] text-[12px] font-semibold shadow-sm">
            Săptămâna curentă
          </button>
          <button onClick={nextWeek} className="px-2.5 py-1.5 rounded-md border border-[#DAD4C6] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B5166] flex items-center gap-1 text-[12px] font-semibold">
            Înainte <ChevronRight size={16} />
          </button>
          <span className="text-[13px] font-bold text-[#23282E] ml-2">
            🗓️ Săptămâna: {formatWeekRange(mondayDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-[220px]">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#8A8375]" />
            <input
              type="text"
              placeholder="Caută dosar, client, nr auto..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#DAD4C6] rounded-md bg-[#FAF8F5] focus:bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {daysOfWeek.map((dateStr, idx) => {
            const dayList = claimsByDay[dateStr] || [];
            const count = dayList.length;
            const isToday = dateStr === todayStr;
            const pct = Math.min(100, Math.round((count / capacitate) * 100));

            let barTone = "bg-[#3E6B45]";
            if (count === capacitate) barTone = "bg-[#C98A2B]";
            if (count > capacitate) barTone = "bg-[#B23A2E]";

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-lg border flex flex-col p-2.5 space-y-2 min-h-[500px] shadow-sm ${
                  isToday ? "border-[#C98A2B] ring-2 ring-[#C98A2B]/30 bg-[#FFFDF9]" : "border-[#DAD4C6]"
                }`}
              >
                <div className="border-b border-[#EFEAE1] pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-[#23282E]">
                      {weekDayNames[idx]}
                    </span>
                    {isToday && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-[#C98A2B] text-white">
                        AZI
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6B6558] font-mono">{fmtDate(dateStr)}</div>
                  <div className="mt-1 flex items-center justify-between text-[10.5px]">
                    <span className="text-[#8A8375]">Capacitate:</span>
                    <span className="font-bold text-[#23282E]">{count} / {capacitate}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EFEAE1] rounded overflow-hidden mt-1">
                    <div className={`h-full ${barTone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {dayList.length === 0 ? (
                    <div className="text-[11px] text-[#8A8375] italic text-center py-6">
                      Fără programări
                    </div>
                  ) : (
                    dayList.map((c) => {
                      const slot = getSlotForIso(c.dataProgramare);
                      const editable = canEditFn(c);
                      const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, dateStr);

                      return (
                        <div
                          key={c.id}
                          className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-md p-2 text-[11.5px] space-y-1.5 hover:border-[#3B5166] transition-all shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3B5166] text-white">
                              ⏰ {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                            </span>
                            <span
                              className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
                              onClick={() => onOpen(c)}
                            >
                              {c.numarDosar}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-[#23282E] truncate" title={c.client}>
                              {c.client || "Client nespecificat"}
                            </div>
                            <div className="text-[10.5px] font-mono text-[#6B6558] flex items-center justify-between">
                              <span className="font-bold text-[#23282E]">{c.numarInmatriculare}</span>
                              <span className="truncate max-w-[90px]">{c.marcaModel}</span>
                            </div>
                          </div>

                          {c.masinaSchimb && (
                            <div
                              className={`text-[10px] font-bold p-1 rounded flex items-center justify-between ${
                                conflict ? "bg-[#F9E3E1] text-[#B23A2E]" : "bg-[#FBF3E6] text-[#7A5316]"
                              }`}
                            >
                              <span>🚗 {c.masinaSchimb}</span>
                              {conflict && <span>⚠️ Conflict!</span>}
                            </div>
                          )}

                          {editable && (
                            <div className="pt-1 border-t border-[#EFEAE1] flex flex-wrap gap-0.5">
                              {SLOTURI_ORARE.map((s) => {
                                const active = slot === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      const newIso = makeIsoFromSlot(c.dataProgramare, s);
                                      onPatch(c.id, { dataProgramare: newIso });
                                    }}
                                    className={`px-1 py-0.2 text-[9px] font-semibold rounded border ${
                                      active
                                        ? "bg-[#3B5166] text-white border-[#3B5166]"
                                        : "bg-white text-[#6B6558] border-[#DAD4C6] hover:bg-[#EFEAE1]"
                                    }`}
                                  >
                                    {s.split(" - ")[0]}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {c.status === "piese_sosite" && (
                            <button
                              disabled={!editable}
                              onClick={() =>
                                onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })
                              }
                              className="w-full mt-1 py-1 rounded bg-[#3B5166] text-white text-[10px] font-bold hover:bg-[#2C3E4C] flex items-center justify-center gap-1 shadow-sm"
                            >
                              Confirmă Programat <ArrowRight size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2">
              <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                <PackageCheck size={15} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
                {unassignedQueue.length}
              </span>
            </div>

            {unassignedQueue.length === 0 ? (
              <div className="text-[12px] text-[#8A8375] italic text-center py-12">
                Niciun dosar în așteptare pentru programare. 🎉
              </div>
            ) : (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {unassignedQueue.map((c) => {
                  const editable = canEditFn(c);
                  return (
                    <div
                      key={c.id}
                      className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-md p-2 text-[11.5px] space-y-1 hover:border-[#3B5166] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
                          onClick={() => onOpen(c)}
                        >
                          {c.numarDosar || "—"}
                        </span>
                        <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>
                          {c.tipAsigurare}
                        </Pill>
                      </div>

                      <div className="font-bold text-[#23282E]">{c.client || "—"}</div>
                      <div className="text-[10.5px] font-mono text-[#6B6558]">{c.numarInmatriculare}</div>

                      <div className="pt-1.5 mt-1 border-t border-[#DAD4C6]/60 space-y-1">
                        <div className="text-[10px] font-bold text-[#6B6558]">Programează pe:</div>
                        <div className="flex items-center gap-1">
                          <DatePickerInput
                            value={c.dataProgramare || ""}
                            withTime={true}
                            disabled={!editable}
                            placeholder="zi/luna/an, ore"
                            className="w-full text-[11px] border border-[#DAD4C6] rounded px-1.5 py-0.5 bg-white min-h-[26px]"
                            onChange={(val) => {
                              onPatch(c.id, {
                                dataProgramare: val,
                                status: "programat",
                                dataSchimbareStatus: nowISO(),
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate }) {
  const [viewMode, setViewMode] = useState("saptamanal");
  const [capInput, setCapInput] = useState(capacitate);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => setCapInput(capacitate), [capacitate]);

  return (
    <div className="space-y-3">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg border border-[#DAD4C6] p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-[#6B6558]">Capacitate zilnică (mașini/zi):</span>
          <input type="number" min={1} className="w-16 border border-[#DAD4C6] rounded px-2 py-1 text-[12.5px] text-center font-bold" value={capInput} onChange={(e) => setCapInput(Number(e.target.value) || 1)} />
          <button onClick={() => onSetCapacitate(capInput)} className="px-3 py-1 rounded bg-[#3B5166] text-white text-[11.5px] font-semibold hover:bg-[#2C3E4C] shadow-sm">Salvează</button>
          <span className="text-[10.5px] text-[#8A8375]">valabilă pentru toată echipa</span>
        </div>

        <div className="flex items-center gap-1 bg-[#F5F2EA] p-1 rounded-md border border-[#DAD4C6]">
          <button
            onClick={() => setViewMode("saptamanal")}
            className={`px-3 py-1 rounded text-[11.5px] font-bold transition-colors ${
              viewMode === "saptamanal" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            Agendă Săptămânală
          </button>
          <button
            onClick={() => setViewMode("lunar")}
            className={`px-3 py-1 rounded text-[11.5px] font-bold transition-colors ${
              viewMode === "lunar" ? "bg-[#3B5166] text-white shadow-sm" : "text-[#6B6558] hover:text-[#23282E]"
            }`}
          >
            Calendar Lunar
          </button>
        </div>
      </div>

      {viewMode === "saptamanal" ? (
        <AgendaSaptamanala claims={claims} capacitate={capacitate} canEditFn={canEditFn} onOpen={onOpen} onPatch={onPatch} />
      ) : (
        <CalendarLunar claims={claims} capacitate={capacitate} canEditFn={canEditFn} onOpen={onOpen} onPatch={onPatch} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />
      )}
    </div>
  );
}
