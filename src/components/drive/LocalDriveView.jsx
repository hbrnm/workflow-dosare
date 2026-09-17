import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  HardDrive, Folder, File, Image, Film, FileText, CheckCircle2,
  AlertCircle, AlertTriangle, RefreshCw, ExternalLink, Sparkles, Plus, Copy,
  MessageCircle, Upload, ChevronRight, Download, RotateCw, Maximize2,
  Search, X
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
import ClaimPlate from "../common/ClaimPlate";
import AppButton from "../common/AppButton";

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
    <div className="flex flex-col h-full bg-[var(--app-surface)] text-[var(--app-text)] font-sans overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-xs transition-colors">
      {/* TOP HEADER: BREADCRUMBS & ACTIONS */}
      <header className="h-13 bg-[var(--app-surface)] border-b border-[var(--app-border)] px-3.5 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Fluid Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--app-surface-2)] text-[var(--app-text)] border border-[var(--app-border)] shrink-0">
            <HardDrive size={14} className="text-amber-500" />
            <span className="font-mono">C:\DOSARE</span>
          </span>
          <ChevronRight size={13} className="text-[var(--app-muted)] shrink-0" />
          {selectedCarName ? (
            <ClaimPlate value={selectedCarName} className="text-xs shrink-0" />
          ) : (
            <span className="text-xs text-[var(--app-muted)] italic shrink-0">Niciun dosar</span>
          )}
          <ChevronRight size={13} className="text-[var(--app-muted)] shrink-0 hidden sm:inline" />
          <span className="text-xs font-medium text-[var(--app-muted)] hidden sm:inline truncate">
            {CATEGORIES.find((c) => c.key === selectedCategory)?.label || selectedCategory}
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
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border)] px-2.5 py-1 rounded-md text-[var(--app-text)] cursor-pointer transition-colors"
              title="Copiază Număr Dosar"
            >
              <Copy size={11} className="text-[var(--app-muted)]" />
              <span className="text-[var(--app-muted)] font-semibold">DOSAR:</span>
              <span className="font-bold">{numarDosar}</span>
            </button>
          )}

          {vin && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(vin);
                showNotice?.("VIN copiat!", "success");
              }}
              className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border)] px-2.5 py-1 rounded-md text-[var(--app-text)] cursor-pointer transition-colors"
              title="Copiază Serie Șasiu"
            >
              <Copy size={11} className="text-[var(--app-muted)]" />
              <span className="text-[var(--app-muted)] font-semibold">VIN:</span>
              <span className="font-bold">{vin.slice(0, 10)}…</span>
            </button>
          )}

          {selectedCarName && (
            <AppButton
              variant="secondary"
              onClick={() => openCarInExplorer(selectedCarName)}
              title="Deschide dosarul fizic în Windows Explorer"
              className="text-xs"
            >
              <ExternalLink size={13} className="text-emerald-500" />
              <span className="hidden md:inline">Explorer</span>
            </AppButton>
          )}

          <AppButton
            variant="secondary"
            onClick={async () => {
              const res = await organizeDriveFiles();
              showNotice?.(`Organizare completă: ${res.movedCount || 0} fișiere sortate automat.`, "success");
              loadCars(true);
            }}
            title="Curăță și sortează automat fișierele pe cele 5 categorii standard"
            className="text-xs"
          >
            <Sparkles size={13} className="text-indigo-500" />
            <span className="hidden lg:inline">Sortează</span>
          </AppButton>

          <AppButton
            variant="secondary"
            onClick={handleOpenTemplates}
            title="Atașează Cereri Despăgubire RCA / CASCO sau Declarații"
            className="text-xs"
          >
            <FileText size={13} className="text-purple-500" />
            <span className="hidden lg:inline">Șabloane</span>
          </AppButton>

          <AppButton
            variant="primary"
            onClick={() => setIsNewCarModalOpen(true)}
            className="text-xs"
          >
            <Plus size={14} />
            <span>Dosar Nou pe PC</span>
          </AppButton>
        </div>
      </header>

      {/* 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex min-h-0 divide-x divide-[var(--app-border)]">
        {/* PANE 1: LISTA DOSARE HARD DRIVE */}
        <aside className="w-72 lg:w-80 flex flex-col bg-[var(--app-surface-2)]/30 shrink-0 select-none">
          <div className="p-3 space-y-2.5 border-b border-[var(--app-border)]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută mașină, dosar, VIN..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
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
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold transition-all cursor-pointer ${
                    stageFilter === st.key
                      ? "bg-[var(--app-surface)] text-[var(--app-text-strong)] border border-[var(--app-border)] shadow-xs ring-1 ring-[var(--app-accent)]/30"
                      : "bg-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--app-muted)]">
                <RefreshCw className="animate-spin inline mr-1.5" size={14} /> Se citesc dosarele de pe hard drive...
              </div>
            ) : loadError ? (
              <div className="m-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                <AlertTriangle className="mx-auto text-amber-500" size={22} />
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Permisiune necesară în browser</p>
                <p className="text-[11px] text-[var(--app-text)] leading-relaxed text-left">
                  Chrome blochează accesul la serverul PC local până la acordarea permisiunii:
                </p>
                <ol className="text-[10.5px] text-[var(--app-text)] text-left list-decimal list-inside space-y-1 bg-[var(--app-surface)] p-2.5 rounded-lg border border-[var(--app-border)]">
                  <li>Apasă pe pictograma cu setări (lângă <b>workflow-dosare.vercel.app</b> în bara de sus).</li>
                  <li>Setează <b>"Apps on device"</b> sau <b>"Acces rețea locală"</b> pe <b>Allow (Permite)</b>.</li>
                </ol>
                <AppButton
                  variant="primary"
                  onClick={() => loadCars(false)}
                  className="w-full text-xs"
                >
                  <RefreshCw size={13} /> Reîncearcă conexiunea
                </AppButton>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--app-muted)]">
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
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[var(--app-surface)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]/25"
                        : "bg-[var(--app-surface)]/60 hover:bg-[var(--app-surface)] border-[var(--app-border-soft)] hover:border-[var(--app-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder size={15} className={isSelected ? "text-[var(--app-accent)] shrink-0" : "text-amber-500 shrink-0"} />
                        <ClaimPlate value={car.name} className="text-xs" />
                      </div>
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                          car.status === "Constatare"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                            : car.status === "În lucru"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            : car.status === "Finalizat"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                        }`}
                      >
                        {car.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--app-muted)] mt-2 pt-1.5 border-t border-[var(--app-border-soft)]">
                      <span className="truncate max-w-[160px] font-medium">
                        {car.clientName || car.numarDosar || "Fără detalii client"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--app-surface-2)] border border-[var(--app-border-soft)]" title="Fișiere / Poze">
                          📸 {car.stats?.totalPhotos || 0}
                        </span>
                        {isOnlineSynced ? (
                          <span title="Sincronizat în Workflow Daune" className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 gap-0.5">
                            <CheckCircle2 size={11} /> Sincronizat
                          </span>
                        ) : (
                          <span title="Doar pe Hard Drive local" className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Local
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[var(--app-border)] bg-[var(--app-surface)] flex items-center justify-between text-[11px] text-[var(--app-muted)]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Hard Drive Conectat
            </span>
            <button
              type="button"
              onClick={openRootInExplorer}
              className="text-[var(--app-accent)] hover:underline font-mono cursor-pointer"
            >
              C:\DOSARE
            </button>
          </div>
        </aside>

        {/* PANE 2: STRUCTURĂ CATEGORII & FIȘIERE */}
        <main className="w-80 lg:w-96 flex flex-col bg-[var(--app-surface)] shrink-0 min-h-0 border-r border-[var(--app-border)] select-none">
          <div className="p-3.5 border-b border-[var(--app-border)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              {selectedCarName ? (
                <ClaimPlate value={selectedCarName} className="text-sm shadow-2xs" />
              ) : (
                <h2 className="text-sm font-bold text-[var(--app-text-strong)]">Niciun dosar selectat</h2>
              )}
              <span className="text-xs text-[var(--app-muted)] truncate block mt-0.5">
                {clientName ? `${clientName} • ` : ""}{clientPhone || numarDosar || "Dosar local"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {clientPhone && (
                <a
                  href={`https://wa.me/4${clientPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                  title="Trimite WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              )}
              {matchingOnlineClaim ? (
                <AppButton
                  variant="secondary"
                  onClick={() => onOpenClaim?.(matchingOnlineClaim)}
                  title="Deschide dosarul complet în fereastra principală"
                  className="text-xs"
                >
                  Deschide
                </AppButton>
              ) : (
                <AppButton
                  variant="primary"
                  onClick={handleSyncToOnline}
                  title="Preia acest dosar în Workflow Daune Online"
                  className="text-xs"
                >
                  <Sparkles size={12} /> Preia Online
                </AppButton>
              )}
            </div>
          </div>

          <div className="p-2.5 border-b border-[var(--app-border)] space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-muted)] px-1">
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
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer border ${
                      isActive
                        ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-bold shadow-2xs"
                        : "bg-[var(--app-surface-2)]/50 hover:bg-[var(--app-surface-2)] text-[var(--app-text)] border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        count > 0
                          ? "bg-[var(--app-accent)] text-[var(--app-accent-text)]"
                          : "bg-[var(--app-surface)] text-[var(--app-muted)] border border-[var(--app-border-soft)]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
            <div className="flex items-center justify-between text-xs text-[var(--app-muted)] px-1 pb-1">
              <span className="font-semibold">Fișiere în folder ({activeCategoryFiles.length})</span>
            </div>

            {loadingDetails ? (
              <div className="p-4 text-center text-xs text-[var(--app-muted)]">
                <RefreshCw className="animate-spin inline mr-1" size={13} /> Se încarcă fișierele...
              </div>
            ) : activeCategoryFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]/30">
                Niciun fișier în acest folder.
                <div className="text-[11px] text-[var(--app-muted)] mt-1">
                  Încarcă fișiere sau atașează din șabloane.
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
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                      isSelected
                        ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-semibold shadow-2xs"
                        : "bg-[var(--app-surface-2)]/40 hover:bg-[var(--app-surface-2)] border-transparent text-[var(--app-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {f.isImage ? (
                        <Image size={15} className="text-emerald-500 shrink-0" />
                      ) : f.isVideo ? (
                        <Film size={15} className="text-purple-500 shrink-0" />
                      ) : (
                        <FileText size={15} className="text-sky-500 shrink-0" />
                      )}
                      <span className="truncate font-mono text-[11px]">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--app-muted)]">
                      <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <a
                        href={getDriveFileUrl(selectedCarName, selectedCategory, f.name)}
                        download={f.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] transition-colors"
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

          <div className="p-2.5 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
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
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] border border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] transition-all cursor-pointer shadow-2xs"
            >
              <Upload size={14} className="text-[var(--app-accent)]" /> <span>Încarcă Fișiere pe Hard Drive</span>
            </button>
          </div>
        </main>

        {/* PANE 3: PREVIEW MARE & INSPECTOR METADATE */}
        <section className="flex-1 flex flex-col min-h-0 bg-[var(--app-surface-2)]/30 overflow-hidden">
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 overflow-hidden">
            {!selectedFile ? (
              <div className="text-center text-[var(--app-muted)] max-w-sm">
                <Image size={40} className="mx-auto mb-2.5 opacity-30" />
                <p className="text-xs font-medium">Selectează o fotografie sau document pentru previzualizare instantanee.</p>
              </div>
            ) : selectedFile.isImage ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                  alt={selectedFile.name}
                  style={{ transform: `rotate(${imgRotation}deg)` }}
                  className="max-h-[50vh] sm:max-h-[58vh] max-w-full object-contain rounded-xl shadow-md transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--app-surface)]/90 backdrop-blur border border-[var(--app-border)] p-1 rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setImgRotation((r) => (r + 90) % 360)}
                    className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] rounded cursor-pointer transition-colors"
                    title="Rotește 90°"
                  >
                    <RotateCw size={14} />
                  </button>
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] rounded transition-colors"
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
                className="max-h-[55vh] max-w-full rounded-xl shadow-md"
              />
            ) : (
              <div className="text-center p-8 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-sm max-w-md">
                <FileText size={48} className="mx-auto text-sky-500 mb-3" />
                <h4 className="font-bold text-sm text-[var(--app-text-strong)] mb-1">{selectedFile.name}</h4>
                <p className="text-xs text-[var(--app-muted)] mb-4">
                  Dimensiune: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <div className="flex gap-2 justify-center">
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] text-xs font-semibold hover:opacity-95 transition-opacity"
                  >
                    Vizualizează Document
                  </a>
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    download={selectedFile.name}
                    className="px-3 py-1.5 rounded-lg bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-xs font-semibold text-[var(--app-text)] border border-[var(--app-border)] transition-colors"
                  >
                    Descarcă
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Inspector Strip */}
          <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3 shrink-0">
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <div className="app-segment-track inline-flex p-0.5 border border-[var(--app-border)]">
                {[
                  { id: "parts", label: "📦 Piese" },
                  { id: "client", label: "👤 Client & Dosar" },
                  { id: "notes", label: "📝 Observații" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      inspectorTab === tab.id
                        ? "app-segment-active font-bold"
                        : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <AppButton
                variant="primary"
                onClick={handleSaveInspector}
                className="text-xs font-bold"
              >
                <CheckCircle2 size={13} /> <span>Salvează pe PC &amp; Online</span>
              </AppButton>
            </div>

            {/* Inspector Tab Content */}
            <div className="min-h-[46px]">
              {inspectorTab === "parts" && (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={piese}
                    onChange={(e) => setPiese(e.target.value)}
                    placeholder="Piese comandate (ex: Far stg LED, Bară față)..."
                    className="flex-1 text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[var(--app-text)] font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pieseSosite}
                      onChange={(e) => setPieseSosite(e.target.checked)}
                      className="rounded border-[var(--app-border)] text-sky-600 focus:ring-0"
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
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Serie Șasiu (VIN)..."
                    className="text-xs font-mono bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nume Client..."
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Telefon Client..."
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              )}

              {inspectorTab === "notes" && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observații service, accept plată, detalii client..."
                  rows={2}
                  className="w-full text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] resize-none focus:outline-none focus:border-[var(--app-accent)]"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MODAL: ADAUGĂ DOSAR NOU PE HARD DRIVE */}
      {isNewCarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <Plus size={16} className="text-[var(--app-accent)]" /> Adaugă Dosar Nou pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCarModalOpen(false)}
                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCar} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--app-text-strong)] font-semibold mb-1">Număr Înmatriculare *</label>
                <input
                  type="text"
                  required
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="ex: B 104 TNY sau OT 51 SKY"
                  className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 font-mono font-bold text-[var(--app-text-strong)] uppercase tracking-wider focus:outline-none focus:border-[var(--app-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Nr. Dosar Daună</label>
                  <input
                    type="text"
                    value={newDosar}
                    onChange={(e) => setNewDosar(e.target.value)}
                    placeholder="DA 10293/2026"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Serie Șasiu (VIN)</label>
                  <input
                    type="text"
                    value={newVin}
                    onChange={(e) => setNewVin(e.target.value.toUpperCase())}
                    placeholder="17 caractere"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 font-mono text-[var(--app-text)] uppercase focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Client</label>
                  <input
                    type="text"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Nume client"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Telefon</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--app-border)]">
                <AppButton
                  variant="ghost"
                  onClick={() => setIsNewCarModalOpen(false)}
                >
                  Anulează
                </AppButton>
                <AppButton
                  variant="primary"
                  type="submit"
                >
                  Creează Dosar Fizic &amp; Online
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ȘABLOANE ACTE */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <FileText size={16} className="text-purple-500" /> Șabloane Oficiale pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(false)}
                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 max-h-[60vh] overflow-y-auto space-y-1.5 text-xs">
              {templates.length === 0 ? (
                <p className="text-center text-[var(--app-muted)] p-6">Nu au fost găsite șabloane pe calculator.</p>
              ) : (
                templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border-soft)] transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">{tmpl.category}</span>
                      <strong className="text-[var(--app-text-strong)] text-xs truncate block">{tmpl.name}</strong>
                    </div>
                    <AppButton
                      variant="secondary"
                      disabled={attachingTemplate}
                      onClick={() => handleAttachTemplate(tmpl)}
                      className="text-[11px]"
                    >
                      Atașează în Dosar
                    </AppButton>
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