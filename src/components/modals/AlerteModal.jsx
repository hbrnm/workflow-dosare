import React, { useState, useMemo, useEffect } from "react";
import {
  X, ShieldAlert, ShoppingCart, ChevronRight, Car, Bell, Clock, Boxes, PackageCheck
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import {
  buildAlertBuckets,
  normalizeAlertTab,
  getDaysInStage,
  getDaysSinceLastActivity,
} from "../../utils/alertUtils";
import Pill from "../common/Pill";

const CATEGORY_META = [
  { key: "stagnate", label: "Termene Depășite", emoji: "🚨", active: "bg-[#B23A2E] text-white border-[#B23A2E] ring-[#B23A2E]/40", idle: "text-[#B23A2E]" },
  { key: "accept_plata", label: "Accept Fără Piese", emoji: "🛒", active: "bg-[#2C4160] text-white border-[#2C4160] ring-[#2C4160]/40", idle: "text-[#2C4160]" },
  { key: "neridicate", label: "Mașini Neridicate", emoji: "📦", active: "bg-[#C98A2B] text-white border-[#C98A2B] ring-[#C98A2B]/40", idle: "text-[#C98A2B]" },
  { key: "inactivitate", label: "Fără Activitate", emoji: "⏱️", active: "bg-[#7A5316] text-white border-[#7A5316] ring-[#7A5316]/40", idle: "text-[#7A5316]" },
  { key: "blocate", label: "Dosare Blocate", emoji: "⚠️", active: "bg-[#4A5568] text-white border-[#4A5568] ring-[#4A5568]/40", idle: "text-[#4A5568]" },
  { key: "masini_schimb", label: "Auto Schimb", emoji: "🚗", active: "bg-[#A36C1D] text-white border-[#A36C1D] ring-[#A36C1D]/40", idle: "text-[#A36C1D]" },
  { key: "piese", label: "Piese Neprogramate", emoji: "📦", active: "bg-[#3E6B45] text-white border-[#3E6B45] ring-[#3E6B45]/40", idle: "text-[#3E6B45]" },
];

export default function AlerteModal({
  claims = [],
  alertBuckets = null,
  initialTab = "stagnate",
  pragRidicare = 3,
  pragInactivitate = 7,
  onClose,
  onOpenClaim,
  onPatchClaim,
  onNotify,
}) {
  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const [activeTab, setActiveTab] = useState(() => {
    const n = normalizeAlertTab(initialTab);
    return !n || n === "toate" ? "stagnate" : n;
  });

  useEffect(() => {
    const n = normalizeAlertTab(initialTab);
    if (n && n !== "toate") setActiveTab(n);
  }, [initialTab]);

  const ackAlert = async (e, claimId) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    const ok = await onPatchClaim(claimId, { alerteAck: true });
    if (onNotify) onNotify(ok ? "Alerta marcată ca rezolvată." : "Eroare la marcarea alertei.", ok ? "success" : "error");
  };

  const openClaim = (c) => {
    onClose?.();
    onOpenClaim?.(c);
  };

  const list = buckets.byType[activeTab] || [];
  const totalAlertsCount = buckets.totalAlertsCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-4xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

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
              <p className="text-[11.5px] text-white/70">Aceleași categorii ca în Brief — alege o categorie pentru acțiune</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="bg-[#FAF8F5] border-b border-[#DAD4C6] px-3 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 shrink-0 text-center">
          {CATEGORY_META.map((cat) => {
            const active = activeTab === cat.key;
            const count = buckets.counts[cat.key] || 0;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveTab(cat.key)}
                className={`p-2 rounded-xl border transition-all ${
                  active
                    ? `${cat.active} shadow-md ring-2`
                    : "bg-white border-[#DAD4C6] hover:bg-[#FAF8F5] text-[#23282E]"
                }`}
              >
                <span className={`text-[10px] font-extrabold uppercase block truncate ${active ? "text-white" : cat.idle}`}>
                  {cat.emoji} {cat.label}
                </span>
                <span className="font-extrabold text-[17px] block mt-0.5">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          {list.length === 0 ? (
            <div className="text-[13px] text-[#8A8375] italic py-8 text-center bg-white rounded-xl border border-[#DAD4C6]">
              Nicio alertă în această categorie.
            </div>
          ) : (
            list.map((c) => {
              if (activeTab === "stagnate") {
                const st = getStatusDefinition(c.status);
                const daysInStage = getDaysInStage(c);
                return (
                  <div
                    key={c.id}
                    onClick={() => openClaim(c)}
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
                        </div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client || "Client neintrodus"} · {c.numarInmatriculare || "—"} · {c.marcaModel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11.5px] font-bold text-[#8A8375] bg-[#EFEAE1] px-2 py-1 rounded-md">{st.label}</span>
                      <ChevronRight size={18} className="text-[#8A8375]" />
                    </div>
                  </div>
                );
              }

              if (activeTab === "accept_plata") {
                return (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-[#C6D2E1] rounded-xl p-3 hover:border-[#2C4160] hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#2C4160]/10 text-[#2C4160] flex items-center justify-center shrink-0">
                        <ShoppingCart size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"}</span>
                          <Pill tone="amber">{c.tipAsigurare}</Pill>
                        </div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare} · {c.asigurator}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => openClaim(c)} className="px-2.5 py-1.5 bg-[#2C4160] text-white rounded-md text-[12px] font-bold">
                        Comandă Piese
                      </button>
                      <button type="button" onClick={(e) => ackAlert(e, c.id)} className="px-2 py-1.5 bg-[#3B5166] text-white rounded-md text-[12px] font-bold hover:bg-[#2C4160]">
                        Marchează rezolvat
                      </button>
                    </div>
                  </div>
                );
              }

              if (activeTab === "neridicate") {
                return (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-[#F3E5CD] rounded-xl p-3 hover:border-[#C98A2B] hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#C98A2B]/15 text-[#7A5316] flex items-center justify-center shrink-0">
                        <Car size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"}</div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare} · Tel: {c.telefonClient || "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={(e) => ackAlert(e, c.id)} className="px-2 py-1.5 bg-[#3B5166] text-white rounded-md text-[12px] font-bold">
                        Marchează rezolvat
                      </button>
                      <button type="button" onClick={() => openClaim(c)} className="p-1.5 rounded hover:bg-[#F4F1EA]">
                        <ChevronRight size={18} className="text-[#8A8375]" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (activeTab === "inactivitate") {
                const st = getStatusDefinition(c.status);
                const daysInactive = getDaysSinceLastActivity(c);
                return (
                  <div
                    key={c.id}
                    onClick={() => openClaim(c)}
                    className="flex items-center justify-between bg-white border border-[#E8DCC4] rounded-xl p-3 hover:border-[#7A5316] hover:shadow-sm cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#7A5316]/10 text-[#7A5316] flex flex-col items-center justify-center shrink-0">
                        <span className="font-mono font-black text-[14px] leading-none">{daysInactive}</span>
                        <span className="text-[9px] font-bold uppercase">zile</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"}</span>
                          <span className="text-[11px] font-mono font-bold text-[#7A5316] bg-[#F7EAD3] px-2 py-0.5 rounded-md">{st.label}</span>
                        </div>
                        <div className="text-[12px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#8A8375] shrink-0" />
                  </div>
                );
              }

              if (activeTab === "blocate") {
                return (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-[#D5DCB4] rounded-xl p-3 hover:border-[#3B5166] hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#3B5166]/10 text-[#3B5166] flex items-center justify-center shrink-0">
                        <ShieldAlert size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"} · {c.numarInmatriculare}</div>
                        <div className="text-[12px] text-[#B23A2E] font-medium truncate">Motiv: {c.motivBlocare || "Nespecificat"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => ackAlert(e, c.id)} className="px-2 py-1.5 bg-[#3B5166] text-white rounded-md text-[12px] font-bold">
                        Marchează rezolvat
                      </button>
                      <button type="button" onClick={() => openClaim(c)} className="p-1.5 rounded hover:bg-[#F4F1EA]">
                        <ChevronRight size={18} className="text-[#8A8375]" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (activeTab === "masini_schimb") {
                return (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-[#F3E5CD] rounded-xl p-3 hover:border-[#A36C1D] hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#C98A2B]/15 text-[#7A5316] flex items-center justify-center shrink-0">
                        <Car size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"} · {c.numarInmatriculare}</div>
                        <div className="text-[12px] text-[#7A5316] truncate">
                          {c.masinaSchimb} · {c.zile}z / limită {c.zileChirieAudatex}z
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => ackAlert(e, c.id)} className="px-2 py-1.5 bg-[#3B5166] text-white rounded-md text-[12px] font-bold">
                        Marchează rezolvat
                      </button>
                      <button type="button" onClick={() => openClaim(c)} className="p-1.5 rounded hover:bg-[#F4F1EA]">
                        <ChevronRight size={18} className="text-[#8A8375]" />
                      </button>
                    </div>
                  </div>
                );
              }

              // piese
              return (
                <div key={c.id} className="flex items-center justify-between bg-white border border-[#D5E8D8] rounded-xl p-3 hover:border-[#3E6B45] hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#3E6B45]/10 text-[#3E6B45] flex items-center justify-center shrink-0">
                      <Boxes size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] text-[#23282E]">{c.numarDosar || "(fără nr.)"} · {c.numarInmatriculare}</div>
                      <div className="text-[12px] text-[#6B6558] truncate">Piese sosite — fără programare atelier</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={(e) => ackAlert(e, c.id)} className="px-2 py-1.5 bg-[#3B5166] text-white rounded-md text-[12px] font-bold">
                      Marchează rezolvat
                    </button>
                    <button type="button" onClick={() => openClaim(c)} className="p-1.5 rounded hover:bg-[#F4F1EA]">
                      <PackageCheck size={18} className="text-[#8A8375]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[#DAD4C6] shrink-0 text-[12px]">
          <span className="text-[#8A8375]">Centru Alerte · aceleași reguli ca Brief</span>
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
