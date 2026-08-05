import React, { useState, useEffect, useMemo } from "react";
import {
  Settings, LogOut, Monitor,
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import { getMobileTheme } from "../../constants/mobileThemes";
import "../../styles/mobileThemes.css";

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
  branding = null,
  onSwitchToDesktop,
  captureFocusClaimId = null,
  onCaptureFocusConsumed,
  themeId = "atelier",
}) {
  const [activeTab, setActiveTab] = useState("capture"); // "capture" | "brief" | "dosare" | "programari"
  const [focusClaimId, setFocusClaimId] = useState(null);

  const theme = useMemo(() => getMobileTheme(themeId), [themeId]);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setActiveTab("capture");
    onCaptureFocusConsumed?.();
  }, [captureFocusClaimId, onCaptureFocusConsumed]);

  const shellStyle = useMemo(() => {
    const vars = { ...(theme.vars || {}) };
    if (theme.fonts?.body) vars["--m-font-body"] = theme.fonts.body;
    if (theme.fonts?.display) vars["--m-font-display"] = theme.fonts.display;
    return vars;
  }, [theme]);

  const tabs = useMemo(() => ([
    { id: "capture", label: theme.labels.capture, Icon: theme.icons.capture },
    { id: "brief", label: theme.labels.brief, Icon: theme.icons.brief, badge: totalAlertsCount },
    { id: "dosare", label: theme.labels.dosare, Icon: theme.icons.dosare },
    { id: "programari", label: theme.labels.programari, Icon: theme.icons.programari },
  ]), [theme, totalAlertsCount]);

  return (
    <div
      className="mobile-shell fixed inset-0 flex flex-col overflow-hidden"
      data-mtheme={theme.id}
      data-nav={theme.navStyle}
      data-header={theme.headerStyle}
      style={shellStyle}
    >
      <header className="m-header-bar px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-md border-b select-none z-30">
        <div className="flex items-center gap-2 min-w-0">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-7 h-7 rounded-lg object-contain bg-white/10 shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] text-white shadow-xs shrink-0"
              style={{ backgroundColor: branding?.accentColor || "var(--m-accent)" }}
            >
              {(branding?.atelierShort || "WD").slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <span className="m-display font-extrabold text-[13.5px] tracking-tight block truncate">
              {branding?.atelierNume || "Dosare Daună"}
            </span>
            <span className="text-[10px] opacity-70 block truncate max-w-[150px]">
              {userEmail || "Operator"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onSwitchToDesktop && (
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
              title="Mod desktop"
            >
              <Monitor size={16} />
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
              title="Setări"
            >
              <Settings size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
            title="Deconectare"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

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
            atelierNume={branding?.atelierNume}
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

      <nav
        className="m-nav-bar fixed bottom-0 left-0 right-0 z-50 border-t px-2 py-2 flex items-center justify-around select-none shadow-2xl backdrop-blur-md"
        aria-label="Navigare mobilă"
      >
        {tabs.map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`m-nav-item relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                active ? "is-active scale-105" : "font-semibold opacity-80 hover:opacity-100"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
              {badge > 0 && (
                <span
                  className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                  style={{ backgroundColor: "var(--m-danger)" }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
