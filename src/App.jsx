import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers, Sunrise, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, SlidersHorizontal, X, Camera, ArrowUpDown, Filter, Settings, ShoppingCart, Clock, Bell, ChevronRight, LogOut
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { STATUSES, getStatusDefinition } from "./constants/config";
import { todayISO, nowISO, fmtDate } from "./utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue, isAcceptPlataWithoutParts, isInactiveClaim } from "./utils/alertUtils";
import { fromDb, toDb, emptyClaim } from "./utils/claimUtils";
import Notification from "./components/common/Notification";
import Login from "./components/auth/Login";
import TablouPeFaze from "./components/views/FluxOperational";
import BriefZilnic from "./components/views/BriefZilnic";
import ClaimTable from "./components/views/ClaimTable";
import Dashboard from "./components/views/Dashboard";
import Programator from "./components/views/Programator";
import Rapoarte from "./components/views/Rapoarte";
import QuickCapture from "./components/views/QuickCapture";
import ClaimModal from "./components/modals/ClaimModal";
import SetariModal from "./components/modals/SetariModal";
import AlerteModal from "./components/modals/AlerteModal";
import CommandPalette from "./components/common/CommandPalette";
import ErrorBoundary from "./components/common/ErrorBoundary";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState("brief");
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [filterAsigurator, setFilterAsigurator] = useState("toti");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [fluxFilter, setFluxFilter] = useState("toate");
  const [modalClaim, setModalClaim] = useState(null);
  const [setariOpen, setSetariOpen] = useState(false);
  const [alerteModalTab, setAlerteModalTab] = useState(null);
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [pragInactivitate, setPragInactivitate] = useState(7);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [mobileSort, setMobileSort] = useState("recent");
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  // Admin & User Management States
  const [adminEmails, setAdminEmails] = useState([]);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

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

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;

  // Evaluate if current user is an Administrator
  const isAdmin = useMemo(() => {
    if (!myEmail) return false;
    if (adminEmails.length === 0) return true; // Default admin mode for single-user/initial setup
    return (
      adminEmails.some((e) => e.toLowerCase() === myEmail.toLowerCase()) ||
      usersList.some((u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin")
    );
  }, [myEmail, adminEmails, usersList]);

  // Administrator can edit ALL claims in the system; Operators can only edit their own
  const canEdit = useCallback(
    (c) => {
      if (!myId) return false;
      if (isAdmin) return true;
      return c.createdBy === myId;
    },
    [myId, isAdmin]
  );

  const showNotice = useCallback((message, type = "success") => setNotice({ message, type }), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) showNotice(error.message, "error");
    else setClaims((data || []).map(fromDb));
    setLoading(false);
  }, [showNotice]);

  useEffect(() => { if (session) loadAll(); }, [loadAll, session]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("setari")
        .select("capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, admin_emails, utilizatori")
        .eq("id", 1)
        .maybeSingle();

      if (data?.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
      if (data?.prag_ridicare_zile) setPragRidicare(data.prag_ridicare_zile);
      if (data?.prag_inactivitate_zile) setPragInactivitate(data.prag_inactivitate_zile);

      let loadedAdmins = Array.isArray(data?.admin_emails) ? data.admin_emails : [];
      let loadedUsers = Array.isArray(data?.utilizatori) ? data.utilizatori : [];

      const currentEmail = session.user?.email || "";
      if (currentEmail) {
        if (!loadedUsers.some((u) => u.email?.toLowerCase() === currentEmail.toLowerCase())) {
          const isFirst = loadedUsers.length === 0 || loadedAdmins.length === 0;
          loadedUsers.push({ email: currentEmail, role: isFirst ? "admin" : "operator" });
        }
        if (loadedAdmins.length === 0 || loadedUsers.some(u => u.email?.toLowerCase() === currentEmail.toLowerCase() && u.role === "admin")) {
          if (!loadedAdmins.some((e) => e.toLowerCase() === currentEmail.toLowerCase())) {
            loadedAdmins.push(currentEmail);
          }
        }
      }

      setAdminEmails(loadedAdmins);
      setUsersList(loadedUsers);
    })();
  }, [session]);

  const saveUsersAndAdmins = async (newUsers, newAdmins) => {
    setUsersList(newUsers);
    setAdminEmails(newAdmins);
    const { error } = await supabase.from("setari").upsert({
      id: 1,
      utilizatori: newUsers,
      admin_emails: newAdmins,
    });
    if (error) showNotice(error.message, "error");
  };

  const handleAddUser = async ({ email, role, password }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (usersList.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      throw new Error("Acest utilizator există deja în lista echipei.");
    }

    // Register user in Supabase Auth so they can log in
    if (password && password.trim()) {
      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
      });
      if (authError && !authError.message.toLowerCase().includes("already registered")) {
        throw new Error("Eroare înregistrare Supabase Auth: " + authError.message);
      }
    }

    const updatedUsers = [...usersList, { email: cleanEmail, role: role || "operator" }];
    const updatedAdmins = role === "admin"
      ? [...new Set([...adminEmails, cleanEmail])]
      : adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);

    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
  };

  const handleChangePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const handleDeleteUser = async (emailToDelete) => {
    const cleanEmail = emailToDelete.trim().toLowerCase();
    if (cleanEmail === myEmail.toLowerCase()) {
      showNotice("Nu te poți șterge pe tine însuți din sistem.", "error");
      return;
    }
    const updatedUsers = usersList.filter((u) => u.email?.toLowerCase() !== cleanEmail);
    const updatedAdmins = adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);
    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
    showNotice(`Utilizatorul „${cleanEmail}” a fost eliminat.`, "info");
  };

  const handleToggleAdminRole = async (targetEmail) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const currentObj = usersList.find((u) => u.email?.toLowerCase() === cleanEmail);
    const willBeAdmin = currentObj?.role !== "admin";

    const updatedUsers = usersList.map((u) =>
      u.email?.toLowerCase() === cleanEmail ? { ...u, role: willBeAdmin ? "admin" : "operator" } : u
    );
    const updatedAdmins = willBeAdmin
      ? [...new Set([...adminEmails, cleanEmail])]
      : adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);

    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
    showNotice(
      willBeAdmin ? `Utilizatorul „${cleanEmail}” este acum Administrator.` : `Utilizatorul „${cleanEmail}” este acum Operator.`,
      "success"
    );
  };

  const saveCapacitate = async (n) => {
    setCapacitateZilnica(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, capacitate_zilnica: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragRidicare = async (n) => {
    setPragRidicare(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_ridicare_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragInactivitate = async (n) => {
    setPragInactivitate(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_inactivitate_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const handleSave = async (claim, { openProgramator = false } = {}) => {
    setSaving(true);
    const isNewClaim = !claims.some((c) => c.id === claim.id);
    const payload = toDb({
      ...claim,
      createdBy: isNewClaim ? myId : (claim.createdBy || myId),
      createdByEmail: isNewClaim ? myEmail : (claim.createdByEmail || myEmail),
      updatedByEmail: myEmail,
    });
    const { error } = await supabase.from("dosare").upsert(payload);
    setSaving(false);
    if (error) { showNotice(error.message, "error"); return; }
    setModalClaim(null);
    showNotice(isNewClaim ? "Dosarul a fost creat." : "Dosarul a fost salvat.");
    if (openProgramator) setView("programator");
    loadAll();
  };

  const handleDelete = async (id) => {
    const target = claims.find((c) => c.id === id);
    if (target && !canEdit(target)) { showNotice("Poți șterge doar dosarele create de tine.", "error"); return; }
    setSaving(true);
    const { error } = await supabase.from("dosare").delete().eq("id", id);
    setSaving(false);
    if (error) { showNotice(error.message, "error"); return; }
    setModalClaim(null);
    showNotice("Dosarul a fost șters.");
    loadAll();
  };

  const handleMoveToStatus = async (claim, newStatusKey) => {
    if (!canEdit(claim)) { showNotice("Poți muta doar dosarele create de tine.", "error"); return; }
    if (claim.status === newStatusKey) return;
    const changedAt = nowISO();
    const deliveryPatch = newStatusKey === "gata_de_ridicare"
      ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: false, dataRidicare: null }
      : newStatusKey === "predat_client"
      ? { gataDeRidicare: true, dataGataRidicare: claim.dataGataRidicare || changedAt, ridicata: true, dataRidicare: claim.dataRidicare || changedAt }
      : ["gata_de_ridicare", "predat_client"].includes(claim.status) && newStatusKey !== "facturat"
      ? { gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null }
      : {};
    const updated = { ...claim, ...deliveryPatch, status: newStatusKey, dataSchimbareStatus: changedAt, dataUltimeiActualizari: changedAt, updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c)));
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { showNotice(error.message, "error"); loadAll(); }
  };

  const openNew = (status = "primit", dateProgramare = null) => {
    const claim = emptyClaim(status);
    if (dateProgramare) {
      claim.dataProgramare = dateProgramare.includes("T") ? dateProgramare : `${dateProgramare}T08:00:00`;
    }
    setModalClaim(claim);
  };
  const openExisting = (claim) => setModalClaim(claim);

  const duplicateClaim = (source) => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: source.numarInmatriculare,
      vin: source.vin,
      marcaModel: source.marcaModel,
      client: source.client,
      telefonClient: source.telefonClient,
      tipAsigurare: source.tipAsigurare,
      asigurator: source.asigurator,
    };
    showNotice("Date duplicate — completează numărul de dosar nou și verifică restul.");
    setModalClaim(dup);
  };

  const patchClaim = async (id, patch) => {
    const current = claims.find((c) => c.id === id);
    if (!current) return;
    if (!canEdit(current)) { showNotice("Poți edita programarea doar la dosarele create de tine.", "error"); return; }
    let effectivePatch = { ...patch };
    if (patch.dataProgramare && current.status === "piese_sosite") {
      effectivePatch = { ...effectivePatch, status: "programat", dataSchimbareStatus: nowISO() };
      showNotice('Dosar mutat automat în „Programat".', "success");
    }
    const updated = { ...current, ...effectivePatch, dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
    const { error } = await supabase.from("dosare").upsert(toDb(updated));
    if (error) { showNotice(error.message, "error"); loadAll(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let res = claims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (filterAsigurator !== "toti" && c.asigurator !== filterAsigurator) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });

    if (mobileSort === "numar") {
      res = [...res].sort((a, b) => (a.numarDosar || "").localeCompare(b.numarDosar || ""));
    } else if (mobileSort === "status") {
      res = [...res].sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    } else if (mobileSort === "client") {
      res = [...res].sort((a, b) => (a.client || "").localeCompare(b.client || ""));
    } else {
      res = [...res].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || ""));
    }

    return res;
  }, [claims, search, filterTip, filterStatus, filterAsigurator, onlyBlocked, mobileSort]);

  const insurers = useMemo(() => [...new Set(claims.map((c) => c.asigurator).filter(Boolean))].sort(), [claims]);
  const activeFilterCount = [filterTip !== "toate", filterStatus !== "toate", filterAsigurator !== "toti", onlyBlocked].filter(Boolean).length;
  const resetFilters = () => {
    setFilterTip("toate");
    setFilterStatus("toate");
    setFilterAsigurator("toti");
    setOnlyBlocked(false);
    setFluxFilter("toate");
  };

  const alertCount = useMemo(() => claims.filter(isStageOverdue).length, [claims]);
  const blockedCount = useMemo(() => claims.filter((c) => c.blocat).length, [claims]);
  const gataNeridicateCount = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)).length, [claims, pragRidicare]);
  const acceptPlataNoPartsCount = useMemo(() => claims.filter(isAcceptPlataWithoutParts).length, [claims]);
  const inactiveCount = useMemo(() => claims.filter((c) => isInactiveClaim(c, pragInactivitate)).length, [claims, pragInactivitate]);

  const totalAlertsCount = alertCount + blockedCount + gataNeridicateCount + acceptPlataNoPartsCount + inactiveCount;

  const exportExcel = () => {
    const rows = claims.map((c) => ({
      "Nr. dosar": c.numarDosar, "Tip": c.tipAsigurare, "Asigurător": c.asigurator, "Client": c.client,
      "Nr. înmatriculare": c.numarInmatriculare, "VIN": c.vin, "Marcă/Model": c.marcaModel,
      "Status": getStatusDefinition(c.status).label, "Data deschiderii": fmtDate(c.dataDeschiderii),
      "Facturat Tinichigerie": c.manopera.tinichigerie.facturat, "Facturat Vopsitorie": c.manopera.vopsitorie.facturat,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dosare");
    XLSX.writeFile(wb, `dosare-dauna-${todayISO()}.xlsx`);
  };

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
    return <Login />;
  }

  return (
    <div className="h-screen flex bg-[#F5F2EB] overflow-hidden relative font-sans">
      <Notification notice={notice} onClose={() => setNotice(null)} />

      {/* --- DESKTOP FLOATING LEFT SIDEBAR DOCK (Linear / Miro Style) --- */}
      <aside className="hidden md:flex flex-col w-[68px] hover:w-[220px] transition-all duration-300 ease-in-out bg-[#1C2127] text-white shrink-0 z-30 shadow-2xl border-r border-white/10 group overflow-hidden">

        {/* Top Brand Logo */}
        <div className="h-14 flex items-center px-4 gap-3 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C98A2B] to-[#A36C1D] flex items-center justify-center font-bold text-white text-[13.5px] shadow-md shrink-0">
            WD
          </div>
          <span className="font-extrabold text-[15px] tracking-tight opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Workflow Dosare
          </span>
        </div>

        {/* Main Navigation Items */}
        <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none">
          {[
            { id: "brief", label: "Brief Zilnic", icon: Sunrise },
            { id: "flux", label: "Flux Operațional", icon: Layers, badge: claims.length },
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
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {label}
                  </span>
                </div>
                {badge !== undefined && (
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] font-black bg-white/20 px-1.5 py-0.2 rounded-full">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Profile & Settings Dock */}
        <div className="p-2 shrink-0 space-y-1">
          <button
            onClick={() => setSetariOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-[12.5px] font-semibold transition-all"
            title="Centru Setări"
          >
            <div className="w-6 h-6 rounded-full bg-[#C98A2B] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              {myEmail ? myEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[120px]">
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
                onClick={() => setAlerteModalTab("depasite")}
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
                <SlidersHorizontal size={14} /> Filtre
                {activeFilterCount > 0 && <span className="rounded-full bg-[#3B5166] px-1.5 text-[10px] text-white">{activeFilterCount}</span>}
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
            className="flex items-center justify-center gap-2 py-2.5 bg-[#1C2127] active:bg-[#2C333D] transition-colors"
          >
            <Filter size={14} className="text-[#C98A2B]" />
            <span>Filtrează</span>
            {activeFilterCount > 0 && (
              <span className="bg-[#C98A2B] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {activeFilterCount}
              </span>
            )}
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
              claims={filtered}
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
            <BriefZilnic claims={claims} onOpen={openExisting} onMoveToStatus={handleMoveToStatus} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} onSetPrag={savePragRidicare} />
          ) : view === "list" ? (
            <ClaimTable claims={filtered} onOpen={openExisting} canEditFn={canEdit} />
          ) : view === "dashboard" ? (
            <Dashboard claims={filtered} onOpen={openExisting} pragRidicare={pragRidicare} />
          ) : view === "programator" ? (
            <Programator claims={claims} onOpen={openExisting} onPatch={patchClaim} canEditFn={canEdit} capacitate={capacitateZilnica} onSetCapacitate={saveCapacitate} onAddInStatus={openNew} />
          ) : (
            <Rapoarte claims={filtered} onPatch={patchClaim} canEditFn={canEdit} />
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
                  onClick={() => setQuickCaptureOpen(true)}
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
                Aplică Filtre ({filtered.length} dosare)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS & OVERLAYS --- */}
      {modalClaim && (
        <ErrorBoundary key={modalClaim.id || "new-claim"} onReset={() => setModalClaim(null)}>
          <ClaimModal
            claim={modalClaim}
            onClose={() => setModalClaim(null)}
            onSave={handleSave}
            onDelete={handleDelete}
            readOnly={claims.some((claim) => claim.id === modalClaim.id) && !canEdit(modalClaim)}
            allClaims={claims}
            onJumpTo={(c) => setModalClaim(c)}
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
          onClose={() => setAlerteModalTab(null)}
          onOpenClaim={openExisting}
        />
      )}

      {setariOpen && (
        <SetariModal
          claims={claims}
          capacitateZilnica={capacitateZilnica}
          pragRidicare={pragRidicare}
          pragInactivitate={pragInactivitate}
          onSaveCapacitate={saveCapacitate}
          onSavePrag={savePragRidicare}
          onSavePragInactivitate={savePragInactivitate}
          onClose={() => setSetariOpen(false)}
          onNotify={showNotice}
          userEmail={myEmail}
          onSignOut={() => supabase.auth.signOut()}
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
          onClose={() => setQuickCaptureOpen(false)}
          onPatch={patchClaim}
          canEditFn={canEdit}
          onNotify={showNotice}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        claims={claims}
        onOpenClaim={openExisting}
        onSwitchView={setView}
        onOpenNewClaim={openNew}
        onExportExcel={() => setView("dashboard")}
      />
    </div>
  );
}
