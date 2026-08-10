import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Layers, Sunrise, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, SlidersHorizontal, X, Camera, ArrowUpDown, Filter, Settings, ShoppingCart, Clock, Bell, ChevronRight, LogOut, Sparkles, FileText, Ban
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { STATUSES, INSURERS } from "./constants/config";
import { nowISO } from "./utils/dateUtils";
import { useExportExcel } from "./hooks/useExportExcel";
import { emptyClaim } from "./utils/claimUtils";
import NotificationQueue from "./components/common/NotificationQueue";
import UndoToast from "./components/common/UndoToast";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import { lazyWithRetry } from "./utils/lazyWithRetry";
const TablouPeFaze = lazyWithRetry(() => import("./components/views/FluxOperational"));
const BriefZilnic = lazyWithRetry(() => import("./components/views/BriefZilnic"));
const ClaimTable = lazyWithRetry(() => import("./components/views/ClaimTable"));
const Dashboard = lazyWithRetry(() => import("./components/views/Dashboard"));
const Programator = lazyWithRetry(() => import("./components/views/Programator"));
const Rapoarte = lazyWithRetry(() => import("./components/views/Rapoarte"));
const QuickCapture = lazyWithRetry(() => import("./components/views/QuickCapture"));
const ClaimModal = lazyWithRetry(() => import("./components/modals/ClaimModal"));
const QuickCreateClaimModal = lazyWithRetry(() => import("./components/modals/QuickCreateClaimModal"));
// Eager: Setări e flux critic — evită chunk stale după deploy PWA.
import SetariModal from "./components/modals/SetariModal";
const AlerteModal = lazyWithRetry(() => import("./components/modals/AlerteModal"));
const MobileAppLayout = lazyWithRetry(() => import("./components/mobile/MobileAppLayout"));
const MobileClaimSheet = lazyWithRetry(() => import("./components/mobile/MobileClaimSheet"));
import CommandPalette from "./components/common/CommandPalette";
import SearchResultsOverlay from "./components/common/SearchResultsOverlay";
import ErrorBoundary from "./components/common/ErrorBoundary";
import AppButton from "./components/common/AppButton";
import EmptyWorkspace from "./components/common/EmptyWorkspace";
import OnboardingModal from "./components/common/OnboardingModal";
import ListSkeleton from "./components/common/ListSkeleton";
import LoadError from "./components/common/LoadError";
import RecoveryPassword from "./components/auth/RecoveryPassword";
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
import AtelierSwitcher from "./components/atelier/AtelierSwitcher";
import { getSearchHighlightIds } from "./utils/searchUtils";
import { isCompactMobileViewport } from "./utils/viewport";
import { useMobileBackStack } from "./hooks/useMobileBackStack";

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
      if (saved === "flux" || saved === "brief" || saved === "list") return saved;
    } catch (err) {
      /* ignore */
    }
    return "brief"; // land = logo home = Brief
  });
  const [programatorFocusDate, setProgramatorFocusDate] = useState(null);

  const [isMobileScreen, setIsMobileScreen] = useState(() => isCompactMobileViewport());
  /** Keep mobile shell mounted while camera/scanner is open across orientation changes. */
  const [lockMobileShell, setLockMobileShell] = useState(false);

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem("workflow_dosare_display_mode") || null;
    } catch (err) {
      return null;
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(isCompactMobileViewport());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeMode =
    displayMode || (isMobileScreen || lockMobileShell ? "mobile" : "desktop");

  const toggleDisplayMode = (mode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem("workflow_dosare_display_mode", mode);
    } catch (err) {
      console.warn("Failed saving display mode to localStorage", err);
    }
  };


  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "signup"

  const {
    session,
    authLoading,
    setSession,
    handleLogout: authLogout,
    passwordRecovery,
    clearPasswordRecovery,
  } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem("workflow_dosare_active_view", view);
    } catch (err) {
      console.warn("Unable to persist active view to localStorage", err);
    }
    if (["brief", "programator"].includes(view)) {
      setShowFilterPanel(false);
    }
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem("workflow_dosare_sub_view", dosareSubView);
    } catch (err) {
      console.warn("Unable to persist dosare sub-view", err);
    }
  }, [dosareSubView]);

  const handleSwitchView = useCallback((target) => {
    if (target === "brief" || target === "flux" || target === "list") {
      setView("dosare");
      setDosareSubView(target);
      return;
    }
    setView(target);
  }, []);

  const showNotice = useCallback((message, type = "success", extras = {}) => {
    setNotice({ message, type, ...extras });
  }, []);

  // Tour-ul de onboarding nu se mai deschide automat la login.
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine === false
  );

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const {
    atelierId,
    atelier,
    tenancyReady,
    billing,
    memberCount,
    memberships,
    activeRole,
    switchAtelier,
    refresh: refreshAtelier,
  } = useAtelier(session, {});

  const startStripeCheckout = useCallback(async (id) => {
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { atelierId: id, origin: window.location.origin },
    });
    if (error || data?.error) {
      throw new Error(data?.error || error?.message || "Checkout eșuat");
    }
    if (data?.url) window.location.href = data.url;
  }, []);

  const startStripePortal = useCallback(async (id) => {
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: { atelierId: id, origin: window.location.origin },
    });
    if (error || data?.error) {
      throw new Error(data?.error || error?.message || "Portal eșuat");
    }
    if (data?.url) window.location.href = data.url;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billingFlag = params.get("billing");
    if (billingFlag === "success") {
      showNotice("Abonament activat. Mulțumim!", "success");
      refreshAtelier();
      params.delete("billing");
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", next.replace(/\?$/, ""));
    } else if (billingFlag === "cancel") {
      showNotice("Checkout anulat.", "info");
      params.delete("billing");
      const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", next.replace(/\?$/, ""));
    }
  }, [showNotice, refreshAtelier]);

  const {
    capacitateZilnica,
    pragRidicare,
    pragInactivitate,
    adminEmails,
    usersList,
    customInsurers,
    branding: settingsBranding,
    billingSettings,
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    saveTermeneAlertaStatus,
    termeneAlertaStatus,
    saveBranding: saveBrandingBase,
    uploadBrandingLogo,
    saveBilling,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  } = useSettings(session, showNotice, {
    atelierId,
    atelierSlug: atelier?.slug || null,
  });

  const saveBranding = useCallback(
    async (next) => {
      const ok = await saveBrandingBase(next);
      if (ok !== false) refreshAtelier();
      return ok;
    },
    [saveBrandingBase, refreshAtelier]
  );

  // Tenancy: settingsBranding after load/save; atelier row fills gaps / cold cache defaults.
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
    if (tenancyReady && atelier) return billing;
    return normalizeBilling({
      ...billingSettings,
      memberCount: memberCount || usersList.length,
    });
  }, [tenancyReady, atelier, billing, billingSettings, memberCount, usersList.length]);

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
  const userCanCreate = canCreateClaim(myRole) && effectiveBilling.canCreateClaim;

  const isAdmin = useMemo(() => {
    if (!myEmail) return false;
    if (activeRole === "admin") return true;
    if (myRole === "admin") return true;
    const fromAdmins = adminEmails.some((e) => e.toLowerCase() === myEmail.toLowerCase());
    const fromUsers = usersList.some(
      (u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin"
    );
    if (fromAdmins || fromUsers) return true;
    // Solo atelier: singurul membru poate administra (rol greșit în DB nu blochează UI)
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

  // Mobile field sheet (thin claim view) — full ClaimModal only via "Detalii complete"
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

  /** Logout must reset overlays + hash — otherwise `#setari` / open Setări survive and reopen after login. */
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

  /** Logout must reset overlays + hash — otherwise `#setari` / open Setări survive and reopen after login. */
  const handleLogout = useCallback(async () => {
    resetShellToBrief();
    await authLogout();
  }, [authLogout, resetShellToBrief]);

  // Session dropped without our logout handler (expired token, etc.)
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

  // Global Ctrl+K / Cmd+K keyboard shortcut listener for CommandPalette search
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

  // —— Back: exit only on Brief; elsewhere return to previous screen ——
  const isNavigatingHistoryRef = useRef(false);

  const handleSetViewWithHistory = useCallback((newView, pushToHistory = true) => {
    setView(newView);
    if (pushToHistory && !isNavigatingHistoryRef.current) {
      try {
        window.history.pushState({ view: newView, modalOpen: false }, "", `#${newView}`);
      } catch {
        /* ignore */
      }
    }
  }, [setView]);

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
    },
  });

  const requestCloseAlerts = useCallback(() => requestClose("alerte"), [requestClose]);
  const requestCloseSettings = useCallback(() => {
    if (activeMode === "mobile") {
      requestClose("setari");
      return;
    }
    // Desktop: fără history.back() — interfera cu deschiderea Setărilor.
    closeSettings();
  }, [activeMode, requestClose, closeSettings]);
  const requestCloseClaimModal = useCallback(() => requestClose("claim"), [requestClose]);
  const requestCloseFieldClaim = useCallback(() => requestClose("field"), [requestClose]);
  const requestCloseQuickCreate = useCallback(() => requestClose("quickCreate"), [requestClose]);

  // Desktop Back (hash views) — keep light support
  useEffect(() => {
    if (activeMode === "mobile") return undefined;
    const handlePopState = (event) => {
      isNavigatingHistoryRef.current = true;
      if (modalClaim) closeClaimModal();
      else if (alerteModalTab) closeAlerts();
      else if (quickCreateOpen) closeQuickCreate();
      else if (quickCaptureOpen) closeQuickCapture();
      else if (event.state?.view) setView(event.state.view);
      // setariOpen: fără sync history pe desktop — nu închidem pe popstate
      window.setTimeout(() => {
        isNavigatingHistoryRef.current = false;
      }, 50);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    activeMode,
    modalClaim,
    closeClaimModal,
    alerteModalTab,
    closeAlerts,
    quickCreateOpen,
    closeQuickCreate,
    quickCaptureOpen,
    closeQuickCapture,
    setView,
  ]);

  useEffect(() => {
    if (activeMode === "mobile") return;
    if (modalClaim && !isNavigatingHistoryRef.current) {
      try {
        window.history.pushState(
          { view, modalOpen: true, claimId: modalClaim.id },
          "",
          `#claim-${modalClaim.id || "nou"}`
        );
      } catch {
        /* ignore */
      }
    }
  }, [activeMode, modalClaim, view]);

  useEffect(() => {
    if (activeMode === "mobile") return;
    if (alerteModalTab && !isNavigatingHistoryRef.current) {
      try {
        window.history.pushState({ view, overlay: "alerte" }, "", `#alerte-${alerteModalTab}`);
      } catch {
        /* ignore */
      }
    }
  }, [activeMode, alerteModalTab, view]);

  // Desktop Setări: fără pushState/#setari — history cauza închiderea imediată a modalului.

  // Administrator can edit ALL claims in the system; Operators can edit their own (by ID or Email) or legacy claims
  const canEdit = useCallback(
    (c) => {
      if (!c) return false;
      if (isAdmin) return true;
      if (myId && c.createdBy === myId) return true;
      if (myEmail && c.createdByEmail && c.createdByEmail.toLowerCase() === myEmail.toLowerCase()) return true;
      if (!c.createdBy && !c.createdByEmail) return true; // Legacy claims without owner
      return false;
    },
    [myId, myEmail, isAdmin]
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => { if (session) loadAll(); }, [loadAll, session]);

  const handleChangePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const handleSave = async (claim, options = {}) => {
    setSaving(true);
    const result = await saveClaim(claim, options);
    setSaving(false);
    if (!result?.success) return result;
    if (options.openProgramator && claim?.dataProgramare) {
      setProgramatorFocusDate(String(claim.dataProgramare).slice(0, 10));
      setView("programator");
    }
    if (activeMode === "mobile" && claim?.id) {
      replaceClaimWithField(claim.id);
    } else {
      closeClaimModal();
    }
    closeQuickCreate();
    return result;
  };

  const handleDelete = (id) => {
    deleteClaim(id, canEdit, {
      onUndoToast: (item) => setUndoToastItem(item),
    });
    requestCloseClaimModal();
    if (fieldClaimId === id) requestCloseFieldClaim();
  };

  const handleMoveToStatus = (claim, newStatusKey) => {
    moveToStatus(claim, newStatusKey, canEdit, {
      onUndoToast: (item) => setUndoToastItem(item),
    });
  };

  const handlePatchClaim = async (id, patch) => {
    return patchClaim(id, patch, { canEditFn: canEdit, skipOwnershipCheck: false });
  };

  const handleOpenClaim = useCallback((claimOrRef) => {
    if (!claimOrRef) return;
    const id = typeof claimOrRef === "object" ? claimOrRef.id : claimOrRef;
    const fresh = id ? claims.find((c) => c.id === id) : null;
    openExisting(fresh || claimOrRef);
  }, [claims, openExisting]);

  const clearSearch = useCallback(() => setSearch(""), [setSearch]);

  const handleSearchSelectMobile = useCallback(
    (claim) => {
      clearSearch();
      openMobileClaim(claim);
    },
    [clearSearch, openMobileClaim]
  );

  const activeModalClaim = useMemo(() => {
    if (!modalClaim?.id) return modalClaim;
    return claims.find((c) => c.id === modalClaim.id) || modalClaim;
  }, [claims, modalClaim]);

  const { exportExcel, exportPdf } = useExportExcel(userClaims);

  const viewLabels = {
    brief: "Brief Zilnic",
    flux: "Flux Operațional",
    list: "Listă Dosare",
    programator: "Programări Atelier",
    dashboard: "Statistici & KPI",
    rapoarte: "Raport Financiar",
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center text-[var(--app-muted)] gap-2"><Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...</div>;
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
            onSelect={handleSearchSelectMobile}
            onClear={clearSearch}
            onNotify={showNotice}
          />
        )}
        <OnboardingModal
          open={onboardingOpen}
          onDismiss={dismissTour}
          onCreateClaim={userCanCreate ? () => openNew() : null}
          roleLabel={myRoleLabel}
        />

        <Suspense fallback={<div className="h-screen bg-[var(--app-surface)] text-white flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă modul mobil...</div>}>
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

        {/* Dosar/sheet above Alerte (layer front) — closing returns to Alerte still open */}
        {fieldClaim && !modalClaim && (
          <Suspense fallback={null}>
            <MobileClaimSheet
              claim={fieldClaim}
              onClose={requestCloseFieldClaim}
              onOpenFull={(c) => {
                // Full editor on top of sheet; closing modal returns to sheet
                openExisting(c);
              }}
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
              onJumpTo={(c) => { closeClaimModal(); setTimeout(() => openMobileClaim(c), 150); }}
              onSaveAndProgram={(c) => handleSave(c, { openProgramator: true })}
              insurersList={customInsurers}
              readOnly={Array.isArray(claims) && claims.some((c) => c && c.id === activeModalClaim?.id) && !canEdit(activeModalClaim)}
              allClaims={claims}
              adminEmails={adminEmails}
              userEmail={myEmail}
            />
          </Suspense>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <div className="h-screen flex app-shell overflow-hidden relative font-sans">
      <NotificationQueue notice={notice} />
      <UndoToast item={undoToastItem} onDone={() => setUndoToastItem(null)} />

      <OnboardingModal
        open={onboardingOpen}
        onDismiss={dismissTour}
        onCreateClaim={userCanCreate ? () => openNew() : null}
        desktopUi
        roleLabel={myRoleLabel}
      />

      {/* --- DESKTOP MINIMAL SIDEBAR (icoane fixe) --- */}
      <aside className="hidden md:flex flex-col app-sidebar w-14 shrink-0 z-30 overflow-hidden">

        {/* Top Brand Logo Button -> Acasă / Brief Zilnic */}
        <button
          type="button"
          onClick={() => {
            setView("dosare");
            setDosareSubView("brief");
          }}
          className="h-14 flex items-center justify-center border-b border-[var(--app-border)] shrink-0 hover:bg-[var(--app-surface-2)] transition-colors w-full cursor-pointer"
          title="Revenire la ecranul principal (Brief Zilnic)"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px] shrink-0 overflow-hidden border border-[var(--app-border)]"
            style={{
              background: branding?.logoUrl
                ? "#fff"
                : "var(--app-surface-2)",
              color: branding?.logoUrl ? undefined : "var(--app-text-strong)",
            }}
            title={branding?.atelierNume || "Dosare Daună"}
          >
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              branding?.atelierShort || "WD"
            )}
          </div>
        </button>

        {/* Navigare principală — doar icoane */}
        <div className="flex-1 py-3 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {[
            { id: "dosare", label: "Dosare (Brief / Flux / Tabel)", icon: Layers, badge: userClaims.length },
            { id: "programator", label: "Programări", icon: CalendarClock },
            { id: "dashboard", label: "Statistici", icon: BarChart3 },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`w-full flex items-center justify-center p-2.5 transition-all app-nav-btn ${
                  active ? "is-active" : ""
                }`}
                title={label}
              >
                <span className="relative inline-flex">
                  <Icon size={20} className="shrink-0" />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[9px] font-bold leading-[15px] text-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Setări (1 click) + profil / switcher atelier */}
        <div className="p-1.5 shrink-0 border-t border-[var(--app-border)] space-y-1">
          <button
            type="button"
            onClick={openSettings}
            className={`w-full flex items-center justify-center p-2 rounded-lg app-nav-btn transition-all ${
              setariOpen ? "is-active" : ""
            }`}
            title="Setări"
            aria-label="Setări"
            aria-pressed={setariOpen}
          >
            <Settings size={20} className="shrink-0" />
          </button>
          <AtelierSwitcher
            memberships={memberships}
            activeId={atelierId}
            userEmail={myEmail}
            onSwitch={async (id) => {
              const ok = await switchAtelier(id);
              if (ok) showNotice("Atelier schimbat.", "success");
            }}
            onOpenSettings={openSettings}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* --- RIGHT MAIN WORKSPACE CANVAS --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden app-workspace">

        {/* Top bar — breadcrumb + acțiuni */}
        <header className="relative h-12 app-header border-b px-4 flex items-center justify-between shrink-0 z-20">

          {/* Segment (dosare) — fără breadcrumb */}
          <div className="flex items-center gap-3 text-[13px] min-w-0">
            {(view === "dosare" || view === "flux" || view === "brief" || view === "list") && (
              <div className="flex items-center app-segment-track border p-0.5 rounded-full font-medium text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOnlyBlocked(false);
                    setDosareSubView("flux");
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    dosareSubView === "flux"
                      ? "app-segment-active"
                      : "app-muted hover:text-[var(--app-text)]"
                  }`}
                >
                  <Layers size={12} />
                  <span className="hidden md:inline">Flux</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDosareSubView("brief")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    dosareSubView === "brief"
                      ? "app-segment-active"
                      : "app-muted hover:text-[var(--app-text)]"
                  }`}
                >
                  <Sunrise size={12} />
                  <span className="hidden md:inline">Brief</span>
                  {totalAlertsCount > 0 && (
                    <span className="bg-[var(--app-danger)] text-white text-[9px] px-1 py-0 rounded-full font-mono min-w-[14px] text-center">
                      {totalAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDosareSubView("list")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    dosareSubView === "list"
                      ? "app-segment-active"
                      : "app-muted hover:text-[var(--app-text)]"
                  }`}
                >
                  <List size={12} />
                  <span className="hidden md:inline">Tabel</span>
                </button>
              </div>
            )}
          </div>

          {/* Search — honest launcher (same as Ctrl+K); icon below lg */}
          <div className="flex items-center absolute left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="lg:hidden p-2 rounded-lg app-nav-btn text-[var(--app-muted)] hover:text-[var(--app-text)]"
              title="Caută sau comandă (Ctrl+K)"
              aria-label="Caută sau comandă"
            >
              <Search size={18} />
            </button>
            <div className="hidden lg:block relative app-search-lg">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] pointer-events-none" />
              <input
                type="text"
                value={search}
                readOnly
                tabIndex={0}
                role="button"
                aria-label="Caută sau comandă"
                onFocus={() => setIsCommandPaletteOpen(true)}
                onClick={() => setIsCommandPaletteOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") return;
                  // Any printable key / Backspace opens smart search with current text
                  if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") {
                    e.preventDefault();
                    setIsCommandPaletteOpen(true);
                  }
                }}
                placeholder="Caută sau comandă…"
                className="app-search w-full pl-10 pr-20 py-2 rounded-lg text-[13px] transition-all font-medium cursor-pointer"
                title="Caută sau comandă (Ctrl+K)"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch("");
                    }}
                    className="p-0.5 rounded-full hover:bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                    title="Șterge căutarea"
                  >
                    <X size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="app-kbd text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded"
                  title="Căutare inteligentă (Ctrl+K)"
                >
                  Ctrl+K
                </button>
              </div>
            </div>
          </div>

          {/* Right Header Actions — same height/padding for Dosar nou + Alerte */}
          <div className="flex items-center gap-2">
            {userCanCreate ? (
              <AppButton
                variant="primary"
                onClick={() => openNew()}
                className="app-header-action-btn"
              >
                <Plus size={14} /> <span>Dosar nou</span>
              </AppButton>
            ) : (
              <span
                className="app-type-xs text-[var(--app-muted)] px-2 hidden sm:inline"
                title={ROLES[myRole]?.description}
              >
                {myRoleLabel}
              </span>
            )}

            <AppButton
              variant={totalAlertsCount > 0 ? "danger" : "secondary"}
              onClick={() => openAlerts(totalAlertsCount > 0 ? "depasite" : "toate")}
              className="app-header-action-btn"
              title="Deschide Centrul de Alerte"
            >
              <Bell size={14} />
              <span>{totalAlertsCount} Alerte</span>
            </AppButton>

            {blockedCount > 0 ? (
              <AppButton
                variant="secondary"
                onClick={openBlockedClaims}
                className="app-header-action-btn"
                title="Dosare blocate — inventar separat de alerte"
              >
                <Ban size={14} />
                <span>{blockedCount} Blocate</span>
              </AppButton>
            ) : null}

          </div>
        </header>

        {/* DESKTOP FILTER DROPDOWNS BAR */}
        {!["brief", "programator", "flux", "dosare"].includes(view) && (
          <div className="hidden md:block px-4 py-2 bg-white border-b border-[var(--app-border)] shrink-0 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilterPanel((open) => !open)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${showFilterPanel || activeFilterCount ? "border-[var(--app-muted)] bg-[var(--app-surface-muted)] text-[var(--app-text)]" : "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:bg-[var(--app-border-soft)]"}`}
              >
                <SlidersHorizontal size={14} />
                <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtre avansate"}</span>
              </button>
            </div>
            {showFilterPanel && (
              <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Tip asigurare</span>
                  <select className="in min-w-[130px]" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
                    <option value="toate">Toate</option><option value="CASCO">CASCO</option><option value="RCA">RCA</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Asigurător</span>
                  <select className="in min-w-[190px]" value={filterAsigurator} onChange={(e) => setFilterAsigurator(e.target.value)}>
                    <option value="toti">Toți asigurătorii</option>
                    {insurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[var(--app-muted)]">Status</span>
                  <select className="in min-w-[190px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="toate">Toate statusurile</option>
                    {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
                  </select>
                </label>
                {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-[var(--app-danger)] hover:underline"><X size={13} /> Resetează</button>}
              </div>
            )}
          </div>
        )}

        {/* DECATHLON STYLE SUB-HEADER ON MOBILE: Sticky Filter & Sort Buttons */}
        <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10 text-white md:hidden text-[12px] font-bold">
          <button
            onClick={() => setMobileFilterSheetOpen(true)}
            className={`flex items-center justify-center gap-2 py-2.5 transition-colors ${activeFilterCount > 0 ? "bg-[var(--app-accent)] text-white" : "bg-[var(--app-surface)] text-white"}`}
          >
            <Filter size={14} className="text-white" />
            <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtrează"}</span>
          </button>

          <button
            onClick={() => {
              setMobileSort((prev) => prev === "recent" ? "status" : prev === "status" ? "numar" : prev === "numar" ? "client" : "recent");
            }}
            className="flex items-center justify-center gap-2 py-2.5 bg-[var(--app-surface)] active:bg-[var(--app-surface-muted)] transition-colors border-l border-white/10"
          >
            <ArrowUpDown size={14} className="text-[var(--app-accent)]" />
            <span className="truncate">
              {mobileSort === "recent" ? "Recente" : mobileSort === "status" ? "Status" : mobileSort === "numar" ? "Nr. dosar" : "Client"}
            </span>
          </button>
        </div>

        {/* MAIN WORKSPACE CANVAS VIEW AREA */}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[var(--app-muted)] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă vizualizarea...</div>}>
          <main className={`flex-1 min-h-0 p-2 sm:p-4 pb-20 md:pb-4 ${(view === "flux" || view === "programator") ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
            {loading ? (
              <ListSkeleton
                rows={dosareSubView === "list" ? 8 : 6}
                variant={dosareSubView === "list" ? "table" : "cards"}
              />
            ) : loadError || isOffline ? (
              <LoadError
                message={loadError?.message}
                offline={isOffline || loadError?.offline}
                onRetry={loadAll}
              />
            ) : (view === "dosare" || view === "flux" || view === "brief" || view === "list") && userClaims.length === 0 ? (
              <EmptyWorkspace
                onNew={userCanCreate ? () => openNew() : null}
                ownershipHint={!isAdmin && claims.length > 0}
                roleLabel={myRoleLabel}
              />
            ) : (view === "dosare" || view === "flux" || view === "brief" || view === "list") ? (
              dosareSubView === "brief" ? (
                <BriefZilnic
                  claims={userClaims}
                  onOpen={openExisting}
                  onPatchClaim={handlePatchClaim}
                  onMoveToStatus={handleMoveToStatus}
                  onDuplicate={duplicateClaim}
                  canEditFn={canEdit}
                  pragRidicare={pragRidicare}
                  pragInactivitate={pragInactivitate}
                  alertBuckets={alertBuckets}
                  onNotify={showNotice}
                  onOpenBlocked={openBlockedClaims}
                  onSelectStatusFilter={(statusKey) => {
                    setFilterStatus(statusKey);
                    setOnlyBlocked(false);
                    setDosareSubView("list");
                    setView("dosare");
                  }}
                />
              ) : dosareSubView === "list" ? (
                <div className="space-y-3 flex flex-col flex-1 min-h-0">
                  {onlyBlocked ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#4A5568]/30 bg-[var(--app-surface)] px-3 py-2.5 shrink-0">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--app-text-strong)]">
                          Filtru: doar dosare blocate
                        </p>
                        <p className="text-[11px] text-[var(--app-muted)]">
                          {filteredClaims.length} {filteredClaims.length === 1 ? "dosar" : "dosare"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOnlyBlocked(false)}
                        className="shrink-0 rounded-lg border border-[var(--app-border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"
                      >
                        Arată toate
                      </button>
                    </div>
                  ) : null}
                  <ClaimTable
                    claims={filteredClaims}
                    onOpen={openExisting}
                    onDelete={handleDelete}
                    canEditFn={canEdit}
                    highlightClaimIds={highlightClaimIds}
                    onNotify={showNotice}
                    onTogglePieseSosite={(claim, val) => handlePatchClaim(claim.id, { pieseSosite: val })}
                    onScheduleFromPiese={async (claim, iso) => {
                      const ok = await handlePatchClaim(claim.id, { dataProgramare: iso });
                      if (ok !== false) {
                        showNotice(
                          `Programare salvată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""}`.trim(),
                          "success"
                        );
                      }
                      return ok;
                    }}
                    onPatchPieseDates={(claim, patch) => handlePatchClaim(claim.id, patch)}
                  />
                </div>
              ) : (
                <TablouPeFaze
                  claims={filteredClaims}
                  onOpen={handleOpenClaim}
                  onMoveToStatus={handleMoveToStatus}
                  onTogglePieseSosite={(claim, val) => handlePatchClaim(claim.id, { pieseSosite: val })}
                  onScheduleFromPiese={async (claim, iso) => {
                    const ok = await handlePatchClaim(claim.id, { dataProgramare: iso });
                    if (ok !== false) {
                      showNotice(
                        `Programare salvată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""}`.trim(),
                        "success"
                      );
                    }
                    return ok;
                  }}
                  onPatchPieseDates={(claim, patch) => handlePatchClaim(claim.id, patch)}
                  onAddInStatus={openNew}
                  onDuplicate={duplicateClaim}
                  canEditFn={canEdit}
                  pragRidicare={pragRidicare}
                  onNotify={showNotice}
                  highlightClaimIds={highlightClaimIds}
                />
              )
            ) : view === "dashboard" ? (
              <Dashboard
                claims={filteredClaims}
                onOpen={openExisting}
                pragRidicare={pragRidicare}
                onOpenRapoarte={() => setView("rapoarte")}
                onOpenAlerts={openAlerts}
                stageOverdueCount={alertBuckets.counts.stagnate}
              />
            ) : view === "programator" ? (
              <Programator
                claims={claims}
                onOpen={openExisting}
                onPatch={(id, patch) => handlePatchClaim(id, patch)}
                canEditFn={canEdit}
                capacitate={capacitateZilnica}
                onSetCapacitate={saveCapacitate}
                onAddInStatus={openNew}
                initialDate={programatorFocusDate}
                onNotify={showNotice}
              />
            ) : (
              <Rapoarte claims={filteredClaims} onPatch={handlePatchClaim} canEditFn={canEdit} />
            )}
          </main>
        </Suspense>
      </div>

      {/* --- DECATHLON FLOATING CURVED BOTTOM DOCK (MOBILE NAV BAR) --- */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 md:hidden w-[92%] max-w-sm">
        <div className="bg-[var(--app-surface)]/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-4 py-2 grid grid-cols-[1fr_auto_1fr_1fr] gap-3 text-white items-center">
          {[
            { id: "dosare", label: "Dosare", icon: Layers },
            { id: "quickCapture", label: "Scan/Foto", icon: Camera, isAction: true },
            { id: "programator", label: "Programat", icon: CalendarClock },
            { id: "dashboard", label: "Statistici", icon: BarChart3 },
          ].map(({ id, label, icon: Icon, isAction }) => {
            const active = view === id;
            if (isAction) {
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openQuickCapture()}
                  className="col-span-1 flex items-center justify-center p-3 rounded-full bg-gradient-to-tr from-[var(--app-accent)] to-[#E5A84B] text-white shadow-lg -mt-5 border-[3px] border-[var(--app-surface)] active:scale-95 transition-transform"
                  title="Captură rapidă foto & scanner cameră"
                >
                  <Icon size={20} />
                  <span className="text-[8.5px] font-black tracking-tight uppercase mt-0.5">Scan</span>
                </button>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-full transition-all min-w-0 ${
                  active
                    ? "bg-[var(--app-accent)] text-white font-bold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[9.5px] font-semibold tracking-tight mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- DECATHLON MOBILE BOTTOM SHEET FILTERS --- */}
      {mobileFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center md:hidden">
          <div className="bg-[var(--app-surface-2)] w-full rounded-t-2xl border-t border-[var(--app-border)] p-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-[var(--app-border)] rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
              <h3 className="font-bold text-[15px] text-[var(--app-text-strong)] flex items-center gap-2">
                <Filter size={16} className="text-[var(--app-accent)]" /> Filtrează Dosarele
              </h3>
              <button onClick={() => setMobileFilterSheetOpen(false)} className="p-1 rounded-full text-[var(--app-muted)] hover:bg-[var(--app-border-soft)]">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Căutare text</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--app-border)] text-[14px] bg-white"
                  placeholder="Nr. dosar, client, nr. auto, VIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Tip asigurare</label>
                <select className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-white font-semibold" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
                  <option value="toate">Toate</option>
                  <option value="CASCO">CASCO</option>
                  <option value="RCA">RCA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Doar Blocat</label>
                <button
                  type="button"
                  onClick={() => setOnlyBlocked((v) => !v)}
                  className={`w-full p-2.5 rounded-lg border text-[13px] font-semibold text-center transition-colors ${onlyBlocked ? "bg-[var(--app-danger)] text-white border-[var(--app-danger)]" : "bg-white text-[var(--app-muted)] border-[var(--app-border)]"}`}
                >
                  {onlyBlocked ? "Blocat DA" : "Toate"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Asigurător</label>
              <select className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-white font-semibold" value={filterAsigurator} onChange={(e) => setFilterAsigurator(e.target.value)}>
                <option value="toti">Toți asigurătorii</option>
                {insurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase mb-1">Status Dosar</label>
              <select className="w-full p-2.5 rounded-lg border border-[var(--app-border)] text-[13px] bg-white font-semibold" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="toate">Toate statusurile</option>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--app-border)]">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { resetFilters(); setSearch(""); }}
                  className="flex-1 py-3 rounded-xl border border-[var(--app-danger)] text-[var(--app-danger)] text-[13px] font-bold hover:bg-red-50 text-center"
                >
                  Resetează
                </button>
              )}
              <button
                onClick={() => setMobileFilterSheetOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[var(--app-accent)] text-white text-[13px] font-bold hover:bg-[var(--app-accent-hover)] text-center shadow-md"
              >
                Aplică Filtre ({filteredClaims.length} dosare)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & OVERLAYS ---
          Alerte (base z) before Claim (front z) so dosarul din alerte rămâne deasupra;
          la închiderea dosarului, Centrul de Alerte rămâne deschis. */}
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 text-white">Se încarcă...</div>}>
        {alerteModalTab && (
          <AlerteModal
            claims={userClaims}
            alertBuckets={alertBuckets}
            initialTab={alerteModalTab}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            onClose={requestCloseAlerts}
            onOpenClaim={handleOpenClaim}
            onPatchClaim={handlePatchClaim}
            onNotify={showNotice}
            desktopUi
          />
        )}

        {setariOpen && (
          <ErrorBoundary onReset={requestCloseSettings}>
            <SetariModal
              claims={claims}
              capacitateZilnica={capacitateZilnica}
              pragRidicare={pragRidicare}
              pragInactivitate={pragInactivitate}
              termeneAlertaStatus={termeneAlertaStatus}
              onSaveTermeneAlertaStatus={saveTermeneAlertaStatus}
              insurersList={customInsurers}
              onSaveInsurers={saveInsurers}
              onSaveCapacitate={saveCapacitate}
              onSavePrag={savePragRidicare}
              onSavePragInactivitate={savePragInactivitate}
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
              tenancyReady={tenancyReady}
              atelierId={atelierId}
              atelierSlug={atelier?.slug || null}
              onStripeCheckout={startStripeCheckout}
              onStripePortal={startStripePortal}
              onDataChanged={loadAll}
              desktopUi
            />
          </ErrorBoundary>
        )}

        {quickCreateOpen && (
          <QuickCreateClaimModal
            isOpen={quickCreateOpen}
            onClose={requestCloseQuickCreate}
            onSave={handleSave}
            onNotify={showNotice}
            allClaims={claims}
            initialStatus={quickCreateDefaults?.status}
            initialDataProgramare={quickCreateDefaults?.dataProgramare}
            desktopUi
          />
        )}

        {modalClaim && (
          <ErrorBoundary key={activeModalClaim?.id || "new-claim"} onReset={requestCloseClaimModal}>
            <ClaimModal
              claim={activeModalClaim}
              onClose={requestCloseClaimModal}
              onSave={handleSave}
              onPatch={handlePatchClaim}
              onDelete={handleDelete}
              readOnly={Array.isArray(claims) && claims.some((c) => c && c.id === activeModalClaim?.id) && !canEdit(activeModalClaim)}
              allClaims={claims}
              insurersList={customInsurers}
              onJumpTo={openExisting}
              onNotify={showNotice}
              desktopUi
              userEmail={myEmail}
            />
          </ErrorBoundary>
        )}

        {quickCaptureOpen && (
          <QuickCapture
            claims={claims}
            onClose={closeQuickCapture}
            onPatch={handlePatchClaim}
            canEditFn={canEdit}
            onNotify={showNotice}
          />
        )}
      </Suspense>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        claims={userClaims}
        initialQuery={search}
        onQueryChange={setSearch}
        onOpenClaim={(claim) => {
          clearSearch();
          handleOpenClaim(claim);
        }}
        onSwitchView={(id) => {
          clearSearch();
          handleSwitchView(id);
        }}
        onOpenNewClaim={
          userCanCreate
            ? () => {
                clearSearch();
                openNew();
              }
            : undefined
        }
        onOpenQuickCapture={() => {
          clearSearch();
          openQuickCapture();
        }}
        onExportExcel={exportExcel}
        onExportPdf={exportPdf}
      />

      {/* Desktop: fără overlay global — bara/Ctrl+K folosesc doar paleta inteligentă.
          Mobil păstrează SearchResultsOverlay în shell-ul mobil. */}
    </div>
  );
}
