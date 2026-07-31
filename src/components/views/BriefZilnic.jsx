import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, Car,
  Clock, CheckCircle2, ShieldAlert, BarChart3, ChevronRight, User, HelpCircle
} from "lucide-react";
import { todayISO, daysBetween, telLink } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";

export default function BriefZilnic({ claims, onOpen, onMoveToStatus, onDuplicate, canEditFn, pragRidicare, onSetPrag }) {
  const [pragInput, setPragInput] = useState(pragRidicare);
  useEffect(() => setPragInput(pragRidicare), [pragRidicare]);
  const todayStr = todayISO();

  // Today Date formatted in Romanian
  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  // Today's scheduled entries
  const programariAzi = useMemo(() =>
    claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr)
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  // Finished today (Ready to deliver)
  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr),
    [claims, todayStr]);

  // Clients to call (vehicles finished but not picked up past the threshold)
  const neridicateVechi = useMemo(() =>
    claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare))
      .sort((a, b) => daysBetween(b.dataGataRidicare) - daysBetween(a.dataGataRidicare)),
    [claims, pragRidicare]);

  // Active courtesy cars exceeding Audatex approved rental limits
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

  // Files overdue in their current stage/status
  const restante = useMemo(() =>
    claims.filter(isStageOverdue)
      .sort((a, b) => daysBetween(b.dataSchimbareStatus) - daysBetween(a.dataSchimbareStatus)),
    [claims]);

  // Blocked claims
  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  // Arrived parts awaiting scheduling
  const pieseSositeNeprogramate = useMemo(() =>
    claims.filter((c) => c.status === "piese_sosite" && !c.dataProgramare),
    [claims]);

  // Active (un-invoiced) claims count
  const activeClaimsCount = useMemo(() =>
    claims.filter((c) => c.status !== "facturat").length,
    [claims]);

  // Current workshop load by pipeline phase
  const phaseStats = useMemo(() => {
    const stats = { start: 0, eval: 0, lucru: 0, final: 0 };
    claims.forEach(c => {
      if (c.status === "facturat") {
        stats.final++;
      } else if (["primit", "cerere_reparatie"].includes(c.status)) {
        stats.start++;
      } else if (["reconstatare", "accept_plata"].includes(c.status)) {
        stats.eval++;
      } else if (["piese_comandate", "piese_sosite", "programat", "in_lucru"].includes(c.status)) {
        stats.lucru++;
      }
    });
    return stats;
  }, [claims]);

  // Insurer distribution stats for active files
  const insurerStats = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      if (c.asigurator && c.status !== "facturat") {
        map[c.asigurator] = (map[c.asigurator] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [claims]);

  // General counters
  const totalActiuniUrgente = restante.length + blocate.length + masiniSchimbDepasite.length + neridicateVechi.length;

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0 text-[#23282E] pb-2">
      
      {/* 1. Header Banner & Config Control */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3B5166]/10 flex items-center justify-center text-[#3B5166]">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-[16px] font-bold tracking-tight capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Brief de Control Atelier · {formattedTodayDate}
            </h1>
            <p className="text-[11.5px] text-[#8A8375] font-medium">
              Sunt identificate <span className="font-bold text-[#B23A2E]">{totalActiuniUrgente} alerte</span> ce necesită atenție urgentă astăzi.
            </p>
          </div>
        </div>

        {/* Overdue Limit Trigger Input */}
        <div className="flex items-center gap-2 text-[11.5px] bg-[#FAF8F5] px-3 py-1.5 rounded-lg border border-[#DAD4C6]">
          <span className="text-[#6B6558] font-medium">Notificare client neridicare:</span>
          <input
            type="number"
            min={1} max={30}
            className="w-11 border border-[#DAD4C6] rounded px-1.5 py-0.5 text-center font-bold text-[#23282E] bg-white text-[11.5px]"
            value={pragInput}
            onChange={(e) => setPragInput(Number(e.target.value) || 1)}
          />
          <span className="text-[#6B6558]">zile</span>
          <button
            onClick={() => onSetPrag(pragInput)}
            className="px-2.5 py-0.5 bg-[#3B5166] text-white rounded text-[11.5px] font-semibold hover:bg-[#2C4160] transition-colors"
          >
            Salvează
          </button>
        </div>
      </div>

      {/* 2. Top row KPI summaries */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        
        {/* KPI 1 */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <span className="text-[11px] text-[#6B6558] font-semibold uppercase tracking-wider">Dosare Active</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono">{activeClaimsCount}</span>
            <span className="text-[10px] text-[#8A8375] font-medium">în atelier</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <span className="text-[11px] text-[#3B5166] font-semibold uppercase tracking-wider">Intrări Azi</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-[#3B5166]">{programariAzi.length}</span>
            <span className="text-[10px] text-[#3B5166]/80 font-medium">programate</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <span className="text-[11px] text-[#3E6B45] font-semibold uppercase tracking-wider">Finalizate Azi</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-[#3E6B45]">{gataAzi.length}</span>
            <span className="text-[10px] text-[#3E6B45]/80 font-medium">gata predare</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <span className="text-[11px] text-[#C98A2B] font-semibold uppercase tracking-wider">Piese Neprogramate</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-[#C98A2B]">{pieseSositeNeprogramate.length}</span>
            <span className="text-[10px] text-[#C98A2B]/80 font-medium">de programat</span>
          </div>
        </div>

        {/* KPI 5 */}
        <div className={`bg-white border rounded-xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow ${blocate.length > 0 ? "border-[#B23A2E]" : "border-[#DAD4C6]"}`}>
          <span className="text-[11px] text-[#B23A2E] font-semibold uppercase tracking-wider">Dosare Blocate</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-2xl font-bold font-mono ${blocate.length > 0 ? "text-[#B23A2E]" : "text-[#8A8375]"}`}>{blocate.length}</span>
            <span className="text-[10px] text-[#B23A2E]/80 font-medium">necesită deblocare</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Body columns layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto">
        
        {/* Column 1 & 2: Activitate Service & Clienți Azi (50%) */}
        <div className="xl:col-span-2 space-y-3.5 flex flex-col h-full">
          
          {/* Card: Intrări Service Azi */}
          <div className="bg-white rounded-xl border border-[#DAD4C6] p-3.5 shadow-xs flex flex-col flex-1 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2 shrink-0">
              <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <CalendarClock size={15} className="text-[#3B5166]" /> Intrări Programate Astăzi ({programariAzi.length})
              </h3>
              <span className="text-[11px] text-[#8A8375] font-semibold">Tabelă zilnică</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {programariAzi.length === 0 ? (
                <div className="text-center py-8 text-[11.5px] text-[#8A8375] italic">Nicio mașină programată sau intrată astăzi.</div>
              ) : (
                programariAzi.map(c => (
                  <div key={c.id} onClick={() => onOpen(c)} className="flex items-center justify-between p-2 rounded-lg border border-[#DAD4C6] bg-[#FAF8F5] hover:border-[#3B5166] cursor-pointer transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-[12.5px] bg-[#3B5166]/10 text-[#3B5166] px-1.5 py-0.5 rounded shrink-0">
                        {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold uppercase text-[12px] text-[#23282E]">{c.numarInmatriculare}</span>
                          <span className="text-[#8A8375] text-[10px] font-bold">·</span>
                          <span className="font-semibold text-[11.5px] text-[#6B6558] truncate">{c.marcaModel || "—"}</span>
                        </div>
                        <div className="text-[10px] text-[#8A8375] flex items-center gap-1 mt-0.5">
                          <User size={10} /> <span>{c.client || "Client neintrodus"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.ceEsteDeReparat && c.ceEsteDeReparat.trim() !== "—" && (
                        <span className="text-[10.5px] text-[#6B6558] bg-white border border-[#DAD4C6] px-2 py-0.5 rounded-md truncate max-w-[150px] font-medium" title={c.ceEsteDeReparat}>
                          ⚙️ {c.ceEsteDeReparat}
                        </span>
                      )}
                      <ChevronRight size={13} className="text-[#8A8375]" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Mașini Gata Azi & Clienți de Anunțat */}
          <div className="bg-white rounded-xl border border-[#DAD4C6] p-3.5 shadow-xs flex flex-col flex-1 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2 mb-2 shrink-0">
              <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <PackageCheck size={15} className="text-[#3E6B45]" /> Finalizate Azi / De Predat ({gataAzi.length})
              </h3>
              <span className="text-[11px] text-[#8A8375] font-semibold">Gata de ridicare</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {gataAzi.length === 0 ? (
                <div className="text-center py-8 text-[11.5px] text-[#8A8375] italic">Nicio mașină finalizată astăzi.</div>
              ) : (
                gataAzi.map(c => (
                  <div key={c.id} onClick={() => onOpen(c)} className="flex items-center justify-between p-2 rounded-lg border border-[#DAD4C6] bg-[#FAF8F5] hover:border-[#3E6B45] cursor-pointer transition-all">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold uppercase text-[12px] text-[#23282E]">{c.numarInmatriculare}</span>
                        <Pill tone="success">GATA</Pill>
                        <span className="text-[#8A8375] text-[10px] font-bold">·</span>
                        <span className="font-semibold text-[11.5px] text-[#6B6558] truncate">{c.marcaModel || "—"}</span>
                      </div>
                      <div className="text-[10px] text-[#8A8375] flex items-center gap-1 mt-0.5">
                        <User size={10} /> <span>{c.client || "—"}</span>
                        {c.telefonClient && <span className="ml-1.5 font-mono">{c.telefonClient}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {c.telefonClient && (
                        <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />
                      )}
                      <ChevronRight size={13} className="text-[#8A8375]" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Alerte & Blocaje Urgente (25%) */}
        <div className="space-y-3.5 flex flex-col h-full">
          
          {/* Card: Alerte & Depășiri */}
          <div className="bg-white rounded-xl border border-[#DAD4C6] p-3.5 shadow-xs flex flex-col flex-1 min-h-[300px]">
            <div className="border-b border-[#EFEAE1] pb-2 mb-2 shrink-0">
              <h3 className="font-bold text-[13px] text-[#B23A2E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <ShieldAlert size={15} /> Alerte Urgente ({totalActiuniUrgente})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              
              {/* Blocate Sub-section */}
              {blocate.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#B23A2E] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertOctagon size={11} /> Dosare Blocate ({blocate.length})
                  </div>
                  {blocate.map(c => (
                    <div key={c.id} onClick={() => onOpen(c)} className="p-2 rounded-lg border-2 border-[#23282E] bg-white hover:bg-[#FAF8F5] cursor-pointer transition-all text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold uppercase text-[#23282E]">{c.numarInmatriculare}</span>
                        <span className="text-[9px] bg-[#23282E] text-white px-1.5 rounded font-bold uppercase">BLOCAT</span>
                      </div>
                      <div className="text-[10px] text-[#8A8375] mt-1 font-semibold">Dosar: {c.numarDosar}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Courtesy Cars Sub-section */}
              {masiniSchimbDepasite.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#7A5316] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Car size={11} /> Auto de Schimb Excedate ({masiniSchimbDepasite.length})
                  </div>
                  {masiniSchimbDepasite.map(c => (
                    <div key={c.id} onClick={() => onOpen(c)} className="p-2 rounded-lg border border-[#DAD4C6] bg-[#FBF3E6]/60 hover:bg-[#FBF3E6]/90 cursor-pointer transition-all text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold uppercase text-[#7A5316]">{c.numarInmatriculare}</span>
                        <span className="text-[9px] bg-[#7A5316] text-white px-1.5 rounded font-bold uppercase">+{c.zile - c.zileChirieAudatex} zile</span>
                      </div>
                      <div className="text-[10px] text-[#6B6558] mt-1">
                        Schimb: <span className="font-bold">{c.masinaSchimb}</span> ({c.zile} zile pe drum / limită: {c.zileChirieAudatex}z)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Overdue Stage Sub-section */}
              {restante.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[#8A8375] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock size={11} /> Restante în Etapă ({restante.length})
                  </div>
                  {restante.map(c => {
                    const zile = daysBetween(c.dataSchimbareStatus);
                    return (
                      <div key={c.id} onClick={() => onOpen(c)} className="p-2 rounded-lg border border-[#DAD4C6] bg-[#FAF8F5] hover:border-[#3B5166] cursor-pointer transition-all text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold uppercase text-[#23282E]">{c.numarInmatriculare}</span>
                          <span className="text-[9.5px] text-[#B23A2E] font-bold">{zile} zile stagnate</span>
                        </div>
                        <div className="text-[10px] text-[#6B6558] mt-0.5 truncate">
                          Etapă: <span className="font-semibold">{c.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalActiuniUrgente === 0 && (
                <div className="text-center py-12 text-[11.5px] text-[#8A8375] italic">Fără alerte sau blocaje detectate. Excelent!</div>
              )}
            </div>
          </div>
        </div>

        {/* Column 4: Sumar Atelier & Asigurări (25%) */}
        <div className="space-y-3.5 flex flex-col h-full">
          
          {/* Card: Grad Încărcare & Asigurări */}
          <div className="bg-white rounded-xl border border-[#DAD4C6] p-3.5 shadow-xs flex flex-col flex-1 min-h-[300px]">
            <div className="border-b border-[#EFEAE1] pb-2 mb-3 shrink-0">
              <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <BarChart3 size={15} className="text-[#3B5166]" /> Sumar Atelier &amp; Asiguratori
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              
              {/* Load distribution */}
              <div className="space-y-2">
                <h4 className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider">Distribuție Dosare</h4>
                
                {/* Progress bar start */}
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#6B6558]">
                      <span>Deschidere</span>
                      <span className="font-bold">{phaseStats.start}</span>
                    </div>
                    <div className="w-full bg-[#FAF8F5] border border-[#DAD4C6] rounded-full h-2">
                      <div className="bg-[#3B5166] h-full rounded-full" style={{ width: `${activeClaimsCount > 0 ? (phaseStats.start / activeClaimsCount) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#6B6558]">
                      <span>Evaluare &amp; Accept</span>
                      <span className="font-bold">{phaseStats.eval}</span>
                    </div>
                    <div className="w-full bg-[#FAF8F5] border border-[#DAD4C6] rounded-full h-2">
                      <div className="bg-[#4A6FA5] h-full rounded-full" style={{ width: `${activeClaimsCount > 0 ? (phaseStats.eval / activeClaimsCount) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-[#6B6558]">
                      <span>Atelier &amp; Reparare</span>
                      <span className="font-bold">{phaseStats.lucru}</span>
                    </div>
                    <div className="w-full bg-[#FAF8F5] border border-[#DAD4C6] rounded-full h-2">
                      <div className="bg-[#C98A2B] h-full rounded-full" style={{ width: `${activeClaimsCount > 0 ? (phaseStats.lucru / activeClaimsCount) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurer top */}
              <div className="space-y-2">
                <h4 className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider">Top Asigurători Activ</h4>
                {insurerStats.length === 0 ? (
                  <div className="text-[10.5px] text-[#8A8375] italic">Niciun dosar activ.</div>
                ) : (
                  <div className="divide-y divide-[#EFEAE1]/60">
                    {insurerStats.map(([insurer, count]) => (
                      <div key={insurer} className="flex justify-between items-center py-1.5 text-[11px]">
                        <span className="font-semibold text-[#23282E] truncate max-w-[150px]" title={insurer}>{insurer}</span>
                        <span className="font-bold font-mono px-2 py-0.2 rounded-full bg-[#FAF8F5] border border-[#DAD4C6] text-[#23282E]">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Piese neprogramate alerts */}
              {pieseSositeNeprogramate.length > 0 && (
                <div className="bg-[#FBF3E6] border border-[#C98A2B]/30 rounded-lg p-2.5 space-y-1.5">
                  <h4 className="text-[10.5px] font-bold text-[#7A5316] uppercase tracking-wider flex items-center gap-1">
                    📦 Piese Sosite ({pieseSositeNeprogramate.length})
                  </h4>
                  <p className="text-[10px] text-[#7A5316]/90 leading-tight">
                    Există dosare cu piese intrate ce nu au o programare orară stabilită încă.
                  </p>
                  <div className="max-h-[100px] overflow-y-auto space-y-1 scrollbar-thin">
                    {pieseSositeNeprogramate.slice(0, 3).map(c => (
                      <div key={c.id} onClick={() => onOpen(c)} className="flex items-center justify-between text-[10px] font-semibold text-[#7A5316] bg-white border border-[#C98A2B]/20 rounded p-1 hover:bg-[#FAF8F5] cursor-pointer">
                        <span className="font-mono uppercase">{c.numarInmatriculare}</span>
                        <ChevronRight size={11} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
