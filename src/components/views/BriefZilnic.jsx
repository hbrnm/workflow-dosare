import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, MessageCircle
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { todayISO, daysBetween, telLink, waLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";

export default function BriefZilnic({ claims, onOpen, pragRidicare, onSetPrag }) {
  const [pragInput, setPragInput] = useState(pragRidicare);
  useEffect(() => setPragInput(pragRidicare), [pragRidicare]);
  const todayStr = todayISO();

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

  const restante = useMemo(() =>
    claims.filter((c) => c.status !== "facturat" && daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3))
      .sort((a, b) => daysBetween(b.dataSchimbareStatus) - daysBetween(a.dataSchimbareStatus)),
    [claims]);

  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const rand = (c, badge) => (
    <div key={c.id} onClick={() => onOpen(c)} className="flex items-center justify-between p-2 rounded border border-[#DAD4C6] bg-white hover:bg-[#F7F4EC] cursor-pointer text-[12px]">
      <div className="flex-1 min-w-0">
        <div className="font-mono font-bold text-[#23282E] truncate">{c.numarDosar || "(fără nr.)"} <span className="font-sans font-normal text-[#6B6558]">— {c.client || "Client neintrodus"}</span></div>
        <div className="text-[11px] text-[#8A8375] font-mono truncate">{c.numarInmatriculare || "—"} {c.marcaModel} · {getStatusDefinition(c.status).label}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {c.telefonClient && (
          <span className="flex items-center gap-0.5">
            <a href={telLink(c.telefonClient)} onClick={(e) => e.stopPropagation()} title="Sună" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166]"><Phone size={12} /></a>
            <a href={waLink(c.telefonClient)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="WhatsApp" className="p-1 rounded hover:bg-[#EFEAE1] text-[#3E6B45]"><MessageCircle size={12} /></a>
          </span>
        )}
        {badge}
      </div>
    </div>
  );

  const Sectiune = ({ icon, titlu, tone, items, gol, renderItem }) => (
    <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden flex-1 min-w-[280px]">
      <div className={`px-3 py-2 text-white text-[12.5px] font-bold flex items-center justify-between ${tone}`}>
        <span className="flex items-center gap-1.5">{icon}{titlu}</span>
        <span className="min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">{items.length}</span>
      </div>
      <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
        {items.length === 0 ? <div className="text-[11.5px] text-[#8A8375] p-3 text-center italic">{gol}</div> : items.map(renderItem)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#DAD4C6] p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div>
          <div className="text-[14px] font-bold text-[#23282E]">Brieful dimineții · {todayStr}</div>
          <div className="text-[11.5px] text-[#8A8375]">Dosare care necesită atenție azi, mașini de livrat și clienți de notificat</div>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-[#6B6558] font-medium">Alertă neridicată după:</span>
          <input type="number" min={1} className="w-14 border border-[#DAD4C6] rounded px-1.5 py-0.5 text-center font-bold" value={pragInput} onChange={(e) => setPragInput(Number(e.target.value) || 1)} />
          <span className="text-[#6B6558]">zile</span>
          <button onClick={() => onSetPrag(pragInput)} className="px-2 py-0.5 bg-[#3B5166] text-white rounded text-[11px] font-semibold hover:bg-[#2C4160]">Salvează</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Sectiune
          icon={<CalendarClock size={14} />} titlu="Programate azi" tone="bg-[#3B5166]"
          items={programariAzi} gol="Nicio programare azi."
          renderItem={(c) => rand(c, <span className="text-[11px] font-mono text-[#6B6558]">{c.dataProgramare.slice(11, 16)}</span>)}
        />
        <Sectiune
          icon={<PackageCheck size={14} />} titlu="Finalizate azi (gata de ridicare)" tone="bg-[#3E6B45]"
          items={gataAzi} gol="Nicio mașină finalizată azi încă."
          renderItem={(c) => rand(c, <Pill tone="amber">gata azi</Pill>)}
        />
        <Sectiune
          icon={<PackageCheck size={14} />} titlu="Gata, neridicate — de sunat" tone="bg-[#C98A2B]"
          items={neridicateVechi} gol="Nicio mașină uitată în curte."
          renderItem={(c) => rand(c, <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">{daysBetween(c.dataGataRidicare)}z</span>)}
        />
        <Sectiune
          icon={<AlertTriangle size={14} />} titlu="Dosare restante — de urmărit" tone="bg-[#B23A2E]"
          items={restante} gol="Niciun dosar restant."
          renderItem={(c) => rand(c, <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">{daysBetween(c.dataSchimbareStatus)}z</span>)}
        />
      </div>

      {blocate.length > 0 && (
        <Sectiune
          icon={<AlertOctagon size={14} />} titlu="Dosare blocate" tone="bg-[#23282E]"
          items={blocate} gol=""
          renderItem={(c) => rand(c, <span className="text-[11px] text-[#8A8375] max-w-[160px] truncate">{c.motivBlocare || "fără motiv notat"}</span>)}
        />
      )}
    </div>
  );
}
