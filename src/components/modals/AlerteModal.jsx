import React, { useState, useMemo } from "react";
import {
  X, AlertTriangle, PackageCheck, ShieldAlert, ShoppingCart, ChevronRight, Car, Bell, Clock
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import {
  isReadyForPickupOverdue, isStageOverdue, getDaysInStage,
  isAcceptPlataWithoutParts, isInactiveClaim, getDaysSinceLastActivity
} from "../../utils/alertUtils";
import Pill from "../common/Pill";

export default function AlerteModal({
  claims = [],
  initialTab = "depasite",
  pragRidicare = 3,
  pragInactivitate = 7,
  onClose,
  onOpenClaim
}) {
  // Dacă initialTab este "toate", setăm implicit "depasite" pentru claritate maximă
  const [activeTab, setActiveTab] = useState(initialTab === "toate" ? "depasite" : initialTab);

  const overdues = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const unpicked = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)), [claims, pragRidicare]);
  const acceptPlataNoParts = useMemo(() => claims.filter(isAcceptPlataWithoutParts), [claims]);
  const inactives = useMemo(() => claims.filter((c) => isInactiveClaim(c, pragInactivitate)), [claims, pragInactivitate]);
  const blocked = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const totalAlertsCount = overdues.length + unpicked.length + acceptPlataNoParts.length + inactives.length + blocked.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-4xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header Superior Super Centru Alerte */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C2127] text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B23A2E] flex items-center justify-center text-white font-bold shadow-md">
              <Bell size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[16px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Centrul de Alerte Operaționale
                </h2>
                <span className="bg-[#B23A2E] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  {totalAlertsCount} Alerte Total
                </span>
              </div>
              <p className="text-[11.5px] text-white/70">Alege o categorie pentru a vizualiza dosarele ce necesită acțiune</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Executive Alert Category Cards Header (Categoriile de Sus) */}
        <div className="bg-[#FAF8F5] border-b border-[#DAD4C6] px-3 py-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0 text-center">

          {/* Card 1: Depășite */}
          <button
            onClick={() => setActiveTab("depasite")}
            className={`p-2.5 rounded-xl border transition-all ${
              activeTab === "depasite"
                ? "bg-[#B23A2E] text-white border-[#B23A2E] shadow-md ring-2 ring-[#B23A2E]/40"
                : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
            }`}
          >
            <span className={`text-[10.5px] font-extrabold uppercase block truncate ${activeTab === "depasite" ? "text-white" : "text-[#B23A2E]"}`}>
              🚨 Termene Depășite
            </span>
            <span className="font-extrabold text-[18px] block mt-0.5">{overdues.length}</span>
          </button>

          {/* Card 2: Fără Piese */}
          <button
            onClick={() => setActiveTab("accept_plata")}
            className={`p-2.5 rounded-xl border transition-all ${
              activeTab === "accept_plata"
                ? "bg-[#2C4160] text-white border-[#2C4160] shadow-md ring-2 ring-[#2C4160]/40"
                : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
            }`}
          >
            <span className={`text-[10.5px] font-extrabold uppercase block truncate ${activeTab === "accept_plata" ? "text-white" : "text-[#2C4160]"}`}>
              🛒 Accept Fără Piese
            </span>
            <span className="font-extrabold text-[18px] block mt-0.5">{acceptPlataNoParts.length}</span>
          </button>

          {/* Card 3: Neridicate */}
          <button
            onClick={() => setActiveTab("neridicate")}
            className={`p-2.5 rounded-xl border transition-all ${
              activeTab === "neridicate"
                ? "bg-[#C98A2B] text-white border-[#C98A2B] shadow-md ring-2 ring-[#C98A2B]/40"
                : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
            }`}
          >
            <span className={`text-[10.5px] font-extrabold uppercase block truncate ${activeTab === "neridicate" ? "text-white" : "text-[#C98A2B]"}`}>
              📦 Mașini Neridicate
            </span>
            <span className="font-extrabold text-[18px] block mt-0.5">{unpicked.length}</span>
          </button>

          {/* Card 4: Inactive */}
          <button
            onClick={() => setActiveTab("inactivitate")}
            className={`p-2.5 rounded-xl border transition-all ${
              activeTab === "inactivitate"
                ? "bg-[#7A5316] text-white border-[#7A5316] shadow-md ring-2 ring-[#7A5316]/40"
                : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
            }`}
          >
            <span className={`text-[10.5px] font-extrabold uppercase block truncate ${activeTab === "inactivitate" ? "text-white" : "text-[#7A5316]"}`}>
              ⏱️ Fără Activitate
            </span>
            <span className="font-extrabold text-[18px] block mt-0.5">{inactives.length}</span>
          </button>

          {/* Card 5: Blocate */}
          <button
            onClick={() => setActiveTab("blocate")}
            className={`p-2.5 rounded-xl border transition-all ${
              activeTab === "blocate"
                ? "bg-[#4A5568] text-white border-[#4A5568] shadow-md ring-2 ring-[#4A5568]/40"
                : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
            }`}
          >
            <span className={`text-[10.5px] font-extrabold uppercase block truncate ${activeTab === "blocate" ? "text-white" : "text-[#4A5568]"}`}>
              ⚠️ Dosare Blocate
            </span>
            <span className="font-extrabold text-[18px] block mt-0.5">{blocked.length}</span>
          </button>
        </div>

        {/* Content Stream Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">

          {/* TAB 1: TERMENE DEPĂȘITE */}
          {activeTab === "depasite" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare ce au depășit limita de zile alocată pe etapă</span>
                <span className="font-bold text-[#B23A2E]">{overdues.length} dosare</span>
              </div>

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

          {/* TAB 2: ACCEPT PLATI FĂRĂ PIESE COMANDATE */}
          {activeTab === "accept_plata" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare ce au primire de Accept de Plată, dar pentru care NU s-au comandat încă piesele</span>
                <span className="font-bold text-[#2C4160]">{acceptPlataNoParts.length} dosare</span>
              </div>

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

          {/* TAB 3: MAȘINI GATA NERIDICATE */}
          {activeTab === "neridicate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Mașini reparate gata de ridicare ce depășesc pragul de {pragRidicare} zile</span>
                <span className="font-bold text-[#C98A2B]">{unpicked.length} dosare</span>
              </div>

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

          {/* TAB 4: DOSARE FĂRĂ ACTIVITATE */}
          {activeTab === "inactivitate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare în lucru deschise fără nicio activitate de peste {pragInactivitate} zile</span>
                <span className="font-bold text-[#7A5316]">{inactives.length} dosare</span>
              </div>

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

          {/* TAB 5: DOSARE BLOCATE */}
          {activeTab === "blocate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare marcate ca blocate / litigiu / în așteptare răspuns asigurător</span>
                <span className="font-bold text-[#4A5568]">{blocked.length} dosare</span>
              </div>

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
          <span className="text-[#8A8375]">Centru Alerte Workflow Dosare</span>
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
