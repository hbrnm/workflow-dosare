import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertTriangle, AlertOctagon, Phone, Car,
  Clock, CheckCircle2, ShieldAlert, BarChart3, ChevronRight, User, Filter,
  Wrench, Boxes, FileText, ArrowRight, ExternalLink
} from "lucide-react";
import { todayISO, daysBetween, telLink } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import { STATUSES, PHASE_COLORS, getStatusDefinition } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";

export default function BriefZilnic({ claims, onOpen, onMoveToStatus, onDuplicate, canEditFn, pragRidicare, onSelectStatusFilter }) {
  const todayStr = todayISO();
  const [activeAlertTab, setActiveAlertTab] = useState("toate"); // "toate" | "blocate" | "masini_schimb" | "stagnate" | "piese" | "neridicate"

  // Dată azi formatată în limba română
  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  // 1. Programări intrări astăzi
  const programariAzi = useMemo(() =>
    claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr)
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  // 2. Finalizate astăzi (gata de predat)
  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && !c.ridicata && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr),
    [claims, todayStr]);

  // 3. Dosare blocate
  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  // 4. Mașini de schimb cu durata depășită
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

  // 5. Dosare stagnate/în întârziere în etapă
  const restante = useMemo(() =>
    claims.filter(isStageOverdue)
      .sort((a, b) => daysBetween(b.dataSchimbareStatus) - daysBetween(a.dataSchimbareStatus)),
    [claims]);

  // 6. Piese sosite dar neprogramate la atelier
  const pieseSositeNeprogramate = useMemo(() =>
    claims.filter((c) => c.status === "piese_sosite" && !c.dataProgramare),
    [claims]);

  // 7. Clienți cu mașini gata de ridicare ce depășesc pragul de zile
  const neridicateVechi = useMemo(() =>
    claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare))
      .sort((a, b) => daysBetween(b.dataGataRidicare) - daysBetween(a.dataGataRidicare)),
    [claims, pragRidicare]);

  // Totalul tuturor alertelor operative
  const totalActiuniUrgente = blocate.length + masiniSchimbDepasite.length + restante.length + pieseSositeNeprogramate.length + neridicateVechi.length;

  // Lista unificată și filtrată de alerte pentru Centrul de Comandă
  const alertsList = useMemo(() => {
    const list = [];

    blocate.forEach((c) => {
      list.push({
        id: `blocat-${c.id}`,
        claim: c,
        type: "blocat",
        title: "Dosar Blocat",
        reason: c.motivBlocare || "Lipsă motiv specificat",
        severity: "critical",
        badgeColor: "bg-[#B23A2E] text-white",
        borderColor: "border-[#B23A2E]",
        icon: AlertOctagon,
      });
    });

    masiniSchimbDepasite.forEach((c) => {
      const depasireZile = c.zile - c.zileChirieAudatex;
      list.push({
        id: `schimb-${c.id}`,
        claim: c,
        type: "masini_schimb",
        title: `Auto la Schimb Excedat (+${depasireZile}z)`,
        reason: `Auto: ${c.masinaSchimb} · Folosit ${c.zile} zile (limită Audatex: ${c.zileChirieAudatex}z)`,
        severity: "warning",
        badgeColor: "bg-[#C98A2B] text-white",
        borderColor: "border-[#C98A2B]",
        icon: Car,
      });
    });

    restante.forEach((c) => {
      const zile = daysBetween(c.dataSchimbareStatus);
      const sDef = getStatusDefinition(c.status);
      list.push({
        id: `stagnat-${c.id}`,
        claim: c,
        type: "stagnate",
        title: `Întârziere în Etapă (${zile} zile)`,
        reason: `Status curent: ${sDef.label} (depășit pragul recomandat)`,
        severity: "info",
        badgeColor: "bg-[#3B5166] text-white",
        borderColor: "border-[#3B5166]",
        icon: Clock,
      });
    });

    pieseSositeNeprogramate.forEach((c) => {
      list.push({
        id: `piese-${c.id}`,
        claim: c,
        type: "piese",
        title: "Piese Sosite - Fără Programare",
        reason: "Piesele au fost recepționate dar nu a fost stabilită o dată de intrare în service",
        severity: "warning",
        badgeColor: "bg-[#7A5316] text-white",
        borderColor: "border-[#C98A2B]/60",
        icon: Boxes,
      });
    });

    neridicateVechi.forEach((c) => {
      const zile = daysBetween(c.dataGataRidicare);
      list.push({
        id: `neridicat-${c.id}`,
        claim: c,
        type: "neridicate",
        title: `Mașină Neridicată (${zile} zile)`,
        reason: `Mașina este gata din ${c.dataGataRidicare ? c.dataGataRidicare.slice(0, 10) : "—"} și nu a fost preluată`,
        severity: "warning",
        badgeColor: "bg-[#3E6B45] text-white",
        borderColor: "border-[#3E6B45]",
        icon: PackageCheck,
      });
    });

    if (activeAlertTab === "toate") return list;
    return list.filter((item) => item.type === activeAlertTab);
  }, [blocate, masiniSchimbDepasite, restante, pieseSositeNeprogramate, neridicateVechi, activeAlertTab]);

  // Număr total dosare active
  const activeClaimsCount = useMemo(() =>
    claims.filter((c) => c.status !== "facturat").length,
    [claims]);

  // Număr dosare înregistrate pe fiecare etapă din workflow
  const statusStats = useMemo(() => {
    const counts = {};
    STATUSES.forEach((s) => (counts[s.key] = 0));
    claims.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });
    return counts;
  }, [claims]);

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">

      {/* 1. TOP HEADER & OPERATIONAL BRIEF BANNER */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3B5166]/10 flex items-center justify-center text-[#3B5166]">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-[16px] font-bold tracking-tight capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Centrul de Comandă &amp; Brief Atelier · {formattedTodayDate}
            </h1>
            <p className="text-[11.5px] text-[#8A8375] font-medium flex items-center gap-1.5 mt-0.5">
              {totalActiuniUrgente > 0 ? (
                <span className="flex items-center gap-1 text-[#B23A2E] font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-md text-[11px]">
                  <ShieldAlert size={12} /> {totalActiuniUrgente} alerte operative ce necesită reacție
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#3E6B45] font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-md text-[11px]">
                  <CheckCircle2 size={12} /> Nicio alertă urgentă nesoluționată
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Badge sumar dosare active */}
        <div className="flex items-center gap-2 text-[11.5px]">
          <div className="px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#DAD4C6] flex items-center gap-2">
            <span className="text-[#8A8375] font-semibold">Total Dosare Active:</span>
            <span className="font-bold text-[#2C4160] font-mono text-[13px]">{activeClaimsCount}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTRUL DE TRIAJ ALERTE URGENTE (PRIORITATE MAXIMĂ) */}
      <div className="bg-white rounded-xl border border-[#DAD4C6] p-3 shadow-sm space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DAD4C6] pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className={totalActiuniUrgente > 0 ? "text-[#B23A2E]" : "text-[#3E6B45]"} />
            <h2 className="font-bold text-[14px] text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Centrul de Alerte Urgente &amp; Acțiuni Rapide
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${totalActiuniUrgente > 0 ? "bg-[#B23A2E] text-white" : "bg-[#3E6B45] text-white"}`}>
              {totalActiuniUrgente}
            </span>
          </div>

          {/* Tab-uri de filtrare alerte */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveAlertTab("toate")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "toate" ? "bg-[#2C4160] text-white border-[#2C4160]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6] hover:bg-gray-100"}`}
            >
              Toate ({totalActiuniUrgente})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab("blocate")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "blocate" ? "bg-[#B23A2E] text-white border-[#B23A2E]" : "bg-red-50 text-[#B23A2E] border-red-200 hover:bg-red-100"}`}
            >
              🛑 Blocate ({blocate.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab("masini_schimb")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "masini_schimb" ? "bg-[#C98A2B] text-white border-[#C98A2B]" : "bg-amber-50 text-[#7A5316] border-amber-200 hover:bg-amber-100"}`}
            >
              🚗 Auto Schimb ({masiniSchimbDepasite.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab("stagnate")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "stagnate" ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-blue-50 text-[#3B5166] border-blue-200 hover:bg-blue-100"}`}
            >
              ⏳ Stagnate ({restante.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab("piese")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "piese" ? "bg-[#7A5316] text-white border-[#7A5316]" : "bg-orange-50 text-[#7A5316] border-orange-200 hover:bg-orange-100"}`}
            >
              📦 Piese Neprogramate ({pieseSositeNeprogramate.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab("neridicate")}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${activeAlertTab === "neridicate" ? "bg-[#3E6B45] text-white border-[#3E6B45]" : "bg-emerald-50 text-[#3E6B45] border-emerald-200 hover:bg-emerald-100"}`}
            >
              📞 Neridicate ({neridicateVechi.length})
            </button>
          </div>
        </div>

        {/* Grilă de carduri interactive de alerte cu acțiuni 1-click */}
        {alertsList.length === 0 ? (
          <div className="py-3.5 px-4 text-center text-[12px] text-[#8A8375] bg-[#FAF8F5] border border-dashed border-[#DAD4C6] rounded-xl font-medium">
            ✨ Nicio alertă detectată pentru filtrul selectat. Toate dosarele sunt în parametrii optimi!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {alertsList.map((item) => {
              const c = item.claim;
              const IconComp = item.icon;
              const phone = c.telefonClient || "";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-2.5 ${item.borderColor}`}
                >
                  <div>
                    {/* Header Card Alertă */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#EFEAE1] pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp size={15} className="shrink-0" />
                        <span className="font-mono font-extrabold text-[13px] text-[#23282E] uppercase truncate">
                          {c.numarInmatriculare || "—"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${item.badgeColor}`}>
                        {item.title}
                      </span>
                    </div>

                    {/* Detalii vehicul & Motiv alertă */}
                    <div className="mt-2 space-y-1 text-[11.5px]">
                      <div className="flex items-center justify-between text-[#6B6558] font-medium">
                        <span className="truncate">{c.marcaModel || "Model nespecificat"}</span>
                        <span className="font-mono text-[10.5px] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#DAD4C6]">
                          Nr: {c.numarDosar || "—"}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#23282E] bg-[#FAF8F5] p-2 rounded-lg border border-[#DAD4C6]/60 leading-tight">
                        {item.reason}
                      </div>
                    </div>
                  </div>

                  {/* BARA DE ACȚIUNI RAPIDE 1-CLICK */}
                  <div className="pt-2 border-t border-[#EFEAE1] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a
                            href={telLink(phone)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#EEF1F3] hover:bg-[#3B5166] text-[#3B5166] hover:text-white text-[10.5px] font-bold transition-colors"
                            title={`Sune la ${phone}`}
                          >
                            <Phone size={11} /> Apel
                          </a>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2C4160] text-white hover:bg-[#1E2D44] text-[11px] font-bold transition-colors ml-auto shadow-2xs"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECȚIUNEA OPERATIVĂ ZILNICĂ & SUMAR ATELIER */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* COLOANA 1: INTRĂRI PROGRAMATE ASTĂZI */}
        <div className="bg-white rounded-xl border border-[#DAD4C6] p-3 shadow-sm flex flex-col min-h-[200px] max-h-[380px]">
          <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <CalendarClock size={16} className="text-[#3B5166]" /> Intrări Programate Astăzi ({programariAzi.length})
            </h3>
            <span className="text-[10.5px] font-mono bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded text-[#8A8375]">Agendă Zi</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {programariAzi.length === 0 ? (
              <div className="text-center py-6 text-[11.5px] text-[#8A8375] italic bg-[#FAF8F5] rounded-xl border border-dashed border-[#DAD4C6] my-auto">
                Nicio mașină programată sau intrată astăzi.
              </div>
            ) : (
              programariAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="flex items-center justify-between p-2 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] hover:border-[#3B5166] cursor-pointer transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-extrabold text-[11.5px] bg-[#3B5166] text-white px-2 py-0.5 rounded-lg shrink-0 shadow-2xs">
                      {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold uppercase text-[12px] text-[#23282E]">{c.numarInmatriculare}</span>
                        <span className="text-[#8A8375] text-[10px]">·</span>
                        <span className="font-semibold text-[11px] text-[#6B6558] truncate">{c.marcaModel || "—"}</span>
                      </div>
                      <div className="text-[10px] text-[#8A8375] flex items-center gap-1 mt-0.5">
                        <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="p-1 text-[#8A8375] hover:text-[#2C4160] hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLOANA 2: FINALIZATE AZI / DE PREDAI */}
        <div className="bg-white rounded-xl border border-[#DAD4C6] p-3 shadow-sm flex flex-col min-h-[200px] max-h-[380px]">
          <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <PackageCheck size={16} className="text-[#3E6B45]" /> Finalizate Azi / Gata Predare ({gataAzi.length})
            </h3>
            <Pill tone="success">GATA</Pill>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {gataAzi.length === 0 ? (
              <div className="text-center py-6 text-[11.5px] text-[#8A8375] italic bg-[#FAF8F5] rounded-xl border border-dashed border-[#DAD4C6] my-auto">
                Nicio mașină finalizată astăzi.
              </div>
            ) : (
              gataAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] hover:border-[#3E6B45] cursor-pointer transition-all shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold uppercase text-[12.5px] text-[#23282E]">{c.numarInmatriculare}</span>
                      <span className="text-[#8A8375] text-[10px]">·</span>
                      <span className="font-semibold text-[11.5px] text-[#6B6558] truncate">{c.marcaModel || "—"}</span>
                    </div>
                    <div className="text-[10.5px] text-[#8A8375] flex items-center gap-1 mt-0.5">
                      <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="p-1 text-[#8A8375] hover:text-[#3E6B45] hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLOANA 3: STATISTICI & PULSUL ATELIERULUI */}
        <div className="bg-white rounded-xl border border-[#DAD4C6] p-3 shadow-sm flex flex-col min-h-[200px] max-h-[380px]">
          <div className="border-b border-[#EFEAE1] pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <BarChart3 size={16} className="text-[#3B5166]" /> Pulsul Atelierului
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            <h4 className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider mb-1.5">
              Dosare Înregistrate pe Etape de Lucru
            </h4>
            <div className="space-y-1.5 text-[11px]">
              {STATUSES.map((s) => {
                const count = statusStats[s.key] || 0;
                const color = PHASE_COLORS[s.phase]?.bar || "#3B5166";
                const percent = activeClaimsCount > 0 ? (count / activeClaimsCount) * 100 : 0;

                return (
                  <div
                    key={s.key}
                    onClick={() => {
                      if (onSelectStatusFilter) {
                        onSelectStatusFilter(s.key);
                      }
                    }}
                    className={`p-2 rounded-xl border transition-all space-y-1 select-none ${
                      count > 0
                        ? "bg-[#FAF8F5] border-[#DAD4C6] hover:border-[#C98A2B] hover:bg-[#FDFBF7] cursor-pointer shadow-2xs group"
                        : "bg-[#FAF8F5]/50 border-[#DAD4C6]/40 opacity-70 cursor-pointer hover:opacity-100"
                    }`}
                    title={count > 0 ? `Apasă pentru a deschide cele ${count} dosare din etapa „${s.label}”` : `Niciun dosar în etapa „${s.label}”`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[#23282E]">
                      <span className="flex items-center gap-1.5 min-w-0 pr-1 truncate group-hover:text-[#C98A2B] transition-colors">
                        <span className="text-[10px] font-mono text-[#8A8375] bg-white border border-[#DAD4C6] px-1 py-0.2 rounded shrink-0">
                          {String(s.num).padStart(2, "0")}
                        </span>
                        <span className="truncate">{s.label}</span>
                      </span>
                      <span
                        className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-[10.5px] transition-all flex items-center gap-1 shrink-0 ${
                          count > 0
                            ? "bg-[#2C4160] text-white shadow-xs group-hover:bg-[#C98A2B]"
                            : "bg-white text-[#8A8375] border border-[#DAD4C6]"
                        }`}
                      >
                        <span>{count} {count === 1 ? "dosar" : "dosare"}</span>
                        {count > 0 && <span className="text-[11px] group-hover:translate-x-0.5 transition-transform">➔</span>}
                      </span>
                    </div>
                    {count > 0 && (
                      <div className="w-full bg-white border border-[#DAD4C6]/60 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
