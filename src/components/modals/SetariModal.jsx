import React, { useState, useMemo } from "react";
import {
  X, Settings, AlertTriangle, PackageCheck, ShieldAlert, CheckCircle2,
  CalendarClock, Percent, Database, Bell, Wrench, ChevronRight, Car
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { isReadyForPickupOverdue, isStageOverdue, getDaysInStage } from "../../utils/alertUtils";
import Pill from "../common/Pill";

export default function SetariModal({
  claims,
  capacitateZilnica,
  pragRidicare,
  onSaveCapacitate,
  onSavePrag,
  onClose,
  onOpenClaim,
  onNotify,
  userEmail
}) {
  const [activeTab, setActiveTab] = useState("alerte"); // "alerte" | "config" | "sistem"

  // Local state form for thresholds
  const [capacitate, setCapacitate] = useState(capacitateZilnica || 3);
  const [prag, setPrag] = useState(pragRidicare || 3);
  const [tvaDefault, setTvaDefault] = useState(19);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtered Alert Lists
  const overdues = useMemo(() => claims.filter(isStageOverdue), [claims]);
  const unpicked = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, prag)), [claims, prag]);
  const blocked = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (capacitate !== capacitateZilnica) {
        await onSaveCapacitate(Number(capacitate));
      }
      if (prag !== pragRidicare) {
        await onSavePrag(Number(prag));
      }
      onNotify("Setările au fost salvate cu succes!", "success");
    } catch (err) {
      onNotify("Eroare la salvarea setărilor: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-3xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C2127] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C98A2B] flex items-center justify-center text-white">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[15px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Centru de Setări &amp; Alerte
              </h2>
              <p className="text-[11px] text-white/60">Configurare parametri sistem și gestionare alerte active</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DAD4C6] bg-[#FAF8F5] px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          {[
            { id: "alerte", label: "Alerte Active", icon: Bell, badge: overdues.length + unpicked.length + blocked.length },
            { id: "config", label: "Parametri & Praguri", icon: Wrench },
            { id: "sistem", label: "Sistem & Diagnoză", icon: Database },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-bold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-[#C98A2B] text-[#C98A2B] bg-white rounded-t-lg shadow-xs"
                    : "border-transparent text-[#6B6558] hover:text-[#23282E]"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10.5px] font-black rounded-full ${active ? "bg-[#C98A2B] text-white" : "bg-[#B23A2E] text-white"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">

          {/* TAB 1: ALERTE ACTIVE CENTRALIZATE */}
          {activeTab === "alerte" && (
            <div className="space-y-5">

              {/* 1. Termene depășite */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <div className="flex items-center gap-2 text-[#B23A2E] font-bold text-[13.5px]">
                    <AlertTriangle size={17} />
                    <span>Dosare cu termene depășite pe etapă ({overdues.length})</span>
                  </div>
                  <span className="text-[11px] text-[#8A8375] font-semibold">Alertă Critică</span>
                </div>

                {overdues.length === 0 ? (
                  <div className="text-[12px] text-[#8A8375] italic py-3 text-center">
                    🎉 Felicitări! Nu există niciun dosar cu termen depășit.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {overdues.map((c) => {
                      const st = getStatusDefinition(c.status);
                      const daysInStage = getDaysInStage(c);
                      return (
                        <div
                          key={c.id}
                          onClick={() => { onClose(); onOpenClaim(c); }}
                          className="flex items-center justify-between bg-[#FDF8F7] border border-[#F4D7D3] rounded-lg p-2.5 hover:border-[#B23A2E] cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#B23A2E]/10 text-[#B23A2E] flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                              {daysInStage}z
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[13px] text-[#23282E] group-hover:text-[#B23A2E]">{c.numarDosar || "(fără nr.)"}</span>
                                <Pill tone="amber">{c.tipAsigurare}</Pill>
                              </div>
                              <div className="text-[11.5px] text-[#6B6558] truncate">{c.client || "Client neintrodus"} · {c.numarInmatriculare || "—"}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-[#8A8375]">Etapa: {st.label}</span>
                            <ChevronRight size={16} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Mașini gata dar neridicate */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <div className="flex items-center gap-2 text-[#C98A2B] font-bold text-[13.5px]">
                    <PackageCheck size={17} />
                    <span>Mașini gata de ridicare neridicate &gt; {prag} zile ({unpicked.length})</span>
                  </div>
                  <span className="text-[11px] text-[#8A8375] font-semibold">Alertă Ridicare</span>
                </div>

                {unpicked.length === 0 ? (
                  <div className="text-[12px] text-[#8A8375] italic py-3 text-center">
                    Nu există mașini gata de ridicare care să depășească pragul de {prag} zile.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {unpicked.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { onClose(); onOpenClaim(c); }}
                        className="flex items-center justify-between bg-[#FBF7F0] border border-[#F3E5CD] rounded-lg p-2.5 hover:border-[#C98A2B] cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#C98A2B]/15 text-[#7A5316] flex items-center justify-center shrink-0">
                            <Car size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[13px] text-[#23282E] group-hover:text-[#C98A2B]">{c.numarDosar || "(fără nr.)"}</span>
                              <span className="text-[11px] font-mono font-bold text-[#7A5316] bg-[#F7EAD3] px-1.5 py-0.5 rounded">Gata de ridicare</span>
                            </div>
                            <div className="text-[11.5px] text-[#6B6558] truncate">{c.client} · {c.numarInmatriculare}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ChevronRight size={16} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Dosare blocate */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <div className="flex items-center gap-2 text-[#3B5166] font-bold text-[13.5px]">
                    <ShieldAlert size={17} />
                    <span>Dosare Blocate / Litigiu ({blocked.length})</span>
                  </div>
                  <span className="text-[11px] text-[#8A8375] font-semibold">Status Special</span>
                </div>

                {blocked.length === 0 ? (
                  <div className="text-[12px] text-[#8A8375] italic py-3 text-center">
                    Nu există dosare blocate în acest moment.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {blocked.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { onClose(); onOpenClaim(c); }}
                        className="flex items-center justify-between bg-[#F4F6F8] border border-[#D5DCB4] rounded-lg p-2.5 hover:border-[#3B5166] cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#3B5166]/10 text-[#3B5166] flex items-center justify-center shrink-0 font-bold">
                            ⚠️
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[13px] text-[#23282E] group-hover:text-[#3B5166]">{c.numarDosar || "(fără nr.)"} · {c.numarInmatriculare}</div>
                            <div className="text-[11.5px] text-[#B23A2E] font-medium truncate">Motiv: {c.motivBlocare || "Nespecificat"}</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-[#8A8375] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETRI & CONFIGURARE */}
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <CalendarClock size={16} className="text-[#C98A2B]" /> Praguri Alerte &amp; Capacitate Atelier
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prag mașini neridicate */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-3">
                    <label className="block text-[12px] font-bold text-[#23282E] mb-1">
                      Prag alertă mașini gata de ridicare (zile)
                    </label>
                    <p className="text-[11px] text-[#8A8375] mb-2">
                      După câte zile de la finalizarea reparației este declanșată alerta portocalie pentru mașinile neridicate de client.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-md font-bold text-[14px] bg-white"
                        value={prag}
                        onChange={(e) => setPrag(e.target.value)}
                      />
                      <span className="text-[12px] font-semibold text-[#6B6558]">zile</span>
                    </div>
                  </div>

                  {/* Capacitate zilnică programator */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-3">
                    <label className="block text-[12px] font-bold text-[#23282E] mb-1">
                      Capacitate maximă programări pe zi
                    </label>
                    <p className="text-[11px] text-[#8A8375] mb-2">
                      Numărul maxim de mașini ce pot fi programate într-o singură zi în calendarul atelierului.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-md font-bold text-[14px] bg-white"
                        value={capacitate}
                        onChange={(e) => setCapacitate(e.target.value)}
                      />
                      <span className="text-[12px] font-semibold text-[#6B6558]">mașini / zi</span>
                    </div>
                  </div>
                </div>

                {/* TVA Implicit */}
                <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-3">
                  <label className="block text-[12px] font-bold text-[#23282E] mb-1">
                    Cotă TVA implicită (%)
                  </label>
                  <p className="text-[11px] text-[#8A8375] mb-2">
                    Procentul de TVA aplicat automat la calculul veniturilor financiare și al devizelor.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-24 p-2 border border-[#DAD4C6] rounded-md font-bold text-[14px] bg-white"
                      value={tvaDefault}
                      onChange={(e) => setTvaDefault(e.target.value)}
                    />
                    <span className="text-[12px] font-semibold text-[#6B6558]">%</span>
                  </div>
                </div>

                {/* Notificări vizuale */}
                <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="block text-[12px] font-bold text-[#23282E]">Evidențiere automată dosare critice</span>
                      <span className="block text-[11px] text-[#8A8375]">Bara superioară va semnaliza dosarele cu întârziere</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C98A2B]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded-lg text-[13px] shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Salvează Setările
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SISTEM & DIAGNOZĂ */}
          {activeTab === "sistem" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Database size={16} className="text-[#3B5166]" /> Informații Conexiune &amp; Supabase
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg">
                    <span className="text-[#8A8375] block text-[10.5px] uppercase font-bold">Utilizator Logat</span>
                    <span className="font-bold text-[#23282E]">{userEmail || "—"}</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg">
                    <span className="text-[#8A8375] block text-[10.5px] uppercase font-bold">Status Conexiune DB</span>
                    <span className="font-bold text-[#3E6B45] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#3E6B45] inline-block animate-ping" /> Conectat Supabase Cloud
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg">
                    <span className="text-[#8A8375] block text-[10.5px] uppercase font-bold">Total Dosare Înregistrate</span>
                    <span className="font-bold text-[#23282E]">{claims.length} dosare</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg">
                    <span className="text-[#8A8375] block text-[10.5px] uppercase font-bold">Versiune Aplicație</span>
                    <span className="font-bold text-[#23282E]">v1.4.0 (Mobile Ready)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[#DAD4C6] shrink-0 text-[12px]">
          <span className="text-[#8A8375]">Workflow Dosare Daună</span>
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
