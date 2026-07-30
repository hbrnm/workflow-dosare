import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone,
  Car, Clock, ChevronDown, Check
} from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { todayISO, daysBetween, telLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import WhatsAppButton from "../common/WhatsAppButton";

function BriefCard({ claim, onOpen, onMoveToStatus, badge, extraContext }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusDef = getStatusDefinition(claim.status);
  const days = daysBetween(claim.dataSchimbareStatus);

  return (
    <div
      onClick={() => onOpen(claim)}
      className={`group relative bg-white rounded-lg border p-2.5 transition-all duration-150 hover:shadow-md cursor-pointer text-[11.5px] ${
        claim.blocat ? "border-[#23282E] border-2" : "border-[#DAD4C6]"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: getPhaseColors(claim.status).bar }}
    >
      {/* Top Row: Nr Dosar + Tip Asigurare + Custom Badge */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[12.5px] font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate">
          {claim.numarDosar || "(fără nr.)"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
          {badge}
        </div>
      </div>

      {/* Interactive 1-Click Status Dropdown Badge */}
      <div className="mt-1.5 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
          className="w-full flex items-center justify-between px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] transition-colors text-[11px] font-semibold text-[#23282E]"
          title="Schimbă etapa dosarului"
        >
          <span className="flex items-center gap-1 truncate">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPhaseColors(claim.status).bar }} />
            <span className="font-mono text-[10px] text-[#6B6558] shrink-0">{String(statusDef.num).padStart(2, "0")}.</span>
            <span className="truncate">{statusDef.label}</span>
          </span>
          <ChevronDown size={12} className="text-[#8A8375] shrink-0" />
        </button>

        {showStatusPicker && (
          <>
            <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }} />
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-lg border border-[#DAD4C6] shadow-lg p-1 text-[11px] space-y-0.5" onClick={(e) => e.stopPropagation()}>
              <div className="px-2 py-0.5 text-[9.5px] font-bold text-[#8A8375] uppercase border-b border-[#EFEAE1]">Schimbă etapa:</div>
              {STATUSES.map((s) => (
                <button
                  key={s.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMoveToStatus) onMoveToStatus(claim, s.key);
                    setShowStatusPicker(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-left transition-colors ${
                    claim.status === s.key ? "bg-[#3B5166] text-white font-bold" : "hover:bg-[#F3EFE6] text-[#23282E]"
                  }`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <span className="font-mono text-[10px] opacity-75">{String(s.num).padStart(2, "0")}.</span>
                    <span className="truncate">{s.label}</span>
                  </span>
                  {claim.status === s.key && <Check size={11} className="shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Client Name + Phone & WhatsApp Quick Actions */}
      <div className="mt-1.5 flex items-center justify-between gap-1 text-[11.5px]">
        <span className="font-semibold text-[#23282E] truncate group-hover:underline">
          {claim.client || "Client neintrodus"}
        </span>
        {claim.telefonClient && (
          <div className="flex items-center gap-0.5 shrink-0">
            <a
              href={telLink(claim.telefonClient)}
              onClick={(e) => e.stopPropagation()}
              title="Sună client"
              className="p-1 rounded hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"
            >
              <Phone size={11} />
            </a>
            <WhatsAppButton phone={claim.telefonClient} claim={claim} size={11} />
          </div>
        )}
      </div>

      {/* Car & Insurer */}
      <div className="mt-1 flex items-center justify-between gap-1 text-[10.5px] text-[#6B6558]">
        <span className="flex items-center gap-1 font-mono font-bold text-[#23282E]">
          <Car size={11} className="text-[#8A8375]" />
          {claim.numarInmatriculare || "—"}
        </span>
        <span className="truncate max-w-[110px]" title={claim.marcaModel || claim.asigurator}>
          {claim.marcaModel || claim.asigurator}
        </span>
      </div>

      {/* Days in stage + Extra context footer */}
      <div className="mt-1.5 pt-1 border-t border-[#EFEAE1] flex items-center justify-between text-[10px]">
        <span className="text-[#8A8375] font-mono flex items-center gap-1">
          <Clock size={10} /> {days}z în etapă
        </span>
        {extraContext}
      </div>
    </div>
  );
}

export default function BriefZilnic({ claims, onOpen, onMoveToStatus, pragRidicare, onSetPrag }) {
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

  const Sectiune = ({ icon, titlu, tone, items, gol, renderItem }) => (
    <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden flex flex-col shadow-2xs">
      <div className={`px-3 py-2 text-white text-[12px] font-bold flex items-center justify-between ${tone}`}>
        <span className="flex items-center gap-1.5 truncate">{icon}{titlu}</span>
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-[10px] font-bold shrink-0 ml-1">
          {items.length}
        </span>
      </div>
      <div className="p-2 space-y-2 max-h-[480px] overflow-y-auto flex-1 bg-[#FAF8F5]/40">
        {items.length === 0 ? (
          <div className="text-[11.5px] text-[#8A8375] py-4 px-3 text-center italic bg-white rounded-lg border border-dashed border-[#DAD4C6]">
            {gol}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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

      {/* Main Grid Sections - Modern Card Design Matching Flux Operational */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Sectiune
          icon={<CalendarClock size={14} />}
          titlu="Programări & Intrări Service"
          tone="bg-[#3B5166]"
          items={programariAzi}
          gol="Nicio intrare în service programată azi."
          renderItem={(c) => (
            <BriefCard
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              badge={
                <span className="text-[10.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#3B5166]/10 text-[#3B5166]">
                  🕒 {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "Neprecizat"}
                </span>
              }
            />
          )}
        />

        <Sectiune
          icon={<PackageCheck size={14} />}
          titlu="Finalizate Azi (Gata Predare)"
          tone="bg-[#3E6B45]"
          items={gataAzi}
          gol="Nicio mașină finalizată azi."
          renderItem={(c) => (
            <BriefCard
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              badge={<Pill tone="green">gata azi</Pill>}
            />
          )}
        />

        <Sectiune
          icon={<Phone size={14} />}
          titlu="Clienți de Sunat (În Curte)"
          tone="bg-[#C98A2B]"
          items={neridicateVechi}
          gol="Nicio mașină nepreluată peste termen."
          renderItem={(c) => (
            <BriefCard
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              badge={
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                  {daysBetween(c.dataGataRidicare)}z în curte
                </span>
              }
            />
          )}
        />

        <Sectiune
          icon={<Car size={14} />}
          titlu="Auto Schimb (Depășesc Audatex)"
          tone="bg-[#7A5316]"
          items={masiniSchimbDepasite}
          gol="Toate mașinile la schimb sunt în termen."
          renderItem={(c) => (
            <BriefCard
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              badge={
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                  🚗 {c.masinaSchimb} (+{c.zile - c.zileChirieAudatex}z)
                </span>
              }
            />
          )}
        />

        <Sectiune
          icon={<AlertTriangle size={14} />}
          titlu="Dosare Restante în Etapă"
          tone="bg-[#B23A2E]"
          items={restante}
          gol="Niciun dosar restant."
          renderItem={(c) => (
            <BriefCard
              key={c.id}
              claim={c}
              onOpen={onOpen}
              onMoveToStatus={onMoveToStatus}
              badge={
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                  +{daysBetween(c.dataSchimbareStatus) - (c.termenAlertaZile || 3)}z depășit
                </span>
              }
            />
          )}
        />

        {blocate.length > 0 && (
          <Sectiune
            icon={<AlertOctagon size={14} />}
            titlu="Dosare Blocate"
            tone="bg-[#23282E]"
            items={blocate}
            gol=""
            renderItem={(c) => (
              <BriefCard
                key={c.id}
                claim={c}
                onOpen={onOpen}
                onMoveToStatus={onMoveToStatus}
                badge={<Pill tone="danger">⚠️ blocat</Pill>}
                extraContext={
                  <div className="text-[10.5px] font-semibold text-[#B23A2E] truncate">
                    Motiv: {c.motivBlocare || "fără motiv specificat"}
                  </div>
                }
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
