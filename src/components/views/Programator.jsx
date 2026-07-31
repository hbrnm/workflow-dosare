import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, Search, ChevronLeft, ChevronRight, Car, Clock
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
/* Capacity bar helper                                                       */
/* ───────────────────────────────────────────────────────────────────────── */
function CapBar({ total, capacitate }) {
  const pct = Math.min(100, Math.round((total / capacitate) * 100));
  const color = total > capacitate ? "bg-[#B23A2E]" : total === capacitate ? "bg-[#C98A2B]" : "bg-[#3E6B45]";
  return (
    <div className="w-full h-1 bg-[#EFEAE1] rounded overflow-hidden">
      <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* Agenda Săptămânală — overview pur, fără acțiuni                          */
/* ───────────────────────────────────────────────────────────────────────── */
function AgendaSaptamanala({ claims, capacitate, onOpen }) {
  const [mondayDate, setMondayDate] = useState(() => getMondayOfISOWeek(new Date()));
  const [searchTerm, setSearchTerm] = useState("");

  const daysOfWeek = useMemo(() => getDaysOfWeek(mondayDate), [mondayDate]);

  const prevWeek = () => { const d = new Date(mondayDate); d.setDate(d.getDate() - 7); setMondayDate(d); };
  const nextWeek = () => { const d = new Date(mondayDate); d.setDate(d.getDate() + 7); setMondayDate(d); };
  const currentWeek = () => setMondayDate(getMondayOfISOWeek(new Date()));

  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter((c) =>
      (c.numarInmatriculare && c.numarInmatriculare.toLowerCase().includes(term)) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.numarDosar && c.numarDosar.toLowerCase().includes(term))
    );
  }, [claims, searchTerm]);

  return (
    <div className="space-y-3">
      {/* Week nav */}
      <div className="bg-white border border-[#DAD4C6] rounded-lg px-3.5 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded hover:bg-[#EFEAE1] border border-[#DAD4C6] text-[#3B5166] transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={currentWeek} className="px-3 py-1 rounded bg-[#3B5166] text-white font-semibold text-[11.5px] hover:bg-[#2C4160] transition-colors">
            Săptămâna aceasta
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded hover:bg-[#EFEAE1] border border-[#DAD4C6] text-[#3B5166] transition-colors">
            <ChevronRight size={15} />
          </button>
          <span className="font-bold text-[#23282E] text-[12.5px]">
            {daysOfWeek[0]?.label} — {daysOfWeek[4]?.label}
          </span>
        </div>
        <div className="relative w-60">
          <Search size={13} className="absolute left-2.5 top-2.5 text-[#8A8375]" />
          <input
            type="text"
            className="w-full bg-[#FAF8F5] border border-[#DAD4C6] rounded-md pl-8 pr-3 py-1.5 text-[11.5px] focus:outline-none focus:border-[#3B5166]"
            placeholder="Caută dosar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 5-day grid — Mon to Fri */}
      <div className="grid grid-cols-5 gap-2">
        {daysOfWeek.slice(0, 5).map((day) => {
          const dateStr = day.dateIso;
          const dayList = filteredClaims
            .filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === dateStr)
            .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
          const total = dayList.length;

          return (
            <div
              key={dateStr}
              className={`bg-white border rounded-xl flex flex-col shadow-sm ${day.isToday ? "border-[#3B5166] ring-1 ring-[#3B5166]/30" : "border-[#DAD4C6]"}`}
            >
              {/* Day header */}
              <div className={`px-2.5 py-2 border-b border-[#EFEAE1] rounded-t-xl ${day.isToday ? "bg-[#3B5166]" : "bg-[#FAF8F5]"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11.5px] font-bold capitalize ${day.isToday ? "text-white" : "text-[#23282E]"}`}>
                    {day.labelShort}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    total > capacitate ? "bg-[#B23A2E] text-white" :
                    total === capacitate ? "bg-[#C98A2B] text-white" :
                    day.isToday ? "bg-white/20 text-white" : "bg-[#3B5166]/10 text-[#3B5166]"
                  }`}>
                    {total}/{capacitate}
                  </span>
                </div>
                <CapBar total={total} capacitate={capacitate} />
              </div>

              {/* Appointments */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 min-h-[220px] max-h-[500px]">
                {dayList.length === 0 ? (
                  <div className="text-[10.5px] text-[#C2BCB0] italic text-center pt-8">Liber</div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-1">
                    {dayList.map((c) => (
                      <AppointmentCard key={c.id} claim={c} onOpen={onOpen} allClaims={claims} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
/* Main export                                                               */
/* ───────────────────────────────────────────────────────────────────────── */
export default function Programator({ claims, onOpen, onPatch, canEditFn, capacitate, onSetCapacitate }) {
  const [view, setView] = useState("agenda"); // 'agenda' | 'masa'
  const [capInput, setCapInput] = useState(capacitate || 5);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
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
      <PendingBanner claims={claims} onOpen={onOpen} />

      {/* View */}
      {view === "agenda" ? (
        <AgendaSaptamanala claims={claims} capacitate={capacitate || 5} onOpen={onOpen} />
      ) : (
        <MasaZilnica claims={claims} capacitate={capacitate || 5} onOpen={onOpen} />
      )}
    </div>
  );
}
