import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HardDrive, Folder, File, Image, Film, FileText, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink, Sparkles, Plus, Copy,
  MessageCircle, Upload, ChevronRight, Download, RotateCw, Maximize2,
  Search, ShieldAlert, ArrowLeft, Layers
} from "lucide-react";
import {
  getDriveCars,
  getDriveCarDetails,
  openCarInExplorer,
  openRootInExplorer,
  updateDriveCarStatus,
  organizeDriveFiles,
  uploadFilesToDrive,
  getDriveTemplates,
  attachDriveTemplate,
  getDriveFileUrl,
  createDriveCar,
} from "../../utils/localDriveService";
import { normalizePlate } from "../../utils/plateSchedule";

const CATEGORIES = [
  { key: "01_Acte_Client", label: "01 Acte Client", icon: "📑", desc: "Buletin, permis, talon, procuri, RCA" },
  { key: "02_Asigurator_si_Dauna", label: "02 Asigurator & Daună", icon: "📄", desc: "Calculații, devize, acorduri, note" },
  { key: "03_Foto_Dauna", label: "03 Foto Daună", icon: "📷", desc: "Fotografii și videoclipuri daune" },
  { key: "04_Reconstatare", label: "04 Reconstatare", icon: "🔧", desc: "Acte și poze reconstatare / demontare" },
  { key: "05_Dosar_Final", label: "05 Dosar Final", icon: "🏁", desc: "Facturi finale, chitanțe, procese-verbale" },
];

