import React, { useState } from "react";
import {
  X, Settings, CheckCircle2, CalendarClock, Database, Wrench, Percent
} from "lucide-react";

export default function SetariModal({
  claims = [],
  capacitateZilnica,
  pragRidicare,
  onSaveCapacitate,
  onSavePrag,
  onClose,
  onNotify,
  userEmail
}) {
  const [activeTab, setActiveTab] = useState("config"); // "config" | "sistem"

  // Local state form for thresholds
  const [capacitate, setCapacitate] = useState(capacitateZilnica || 3);
  const [prag, setPrag] = useState(pragRidicare || 3);
  const [tvaDefault, setTvaDefault] = useState(19);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

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
      onClose();
    } catch (err) {
      onNotify("Eroare la salvarea setărilor: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full max-w-2xl rounded-xl shadow-2xl border border-[#DAD4C6] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C2127] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C98A2B] flex items-center justify-center text-white">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[15.5px] tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Setări Sistem &amp; Configurare
              </h2>
              <p className="text-[11px] text-white/60">Configurare parametri aplicație și diagnoză</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DAD4C6] bg-[#FAF8F5] px-4 pt-2 gap-2 shrink-0">
          {[
            { id: "config", label: "Parametri & Praguri", icon: Wrench },
            { id: "sistem", label: "Sistem & Diagnoză", icon: Database },
          ].map(({ id, label, icon: Icon }) => {
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
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

          {/* TAB 1: PARAMETRI & CONFIGURARE */}
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
                      Prag alertă mașini neridicate (zile)
                    </label>
                    <p className="text-[11px] text-[#8A8375] mb-2">
                      După câte zile de la finalizare se declanșează alerta portocalie.
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
                      Numărul maxim de mașini ce pot fi programate pe o zi în atelier.
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
                    Procentul de TVA aplicat automat la calculul veniturilor financiare.
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
                      <span className="block text-[12px] font-bold text-[#23282E]">Semnalizare vizuală alerte în antet</span>
                      <span className="block text-[11px] text-[#8A8375]">Bara superioară va evidenția dosarele cu întârziere sau fără piese</span>
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

          {/* TAB 2: SISTEM & DIAGNOZĂ */}
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
