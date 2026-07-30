import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, MessageCircle,
  Car, Clock, CheckCircle2
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { todayISO, daysBetween, telLink, waLink } from "../../utils/dateUtils";
import Pill from "../common/Pill";

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

  const rand = (c, badge) => (
    <div
      key={c.id}
      onClick={() => onOpen(c)}
      className="flex items-center justify-between p-2 rounded border border-[#DAD4C6] bg-white hover:bg-[#FCFAF5] hover:border-[#C98A2B] transition-all cursor-pointer text-[11.5px] group"
    >
      <div className="flex-1 min-w-0 pr-1.5">
        <div className="font-mono font-bold text-[#23282E] group-hover:text-[#C98A2B] truncate flex items-center gap-1">
          <span>{c.numarDosar || "(fără nr.)"}</span>
          <span className="font-sans font-semibold text-[#6B6558] text-[11px] truncate">— {c.client || "Client neintrodus"}</span>
        </div>
        <div className="text-[10.5px] text-[#8A8375] font-mono truncate mt-0.5 flex items-center gap-1.5">
          <span className="font-bold text-[#23282E]">{c.numarInmatriculare || "—"}</span>
          <span>· {c.marcaModel || c.asigurator}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {c.telefonClient && (
          <div className="flex items-center gap-0.5">
            <a
              href={telLink(c.telefonClient)}
              onClick={(e) => e.stopPropagation()}
              title="Sună client"
              className="p-1 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-[#EFEAE1] text-[#3B5166] transition-colors"
            >
              <Phone size={11} />
            </a>
            <a
              href={waLink(c.telefonClient, `Buna ziua! Va contactam de la service referitor la dosarul dvs. ${c.numarDosar || ""} (${c.numarInmatriculare || ""}).`)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Trimite mesaj WhatsApp"
              className="p-1 rounded bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors"
            >
              <MessageCircle size={11} />
            </a>
          </div>
        )}
        {badge}
      </div>
    </div>
  );

  const Sectiune = ({ icon, titlu, tone, items, gol, renderItem }) => (
    <div className="bg-white rounded-lg border border-[#DAD4C6] overflow-hidden flex flex-col shadow-2xs">
      <div className={`px-2.5 py-1.5 text-white text-[11.5px] font-bold flex items-center justify-between ${tone}`}>
        <span className="flex items-center gap-1.5 truncate">{icon}{titlu}</span>
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-[10px] font-bold shrink-0 ml-1">
          {items.length}
        </span>
      </div>
      <div className="p-1.5 space-y-1 max-h-48 overflow-y-auto flex-1 bg-[#FAF8F5]/40">
        {items.length === 0 ? (
          <div className="text-[11px] text-[#8A8375] py-2 px-3 text-center italic bg-white rounded border border-dashed border-[#DAD4C6]">
            {gol}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-lg border border-[#DAD4C6] px-3 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-bold text-[#23282E] capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Brieful dimineții · {formattedTodayDate}
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3B5166]/10 text-[#3B5166]">
            {totalActiuniAzi} acțiuni azi
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11.5px] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#DAD4C6]">
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
            className="px-2 py-0.5 bg-[#3B5166] text-white rounded text-[10.5px] font-semibold hover:bg-[#2C4160] transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>

      {/* Summary Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-white border border-[#DAD4C6] rounded-md px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Total acțiuni:</span>
          <span className="text-[13px] font-bold font-mono text-[#23282E]">{totalActiuniAzi}</span>
        </div>
        <div className="bg-white border border-[#DAD4C6] rounded-md px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Programate azi:</span>
          <span className="text-[13px] font-bold font-mono text-[#3B5166]">{programariAzi.length}</span>
        </div>
        <div className="bg-white border border-[#DAD4C6] rounded-md px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Finalizate azi:</span>
          <span className="text-[13px] font-bold font-mono text-[#3E6B45]">{gataAzi.length}</span>
        </div>
        <div className={`bg-white border rounded-md px-2.5 py-1.5 flex items-center justify-between ${neridicateVechi.length ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}>
          <span className="text-[10.5px] text-[#6B6558] font-semibold">De sunat:</span>
          <span className={`text-[13px] font-bold font-mono ${neridicateVechi.length ? "text-[#B23A2E]" : "text-[#3E6B45]"}`}>{neridicateVechi.length}</span>
        </div>
        <div className={`bg-white border rounded-md px-2.5 py-1.5 flex items-center justify-between ${masiniSchimbDepasite.length ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}>
          <span className="text-[10.5px] text-[#6B6558] font-semibold">Auto schimb depășite:</span>
          <span className={`text-[13px] font-bold font-mono ${masiniSchimbDepasite.length ? "text-[#B23A2E]" : "text-[#3E6B45]"}`}>{masiniSchimbDepasite.length}</span>
        </div>
      </div>

      {/* Main Grid Sections - 3 Columns Layout on Wide Screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <Sectiune
          icon={<CalendarClock size={13} />}
          titlu="Programări & Intrări Service"
          tone="bg-[#3B5166]"
          items={programariAzi}
          gol="Nicio intrare în service programată azi."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[10.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#3B5166]/10 text-[#3B5166]">
                {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "Neprecizat"}
              </span>
            )
          }
        />

        <Sectiune
          icon={<PackageCheck size={13} />}
          titlu="Finalizate Azi (Gata Predare)"
          tone="bg-[#3E6B45]"
          items={gataAzi}
          gol="Nicio mașină finalizată azi."
          renderItem={(c) =>
            rand(
              c,
              <Pill tone="amber">gata azi</Pill>
            )
          }
        />

        <Sectiune
          icon={<Phone size={13} />}
          titlu="Clienți de Sunat (În Curte)"
          tone="bg-[#C98A2B]"
          items={neridicateVechi}
          gol="Nicio mașină nepreluată peste termen."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                {daysBetween(c.dataGataRidicare)}z în curte
              </span>
            )
          }
        />

        <Sectiune
          icon={<Car size={13} />}
          titlu="Auto Schimb (Depășesc Audatex)"
          tone="bg-[#7A5316]"
          items={masiniSchimbDepasite}
          gol="Toate mașinile la schimb sunt în termen."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                🚗 {c.masinaSchimb} (+{c.zile - c.zileChirieAudatex}z)
              </span>
            )
          }
        />

        <Sectiune
          icon={<AlertTriangle size={13} />}
          titlu="Dosare Restante în Etapă"
          tone="bg-[#B23A2E]"
          items={restante}
          gol="Niciun dosar restant."
          renderItem={(c) =>
            rand(
              c,
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B23A2E] text-white">
                +{daysBetween(c.dataSchimbareStatus) - (c.termenAlertaZile || 3)}z depășit
              </span>
            )
          }
        />

        {blocate.length > 0 && (
          <Sectiune
            icon={<AlertOctagon size={13} />}
            titlu="Dosare Blocate"
            tone="bg-[#23282E]"
            items={blocate}
            gol=""
            renderItem={(c) =>
              rand(
                c,
                <span className="text-[10px] font-medium text-[#B23A2E] bg-[#FFF2F0] px-1.5 py-0.5 rounded truncate max-w-[130px]">
                  ⚠️ {c.motivBlocare || "fără motiv"}
                </span>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