export default function LocalDriveView({
  claims = [],
  onOpenClaim,
  onSaveClaim,
  showNotice,
}) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarName, setSelectedCarName] = useState(null);
  const [carDetails, setCarDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("03_Foto_Dauna");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [inspectorTab, setInspectorTab] = useState("parts");
  const [imgRotation, setImgRotation] = useState(0);

  // Inspector form states
  const [piese, setPiese] = useState("");
  const [pieseSosite, setPieseSosite] = useState(false);
  const [numarDosar, setNumarDosar] = useState("");
  const [vin, setVin] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [carStatus, setCarStatus] = useState("Constatare");

  // Modal states
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVin, setNewVin] = useState("");
  const [newDosar, setNewDosar] = useState("");

  // Templates modal
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [attachingTemplate, setAttachingTemplate] = useState(false);

  // File Upload input ref
  const fileInputRef = useRef(null);

  // Load cars list from hard drive
  const [loadError, setLoadError] = useState(null);

  const loadCars = async (keepSelection = true) => {
    try {
      setLoading(true);
      setLoadError(null);
      const list = await getDriveCars();
      setCars(list || []);
      if (!keepSelection || !selectedCarName) {
        if (list && list.length > 0) {
          setSelectedCarName(list[0].name);
        }
      }
    } catch (err) {
      setLoadError(err.message || "Conexiunea la hard drive a eșuat");
      showNotice?.(`Eroare încărcare dosare hard drive: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCars(false);
  }, []);

  // Load selected car details
  useEffect(() => {
    if (!selectedCarName) {
      setCarDetails(null);
      return;
    }
    let isCurrent = true;
    setLoadingDetails(true);
    getDriveCarDetails(selectedCarName)
      .then((data) => {
        if (!isCurrent) return;
        setCarDetails(data);
        // Pre-fill inspector fields
        setPiese(data.piese || "");
        setPieseSosite(!!data.pieseSosite);
        setNumarDosar(data.numarDosar || "");
        setVin(data.vin || "");
        setClientName(data.clientName || "");
        setClientPhone(data.clientPhone || "");
        setNotes(data.notes || "");
        setCarStatus(data.status || "Constatare");

        // Pick initial preview file
        const catFiles = data.categories?.[selectedCategory] || [];
        if (catFiles.length > 0) {
          setSelectedFile(catFiles[0]);
        } else {
          let found = null;
          for (const c of CATEGORIES) {
            const files = data.categories?.[c.key] || [];
            if (files.length > 0) {
              setSelectedCategory(c.key);
              found = files[0];
              break;
            }
          }
          setSelectedFile(found);
        }
        setImgRotation(0);
      })
      .catch((err) => {
        if (!isCurrent) return;
        showNotice?.(`Nu am putut încărca detaliile mașinii: ${err.message}`, "error");
      })
      .finally(() => {
        if (isCurrent) setLoadingDetails(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedCarName]);

  // When category changes, auto-select first file
  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const files = carDetails?.categories?.[catKey] || [];
    if (files.length > 0) {
      setSelectedFile(files[0]);
    } else {
      setSelectedFile(null);
    }
    setImgRotation(0);
  };

  // Filter cars by search and stage
  const filteredCars = useMemo(() => {
    return cars.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.clientName && c.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.vin && c.vin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.numarDosar && c.numarDosar.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStage = stageFilter === "all" || c.status === stageFilter;
      return matchSearch && matchStage;
    });
  }, [cars, searchQuery, stageFilter]);

  // Check if active car is already synced in online claims
  const matchingOnlineClaim = useMemo(() => {
    if (!selectedCarName) return null;
    const cleanPlate = normalizePlate(selectedCarName);
    return claims.find((c) => normalizePlate(c.numarInmatriculare || "") === cleanPlate);
  }, [selectedCarName, claims]);

  // Save inspector metadata changes
  const handleSaveInspector = async () => {
    if (!selectedCarName) return;
    try {
      const patch = {
        piese,
        pieseSosite,
        numarDosar,
        vin,
        clientName,
        clientPhone,
        notes,
        status: carStatus,
      };
      await updateDriveCarStatus(selectedCarName, patch);

      // If online claim exists, sync to it as well!
      if (matchingOnlineClaim && onSaveClaim) {
        await onSaveClaim({
          ...matchingOnlineClaim,
          status: carStatus,
          numarDosar: numarDosar || matchingOnlineClaim.numarDosar,
          vin: vin || matchingOnlineClaim.vin,
          client: clientName || matchingOnlineClaim.client,
          telefonClient: clientPhone || matchingOnlineClaim.telefonClient,
          observatii: notes || matchingOnlineClaim.observatii,
          piese,
          pieseSosite,
        });
      }

      showNotice?.("Modificările au fost salvate pe Hard Drive și online!", "success");
      loadCars(true);
    } catch (err) {
      showNotice?.(`Eroare salvare: ${err.message}`, "error");
    }
  };

  // 1-Click Sync this car to Online Workflow
  const handleSyncToOnline = async () => {
    if (!selectedCarName || !onSaveClaim) return;
    try {
      const cleanPlate = normalizePlate(selectedCarName);
      const newClaim = {
        numarInmatriculare: cleanPlate,
        status: carStatus || "constatare",
        client: clientName || "",
        telefonClient: clientPhone || "",
        numarDosar: numarDosar || "",
        vin: vin || "",
        observatii: notes || "Preluat din folderul local DOSARE.",
        piese: piese || "",
        pieseSosite: !!pieseSosite,
      };
      await onSaveClaim(newClaim);
      showNotice?.(`Dosarul ${cleanPlate} a fost sincronizat cu succes în Workflow Daune!`, "success");
    } catch (err) {
      showNotice?.(`Eroare sincronizare: ${err.message}`, "error");
    }
  };

  // Open Templates Modal
  const handleOpenTemplates = async () => {
    try {
      const list = await getDriveTemplates();
      setTemplates(list);
      setIsTemplatesOpen(true);
    } catch (err) {
      showNotice?.(`Eroare șabloane: ${err.message}`, "error");
    }
  };

  // Attach Template
  const handleAttachTemplate = async (template) => {
    if (!selectedCarName) return;
    try {
      setAttachingTemplate(true);
      await attachDriveTemplate(selectedCarName, template.path, selectedCategory);
      showNotice?.(`Șablonul "${template.name}" a fost adăugat în folderul dosarului!`, "success");
      setIsTemplatesOpen(false);
      const refreshed = await getDriveCarDetails(selectedCarName);
      setCarDetails(refreshed);
    } catch (err) {
      showNotice?.(`Eroare atașare: ${err.message}`, "error");
    } finally {
      setAttachingTemplate(false);
    }
  };

  // Handle File Upload from disk/camera
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedCarName) return;
    try {
      showNotice?.(`Se încarcă ${files.length} fișier(e) în folderul de pe calculator...`, "info");
      await uploadFilesToDrive(selectedCarName, selectedCategory, files);
      showNotice?.("Fișiere încărcate cu succes direct pe Hard Drive!", "success");
      const refreshed = await getDriveCarDetails(selectedCarName);
      setCarDetails(refreshed);
    } catch (err) {
      showNotice?.(`Eroare upload: ${err.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  // Handle Create New Car Dossier on Hard Drive
  const handleCreateNewCar = async (e) => {
    e.preventDefault();
    const plate = normalizePlate(newPlate);
    if (!plate) return;

    try {
      await createDriveCar({
        plate,
        clientName: newClient,
        clientPhone: newPhone,
        vin: newVin,
        numarDosar: newDosar,
        status: "Constatare",
      });

      if (onSaveClaim) {
        await onSaveClaim({
          numarInmatriculare: plate,
          status: "constatare",
          client: newClient,
          telefonClient: newPhone,
          vin: newVin,
          numarDosar: newDosar,
          observatii: "Creat pe Hard Drive DOSARE.",
        });
      }

      showNotice?.(`Dosarul ${plate} a fost creat pe Hard Drive și salvat online!`, "success");
      setIsNewCarModalOpen(false);
      setNewPlate("");
      setNewClient("");
      setNewPhone("");
      setNewVin("");
      setNewDosar("");
      await loadCars(true);
      setSelectedCarName(plate);
    } catch (err) {
      showNotice?.(`Eroare: ${err.message}`, "error");
    }
  };

  const activeCategoryFiles = carDetails?.categories?.[selectedCategory] || [];

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg,#0f172a)] text-[var(--app-text,#f8fafc)] font-sans overflow-hidden rounded-xl border border-[var(--app-border,#334155)] shadow-2xl">
      {/* TOP TITLEBAR / BREADCRUMBS & QUICK ACTIONS */}
      <header className="h-12 bg-[var(--app-surface,#1e293b)] border-b border-[var(--app-border,#334155)] px-3 flex items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs font-mono min-w-0">
          <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
            <HardDrive size={14} /> C:\DOSARE
          </span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded truncate">
            {selectedCarName || "Selectează un dosar"}
          </span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="text-slate-300 font-medium hidden sm:inline">
            {selectedCategory}
          </span>
        </div>

        {/* Right: Quick Chips & Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {numarDosar && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(numarDosar);
                showNotice?.("Număr dosar copiat!", "success");
              }}
              className="hidden lg:flex items-center gap-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-200 cursor-pointer"
              title="Copiază Număr Dosar"
            >
              <Copy size={11} /> <span className="text-slate-400 font-semibold">DOSAR:</span> {numarDosar}
            </button>
          )}

          {vin && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(vin);
                showNotice?.("VIN copiat!", "success");
              }}
              className="hidden xl:flex items-center gap-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-200 cursor-pointer"
              title="Copiază Serie Șasiu"
            >
              <Copy size={11} /> <span className="text-slate-400 font-semibold">VIN:</span> {vin.slice(0, 10)}…
            </button>
          )}

          {selectedCarName && (
            <button
              type="button"
              onClick={() => openCarInExplorer(selectedCarName)}
              className="flex items-center gap-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded transition-colors cursor-pointer"
              title="Deschide dosarul fizic în Windows Explorer"
            >
              <ExternalLink size={13} /> <span className="hidden md:inline">Deschide în Explorer</span>
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              const res = await organizeDriveFiles();
              showNotice?.(`Organizare completă: ${res.movedCount || 0} fișiere sortate automat.`, "success");
              loadCars(true);
            }}
            className="flex items-center gap-1 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded transition-colors cursor-pointer"
            title="Curăță și sortează automat fișierele pe cele 5 categorii standard"
          >
            <Sparkles size={13} /> <span className="hidden lg:inline">Curăță &amp; Sortează</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTemplates}
            className="flex items-center gap-1 text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded transition-colors cursor-pointer"
            title="Atașează Cereri Despăgubire RCA / CASCO sau Declarații"
          >
            <FileText size={13} /> <span className="hidden lg:inline">Șabloane Acte</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewCarModalOpen(true)}
            className="flex items-center gap-1 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} /> <span>Dosar Nou pe PC</span>
          </button>
        </div>
      </header>

      {/* 3-PANE WORKSPACE */}
      <div className="flex-1 flex min-h-0 divide-x divide-[var(--app-border,#334155)]">
        {/* PANE 1: LISTA DE DOSARE HARD DRIVE */}
        <aside className="w-72 lg:w-80 flex flex-col bg-[var(--app-surface-2,#1e293b)]/70 shrink-0 select-none">
          <div className="p-2.5 space-y-2 border-b border-[var(--app-border,#334155)]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută mașină, dosar, VIN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/60 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              {[
                { key: "all", label: "Toate" },
                { key: "Constatare", label: "Constatare" },
                { key: "Așteaptă piese", label: "Piese" },
                { key: "În lucru", label: "În lucru" },
                { key: "Finalizat", label: "Finalizat" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStageFilter(st.key)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                    stageFilter === st.key
                      ? "bg-sky-500 text-white font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <RefreshCw className="animate-spin inline mr-1.5" size={14} /> Se citesc dosarele de pe hard drive...
              </div>
            ) : loadError ? (
              <div className="m-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                <AlertTriangle className="mx-auto text-amber-400" size={22} />
                <p className="text-xs font-bold text-amber-200">Permisiune necesară în browser</p>
                <p className="text-[11px] text-slate-300 leading-relaxed text-left">
                  Chrome blochează accesul la serverul PC local până la acordarea permisiunii:
                </p>
                <ol className="text-[10.5px] text-slate-300 text-left list-decimal list-inside space-y-1 bg-slate-900/60 p-2 rounded border border-slate-700/50">
                  <li>Apasă pe pictograma cu setări (lângă <b>workflow-dosare.vercel.app</b> în bara de sus).</li>
                  <li>Setează <b>"Apps on device"</b> sau <b>"Acces rețea locală"</b> pe <b>Allow (Permite)</b>.</li>
                </ol>
                <button
                  type="button"
                  onClick={() => loadCars(false)}
                  className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all"
                >
                  <RefreshCw size={13} /> Reîncearcă conexiunea
                </button>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Niciun dosar găsit.
              </div>
            ) : (
              filteredCars.map((car) => {
                const isSelected = selectedCarName === car.name;
                const isOnlineSynced = claims.some(
                  (c) => normalizePlate(c.numarInmatriculare || "") === normalizePlate(car.name)
                );

                return (
                  <div
                    key={car.name}
                    onClick={() => setSelectedCarName(car.name)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-sky-600/20 border-sky-500 text-white font-bold shadow-sm"
                        : "bg-slate-800/40 hover:bg-slate-800/80 border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder size={16} className={isSelected ? "text-sky-400" : "text-amber-400"} />
                        <span className="font-mono text-sm tracking-tight truncate">{car.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          car.status === "Constatare"
                            ? "bg-amber-500/20 text-amber-300"
                            : car.status === "În lucru"
                            ? "bg-blue-500/20 text-blue-300"
                            : car.status === "Finalizat"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {car.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 pt-1 border-t border-slate-700/40">
                      <span className="truncate">
                        {car.clientName || car.numarDosar || "Fără detalii client"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span title="Fișiere / Poze">
                          📸 {car.stats?.totalPhotos || 0}
                        </span>
                        {isOnlineSynced ? (
                          <span title="Sincronizat în Workflow Daune" className="text-emerald-400">
                            ●
                          </span>
                        ) : (
                          <span title="Doar pe Hard Drive local" className="text-amber-400">
                            ○
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-[var(--app-border,#334155)] bg-slate-900/40 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Hard Drive Local
            </span>
            <button
              type="button"
              onClick={openRootInExplorer}
              className="text-sky-400 hover:underline font-mono cursor-pointer"
            >
              Deschide C:\DOSARE
            </button>
          </div>
        </aside>

        {/* PANE 2: BROWSER CELE 5 CATEGORII & FIȘIERE */}
        <main className="w-80 lg:w-96 flex flex-col bg-[var(--app-surface,#1e293b)]/40 shrink-0 min-h-0 border-r border-[var(--app-border,#334155)] select-none">
          <div className="p-3 border-b border-[var(--app-border,#334155)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-mono text-base font-extrabold text-white truncate">
                {selectedCarName || "Niciun dosar selectat"}
              </h2>
              <span className="text-xs text-slate-400 truncate block">
                {clientName ? `${clientName} • ` : ""}{clientPhone || numarDosar || "Dosar local"}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {clientPhone && (
                <a
                  href={`https://wa.me/4${clientPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                  title="Trimite WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              )}
              {matchingOnlineClaim ? (
                <button
                  type="button"
                  onClick={() => onOpenClaim?.(matchingOnlineClaim)}
                  className="px-2 py-1 rounded text-xs font-semibold bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 cursor-pointer"
                  title="Deschide dosarul complet în fereastra principală"
                >
                  Deschide
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSyncToOnline}
                  className="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
                  title="Preia acest dosar în Workflow Daune Online"
                >
                  + Preluare Online
                </button>
              )}
            </div>
          </div>

          <div className="p-2 border-b border-[var(--app-border,#334155)] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Structură Standard Dosar
            </span>
            <div className="grid grid-cols-1 gap-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                const count = carDetails?.categories?.[cat.key]?.length || 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleSelectCategory(cat.key)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-400/20 text-amber-200 border border-amber-400/40 font-bold"
                        : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        count > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1">
              <span>Fișiere în folder ({activeCategoryFiles.length})</span>
            </div>

            {loadingDetails ? (
              <div className="p-4 text-center text-xs text-slate-400">
                <RefreshCw className="animate-spin inline mr-1" size={13} /> Se încarcă fișierele...
              </div>
            ) : activeCategoryFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
                Niciun fișier în acest folder.
                <div className="text-[10px] text-slate-500 mt-1">
                  Folosește butonul de încărcare de mai jos pentru a adăuga direct în folder.
                </div>
              </div>
            ) : (
              activeCategoryFiles.map((f) => {
                const isSelected = selectedFile?.name === f.name;
                return (
                  <div
                    key={f.name}
                    onClick={() => {
                      setSelectedFile(f);
                      setImgRotation(0);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors border ${
                      isSelected
                        ? "bg-sky-600/30 border-sky-500 text-white font-bold"
                        : "bg-slate-800/40 hover:bg-slate-800 border-transparent text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {f.isImage ? (
                        <Image size={15} className="text-emerald-400 shrink-0" />
                      ) : f.isVideo ? (
                        <Film size={15} className="text-purple-400 shrink-0" />
                      ) : (
                        <FileText size={15} className="text-sky-400 shrink-0" />
                      )}
                      <span className="truncate font-mono text-[11px]">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                      <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <a
                        href={getDriveFileUrl(selectedCarName, selectedCategory, f.name)}
                        download={f.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300"
                        title="Descarcă"
                      >
                        <Download size={12} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-[var(--app-border,#334155)] bg-slate-900/50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-sm cursor-pointer"
            >
              <Upload size={14} /> <span>Încarcă Fișiere pe Hard Drive</span>
            </button>
          </div>
        </main>

        {/* PANE 3: PREVIEW MARE & INSPECTOR METADATE */}
        <section className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          <div className="flex-1 min-h-0 relative flex items-center justify-center bg-slate-950 p-3 overflow-hidden">
            {!selectedFile ? (
              <div className="text-center text-slate-500">
                <Image size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Selectează o fotografie sau document pentru previzualizare instantanee.</p>
              </div>
            ) : selectedFile.isImage ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                  alt={selectedFile.name}
                  style={{ transform: `rotate(${imgRotation}deg)` }}
                  className="max-h-[50vh] sm:max-h-[60vh] max-w-full object-contain rounded shadow-lg transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setImgRotation((r) => (r + 90) % 360)}
                    className="p-1 text-slate-300 hover:text-white cursor-pointer"
                    title="Rotește 90°"
                  >
                    <RotateCw size={14} />
                  </button>
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-300 hover:text-white"
                    title="Deschide în tab nou"
                  >
                    <Maximize2 size={14} />
                  </a>
                </div>
              </div>
            ) : selectedFile.isVideo ? (
              <video
                controls
                src={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                className="max-h-[55vh] max-w-full rounded shadow-lg"
              />
            ) : (
              <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
                <FileText size={48} className="mx-auto text-sky-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">{selectedFile.name}</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Dimensiune: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white"
                  >
                    Vizualizează Document
                  </a>
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    download={selectedFile.name}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
                  >
                    Descarcă
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Minimal Inspector Strip */}
          <div className="border-t border-[var(--app-border,#334155)] bg-[var(--app-surface,#1e293b)] p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {[
                  { id: "parts", label: "📦 Piese" },
                  { id: "client", label: "👤 Client & Dosar" },
                  { id: "notes", label: "📝 Observații" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      inspectorTab === tab.id
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveInspector}
                className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                Salvează pe PC &amp; Online
              </button>
            </div>

            {/* Inspector Tab Content */}
            <div className="min-h-[50px]">
              {inspectorTab === "parts" && (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={piese}
                    onChange={(e) => setPiese(e.target.value)}
                    placeholder="Piese comandate (ex: Far stg LED, Bară față)..."
                    className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pieseSosite}
                      onChange={(e) => setPieseSosite(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    Au sosit piesele?
                  </label>
                </div>
              )}

              {inspectorTab === "client" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={numarDosar}
                    onChange={(e) => setNumarDosar(e.target.value)}
                    placeholder="Nr. Dosar Daună..."
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Serie Șasiu (VIN)..."
                    className="text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nume Client..."
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Telefon Client..."
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              )}

              {inspectorTab === "notes" && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observații service, accept plată, detalii client..."
                  rows={2}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-slate-100 resize-none"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MODAL: ADAUGĂ DOSAR NOU PE HARD DRIVE */}
      {isNewCarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-sky-400" /> Adaugă Dosar Nou pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCarModalOpen(false)}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCar} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Număr Înmatriculare *</label>
                <input
                  type="text"
                  required
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="ex: B 104 TNY sau OT 51 SKY"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono font-bold text-slate-100 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Nr. Dosar Daună</label>
                  <input
                    type="text"
                    value={newDosar}
                    onChange={(e) => setNewDosar(e.target.value)}
                    placeholder="DA 10293/2026"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Serie Șasiu (VIN)</label>
                  <input
                    type="text"
                    value={newVin}
                    onChange={(e) => setNewVin(e.target.value.toUpperCase())}
                    placeholder="17 caractere"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Client</label>
                  <input
                    type="text"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Nume client"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCarModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                >
                  Creează Dosar Fizic &amp; Online
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ȘABLOANE ACTE */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-purple-400" /> Șabloane Oficiale pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1.5 text-xs">
              {templates.length === 0 ? (
                <p className="text-center text-slate-400 p-4">Nu au fost găsite șabloane pe calculator.</p>
              ) : (
                templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-750"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-purple-400 font-semibold block">{tmpl.category}</span>
                      <strong className="text-slate-200 text-xs truncate block">{tmpl.name}</strong>
                    </div>
                    <button
                      type="button"
                      disabled={attachingTemplate}
                      onClick={() => handleAttachTemplate(tmpl)}
                      className="shrink-0 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] cursor-pointer"
                    >
                      Atașează în Dosar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}