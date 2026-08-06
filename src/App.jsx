import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Layers, Sunrise, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, SlidersHorizontal, X, Camera, ArrowUpDown, Filter, Settings, ShoppingCart, Clock, Bell, ChevronRight, LogOut, Sparkles, FileText
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { STATUSES, INSURERS } from "./constants/config";
import { nowISO } from "./utils/dateUtils";
import { useExportExcel } from "./hooks/useExportExcel";
import { emptyClaim } from "./utils/claimUtils";
import NotificationQueue from "./components/common/NotificationQueue";
import UndoToast from "./components/common/UndoToast";
import Login from "./components/auth/Login";
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
const SetariModal = lazyWithRetry(() => import("./components/modals/SetariModal"));
const AlerteModal = lazyWithRetry(() => import("./components/modals/AlerteModal"));
const MobileAppLayout = lazyWithRetry(() => import("./components/mobile/MobileAppLayout"));
const MobileClaimSheet = lazyWithRetry(() => import("./components/mobile/MobileClaimSheet"));
import CommandPalette from "./components/common/CommandPalette";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useClaims } from "./hooks/useClaims";
import { useClaimFilters } from "./hooks/useClaimFilters";
import { useClaimModal } from "./hooks/useClaimModal";
import { useAlerts } from "./hooks/useAlerts";
import { useSettings } from "./hooks/useSettings";
import { applyAppTokens } from "./constants/appTokens";

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

  const [dosareSubView, setDosareSubView] = useState("flux"); // "flux" | "brief" | "list"
  const [programatorFocusDate, setProgramatorFocusDate] = useState(null);

  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    try {
      return window.innerWidth < 768;
    } catch (err) {
      return false;
    }
  });

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem("workflow_dosare_display_mode") || null;
    } catch (err) {
      return null;
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeMode = displayMode || (isMobileScreen ? "mobile" : "desktop");

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

  const { session, authLoading, setSession, handleLogout } = useAuth();

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

  const showNotice = useCallback((message, type = "success") => setNotice({ message, type }), []);

  const {
    claims,
    loading,
    loadAll,
    saveClaim,
    deleteClaim,
    patchClaim,
    moveToStatus,
  } = useClaims(session, showNotice);

  const {
    capacitateZilnica,
    pragRidicare,
    pragInactivitate,
    adminEmails,
    usersList,
    customInsurers,
    branding,
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    saveTermeneAlertaStatus,
    termeneAlertaStatus,
    saveBranding,
    uploadBrandingLogo,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  } = useSettings(session, showNotice);

  useEffect(() => {
    applyAppTokens(document.documentElement, { accentColor: branding?.accentColor });
    try {
      delete document.documentElement.dataset.mtheme;
    } catch {
      /* ignore */
    }
  }, [branding?.accentColor]);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const isAdmin = useMemo(() => {
    if (!myEmail) return false;
    const fromAdmins = adminEmails.some((e) => e.toLowerCase() === myEmail.toLowerCase());
    const fromUsers = usersList.some(
      (u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin"
    );
    if (fromAdmins || fromUsers) return true;
    // Bootstrap: primul setup când nu există încă utilizatori configurați
    if (usersList.length === 0 && adminEmails.length === 0) return true;
    return false;
  }, [myEmail, adminEmails, usersList]);

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

  const highlightClaimId = useMemo(() => {
    const q = search.trim();
    if (!q || !filteredClaims.length) return null;
    return filteredClaims[0]?.id ?? null;
  }, [search, filteredClaims]);

  const {
    buckets: alertBuckets,
    totalAlertsCount,
  } = useAlerts(userClaims, pragRidicare, pragInactivitate);

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
  } = useClaimModal(showNotice);

  // Mobile field sheet (thin claim view) — full ClaimModal only via "Detalii complete"
  const [fieldClaimId, setFieldClaimId] = useState(null);
  const [captureFocusClaimId, setCaptureFocusClaimId] = useState(null);

  const openMobileClaim = useCallback((claim) => {
    if (!claim?.id) return;
    setFieldClaimId(claim.id);
  }, []);

  const closeFieldClaim = useCallback(() => {
    setFieldClaimId(null);
  }, []);

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

  // Suport navigare buton Back din browser (History API)
  const isNavigatingHistoryRef = useRef(false);

  const handleSetViewWithHistory = useCallback((newView, pushToHistory = true) => {
    setView(newView);
    if (pushToHistory && !isNavigatingHistoryRef.current) {
      window.history.pushState({ view: newView, modalOpen: false }, "", `#${newView}`);
    }
  }, [setView]);

  useEffect(() => {
    const handlePopState = (event) => {
      isNavigatingHistoryRef.current = true;
      if (modalClaim) {
        closeClaimModal();
      } else if (fieldClaimId) {
        closeFieldClaim();
      } else if (setariOpen) {
        closeSettings();
      } else if (quickCaptureOpen) {
        closeQuickCapture();
      } else if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        const hash = window.location.hash.replace("#", "");
        if (hash && ["brief", "flux", "list", "programator", "dashboard", "rapoarte"].includes(hash)) {
          setView(hash);
        }
      }
      setTimeout(() => {
        isNavigatingHistoryRef.current = false;
      }, 50);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [modalClaim, closeClaimModal, fieldClaimId, closeFieldClaim, setariOpen, closeSettings, quickCaptureOpen, closeQuickCapture, setView]);

  // Deschidere modal / field sheet — stare în istoric pentru Back
  useEffect(() => {
    if (modalClaim && !isNavigatingHistoryRef.current) {
      window.history.pushState(
        { view, modalOpen: true, claimId: modalClaim.id },
        "",
        `#claim-${modalClaim.id || "nou"}`
      );
    }
  }, [modalClaim, view]);

  useEffect(() => {
    if (fieldClaimId && !modalClaim && !isNavigatingHistoryRef.current) {
      window.history.pushState(
        { view, fieldSheet: true, claimId: fieldClaimId },
        "",
        `#field-${fieldClaimId}`
      );
    }
  }, [fieldClaimId, modalClaim, view]);

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
      setFieldClaimId(claim.id);
    }
    closeClaimModal();
    closeQuickCreate();
    return result;
  };

  const handleDelete = (id) => {
    deleteClaim(id, canEdit, {
      onUndoToast: (item) => setUndoToastItem(item),
    });
    closeClaimModal();
    if (fieldClaimId === id) closeFieldClaim();
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

  const activeModalClaim = useMemo(() => {
    if (!modalClaim?.id) return modalClaim;
    return claims.find((c) => c.id === modalClaim.id) || modalClaim;
  }, [claims, modalClaim]);

  const { exportExcel } = useExportExcel(userClaims);

  const viewLabels = {
    brief: "Brief Zilnic",
    flux: "Flux Operațional",
    list: "Listă Dosare",
    programator: "Programări Atelier",
    dashboard: "Statistici & KPI",
    rapoarte: "Raport Financiar",
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[#010409] flex items-center justify-center text-[#8B949E] gap-2"><Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...</div>;
  }
  if (!session) {
    return <Login branding={branding} onLoginSuccess={(s) => setSession(s)} />;
  }

  if (activeMode === "mobile") {
    const fieldClaim = fieldClaimId ? claims.find((c) => c.id === fieldClaimId) : null;

    return (
      <ErrorBoundary>
        <NotificationQueue notice={notice} />
        <UndoToast item={undoToastItem} onDone={() => setUndoToastItem(null)} />
        <Suspense fallback={<div className="h-screen bg-[#1C2127] text-white flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă modul mobil...</div>}>
          <MobileAppLayout
            claims={claims}
            session={session}
            userEmail={myEmail}
            onOpenClaim={openMobileClaim}
            onNewClaim={openNew}
            onPatchClaim={handlePatchClaim}
            canEditFn={canEdit}
            onNotify={showNotice}
            onLogout={handleLogout}
            onOpenSettings={openSettings}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            alertBuckets={alertBuckets}
            totalAlertsCount={totalAlertsCount}
            branding={branding}
            onSwitchToDesktop={() => toggleDisplayMode("desktop")}
            captureFocusClaimId={captureFocusClaimId}
            onCaptureFocusConsumed={() => setCaptureFocusClaimId(null)}
          />
        </Suspense>

        {fieldClaim && !modalClaim && (
          <Suspense fallback={null}>
            <MobileClaimSheet
              claim={fieldClaim}
              onClose={closeFieldClaim}
              onOpenFull={(c) => {
                // Full editor on top of sheet; closing modal returns to sheet
                openExisting(c);
              }}
              onPatch={handlePatchClaim}
              onMoveToStatus={handleMoveToStatus}
              canEdit={canEdit(fieldClaim)}
              onNotify={showNotice}
              onCapturePhotos={(c) => {
                setCaptureFocusClaimId(c.id);
                closeFieldClaim();
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
              onDelete={handleDelete}
              onClose={closeClaimModal}
              onNotify={showNotice}
              onJumpTo={(c) => { closeClaimModal(); setTimeout(() => openMobileClaim(c), 150); }}
              onSaveAndProgram={(c) => handleSave(c, { openProgramator: true })}
              insurersList={customInsurers}
              readOnly={Array.isArray(claims) && claims.some((c) => c && c.id === activeModalClaim?.id) && !canEdit(activeModalClaim)}
              allClaims={claims}
              adminEmails={adminEmails}
              desktopUi
            />
          </Suspense>
        )}

        {quickCreateOpen && (
          <Suspense fallback={null}>
            <QuickCreateClaimModal
              isOpen={quickCreateOpen}
              onClose={closeQuickCreate}
              onSave={handleSave}
              desktopUi
            />
          </Suspense>
        )}

        {setariOpen && (
          <Suspense fallback={null}>
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
              onClose={closeSettings}
              onNotify={showNotice}
              userEmail={myEmail}
              onSignOut={handleLogout}
              isAdmin={isAdmin}
              usersList={usersList}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onToggleAdminRole={handleToggleAdminRole}
              onChangePassword={handleChangePassword}
              desktopUi
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
                : branding?.accentColor || "var(--app-accent)",
              color: branding?.logoUrl ? undefined : "var(--app-accent-text)",
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
            { id: "dosare", label: "Dosare & Flux", icon: Layers, badge: userClaims.length },
            { id: "programator", label: "Programări", icon: CalendarClock },
            { id: "dashboard", label: "Statistici & Rapoarte", icon: BarChart3 },
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

        {/* Setări / profil */}
        <div className="p-1.5 shrink-0 border-t border-[var(--app-border)]">
          <button
            onClick={() => openSettings()}
            className="w-full flex items-center justify-center p-2 rounded-lg app-nav-btn transition-all"
            title={myEmail ? `Setări — ${myEmail}` : "Centru Setări"}
          >
            <div className="w-7 h-7 rounded-md app-accent-bg font-bold text-[10px] flex items-center justify-center shrink-0">
              {myEmail ? myEmail.charAt(0).toUpperCase() : "U"}
            </div>
          </button>
        </div>
      </aside>

      {/* --- RIGHT MAIN WORKSPACE CANVAS --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden app-workspace">

        {/* Top bar — breadcrumb + acțiuni */}
        <header className="relative h-12 app-header border-b px-4 flex items-center justify-between shrink-0 z-20">

          {/* Segment (dosare) — fără breadcrumb */}
          <div className="flex items-center gap-3 text-[13px] min-w-0">
            {(view === "dosare" || view === "flux" || view === "brief" || view === "list") && (
              <div className="flex items-center app-segment-track border p-0.5 rounded-lg font-medium text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => setDosareSubView("flux")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
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
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
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
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
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

          {/* UNIFIED PERFECT SEARCH BAR IN MAIN HEADER */}
          <div className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="relative app-search-lg">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută nr. auto, client, dosar…"
                className="app-search w-full pl-10 pr-20 py-2 rounded-lg text-[13px] transition-all font-medium"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
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
                  title="Deschide Paleta de Comenzi (Ctrl+K)"
                >
                  Ctrl+K
                </button>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg app-accent-bg text-[12px] font-semibold transition-all active:scale-95"
            >
              <Plus size={16} /> <span>Dosar nou</span>
            </button>

            {/* UNIFIED SUPER CENTRU DE ALERTE BUTTON */}
            {totalAlertsCount > 0 && (
              <button
                onClick={() => openAlerts("depasite")}
                className="app-alert-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold active:scale-95 transition-colors"
                title="Deschide Centrul de Alerte"
              >
                <Bell size={14} />
                <span>{totalAlertsCount} Alerte</span>
              </button>
            )}

          </div>
        </header>

        {/* DESKTOP FILTER DROPDOWNS BAR */}
        {!["brief", "programator", "flux", "dosare"].includes(view) && (
          <div className="hidden md:block px-4 py-2 bg-white border-b border-[#E0D9CC] shrink-0 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilterPanel((open) => !open)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${showFilterPanel || activeFilterCount ? "border-[#3B5166] bg-[#EEF1F3] text-[#2C4160]" : "border-[#DAD4C6] bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"}`}
              >
                <SlidersHorizontal size={14} />
                <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtre avansate"}</span>
              </button>
            </div>
            {showFilterPanel && (
              <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-[#DAD4C6] bg-[#FAF8F5] p-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#6B6558]">Tip asigurare</span>
                  <select className="in min-w-[130px]" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
                    <option value="toate">Toate</option><option value="CASCO">CASCO</option><option value="RCA">RCA</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#6B6558]">Asigurător</span>
                  <select className="in min-w-[190px]" value={filterAsigurator} onChange={(e) => setFilterAsigurator(e.target.value)}>
                    <option value="toti">Toți asigurătorii</option>
                    {insurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold text-[#6B6558]">Status</span>
                  <select className="in min-w-[190px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="toate">Toate statusurile</option>
                    {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
                  </select>
                </label>
                {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-[#B23A2E] hover:underline"><X size={13} /> Resetează</button>}
              </div>
            )}
          </div>
        )}

        {/* DECATHLON STYLE SUB-HEADER ON MOBILE: Sticky Filter & Sort Buttons */}
        <div className="grid grid-cols-2 gap-px bg-white/10 border-t border-white/10 text-white md:hidden text-[12px] font-bold">
          <button
            onClick={() => setMobileFilterSheetOpen(true)}
            className={`flex items-center justify-center gap-2 py-2.5 transition-colors ${activeFilterCount > 0 ? "bg-[#C98A2B] text-white" : "bg-[#1C2127] text-white"}`}
          >
            <Filter size={14} className="text-white" />
            <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtrează"}</span>
          </button>

          <button
            onClick={() => {
              setMobileSort((prev) => prev === "recent" ? "status" : prev === "status" ? "numar" : prev === "numar" ? "client" : "recent");
            }}
            className="flex items-center justify-center gap-2 py-2.5 bg-[#1C2127] active:bg-[#2C333D] transition-colors border-l border-white/10"
          >
            <ArrowUpDown size={14} className="text-[#C98A2B]" />
            <span className="truncate">
              {mobileSort === "recent" ? "Recente" : mobileSort === "status" ? "Status" : mobileSort === "numar" ? "Nr. dosar" : "Client"}
            </span>
          </button>
        </div>

        {/* MAIN WORKSPACE CANVAS VIEW AREA */}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă vizualizarea...</div>}>
          <main className={`flex-1 min-h-0 p-2 sm:p-4 pb-20 md:pb-4 ${(view === "flux" || view === "programator") ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă dosarele...</div>
            ) : (view === "dosare" || view === "flux" || view === "brief" || view === "list") ? (
              dosareSubView === "brief" ? (
                <BriefZilnic
                  claims={userClaims}
                  onOpen={openExisting}
                  onMoveToStatus={handleMoveToStatus}
                  onDuplicate={duplicateClaim}
                  canEditFn={canEdit}
                  pragRidicare={pragRidicare}
                  pragInactivitate={pragInactivitate}
                  alertBuckets={alertBuckets}
                  onSelectStatusFilter={(statusKey) => {
                    setFilterStatus(statusKey);
                    setDosareSubView("list");
                  }}
                />
              ) : dosareSubView === "list" ? (
                <ClaimTable claims={filteredClaims} onOpen={openExisting} onDelete={handleDelete} canEditFn={canEdit} highlightClaimId={highlightClaimId} />
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
                  highlightClaimId={highlightClaimId}
                />
              )
            ) : view === "dashboard" ? (
              <Dashboard claims={filteredClaims} onOpen={openExisting} pragRidicare={pragRidicare} />
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
              />
            ) : (
              <Rapoarte claims={filteredClaims} onPatch={handlePatchClaim} canEditFn={canEdit} />
            )}
          </main>
        </Suspense>
      </div>

      {/* --- DECATHLON FLOATING CURVED BOTTOM DOCK (MOBILE NAV BAR) --- */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 md:hidden w-[92%] max-w-sm">
        <div className="bg-[#1C2127]/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-4 py-2 grid grid-cols-[1fr_auto_1fr_1fr] gap-3 text-white items-center">
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
                  className="col-span-1 flex items-center justify-center p-3 rounded-full bg-gradient-to-tr from-[#C98A2B] to-[#E5A84B] text-white shadow-lg -mt-5 border-[3px] border-[#1C2127] active:scale-95 transition-transform"
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
                    ? "bg-[#C98A2B] text-white font-bold"
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
          <div className="bg-[#FCFAF5] w-full rounded-t-2xl border-t border-[#DAD4C6] p-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-[#DAD4C6] rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
              <h3 className="font-bold text-[15px] text-[#23282E] flex items-center gap-2">
                <Filter size={16} className="text-[#C98A2B]" /> Filtrează Dosarele
              </h3>
              <button onClick={() => setMobileFilterSheetOpen(false)} className="p-1 rounded-full text-[#8A8375] hover:bg-[#EFEAE1]">
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6B6558] uppercase mb-1">Căutare text</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8375]" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DAD4C6] text-[14px] bg-white"
                  placeholder="Nr. dosar, client, nr. auto, VIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#6B6558] uppercase mb-1">Tip asigurare</label>
                <select className="w-full p-2.5 rounded-lg border border-[#DAD4C6] text-[13px] bg-white font-semibold" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
                  <option value="toate">Toate</option>
                  <option value="CASCO">CASCO</option>
                  <option value="RCA">RCA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#6B6558] uppercase mb-1">Doar Blocat</label>
                <button
                  type="button"
                  onClick={() => setOnlyBlocked((v) => !v)}
                  className={`w-full p-2.5 rounded-lg border text-[13px] font-semibold text-center transition-colors ${onlyBlocked ? "bg-[#B23A2E] text-white border-[#B23A2E]" : "bg-white text-[#3B5166] border-[#DAD4C6]"}`}
                >
                  {onlyBlocked ? "⚠️ Blocat DA" : "Toate"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6B6558] uppercase mb-1">Asigurător</label>
              <select className="w-full p-2.5 rounded-lg border border-[#DAD4C6] text-[13px] bg-white font-semibold" value={filterAsigurator} onChange={(e) => setFilterAsigurator(e.target.value)}>
                <option value="toti">Toți asigurătorii</option>
                {insurers.map((insurer) => <option key={insurer} value={insurer}>{insurer}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6B6558] uppercase mb-1">Status Dosar</label>
              <select className="w-full p-2.5 rounded-lg border border-[#DAD4C6] text-[13px] bg-white font-semibold" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="toate">Toate statusurile</option>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#DAD4C6]">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { resetFilters(); setSearch(""); }}
                  className="flex-1 py-3 rounded-xl border border-[#B23A2E] text-[#B23A2E] text-[13px] font-bold hover:bg-red-50 text-center"
                >
                  Resetează
                </button>
              )}
              <button
                onClick={() => setMobileFilterSheetOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] text-center shadow-md"
              >
                Aplică Filtre ({filteredClaims.length} dosare)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & OVERLAYS --- */}
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 text-white">Se încarcă...</div>}>
        {modalClaim && (
          <ErrorBoundary key={activeModalClaim?.id || "new-claim"} onReset={closeClaimModal}>
            <ClaimModal
              claim={activeModalClaim}
              onClose={closeClaimModal}
              onSave={handleSave}
              onDelete={handleDelete}
              readOnly={Array.isArray(claims) && claims.some((c) => c && c.id === activeModalClaim?.id) && !canEdit(activeModalClaim)}
              allClaims={claims}
              insurersList={customInsurers}
              onJumpTo={openExisting}
              onNotify={showNotice}
              desktopUi
            />
          </ErrorBoundary>
        )}

        {alerteModalTab && (
          <AlerteModal
            claims={userClaims}
            alertBuckets={alertBuckets}
            initialTab={alerteModalTab}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            onClose={closeAlerts}
            onOpenClaim={handleOpenClaim}
            onPatchClaim={handlePatchClaim}
            onNotify={showNotice}
            desktopUi
          />
        )}

        {setariOpen && (
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
            onClose={closeSettings}
            onNotify={showNotice}
            userEmail={myEmail}
            onSignOut={handleLogout}
            isAdmin={isAdmin}
            usersList={usersList}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onToggleAdminRole={handleToggleAdminRole}
            onChangePassword={handleChangePassword}
            desktopUi
          />
        )}

        {quickCreateOpen && (
          <QuickCreateClaimModal
            isOpen={quickCreateOpen}
            onClose={closeQuickCreate}
            onSave={handleSave}
            desktopUi
          />
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
        claims={claims}
        onOpenClaim={handleOpenClaim}
        onSwitchView={setView}
        onOpenNewClaim={openNew}
        onOpenQuickCapture={openQuickCapture}
        onExportExcel={exportExcel}
      />
    </div>
  );
}
