import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings, LogOut, Camera, BarChart3, List, CalendarClock, Menu,
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import MobileSearchBar from "./MobileSearchBar";
import { saveMobileTab, softHaptic } from "../../utils/mobilePrefs";
import { claimMatchesSearch, scrollToFirstHighlight } from "../../utils/searchUtils";

const NAV_ITEMS = [
  { id: "brief", label: "Brief", Icon: BarChart3 },
  { id: "capture", label: "Foto & Doc", Icon: Camera },
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
  onOpenAlerts,
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
  onMobileShellLockChange,
  hideBottomChrome = false,
}) {
  // Home mobil = Brief; navigarea e din brand-ul floating.
  const [activeTab, setActiveTab] = useState("brief");
  const [focusClaimId, setFocusClaimId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    saveMobileTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setActiveTab("capture");
    setMenuOpen(false);
    onCaptureFocusConsumed?.();
  }, [captureFocusClaimId, onCaptureFocusConsumed]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
    setMenuOpen(false);
  };

  const atelierName = branding?.atelierNume || "Dosare Daună";

  return (
    <div
      className={`mobile-shell app-shell fixed inset-0 flex flex-col overflow-hidden ${
        hideBottomChrome ? "is-chrome-hidden" : ""
      }`}
    >
      {!hideBottomChrome && (
      <div className="m-float-brand-wrap" ref={menuRef}>
        <button
          type="button"
          className={`m-float-brand m-float-brand--logo m-press ${menuOpen ? "is-open" : ""}`}
          onClick={() => {
            softHaptic(8);
            setMenuOpen((v) => !v);
          }}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Meniu ${atelierName}`}
          title={atelierName}
        >
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="m-float-brand-mark object-contain"
            />
          ) : (
            <span className="m-float-brand-mark m-float-brand-icon" aria-hidden="true">
              <Menu size={18} strokeWidth={2.25} />
            </span>
          )}
        </button>

        {menuOpen ? (
          <div className="m-float-menu" role="menu">
            <div className="m-float-menu-label">Navigare</div>
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              const badge = id === "brief" ? totalAlertsCount : 0;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`m-float-menu-item ${active ? "is-active" : ""}`}
                  onClick={() => handleTabChange(id)}
                >
                  <span className="m-float-menu-icon">
                    <Icon size={15} />
                  </span>
                  <span className="m-float-menu-item-label">{label}</span>
                  {badge > 0 ? (
                    <span className="m-float-menu-badge">{badge > 99 ? "99+" : badge}</span>
                  ) : null}
                </button>
              );
            })}

            <div className="m-float-menu-divider" />
            <div className="m-float-menu-label">Cont</div>
            {userEmail ? (
              <div className="m-float-menu-meta truncate">{userEmail}</div>
            ) : null}
            {onOpenSettings ? (
              <button
                type="button"
                role="menuitem"
                className="m-float-menu-item"
                onClick={() => {
                  softHaptic(8);
                  setMenuOpen(false);
                  onOpenSettings();
                }}
              >
                <span className="m-float-menu-icon">
                  <Settings size={15} />
                </span>
                <span className="m-float-menu-item-label">Setări</span>
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="m-float-menu-item is-danger"
              onClick={() => {
                softHaptic(8);
                setMenuOpen(false);
                onLogout?.();
              }}
            >
              <span className="m-float-menu-icon">
                <LogOut size={15} />
              </span>
              <span className="m-float-menu-item-label">Deconectare</span>
            </button>
          </div>
        ) : null}
      </div>
      )}

      <main className="mobile-main mobile-main--no-header flex-1 min-h-0 p-3 overflow-y-auto scrollbar-thin">
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
            onMobileShellLockChange={onMobileShellLockChange}
          />
        ) : activeTab === "brief" ? (
          <MobileBrief
            claims={claims}
            listClaims={filteredClaims}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            onGoTab={handleTabChange}
            onOpenAlerts={onOpenAlerts}
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

      {!hideBottomChrome && (
        <div className="mobile-bottom-chrome mobile-bottom-chrome--float fixed bottom-0 left-0 right-0 z-50">
          <MobileSearchBar value={search} onChange={handleSearchChange} />
        </div>
      )}
    </div>
  );
}
