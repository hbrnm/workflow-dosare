import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { useExportExcel } from "./hooks/useExportExcel";
import NotificationQueue from "./components/common/NotificationQueue";
import UndoToast from "./components/common/UndoToast";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import RecoveryPassword from "./components/auth/RecoveryPassword";
import CommandPalette from "./components/common/CommandPalette";
import SearchResultsOverlay from "./components/common/SearchResultsOverlay";
import ErrorBoundary from "./components/common/ErrorBoundary";
import OnboardingModal from "./components/common/OnboardingModal";
import SetariModal from "./components/modals/SetariModal";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { dismissOnboarding } from "./utils/onboardingPrefs";
import { ROLES, resolveUserRole, canCreateClaim } from "./constants/roles";
import { useAuth } from "./hooks/useAuth";
import { useClaims } from "./hooks/useClaims";
import { useClaimFilters } from "./hooks/useClaimFilters";
import { useClaimModal } from "./hooks/useClaimModal";
import { useAlerts } from "./hooks/useAlerts";
import { useSettings } from "./hooks/useSettings";
import { useAtelier } from "./hooks/useAtelier";
import { useDayNightTheme } from "./hooks/useDayNightTheme";
import { normalizeBilling } from "./constants/billing";
import { getSearchHighlightIds } from "./utils/searchUtils";
import { isCompactMobileViewport } from "./utils/viewport";
import { useMobileBackStack } from "./hooks/useMobileBackStack";

// Desktop Layout Components
import DesktopSidebar from "./components/layout/DesktopSidebar";
import DesktopHeader from "./components/layout/DesktopHeader";
import DesktopFilterBar from "./components/layout/DesktopFilterBar";
import DesktopMobileDock from "./components/layout/DesktopMobileDock";
import AppViewRouter from "./components/layout/AppViewRouter";
import AppModalsLayer from "./components/layout/AppModalsLayer";

// Lazy Mobile Shell & Modals
const MobileAppLayout = lazyWithRetry(() => import("./components/mobile/MobileAppLayout"));
const MobileClaimSheet = lazyWithRetry(() => import("./components/mobile/MobileClaimSheet"));
const ClaimModal = lazyWithRetry(() => import("./components/modals/ClaimModal"));
const QuickCreateClaimModal = lazyWithRetry(() => import("./components/modals/QuickCreateClaimModal"));
const AlerteModal = lazyWithRetry(() => import("./components/modals/AlerteModal"));

