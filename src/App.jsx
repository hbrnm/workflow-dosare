import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers, Sunrise, LayoutGrid, List, BarChart3, CalendarClock, Wallet, Download, Plus, Search,
  AlertTriangle, PackageCheck, Loader2, ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { STATUSES, getStatusDefinition } from "./constants/config";
import { todayISO, nowISO, fmtDate, daysBetween } from "./utils/dateUtils";
import { fromDb, toDb, emptyClaim } from "./utils/claimUtils";
import Notification from "./components/common/Notification";
import Login from "./components/auth/Login";
import TablouPeFaze from "./components/views/FluxOperational";
import BriefZilnic from "./components/views/BriefZilnic";
import ClaimTable from "./components/views/ClaimTable";
import Dashboard from "./components/views/Dashboard";
import Programator from "./components/views/Programator";
import Rapoarte from "./components/views/Rapoarte";
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
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [onlyGataNeridicate, setOnlyGataNeridicate] = useState(false);
  const [modalClaim, setModalClaim] = useState(null);
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

  const handleSave = async (claim) => {
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
    const updated = { ...claim, status: newStatusKey, dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(), updatedByEmail: myEmail };
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

  const openNew = (status = "primit") => setModalClaim(emptyClaim(status));
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
      if (onlyAlerts && daysBetween(c.dataSchimbareStatus) < (c.termenAlertaZile || 3)) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (onlyGataNeridicate && !(c.gataDeRidicare && !c.ridicata)) return false;
      if (!q) return true;
      return (c.numarInmatriculare || "").toLowerCase().includes(q) || (c.client || "").toLowerCase().includes(q) ||
        (c.numarDosar || "").toLowerCase().includes(q) || (c.asigurator || "").toLowerCase().includes(q) || (c.vin || "").toLowerCase().includes(q);
    });
  }, [claims, search, filterTip, filterStatus, onlyAlerts, onlyBlocked, onlyGataNeridicate]);

  const alertCount = useMemo(() => claims.filter((c) => daysBetween(c.dataSchimbareStatus) >= (c.termenAlertaZile || 3)).length, [claims]);
  const blockedCount = useMemo(() => claims.filter((c) => c.blocat).length, [claims]);
  const gataNeridicateCount = useMemo(() => claims.filter((c) => c.gataDeRidicare && !c.ridicata && daysBetween(c.dataGataRidicare) >= pragRidicare).length, [claims, pragRidicare]);

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[13px] font-bold hover:bg-[#B37A22] shadow-sm transition-all"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Dosar</span> nou
            </button>
            <div className="text-[12px] text-white/70 font-semibold border-l border-white/20 pl-2">
              {claims.length} <span className="hidden sm:inline">dosare</span>{saving && <span className="inline-flex items-center gap-1 ml-1 text-white/50"><Loader2 size={11} className="animate-spin" /></span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {alertCount > 0 && (
              <button onClick={() => setOnlyAlerts((v) => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold ${onlyAlerts ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {alertCount}
              </button>
            )}
            {blockedCount > 0 && (
              <button onClick={() => setOnlyBlocked((v) => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold ${onlyBlocked ? "bg-white text-[#23282E]" : "bg-white/10 text-white/70"}`}>
                <AlertTriangle size={13} /> {blockedCount}
              </button>
            )}
            {gataNeridicateCount > 0 && (
              <button onClick={() => setOnlyGataNeridicate((v) => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold ${onlyGataNeridicate ? "bg-[#C98A2B] text-white" : "bg-[#C98A2B]/20 text-[#F3D9A8]"}`}>
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
        {/* Bottom Row: Navigation Tabs - scrollable on mobile */}
        <div className="px-2 md:px-4 pb-2 overflow-x-auto scrollbar-none">
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

      <div className="px-4 py-2.5 bg-white border-b border-[#DAD4C6] flex flex-wrap items-center gap-2 shrink-0 z-20">
        <div className="relative w-full sm:w-[260px]">
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
        <select className="in max-w-[110px]" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
          <option value="toate">Toate tipurile</option><option value="CASCO">CASCO</option><option value="RCA">RCA</option>
        </select>
        <select className="in max-w-[200px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="toate">Toate statusurile</option>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{String(s.num).padStart(2, "0")}. {s.label}</option>)}
        </select>
      </div>

      <div className={`flex-1 min-h-0 p-3 md:p-4 ${view === "flux" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[#8A8375] gap-2"><Loader2 className="animate-spin" size={18} /> Se încarcă dosarele...</div>
        ) : view === "flux" ? (
          <TablouPeFaze claims={filtered} onOpen={openExisting} onMoveToStatus={handleMoveToStatus} onAddInStatus={openNew} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} />
        ) : view === "brief" ? (
          <BriefZilnic claims={claims} onOpen={openExisting} onMoveToStatus={handleMoveToStatus} onDuplicate={duplicateClaim} canEditFn={canEdit} pragRidicare={pragRidicare} onSetPrag={savePragRidicare} />
        ) : view === "list" ? (
          <ClaimTable claims={filtered} onOpen={openExisting} canEditFn={canEdit} />
        ) : view === "dashboard" ? (
          <Dashboard claims={filtered} onOpen={openExisting} pragRidicare={pragRidicare} />
        ) : view === "programator" ? (
          <Programator claims={filtered} onOpen={openExisting} onPatch={patchClaim} canEditFn={canEdit} capacitate={capacitateZilnica} onSetCapacitate={saveCapacitate} />
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
