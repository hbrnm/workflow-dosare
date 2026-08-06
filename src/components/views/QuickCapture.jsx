import React, { useState, useMemo } from "react";
import {
  X, ChevronLeft, Camera, Upload, FileText, Search, Loader2, Car, ImageIcon,
  Trash2, CheckCircle2, FolderOpen, Plus, Eye
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { getStatusDefinition, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR } from "../../constants/config";
import { uid, todayISO } from "../../utils/dateUtils";
import { refreshStorageUrls, uploadStorageItem } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { processScanImage, categoryLabel, PHOTO_CATEGORIES } from "../../utils/scanUtils";
import LiveStreamCameraModal from "../common/LiveStreamCameraModal";
import Pill from "../common/Pill";

export default function QuickCapture({ claims, onClose, onPatch, canEditFn, onNotify }) {
  const [step, setStep] = useState("pick");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [poze, setPoze] = useState([]);
  const [documente, setDocumente] = useState([]);
  const [pending, setPending] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [scanSession, setScanSession] = useState(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraCategory, setCameraCategory] = useState("receptie");

  const editableClaims = useMemo(() => claims.filter((c) => canEditFn(c)), [claims, canEditFn]);

  const recent = useMemo(
    () => [...editableClaims].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || "")).slice(0, 10),
    [editableClaims]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return editableClaims.filter((c) =>
      (c.numarDosar || "").toLowerCase().includes(q) ||
      (c.client || "").toLowerCase().includes(q) ||
      (c.numarInmatriculare || "").toLowerCase().includes(q) ||
      (c.vin || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [editableClaims, query, recent]);

  const selectClaim = async (c) => {
    setSelected(c);
    setStep("capture");
    setPoze(c.poze || []);
    setDocumente(c.documente || []);
    setLoadingMedia(true);
    const [p, d] = await Promise.all([
      refreshStorageUrls(c.poze || [], "poze-dosare", supabase),
      refreshStorageUrls(c.documente || [], "documente-dosare", supabase),
    ]);
    setPoze(p);
    setDocumente(d);
    setLoadingMedia(false);
  };

  const backToPick = () => {
    setStep("pick");
    setSelected(null);
    setPoze([]);
    setDocumente([]);
    setPending([]);
    setScanSession(null);
    setShowLiveCamera(false);
  };

  const handleFiles = async (fileList, kind, categoria = "generale") => {
    const files = Array.from(fileList || []);
    if (!files.length || !selected) return;

    const limit = kind === "poza" ? MAX_POZE_PER_DOSAR : MAX_DOCUMENTE_PER_DOSAR;
    let currentPoze = poze;
    let currentDocs = documente;
    let usedSlots = kind === "poza" ? currentPoze.length : currentDocs.length;

    const queue = [];
    for (const f of files) {
      if (usedSlots >= limit) {
        onNotify(`Ai atins limita de ${limit} ${kind === "poza" ? "poze" : "documente"} pentru acest dosar.`, "error");
        break;
      }
      queue.push({ tempId: uid(), file: f, kind, name: f.name, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null });
      usedSlots += 1;
    }
    if (!queue.length) return;

    setPending((p) => [...queue, ...p]);

    for (const item of queue) {
      try {
        const isImage = item.file.type.startsWith("image/");
        const toUpload = isImage ? await compressImage(item.file) : item.file;
        if (toUpload.size > MAX_UPLOAD_SIZE_BYTES) {
          throw new Error(`fișierul depășește ${MAX_UPLOAD_SIZE_MB}MB`);
        }
        const bucket = kind === "poza" ? "poze-dosare" : "documente-dosare";
        const folder = kind === "poza" ? "poze" : "documente";
        const uploaded = await uploadStorageItem(supabase, bucket, selected.id, toUpload, folder);

        if (kind === "poza") {
          const withCat = typeof uploaded === "object" ? { ...uploaded, categoria } : { url: uploaded, categoria };
          currentPoze = [withCat, ...currentPoze];
          setPoze(currentPoze);
          onPatch(selected.id, { poze: currentPoze });
        } else {
          currentDocs = [uploaded, ...currentDocs];
          setDocumente(currentDocs);
          onPatch(selected.id, { documente: currentDocs });
        }
      } catch (err) {
        onNotify(`Eroare la „${item.name}": ${err.message || err}`, "error");
      } finally {
        setPending((p) => p.filter((x) => x.tempId !== item.tempId));
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    }
  };

  const handleAddScanPages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || !selected) return;
    try {
      const newPages = [];
      for (const file of files) {
        newPages.push(await processScanImage(file));
      }
      if (scanSession) {
        setScanSession((prev) => ({ ...prev, pages: [...prev.pages, ...newPages] }));
      } else {
        setScanSession({
          pages: newPages,
          fileName: `Scan_${selected.numarInmatriculare || selected.numarDosar || "Dosar"}_${todayISO()}`,
          saveAsPdf: true,
          saveAsPhotos: false,
        });
      }
    } catch (err) {
      onNotify(err.message, "error");
    }
  };

  const handleSaveMultiPageScan = async () => {
    if (!scanSession || scanSession.pages.length === 0 || !selected) return;
    if (!scanSession.saveAsPdf && !scanSession.saveAsPhotos) {
      onNotify("Te rog selectează cel puțin o opțiune de salvare (PDF sau Poze).", "error");
      return;
    }

    setUploadingScan(true);
    try {
      let currentDocs = documente;
      let currentPoze = poze;

      if (scanSession.saveAsPdf) {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        scanSession.pages.forEach((dataUrl, idx) => {
          if (idx > 0) pdf.addPage();
          pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH);
        });

        const name = (scanSession.fileName || "scan").trim().replace(/\.pdf$/i, "");
        const pdfFile = new File([pdf.output("blob")], `${name}.pdf`, { type: "application/pdf" });
        const uploaded = await uploadStorageItem(supabase, "documente-dosare", selected.id, pdfFile, "documente");
        currentDocs = [uploaded, ...currentDocs];
        setDocumente(currentDocs);
        onPatch(selected.id, { documente: currentDocs });
      }

      if (scanSession.saveAsPhotos) {
        const baseName = (scanSession.fileName || "scan").trim().replace(/\.pdf$/i, "");
        for (let i = 0; i < scanSession.pages.length; i++) {
          const res = await fetch(scanSession.pages[i]);
          const blob = await res.blob();
          const photoFile = new File([blob], `${baseName}_pagina_${i + 1}.jpg`, { type: "image/jpeg" });
          const uploaded = await uploadStorageItem(supabase, "poze-dosare", selected.id, photoFile, "poze");
          currentPoze = [uploaded, ...currentPoze];
        }
        setPoze(currentPoze);
        onPatch(selected.id, { poze: currentPoze });
      }

      onNotify("Document scanat și atașat cu succes!", "success");
      setScanSession(null);
    } catch (err) {
      onNotify(err.message, "error");
    } finally {
      setUploadingScan(false);
    }
  };

  const removePoza = async (poza, idx) => {
    if (poza?.path) {
      try { await supabase.storage.from("poze-dosare").remove([poza.path]); } catch (_) { /* ignore */ }
    }
    const next = poze.filter((_, i) => i !== idx);
    setPoze(next);
    onPatch(selected.id, { poze: next });
  };

  const removeDoc = async (doc, idx) => {
    if (doc?.path) {
      try { await supabase.storage.from("documente-dosare").remove([doc.path]); } catch (_) { /* ignore */ }
    }
    const next = documente.filter((_, i) => i !== idx);
    setDocumente(next);
    onPatch(selected.id, { documente: next });
  };

  const openLiveCamera = (cat) => {
    setCameraCategory(cat);
    setShowLiveCamera(true);
  };

  const pendingPoze = pending.filter((p) => p.kind === "poza");
  const pendingDocs = pending.filter((p) => p.kind === "document");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-5 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full h-[100dvh] sm:h-auto max-w-2xl rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-[#DAD4C6] flex flex-col max-h-[100dvh] sm:max-h-[92vh] overflow-hidden relative">

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#23282E] text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "capture" ? (
              <button onClick={backToPick} className="p-1 -ml-1 rounded-md hover:bg-white/10 shrink-0" title="Schimbă dosarul">
                <ChevronLeft size={20} />
              </button>
            ) : (
              <Camera size={18} className="text-[#C98A2B] shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-[13.5px] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {step === "pick" ? "Poze & documente rapid" : (selected?.numarDosar || "(fără nr.)")}
              </div>
              {step === "capture" && selected && (
                <div className="text-[11px] text-white/60 truncate">{selected.client || "Client neintrodus"} · {selected.numarInmatriculare || "—"}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <X size={20} />
          </button>
        </div>

        {step === "pick" ? (
          <>
            <div className="px-3 py-2.5 bg-white border-b border-[#DAD4C6] shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8375]" />
                <input
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#DAD4C6] text-[14px] bg-[#FAF8F5] focus:bg-white"
                  placeholder="Caută nr. dosar, client, nr. auto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-1 pb-1.5">
                {query.trim() ? `${results.length} rezultat(e)` : "Dosare recente"}
              </div>
              <div className="space-y-1.5">
                {results.map((c) => {
                  const s = getStatusDefinition(c.status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectClaim(c)}
                      className="w-full flex items-center gap-2.5 bg-white border border-[#DAD4C6] rounded-lg px-3 py-2.5 text-left hover:border-[#C98A2B] hover:shadow-sm transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#DAD4C6] flex items-center justify-center shrink-0 text-[#8A8375]">
                        <Car size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[13px] text-[#23282E] truncate">{c.numarDosar || "(fără nr.)"}</span>
                          <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill>
                        </div>
                        <div className="text-[11.5px] text-[#6B6558] truncate">{c.client || "Client neintrodus"} · {c.numarInmatriculare || "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-[10px]">
                        <span className="text-[#8A8375] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
                        {(c.poze?.length > 0) && (
                          <span className="flex items-center gap-0.5 text-[#3B5166] font-bold"><ImageIcon size={10} /> {c.poze.length}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {results.length === 0 && (
                  <div className="text-center py-10 text-[12.5px] text-[#8A8375] italic">Niciun dosar găsit.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
            {/* Categorii foto + cameră live */}
            <div className="space-y-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375]">Fotografii pe categorii</div>
              <div className="grid grid-cols-3 gap-2">
                {PHOTO_CATEGORIES.map(({ key, label, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openLiveCamera(key)}
                    className={`flex flex-col items-center justify-center gap-1 ${color} text-white rounded-xl py-3 px-2 hover:opacity-90 active:scale-95 transition-all shadow-sm`}
                  >
                    <Camera size={20} />
                    <span className="text-[11px] font-extrabold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center justify-center gap-1 border border-[#DAD4C6] rounded-lg py-2.5 px-1 bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer text-center">
                <Upload size={16} className="text-[#3B5166]" />
                <span className="text-[11px] font-bold text-[#3B5166]">Din galerie</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, "poza", "generale"); e.target.value = ""; }} />
              </label>

              <label className="flex flex-col items-center justify-center gap-1 border border-[#C98A2B]/40 rounded-lg py-2.5 px-1 bg-[#FAF8F5] hover:bg-[#F7EAD3]/50 transition-colors cursor-pointer text-center">
                <FileText size={16} className="text-[#C98A2B]" />
                <span className="text-[11px] font-bold text-[#7A5316]">Scan Acte</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleAddScanPages(e.target.files); e.target.value = ""; }} />
              </label>

              <label className="flex flex-col items-center justify-center gap-1 border border-[#DAD4C6] rounded-lg py-2.5 px-1 bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer text-center">
                <FolderOpen size={16} className="text-[#3B5166]" />
                <span className="text-[11px] font-bold text-[#3B5166]">PDF / Doc</span>
                <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const images = files.filter((f) => f.type.startsWith("image/"));
                  const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
                  if (images.length > 0) handleFiles(images, "poza", "generale");
                  if (pdfs.length > 0) handleFiles(pdfs, "document");
                  e.target.value = "";
                }} />
              </label>
            </div>

            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-0.5 pb-1.5 flex items-center gap-1.5">
                <ImageIcon size={12} /> Poze ({poze.length + pendingPoze.length})
                {loadingMedia && <Loader2 size={11} className="animate-spin" />}
              </div>
              {poze.length === 0 && pendingPoze.length === 0 ? (
                <div className="text-[11.5px] text-[#8A8375] italic py-4 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                  Nicio fotografie încă — folosește categoriile de mai sus.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {pendingPoze.map((p) => (
                    <div key={p.tempId} className="relative rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                      {p.previewUrl && <img src={p.previewUrl} alt="" className="w-full h-full object-cover opacity-50" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    </div>
                  ))}
                  {poze.map((p, idx) => {
                    const catLabel = categoryLabel(p.categoria);
                    return (
                      <div key={p.id || idx} className="relative group rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                        <button type="button" onClick={() => setPreviewMedia(p.url || p)} className="block w-full h-full">
                          <img src={p.url || p} alt={p.nume || ""} className="w-full h-full object-cover" />
                        </button>
                        {catLabel && (
                          <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase font-mono z-10">
                            {catLabel}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                          <Eye size={16} />
                        </div>
                        <button type="button" onClick={() => removePoza(p, idx)} className="absolute top-1 right-1 bg-black/70 hover:bg-[#B23A2E] text-white rounded p-1 z-10">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-0.5 pb-1.5 flex items-center gap-1.5">
                <FileText size={12} /> Documente ({documente.length + pendingDocs.length})
              </div>
              <div className="space-y-1.5">
                {pendingDocs.map((d) => (
                  <div key={d.tempId} className="flex items-center gap-2 bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                    <Loader2 size={13} className="animate-spin text-[#8A8375] shrink-0" />
                    <span className="truncate flex-1 text-[#8A8375]">{d.name}</span>
                  </div>
                ))}
                {documente.map((d, idx) => (
                  <div key={d.id || idx} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={14} className="text-[#3B5166] shrink-0" />
                      <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] font-semibold hover:underline truncate flex-1">{d.nume || d.name || `Document_${idx + 1}`}</a>
                    </div>
                    <button type="button" onClick={() => removeDoc(d, idx)} className="text-[#B23A2E] hover:opacity-70 ml-2 p-1"><Trash2 size={13} /></button>
                  </div>
                ))}
                {documente.length === 0 && pendingDocs.length === 0 && (
                  <div className="text-[11.5px] text-[#8A8375] italic py-3 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                    Niciun document atașat.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {scanSession && (
          <div className="absolute inset-0 bg-[#23282E]/95 z-50 flex flex-col p-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="font-bold text-[13px] flex items-center gap-1.5 text-[#C98A2B]">
                <FileText size={16} /> Scanare document ({scanSession.pages.length} pagini) — auto-crop
              </h3>
              <button type="button" onClick={() => setScanSession(null)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {scanSession.pages.map((pageDataUrl, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/20 aspect-[3/4] bg-white/5">
                    <img src={pageDataUrl} alt={`Pagina ${idx + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold">Pag. {idx + 1}</div>
                    <button
                      type="button"
                      onClick={() => setScanSession((prev) => ({ ...prev, pages: prev.pages.filter((_, i) => i !== idx) }))}
                      className="absolute top-1 right-1 bg-[#B23A2E] text-white rounded p-1 hover:opacity-80"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer aspect-[3/4] bg-white/5 transition-all text-center p-2 hover:bg-white/10">
                  <Plus size={20} className="text-[#C98A2B]" />
                  <span className="text-[11px] font-semibold text-white/80">Adaugă pagină</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleAddScanPages(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex-1 w-full">
                  <label className="block text-[10.5px] text-white/60 font-semibold mb-1">Nume fișier (fără extensie)</label>
                  <input
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5 text-[13px] text-white focus:outline-hidden placeholder:text-white/30"
                    placeholder="ex: Declaratie_accident"
                    value={scanSession.fileName}
                    onChange={(e) => setScanSession((prev) => ({ ...prev, fileName: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
                    <input type="checkbox" checked={scanSession.saveAsPdf} onChange={(e) => setScanSession((prev) => ({ ...prev, saveAsPdf: e.target.checked }))} className="rounded border-white/20 bg-white/5 text-[#C98A2B]" />
                    <span>Salvează ca PDF</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
                    <input type="checkbox" checked={scanSession.saveAsPhotos} onChange={(e) => setScanSession((prev) => ({ ...prev, saveAsPhotos: e.target.checked }))} className="rounded border-white/20 bg-white/5 text-[#C98A2B]" />
                    <span>Salvează ca poze</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setScanSession(null)} className="px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-[12.5px] font-semibold text-white/80">Anulează</button>
                <button
                  type="button"
                  onClick={handleSaveMultiPageScan}
                  disabled={scanSession.pages.length === 0 || uploadingScan}
                  className="flex items-center gap-1 px-5 py-1.5 rounded-lg bg-[#C98A2B] text-white text-[12.5px] font-bold hover:bg-[#B37A22] disabled:opacity-50"
                >
                  {uploadingScan ? <><Loader2 size={13} className="animate-spin" /> Se salvează...</> : <><CheckCircle2 size={13} /> Finalizează ({scanSession.pages.length} pag.)</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {previewMedia && (
          <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-xs" onClick={() => setPreviewMedia(null)}>
            <button onClick={() => setPreviewMedia(null)} className="absolute top-4 right-4 text-white bg-black/60 hover:bg-[#B23A2E] p-2.5 rounded-full transition-colors shadow-lg z-10">
              <X size={24} />
            </button>
            <img src={previewMedia} alt="Previzualizare" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {showLiveCamera && selected && (
          <LiveStreamCameraModal
            initialCategorie={cameraCategory}
            onSavePhoto={(files, cat) => handleFiles(files, "poza", cat)}
            onClose={() => setShowLiveCamera(false)}
          />
        )}

        {step === "capture" && !scanSession && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#DAD4C6] bg-white shrink-0">
            <button type="button" onClick={backToPick} className="px-3 py-1.5 rounded border border-[#C7C0B0] text-[12px] font-semibold text-[#4A443A] hover:bg-[#EFEAE1]">Alt dosar</button>
            <button type="button" onClick={onClose} className="flex items-center gap-1 px-4 py-1.5 rounded bg-[#3E6B45] text-white text-[12.5px] font-bold hover:bg-[#345A3B]">
              <CheckCircle2 size={14} /> Am terminat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
