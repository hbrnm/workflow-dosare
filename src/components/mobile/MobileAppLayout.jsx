import React, { useState, useEffect, useMemo } from "react";
import { Settings, LogOut } from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import MobileSearchBar from "./MobileSearchBar";
import { saveMobileTab, softHaptic } from "../../utils/mobilePrefs";
import { claimMatchesSearch, scrollToFirstHighlight } from "../../utils/searchUtils";

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
  captureFocusClaimId = null,
  onCaptureFocusConsumed,
  search = "",
  setSearch,
  highlightClaimIds = null,
}) {
  // Home mobil = Brief; navigarea spre Foto/Dosare/Programări e din Acces rapid.
  const [activeTab, setActiveTab] = useState("brief");
  const [focusClaimId, setFocusClaimId] = useState(null);

  useEffect(() => {
    saveMobileTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setActiveTab("capture");
    onCaptureFocusConsumed?.();
  }, [captureFocusClaimId, onCaptureFocusConsumed]);

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

  const goBrief = () => handleTabChange("brief");

  return (
    <div
      className="mobile-shell app-shell fixed inset-0 flex flex-col overflow-hidden"
    >
      <header className="m-header-bar px-3.5 py-2.5 flex items-center justify-between shrink-0 border-b select-none z-30">
        <button
          type="button"
          onClick={goBrief}
          className="flex items-center gap-2 min-w-0 text-left m-press"
          title="Brief"
          aria-label="Deschide Brief"
        >
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-7 h-7 rounded-lg object-contain bg-white/10 shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] text-[var(--app-text-strong)] shadow-xs shrink-0 border border-[var(--app-border)] bg-[var(--app-surface-2)]"
            >
              {(branding?.atelierShort || "WD").slice(0, 2)}
            </div>
          )}
          <div className="min-w-0">
            <span className="m-display font-extrabold text-[13.5px] tracking-tight block truncate">
              {branding?.atelierNume || "Dosare Daună"}
            </span>
            <span className="text-[10px] opacity-70 block truncate max-w-[150px]">
              {activeTab === "brief"
                ? (totalAlertsCount ? `${totalAlertsCount} alerte` : "Brief")
                : (userEmail || "Operator")}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
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
            homeStyle="inbox"
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

      <div className="mobile-bottom-chrome mobile-bottom-chrome--float fixed bottom-0 left-0 right-0 z-50">
        <MobileSearchBar value={search} onChange={handleSearchChange} />
      </div>
    </div>
  );
}
