import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers, Sunrise, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, SlidersHorizontal, X, Camera, ArrowUpDown, Filter, Settings, ShoppingCart
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { STATUSES, getStatusDefinition } from "./constants/config";
import { todayISO, nowISO, fmtDate } from "./utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue, isAcceptPlataWithoutParts } from "./utils/alertUtils";
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
  const [view, setView] = useState("flux");
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [filterAsigurator, setFilterAsigurator] = useState("toti");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [fluxFilter, setFluxFilter] = useState("toate");
  const [modalClaim, setModalClaim] = useState(null);
  const [setariOpen, setSetariOpen] = useState(false);
  const [alerteModalTab, setAlerteModalTab] = useState(null); // null | "depasite" | "neridicate" | "accept_plata" | "blocate"
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [mobileSort, setMobileSort] = useState("recent"); // "recent" | "numar" | "status" | "client"
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const myEmail = session?.user?.email || "";
  const myId = session?.user?.id || null;
  const canEdit = (c) => Boolean(myId) && c.createdBy === myId;
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
      const { data } = await supabase.from("setari").select("capacitate_zilnica, prag_ridicare_zile").eq("id", 1).maybeSingle();
      if (data?.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
      if (data?.prag_ridicare_zile) setPragRidicare(data.prag_ridicare_zile);
    })();
  }, [session]);

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

  if (authLoading) {
    return <div className="min-h-screen bg-[#EFEAE1] flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={20} /> Se verifică sesiunea...</div>;
  }
  if (!session) {
    return <Login />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#EFEAE1] relative">
      <Notification notice={notice} onClose={() => setNotice(null)} />

      {/* --- DESKTOP & MOBILE HEADER --- */}
      <div className="bg-[#1C2127] shrink-0 z-30 shadow-md">
        {/* Top Header Row */}
        <div className="px-3 md:px-4 py-2 flex items-center justify-between gap-2">

          {/* Left Brand Badge + Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C98A2B] to-[#A36C1D] flex items-center justify-center font-bold text-white text-[13px] shadow-sm tracking-tighter">
              WD
            </div>
            <div className="hidden sm:block text-[12px] text-white/80 font-bold border-r border-white/15 pr-3">
              Workflow Dosare <span className="text-[11px] font-normal text-white/50">({claims.length})</span>
            </div>

            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] shadow-sm transition-all active:scale-95"
            >
              <Plus size={16} /> <span>Dosar nou</span>
            </button>
          </div>

          {/* Center Side: Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
            {[
              { id: "flux", label: "Flux Operațional", icon: Layers },
              { id: "brief", label: "Brief", icon: Sunrise },
              { id: "list", label: "Listă", icon: List },
              { id: "programator", label: "Programări", icon: CalendarClock },
              { id: "dashboard", label: "Statistici", icon: BarChart3 },
              { id: "rapoarte", label: "Financiar", icon: Wallet },
            ].map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#C98A2B] text-white shadow-sm font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.2} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Side: Quick Search, Operational Alerts & User Profile / Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/15 transition-all md:hidden"
              title="Căutare rapidă"
            >
              <Search size={16} />
            </button>

            {/* Alert 1: Termene Depășite */}
            {alertCount > 0 && (
              <button
                onClick={() => setAlerteModalTab("depasite")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-[#B23A2E] text-white shadow-md hover:bg-[#922D24] animate-pulse transition-all"
                title="Dosare cu termene depășite pe etapă"
              >
                <AlertTriangle size={13} className="fill-white" />
                <span>{alertCount}</span>
              </button>
            )}

            {/* Alert 2: Accept de plată fără piese comandate */}
            {acceptPlataNoPartsCount > 0 && (
              <button
                onClick={() => setAlerteModalTab("accept_plata")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold bg-[#2C4160] text-white hover:bg-[#1E2D44] transition-all"
                title="Dosare cu Accept de Plată fără piese comandate"
              >
                <ShoppingCart size={13} />
                <span>{acceptPlataNoPartsCount}</span>
              </button>
            )}

            {/* Alert 3: Mașini Gata Neridicate */}
            {gataNeridicateCount > 0 && (
              <button
                onClick={() => setAlerteModalTab("neridicate")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-bold bg-[#C98A2B] text-white hover:bg-[#B37A22] transition-all"
                title={`Mașini gata de ridicare de cel puțin ${pragRidicare} zile`}
              >
                <PackageCheck size={13} />
                <span>{gataNeridicateCount}</span>
              </button>
            )}

            {/* Alert 4: Dosare Blocate */}
            {blockedCount > 0 && (
              <button
                onClick={() => setAlerteModalTab("blocate")}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-semibold bg-white/20 text-white hover:bg-white/30 transition-all"
                title="Dosare blocate / litigiu"
              >
                <AlertTriangle size={13} />
                <span>{blockedCount}</span>
              </button>
            )}

            <button onClick={exportExcel} className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/10"><Download size={14} /><span className="hidden md:inline"> Excel</span></button>

            {/* User Profile & Interactive Settings Pill Button */}
            <button
              onClick={() => setSetariOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold transition-all ml-1 cursor-pointer"
              title="Profil utilizator & Centru Setări"
            >
              <div className="w-4 h-4 rounded-full bg-[#C98A2B] text-white font-bold text-[9.5px] flex items-center justify-center shrink-0">
                {myEmail ? myEmail.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden md:inline truncate max-w-[130px]">{myEmail}</span>
              <Settings size={14} className="text-[#C98A2B] shrink-0" />
            </button>
          </div>
        </div>

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
      </div>

      {/* --- DESKTOP FILTER BAR (Search + Dropdowns) --- */}
      {!["brief", "programator"].includes(view) && (
        <div className="hidden md:block px-4 py-2.5 bg-white border-b border-[#DAD4C6] shrink-0 z-20">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[280px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8375]" />
              <input className="w-full pl-8 pr-16 py-1.5 rounded border border-[#DAD4C6] text-[13px] bg-[#FAF8F5] focus:bg-white" placeholder="Filtru rapid..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold bg-[#EFEAE1] hover:bg-[#DAD4C6] text-[#3B5166] px-1.5 py-0.5 rounded border border-[#DAD4C6]"
                title="Căutare inteligentă (Ctrl + K)"
              >
                Ctrl+K
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFilterPanel((open) => !open)}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${showFilterPanel || activeFilterCount ? "border-[#3B5166] bg-[#EEF1F3] text-[#2C4160]" : "border-[#DAD4C6] bg-[#FAF8F5] text-[#6B6558] hover:bg-[#EFEAE1]"}`}
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

      {/* --- MAIN CONTENT VIEW AREA --- */}
      <div className={`flex-1 min-h-0 p-2 sm:p-4 pb-20 md:pb-4 ${(view === "flux" || view === "programator") ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
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
          onClose={() => setAlerteModalTab(null)}
          onOpenClaim={openExisting}
        />
      )}

      {setariOpen && (
        <SetariModal
          claims={claims}
          capacitateZilnica={capacitateZilnica}
          pragRidicare={pragRidicare}
          onSaveCapacitate={saveCapacitate}
          onSavePrag={savePragRidicare}
          onClose={() => setSetariOpen(false)}
          onNotify={showNotice}
          userEmail={myEmail}
          onSignOut={() => supabase.auth.signOut()}
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
        onExportExcel={exportExcel}
      />
    </div>
  );
}
