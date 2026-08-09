import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings, LogOut, Camera, BarChart3, List, CalendarClock, Menu, Bell, Plus, Building2, Check,
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import MobileSearchBar from "./MobileSearchBar";
import EmptyWorkspace from "../common/EmptyWorkspace";
import ListSkeleton from "../common/ListSkeleton";
import LoadError from "../common/LoadError";
import { saveMobileTab, softHaptic } from "../../utils/mobilePrefs";
import { claimMatchesSearch, scrollToFirstHighlight } from "../../utils/searchUtils";

/** Navigare principală mobil — Brief e hub-ul; Dosare e inventar secundar. */
const PRIMARY_NAV_ITEMS = [
  { id: "brief", label: "Brief", Icon: BarChart3 },
  { id: "capture", label: "Foto & Doc", Icon: Camera },
  { id: "programari", label: "Programări", Icon: CalendarClock },
];

const SECONDARY_NAV_ITEMS = [
  { id: "dosare", label: "Toate dosarele", Icon: List, hint: "Listă completă, piese sosite, blocate" },
];

export default function MobileAppLayout({
  claims,
  loading = false,
  loadError = null,
  onRetryLoad = null,
  isOffline = false,
  session,
  userEmail,
  isAdmin = true,
  roleLabel = null,
  totalClaimsCount = 0,
  onOpenClaim,
  onNewClaim,
  onPatchClaim,
  canEditFn,
  onNotify,
  onLogout,
  onOpenSettings,
  onOpenAlerts,
  memberships = [],
  activeAtelierId = null,
  onSwitchAtelier = null,
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
  mobileTab = null,
  onMobileTabChange = null,
}) {
  // Home mobil = Brief; navigarea e din brand-ul floating.
  const [internalTab, setInternalTab] = useState("brief");
  const activeTab = mobileTab ?? internalTab;
  const setActiveTab = (id) => {
    if (onMobileTabChange) onMobileTabChange(id);
    else setInternalTab(id);
  };
  const [focusClaimId, setFocusClaimId] = useState(null);
  const [focusCaptureCategory, setFocusCaptureCategory] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    saveMobileTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!captureFocusClaimId) return;
    setFocusClaimId(captureFocusClaimId);
    setFocusCaptureCategory(null);
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

  const openCaptureForClaim = (claimId, category = null) => {
    softHaptic(8);
    if (claimId) setFocusClaimId(claimId);
    setFocusCaptureCategory(category || null);
    setActiveTab("capture");
    setMenuOpen(false);
  };

  const consumeCaptureFocus = () => {
    setFocusClaimId(null);
    setFocusCaptureCategory(null);
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
            {PRIMARY_NAV_ITEMS.map(({ id, label, Icon }) => {
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
            <div className="m-float-menu-label">Inventar</div>
            {SECONDARY_NAV_ITEMS.map(({ id, label, Icon, hint }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`m-float-menu-item is-secondary ${active ? "is-active" : ""}`}
                  onClick={() => handleTabChange(id)}
                  title={hint}
                >
                  <span className="m-float-menu-icon">
                    <Icon size={15} />
                  </span>
                  <span className="m-float-menu-item-label">{label}</span>
                </button>
              );
            })}

            {onOpenAlerts ? (
              <button
                type="button"
                role="menuitem"
                className="m-float-menu-item is-secondary"
                onClick={() => {
                  softHaptic(8);
                  setMenuOpen(false);
                  onOpenAlerts(totalAlertsCount > 0 ? "depasite" : "toate");
                }}
              >
                <span className="m-float-menu-icon">
                  <Bell size={15} />
                </span>
                <span className="m-float-menu-item-label">Centrul de Alerte</span>
                <span className="m-float-menu-badge">{totalAlertsCount > 99 ? "99+" : totalAlertsCount}</span>
              </button>
            ) : null}

            <div className="m-float-menu-divider" />
            <div className="m-float-menu-label">Cont</div>
            {userEmail ? (
              <div className="m-float-menu-meta truncate">{userEmail}</div>
            ) : null}
            {memberships.length > 1 ? (
              <>
                <div className="m-float-menu-label">Atelier</div>
                {memberships.map((m) => {
                  const active = m.id === activeAtelierId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitem"
                      className={`m-float-menu-item ${active ? "is-active" : ""}`}
                      onClick={async () => {
                        softHaptic(8);
                        setMenuOpen(false);
                        if (!active) await onSwitchAtelier?.(m.id);
                      }}
                    >
                      <span className="m-float-menu-icon">
                        {active ? <Check size={15} /> : <Building2 size={15} />}
                      </span>
                      <span className="m-float-menu-item-label">{m.nume}</span>
                    </button>
                  );
                })}
              </>
            ) : memberships[0] ? (
              <div className="m-float-menu-meta truncate">
                Atelier: {memberships[0].nume}
              </div>
            ) : null}
            {onOpenSettings ? (
              <button
                type="button"
                role="menuitem"
                className="m-float-menu-item"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  softHaptic(8);
                  setMenuOpen(false);
                  window.setTimeout(() => onOpenSettings(), 0);
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
        {loading ? (
          <ListSkeleton rows={5} />
        ) : loadError || isOffline ? (
          <LoadError
            message={loadError?.message}
            offline={isOffline || loadError?.offline}
            onRetry={onRetryLoad}
          />
        ) : claims.length === 0 && (activeTab === "brief" || activeTab === "dosare") ? (
          <EmptyWorkspace
            onNew={onNewClaim}
            ownershipHint={!isAdmin && totalClaimsCount > 0}
            roleLabel={roleLabel}
          />
        ) : activeTab === "capture" ? (
          <MobileQuickCapture
            claims={filteredClaims}
            searchQuery={search}
            onOpen={onOpenClaim}
            onNew={onNewClaim}
            onPatch={onPatchClaim}
            canEditFn={canEditFn}
            onNotify={onNotify}
            focusClaimId={focusClaimId}
            focusCaptureCategory={focusCaptureCategory}
            onFocusClaimConsumed={consumeCaptureFocus}
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
            onGoCapture={openCaptureForClaim}
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
            onBackToBrief={() => handleTabChange("brief")}
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
          <div className="m-mobile-quick-actions flex items-center gap-2 px-3 pt-2">
            {onNewClaim ? (
              <button
                type="button"
                className="m-press flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-semibold bg-[var(--app-accent)] text-[var(--app-accent-text)]"
                onClick={() => {
                  softHaptic(8);
                  onNewClaim();
                }}
              >
                <Plus size={15} /> Dosar nou
              </button>
            ) : null}
            {onOpenAlerts ? (
              <button
                type="button"
                className={`m-press inline-flex items-center justify-center gap-1.5 h-9 min-w-[6.5rem] px-3 rounded-xl text-[12px] font-semibold border ${
                  totalAlertsCount > 0
                    ? "bg-[color-mix(in_srgb,var(--app-danger)_75%,var(--app-surface-muted))] text-[var(--app-text-strong)] border-[color-mix(in_srgb,var(--app-danger)_45%,var(--app-border))]"
                    : "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)]"
                }`}
                onClick={() => {
                  softHaptic(8);
                  onOpenAlerts(totalAlertsCount > 0 ? "depasite" : "toate");
                }}
                title="Centrul de Alerte"
              >
                <Bell size={15} />
                <span>{totalAlertsCount} Alerte</span>
              </button>
            ) : null}
          </div>
          <MobileSearchBar value={search} onChange={handleSearchChange} />
        </div>
      )}
    </div>
  );
}
