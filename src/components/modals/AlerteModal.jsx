import React, { useState, useMemo } from "react";
import {
  X, AlertTriangle, PackageCheck, ShieldAlert, ShoppingCart, ChevronRight, Car, Bell, Clock, Sparkles, Filter, CheckCircle2
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import {
  isReadyForPickupOverdue, isStageOverdue, getDaysInStage,
  isAcceptPlataWithoutParts, isInactiveClaim, getDaysSinceLastActivity
} from "../../utils/alertUtils";
import Pill from "../common/Pill";

export default function AlerteModal({
  claims = [],
  initialTab = "toate",
  pragRidicare = 3,
  pragInactivitate = 7,
  onClose,
  onOpenClaim
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "toate" | "depasite" | "neridicate" | "accept_plata" | "inactivitate" | "blocate"
  const [filterSeverity, setFilterSeverity] = useState("all"); // "all" | "critical" | "warning"

  const overdues = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const unpicked = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)), [claims, pragRidicare]);
  const acceptPlataNoParts = useMemo(() => claims.filter(isAcceptPlataWithoutParts), [claims]);
  const inactives = useMemo(() => claims.filter((c) => isInactiveClaim(c, pragInactivitate)), [claims, pragInactivitate]);
  const blocked = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const totalAlertsCount = overdues.length + unpicked.length + acceptPlataNoParts.length + inactives.length + blocked.length;

  // Stream combinat de alerte ordonat după urgență
  const allAlertsStream = useMemo(() => {
    const stream = [];

    // 1. Termene depășite (Critic)
    overdues.forEach((c) => {
      stream.push({
        id: `depasit_${c.id}`,
        claim: c,
        type: "depasit",
        severity: "critic",
        title: "Termen Etapă Depășit",
        sub: `A depășit termenul cu ${getDaysInStage(c)} zile în etapa „${getStatusDefinition(c.status).label}"`,
        badgeText: `🔥 +${getDaysInStage(c)}z întârziere`,
        badgeBg: "bg-[#B23A2E] text-white",
        borderColor: "border-[#F4D7D3] hover:border-[#B23A2E]",
        icon: AlertTriangle,
        iconColor: "text-[#B23A2E]",
      });
    });

    // 2. Accept de plată fără piese (Important)
    acceptPlataNoParts.forEach((c) => {
      stream.push({
        id: `piese_${c.id}`,
        claim: c,
        type: "accept_plata",
        severity: "important",
        title: "Accept Primire - Piese Necomandate",
        sub: `Acceptul de plată a fost înregistrat de la ${c.asigurator || "asigurător"}, dar piesele nu sunt comandate`,
        badgeText: "🛒 Comandă Piese",
        badgeBg: "bg-[#2C4160] text-white",
        borderColor: "border-[#C6D2E1] hover:border-[#2C4160]",
        icon: ShoppingCart,
        iconColor: "text-[#2C4160]",
      });
    });

    // 3. Mașini gata neridicate (Mediu)
    unpicked.forEach((c) => {
      stream.push({
        id: `neridicat_${c.id}`,
        claim: c,
        type: "neridicat",
        severity: "warning",
        title: "Mașină Gata Neridicată",
        sub: `Reparația este finalizată gata de ridicare de mai mult de ${pragRidicare} zile`,
        badgeText: "📦 Gata Ridicare",
        badgeBg: "bg-[#C98A2B] text-white",
        borderColor: "border-[#F3E5CD] hover:border-[#C98A2B]",
        icon: PackageCheck,
        iconColor: "text-[#C98A2B]",
      });
    });

    // 4. Inactivitate (Scăzut)
    inactives.forEach((c) => {
      stream.push({
        id: `inactiv_${c.id}`,
        claim: c,
        type: "inactiv",
        severity: "warning",
        title: "Nicio Activitate Recente",
        sub: `Fără nicio nota sau schimbare de status de peste ${getDaysSinceLastActivity(c)} zile`,
        badgeText: `⏱️ ${getDaysSinceLastActivity(c)}z inactiv`,
        badgeBg: "bg-[#7A5316] text-white",
        borderColor: "border-[#E8DCC4] hover:border-[#7A5316]",
        icon: Clock,
        iconColor: "text-[#7A5316]",
      });
    });

    // 5. Blocate (Special)
    blocked.forEach((c) => {
      stream.push({
        id: `blocat_${c.id}`,
        claim: c,
        type: "blocat",
        severity: "important",
        title: "Dosar Blocat / Litigiu",
        sub: `Motiv: ${c.motivBlocare || "Nespecificat"}`,
        badgeText: "⚠️ Blocat",
        badgeBg: "bg-[#4A5568] text-white",
        borderColor: "border-[#D5DCB4] hover:border-[#4A5568]",
        icon: ShieldAlert,
        iconColor: "text-[#4A5568]",
      });
    });

    if (filterSeverity === "critical") {
      return stream.filter((item) => item.severity === "critic");
    }
    if (filterSeverity === "important") {
      return stream.filter((item) => item.severity === "important" || item.severity === "critic");
    }

    return stream;
  }, [overdues, acceptPlataNoParts, unpicked, inactives, blocked, pragRidicare, filterSeverity]);

  const tabs = [
    { id: "toate", label: "🌟 Stream Toate", icon: Sparkles, count: totalAlertsCount, bg: "bg-gradient-to-r from-[#B23A2E] to-[#C98A2B]" },
    { id: "depasite", label: "Termene Depășite", icon: AlertTriangle, count: overdues.length, bg: "bg-[#B23A2E]" },
    { id: "accept_plata", label: "Accept Fără Piese", icon: ShoppingCart, count: acceptPlataNoParts.length, bg: "bg-[#2C4160]" },
    { id: "neridicate", label: "Mașini Neridicate", icon: PackageCheck, count: unpicked.length, bg: "bg-[#C98A2B]" },
    { id: "inactivitate", label: "Fără Activitate", icon: Clock, count: inactives.length, bg: "bg-[#7A5316]" },
    { id: "blocate", label: "Dosare Blocate", icon: ShieldAlert, count: blocked.length, bg: "bg-[#4A5568]" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-4xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header Superior Super Centru Alerte */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1C2127] via-[#242B33] to-[#1C2127] text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#B23A2E] via-[#C98A2B] to-[#2C4160] flex items-center justify-center text-white font-bold shadow-md">
              <Bell size={19} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[16px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Super Centru de Alerte
                </h2>
                <span className="bg-[#B23A2E] text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  {totalAlertsCount} Alerte Active
                </span>
              </div>
              <p className="text-[11.5px] text-white/70">Flux centralizat al tuturor atenționărilor și dosarelor prioritare</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Executive Alert Summary Cards Header */}
        <div className="bg-[#FAF8F5] border-b border-[#DAD4C6] px-4 py-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0 text-center">
          <button
            onClick={() => { setActiveTab("depasite"); setFilterSeverity("all"); }}
            className={`p-2 rounded-lg border transition-all ${activeTab === "depasite" ? "bg-[#B23A2E]/10 border-[#B23A2E]" : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5]"}`}
          >
            <span className="text-[10px] font-bold uppercase text-[#B23A2E] block truncate">🚨 Depășite</span>
            <span className="font-extrabold text-[16px] text-[#B23A2E]">{overdues.length}</span>
          </button>

          <button
            onClick={() => { setActiveTab("accept_plata"); setFilterSeverity("all"); }}
            className={`p-2 rounded-lg border transition-all ${activeTab === "accept_plata" ? "bg-[#2C4160]/10 border-[#2C4160]" : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5]"}`}
          >
            <span className="text-[10px] font-bold uppercase text-[#2C4160] block truncate">🛒 Fără Piese</span>
            <span className="font-extrabold text-[16px] text-[#2C4160]">{acceptPlataNoParts.length}</span>
          </button>

          <button
            onClick={() => { setActiveTab("neridicate"); setFilterSeverity("all"); }}
            className={`p-2 rounded-lg border transition-all ${activeTab === "neridicate" ? "bg-[#C98A2B]/10 border-[#C98A2B]" : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5]"}`}
          >
            <span className="text-[10px] font-bold uppercase text-[#C98A2B] block truncate">📦 Neridicate</span>
            <span className="font-extrabold text-[16px] text-[#C98A2B]">{unpicked.length}</span>
          </button>

          <button
            onClick={() => { setActiveTab("inactivitate"); setFilterSeverity("all"); }}
            className={`p-2 rounded-lg border transition-all ${activeTab === "inactivitate" ? "bg-[#7A5316]/10 border-[#7A5316]" : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5]"}`}
          >
            <span className="text-[10px] font-bold uppercase text-[#7A5316] block truncate">⏱️ Inactive</span>
            <span className="font-extrabold text-[16px] text-[#7A5316]">{inactives.length}</span>
          </button>

          <button
            onClick={() => { setActiveTab("blocate"); setFilterSeverity("all"); }}
            className={`p-2 rounded-lg border transition-all ${activeTab === "blocate" ? "bg-[#4A5568]/10 border-[#4A5568]" : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5]"}`}
          >
            <span className="text-[10px] font-bold uppercase text-[#4A5568] block truncate">⚠️ Blocate</span>
            <span className="font-extrabold text-[16px] text-[#4A5568]">{blocked.length}</span>
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-[#DAD4C6] bg-white px-3 pt-2 shrink-0 overflow-x-auto">
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {tabs.map(({ id, label, icon: Icon, count, bg }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? "border-[#C98A2B] text-[#C98A2B] bg-[#FCFAF5] rounded-t-lg shadow-xs"
                      : "border-transparent text-[#6B6558] hover:text-[#23282E]"
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full text-white ${bg}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === "toate" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-[#8A8375]">
              <Filter size={12} />
              <span>Filtrează urgența:</span>
              <button
                onClick={() => setFilterSeverity("all")}
                className={`px-2 py-0.5 rounded ${filterSeverity === "all" ? "bg-[#23282E] text-white font-bold" : "hover:bg-[#EFEAE1]"}`}
              >
                Toate ({totalAlertsCount})
              </button>
              <button
                onClick={() => setFilterSeverity("critical")}
                className={`px-2 py-0.5 rounded ${filterSeverity === "critical" ? "bg-[#B23A2E] text-white font-bold" : "hover:bg-[#EFEAE1]"}`}
              >
                Critical ({overdues.length})
              </button>
            </div>
          )}
        </div>

        {/* Content Stream Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">

          {/* TAB 1: STREAM COMBINAT TOATE ALERTELE */}
          {activeTab === "toate" && (
            <div className="space-y-2.5">
              {allAlertsStream.length === 0 ? (
                <div className="text-[13px] text-[#3E6B45] font-bold py-12 text-center bg-white rounded-xl border border-[#DAD4C6] flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 size={32} className="text-[#3E6B45]" />
                  <span>🎉 Bravo! Nu există nicio alertă activă în acest moment. Toate dosarele sunt la zi!</span>
                </div>
              ) : (
                allAlertsStream.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { onClose(); onOpenClaim(item.claim); }}
                      className={`flex items-center justify-between bg-white border ${item.borderColor} rounded-xl p-3 shadow-xs hover:shadow-md cursor-pointer transition-all group`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-black/5 ${item.iconColor} flex items-center justify-center shrink-0`}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[14px] text-[#23282E] group-hover:text-[#C98A2B] transition-colors">
                              {item.claim.numarDosar || "(fără nr.)"}
                            </span>
                            <span className={`text-[10.5px] font-black px-2 py-0.5 rounded-full ${item.badgeBg}`}>
                              {item.badgeText}
                            </span>
                            <Pill tone="amber">{item.claim.tipAsigurare}</Pill>
                          </div>
                          <div className="text-[12px] text-[#6B6558] truncate mt-0.5">
                            {item.claim.client || "Client neintrodus"} · {item.claim.numarInmatriculare || "—"} · {item.claim.asigurator}
                          </div>
                          <div className="text-[11px] text-[#8A8375] font-medium truncate italic mt-0.5">
                            {item.sub}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-[11.5px] font-bold text-[#3B5166] bg-[#FAF8F5] border border-[#DAD4C6] px-2.5 py-1 rounded-lg group-hover:bg-[#C98A2B] group-hover:text-white group-hover:border-[#C98A2B] transition-colors">
                          Deschide ➔
                        </span>
                        <ChevronRight size={18} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TERMENE DEPĂȘITE */}
          {activeTab === "depasite" && (
            <div className="space-y-2.5">
              {overdues.length === 0 ? (
                <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
                  🎉 Nu există niciun dosar cu termen depășit!
                </div>
              ) : (
                overdues.map((c) => {
                  const st = getStatusDefinition(c.status);
                  const daysInStage = getDaysInStage(c);
                  return (
                    <div
                      key={c.id}
                      onClick={() => { onClose(); onOpenClaim(c); }}
                      className="flex items-center justify-between bg-white border border-[#F4D7D3] rounded-xl p-3 hover:border-[#B23A2E] hover:shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#B23A2E]/10 text-[#B23A2E] flex flex-col items-center justify-center shrink-0">
                          <span className="font-mono font-black text-[14px] leading-none">{daysInStage}</span>
                          <span className="text-[9px] font-bold uppercase">zile</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[14px] text-[#23282E] group-hover:text-[#B23A2E]">{c.numarDosar || "(fără nr.)"}</span>
                            <Pill tone="amber">{c.tipAsigurare}</Pill>
                            <span className="text-[11px] font-mono text-[#8A8375]">{c.asigurator}</span>
                          </div>
                          <div className="text-[12px] text-[#6B6558] truncate">{c.client || "Client neintrodus"} · {c.numarInmatriculare || "—"} · {c.marcaModel}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11.5px] font-bold text-[#8A8375] bg-[#EFEAE1] px-2 py-1 rounded-md">
                          {st.label}
                        </span>
                        <ChevronRight size={18} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: ACCEPT PLATI FĂRĂ PIESE COMANDATE */}
          {activeTab === "accept_plata" && (
            <div className="space-y-2.5">
              {acceptPlataNoParts.length === 0 ? (
                <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
                  🎉 Excelent! Toate dosarele cu accept de plată au comanda de piese lansată.
                </div>
              ) : (
                acceptPlataNoParts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { onClose(); onOpenClaim(c); }}
                    className="flex items-center justify-between bg-white border border-[#C6D2E1] rounded-xl p-3 hover:border-[#2C4160] hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#2C4160]/10 text-[#2C4160] flex items-center justify-center shrink-0 font-bold">
                        <ShoppingCart size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#23282E] group-hover:text-[#2C4160]">{c.numarDosar || "(fără nr.)"}</span>
                          <Pill tone="amber">{c.tipAsigurare}</Pill>
                          <span className="text-[11px] font-bold text-[#2C4160] bg-[#E3E9F2] px-2 py-0.5 rounded-md">
                            Accept primit
                          </span>
                        </div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare} · {c.asigurator}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11.5px] font-bold text-[#2C4160] bg-[#E3E9F2] px-2.5 py-1 rounded-lg group-hover:bg-[#2C4160] group-hover:text-white transition-colors">
                        Comandă Piese ➔
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: MAȘINI GATA NERIDICATE */}
          {activeTab === "neridicate" && (
            <div className="space-y-2.5">
              {unpicked.length === 0 ? (
                <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
                  Nu există mașini neridicate care să depășească pragul.
                </div>
              ) : (
                unpicked.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { onClose(); onOpenClaim(c); }}
                    className="flex items-center justify-between bg-white border border-[#F3E5CD] rounded-xl p-3 hover:border-[#C98A2B] hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#C98A2B]/15 text-[#7A5316] flex items-center justify-center shrink-0">
                        <Car size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#23282E] group-hover:text-[#C98A2B]">{c.numarDosar || "(fără nr.)"}</span>
                          <span className="text-[11px] font-bold text-[#7A5316] bg-[#F7EAD3] px-2 py-0.5 rounded-full">
                            Gata de ridicare
                          </span>
                        </div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare} · Tel: {c.telefonClient || "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ChevronRight size={18} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: DOSARE FĂRĂ ACTIVITATE */}
          {activeTab === "inactivitate" && (
            <div className="space-y-2.5">
              {inactives.length === 0 ? (
                <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
                  🎉 Nu există dosare inactive (fără nicio modificare în ultimele {pragInactivitate} zile).
                </div>
              ) : (
                inactives.map((c) => {
                  const st = getStatusDefinition(c.status);
                  const daysInactive = getDaysSinceLastActivity(c);
                  return (
                    <div
                      key={c.id}
                      onClick={() => { onClose(); onOpenClaim(c); }}
                      className="flex items-center justify-between bg-white border border-[#E8DCC4] rounded-xl p-3 hover:border-[#7A5316] hover:shadow-sm cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#7A5316]/10 text-[#7A5316] flex flex-col items-center justify-center shrink-0">
                          <span className="font-mono font-black text-[14px] leading-none">{daysInactive}</span>
                          <span className="text-[9px] font-bold uppercase">zile</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[14px] text-[#23282E] group-hover:text-[#7A5316]">{c.numarDosar || "(fără nr.)"}</span>
                            <span className="text-[11px] font-mono font-bold text-[#7A5316] bg-[#F7EAD3] px-2 py-0.5 rounded-md">
                              {st.label}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare} · Fără modificări de {daysInactive} zile</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <ChevronRight size={18} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 6: DOSARE BLOCATE */}
          {activeTab === "blocate" && (
            <div className="space-y-2.5">
              {blocked.length === 0 ? (
                <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
                  Nu există niciun dosar blocat.
                </div>
              ) : (
                blocked.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { onClose(); onOpenClaim(c); }}
                    className="flex items-center justify-between bg-white border border-[#D5DCB4] rounded-xl p-3 hover:border-[#3B5166] hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#3B5166]/10 text-[#3B5166] flex items-center justify-center shrink-0 font-bold">
                        <ShieldAlert size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[#23282E] group-hover:text-[#3B5166]">{c.numarDosar || "(fără nr.)"} · {c.numarInmatriculare}</div>
                        <div className="text-[12px] text-[#B23A2E] font-medium truncate">Motiv blocare: {c.motivBlocare || "Nespecificat"}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[#DAD4C6] shrink-0 text-[12px]">
          <span className="text-[#8A8375]">Super Centru Alerte Workflow Dosare</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#C7C0B0] font-semibold text-[#4A443A] hover:bg-[#EFEAE1]"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
