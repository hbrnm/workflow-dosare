import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Camera, Upload, FileText, Loader2, Car, ImageIcon,
  CheckCircle2, FolderOpen, Plus, ArrowRight, ShieldCheck, X, Trash2,
  Eye, FileCheck, RefreshCw, Check, ChevronDown
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "../../constants/config";
import { uploadStorageItem, refreshStorageUrls } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { fileToDataUrl, buildScanPdfBlob } from "../../utils/documentScanner";
import { todayISO } from "../../utils/dateUtils";
import { categoryLabel } from "../../utils/scanUtils";
import DocumentCropModal from "../common/DocumentCropModal";
import LiveDocumentScanner from "../common/LiveDocumentScanner";
import LiveStreamCameraModal from "../common/LiveStreamCameraModal";
import { loadLastCaptureClaimId, saveLastCaptureClaimId, softHaptic } from "../../utils/mobilePrefs";
import { isSearchHighlighted } from "../../utils/searchUtils";

export default function MobileQuickCapture({
  claims,
  searchQuery = "",
  onOpen,
  onNew,
  onPatch,
  canEditFn,
  onNotify,
  focusClaimId = null,
  onFocusClaimConsumed,
  highlightClaimIds = null,
  onMobileShellLockChange,
}) {
  const [selectedClaimId, setSelectedClaimId] = useState(() => loadLastCaptureClaimId());
  const [uploading, setUploading] = useState(false);
  const [scanSession, setScanSession] = useState(null); // { pages: [dataUrl], fileName }
  const [previewMedia, setPreviewMedia] = useState(null); // URL imagine previzualizată la marire
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraCategory, setCameraCategory] = useState("receptie");
  const [showLiveScanner, setShowLiveScanner] = useState(false);
  const [scanCropQueue, setScanCropQueue] = useState([]); // dataURLs waiting for corner edit (galerie)
  const [activeScanCrop, setActiveScanCrop] = useState(null); // current dataURL in DocumentCropModal
  const [showMoreActions, setShowMoreActions] = useState(false);

  const receptieInputRef = useRef(null);
  const reconstatareInputRef = useRef(null);
  const predareInputRef = useRef(null);

  useEffect(() => {
    if (!focusClaimId) return;
    setSelectedClaimId(focusClaimId);
    saveLastCaptureClaimId(focusClaimId);
    setShowLiveCamera(true);
    onFocusClaimConsumed?.();
  }, [focusClaimId, onFocusClaimConsumed]);

  useEffect(() => {
    if (selectedClaimId) saveLastCaptureClaimId(selectedClaimId);
  }, [selectedClaimId]);

  // Prevent App from switching to desktop shell on landscape rotate while capture UI is open.
  useEffect(() => {
    const locked =
      showLiveCamera ||
      showLiveScanner ||
      Boolean(activeScanCrop) ||
      Boolean(previewMedia);
    onMobileShellLockChange?.(locked);
    return () => onMobileShellLockChange?.(false);
  }, [
    showLiveCamera,
    showLiveScanner,
    activeScanCrop,
    previewMedia,
    onMobileShellLockChange,
  ]);

  // Drop stale last-claim if it no longer exists / isn't editable
  useEffect(() => {
    if (!selectedClaimId || !claims?.length) return;
    const stillThere = claims.some((c) => c.id === selectedClaimId && (!canEditFn || canEditFn(c)));
    if (!stillThere) setSelectedClaimId(null);
  }, [claims, selectedClaimId, canEditFn]);

  const selectClaim = (id) => {
    softHaptic(8);
    setSelectedClaimId((prev) => {
      const next = prev === id ? null : id;
      saveLastCaptureClaimId(next);
      return next;
    });
  };

  const editableClaims = useMemo(() => claims.filter((c) => canEditFn(c)), [claims, canEditFn]);

  // Lista celor mai recente dosare
  const recentClaims = useMemo(
    () => [...editableClaims].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || "")).slice(0, 8),
    [editableClaims]
  );

  // Rezultate căutare
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return recentClaims;
    return editableClaims.slice(0, 25);
  }, [editableClaims, recentClaims, searchQuery]);

  // Dosarul selectat curent (up-to-date cu ultimele poze/documente)
  const selectedClaim = useMemo(() => {
    if (!selectedClaimId) return null;
    return claims.find((c) => c.id === selectedClaimId) || null;
  }, [claims, selectedClaimId]);

  // URL-uri semnate proaspete pentru thumbnails (cele din DB expiră)
  const [displayPoze, setDisplayPoze] = useState([]);
  const [displayDocs, setDisplayDocs] = useState([]);
  const mediaFingerprint = useMemo(() => {
    if (!selectedClaim) return "";
    const p = (selectedClaim.poze || []).map((x) => x?.path || x?.id || "").join(",");
    const d = (selectedClaim.documente || []).map((x) => x?.path || x?.id || "").join(",");
    return `${selectedClaim.id}|${p}|${d}|${selectedClaim.poze?.length || 0}|${selectedClaim.documente?.length || 0}`;
  }, [selectedClaim]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedClaim) {
        setDisplayPoze([]);
        setDisplayDocs([]);
        return;
      }
      const [p, d] = await Promise.all([
        refreshStorageUrls(selectedClaim.poze || [], "poze-dosare", supabase),
        refreshStorageUrls(selectedClaim.documente || [], "documente-dosare", supabase),
      ]);
      if (!cancelled) {
        setDisplayPoze(p);
        setDisplayDocs(d);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaFingerprint]);

  // Fotografiere cu aparatul foto al telefonului pe categorii (Recepție, Reconstatare, Predare, Generale)
  const handleMobilePhotoCapture = async (fileList, categorie = "generale", targetInputRef = null) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar din listă.", "error");
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length === 0) return; // Utilizatorul a închis camera -> se oprește bucla automat

    // Redeschide camera nativă imediat pentru poza următoare
    if (targetInputRef && targetInputRef.current) {
      setTimeout(() => {
        try {
          targetInputRef.current.click();
        } catch (err) {
          console.warn("Auto-reopen camera error:", err);
        }
      }, 350);
    }

    setUploading(true);
    try {
      const noiPoze = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) continue;
        const compressed = await compressImage(file);
        const uploaded = await uploadStorageItem(supabase, "poze-dosare", selectedClaim.id, compressed, "poze");
        const itemWithCat = typeof uploaded === "object" ? { ...uploaded, categoria: categorie } : { url: uploaded, categoria: categorie };
        noiPoze.push(itemWithCat);
      }

      if (noiPoze.length > 0) {
        await onPatch(selectedClaim.id, { appendPoze: noiPoze }, { canEditFn });
      }
    } catch (err) {
      onNotify("Eroare la încărcare poză: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Încărcare document PDF
  const handleMobileDocUpload = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar.", "error");
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const noiDocs = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify(`Fișierul ${file.name} depășește limita de ${MAX_UPLOAD_SIZE_MB}MB.`, "error");
          continue;
        }
        const uploaded = await uploadStorageItem(supabase, "documente-dosare", selectedClaim.id, file, "documente");
        noiDocs.push(uploaded);
      }

      if (noiDocs.length > 0) {
        await onPatch(selectedClaim.id, { appendDocumente: noiDocs }, { canEditFn });
        onNotify(`📄 ${noiDocs.length} document(e) atașat(e) pe dosarul ${selectedClaim.numarInmatriculare}!`, "success");
      }
    } catch (err) {
      onNotify("Eroare la încărcare document: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Scanare: deschide editorul tip CamScanner (4 colțuri) pentru fiecare pagină
  const handleAddScanPages = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar.", "error");
      return;
    }
    const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith("image/"));
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        urls.push(await fileToDataUrl(file));
      }
      setActiveScanCrop(urls[0]);
      setScanCropQueue(urls.slice(1));
      if (!scanSession) {
        const defaultName = `Scan_${selectedClaim.numarInmatriculare || "Dosar"}_${todayISO()}`;
        setScanSession({ fileName: defaultName, pages: [] });
      }
    } catch (err) {
      onNotify("Eroare scanare document: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const defaultScanFileName = () =>
    `Scan_${selectedClaim?.numarInmatriculare || "Dosar"}_${todayISO()}`;

  const appendScannedPage = (croppedDataUrl) => {
    setScanSession((prev) => {
      if (prev) {
        return { ...prev, pages: [...prev.pages, croppedDataUrl] };
      }
      return { fileName: defaultScanFileName(), pages: [croppedDataUrl] };
    });
  };

  const openLiveDocumentScanner = () => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar.", "error");
      return;
    }
    setShowLiveScanner(true);
  };

  const handleLiveScannerComplete = (pages) => {
    setShowLiveScanner(false);
    if (!pages || pages.length === 0) return;
    setScanSession((prev) => {
      if (prev) {
        return { ...prev, pages: [...prev.pages, ...pages] };
      }
      return { fileName: defaultScanFileName(), pages: [...pages] };
    });
  };

  const advanceScanCropQueue = () => {
    setScanCropQueue((queue) => {
      if (queue.length === 0) {
        setActiveScanCrop(null);
        return [];
      }
      const [next, ...rest] = queue;
      setActiveScanCrop(next);
      return rest;
    });
  };

  const handleScanCropConfirm = (croppedDataUrl) => {
    appendScannedPage(croppedDataUrl);
    advanceScanCropQueue();
  };

  const handleScanCropClose = () => {
    // Skip current page, continue with remaining queue
    advanceScanCropQueue();
  };

  // Salvare sesiunii de scanare PDF (pagini fit pe A4, fără stretch)
  const handleSaveScanPDF = async () => {
    if (!scanSession || !scanSession.pages.length || !selectedClaim) return;
    setUploading(true);

    try {
      const pdfBlob = await buildScanPdfBlob(scanSession.pages, { marginMm: 5 });
      const fileName = `${scanSession.fileName.trim() || "Document_Scanat"}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      const uploadedDoc = await uploadStorageItem(supabase, "documente-dosare", selectedClaim.id, pdfFile, "documente");
      await onPatch(selectedClaim.id, { appendDocumente: [uploadedDoc] }, { canEditFn });

      setScanSession(null);
      onNotify(`📄 Documentul scanat „${fileName}” a fost atașat pe dosar!`, "success");
    } catch (err) {
      onNotify("Eroare la salvare PDF: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Ștergere fotografie din dosar și din Supabase Storage
  const handleDeletePhoto = async (e, idx) => {
    e.stopPropagation();
    if (!selectedClaim) return;
    if (!window.confirm("Confirmi ștergerea acestei fotografii din dosar?")) return;

    try {
      setUploading(true);
      const currentPoze = selectedClaim.poze || [];
      const targetItem = currentPoze[idx];

      // Curățare fișier din stocarea Supabase
      if (targetItem && targetItem.path) {
        try {
          await supabase.storage.from("poze-dosare").remove([targetItem.path]);
        } catch (stErr) {
          console.warn("Could not delete from storage bucket:", stErr);
        }
      }

      if (targetItem) {
        await onPatch(selectedClaim.id, { removePoze: [targetItem] }, { canEditFn });
      }
      onNotify("Fotografia a fost ștearsă din dosar și din stocare.", "info");
    } catch (err) {
      onNotify("Eroare la ștergerea fotografiei: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Ștergere document din dosar și din Supabase Storage
  const handleDeleteDocument = async (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedClaim) return;
    if (!window.confirm("Confirmi ștergerea acestui document din dosar?")) return;

    try {
      setUploading(true);
      const currentDocs = selectedClaim.documente || [];
      const targetItem = currentDocs[idx];

      // Curățare fișier din stocarea Supabase
      if (targetItem && targetItem.path) {
        try {
          await supabase.storage.from("documente-dosare").remove([targetItem.path]);
        } catch (stErr) {
          console.warn("Could not delete from storage bucket:", stErr);
        }
      }

      if (targetItem) {
        await onPatch(selectedClaim.id, { removeDocumente: [targetItem] }, { canEditFn });
      }
      onNotify("Documentul a fost șters din dosar și din stocare.", "info");
    } catch (err) {
      onNotify("Eroare la ștergerea documentului: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="m-ui space-y-3 flex flex-col flex-1 min-h-0 pb-4">
      
      {/* 1. SELECTARE & CĂUTARE DOSAR */}
      <div className="m-ui-panel m-ui-panel-pad space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="m-ui-kicker">Captură</p>
            <h2 className="m-ui-title" style={{ fontSize: "1.25rem" }}>Dosar pentru foto</h2>
          </div>
          {onNew && (
            <button
              type="button"
              onClick={() => { softHaptic(8); onNew(); }}
              className="m-btn-primary m-press flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11.5px] font-extrabold"
            >
              <Plus size={14} /> Dosar
            </button>
          )}
        </div>

        {selectedClaim && (
          <div className="flex items-center justify-between gap-2">
            <span className="m-ui-chip is-accent min-w-0">
              <Check size={11} className="shrink-0" />
              <span className="truncate">Selectat: {selectedClaim.numarInmatriculare || selectedClaim.numarDosar}</span>
            </span>
            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(selectedClaim)}
                className="m-brief-ghost-btn shrink-0"
              >
                Deschide
              </button>
            )}
          </div>
        )}

        {/* Listă cu afișare: Stânga (Număr Dosar) | Dreapta (Număr Înmatriculare) */}
        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 px-2 space-y-2">
              <p className="text-[12px] m-muted font-semibold">
                {searchQuery.trim() ? "Niciun dosar pentru această căutare." : "Nu ai încă dosare editabile."}
              </p>
              {onNew && (
                <button
                  type="button"
                  onClick={() => { softHaptic(8); onNew(); }}
                  className="m-btn-primary m-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-extrabold"
                >
                  <Plus size={14} /> Creează dosar nou
                </button>
              )}
            </div>
          ) : (
            searchResults.map((c) => {
              const isSelected = selectedClaimId === c.id;
              return (
                <div
                  key={c.id}
                  id={`mobile-claim-${c.id}`}
                  onClick={() => selectClaim(c.id)}
                  className={`m-ui-select-row m-press cursor-pointer ${
                    isSelected ? "is-selected" : ""
                  } ${!isSelected && isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="m-ui-chip shrink-0">
                      Dosar: {c.numarDosar || "Fără nr."}
                    </span>
                    <span className="text-[11px] font-semibold truncate m-muted">
                      {c.marcaModel || ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <span className="font-mono font-extrabold text-[12.5px] uppercase text-[var(--app-text-strong)]">
                      {c.numarInmatriculare || "FĂRĂ NR."}
                    </span>
                    {isSelected && <CheckCircle2 size={16} className="text-[var(--app-accent)]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. ACȚIUNE PRINCIPALĂ: categorie + un singur declanșator; Scan/Galerie în „Mai mult” */}
      {!selectedClaim && (
        <div className="m-ui-hint">
          Selectează un dosar de mai sus ca să fotografiezi.
        </div>
      )}
      <div className={`m-ui-panel m-ui-panel-pad space-y-3 transition-opacity ${selectedClaim ? "" : "opacity-60 pointer-events-none"}`}>
        
        {uploading && (
          <div className="flex items-center justify-center gap-2 p-2 bg-[var(--app-surface-2)] border border-[var(--app-accent)]/40 rounded-xl text-[12px] font-bold text-[var(--app-accent)]">
            <Loader2 size={16} className="animate-spin" /> Se încarcă...
          </div>
        )}

        <div className="space-y-3">
          {/* Selector categorie (nu deschide camera) */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "receptie", label: "Recepție" },
              { key: "reconstatare", label: "Reconstatare" },
              { key: "predare", label: "Predare" },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCameraCategory(cat.key)}
                className={`m-capture-cat py-2 px-1 rounded-xl border text-[11.5px] font-extrabold transition-all ${
                  cameraCategory === cat.key ? "is-active" : ""
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Declanșator principal */}
          <button
            type="button"
            onClick={() => { softHaptic(12); setShowLiveCamera(true); }}
            className="m-ui-primary-cta m-press"
            title="Deschide camera"
          >
            <Camera size={32} className="text-[var(--app-accent)]" />
            <span className="text-[15px] font-extrabold" style={{ fontFamily: "var(--app-font-display)" }}>
              Fotografiază
            </span>
            <span className="text-[11px] font-semibold opacity-60 capitalize">{cameraCategory}</span>
          </button>

          {/* Mai mult: Scan Acte / Galerie */}
          <div className="border-t border-[var(--app-border)] pt-2">
            <button
              type="button"
              onClick={() => setShowMoreActions((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-extrabold m-muted"
            >
              Mai mult
              <ChevronDown size={14} className={`transition-transform ${showMoreActions ? "rotate-180" : ""}`} />
            </button>

            {showMoreActions && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={openLiveDocumentScanner}
                  className="m-ui-select-row justify-center gap-1.5 font-extrabold text-[11.5px]"
                  title="Scanner documente"
                >
                  <FileText size={16} className="text-[var(--app-accent)]" />
                  <span>Scan Acte</span>
                </button>

                <label
                  className="m-ui-select-row justify-center gap-1.5 font-extrabold text-[11.5px] cursor-pointer"
                  title="Alege Poze din Galerie sau Fișiere PDF"
                >
                  <ImageIcon size={16} />
                  <span>Galerie / PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const images = files.filter((f) => f.type.startsWith("image/"));
                      const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
                      if (images.length > 0) handleMobilePhotoCapture(images, "generale");
                      if (pdfs.length > 0) handleMobileDocUpload(pdfs);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. VIZUALIZARE THUMBNAILS & CONFIRMARE FIȘIERE ATAȘATE PE DOSARUL SELECTAT (CU POSIBILITATE DE ȘTERGERE) */}
      {selectedClaim && (
        <div className="m-ui-panel m-ui-panel-pad space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
            <h3 className="font-extrabold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "var(--app-font-display)" }}>
              <FileCheck size={16} className="text-[var(--app-accent)]" /> Fișiere pe {selectedClaim.numarInmatriculare}
            </h3>
            <span className="m-ui-chip">
              {(displayPoze.length || selectedClaim.poze?.length || 0)} poze · {(displayDocs.length || selectedClaim.documente?.length || 0)} doc
            </span>
          </div>

          {/* GALERIE THUMBNAILS POZE CU BUTON DE ȘTERGERE */}
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider block">
              📸 Fotografii Daună / Vehicul ({displayPoze.length})
            </span>
            {displayPoze.length === 0 ? (
              <div className="text-[11px] text-[#8A8375] italic bg-[#FAF8F5] p-3 rounded-xl text-center border border-dashed border-[#DAD4C6]">
                Nicio fotografie atașată încă.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {displayPoze.map((p, idx) => {
                  const catLabel = categoryLabel(p.categoria);
                  return (
                    <div
                      key={p.path || p.id || idx}
                      onClick={() => setPreviewMedia(p.url || p)}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#DAD4C6] bg-gray-100 group cursor-pointer shadow-2xs"
                    >
                      <img src={p.url || p} alt={`Poză ${idx + 1}`} className="w-full h-full object-cover" />
                      
                      {/* Categorie Badge */}
                      {catLabel && (
                        <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase font-mono z-10">
                          {catLabel}
                        </span>
                      )}

                      {/* Overlay buton vizualizare */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye size={16} />
                      </div>

                      {/* BUTON ROȘU DE ȘTERGERE POZĂ */}
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(e, idx)}
                        className="absolute top-1 right-1 bg-[#B23A2E] text-white p-1 rounded-lg shadow-md hover:bg-red-700 transition-colors z-10"
                        title="Șterge fotografia"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTĂ DOCUMENTE ATAȘATE CU BUTON DE ȘTERGERE */}
          <div className="space-y-1.5 pt-2 border-t border-[#EFEAE1]">
            <span className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider block">
              📄 Documente Acte ({displayDocs.length})
            </span>
            {displayDocs.length === 0 ? (
              <div className="text-[11px] text-[#8A8375] italic bg-[#FAF8F5] p-3 rounded-xl text-center border border-dashed border-[#DAD4C6]">
                Niciun document PDF atașat.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                {displayDocs.map((doc, idx) => (
                  <div
                    key={doc.path || doc.id || idx}
                    className="flex items-center justify-between p-2 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] text-[11.5px] font-semibold text-[#23282E]"
                  >
                    <a
                      href={doc.url || doc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:underline text-[#23282E]"
                    >
                      <FileText size={15} className="text-[#3B5166] shrink-0" />
                      <span className="truncate">{doc.name || doc.nume || `Document_${idx + 1}.pdf`}</span>
                    </a>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a
                        href={doc.url || doc}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-[#8A8375] hover:text-[#3B5166]"
                        title="Vizualizează"
                      >
                        <Eye size={15} />
                      </a>
                      
                      {/* BUTON ROȘU DE ȘTERGERE DOCUMENT */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDocument(e, idx)}
                        className="p-1 bg-[#B23A2E]/10 hover:bg-[#B23A2E] text-[#B23A2E] hover:text-white rounded-lg transition-colors"
                        title="Șterge documentul"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL REVIZUIT SCANARE DOCUMENTE (COMPLET OPAC, FUNDAL SOLID NENEGRU OBLIGATORIU) */}
      {scanSession && (
        <div className="fixed inset-0 z-[9999] bg-[#12161A] text-white p-4 flex flex-col justify-between overflow-hidden">
          
          {/* Header Modal Scanare */}
          <div className="flex items-center justify-between border-b border-white/15 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-[#C98A2B]" />
              <h3 className="font-extrabold text-[15px] text-white">
                Scanare Documente ({scanSession.pages.length} pagini)
              </h3>
            </div>
            <button
              onClick={() => setScanSession(null)}
              className="p-1.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Pagini Scanate Previzualizabile */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-thin">
            {scanSession.pages.length === 0 ? (
              <div className="text-center py-12 text-white/60 text-[13px] font-semibold">
                Nicio pagină scanată încă. Folosește butonul de mai jos pentru a adăuga pagini.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {scanSession.pages.map((pUrl, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-white/20 bg-black aspect-[3/4] shadow-lg">
                    <img src={pUrl} alt={`Pagina ${idx + 1}`} className="w-full h-full object-contain" />
                    <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                      Pag. {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setScanSession((prev) => ({ ...prev, pages: prev.pages.filter((_, i) => i !== idx) }))}
                      className="absolute top-2 right-2 bg-[#B23A2E] text-white p-1.5 rounded-lg shadow-md"
                      title="Șterge pagina"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bară inferioară acțiuni scanare cu fundal solid */}
          <div className="border-t border-white/15 pt-3 space-y-3 shrink-0 bg-[#12161A]">
            
            {/* Buton adăugare altă pagină — redeschide scannerul live */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowLiveScanner(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-extrabold transition-colors"
              >
                <Camera size={18} className="text-[#C98A2B]" />
                <span>Scanner live</span>
              </button>
              <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-extrabold cursor-pointer transition-colors">
                <ImageIcon size={18} className="text-[#C98A2B]" />
                <span>Din galerie</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleAddScanPages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Nume fișier scanat */}
            <div>
              <label className="block text-[11px] text-white/70 font-bold mb-1">Nume fișier PDF salvat</label>
              <input
                className="w-full bg-[#1C2127] border border-white/20 rounded-xl px-3 py-2 text-[13px] font-bold text-white focus:outline-hidden"
                value={scanSession.fileName}
                onChange={(e) => setScanSession((prev) => ({ ...prev, fileName: e.target.value }))}
              />
            </div>

            {/* Butoane Salvare / Anulare */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScanSession(null)}
                className="flex-1 py-3 rounded-xl border border-white/20 font-bold text-[13px] text-white/80"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleSaveScanPDF}
                disabled={uploading || scanSession.pages.length === 0}
                className="flex-1 py-3 rounded-xl bg-[#C98A2B] hover:bg-[#B37A22] text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : "Salvează PDF pe Dosar"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* OVERLAY PREVIZUALIZARE MĂRITĂ IMAGINE (Punctul 12 - Buton X vizibil) */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewMedia(null)}
        >
          <button
            onClick={() => setPreviewMedia(null)}
            className="absolute top-4 right-4 text-white bg-black/60 hover:bg-[#B23A2E] p-2.5 rounded-full transition-colors shadow-lg z-10"
            title="Închide previzualizarea"
          >
            <X size={24} />
          </button>
          <img src={previewMedia} alt="Previzualizare" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* MODAL CAMERĂ LIVE STIL IPHONE/SAMSUNG (ZERO BUTOANE DE OK) */}
      {showLiveCamera && selectedClaim && (
        <LiveStreamCameraModal
          initialCategorie={cameraCategory}
          onSavePhoto={handleMobilePhotoCapture}
          onClose={() => setShowLiveCamera(false)}
        />
      )}

      {/* Scanner documente live tip CamScanner / QuickScan */}
      {showLiveScanner && selectedClaim && (
        <LiveDocumentScanner
          onComplete={handleLiveScannerComplete}
          onClose={() => setShowLiveScanner(false)}
        />
      )}

      {/* Editor 4 colțuri tip CamScanner — câte o pagină din coadă (galerie) */}
      {activeScanCrop && (
        <DocumentCropModal
          imageSrc={activeScanCrop}
          onConfirm={handleScanCropConfirm}
          onClose={handleScanCropClose}
        />
      )}

    </div>
  );
}
