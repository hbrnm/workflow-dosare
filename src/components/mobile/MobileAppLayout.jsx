import React, { useState } from "react";
import {
  ShieldCheck, Camera, FileText, List, Settings, LogOut,
  BarChart3, Plus, User, Smartphone, Monitor
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";

export default function MobileAppLayout({
  claims,
  session,
  userEmail,
  onOpenClaim,
  onNewClaim,
  onPatchClaim,
  canEditFn,
  onNotify,
  onLogout,
  onOpenSettings,
  pragRidicare,
  onSwitchToDesktop,
}) {
  const [activeTab, setActiveTab] = useState("capture"); // "capture" | "brief" | "dosare"

  return (
    <div className="flex flex-col h-screen w-screen bg-[#EFEAE1] overflow-hidden font-sans text-[#23282E]">
      
      {/* HEADER MOBIL SUPERIOR */}
      <header className="bg-[#1C2127] text-white px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-md border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C98A2B] flex items-center justify-center font-extrabold text-[12px] text-white shadow-xs">
            <ShieldCheck size={16} />
          </div>
          <div>
            <span className="font-extrabold text-[13.5px] tracking-tight block text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Dosare Daună
            </span>
            <span className="text-[10px] text-[#A69F91] block truncate max-w-[150px]">
              {userEmail || "Operator"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Comutare pe versiunea completă Web */}
          <button
            type="button"
            onClick={onSwitchToDesktop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-[10.5px] font-bold transition-colors border border-white/10"
            title="Comută pe versiunea Web completă"
          >
            <Monitor size={12} />
            <span className="hidden sm:inline">Mod Web</span>
          </button>

          {/* Delogare */}
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Deconectare"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ZONA DE CONȚINUT MOBIL (SCROLLABILĂ) */}
      <main className="flex-1 min-h-0 p-3 overflow-y-auto">
        {activeTab === "capture" ? (
          <MobileQuickCapture
            claims={claims}
            onOpen={onOpenClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
          />
        ) : activeTab === "brief" ? (
          <MobileBrief
            claims={claims}
            onOpen={onOpenClaim}
            pragRidicare={pragRidicare}
          />
        ) : activeTab === "dosare" ? (
          <MobileClaimsList
            claims={claims}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            canEditFn={canEditFn}
          />
        ) : null}
      </main>

      {/* BARA DE NAVIGARE NATIVĂ ÎN PARTEA DE JOS (BOTTOM DOCK) */}
      <nav className="bg-[#1C2127] text-white border-t border-white/10 px-2 py-1.5 flex items-center justify-around shrink-0 select-none shadow-lg z-40">
        
        {/* TAB 1: CAPTURĂ & SCANER */}
        <button
          type="button"
          onClick={() => setActiveTab("capture")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "capture" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <Camera size={20} />
          <span className="text-[10px]">Captură &amp; Foto</span>
        </button>

        {/* TAB 2: BRIEF MOBIL */}
        <button
          type="button"
          onClick={() => setActiveTab("brief")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "brief" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <BarChart3 size={20} />
          <span className="text-[10px]">Brief Alerte</span>
        </button>

        {/* TAB 3: DOSARE */}
        <button
          type="button"
          onClick={() => setActiveTab("dosare")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "dosare" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <List size={20} />
          <span className="text-[10px]">Dosare</span>
        </button>

        {/* TAB 4: SETĂRI */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-white/60 font-semibold hover:text-white transition-all"
        >
          <Settings size={20} />
          <span className="text-[10px]">Setări</span>
        </button>

      </nav>

    </div>
  );
}
