import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers, Sunrise, LayoutGrid, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, ShieldCheck, SlidersHorizontal, X, Camera
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { STATUSES, getStatusDefinition } from "./constants/config";
import { todayISO, nowISO, fmtDate } from "./utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "./utils/alertUtils";
import { fromDb, toDb, emptyClaim } from "./utils/claimUtils";
import Notification from "./components/common/Notification";
import Login from "./components/auth/Login";
import TablouPeFaze from "./components/views/FluxOperational";
import BriefZilnic from "./components/views/BriefZilnic";
import ClaimTable from "./components/views/ClaimTable";
import Dashboard from "./components/views/Dashboard";
import Programator from "./components/views/Programator";
import Rapoarte from "./components/views/Rapoarte";
import KanbanBoard from "./components/views/KanbanBoard";
import QuickCapture from "./components/views/QuickCapture";
import ClaimModal from "./components/modals/ClaimModal";
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
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

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

  const handleMove = async (claim, dir) => {
    if (!canEdit(claim)) { showNotice("Poți muta doar dosarele create de tine.", "error"); return; }
    const idx = STATUSES.findIndex((s) => s.key === claim.status);
    if (idx < 0) {
      showNotice("Dosarul are un status necunoscut și nu poate fi mutat automat.", "error");
      return;
    }
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return;
    const updated = { ...claim, status: STATUSES[nextIdx].key, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
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
    return claims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (filterAsigurator !== "toti" && c.asigurator !== filterAsigurator) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });
  }, [claims, search, filterTip, filterStatus, filterAsigurator, onlyBlocked]);

  const insurers = useMemo(() => [...new Set(claims.map((c) => c.asigurator).filter(Boolean))].sort(), [claims]);
  const activeFilterCount = [filterTip !== "toate", filterStatus !== "toate", filterAsigurator !== "toti"].filter(Boolean).length;
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
    <div className="h-screen flex flex-col overflow-hidden bg-[#EFEAE1]">
      <Notification notice={notice} onClose={() => setNotice(null)} />
      <div className="bg-[#23282E] shrink-0 z-30">
        {/* Top Row: Brand + Actions */}
        <div className="px-3 md:px-4 py-2 flex items-center justify-between gap-2">
          {/* Left Side: Brand + New Claim Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] shadow-sm transition-all"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Dosar</span> nou
            </button>
            <button
              type="button"
              onClick={() => setQuickCaptureOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-[13px] font-semibold border border-white/20 transition-all"
              title="Captură rapidă foto & documente"
            >
              <Camera size={16} className="text-[#C98A2B]" /> <span className="hidden sm:inline">Foto/Docs</span>
            </button>
            <div className="text-[12px] text-white/70 font-semibold border-l border-white/20 pl-2">
              {claims.length} <span className="hidden sm:inline">dosare</span>{saving && <span className="inline-flex items-center gap-1 ml-1 text-white/50"><Loader2 size={11} className="animate-spin" /></span>}
            </div>
          </div>

          {/* Center Side: Navigation Tabs (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
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

          {/* Right Side: Actions (Alerts, Excel, user, delogare) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {alertCount > 0 && (
              <button
                onClick={() => {
                  setView("flux");
                  setFluxFilter((prev) => prev === "intarziate" ? "toate" : "intarziate");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[12px] font-bold shadow-md transition-all ${
                  view === "flux" && fluxFilter === "intarziate"
                    ? "bg-[#B23A2E] text-white border border-[#B23A2E]"
                    : "bg-[#B23A2E] text-white hover:bg-[#922D24] animate-pulse-red"
                }`}
                title="Dosare cu termene depășite"
              >
                <AlertTriangle size={13} className="fill-white" />
                <span>{alertCount}</span>
              </button>
            )}
            {blockedCount > 0 && (
              <button onClick={() => setOnlyBlocked((v) => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold ${onlyBlocked ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {blockedCount}
              </button>
            )}
            {gataNeridicateCount > 0 && (
              <button
                onClick={() => {
                  setView("flux");
                  setFluxFilter((prev) => prev === "gata_ridicare_intarziate" ? "toate" : "gata_ridicare_intarziate");
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold ${view === "flux" && fluxFilter === "gata_ridicare_intarziate" ? "bg-[#C98A2B] text-white" : "bg-[#C98A2B]/20 text-[#F3D9A8]"}`}
                title={`Mașini gata de ridicare de cel puțin ${pragRidicare} zile`}
              >
                <PackageCheck size={13} /> {gataNeridicateCount}
              </button>
            )}
            <button onClick={exportExcel} className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded border border-white/20 text-white text-[12.5px] font-semibold hover:bg-white/10"><Download size={14} /><span className="hidden md:inline"> Excel</span></button>
            <span className="hidden md:inline text-[11px] text-white/50">{myEmail}</span>
            <button onClick={() => supabase.auth.signOut()} className="px-2 py-1 rounded border border-white/20 text-white/70 text-[11.5px] font-semibold hover:bg-white/10 hover:text-white">
              <span className="hidden sm:inline">Delogare</span><span className="sm:hidden text-[11px]">⏻</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Navigation Tabs - scrollable on mobile (Hidden on Desktop) */}
        <div className="px-2 md:px-4 pb-2 overflow-x-auto scrollbar-none md:hidden">
          <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-black/20 p-1 min-w-max">
            {[
              { id: "flux", label: "Flux", labelFull: "Flux Operațional", icon: Layers },
              { id: "brief", label: "Brief", labelFull: "Brief", icon: Sunrise },
              { id: "list", label: "Listă", labelFull: "Listă", icon: List },
              { id: "programator", label: "Programări", labelFull: "Programator", icon: CalendarClock },
              { id: "dashboard", label: "Statistici", labelFull: "Statistici", icon: BarChart3 },
              { id: "rapoarte", label: "Financiar", labelFull: "Financiar", icon: Wallet },
            ].map(({ id, label, labelFull, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#C98A2B] text-white shadow-sm font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/15"
                  }`}
                  title={labelFull}
                >
                  <Icon size={16} strokeWidth={2.2} />
                  <span className="sm:hidden">{label}</span>
                  <span className="hidden sm:inline">{labelFull}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!["brief", "programator"].includes(view) && (
      <div className="px-4 py-2.5 bg-white border-b border-[#DAD4C6] shrink-0 z-20">
        <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8375]" />
          <input className="w-full pl-8 pr-16 py-1.5 rounded border border-[#DAD4C6] text-[16px] md:text-[13px] bg-[#FAF8F5] focus:bg-white" placeholder="Filtru rapid..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

      <div className={`flex-1 min-h-0 p-3 md:p-4 ${(view === "flux" || view === "programator") ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
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
