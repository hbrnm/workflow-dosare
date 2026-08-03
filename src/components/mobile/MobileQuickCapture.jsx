import React, { useState, useMemo } from "react";
import {
  Camera, Upload, FileText, Search, Loader2, Car, ImageIcon,
  CheckCircle2, FolderOpen, Plus, ArrowRight, ShieldCheck, X, Trash2,
  Eye, FileCheck, RefreshCw, Check
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "../../constants/config";
import { uploadStorageItem, refreshStorageUrls } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { todayISO } from "../../utils/dateUtils";

// Function to process scanned document page for enhanced contrast
function processScanImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const MAX_DIM = 1600;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            v = v > 130 ? Math.min(255, v * 1.2) : Math.max(0, v * 0.8);
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
          }
          ctx.putImageData(imgData, 0, 0);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.80);
          resolve(dataUrl);
        } catch (err) {
          reject(new Error("Eroare la procesarea imaginii."));
        }
      };
      img.onerror = () => reject(new Error("Eroare la încărcarea imaginii."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Eroare la citirea imaginii."));
    reader.readAsDataURL(file);
  });
}

export default function MobileQuickCapture({ claims, onOpen, onPatch, canEditFn, onNotify }) {
  const [query, setQuery] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanSession, setScanSession] = useState(null); // { pages: [dataUrl], fileName }
  const [previewMedia, setPreviewMedia] = useState(null); // URL imagine previzualizată la marire

  const editableClaims = useMemo(() => claims.filter((c) => canEditFn(c)), [claims, canEditFn]);

  // Lista celor mai recente dosare
  const recentClaims = useMemo(
    () => [...editableClaims].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || "")).slice(0, 8),
    [editableClaims]
  );

  // Rezultate căutare
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recentClaims;
    return editableClaims.filter((c) =>
      (c.numarDosar || "").toLowerCase().includes(q) ||
      (c.client || "").toLowerCase().includes(q) ||
      (c.numarInmatriculare || "").toLowerCase().includes(q) ||
      (c.vin || "").toLowerCase().includes(q)
    ).slice(0, 25);
  }, [editableClaims, query, recentClaims]);

  // Dosarul selectat curent (up-to-date cu ultimele poze/documente)
  const selectedClaim = useMemo(() => {
    if (!selectedClaimId) return null;
    return claims.find((c) => c.id === selectedClaimId) || null;
  }, [claims, selectedClaimId]);

  // Fotografiere cu aparatul foto al telefonului
  const handleMobilePhotoCapture = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar din listă.", "error");
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const noiPoze = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify(`Fișierul ${file.name} depășește limita de ${MAX_UPLOAD_SIZE_MB}MB.`, "error");
          continue;
        }
        const compressed = await compressImage(file);
        const uploaded = await uploadStorageItem(supabase, "poze-dosare", selectedClaim.id, compressed, "poze");
        noiPoze.push(uploaded);
      }

      if (noiPoze.length > 0) {
        const currentPoze = selectedClaim.poze || [];
        const updatedPoze = [...noiPoze, ...currentPoze];
        await onPatch(selectedClaim.id, { poze: updatedPoze }, { canEditFn });
        onNotify(`📸 ${noiPoze.length} poze salvate pe dosarul ${selectedClaim.numarInmatriculare}!`, "success");
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
        const currentDocs = selectedClaim.documente || [];
        const updatedDocs = [...noiDocs, ...currentDocs];
        await onPatch(selectedClaim.id, { documente: updatedDocs }, { canEditFn });
        onNotify(`📄 ${noiDocs.length} document(e) atașat(e) pe dosarul ${selectedClaim.numarInmatriculare}!`, "success");
      }
    } catch (err) {
      onNotify("Eroare la încărcare document: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Scanare pagini noi (sau adăugare pagini la sesiunea de scanare)
  const handleAddScanPages = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar.", "error");
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const newPages = [];
      for (const file of files) {
        const dataUrl = await processScanImage(file);
        newPages.push(dataUrl);
      }

      if (scanSession) {
        setScanSession((prev) => ({
          ...prev,
          pages: [...prev.pages, ...newPages],
        }));
      } else {
        const defaultName = `Scan_${selectedClaim.numarInmatriculare || "Dosar"}_${todayISO()}`;
        setScanSession({
          fileName: defaultName,
          pages: newPages,
        });
      }
    } catch (err) {
      onNotify("Eroare scanare document: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Salvare sesiunii de scanare PDF
  const handleSaveScanPDF = async () => {
    if (!scanSession || !scanSession.pages.length || !selectedClaim) return;
    setUploading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      scanSession.pages.forEach((dataUrl, idx) => {
        if (idx > 0) pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, pdfH);
      });

      const pdfBlob = pdf.output("blob");
      const fileName = `${scanSession.fileName.trim() || "Document_Scanat"}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      const uploadedDoc = await uploadStorageItem(supabase, "documente-dosare", selectedClaim.id, pdfFile, "documente");
      const currentDocs = selectedClaim.documente || [];
      await onPatch(selectedClaim.id, { documente: [uploadedDoc, ...currentDocs] }, { canEditFn });

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

      const updatedPoze = currentPoze.filter((_, i) => i !== idx);
      await onPatch(selectedClaim.id, { poze: updatedPoze }, { canEditFn });
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

      const updatedDocs = currentDocs.filter((_, i) => i !== idx);
      await onPatch(selectedClaim.id, { documente: updatedDocs }, { canEditFn });
      onNotify("Documentul a fost șters din dosar și din stocare.", "info");
    } catch (err) {
      onNotify("Eroare la ștergerea documentului: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3.5 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      
      {/* 1. HEADER MODUL: FOTO AUTO & DOCUMENTE DOSAR */}
      <div className="bg-[#1C2127] text-white p-3.5 rounded-2xl shadow-md space-y-1">
        <div className="flex items-center gap-2">
          <Camera className="text-[#C98A2B]" size={20} />
          <h2 className="font-extrabold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Foto Auto &amp; Documente Dosar
          </h2>
        </div>
        <p className="text-[11px] text-[#A69F91]">
          Efectuează poze cu telefonul și scanează acte pentru atașare directă la dosar.
        </p>
      </div>

      {/* 2. SELECTARE & CĂUTARE DOSAR */}
      <div className="bg-white rounded-2xl border border-[#DAD4C6] p-3.5 shadow-sm space-y-3">
        {selectedClaim && (
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-[#3E6B45] font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check size={11} /> Selectat: {selectedClaim.numarDosar || selectedClaim.numarInmatriculare}
            </span>
          </div>
        )}

        {/* Căutare tactilă */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-[#8A8375]" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 border border-[#DAD4C6] rounded-xl text-[13px] font-bold bg-[#FAF8F5] focus:bg-white focus:outline-hidden"
            placeholder="Caută nr. dosar sau nr. auto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-[#8A8375]">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Listă cu afișare: Stânga (Număr Dosar) | Dreapta (Număr Înmatriculare) */}
        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-[#8A8375] italic">Niciun dosar găsit.</div>
          ) : (
            searchResults.map((c) => {
              const isSelected = selectedClaimId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClaimId((prev) => (prev === c.id ? null : c.id))}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#2C4160] text-white border-[#2C4160] shadow-sm"
                      : "bg-[#FAF8F5] text-[#23282E] border-[#DAD4C6] hover:bg-gray-100"
                  }`}
                >
                  {/* STÂNGA: NUMĂR DOSAR + MARCA MODEL (O SINGURĂ LINIE FLUIDĂ) */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`shrink-0 whitespace-nowrap font-mono text-[11.5px] font-extrabold px-2 py-0.5 rounded-lg border ${
                      isSelected ? "bg-white/20 border-white/30 text-white" : "bg-white border-[#DAD4C6] text-[#3B5166]"
                    }`}>
                      Dosar: {c.numarDosar || "Fără nr."}
                    </span>
                    <span className={`text-[11px] font-semibold truncate ${isSelected ? "text-white/80" : "text-[#6B6558]"}`}>
                      {c.marcaModel || ""}
                    </span>
                  </div>

                  {/* DREAPTA: NUMĂR ÎNMATRICULARE (O SINGURĂ LINIE FLUIDĂ) */}
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <span className={`font-mono font-extrabold text-[12.5px] uppercase ${isSelected ? "text-white" : "text-[#23282E]"}`}>
                      {c.numarInmatriculare || "FĂRĂ NR."}
                    </span>
                    {isSelected && <CheckCircle2 size={16} className="text-[#F3D9A8]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. BARA DE BUTOANE EXCLUSIV CU ICONIȚE (FĂRĂ TEXT "2. ACȚIUNE TEREN") */}
      <div className={`bg-white rounded-2xl border p-3.5 shadow-sm space-y-3 transition-opacity ${selectedClaim ? "border-[#DAD4C6]" : "border-[#DAD4C6]/60 opacity-60 pointer-events-none"}`}>
        
        {uploading && (
          <div className="flex items-center justify-center gap-2 p-2 bg-[#FAF8F5] border border-[#C98A2B]/40 rounded-xl text-[12px] font-bold text-[#C98A2B]">
            <Loader2 size={16} className="animate-spin" /> Se încarcă...
          </div>
        )}

        {/* BUTOANE DOAR CU ICONIȚE MARI TACTILE */}
        <div className="grid grid-cols-4 gap-2.5">
          
          {/* BUTON 1: CAMERA FOTO (DOAR ICONIȚĂ) */}
          <label
            className="flex flex-col items-center justify-center p-3.5 bg-[#C98A2B] text-white rounded-2xl cursor-pointer hover:bg-[#B37A22] active:scale-95 transition-all shadow-md"
            title="Fă Poză cu Aparatul Foto"
          >
            <Camera size={26} />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleMobilePhotoCapture(e.target.files)}
            />
          </label>

          {/* BUTON 2: SCANNER DOCUMENTE (DOAR ICONIȚĂ) */}
          <label
            className="flex flex-col items-center justify-center p-3.5 bg-[#3B5166] text-white rounded-2xl cursor-pointer hover:bg-[#2C4160] active:scale-95 transition-all shadow-md"
            title="Scanează Document Acte"
          >
            <FileText size={26} />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleAddScanPages(e.target.files)}
            />
          </label>

          {/* BUTON 3: GALERIE POZE (DOAR ICONIȚĂ) */}
          <label
            className="flex flex-col items-center justify-center p-3.5 bg-[#FAF8F5] border-2 border-[#DAD4C6] text-[#3B5166] rounded-2xl cursor-pointer hover:bg-gray-100 active:scale-95 transition-all shadow-2xs"
            title="Alege Poze din Galerie"
          >
            <ImageIcon size={24} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleMobilePhotoCapture(e.target.files)}
            />
          </label>

          {/* BUTON 4: FIȘIERE PDF (DOAR ICONIȚĂ) */}
          <label
            className="flex flex-col items-center justify-center p-3.5 bg-[#FAF8F5] border-2 border-[#DAD4C6] text-[#3B5166] rounded-2xl cursor-pointer hover:bg-gray-100 active:scale-95 transition-all shadow-2xs"
            title="Încarcă PDF din Telefon"
          >
            <FolderOpen size={24} />
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleMobileDocUpload(e.target.files)}
            />
          </label>
        </div>
      </div>

      {/* 4. VIZUALIZARE THUMBNAILS & CONFIRMARE FIȘIERE ATAȘATE PE DOSARUL SELECTAT (CU POSIBILITATE DE ȘTERGERE) */}
      {selectedClaim && (
        <div className="bg-white rounded-2xl border border-[#DAD4C6] p-3.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2">
            <h3 className="font-extrabold text-[13px] text-[#23282E] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <FileCheck size={16} className="text-[#3E6B45]" /> Fișiere Atașate pe {selectedClaim.numarInmatriculare}
            </h3>
            <span className="text-[10.5px] font-bold text-[#8A8375] font-mono">
              {(selectedClaim.poze?.length || 0)} poze · {(selectedClaim.documente?.length || 0)} doc
            </span>
          </div>

          {/* GALERIE THUMBNAILS POZE CU BUTON DE ȘTERGERE */}
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider block">
              📸 Fotografii Daună / Vehicul ({selectedClaim.poze?.length || 0})
            </span>
            {(!selectedClaim.poze || selectedClaim.poze.length === 0) ? (
              <div className="text-[11px] text-[#8A8375] italic bg-[#FAF8F5] p-3 rounded-xl text-center border border-dashed border-[#DAD4C6]">
                Nicio fotografie atașată încă.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {selectedClaim.poze.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewMedia(p.url || p)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-[#DAD4C6] bg-gray-100 group cursor-pointer shadow-2xs"
                  >
                    <img src={p.url || p} alt={`Poză ${idx + 1}`} className="w-full h-full object-cover" />
                    
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
                ))}
              </div>
            )}
          </div>

          {/* LISTĂ DOCUMENTE ATAȘATE CU BUTON DE ȘTERGERE */}
          <div className="space-y-1.5 pt-2 border-t border-[#EFEAE1]">
            <span className="text-[10.5px] font-bold text-[#6B6558] uppercase tracking-wider block">
              📄 Documente Acte ({selectedClaim.documente?.length || 0})
            </span>
            {(!selectedClaim.documente || selectedClaim.documente.length === 0) ? (
              <div className="text-[11px] text-[#8A8375] italic bg-[#FAF8F5] p-3 rounded-xl text-center border border-dashed border-[#DAD4C6]">
                Niciun document PDF atașat.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
                {selectedClaim.documente.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] text-[11.5px] font-semibold text-[#23282E]"
                  >
                    <a
                      href={doc.url || doc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 hover:underline text-[#23282E]"
                    >
                      <FileText size={15} className="text-[#3B5166] shrink-0" />
                      <span className="truncate">{doc.name || `Document_${idx + 1}.pdf`}</span>
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
            
            {/* Buton adăugare altă pagină */}
            <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[13px] font-extrabold cursor-pointer transition-colors">
              <Camera size={18} className="text-[#C98A2B]" />
              <span>Adaugă încă o pagină</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handleAddScanPages(e.target.files)}
              />
            </label>

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

      {/* OVERLAY PREVIZUALIZARE MARITĂ IMAGINE */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <button className="absolute top-4 right-4 text-white bg-white/20 p-2 rounded-full">
            <X size={24} />
          </button>
          <img src={previewMedia} alt="Previzualizare" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
        </div>
      )}

    </div>
  );
}
