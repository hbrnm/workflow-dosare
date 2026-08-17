import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings, LogOut, List, Bell, Building2, Check, Ban, FolderPlus, Camera, Share, X,
} from "lucide-react";
import MobileQuickCapture from "./MobileQuickCapture";
import MobileBrief from "./MobileBrief";
import MobileClaimsList from "./MobileClaimsList";
import MobileProgramari from "./MobileProgramari";
import MobileSearchBar from "./MobileSearchBar";
import MobileSearchResults from "./MobileSearchResults";
import EmptyWorkspace from "../common/EmptyWorkspace";
import ListSkeleton from "../common/ListSkeleton";
import LoadError from "../common/LoadError";
import ReceptieAutoModal from "../modals/ReceptieAutoModal";
import { loadLastCaptureClaimId, saveMobileTab, softHaptic } from "../../utils/mobilePrefs";
import { claimMatchesSearch, scrollToFirstHighlight } from "../../utils/searchUtils";
import {
  mobileSearchHits,
  resolveInboxFotoClaim,
  shouldShowMobileSearchHits,
  uniqueSearchMatch,
} from "../../utils/mobileSearchNav";
import { UI_COPY } from "../../constants/uiCopy";
import { emailInitial } from "../../utils/userDisplay";
import { loadCachedBranding } from "../../constants/branding";
import {
  dismissPwaInstallPrompt,
  isStandaloneDisplay,
  shouldPromptPwaInstall,
} from "../../utils/pwaInstall";

