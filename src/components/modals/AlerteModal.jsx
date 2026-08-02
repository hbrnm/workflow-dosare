import React, { useState, useMemo } from "react";
import {
  X, AlertTriangle, PackageCheck, ShieldAlert, ShoppingCart, ChevronRight, Car, Bell
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { isReadyForPickupOverdue, isStageOverdue, getDaysInStage, isAcceptPlataWithoutParts } from "../../utils/alertUtils";
import Pill from "../common/Pill";

export default function AlerteModal({
  claims = [],
  initialTab = "depasite",
  pragRidicare = 3,
  onClose,
  onOpenClaim
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "depasite" | "neridicate" | "accept_plata" | "blocate"

  const overdues = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const unpicked = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)), [claims, pragRidicare]);
  const acceptPlataNoParts = useMemo(() => claims.filter(isAcceptPlataWithoutParts), [claims]);
  const blocked = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const tabs = [
    { id: "depasite", label: "Termene Depășite", icon: AlertTriangle, count: overdues.length, color: "text-[#B23A2E]", bg: "bg-[#B23A2E]" },
    { id: "neridicate", label: "Mașini Neridicate", icon: PackageCheck, count: unpicked.length, color: "text-[#C98A2B]", bg: "bg-[#C98A2B]" },
    { id: "accept_plata", label: "Accept Fără Piese", icon: ShoppingCart, count: acceptPlataNoParts.length, color: "text-[#2C4160]", bg: "bg-[#2C4160]" },
    { id: "blocate", label: "Dosare Blocate", icon: ShieldAlert, count: blocked.length, color: "text-[#4A5568]", bg: "bg-[#4A5568]" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-3xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C2127] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B23A2E] flex items-center justify-center text-white font-bold">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[15.5px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Centrul de Alerte Operaționale
              </h2>
              <p className="text-[11px] text-white/60">Dosare care necesită atenție urgentă sau acțiune directă</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DAD4C6] bg-[#FAF8F5] px-3 pt-2 gap-1.5 shrink-0 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon, count, color, bg }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? `border-[#C98A2B] text-[#C98A2B] bg-white rounded-t-lg shadow-xs`
                    : "border-transparent text-[#6B6558] hover:text-[#23282E]"
                }`}
              >
                <Icon size={15} className={active ? "text-[#C98A2B]" : color} />
                <span>{label}</span>
                <span className={`px-1.5 py-0.2 text-[10.5px] font-black rounded-full text-white ${bg}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">

          {/* TAB 1: TERMENE DEPĂȘITE */}
          {activeTab === "depasite" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Afișare dosare ce au depășit limita de zile alocată pe etapă</span>
                <span>{overdues.length} dosare</span>
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

          {/* TAB 2: MAȘINI GATA NERIDICATE */}
          {activeTab === "neridicate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Mașini reparate gata de ridicare ce depășesc pragul de {pragRidicare} zile</span>
                <span>{unpicked.length} dosare</span>
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

          {/* TAB 3: ACCEPT PLATI FĂRĂ PIESE COMANDATE */}
          {activeTab === "accept_plata" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare ce au primire de Accept de Plată, dar pentru care NU s-au comandat încă piesele</span>
                <span>{acceptPlataNoParts.length} dosare</span>
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

          {/* TAB 4: DOSARE BLOCATE */}
          {activeTab === "blocate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#8A8375] px-1 pb-1">
                <span>Dosare marcate ca blocate / litigiu / în așteptare răspuns asigurător</span>
                <span>{blocked.length} dosare</span>
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
