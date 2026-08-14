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
import PhotoLightbox from "../common/PhotoLightbox";
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
  focusCaptureCategory = null,
  onFocusClaimConsumed,
  highlightClaimIds = null,
  onMobileShellLockChange,
}) {
  const [selectedClaimId, setSelectedClaimId] = useState(() => loadLastCaptureClaimId());
  const [uploading, setUploading] = useState(false);
  const [scanSession, setScanSession] = useState(null); // { pages: [dataUrl], fileName }
  const [previewMediaIndex, setPreviewMediaIndex] = useState(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [liveCameraStream, setLiveCameraStream] = useState(null);
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
    if (focusCaptureCategory === "receptie" || focusCaptureCategory === "predare" || focusCaptureCategory === "reconstatare") {
      setCameraCategory(focusCaptureCategory);
    }
    setShowLiveCamera(true);
    onFocusClaimConsumed?.();
  }, [focusClaimId, focusCaptureCategory, onFocusClaimConsumed]);

  useEffect(() => {
    if (selectedClaimId) saveLastCaptureClaimId(selectedClaimId);
  }, [selectedClaimId]);

  // Prevent App from switching to desktop shell on landscape rotate while capture UI is open.
  useEffect(() => {
    const locked =
      showLiveCamera ||
      showLiveScanner ||
      Boolean(activeScanCrop) ||
      previewMediaIndex != null;
    onMobileShellLockChange?.(locked);
    return () => onMobileShellLockChange?.(false);
  }, [
    showLiveCamera,
    showLiveScanner,
    activeScanCrop,
    previewMediaIndex,
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

  const selectedClaim = useMemo(() => {
    if (!selectedClaimId) return null;
    return claims.find((c) => c.id === selectedClaimId) || null;
  }, [claims, selectedClaimId]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return editableClaims.slice(0, 20);
    return editableClaims
      .filter(
        (c) =>
          c.numarInmatriculare?.toLowerCase().includes(q) ||
          c.numarDosar?.toLowerCase().includes(q) ||
          c.client?.toLowerCase().includes(q) ||
          c.marcaModel?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [editableClaims, searchQuery]);

  // Thumbnails afișate imediat: refresh signed URLs dacă expiră
  const [displayPoze, setDisplayPoze] = useState([]);
  const [displayDocs, setDisplayDocs] = useState([]);

  useEffect(() => {
    if (!selectedClaim) {
      setDisplayPoze([]);
      setDisplayDocs([]);
      return;
    }
    let active = true;
    (async () => {
      const pozeFresh = await refreshStorageUrls(selectedClaim.poze || [], "claim-photos", supabase);
      const docsFresh = await refreshStorageUrls(selectedClaim.documente || [], "claim-documents", supabase);
      if (active) {
        setDisplayPoze(pozeFresh);
        setDisplayDocs(docsFresh);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedClaim]);

  // Deschide camera live direct cu WebRTC getUserMedia (stil iPhone Camera UI)
  const openLiveCamera = async () => {
    if (!selectedClaim) return;
    setShowLiveCamera(true);
  };

  // Callback la captură rapidă din camera live (salvează fără confirmări suplimentare)
  const handleMobilePhotoCapture = async (files, targetCat) => {
    if (!selectedClaim || !files?.length) return;
    const cat = targetCat || cameraCategory || "receptie";

    try {
      setUploading(true);
      const uploadedPhotos = [];

      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify(`Fișierul ${file.name} depășește limita de ${MAX_UPLOAD_SIZE_MB}MB`, "error");
          continue;
        }

        const optimizedFile = await compressImage(file, { maxDim: 1800, quality: 0.80 });
        const uploaded = await uploadStorageItem({
          supabaseClient: supabase,
          claimId: selectedClaim.id,
          file: optimizedFile,
          folder: "poze",
          bucketName: "poze-dosare",
          extraFields: {
            categoria: cat,
            nume: file.name || `foto_${cat}_${todayISO()}.jpg`,
            data: todayISO(),
          },
        });

        if (uploaded) {
          uploadedPhotos.push(uploaded);
        }
      }

      if (uploadedPhotos.length > 0) {
        await onPatch(selectedClaim.id, { appendPoze: uploadedPhotos }, { canEditFn });
        onNotify(`S-au salvat ${uploadedPhotos.length} foto la [${cat.toUpperCase()}]`, "success");
      }
    } catch (err) {
      console.error(err);
      onNotify("Eroare la încărcarea fotografiilor: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Deschide scannerul de documente live (camera cu detecție chenar)
  const openLiveDocumentScanner = () => {
    if (!selectedClaim) return;
    setShowLiveScanner(true);
  };

  // Callback după scanarea automată cu camera
  const handleLiveScannerComplete = (capturedDataUrl) => {
    setShowLiveScanner(false);
    if (!capturedDataUrl) return;

    // Deschide sesiunea de asamblare PDF
    const defaultName = `Document_${selectedClaim.numarInmatriculare || "Dosar"}_${todayISO()}`;
    setScanSession({
      pages: [capturedDataUrl],
      fileName: defaultName,
    });
  };

  // Deschide încărcătorul din galerie pentru decupare manuală pe 4 colțuri
  const handleAddFromGallery = (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    
    // Convertim toate fișierele în DataURLs pentru coada de decupare
    Promise.all(fileList.map((f) => fileToDataUrl(f))).then((dataUrls) => {
      const valid = dataUrls.filter(Boolean);
      if (valid.length > 0) {
        setScanCropQueue((prev) => [...prev, ...valid]);
      }
    });
  };

  // Procesează coada de decupare câte o pagină
  useEffect(() => {
    if (!activeScanCrop && scanCropQueue.length > 0) {
      setActiveScanCrop(scanCropQueue[0]);
      setScanCropQueue((prev) => prev.slice(1));
    }
  }, [activeScanCrop, scanCropQueue]);

  const handleScanCropConfirm = (croppedDataUrl) => {
    setActiveScanCrop(null);
    if (!croppedDataUrl) return;

    setScanSession((prev) => {
      if (!prev) {
        const defaultName = `Document_${selectedClaim?.numarInmatriculare || "Dosar"}_${todayISO()}`;
        return { pages: [croppedDataUrl], fileName: defaultName };
      }
      return { ...prev, pages: [...prev.pages, croppedDataUrl] };
    });
  };

  const handleScanCropClose = () => {
    setActiveScanCrop(null);
  };

  // Adaugă pagini suplimentare la sesiunea de scanare curentă
  const handleAddScanPages = (files) => {
    if (!files || files.length === 0) return;
    handleAddFromGallery(files);
  };

  // Salvează paginile scanate ca un singur document PDF compact în dosar
  const handleSaveScanPDF = async () => {
    if (!selectedClaim || !scanSession || scanSession.pages.length === 0) return;

    try {
      setUploading(true);
      const pdfBlob = await buildScanPdfBlob(scanSession.pages);
      const fileName = `${scanSession.fileName.replace(/\.pdf$/i, "")}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      const uploaded = await uploadStorageItem({
        supabaseClient: supabase,
        claimId: selectedClaim.id,
        file: pdfFile,
        folder: "documente",
        bucketName: "documente-dosare",
        extraFields: {
          nume: fileName,
          data: todayISO(),
        },
      });

      if (uploaded) {
        await onPatch(selectedClaim.id, { appendDocumente: [uploaded] }, { canEditFn });
        onNotify(`Documentul "${fileName}" a fost salvat în dosar.`, "success");
        setScanSession(null);
      }
    } catch (err) {
      console.error(err);
      onNotify("Eroare la generarea documentului PDF: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Încărcare rapidă documente PDF existente din fișiere
  const handleMobileDocUpload = async (files) => {
    if (!selectedClaim || !files?.length) return;

    try {
      setUploading(true);
      const uploadedDocs = [];

      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify(`Fișierul ${file.name} depășește limita de ${MAX_UPLOAD_SIZE_MB}MB`, "error");
          continue;
        }

        const uploaded = await uploadStorageItem({
          supabaseClient: supabase,
          claimId: selectedClaim.id,
          file,
          folder: "documente",
          bucketName: "documente-dosare",
          extraFields: {
            nume: file.name,
            data: todayISO(),
          },
        });

        if (uploaded) {
          uploadedDocs.push(uploaded);
        }
      }

      if (uploadedDocs.length > 0) {
        await onPatch(selectedClaim.id, { appendDocumente: uploadedDocs }, { canEditFn });
        onNotify(`S-au adăugat ${uploadedDocs.length} documente.`, "success");
      }
    } catch (err) {
      console.error(err);
      onNotify("Eroare la încărcarea documentelor: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Ștergere directă fotografie din dosar și storage
  const handleDeletePhoto = async (e, photoIndex) => {
    e.stopPropagation();
    if (!selectedClaim) return;

    const targetPhoto = displayPoze[photoIndex];
    if (!targetPhoto) return;

    if (!window.confirm("Sigur dorești să ștergi această fotografie din dosar?")) {
      return;
    }

    try {
      setUploading(true);
      if (targetPhoto.path) {
        await supabase.storage.from("claim-photos").remove([targetPhoto.path]);
      }

      // Actualizează dosarul prin removePoze patch
      await onPatch(selectedClaim.id, { removePoze: [targetPhoto] }, { canEditFn });
      onNotify("Fotografia a fost ștearsă din dosar și din stocare.", "info");
    } catch (err) {
      onNotify("Eroare la ștergerea fotografiei: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Ștergere directă document PDF din dosar și storage
  const handleDeleteDocument = async (e, docIndex) => {
    e.stopPropagation();
    if (!selectedClaim) return;

    const targetDoc = displayDocs[docIndex];
    if (!targetDoc) return;

    if (!window.confirm(`Sigur dorești să ștergi documentul "${targetDoc.name || targetDoc.nume || "PDF"}" din dosar?`)) {
      return;
    }

    try {
      setUploading(true);
      if (targetDoc.path) {
        await supabase.storage.from("claim-documents").remove([targetDoc.path]);
      }

      const targetItem = (selectedClaim.documente || []).find(
        (d) => (d.path && d.path === targetDoc.path) || (d.id && d.id === targetDoc.id) || (d.url && d.url === targetDoc.url)
      );
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
    <div className="m-ui space-y-3.5 flex flex-col flex-1 min-h-0 pb-12">
      
      {/* 1. HEADER CU SPAȚIERE SIGURĂ PENTRU BUTONUL MENIU FLOATING */}
      <div className="flex items-center justify-between gap-3 pl-12 pr-1 pt-1 min-h-[44px]">
        <div className="min-w-0">
          <h1 className="text-[17px] font-black text-[var(--app-text-strong)] tracking-tight truncate" style={{ fontFamily: "var(--app-font-display)" }}>
            Captură Foto &amp; Doc
          </h1>
          <p className="text-[11px] text-[var(--app-muted)] font-medium truncate">
            Selectează dosarul pentru fotografiere
          </p>
        </div>
        {onNew && (
          <button
            type="button"
            onClick={() => { softHaptic(8); onNew(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--app-accent)] text-[var(--app-accent-text)] rounded-xl text-[12px] font-extrabold shadow-sm active:scale-95 transition-transform shrink-0"
            aria-label="Dosar nou"
            title="Dosar nou"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nou</span>
          </button>
        )}
      </div>

      {/* 2. CARD DOSAR ACTIV SELECTAT */}
      {selectedClaim ? (
        <div className="bg-gradient-to-r from-[var(--app-surface-2)] to-[var(--app-surface)] border-2 border-[var(--app-accent)]/50 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] flex items-center justify-center font-black text-[14px] shrink-0 shadow-xs">
              <Car size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-[15px] text-[var(--app-text-strong)] tracking-wide">
                  {selectedClaim.numarInmatriculare || "FĂRĂ NR."}
                </span>
                <span className="text-[10.5px] font-mono text-[var(--app-muted)] bg-[var(--app-surface-2)] px-2 py-0.5 rounded-md border border-[var(--app-border)] font-bold">
                  {selectedClaim.numarDosar || "Fără dosar"}
                </span>
              </div>
              <div className="text-[11.5px] text-[var(--app-muted)] truncate font-semibold mt-0.5">
                {selectedClaim.client || selectedClaim.marcaModel || "Dosar selectat activ"}
              </div>
            </div>
          </div>
          {onOpen && (
            <button
              type="button"
              onClick={() => onOpen(selectedClaim)}
              className="px-3.5 py-2 bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-text-strong)] rounded-xl text-[12px] font-bold shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
            >
              <span>Deschide</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3.5 bg-[var(--app-surface-2)]/60 border border-dashed border-[var(--app-border)] rounded-2xl text-center">
          <p className="text-[12px] text-[var(--app-muted)] font-semibold">
            Alege un dosar din lista de mai jos pentru a începe captura
          </p>
        </div>
      )}

      {/* 3. LISTĂ SELECTARE DOSAR */}
      <div className="m-ui-panel m-ui-panel-pad space-y-2">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] flex items-center justify-between pb-1 border-b border-[var(--app-border)]">
          <span>Dosare recente</span>
          <span className="text-[10px] font-mono font-bold text-[var(--app-muted)]">
            {searchResults.length} disponibile
          </span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 px-2 space-y-2">
              <p className="text-[12px] m-muted font-semibold">
                {searchQuery.trim() ? "Niciun dosar pentru această căutare." : "Nu ai încă dosare editabile."}
              </p>
            </div>
          ) : (
            searchResults.map((c) => {
              const isSelected = selectedClaimId === c.id;
              return (
                <div
                  key={c.id}
                  id={`mobile-claim-${c.id}`}
                  onClick={() => selectClaim(c.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] shadow-xs"
                      : "bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] border-[var(--app-border)]"
                  } ${!isSelected && isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`font-mono text-[12px] font-black ${isSelected ? "text-[var(--app-accent)]" : "text-[var(--app-text-strong)]"}`}>
                      {c.numarDosar || "Fără nr."}
                    </span>
                    {c.client && (
                      <span className="text-[11px] text-[var(--app-muted)] truncate max-w-[120px]">
                        · {c.client}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[12.5px] font-black text-[var(--app-text-strong)] bg-[var(--app-surface-2)] px-2 py-0.5 rounded-md border border-[var(--app-border)]">
                      {c.numarInmatriculare || "FĂRĂ NR."}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 size={17} className="text-[var(--app-accent)] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[var(--app-border)] shrink-0 opacity-40" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. ACȚIUNE PRINCIPALĂ: categorie + Studio Shutter */}
      <div className={`m-ui-panel m-ui-panel-pad space-y-3 transition-opacity ${selectedClaim ? "" : "opacity-60 pointer-events-none"}`}>
        
        {uploading && (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-[var(--app-surface-2)] border border-[var(--app-accent)]/40 rounded-xl text-[12px] font-bold text-[var(--app-accent)]">
            <Loader2 size={16} className="animate-spin" /> Se încarcă și se optimizează...
          </div>
        )}

        <div className="space-y-3">
          {/* Selector Categorie Segmented */}
          <div className="bg-[var(--app-surface-2)] p-1 rounded-xl border border-[var(--app-border)] grid grid-cols-3 gap-1">
            {[
              { key: "receptie", label: "Recepție" },
              { key: "reconstatare", label: "Reconstatare" },
              { key: "predare", label: "Predare" },
            ].map((cat) => {
              const isActive = cameraCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCameraCategory(cat.key)}
                  className={`py-2 px-1 rounded-lg text-[11.5px] font-black transition-all text-center ${
                    isActive
                      ? "bg-[var(--app-surface)] text-[var(--app-text-strong)] shadow-xs border border-[var(--app-border)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Declanșator principal Stil Studio */}
          <button
            type="button"
            onClick={() => { softHaptic(12); openLiveCamera(); }}
            className="w-full relative overflow-hidden group p-5 bg-gradient-to-b from-[var(--app-surface)] to-[var(--app-surface-2)] border-2 border-[var(--app-accent)]/40 hover:border-[var(--app-accent)] rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all"
            title="Deschide camera live"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--app-accent)]/15 border border-[var(--app-accent)]/30 flex items-center justify-center text-[var(--app-accent)] group-hover:scale-110 transition-transform">
              <Camera size={28} />
            </div>
            <div className="text-center">
              <span className="text-[16px] font-black text-[var(--app-text-strong)] block" style={{ fontFamily: "var(--app-font-display)" }}>
                Fotografiază
              </span>
              <span className="text-[11px] font-semibold text-[var(--app-muted)] capitalize">
                Secțiune activă: <strong className="text-[var(--app-accent)] font-black">{cameraCategory}</strong>
              </span>
            </div>
          </button>

          {/* Mai mult: Scan Acte / Galerie */}
          <div className="border-t border-[var(--app-border)] pt-1">
            <button
              type="button"
              onClick={() => setShowMoreActions((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-extrabold m-muted"
            >
              <span>Mai multe opțiuni (Scan Acte, Galerie)</span>
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

      {/* 5. VIZUALIZARE THUMBNAILS & CONFIRMARE FIȘIERE ATAȘATE PE DOSARUL SELECTAT */}
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
            <span className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase tracking-wider block">
              Fotografii ({displayPoze.length})
            </span>
            {displayPoze.length === 0 ? (
              <div className="text-[11px] text-[var(--app-muted)] italic bg-[var(--app-surface-2)] p-3 rounded-xl text-center border border-dashed border-[var(--app-border)]">
                Nicio fotografie atașată încă.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {displayPoze.map((p, idx) => {
                  const catLabel = categoryLabel(p.categoria);
                  return (
                    <div
                      key={p.path || p.id || idx}
                      onClick={() => setPreviewMediaIndex(idx)}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-muted)] group cursor-pointer shadow-2xs"
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
                        aria-label="Șterge fotografia"
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
          <div className="space-y-1.5 pt-2 border-t border-[var(--app-border)]">
            <span className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase tracking-wider block">
              Documente ({displayDocs.length})
            </span>
            {displayDocs.length === 0 ? (
              <div className="text-[11px] text-[var(--app-muted)] italic bg-[var(--app-surface-2)] p-3 rounded-xl text-center border border-dashed border-[var(--app-border)]">
                Niciun document PDF atașat.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                {displayDocs.map((doc, idx) => (
                  <div
                    key={doc.path || doc.id || idx}
                    className="flex items-center justify-between p-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[11.5px] font-semibold text-[var(--app-text)]"
                  >
                    <a
                      href={doc.url || doc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:underline text-[var(--app-text)]"
                    >
                      <FileText size={15} className="text-[var(--app-text)] shrink-0" />
                      <span className="truncate">{doc.name || doc.nume || `Document_${idx + 1}.pdf`}</span>
                    </a>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <a
                        href={doc.url || doc}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text)]"
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
                        aria-label="Șterge documentul"
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
              <FileText size={20} className="text-[var(--app-accent)]" />
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
                      aria-label="Șterge pagina"
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
                <Camera size={18} className="text-[var(--app-accent)]" />
                <span>Scanner live</span>
              </button>
              <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-extrabold cursor-pointer transition-colors">
                <ImageIcon size={18} className="text-[var(--app-accent)]" />
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
                className="flex-1 py-3 rounded-xl bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : "Salvează PDF pe Dosar"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Galerie fullscreen — swipe între poze */}
      {previewMediaIndex != null && displayPoze.length > 0 && (
        <PhotoLightbox
          items={displayPoze}
          startIndex={previewMediaIndex}
          onClose={() => setPreviewMediaIndex(null)}
        />
      )}

      {/* MODAL CAMERĂ LIVE STIL IPHONE/SAMSUNG (ZERO BUTOANE DE OK) */}
      {showLiveCamera && selectedClaim && (
        <LiveStreamCameraModal
          initialCategorie={cameraCategory}
          initialStream={liveCameraStream}
          onSavePhoto={handleMobilePhotoCapture}
          onClose={() => {
            setShowLiveCamera(false);
            setLiveCameraStream(null);
          }}
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
