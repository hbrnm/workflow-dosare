import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, MessageCircle,
  Car, Clock, CheckCircle2, ShieldAlert, ChevronRight, UserCheck
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { todayISO, daysBetween, telLink, waLink, fmtDate } from "../../utils/dateUtils";
import Pill from "../common/Pill";
import StatCard from "../common/StatCard";

export default function BriefZilnic({ claims, onOpen, pragRidicare, onSetPrag }) {
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

  const rand = (c, badge, actionButton) => (
    <div
      key={c.id}
      onClick={() => onOpen(c)}
      className="flex items-center justify-between p-2.5 rounded-lg border border-[#DAD4C6] bg-white hover:bg-[#FCFAF5] hover:border-[#C98A2B] transition-all cursor-pointer text-[12px] group shadow-2xs"
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-mono font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate flex items-center gap-1.5">
          <span>{c.numarDosar || "(fără nr.)"}</span>
          <span className="font-sans font-semibold text-[#6B6558] text-[11.5px] truncate">— {c.client || "Client neintrodus"}</span>
        </div>
        <div className="text-[11px] text-[#8A8375] font-mono truncate mt-0.5 flex items-center gap-2">
          <span className="font-bold text-[#23282E]">{c.numarInmatriculare || "—"}</span>
          <span>· {c.marcaModel || c.asigurator}</span>
          <span>· {getStatusDefinition(c.status).label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {c.telefonClient && (
          <div className="flex items-center gap-1">
            <a
              href={telLink(c.telefonClient)}
              onClick={(e) => e.stopPropagation()}
              title="Sună client"
              className="p-1.5 rounded-md bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"
            >
              <Phone size={13} />
            </a>
            <a
              href={waLink(c.telefonClient, `Buna ziua! Va contactam de la service referitor la dosarul dvs. ${c.numarDosar || ""} (${c.numarInmatriculare || ""}).`)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Trimite mesaj WhatsApp"
              className="p-1.5 rounded-md bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors"
            >
              <MessageCircle size={13} />
            </a>
          </div>
        )}
        {badge}
        {actionButton}
      </div>
    </div>
  );

  const Sectiune = ({ icon, titlu, tone, items, gol, renderItem }) => (
    <div className="bg-white rounded-xl border border-[#DAD4C6] overflow-hidden flex-1 min-w-[280px] shadow-xs flex flex-col">
      <div className={`px-3.5 py-2.5 text-white text-[12.5px] font-bold flex items-center justify-between ${tone}`}>
        <span className="flex items-center gap-1.5">{icon}{titlu}</span>
        <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
          {items.length}
        </span>
      </div>
      <div className="p-2.5 space-y-1.5 max-h-80 overflow-y-auto flex-1 bg-[#FAF8F5]/50">
        {items.length === 0 ? (
          <div className="text-[12px] text-[#8A8375] p-6 text-center italic bg-white rounded-lg border border-dashed border-[#DAD4C6]">
            {gol}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[16px] font-bold text-[#23282E] capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Brieful dimineții · {formattedTodayDate}
          </div>
          <div className="text-[12px] text-[#6B6558] mt-0.5">
            Agenda operațională a zilei: intrări în service, mașini gata, clienți de notificat &amp; alerte auto la schimb.
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#DAD4C6]">
            <span className="text-[#6B6558] font-medium">Alertă neridicată după:</span>
            <input
              type="number"
              min={1}
              className="w-12 border border-[#DAD4C6] rounded px-1.5 py-0.5 text-center font-bold text-[#23282E] bg-white"
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
      </div>

      {/* Summary Indicators Row */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total acțiuni azi" value={totalActiuniAzi} tone="steel" sub="dosare de procesat" />
        <StatCard label="Programate azi" value={programariAzi.length} tone="amber" sub="intrări în service" />
        <StatCard label="Finalizate azi" value={gataAzi.length} tone="green" sub="gata de ridicare" />
        <StatCard label="De sunat (neridicate)" value={neridicateVechi.length} tone={neridicateVechi.length ? "danger" : "green"} sub={`peste ${pragRidicare} zile în curte`} />
        <StatCard label="Auto schimb depășite" value={masiniSchimbDepasite.length} tone={masiniSchimbDepasite.length ? "danger" : "green"} sub="peste limita Audatex" />
      </div>

      {/* Main Grid Sections */}
      <div className="grid md:grid-cols-2 gap-4">
        <Sectiune
          icon={<CalendarClock size={15} />}
          titlu="Programări & Intrări Service Azi"
          tone="bg-[#3B5166]"
          items={programariAzi}
          gol="Nicio intrare în service programată pentru astăzi."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-[#3B5166]/10 text-[#3B5166] border border-[#3B5166]/20">
                {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "Neprecizat"}
              </span>
            )
          }
        />

        <Sectiune
          icon={<PackageCheck size={15} />}
          titlu="Finalizate Azi (Gata de Predare)"
          tone="bg-[#3E6B45]"
          items={gataAzi}
          gol="Nicio mașină finalizată astăzi încă."
          renderItem={(c) =>
            rand(
              c,
              <Pill tone="amber">gata azi</Pill>
            )
          }
        />

        <Sectiune
          icon={<Phone size={15} />}
          titlu="Clienți de Sunat (Mașini Uitata în Curte)"
          tone="bg-[#C98A2B]"
          items={neridicateVechi}
          gol="Nicio mașină rămasă nepreluată peste termenul stabilit."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">
                {daysBetween(c.dataGataRidicare)} zile în curte
              </span>
            )
          }
        />

        <Sectiune
          icon={<Car size={15} />}
          titlu="Alerte Mașini la Schimb (Depășesc Audatex)"
          tone="bg-[#7A5316]"
          items={masiniSchimbDepasite}
          gol="Toate autovehiculele la schimb sunt în limita aprobată."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">
                🚗 {c.masinaSchimb} (+{c.zile - c.zileChirieAudatex}z)
              </span>
            )
          }
        />
      </div>

      {/* Restanțe & Blocate Rows */}
      <div className="grid md:grid-cols-2 gap-4">
        <Sectiune
          icon={<AlertTriangle size={15} />}
          titlu="Dosare Restante (Depășesc Termenul în Etapă)"
          tone="bg-[#B23A2E]"
          items={restante}
          gol="Niciun dosar restant — totul este în grafic."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#B23A2E] text-white">
                +{daysBetween(c.dataSchimbareStatus) - (c.termenAlertaZile || 3)}z peste termen
              </span>
            )
          }
        />

        {blocate.length > 0 && (
          <Sectiune
            icon={<AlertOctagon size={15} />}
            titlu="Dosare Blocate"
            tone="bg-[#23282E]"
            items={blocate}
            gol=""
            renderItem={(c) =>
              rand(
                c,
                <span className="text-[11px] font-medium text-[#B23A2E] bg-[#FFF2F0] border border-[#B23A2E]/30 px-2 py-0.5 rounded max-w-[180px] truncate">
                  ⚠️ {c.motivBlocare || "fără motiv notat"}
                </span>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
