import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Camera, List, Settings, LogOut,
  BarChart3, Monitor, CalendarClock
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";

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
  pragInactivitate = 7,
  alertBuckets = null,
  totalAlertsCount = 0,
  onSwitchToDesktop,
  captureFocusClaimId = null,
  onCaptureFocusConsumed,
}) {
  const [activeTab, setActiveTab] = useState("capture"); // "capture" | "brief" | "dosare" | "programari"
  const [focusClaimId, setFocusClaimId] = useState(null);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setActiveTab("capture");
    onCaptureFocusConsumed?.();
  }, [captureFocusClaimId, onCaptureFocusConsumed]);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#EFEAE1] overflow-hidden font-sans text-[#23282E]">
      
      {/* HEADER MOBIL SUPERIOR */}
      <header className="bg-[#1C2127] text-white px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-md border-b border-white/10 select-none z-30">
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
          {onSwitchToDesktop && (
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Mod desktop"
            >
              <Monitor size={16} />
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Setări"
            >
              <Settings size={16} />
            </button>
          )}
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

      {/* ZONA DE CONȚINUT MOBIL (SCROLLABILĂ CU PADDING INFERIOR PENTRU BARA DE JOS) */}
      <main className="flex-1 min-h-0 p-3 pb-24 overflow-y-auto scrollbar-thin">
        {activeTab === "capture" ? (
          <MobileQuickCapture
            claims={claims}
            onOpen={onOpenClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
            focusClaimId={focusClaimId}
            onFocusClaimConsumed={() => setFocusClaimId(null)}
          />
        ) : activeTab === "brief" ? (
          <MobileBrief
            claims={claims}
            onOpen={onOpenClaim}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            alertBuckets={alertBuckets}
            onPatchClaim={onPatchClaim}
            onNotify={onNotify}
          />
        ) : activeTab === "dosare" ? (
          <MobileClaimsList
            claims={claims}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            canEditFn={canEditFn}
          />
        ) : activeTab === "programari" ? (
          <MobileProgramari
            claims={claims}
            onOpen={onOpenClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
          />
        ) : null}
      </main>

      {/* BARA DE NAVIGARE NATIVĂ PERMANENT FIXATĂ ÎN PARTEA DE JOS */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1C2127] text-white border-t border-white/10 px-2 py-2 flex items-center justify-around select-none shadow-2xl backdrop-blur-md">
        
        <button
          type="button"
          onClick={() => setActiveTab("capture")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "capture" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <Camera size={20} />
          <span className="text-[10px]">Foto &amp; Doc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("brief")}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "brief" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <BarChart3 size={20} />
          <span className="text-[10px]">Brief Alerte</span>
          {totalAlertsCount > 0 && (
            <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#B23A2E] text-white text-[9px] font-black flex items-center justify-center">
              {totalAlertsCount > 99 ? "99+" : totalAlertsCount}
            </span>
          )}
        </button>

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

        <button
          type="button"
          onClick={() => setActiveTab("programari")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === "programari" ? "text-[#C98A2B] font-extrabold scale-105" : "text-white/60 font-semibold hover:text-white"
          }`}
        >
          <CalendarClock size={20} />
          <span className="text-[10px]">Programari</span>
        </button>

      </nav>

    </div>
  );
}