export default function App() {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [undoToastItem, setUndoToastItem] = useState(null);
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem("workflow_dosare_active_view");
      if (saved === "brief" || saved === "flux" || saved === "list") return "dosare";
      return saved || "dosare";
    } catch (err) {
      return "dosare";
    }
  });

  const [dosareSubView, setDosareSubView] = useState(() => {
    try {
      const saved = localStorage.getItem("workflow_dosare_sub_view");
      if (saved === "brief" || saved === "flux" || saved === "list") return saved;
      return "brief";
    } catch (err) {
      return "brief";
    }
  });

  const [activeMode, setActiveMode] = useState(() =>
    typeof window !== "undefined" && isCompactMobileViewport() ? "mobile" : "desktop"
  );
  const [lockMobileShell, setLockMobileShell] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAiModalOpenHeader, setIsAiModalOpenHeader] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [programatorFocusDate, setProgramatorFocusDate] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      if (lockMobileShell) {
        setActiveMode("mobile");
        return;
      }
      setActiveMode(isCompactMobileViewport() ? "mobile" : "desktop");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [lockMobileShell]);

  const showNotice = useCallback((message, type = "info", options = {}) => {
    setNotice({
      message,
      type,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      timeout: options.timeout,
    });
  }, []);

  const {
    session,
    setSession,
    authLoading,
    authScreen,
    setAuthScreen,
    passwordRecovery,
    clearPasswordRecovery,
    authLogout,
  } = useAuth(showNotice);

  const {
    memberships,
    activeAtelierId: atelierId,
    activeRole,
    memberCount,
    atelier,
    tenancyReady,
    billing: atelierBilling,
    switchAtelier,
    refreshAtelier,
  } = useAtelier(session, showNotice);

  const {
    capacitateZilnica,
    saveCapacitate,
    pragRidicare,
    savePragRidicare,
    pragInactivitate,
    savePragInactivitate,
    termeneAlertaStatus,
    saveTermeneAlertaStatus,
    customInsurers,
    saveInsurers,
    branding: settingsBranding,
    saveBranding: saveBrandingBase,
    uploadBrandingLogo,
    adminEmails,
    usersList,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
    handleChangePassword,
    billingSettings,
    saveBilling,
    manoperaTarife,
    saveManoperaTarife,
    startStripeCheckout,
    startStripePortal,
    onboardingOpen,
    setOnboardingOpen,
  } = useSettings(session, showNotice, {
    tenancyReady,
    atelierId,
    isAdminRole: activeRole === "admin",
  });

  const saveBranding = useCallback(
    async (next) => {
      const ok = await saveBrandingBase(next);
      if (ok !== false) refreshAtelier();
      return ok;
    },
    [saveBrandingBase, refreshAtelier]
  );

  const branding = useMemo(() => {
    if (tenancyReady && atelier) {
      const cachedIsColdDefault =
        settingsBranding?.atelierNume === "Dosare Daună" &&
        settingsBranding?.atelierShort === "WD" &&
        !settingsBranding?.logoUrl &&
        atelier.nume &&
        atelier.nume !== "Dosare Daună";
      if (cachedIsColdDefault) {
        return {
          atelierNume: atelier.nume,
          atelierShort: atelier.short || "WD",
          logoUrl: atelier.logo_url || "",
        };
      }
      return {
        atelierNume: settingsBranding?.atelierNume || atelier.nume || "Dosare Daună",
        atelierShort: settingsBranding?.atelierShort || atelier.short || "WD",
        logoUrl: settingsBranding?.logoUrl || atelier.logo_url || "",
      };
    }
    return settingsBranding;
  }, [tenancyReady, atelier, settingsBranding]);

  const effectiveBilling = useMemo(() => {
    if (tenancyReady && atelier && atelierBilling) return atelierBilling;
    return normalizeBilling({
      ...billingSettings,
      memberCount: memberCount || usersList.length,
    });
  }, [tenancyReady, atelier, atelierBilling, billingSettings, memberCount, usersList.length]);

  const {
    claims,
    loading,
    loadError,
    loadAll,
    saveClaim,
    deleteClaim,
    patchClaim,
    moveToStatus,
  } = useClaims(session, showNotice, { atelierId });

  useDayNightTheme();

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const myRole = useMemo(
    () => resolveUserRole(myEmail, { adminEmails, usersList }),
    [myEmail, adminEmails, usersList]
  );
  const myRoleLabel = ROLES[myRole]?.label || myRole;
  const userCanCreate = canCreateClaim(myRole) && (effectiveBilling?.canCreateClaim ?? true);

  const isAdmin = useMemo(() => {
    if (!myEmail) return false;
    if (activeRole === "admin") return true;
    if (myRole === "admin") return true;
    const fromAdmins = adminEmails.some((e) => e.toLowerCase() === myEmail.toLowerCase());
    const fromUsers = usersList.some(
      (u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin"
    );
    if (fromAdmins || fromUsers) return true;
    if (memberCount === 1 && atelierId) return true;
    if (Array.isArray(usersList) && usersList.length === 1) {
      const only = usersList[0];
      if (String(only?.email || "").toLowerCase() === myEmail.toLowerCase()) return true;
    }
    return false;
  }, [myEmail, myRole, adminEmails, usersList, activeRole, memberCount, atelierId]);

  const {
    search,
    setSearch,
    filterTip,
    setFilterTip,
    filterStatus,
    setFilterStatus,
    filterAsigurator,
    setFilterAsigurator,
    onlyBlocked,
    setOnlyBlocked,
    fluxFilter,
    setFluxFilter,
    mobileSort,
    setMobileSort,
    mobileFilterSheetOpen,
    setMobileFilterSheetOpen,
    resetFilters,
    insurers,
    userClaims,
    filteredClaims,
    stageClaims,
    activeFilterCount,
  } = useClaimFilters({
    claims,
    myId,
    myEmail,
    isAdmin,
    pragRidicare,
    pragInactivitate,
  });

  const highlightClaimIds = useMemo(
    () => getSearchHighlightIds(userClaims, search),
    [userClaims, search]
  );

  const {
    buckets: alertBuckets,
    totalAlertsCount,
    blockedCount,
  } = useAlerts(userClaims, pragRidicare, pragInactivitate);

  const openBlockedClaims = useCallback(() => {
    setOnlyBlocked(true);
    setFilterStatus("toate");
    setDosareSubView("list");
    setView("dosare");
  }, [setOnlyBlocked, setFilterStatus]);

  const {
    modalClaim,
    openNew,
    openExisting,
    duplicateClaim,
    closeClaimModal,
    setariOpen,
    openSettings,
    closeSettings,
    alerteModalTab,
    openAlerts,
    closeAlerts,
    quickCaptureOpen,
    openQuickCapture,
    closeQuickCapture,
    quickCreateOpen,
    closeQuickCreate,
    quickCreateDefaults,
  } = useClaimModal(showNotice);

  const [fieldClaimId, setFieldClaimId] = useState(null);
  const [captureFocusClaimId, setCaptureFocusClaimId] = useState(null);
  const [mobileTab, setMobileTab] = useState("brief");

  const openMobileClaim = useCallback((claim) => {
    if (!claim?.id) return;
    setFieldClaimId(claim.id);
  }, []);

  const closeFieldClaim = useCallback(() => {
    setFieldClaimId(null);
  }, []);

  const resetShellToBrief = useCallback(() => {
    closeSettings();
    closeAlerts();
    closeClaimModal();
    closeQuickCreate();
    closeQuickCapture();
    setFieldClaimId(null);
    setIsCommandPaletteOpen(false);
    setView("dosare");
    setDosareSubView("brief");
    setMobileTab("brief");
    try {
      localStorage.setItem("workflow_dosare_active_view", "dosare");
      localStorage.setItem("workflow_dosare_sub_view", "brief");
      const path = `${window.location.pathname}${window.location.search || ""}`;
      window.history.replaceState({ view: "dosare", modalOpen: false }, "", path);
    } catch (err) {
      console.warn("Unable to reset navigation shell", err);
    }
  }, [
    closeSettings,
    closeAlerts,
    closeClaimModal,
    closeQuickCreate,
    closeQuickCapture,
  ]);

  const handleLogout = useCallback(async () => {
    resetShellToBrief();
    await authLogout();
  }, [authLogout, resetShellToBrief]);

  useEffect(() => {
    if (session || authLoading) return;
    if (setariOpen || alerteModalTab || modalClaim || quickCreateOpen || quickCaptureOpen || fieldClaimId) {
      resetShellToBrief();
    } else if (typeof window !== "undefined" && window.location.hash) {
      try {
        const path = `${window.location.pathname}${window.location.search || ""}`;
        window.history.replaceState({ view: "dosare", modalOpen: false }, "", path);
      } catch {
        /* ignore */
      }
    }
  }, [
    session,
    authLoading,
    setariOpen,
    alerteModalTab,
    modalClaim,
    quickCreateOpen,
    quickCaptureOpen,
    fieldClaimId,
    resetShellToBrief,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const handleGlobalError = (event) => {
      if (event?.error?.message) {
        setNotice({ message: `Eroare runtime: ${event.error.message}`, type: "error" });
      }
    };
    const handlePromiseRejection = (event) => {
      const message = event?.reason?.message || String(event?.reason || "Unknown rejection");
      setNotice({ message: `Promise rejectat: ${message}`, type: "error" });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handlePromiseRejection);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handlePromiseRejection);
    };
  }, []);

  const isNavigatingHistoryRef = useRef(false);

  const {
    goTab: handleMobileTabChange,
    requestClose,
    openClaimFromAlerts,
    replaceClaimWithField,
  } = useMobileBackStack({
    enabled: activeMode === "mobile",
    setMobileTab,
    flags: {
      modalClaim,
      fieldClaimId,
      alerteModalTab,
      setariOpen,
      quickCreateOpen,
      quickCaptureOpen,
    },
    api: {
      closeClaim: closeClaimModal,
      closeField: closeFieldClaim,
      closeAlerts,
      closeSettings,
      closeQuickCreate,
      closeQuickCapture,
      openAlerts,
      openSettings,
      openField: (id) => setFieldClaimId(id),
      openClaim: openExisting,
      openQuickCreate: () => openNew(),
      openQuickCapture: () => openQuickCapture(),
    },
  });

  const requestCloseClaimModal = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose();
      return;
    }
    closeClaimModal();
  }, [activeMode, requestClose, closeClaimModal]);

  const requestCloseFieldClaim = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose();
      return;
    }
    closeFieldClaim();
  }, [activeMode, requestClose, closeFieldClaim]);

  const requestCloseAlerts = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose();
      return;
    }
    closeAlerts();
  }, [activeMode, requestClose, closeAlerts]);

  const requestCloseSettings = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose();
      return;
    }
    closeSettings();
  }, [activeMode, requestClose, closeSettings]);

  const requestCloseQuickCreate = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose();
      return;
    }
    closeQuickCreate();
  }, [activeMode, requestClose, closeQuickCreate]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (isNavigatingHistoryRef.current) return;
      isNavigatingHistoryRef.current = true;
      if (modalClaim) closeClaimModal();
      else if (alerteModalTab) closeAlerts();
      else if (quickCreateOpen) closeQuickCreate();
      else if (quickCaptureOpen) closeQuickCapture();
      else if (event.state?.view) setView(event.state.view);
      window.setTimeout(() => {
        isNavigatingHistoryRef.current = false;
      }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    modalClaim,
    alerteModalTab,
    quickCreateOpen,
    quickCaptureOpen,
    closeClaimModal,
    closeAlerts,
    closeQuickCreate,
    closeQuickCapture,
  ]);

  useEffect(() => {
    if (activeMode === "mobile") return;
    try {
      localStorage.setItem("workflow_dosare_active_view", view);
    } catch {
      /* ignore */
    }
  }, [activeMode, view]);

  useEffect(() => {
    if (activeMode === "mobile") return;
    try {
      localStorage.setItem("workflow_dosare_sub_view", dosareSubView);
    } catch {
      /* ignore */
    }
  }, [activeMode, dosareSubView]);

  const canEdit = useCallback(
    (claim) => {
      if (!session?.user) return false;
      if (isAdmin) return true;
      if (!claim) return true;
      const cOwner = (claim.createdByEmail || "").toLowerCase();
      const uEmail = (myEmail || "").toLowerCase();
      return Boolean(cOwner && uEmail && cOwner === uEmail);
    },
    [session, isAdmin, myEmail]
  );

  const handleSave = useCallback(
    async (claimData, options = {}) => {
      setSaving(true);
      const isNew = !claims.some((c) => c.id === claimData.id);
      const res = await saveClaim(claimData, options);
      setSaving(false);

      if (res && res.success !== false) {
        showNotice(
          isNew ? "Dosar creat cu succes!" : "Dosar actualizat cu succes!",
          "success"
        );
        closeClaimModal();
        closeQuickCreate();

        if (isNew) {
          setFilterStatus("toate");
          setFilterAsigurator("toti");
          setSearch("");
          setOnlyBlocked(false);
          setView("dosare");
        }

        if (options.openProgramator) {
          setView("programator");
          setProgramatorFocusDate(claimData.dataProgramare || null);
        }
      }
      return res;
    },
    [claims, saveClaim, showNotice, closeClaimModal, closeQuickCreate, setFilterStatus, setFilterAsigurator, setSearch, setOnlyBlocked]
  );

  const handleDelete = useCallback(
    async (claimId) => {
      const res = await deleteClaim(claimId);
      closeClaimModal();
      closeFieldClaim();
      return res ?? true;
    },
    [deleteClaim, closeClaimModal, closeFieldClaim]
  );

  const handlePatchClaim = useCallback(
    async (claimId, patch) => {
      return await patchClaim(claimId, patch);
    },
    [patchClaim]
  );

  const handleMoveToStatus = useCallback(
    async (claimId, newStatus) => {
      return await moveToStatus(claimId, newStatus);
    },
    [moveToStatus]
  );

  const activeModalClaim = useMemo(() => {
    if (!modalClaim) return null;
    const fresh = claims.find((c) => c.id === modalClaim.id);
    return fresh || modalClaim;
  }, [claims, modalClaim]);

  const handleOpenClaim = useCallback(
    (claimOrRef) => {
      if (!claimOrRef) return;
      const id = typeof claimOrRef === "object" ? claimOrRef.id : claimOrRef;
      const fresh = id ? claims.find((c) => c.id === id) : null;
      openExisting(fresh || claimOrRef);
    },
    [claims, openExisting]
  );

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center text-[var(--app-muted)] gap-2">
        <Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...
      </div>
    );
  }
  if (session && passwordRecovery) {
    return (
      <RecoveryPassword
        branding={branding}
        onDone={() => {
          clearPasswordRecovery();
          showNotice("Parola a fost actualizată. Poți continua.", "success");
        }}
      />
    );
  }
  if (!session) {
    if (authScreen === "signup") {
      return (
        <Signup
          branding={branding}
          onBackToLogin={() => setAuthScreen("login")}
          onSuccess={(s) => {
            setAuthScreen("login");
            dismissOnboarding();
            setSession(s);
          }}
        />
      );
    }
    return (
      <Login
        branding={branding}
        onGoSignup={() => setAuthScreen("signup")}
        onLoginSuccess={(s) => setSession(s)}
      />
    );
  }

  const dismissTour = () => {
    dismissOnboarding();
    setOnboardingOpen(false);
  };

  if (activeMode === "mobile") {
    const fieldClaim = fieldClaimId ? claims.find((c) => c.id === fieldClaimId) : null;

    return (
      <ErrorBoundary>
        <NotificationQueue notice={notice} />
        <UndoToast item={undoToastItem} onDone={() => setUndoToastItem(null)} />
        {!modalClaim && !fieldClaim && (
          <SearchResultsOverlay
            query={search}
            claims={userClaims}
            onSelect={(claim) => {
              setSearch("");
              openMobileClaim(claim);
            }}
            onClear={() => setSearch("")}
            onNotify={showNotice}
          />
        )}
        <OnboardingModal
          open={onboardingOpen}
          onDismiss={dismissTour}
          onCreateClaim={userCanCreate ? () => openNew() : null}
          roleLabel={myRoleLabel}
        />

        <Suspense
          fallback={
            <div className="h-screen bg-[var(--app-surface)] text-white flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} /> Se încarcă modul mobil...
            </div>
          }
        >
          <MobileAppLayout
            claims={userClaims}
            loading={loading}
            loadError={loadError}
            onRetryLoad={loadAll}
            isOffline={isOffline}
            session={session}
            userEmail={myEmail}
            isAdmin={isAdmin}
            roleLabel={myRoleLabel}
            totalClaimsCount={claims.length}
            onOpenClaim={openMobileClaim}
            onNewClaim={userCanCreate ? openNew : null}
            onPatchClaim={handlePatchClaim}
            canEditFn={canEdit}
            onNotify={showNotice}
            onLogout={handleLogout}
            onOpenSettings={openSettings}
            onOpenAlerts={openAlerts}
            memberships={memberships}
            activeAtelierId={atelierId}
            onSwitchAtelier={async (id) => {
              const ok = await switchAtelier(id);
              if (ok) showNotice("Atelier schimbat.", "success");
            }}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            alertBuckets={alertBuckets}
            totalAlertsCount={totalAlertsCount}
            blockedCount={blockedCount}
            branding={branding}
            captureFocusClaimId={captureFocusClaimId}
            onCaptureFocusConsumed={() => setCaptureFocusClaimId(null)}
            search={search}
            setSearch={setSearch}
            highlightClaimIds={highlightClaimIds}
            onMobileShellLockChange={setLockMobileShell}
            hideBottomChrome={Boolean(
              alerteModalTab || setariOpen || modalClaim || fieldClaim || quickCreateOpen
            )}
            mobileTab={mobileTab}
            onMobileTabChange={handleMobileTabChange}
          />
        </Suspense>

        {alerteModalTab && (
          <Suspense fallback={null}>
            <AlerteModal
              claims={userClaims}
              alertBuckets={alertBuckets}
              initialTab={alerteModalTab}
              pragRidicare={pragRidicare}
              pragInactivitate={pragInactivitate}
              onClose={requestCloseAlerts}
              onOpenClaim={openClaimFromAlerts}
              onPatchClaim={handlePatchClaim}
              onNotify={showNotice}
            />
          </Suspense>
        )}

        {setariOpen && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[9200] flex items-center justify-center bg-black/30 text-white gap-2">
                <Loader2 className="animate-spin" size={18} /> Se încarcă setările…
              </div>
            }
          >
            <ErrorBoundary onReset={requestCloseSettings}>
              <SetariModal
                claims={claims}
                capacitateZilnica={capacitateZilnica}
                pragRidicare={pragRidicare}
                pragInactivitate={pragInactivitate}
                termeneAlertaStatus={termeneAlertaStatus}
                onSaveTermeneAlertaStatus={saveTermeneAlertaStatus}
                onSaveCapacitate={saveCapacitate}
                onSavePrag={savePragRidicare}
                onSavePragInactivitate={savePragInactivitate}
                insurersList={customInsurers}
                onSaveInsurers={saveInsurers}
                branding={branding}
                onSaveBranding={saveBranding}
                onUploadBrandingLogo={uploadBrandingLogo}
                onClose={requestCloseSettings}
                onNotify={showNotice}
                userEmail={myEmail}
                onSignOut={handleLogout}
                isAdmin={isAdmin}
                usersList={usersList}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                onToggleAdminRole={handleToggleAdminRole}
                onChangePassword={handleChangePassword}
                billing={effectiveBilling}
                onSaveBilling={saveBilling}
                manoperaTarife={manoperaTarife}
                onSaveManoperaTarife={saveManoperaTarife}
                tenancyReady={tenancyReady}
                atelierId={atelierId}
                atelierSlug={atelier?.slug || null}
                onStripeCheckout={startStripeCheckout}
                onStripePortal={startStripePortal}
                onDataChanged={loadAll}
              />
            </ErrorBoundary>
          </Suspense>
        )}

        {quickCreateOpen && (
          <Suspense fallback={null}>
            <QuickCreateClaimModal
              isOpen={quickCreateOpen}
              onClose={requestCloseQuickCreate}
              onSave={handleSave}
              onNotify={showNotice}
              allClaims={claims}
              initialStatus={quickCreateDefaults?.status}
              initialDataProgramare={quickCreateDefaults?.dataProgramare}
            />
          </Suspense>
        )}

        {fieldClaim && !modalClaim && (
          <Suspense fallback={null}>
            <MobileClaimSheet
              claim={fieldClaim}
              onClose={requestCloseFieldClaim}
              onOpenFull={(c) => openExisting(c)}
              onPatch={handlePatchClaim}
              onMoveToStatus={handleMoveToStatus}
              canEdit={canEdit(fieldClaim)}
              onNotify={showNotice}
              userEmail={myEmail}
              onCapturePhotos={(c) => {
                setCaptureFocusClaimId(c.id);
                requestCloseFieldClaim();
              }}
            />
          </Suspense>
        )}

        {modalClaim && (
          <Suspense fallback={null}>
            <ClaimModal
              claim={activeModalClaim}
              isNew={!activeModalClaim?.numarDosar}
              onSave={handleSave}
              onPatch={handlePatchClaim}
              onDelete={handleDelete}
              onClose={requestCloseClaimModal}
              onNotify={showNotice}
              onJumpTo={(c) => {
                closeClaimModal();
                setTimeout(() => openMobileClaim(c), 150);
              }}
              onSaveAndProgram={(c) => handleSave(c, { openProgramator: true })}
              insurersList={customInsurers}
              readOnly={
                Array.isArray(claims) &&
                claims.some((c) => c && c.id === activeModalClaim?.id) &&
                !canEdit(activeModalClaim)
              }
              allClaims={claims}
              adminEmails={adminEmails}
              userEmail={myEmail}
              manoperaTarife={manoperaTarife}
            />
          </Suspense>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <div className="h-[100dvh] flex app-shell overflow-hidden relative font-sans">
      <NotificationQueue notice={notice} />
      <UndoToast item={undoToastItem} onDone={() => setUndoToastItem(null)} />

      <OnboardingModal
        open={onboardingOpen}
        onDismiss={dismissTour}
        onCreateClaim={userCanCreate ? () => openNew() : null}
        desktopUi
        roleLabel={myRoleLabel}
      />

      {/* Desktop Minimal Sidebar */}
      <DesktopSidebar
        branding={branding}
        view={view}
        setView={setView}
        setDosareSubView={setDosareSubView}
        userClaimsCount={userClaims.length}
        setariOpen={setariOpen}
        openSettings={openSettings}
        memberships={memberships}
        atelierId={atelierId}
        userEmail={myEmail}
        switchAtelier={switchAtelier}
        showNotice={showNotice}
        handleLogout={handleLogout}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden app-workspace">
        {/* Desktop Header */}
        <DesktopHeader
          view={view}
          dosareSubView={dosareSubView}
          setDosareSubView={setDosareSubView}
          setOnlyBlocked={setOnlyBlocked}
          totalAlertsCount={totalAlertsCount}
          blockedCount={blockedCount}
          search={search}
          setSearch={setSearch}
          setIsCommandPaletteOpen={setIsCommandPaletteOpen}
          userCanCreate={userCanCreate}
          myRole={myRole}
          myRoleLabel={myRoleLabel}
          openNew={openNew}
          setIsAiModalOpenHeader={setIsAiModalOpenHeader}
          openAlerts={openAlerts}
          openBlockedClaims={openBlockedClaims}
        />

        {/* Desktop Advanced Filter Bar */}
        <DesktopFilterBar
          view={view}
          showFilterPanel={showFilterPanel}
          setShowFilterPanel={setShowFilterPanel}
          activeFilterCount={activeFilterCount}
          filterTip={filterTip}
          setFilterTip={setFilterTip}
          filterAsigurator={filterAsigurator}
          setFilterAsigurator={setFilterAsigurator}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          insurers={insurers}
          resetFilters={resetFilters}
        />

        {/* Responsive mobile fallback dock & filter sheet in desktop mode */}
        <DesktopMobileDock
          view={view}
          setView={setView}
          activeFilterCount={activeFilterCount}
          mobileSort={mobileSort}
          setMobileSort={setMobileSort}
          mobileFilterSheetOpen={mobileFilterSheetOpen}
          setMobileFilterSheetOpen={setMobileFilterSheetOpen}
          openQuickCapture={openQuickCapture}
          search={search}
          setSearch={setSearch}
          filterTip={filterTip}
          setFilterTip={setFilterTip}
          onlyBlocked={onlyBlocked}
          setOnlyBlocked={setOnlyBlocked}
          filterAsigurator={filterAsigurator}
          setFilterAsigurator={setFilterAsigurator}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          insurers={insurers}
          resetFilters={resetFilters}
          filteredClaimsCount={filteredClaims.length}
        />

        {/* Views Canvas Router */}
        <AppViewRouter
          view={view}
          setView={setView}
          dosareSubView={dosareSubView}
          setDosareSubView={setDosareSubView}
          loading={loading}
          loadError={loadError}
          isOffline={isOffline}
          loadAll={loadAll}
          claims={claims}
          userClaims={userClaims}
          filteredClaims={filteredClaims}
          stageClaims={stageClaims}
          highlightClaimIds={highlightClaimIds}
          userCanCreate={userCanCreate}
          isAdmin={isAdmin}
          myRoleLabel={myRoleLabel}
          openNew={openNew}
          openExisting={openExisting}
          handleOpenClaim={handleOpenClaim}
          duplicateClaim={duplicateClaim}
          handleDelete={handleDelete}
          handlePatchClaim={handlePatchClaim}
          handleMoveToStatus={handleMoveToStatus}
          canEdit={canEdit}
          pragRidicare={pragRidicare}
          pragInactivitate={pragInactivitate}
          alertBuckets={alertBuckets}
          showNotice={showNotice}
          openBlockedClaims={openBlockedClaims}
          setFilterStatus={setFilterStatus}
          onlyBlocked={onlyBlocked}
          setOnlyBlocked={setOnlyBlocked}
          openAlerts={openAlerts}
          capacitateZilnica={capacitateZilnica}
          saveCapacitate={saveCapacitate}
          programatorFocusDate={programatorFocusDate}
        />
      </div>

      {/* Modals & Overlays Layer */}
      <AppModalsLayer
        alerteModalTab={alerteModalTab}
        userClaims={userClaims}
        alertBuckets={alertBuckets}
        pragRidicare={pragRidicare}
        pragInactivitate={pragInactivitate}
        requestCloseAlerts={requestCloseAlerts}
        handleOpenClaim={handleOpenClaim}
        handlePatchClaim={handlePatchClaim}
        showNotice={showNotice}
        setariOpen={setariOpen}
        requestCloseSettings={requestCloseSettings}
        claims={claims}
        capacitateZilnica={capacitateZilnica}
        saveCapacitate={saveCapacitate}
        savePragRidicare={savePragRidicare}
        savePragInactivitate={savePragInactivitate}
        termeneAlertaStatus={termeneAlertaStatus}
        saveTermeneAlertaStatus={saveTermeneAlertaStatus}
        customInsurers={customInsurers}
        saveInsurers={saveInsurers}
        branding={branding}
        saveBranding={saveBranding}
        uploadBrandingLogo={uploadBrandingLogo}
        myEmail={myEmail}
        handleLogout={handleLogout}
        isAdmin={isAdmin}
        usersList={usersList}
        handleAddUser={handleAddUser}
        handleDeleteUser={handleDeleteUser}
        handleToggleAdminRole={handleToggleAdminRole}
        handleChangePassword={handleChangePassword}
        effectiveBilling={effectiveBilling}
        saveBilling={saveBilling}
        manoperaTarife={manoperaTarife}
        saveManoperaTarife={saveManoperaTarife}
        tenancyReady={tenancyReady}
        atelierId={atelierId}
        atelier={atelier}
        startStripeCheckout={startStripeCheckout}
        startStripePortal={startStripePortal}
        loadAll={loadAll}
        quickCreateOpen={quickCreateOpen}
        requestCloseQuickCreate={requestCloseQuickCreate}
        handleSave={handleSave}
        quickCreateDefaults={quickCreateDefaults}
        modalClaim={modalClaim}
        activeModalClaim={activeModalClaim}
        requestCloseClaimModal={requestCloseClaimModal}
        handleDelete={handleDelete}
        canEdit={canEdit}
        openExisting={openExisting}
        quickCaptureOpen={quickCaptureOpen}
        closeQuickCapture={closeQuickCapture}
        isAiModalOpenHeader={isAiModalOpenHeader}
        setIsAiModalOpenHeader={setIsAiModalOpenHeader}
        openNew={openNew}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        claims={userClaims}
        onSelectClaim={handleOpenClaim}
        onNavigate={(viewId) => {
          setView(viewId);
          if (viewId === "dosare") setDosareSubView("brief");
        }}
        onOpenNewClaim={openNew}
        onOpenSettings={openSettings}
        onOpenAlerts={openAlerts}
        onOpenBlocked={openBlockedClaims}
        onOpenQuickCapture={openQuickCapture}
        onOpenAiScan={() => setIsAiModalOpenHeader(true)}
      />
    </div>
  );
}
