import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, Search, ChevronLeft, ChevronRight, ArrowRight, Car, Plus
} from "lucide-react";
import { STATUSES } from "../../constants/config";
import {
  todayISO, daysBetween, nowISO, getMondayOfISOWeek, getDaysOfWeek
} from "../../utils/dateUtils";
import Pill from "../common/Pill";
import DatePickerInput from "../common/DatePickerInput";

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

const STADII_PROGRAMABILE = ["reconstatare", "piese_sosite", "programat"];

export function getSlotForIso(isoStr) {
  if (!isoStr) return "08:00 - 08:30";
  const [hPart, mPart] = (isoStr.slice(11, 16) || "08:00").split(":");
  const h = Number(hPart) || 8;
  const m = Number(mPart) || 0;
  // find slot where startH:startM <= h:m < endH:endM
  for (const slot of SLOTURI_ORARE) {
    const [startStr] = slot.split(" - ");
    const [sh, sm] = startStr.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = startMinutes + 30;
    const currentMinutes = h * 60 + m;
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return slot;
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

function QueueCard({ claim, editable, onOpen, onPatch }) {
  const [draftDate, setDraftDate] = useState(claim.dataProgramare || "");
  const hasDate = !!(draftDate && draftDate.trim());

  return (
    <div
      draggable={editable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", claim.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-2.5 text-[11.5px] space-y-1.5 hover:border-[#3B5166] transition-all shadow-2xs group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between">
        <span
          className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline"
          onClick={() => onOpen(claim)}
        >
          {claim.numarDosar || "—"}
        </span>
        <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>
          {claim.tipAsigurare}
        </Pill>
      </div>

      <div className="font-bold text-[#23282E] truncate">{claim.client || "—"}</div>
      <div className="text-[10.5px] font-mono text-[#6B6558]">{claim.numarInmatriculare || "—"}</div>

      {/* Dedicated Scheduling Controls & Action Button */}
      <div className="pt-2 mt-1 border-t border-[#DAD4C6]/60 space-y-1.5">
        <div className="text-[10px] font-bold text-[#6B6558] flex items-center justify-between">
          <span>Alege Data &amp; Ora:</span>
          {hasDate ? (
            <span className="text-[#3E6B45] font-semibold">✓ Dată selectată</span>
          ) : (
            <span className="text-[#B23A2E] font-medium">Neselectată</span>
          )}
        </div>

        <DatePickerInput
          value={draftDate}
          withTime={true}
          disabled={!editable}
          placeholder="zi/luna/an, ore"
          className="w-full text-[11px] border border-[#DAD4C6] rounded px-2 py-1 bg-white min-h-[28px]"
          onChange={(val) => {
            setDraftDate(val);
          }}
        />

        <button
          type="button"
          disabled={!editable || !hasDate}
          onClick={() => {
            if (hasDate && onPatch) {
              onPatch(claim.id, {
                dataProgramare: draftDate,
                status: "programat",
                dataSchimbareStatus: nowISO(),
              });
            }
          }}
          className={`w-full mt-1.5 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
            hasDate
              ? "bg-[#3B5166] text-white hover:bg-[#2C4160] shadow-2xs cursor-pointer"
              : "bg-[#EFEAE1] text-[#8A8375] border border-[#DAD4C6] cursor-not-allowed opacity-75"
          }`}
        >
          <CalendarClock size={13} />
          {hasDate ? "Confirmă Programare Service" : "Selectează mai întâi data & ora"}
        </button>
      </div>
    </div>
  );
}

export default function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetPrag, onSetCapacitate }) {
  const [tabProgramator, setTabProgramator] = useState("masa"); // 'masa' | 'agenda'
  const [capInput, setCapInput] = useState(capacitate || 5);

  return (
    <div className="space-y-3">
      {/* Top Header Controls Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-bold text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Programator Service
          </div>

          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-md border border-[#DAD4C6]">
            <button
              onClick={() => setTabProgramator("masa")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                tabProgramator === "masa" ? "bg-[#3B5166] text-white shadow-2xs" : "text-[#6B6558] hover:text-[#23282E]"
              }`}
            >
              Masă Zilnică (Sloturi)
            </button>
            <button
              onClick={() => setTabProgramator("agenda")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                tabProgramator === "agenda" ? "bg-[#3B5166] text-white shadow-2xs" : "text-[#6B6558] hover:text-[#23282E]"
              }`}
            >
              Agendă Săptămânală
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11.5px] bg-[#FAF8F5] px-3 py-1 rounded-lg border border-[#DAD4C6]">
          <span className="text-[#6B6558] font-medium">Capacitate zilnică:</span>
          <input
            type="number"
            min={1}
            max={30}
            className="w-12 border border-[#DAD4C6] rounded px-1.5 py-0.5 text-center font-bold text-[#23282E] bg-white text-[11.5px]"
            value={capInput}
            onChange={(e) => setCapInput(Number(e.target.value) || 1)}
          />
          <span className="text-[#6B6558]">intrări/zi</span>
          <button
            onClick={() => onSetCapacitate && onSetCapacitate(capInput)}
            className="px-2.5 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160] transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>

      {tabProgramator === "masa" ? (
        <MasaZilnica
          claims={claims}
          capacitate={capacitate || 5}
          canEditFn={canEditFn}
          onOpen={onOpen}
          onPatch={onPatch}
        />
      ) : (
        <AgendaSaptamanala
          claims={claims}
          capacitate={capacitate || 5}
          canEditFn={canEditFn}
          onOpen={onOpen}
          onPatch={onPatch}
        />
      )}
    </div>
  );
}

function MasaZilnica({ claims, capacitate, canEditFn, onOpen, onPatch }) {
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const daysHeader = useMemo(() => {
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

  const unassignedQueue = useMemo(() => {
    return claims.filter(
      (c) => STADII_PROGRAMABILE.includes(c.status) && (!c.dataProgramare || c.status === "piese_sosite")
    );
  }, [claims]);

  return (
    <div className="space-y-3">
      {/* Date Navigation Bar */}
      <div className="bg-white border border-[#DAD4C6] rounded-lg p-2 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11.5px] font-bold text-[#6B6558] mr-1">Selectează ziua:</span>
          {daysHeader.map((dh) => {
            const active = dh.iso === selectedDate;
            const count = claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dh.iso).length;

            return (
              <button
                key={dh.iso}
                onClick={() => setSelectedDate(dh.iso)}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all ${
                  active ? "bg-[#3B5166] text-white shadow-xs" : "bg-[#FAF8F5] text-[#23282E] border border-[#DAD4C6] hover:bg-[#EFEAE1]"
                }`}
              >
                <span>{dh.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? "bg-white/20 text-white" : "bg-[#3B5166]/10 text-[#3B5166]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-48">
          <DatePickerInput
            value={selectedDate}
            onChange={(v) => v && setSelectedDate(v.slice(0, 10))}
            withTime={false}
            placeholder="Alege altă dată"
          />
        </div>
      </div>

      {/* Main Grid: Slots Layout (Left 9 cols) + Unassigned Queue (Right 3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {daysHeader.slice(0, 5).map((dh) => {
            const dateStr = dh.iso;
            const dayList = claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dateStr);
            const total = dayList.length;
            const pct = Math.min(100, Math.round((total / capacitate) * 100));
            const barTone = total > capacitate ? "bg-[#B23A2E]" : total === capacitate ? "bg-[#C98A2B]" : "bg-[#3E6B45]";

            return (
              <div
                key={dateStr}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const claimId = e.dataTransfer.getData("text/plain");
                  const claim = claims.find((c) => c.id === claimId);
                  if (claim && onPatch) {
                    onPatch(claim.id, {
                      dataProgramare: `${dateStr}T09:00:00`,
                      status: "programat",
                      dataSchimbareStatus: nowISO(),
                    });
                  }
                }}
                className="bg-white border border-[#DAD4C6] rounded-lg p-2.5 flex flex-col h-[520px] shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1.5 mb-1.5">
                  <div className="text-[12px] font-bold text-[#23282E] capitalize">{dh.label}</div>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white ${barTone}`}>
                    {total}/{capacitate}
                  </span>
                </div>

                <div className="w-full h-1 bg-[#EFEAE1] rounded overflow-hidden mb-2">
                  <div className={`h-full ${barTone}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {dayList.map((c) => {
                    const slot = getSlotForIso(c.dataProgramare);
                    const editable = canEditFn ? canEditFn(c) : true;
                    const conflict = checkMasinaSchimbConflict(claims, c.id, c.masinaSchimb, dateStr);

                    return (
                      <div
                        key={c.id}
                        className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-2 text-[11px] space-y-1 hover:border-[#3B5166] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3B5166] text-white">
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
                                    if (onPatch) onPatch(c.id, { dataProgramare: newIso });
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
                              onPatch && onPatch(c.id, { status: "programat", dataSchimbareStatus: nowISO() })
                            }
                            className="w-full mt-1 py-1 rounded bg-[#3B5166] text-white text-[10px] font-bold hover:bg-[#2C3E4C] flex items-center justify-center gap-1 shadow-xs"
                          >
                            Confirmă Programat <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {dayList.length === 0 && (
                    <div className="text-[11px] text-[#8A8375] italic text-center py-10 bg-white/50 border border-dashed border-[#DAD4C6] rounded-lg">
                      Trage un dosar aici pentru programare sau folosește panoul din dreapta.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Drawer Sidebar: Queue "De Programat (Piese Sosite)" (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-3 flex flex-col h-[520px] shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2 shrink-0">
            <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <PackageCheck size={16} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
              {unassignedQueue.length}
            </span>
          </div>

          {unassignedQueue.length === 0 ? (
            <div className="text-[12px] text-[#8A8375] italic text-center py-16 bg-[#FAF8F5] border border-dashed border-[#DAD4C6] rounded-lg flex-1 flex items-center justify-center">
              Niciun dosar în așteptare pentru programare. 🎉
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {unassignedQueue.map((c) => (
                <QueueCard
                  key={c.id}
                  claim={c}
                  editable={canEditFn ? canEditFn(c) : true}
                  onOpen={onOpen}
                  onPatch={onPatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgendaSaptamanala({ claims, capacitate, canEditFn, onOpen, onPatch }) {
  const [mondayDate, setMondayDate] = useState(() => getMondayOfISOWeek(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  const daysOfWeek = useMemo(() => getDaysOfWeek(mondayDate), [mondayDate]);

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

  return (
    <div className="space-y-3">
      {/* Week Header Controls */}
      <div className="bg-[#FAF8F5] rounded-lg border border-[#DAD4C6] px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-[#EFEAE1] border border-[#DAD4C6] text-[#3B5166]"><ChevronLeft size={16} /></button>
          <button onClick={currentWeek} className="px-2.5 py-1 rounded bg-[#3B5166] text-white font-semibold text-[11.5px] hover:bg-[#2C4160]">Săptămâna aceasta</button>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-[#EFEAE1] border border-[#DAD4C6] text-[#3B5166]"><ChevronRight size={16} /></button>
          <span className="font-bold text-[#23282E] text-[12.5px] ml-1">
            {daysOfWeek[0]?.label} — {daysOfWeek[6]?.label}
          </span>
        </div>

        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2 text-[#8A8375]" />
          <input
            type="text"
            className="w-full bg-white border border-[#DAD4C6] rounded-md pl-8 pr-2 py-1 text-[11.5px] focus:outline-hidden"
            placeholder="Caută dosar în agendă..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Days of Week (9 cols) */}
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          {daysOfWeek.map((day) => {
            const dateStr = day.dateIso;
            const dayList = filteredClaims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dateStr);
            const total = dayList.length;
            const pct = Math.min(100, Math.round((total / capacitate) * 100));
            const barTone = total > capacitate ? "bg-[#B23A2E]" : total === capacitate ? "bg-[#C98A2B]" : "bg-[#3E6B45]";

            return (
              <div
                key={dateStr}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const claimId = e.dataTransfer.getData("text/plain");
                  const claim = claims.find((c) => c.id === claimId);
                  if (claim && onPatch) {
                    onPatch(claim.id, {
                      dataProgramare: `${dateStr}T09:00:00`,
                      status: "programat",
                      dataSchimbareStatus: nowISO(),
                    });
                  }
                }}
                className={`bg-white border rounded-lg p-2 flex flex-col h-[520px] shadow-2xs ${day.isToday ? "border-[#3B5166] ring-1 ring-[#3B5166]" : "border-[#DAD4C6]"}`}
              >
                <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1 mb-1">
                  <div className="text-[11.5px] font-bold text-[#23282E] capitalize">{day.labelShort}</div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ${barTone}`}>
                    {total}/{capacitate}
                  </span>
                </div>

                <div className="w-full h-1 bg-[#EFEAE1] rounded overflow-hidden mb-1.5">
                  <div className={`h-full ${barTone}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {dayList.map((c) => {
                    const slot = getSlotForIso(c.dataProgramare);
                    const editable = canEditFn ? canEditFn(c) : true;
                    return (
                      <div key={c.id} className="bg-[#FAF8F5] border border-[#DAD4C6] rounded p-1.5 text-[10.5px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9.5px] font-bold text-[#3B5166]">
                            ⏰ {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                          </span>
                          <span className="font-mono font-bold text-[#3B5166] cursor-pointer hover:underline" onClick={() => onOpen(c)}>
                            {c.numarDosar}
                          </span>
                        </div>
                        <div className="font-bold text-[#23282E] truncate">{c.client || "—"}</div>
                        <div className="font-mono text-[#6B6558]">{c.numarInmatriculare}</div>
                      </div>
                    );
                  })}
                  {dayList.length === 0 && (
                    <div className="text-[10.5px] text-[#8A8375] italic text-center py-8">
                      Liber
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Drawer Sidebar: Queue "De Programat (Piese Sosite)" (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#DAD4C6] rounded-lg p-3 flex flex-col h-[520px] shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2 shrink-0">
            <div className="text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <PackageCheck size={16} className="text-[#C98A2B]" /> De Programat (Piese Sosite)
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 bg-[#FBF3E6] text-[#7A5316] rounded-full">
              {unassignedQueue.length}
            </span>
          </div>

          {unassignedQueue.length === 0 ? (
            <div className="text-[12px] text-[#8A8375] italic text-center py-16 bg-[#FAF8F5] border border-dashed border-[#DAD4C6] rounded-lg flex-1 flex items-center justify-center">
              Niciun dosar în așteptare pentru programare. 🎉
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {unassignedQueue.map((c) => (
                <QueueCard
                  key={c.id}
                  claim={c}
                  editable={canEditFn ? canEditFn(c) : true}
                  onOpen={onOpen}
                  onPatch={onPatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
