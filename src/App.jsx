import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import {
  Layers, Sunrise, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, SlidersHorizontal, X, Camera, ArrowUpDown, Filter, Settings, ShoppingCart, Clock, Bell, ChevronRight, LogOut, Sparkles, FileText
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { STATUSES, INSURERS } from "./constants/config";
import { nowISO } from "./utils/dateUtils";
import { useExportExcel } from "./hooks/useExportExcel";
import { emptyClaim } from "./utils/claimUtils";
import Notification from "./components/common/Notification";
import Login from "./components/auth/Login";
const TablouPeFaze = lazy(() => import("./components/views/FluxOperational"));
const BriefZilnic = lazy(() => import("./components/views/BriefZilnic"));
const ClaimTable = lazy(() => import("./components/views/ClaimTable"));
const Dashboard = lazy(() => import("./components/views/Dashboard"));
const Programator = lazy(() => import("./components/views/Programator"));
const Rapoarte = lazy(() => import("./components/views/Rapoarte"));
const QuickCapture = lazy(() => import("./components/views/QuickCapture"));
const ClaimModal = lazy(() => import("./components/modals/ClaimModal"));
const SetariModal = lazy(() => import("./components/modals/SetariModal"));
const AlerteModal = lazy(() => import("./components/modals/AlerteModal"));
import CommandPalette from "./components/common/CommandPalette";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useClaims } from "./hooks/useClaims";
import { useClaimFilters } from "./hooks/useClaimFilters";
import { useClaimModal } from "./hooks/useClaimModal";
import { useAlerts } from "./hooks/useAlerts";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState("brief");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [navHovered, setNavHovered] = useState(false);

  const { session, authLoading, setSession, handleLogout } = useAuth();

  useEffect(() => {
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
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  } = useSettings(session, showNotice);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  const isAdmin = useMemo(() => {
    if (!myEmail) return false;
    if (adminEmails.length === 0) return true; // Default admin mode for single-user/initial setup
    return (
      adminEmails.some((e) => e.toLowerCase() === myEmail.toLowerCase()) ||
      usersList.some((u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin")
    );
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
    totalAlertsCount,
  } = useClaimFilters({
    claims,
    myId,
    myEmail,
    isAdmin,
    pragRidicare,
    pragInactivitate,
  });

  const {
    alertCount,
    blockedCount,
    gataNeridicateCount,
    acceptPlataNoPartsCount,
    inactiveCount,
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
  } = useClaimModal(showNotice);

  // Global Ctrl+K / Cmd+K keyboard shortcut listener for CommandPalette search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


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
    if (!result.success) return;
    closeClaimModal();
    if (result.openProgramator) setView("programator");
  };

  const handleDelete = async (id) => {
    setSaving(true);
    const success = await deleteClaim(id, canEdit);
    setSaving(false);
    if (!success) return;
    closeClaimModal();
  };

  const handleMoveToStatus = async (claim, newStatusKey) => {
    await moveToStatus(claim, newStatusKey, canEdit);
  };

  const handlePatchClaim = async (id, patch, skipOwnershipCheck = false) => {
    await patchClaim(id, patch, { canEditFn: canEdit, skipOwnershipCheck });
  };

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
    return <div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...</div>;
  }
  if (!session) {
    return <Login onLoginSuccess={(s) => setSession(s)} />;
  }

  return (
    <div className="h-screen flex bg-[#F5F2EB] overflow-hidden relative font-sans">
      <Notification notice={notice} onClose={() => setNotice(null)} />

      {/* --- DESKTOP FLOATING LEFT SIDEBAR DOCK --- */}
      <aside className={`hidden md:flex flex-col ${navHovered ? "w-[220px]" : "w-[68px]"} transition-all duration-300 ease-in-out bg-[#1C2127] text-white shrink-0 z-30 shadow-2xl border-r border-white/10 overflow-hidden`}>

        {/* Top Brand Logo Button -> Acasă / Brief Zilnic */}
        <button
          type="button"
          onClick={() => setView("brief")}
          className="h-14 flex items-center justify-center border-b border-white/10 shrink-0 hover:bg-white/10 transition-colors w-full cursor-pointer"
          title="Revenire la ecranul principal (Brief Zilnic)"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C98A2B] to-[#A36C1D] flex items-center justify-center font-bold text-white text-[13.5px] shadow-md shrink-0 active:scale-95 transition-transform">
            WD
          </div>
        </button>

        {/* Main Navigation Items (Extindere automată doar la trecerea mouse-ului pe această porțiune) */}
        <div
          onMouseEnter={() => setNavHovered(true)}
          onMouseLeave={() => setNavHovered(false)}
          className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none"
        >
          {[
            { id: "brief", label: "Brief Zilnic", icon: Sunrise },
            { id: "flux", label: "Flux Operațional", icon: Layers, badge: userClaims.length },
            { id: "list", label: "Listă Dosare", icon: List },
            { id: "programator", label: "Programări", icon: CalendarClock },
            { id: "dashboard", label: "Statistici", icon: BarChart3 },
            { id: "rapoarte", label: "Financiar", icon: Wallet },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  active
                    ? "bg-[#C98A2B] text-white font-bold shadow-md"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title={label}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="shrink-0" />
                  <span className={`transition-all duration-200 whitespace-nowrap ${navHovered ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 overflow-hidden"}`}>
                    {label}
                  </span>
                </div>
                {badge !== undefined && (
                  <span className={`text-[10px] font-black bg-white/20 px-1.5 py-0.2 rounded-full transition-opacity duration-200 ${navHovered ? "opacity-100" : "opacity-0"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Profile & Settings Dock */}
        <div className="p-2 shrink-0 space-y-1 border-t border-white/10">
          <button
            onClick={() => openSettings()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-[12.5px] font-semibold transition-all"
            title="Centru Setări"
          >
            <div className="w-6 h-6 rounded-full bg-[#C98A2B] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              {myEmail ? myEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <span className={`transition-all duration-200 truncate max-w-[120px] ${navHovered ? "opacity-100" : "opacity-0"}`}>
              {myEmail}
            </span>
          </button>
        </div>
      </aside>

      {/* --- RIGHT MAIN WORKSPACE CANVAS --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Breadcrumb & Action Header */}
        <header className="h-14 bg-white border-b border-[#E0D9CC] px-4 flex items-center justify-between shrink-0 z-20 shadow-xs">

          {/* Left Breadcrumb & Context */}
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-extrabold text-[#23282E]">Workflow Dosare</span>
            <ChevronRight size={14} className="text-[#8A8375]" />
            <span className="font-bold text-[#C98A2B] bg-[#FAF8F5] border border-[#DAD4C6] px-2.5 py-1 rounded-lg">
              {viewLabels[view] || "Aplicație"}
            </span>
          </div>

          {/* Center Search Trigger (Ctrl+K) */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] text-[#8A8375] hover:bg-white hover:border-[#C98A2B] text-[12.5px] transition-all w-64 justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Search size={14} />
                <span>Căutare rapidă...</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#EFEAE1] px-1.5 py-0.5 rounded text-[#3B5166]">
                Ctrl+K
              </span>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] shadow-sm transition-all active:scale-95"
            >
              <Plus size={16} /> <span>Dosar nou</span>
            </button>

            {/* UNIFIED SUPER CENTRU DE ALERTE BUTTON */}
            {totalAlertsCount > 0 && (
              <button
                onClick={() => openAlerts("depasite")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-extrabold bg-[#B23A2E] text-white shadow-sm hover:bg-[#922D24] active:scale-95 transition-all animate-pulse"
                title="Deschide Centrul de Alerte"
              >
                <Bell size={14} className="fill-white" />
                <span>{totalAlertsCount} Alerte</span>
              </button>
            )}

          </div>
        </header>

        {/* DESKTOP FILTER BAR (Search + Dropdowns) */}
        {!["brief", "programator"].includes(view) && (
          <div className="hidden md:block px-4 py-2 bg-white border-b border-[#E0D9CC] shrink-0 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[280px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8375]" />
                <input className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#DAD4C6] text-[13px] bg-[#FAF8F5] focus:bg-white" placeholder="Filtru rapid dosare..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => setShowFilterPanel((open) => !open)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${showFilterPanel || activeFilterCount ? "border-[#3B5166] bg-[#EEF1F3] text-[#2C4160]" : "border-[#DAD4C6] bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"}`}
              >
                <SlidersHorizontal size={14} />
                <span>{activeFilterCount > 0 ? `Filtre active (${activeFilterCount})` : "Filtre"}</span>
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
        <main className={`flex-1 min-h-0 p-2 sm:p-4 pb-20 md:pb-4 ${(view === "flux" || view === "programator") ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă dosarele...</div>
          ) : view === "flux" ? (
            <TablouPeFaze
              claims={filteredClaims}
              onOpen={openExisting}
              onMoveToStatus={handleMoveToStatus}
              onAddInStatus={openNew}
              onDuplicate={duplicateClaim}
              canEditFn={canEdit}
              pragRidicare={pragRidicare}
              quickFilter={fluxFilter}
              setQuickFilter={setFluxFilter}
            />
          ) : view === "brief" ? (
            <BriefZilnic claims={filteredClaims} onOpen={openExisting} onMoveToStatus={handleMoveToStatus} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} onSetPrag={savePragRidicare} />
          ) : view === "list" ? (
            <ClaimTable claims={filteredClaims} onOpen={openExisting} canEditFn={canEdit} />
          ) : view === "dashboard" ? (
            <Dashboard claims={filteredClaims} onOpen={openExisting} pragRidicare={pragRidicare} />
          ) : view === "programator" ? (
            <Programator claims={claims} onOpen={openExisting} onPatch={(id, patch) => handlePatchClaim(id, patch, true)} canEditFn={() => true} capacitate={capacitateZilnica} onSetCapacitate={saveCapacitate} onAddInStatus={openNew} />
          ) : (
            <Rapoarte claims={filteredClaims} onPatch={handlePatchClaim} canEditFn={canEdit} />
          )}
        </main>
      </div>

      {/* --- DECATHLON FLOATING CURVED BOTTOM DOCK (MOBILE NAV BAR) --- */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 md:hidden w-[92%] max-w-sm">
        <div className="bg-[#1C2127]/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-full px-2 py-1 flex items-center justify-around text-white">
          {[
            { id: "brief", label: "Acasă", icon: Sunrise },
            { id: "flux", label: "Dosare", icon: Layers },
            { id: "quickCapture", label: "Scan/Foto", icon: Camera, isAction: true },
            { id: "programator", label: "Programat", icon: CalendarClock },
            { id: "dashboard", label: "Statistici", icon: BarChart3 },
          ].map(({ id, label, icon: Icon, isAction }) => {
            const active = view === id;
            if (isAction) {
              return (
                <button
                  key={id}
                  onClick={() => openQuickCapture()}
                  className="flex flex-col items-center justify-center p-2.5 rounded-full bg-gradient-to-tr from-[#C98A2B] to-[#E5A84B] text-white shadow-lg -mt-5 border-3 border-[#1C2127] active:scale-95 transition-transform"
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
                onClick={() => setView(id)}
                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-full transition-all ${
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
          <ErrorBoundary key={modalClaim.id || "new-claim"} onReset={closeClaimModal}>
            <ClaimModal
              claim={modalClaim}
              onClose={closeClaimModal}
              onSave={handleSave}
              onDelete={handleDelete}
              readOnly={Array.isArray(claims) && claims.some((c) => c && c.id === modalClaim?.id) && !canEdit(modalClaim)}
              allClaims={claims}
              insurersList={customInsurers}
              onJumpTo={openExisting}
              onNotify={showNotice}
            />
          </ErrorBoundary>
        )}

        {alerteModalTab && (
          <AlerteModal
            claims={claims}
            initialTab={alerteModalTab}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            onClose={closeAlerts}
            onOpenClaim={openExisting}
          />
        )}

        {setariOpen && (
          <SetariModal
            claims={claims}
            capacitateZilnica={capacitateZilnica}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            insurersList={customInsurers}
            onSaveInsurers={saveInsurers}
            onSaveCapacitate={saveCapacitate}
            onSavePrag={savePragRidicare}
            onSavePragInactivitate={savePragInactivitate}
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
        onOpenClaim={openExisting}
        onSwitchView={setView}
        onOpenNewClaim={openNew}
        onExportExcel={exportExcel}
      />
    </div>
  );
}
