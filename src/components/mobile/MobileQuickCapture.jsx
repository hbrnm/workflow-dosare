import React, { useState, useMemo } from "react";
import {
  Camera, Upload, FileText, Search, Loader2, Car, ImageIcon,
  CheckCircle2, FolderOpen, Plus, ArrowRight, ShieldCheck, X, Trash2
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "../../constants/config";
import { uploadStorageItem, refreshStorageUrls } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { todayISO, nowISO } from "../../utils/dateUtils";

// Procesare imagine scanată pentru contrast sporit (aspect scanat clar)
function processScanImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const MAX_DIM = 1500;
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

          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
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
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanSession, setScanSession] = useState(null); // { pages: [dataUrl], fileName, saveAsPdf, saveAsPhotos }

  const editableClaims = useMemo(() => claims.filter((c) => canEditFn(c)), [claims, canEditFn]);

  // Lista celor mai recente dosare editeabile
  const recentClaims = useMemo(
    () => [...editableClaims].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || "")).slice(0, 8),
    [editableClaims]
  );

  // Rezultate căutare rapidă
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recentClaims;
    return editableClaims.filter((c) =>
      (c.numarDosar || "").toLowerCase().includes(q) ||
      (c.client || "").toLowerCase().includes(q) ||
      (c.numarInmatriculare || "").toLowerCase().includes(q) ||
      (c.vin || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [editableClaims, query, recentClaims]);

  // Încărcare fotografii direct din camera telefonului
  const handleMobilePhotoCapture = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar din listă sau caută numărul auto.", "error");
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
        onNotify(`📸 ${noiPoze.length} fotografie/ii salvate cu succes pe dosarul ${selectedClaim.numarInmatriculare}!`, "success");
      }
    } catch (err) {
      onNotify("Eroare la încărcare: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Încărcare document PDF din telefon
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
      onNotify("Eroare la încărcarea documentului: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Începere sesiune scanare pagini multiple de pe mobil
  const handleStartScanSession = async (fileList) => {
    if (!selectedClaim) {
      onNotify("Selectează mai întâi un dosar pentru scanare.", "error");
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const pages = [];
      for (const file of files) {
        const dataUrl = await processScanImage(file);
        pages.push(dataUrl);
      }
      const defaultName = `Scan_${selectedClaim.numarInmatriculare || "Dosar"}_${todayISO()}`;
      setScanSession({
        fileName: defaultName,
        pages,
        saveAsPdf: true,
        saveAsPhotos: false,
      });
    } catch (err) {
      onNotify("Eroare scanare: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Finalizare scanare și salvare pe dosar
  const handleSaveScan = async () => {
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
      onNotify(`📄 Documentul scanat „${fileName}” a fost salvat pe dosarul ${selectedClaim.numarInmatriculare}!`, "success");
    } catch (err) {
      onNotify("Eroare salvare document scanat: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      
      {/* HEADER MOBIL CAPTURĂ */}
      <div className="bg-[#1C2127] text-white p-4 rounded-2xl shadow-md space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="text-[#C98A2B]" size={20} />
            <h2 className="font-extrabold text-[15px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Captură &amp; Scanare Teren
            </h2>
          </div>
          <span className="text-[10.5px] bg-[#C98A2B]/20 text-[#F3D9A8] px-2.5 py-0.5 rounded-full border border-[#C98A2B]/40 font-bold">
            Mod Mobil
          </span>
        </div>
        <p className="text-[11.5px] text-[#A69F91]">
          Selectează mașina și fă poze direct cu camera telefonului sau scanează acte.
        </p>
      </div>

      {/* PASUL 1: SELECTARE DOSAR / CĂUTARE MOBILĂ */}
      <div className="bg-white rounded-2xl border border-[#DAD4C6] p-3.5 shadow-sm space-y-3">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6558] flex items-center justify-between">
          <span>1. Alege Dosarul 🚗</span>
          {selectedClaim && (
            <span className="text-[10px] text-[#3E6B45] font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">
              Selectat: {selectedClaim.numarInmatriculare}
            </span>
          )}
        </div>

        {/* Căutare tactilă */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-[#8A8375]" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 border border-[#DAD4C6] rounded-xl text-[13px] font-bold bg-[#FAF8F5] focus:bg-white focus:outline-hidden"
            placeholder="Caută nr. auto (ex: B123ABC) sau dosar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-[#8A8375]">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Listă orizontală / verticală rapidă de selecție dosar */}
        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-[#8A8375] italic">Niciun dosar găsit.</div>
          ) : (
            searchResults.map((c) => {
              const isSelected = selectedClaim?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClaim(c)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#2C4160] text-white border-[#2C4160] shadow-sm"
                      : "bg-[#FAF8F5] text-[#23282E] border-[#DAD4C6] hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`font-mono font-extrabold text-[12.5px] uppercase ${isSelected ? "text-white" : "text-[#23282E]"}`}>
                      {c.numarInmatriculare || "—"}
                    </span>
                    <span className="text-[11px] opacity-75 truncate">{c.marcaModel || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10.5px]">
                    <span className={`font-mono px-1.5 py-0.5 rounded border ${isSelected ? "bg-white/10 border-white/20 text-white" : "bg-white border-[#DAD4C6] text-[#6B6558]"}`}>
                      {c.numarDosar || "Fără nr."}
                    </span>
                    {isSelected && <CheckCircle2 size={15} className="text-[#F3D9A8]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PASUL 2: BUTOANE MARI DE CAPTURĂ (ACTIVABIL CÂND E SELECTAT DOSARUL) */}
      <div className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition-opacity ${selectedClaim ? "border-[#DAD4C6]" : "border-[#DAD4C6]/60 opacity-60 pointer-events-none"}`}>
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B6558] flex items-center justify-between">
          <span>2. Acțiune Teren 📸</span>
          {uploading && <span className="flex items-center gap-1 text-[#C98A2B] text-[11px] font-bold"><Loader2 size={13} className="animate-spin" /> Se încarcă...</span>}
        </div>

        {!selectedClaim && (
          <div className="p-3 bg-[#FAF8F5] border border-dashed border-[#DAD4C6] rounded-xl text-center text-[11.5px] text-[#8A8375] font-medium">
            👈 Selectează mai întâi un dosar de sus pentru a activa aparatul foto.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* BUTON 1: FĂ POZĂ (CAMERA) */}
          <label className="flex flex-col items-center justify-center p-4 bg-[#FBF3E6] border-2 border-dashed border-[#C98A2B] rounded-2xl cursor-pointer hover:bg-[#F3D9A8]/40 active:scale-98 transition-all text-center space-y-1.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#C98A2B] text-white flex items-center justify-center shadow-md">
              <Camera size={24} />
            </div>
            <span className="font-extrabold text-[13.5px] text-[#7A5316]">Fă Poză cu Aparatul Foto</span>
            <span className="text-[10.5px] text-[#7A5316]/80 font-medium">Fotografiază daune/piese de pe telefon</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleMobilePhotoCapture(e.target.files)}
            />
          </label>

          {/* BUTON 2: SCANEAZĂ DOCUMENT (SCANNER) */}
          <label className="flex flex-col items-center justify-center p-4 bg-[#EEF1F3] border-2 border-dashed border-[#3B5166] rounded-2xl cursor-pointer hover:bg-gray-200 active:scale-98 transition-all text-center space-y-1.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-[#3B5166] text-white flex items-center justify-center shadow-md">
              <FileText size={24} />
            </div>
            <span className="font-extrabold text-[13.5px] text-[#3B5166]">Scanează Document Acte</span>
            <span className="text-[10.5px] text-[#3B5166]/80 font-medium">Captură pagini multiple (contrast clar)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleStartScanSession(e.target.files)}
            />
          </label>
        </div>

        {/* Opțiune secundară: Încarcă din galerie / PDF existent */}
        <div className="pt-2 flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[11.5px] font-bold text-[#6B6558] cursor-pointer hover:bg-gray-100">
            <ImageIcon size={14} /> Poze din Galerie
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleMobilePhotoCapture(e.target.files)}
            />
          </label>
          <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[11.5px] font-bold text-[#6B6558] cursor-pointer hover:bg-gray-100">
            <FolderOpen size={14} /> PDF din Telefon
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

      {/* OVERLAY SCANNER PAGINI MULTIPLE */}
      {scanSession && (
        <div className="fixed inset-0 z-50 bg-[#1C2127]/98 p-4 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-extrabold text-[14px] text-[#C98A2B] flex items-center gap-1.5">
              <FileText size={18} /> Previzualizare Scanare ({scanSession.pages.length} pagini)
            </h3>
            <button onClick={() => setScanSession(null)} className="text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {scanSession.pages.map((pUrl, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-white/20 aspect-[3/4] bg-white/5">
                  <img src={pUrl} alt={`Pagina ${idx + 1}`} className="w-full h-full object-contain" />
                  <span className="absolute top-1 left-1 bg-black/70 px-2 py-0.5 rounded text-[10px] font-bold">
                    Pag. {idx + 1}
                  </span>
                  <button
                    onClick={() => setScanSession((prev) => ({ ...prev, pages: prev.pages.filter((_, i) => i !== idx) }))}
                    className="absolute top-1 right-1 bg-[#B23A2E] text-white p-1 rounded-md"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 space-y-3">
            <div>
              <label className="block text-[11px] text-white/70 mb-1 font-bold">Nume Fișier Document</label>
              <input
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[13px] text-white font-bold focus:outline-hidden"
                value={scanSession.fileName}
                onChange={(e) => setScanSession((prev) => ({ ...prev, fileName: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScanSession(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 font-bold text-[12.5px] text-white/80"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleSaveScan}
                disabled={uploading || scanSession.pages.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-[#C98A2B] text-white font-extrabold text-[12.5px] flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : "Salvează PDF pe Dosar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