const INVENTAR_NAV_ITEMS = [
  { id: "capture", label: UI_COPY.fotoSiDocumente, Icon: Camera, hint: UI_COPY.fotoSiDocumenteHint },
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
  blockedCount = 0,
  branding = null,
  onOpenClaimWithCamera = null,
  search = "",
  setSearch,
  highlightClaimIds = null,
  onMobileShellLockChange,
  hideBottomChrome = false,
  mobileTab = null,
  onMobileTabChange = null,
  inboxFocus = null,
  onInboxFocusChange = null,
  onCloseInboxFocus = null,
  receptieClaimId = null,
  onOpenReceptie = null,
  onCloseReceptie = null,
  onOpenPwaInstall = null,
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
  const [dosareStatusFilter, setDosareStatusFilter] = useState("toate");
  const [showPwaHint, setShowPwaHint] = useState(() => shouldPromptPwaInstall());
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const autoOpenedQueryRef = useRef("");

  const openBlockedDosare = () => {
    softHaptic(8);
    setMenuOpen(false);
    setDosareStatusFilter("blocate");
    setActiveTab("dosare");
  };

  useEffect(() => {
    saveMobileTab(activeTab);
  }, [activeTab]);

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

  const searchHits = useMemo(() => mobileSearchHits(claims, search), [claims, search]);
  const uniqueHit = useMemo(() => uniqueSearchMatch(claims, search), [claims, search]);
  const showSearchHits = shouldShowMobileSearchHits(search, uniqueHit ? 1 : searchHits.length);

  const openSearchClaim = (claim) => {
    if (!claim) return;
    autoOpenedQueryRef.current = search.trim();
    setSearch?.("");
    onOpenClaim?.(claim);
  };

  const handleSearchChange = (value) => {
    setSearch?.(value);
  };

  const handleSearchSubmit = () => {
    const q = search.trim();
    if (!q) return;
    if (uniqueHit) {
      openSearchClaim(uniqueHit);
      return;
    }
    if (searchHits.length > 0) openSearchClaim(searchHits[0]);
  };

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      autoOpenedQueryRef.current = "";
      return;
    }
    if (!uniqueHit) return;
    if (autoOpenedQueryRef.current === q) return;
    autoOpenedQueryRef.current = q;
    setSearch?.("");
    onOpenClaim?.(uniqueHit);
  }, [search, uniqueHit, setSearch, onOpenClaim]);

  useEffect(() => {
    if (!highlightClaimIds?.size) return;
    const t = window.setTimeout(() => scrollToFirstHighlight(highlightClaimIds, "mobile-claim"), 150);
    return () => window.clearTimeout(t);
  }, [highlightClaimIds]);

  const handleTabChange = (id) => {
    softHaptic(8);
    if (id === "dosare") setDosareStatusFilter("toate");
    setActiveTab(id);
    setMenuOpen(false);
  };

  const openClaimCamera = (claim, category = null) => {
    if (!claim || !onOpenClaimWithCamera) return false;
    setSearch?.("");
    setMenuOpen(false);
    onOpenClaimWithCamera(claim, category);
    return true;
  };

  const openInboxFoto = (category = null) => {
    const target = resolveInboxFotoClaim({
      claims,
      searchQuery: search,
      lastClaimId: loadLastCaptureClaimId(),
    });
    if (openClaimCamera(target, category)) return;
    const q = search.trim();
    onNotify?.(
      q
        ? UI_COPY.cautareAlegeDinLista
        : UI_COPY.cautareDosarHint,
      "info"
    );
  };

  const openCaptureForClaim = (claimId = null, category = null) => {
    softHaptic(8);
    setMenuOpen(false);
    if (claimId) {
      const claim = (claims || []).find((c) => c.id === claimId);
      if (openClaimCamera(claim, category)) return;
    }
    openInboxFoto(category);
  };

  const consumeCaptureFocus = () => {
    setFocusClaimId(null);
    setFocusCaptureCategory(null);
  };

  const atelierName = branding?.atelierNume || "Atelier";
  const letter = emailInitial(userEmail);
  const receptieClaim = receptieClaimId
    ? (claims || []).find((c) => c.id === receptieClaimId) || null
    : null;

  return (
    <div
      className={`mobile-shell app-shell m-cursor-shell fixed inset-0 flex flex-col overflow-hidden ${
        hideBottomChrome ? "is-chrome-hidden" : ""
      }`}
    >
      {!hideBottomChrome && (
      <div className="m-cursor-header">
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
          aria-label={`Meniu ${userEmail || atelierName}`}
          title={userEmail || atelierName}
        >
          <span className="m-float-brand-mark m-float-brand-icon" aria-hidden="true">
            {letter}
          </span>
        </button>

        {menuOpen ? (
          <div className="m-float-menu" role="menu">
            <div className="m-float-menu-label">Inventar</div>
            {INVENTAR_NAV_ITEMS.map(({ id, label, Icon, hint }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={`m-float-menu-item is-secondary ${active ? "is-active" : ""}`}
                  onClick={() => {
                    if (id === "capture") openCaptureForClaim();
                    else handleTabChange(id);
                  }}
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

            {blockedCount > 0 ? (
              <button
                type="button"
                role="menuitem"
                className="m-float-menu-item is-secondary"
                onClick={openBlockedDosare}
              >
                <span className="m-float-menu-icon">
                  <Ban size={15} />
                </span>
                <span className="m-float-menu-item-label">Dosare blocate</span>
                <span className="m-float-menu-badge">{blockedCount > 99 ? "99+" : blockedCount}</span>
              </button>
            ) : null}

            <div className="m-float-menu-divider" />
            <div className="m-float-menu-label">Cont</div>
            {userEmail ? (
              <div className="px-2.5 py-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] my-1">
                <div className="text-[12px] font-bold text-[var(--app-text-strong)] truncate">
                  {userEmail}
                </div>
                {memberships[0]?.nume && (
                  <div className="text-[11px] font-medium text-[var(--app-muted)] truncate flex items-center gap-1.5 mt-0.5">
                    <Building2 size={11} className="shrink-0 text-emerald-500" />
                    <span>{memberships[0].nume}</span>
                  </div>
                )}
              </div>
            ) : null}
            {memberships.length > 1 ? (
              <>
                <div className="m-float-menu-label mt-1">Schimba atelier</div>
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
                <span className="m-float-menu-item-label">Setari</span>
              </button>
            ) : null}
            {onOpenPwaInstall && !isStandaloneDisplay() ? (
              <button
                type="button"
                role="menuitem"
                className="m-float-menu-item"
                onClick={() => {
                  softHaptic(8);
                  setMenuOpen(false);
                  onOpenPwaInstall();
                }}
              >
                <span className="m-float-menu-icon">
                  <Share size={15} />
                </span>
                <span className="m-float-menu-item-label">Pe ecranul principal</span>
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
      <div className="m-cursor-header-actions">
        {onNewClaim && activeTab !== "capture" ? (
          <button
            type="button"
            className="m-cursor-icon-btn"
            onClick={() => {
              softHaptic(8);
              onNewClaim();
            }}
            aria-label="Dosar nou"
          >
            <FolderPlus size={22} strokeWidth={2} />
          </button>
        ) : null}
      </div>
      </div>
      )}

      <main className="mobile-main mobile-main--no-header flex-1 min-h-0 px-4 pb-28 overflow-y-auto scrollbar-thin">
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
            onOpenBlocked={openBlockedDosare}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            alertBuckets={alertBuckets}
            onPatchClaim={onPatchClaim}
            onNotify={onNotify}
            homeStyle="inbox"
            atelierNume={branding?.atelierNume}
            searchQuery={search}
            inboxFocus={inboxFocus}
            onInboxFocusChange={onInboxFocusChange}
            onCloseInboxFocus={onCloseInboxFocus}
            onOpenReceptie={onOpenReceptie}
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
            statusFilter={dosareStatusFilter}
            onStatusFilterChange={setDosareStatusFilter}
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
          {showSearchHits ? (
            <MobileSearchResults
              query={search}
              matches={searchHits}
              onSelect={openSearchClaim}
            />
          ) : null}
          {showPwaHint && onOpenPwaInstall ? (
            <div className="pwa-install-banner">
              <button
                type="button"
                className="pwa-install-banner-go"
                onClick={() => {
                  softHaptic(8);
                  onOpenPwaInstall();
                }}
              >
                Adauga pe ecranul principal
              </button>
              <button
                type="button"
                className="pwa-install-banner-x"
                aria-label="Nu arata iar"
                onClick={() => {
                  dismissPwaInstallPrompt();
                  setShowPwaHint(false);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : null}
          <MobileSearchBar
            value={search}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
            inputRef={searchInputRef}
          />
        </div>
      )}

      {receptieClaim ? (
        <ReceptieAutoModal
          isOpen
          onClose={() => (onCloseReceptie ? onCloseReceptie() : null)}
          claim={receptieClaim}
          onPatchClaim={onPatchClaim}
          onNotify={onNotify}
          atelierBranding={branding || loadCachedBranding()}
        />
      ) : null}
    </div>
  );
}
