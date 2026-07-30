import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, Car
} from "lucide-react";
import { todayISO, daysBetween } from "../../utils/dateUtils";
import { PhaseCard } from "./FluxOperational";

export default function BriefZilnic({ claims, onOpen, onMoveToStatus, onDuplicate, canEditFn, pragRidicare, onSetPrag }) {
  const [pragInput, setPragInput] = useState(pragRidicare);
  useEffect(() => setPragInput(pragRidicare), [pragRidicare]);
  const todayStr = todayISO();

  // Today Date formatted in Romanian
  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  const programariAzi = useMemo(() =>
    claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr)
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr),
    [claims, todayStr]);

  const neridicateVechi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && !c.ridicata && daysBetween(c.dataGataRidicare) >= pragRidicare)
      .sort((a, b) => daysBetween(b.dataGataRidicare) - daysBetween(a.dataGataRidicare)),
    [claims, pragRidicare]);

  const masiniSchimbDepasite = useMemo(() =>
    claims.filter((c) => c.masinaSchimb && c.masinaSchimb.trim() && c.status !== "facturat")
      .map((c) => {
        const zile = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
        const depasit = c.zileChirieAudatex > 0 && zile > c.zileChirieAudatex;
        return { ...c, zile, depasit };
      })
      .filter((c) => c.depasit)
      .sort((a, b) => b.zile - a.zile),
    [claims]);

  const restante = useMemo(() =>
    claims.filter((c) => c.status !== "facturat" && daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3))
      .sort((a, b) => daysBetween(b.dataSchimbareStatus) - daysBetween(a.dataSchimbareStatus)),
    [claims]);

  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const totalActiuniAzi = programariAzi.length + gataAzi.length + neridicateVechi.length + masiniSchimbDepasite.length + restante.length;

  const Sectiune = ({ icon, titlu, tone, items, gol }) => (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border border-[#DAD4C6] shadow-2xs shrink-0 bg-[#F5F2EA]">
      {/* Section Header Bar matching Flux Operational */}
      <div className={`px-3 py-2 text-white text-[12.5px] font-bold flex items-center justify-between ${tone}`}>
        <span className="flex items-center gap-1.5 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {icon}{titlu}
        </span>
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-[10.5px] font-bold shrink-0 ml-1">
          {items.length}
        </span>
      </div>

      {/* Grid of Cards (2 Cards per row, matching picture) */}
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto flex-1 min-h-0 items-start auto-rows-max">
        {items.length === 0 ? (
          <div className="col-span-full text-[11.5px] text-[#8A8375] py-8 text-center italic bg-white/60 rounded-lg border border-dashed border-[#DAD4C6]">
            {gol}
          </div>
        ) : (
          items.map((claim) => (
            <PhaseCard
              key={claim.id}
              claim={claim}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              onDuplicate={onDuplicate}
              canEdit={canEditFn ? canEditFn(claim) : true}
              pragRidicare={pragRidicare}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-bold text-[#23282E] capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Brieful dimineții · {formattedTodayDate}
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#3B5166]/10 text-[#3B5166]">
            {totalActiuniAzi} acțiuni azi
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11.5px] bg-[#FAF8F5] px-3 py-1 rounded-lg border border-[#DAD4C6]">
          <span className="text-[#6B6558] font-medium">Alertă neridicată după:</span>
          <input
            type="number"
            min={1}
            className="w-10 border border-[#DAD4C6] rounded px-1 py-0.5 text-center font-bold text-[#23282E] bg-white text-[11.5px]"
            value={pragInput}
            onChange={(e) => setPragInput(Number(e.target.value) || 1)}
          />
          <span className="text-[#6B6558]">zile</span>
          <button
            onClick={() => onSetPrag(pragInput)}
            className="px-2.5 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160] transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>

      {/* Summary Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
        <div className="bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Total acțiuni:</span>
          <span className="text-[13px] font-bold font-mono text-[#23282E]">{totalActiuniAzi}</span>
        </div>
        <div className="bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Programate azi:</span>
          <span className="text-[13px] font-bold font-mono text-[#3B5166]">{programariAzi.length}</span>
        </div>
        <div className="bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Finalizate azi:</span>
          <span className="text-[13px] font-bold font-mono text-[#3E6B45]">{gataAzi.length}</span>
        </div>
        <div className={`bg-white border rounded-lg px-3 py-2 flex items-center justify-between ${neridicateVechi.length ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}>
          <span className="text-[10.5px] text-[#6B6558] font-semibold">De sunat:</span>
          <span className={`text-[13px] font-bold font-mono ${neridicateVechi.length ? "text-[#B23A2E]" : "text-[#3E6B45]"}`}>{neridicateVechi.length}</span>
        </div>
        <div className={`bg-white border rounded-lg px-3 py-2 flex items-center justify-between ${masiniSchimbDepasite.length ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}>
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Auto schimb depășite:</span>
          <span className={`text-[13px] font-bold font-mono ${masiniSchimbDepasite.length ? "text-[#B23A2E]" : "text-[#3E6B45]"}`}>{masiniSchimbDepasite.length}</span>
        </div>
      </div>

      {/* Main Section Columns Grid (Identical layout to picture, with 2 cards per line inside each column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto">
        <Sectiune
          icon={<CalendarClock size={15} />}
          titlu="Programări & Intrări Service"
          tone="bg-[#3B5166]"
          items={programariAzi}
          gol="Nicio intrare în service programată azi."
        />

        <Sectiune
          icon={<PackageCheck size={15} />}
          titlu="Finalizate Azi (Gata Predare)"
          tone="bg-[#3E6B45]"
          items={gataAzi}
          gol="Nicio mașină finalizată azi."
        />

        <Sectiune
          icon={<Phone size={15} />}
          titlu="Clienți de Sunat (În Curte)"
          tone="bg-[#C98A2B]"
          items={neridicateVechi}
          gol="Nicio mașină nepreluată peste termen."
        />

        <Sectiune
          icon={<Car size={15} />}
          titlu="Auto Schimb (Depășesc Audatex)"
          tone="bg-[#7A5316]"
          items={masiniSchimbDepasite}
          gol="Toate mașinile la schimb sunt în termen."
        />

        <Sectiune
          icon={<AlertTriangle size={15} />}
          titlu="Dosare Restante în Etapă"
          tone="bg-[#B23A2E]"
          items={restante}
          gol="Niciun dosar restant."
        />

        {blocate.length > 0 && (
          <Sectiune
            icon={<AlertOctagon size={15} />}
            titlu="Dosare Blocate"
            tone="bg-[#23282E]"
            items={blocate}
            gol=""
          />
        )}
      </div>
    </div>
  );
}
