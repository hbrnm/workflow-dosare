import React, { useState, useEffect, useMemo } from "react";
import {
  Settings, LogOut, Monitor, X, Lightbulb,
  Camera, BarChart3, List, CalendarClock,
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import MobileSearchBar from "./MobileSearchBar";
import {
  loadMobileTab,
  saveMobileTab,
  isMobileCoachDismissed,
  dismissMobileCoach,
  softHaptic,
} from "../../utils/mobilePrefs";
import { claimMatchesSearch, scrollToFirstHighlight } from "../../utils/searchUtils";

const MOBILE_TABS = [
  { id: "capture", label: "Foto & Doc", Icon: Camera },
  { id: "brief", label: "Brief", Icon: BarChart3 },
  { id: "dosare", label: "Dosare", Icon: List },
  { id: "programari", label: "Programări", Icon: CalendarClock },
];

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
  search = "",
  setSearch,
  highlightClaimIds = null,
}) {
  const [activeTab, setActiveTab] = useState(() => loadMobileTab());
  const [focusClaimId, setFocusClaimId] = useState(null);
  const [showCoach, setShowCoach] = useState(() => !isMobileCoachDismissed());

  useEffect(() => {
    saveMobileTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setActiveTab("capture");
    onCaptureFocusConsumed?.();
  }, [captureFocusClaimId, onCaptureFocusConsumed]);

  const tabs = useMemo(() => MOBILE_TABS.map((t) => ({
    ...t,
    badge: t.id === "brief" ? totalAlertsCount : 0,
  })), [totalAlertsCount]);

  const filteredClaims = useMemo(() => {
    const q = search.trim();
    if (!q) return claims;
    return claims.filter((c) => claimMatchesSearch(c, q));
  }, [claims, search]);

  const handleSearchChange = (value) => {
    setSearch?.(value);
  };

  useEffect(() => {
    if (!highlightClaimIds?.size) return;
    const t = window.setTimeout(() => scrollToFirstHighlight(highlightClaimIds, "mobile-claim"), 150);
    return () => window.clearTimeout(t);
  }, [highlightClaimIds]);

  const handleTabChange = (id) => {
    softHaptic(8);
    setActiveTab(id);
  };

  const handleDismissCoach = () => {
    dismissMobileCoach();
    setShowCoach(false);
  };

  return (
    <div
      className="mobile-shell app-shell fixed inset-0 flex flex-col overflow-hidden"
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
              className="m-press p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
              title="Mod desktop"
            >
              <Monitor size={16} />
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="m-press p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
              title="Setări"
            >
              <Settings size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="m-press p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-white/10 transition-colors"
            title="Deconectare"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="mobile-main flex-1 min-h-0 p-3 overflow-y-auto scrollbar-thin">
        {showCoach && (
          <div className="m-coach mb-3 rounded-2xl border border-[#DAD4C6] bg-white p-3.5 shadow-sm flex gap-3 items-start">
            <div
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--m-accent)" }}
            >
              <Lightbulb size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-display font-extrabold text-[13px] text-[#23282E]">Pe teren, rapid</p>
              <p className="text-[11.5px] text-[#6B6558] mt-0.5 leading-snug">
                Caută nr. auto → selectează dosarul → <strong>Fotografiază</strong>.
                Deschide un dosar pentru status, telefon și pasul următor.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissCoach}
              className="m-press shrink-0 p-1.5 rounded-lg text-[#8A8375] hover:bg-[#FAF8F5]"
              aria-label="Închide tipul"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {activeTab === "capture" ? (
          <MobileQuickCapture
            claims={filteredClaims}
            searchQuery={search}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
            focusClaimId={focusClaimId}
            onFocusClaimConsumed={() => setFocusClaimId(null)}
            highlightClaimIds={highlightClaimIds}
          />
        ) : activeTab === "brief" ? (
          <MobileBrief
            claims={filteredClaims}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            onGoTab={handleTabChange}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            alertBuckets={alertBuckets}
            onPatchClaim={onPatchClaim}
            onNotify={onNotify}
            homeStyle="list"
            atelierNume={branding?.atelierNume}
            searchActive={Boolean(search.trim())}
          />
        ) : activeTab === "dosare" ? (
          <MobileClaimsList
            claims={filteredClaims}
            allClaimsCount={claims.length}
            searchQuery={search}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            atelierNume={branding?.atelierNume}
            onNotify={onNotify}
            highlightClaimIds={highlightClaimIds}
          />
        ) : activeTab === "programari" ? (
          <MobileProgramari
            claims={filteredClaims}
            onOpen={onOpenClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
            searchActive={Boolean(search.trim())}
          />
        ) : null}
      </main>

      <div className="mobile-bottom-chrome fixed bottom-0 left-0 right-0 z-50 flex flex-col">
        <MobileSearchBar value={search} onChange={handleSearchChange} />
        <nav
          className="m-nav-bar border-t px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid grid-cols-4 gap-0 select-none"
          aria-label="Navigare mobilă"
        >
        {tabs.map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`m-nav-item relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 ${
                active ? "is-active" : "font-semibold opacity-80 hover:opacity-100"
              }`}
            >
              <span className="m-nav-icon relative inline-flex h-5 w-5 items-center justify-center">
                <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                {badge > 0 && (
                  <span
                    className="absolute -right-2.5 -top-1.5 min-w-[14px] h-3.5 px-1 rounded-full text-white text-[8px] font-black flex items-center justify-center leading-none"
                    style={{ backgroundColor: "var(--m-danger)" }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="m-nav-label w-full truncate text-center text-[9.5px] leading-tight tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
        </nav>
      </div>
    </div>
  );
}
