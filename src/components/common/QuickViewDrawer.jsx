import React, { useEffect, useState, useMemo } from "react";
import {
  X, ExternalLink, Clock, Phone, Car, FileText, Printer, ArrowRight,
  Camera, ImageIcon, FileCheck, FolderArchive, Loader2, User, ChevronDown, Trash2
} from "lucide-react";
import { STATUSES, getStatusDefinition, isPieseComandateStatus, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "../../constants/config";
import { fmtDate, telLink, getSinceMeta, todayISO, nowISO, uid, fmtDateTime } from "../../utils/dateUtils";
import { refreshStorageUrls, uploadStorageItem } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { supabase } from "../../supabaseClient";
import Pill from "./Pill";
import WhatsAppButton from "./WhatsAppButton";
import DosarNumber from "./DosarNumber";
import MobilePieseSositeRow from "../mobile/MobilePieseSositeRow";
import PhotoLightbox from "./PhotoLightbox";
import ReceptieAutoModal from "../modals/ReceptieAutoModal";
import SettlementPackageModal from "../modals/SettlementPackageModal";
import LiveStreamCameraModal from "./LiveStreamCameraModal";
import { loadCachedBranding } from "../../constants/branding";
import {
  generateazaCerereDespagubireAsirom,
  generateazaCerereDespagubireOmniasig,
  generateazaFisaIntrareService,
} from "../../utils/pdfGenerator";
import { resolveCerereDespagubireKind, OMNIASIG_CERERE_PLATA } from "../../utils/cerereDespagubire";

export default function QuickViewDrawer({
  claim,
  onClose,
  onOpenFull,
  onPatch,
  onMoveToStatus,
  onNotify,
  canEdit = true,
}) {
  const [mounted, setMounted] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [photos, setPhotos] = useState(() => (Array.isArray(claim?.poze) ? claim.poze : []));
  const [previewIndex, setPreviewIndex] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showLiveCam, setShowLiveCam] = useState(false);
  const [isReceptieOpen, setIsReceptieOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const readOnly = !canEdit;

  useEffect(() => {
    if (claim) {
      setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
  }, [claim]);

  // Sync photos signed URLs when claim changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!claim?.id || !Array.isArray(claim?.poze)) {
        setPhotos([]);
        return;
      }
      const refreshed = await refreshStorageUrls(claim.poze, "poze-dosare", supabase);
      if (!cancelled) setPhotos(refreshed);
    })();
    return () => {
      cancelled = true;
    };
  }, [claim?.id, claim?.poze]);

  // Handle keyboard shortcuts (Escape, Spacebar QuickLook)
  useEffect(() => {
    const handleKey = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape" && claim) {
        if (previewIndex != null) return;
        onClose();
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        if (previewIndex != null) return;
        if (claim && photos.length > 0) {
          e.preventDefault();
          setPreviewIndex(0);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [claim, onClose, previewIndex, photos]);

  const nextStatus = useMemo(() => {
    if (!claim?.status) return null;
    const statusDef = getStatusDefinition(claim.status);
    const idx = STATUSES.findIndex((s) => s.key === statusDef.key);
    if (idx < 0 || idx >= STATUSES.length - 1) return null;
    return STATUSES[idx + 1];
  }, [claim?.status]);

  if (!claim) return null;

  const statusDef = getStatusDefinition(claim.status);
  const stageSince = getSinceMeta(claim.dataSchimbareStatus || claim.dataDeschiderii || null);

  const latestNote = Array.isArray(claim?.note) && claim.note.length > 0 ? claim.note[0] : null;

  const handleStatusChange = (key) => {
    setStatusOpen(false);
    if (readOnly || key === claim.status) return;
    onMoveToStatus?.(claim, key);
  };

  const handlePrintCerere = async () => {
    try {
      const kind = resolveCerereDespagubireKind(claim.asigurator);
      const branding = loadCachedBranding();
      if (kind === "asirom") {
        await generateazaCerereDespagubireAsirom(claim, branding);
        onNotify?.("Cerere despăgubire ASIROM generată cu succes.", "success");
      } else {
        await generateazaCerereDespagubireOmniasig(claim, {
          atelierNume: branding?.nume || branding?.atelierNume || OMNIASIG_CERERE_PLATA.beneficiar,
          plata: {
            beneficiar: OMNIASIG_CERERE_PLATA.beneficiar,
            banca: OMNIASIG_CERERE_PLATA.banca,
            cont: OMNIASIG_CERERE_PLATA.cont,
          },
        });
        onNotify?.("Cerere despăgubire OMNIASIG generată cu succes.", "success");
      }
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la generarea cererii: " + err.message, "error");
    }
  };

  const handlePrintFisaService = async () => {
    try {
      await generateazaFisaIntrareService(claim);
      onNotify?.("Fișă intrare service generată.", "success");
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la generare fișă: " + err.message, "error");
    }
  };

  const handleDirectPhotoUpload = async (files) => {
    if (!claim?.id || readOnly || !files?.length) return;
    setUploadingPhotos(true);
    try {
      const uploadedPhotos = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify?.(`Fișierul ${file.name} depășește limita de ${MAX_UPLOAD_SIZE_MB}MB`, "error");
          continue;
        }
        const optimizedFile = await compressImage(file, { maxDim: 1800, quality: 0.80 });
        const uploaded = await uploadStorageItem({
          supabaseClient: supabase,
          claimId: claim.id,
          file: optimizedFile,
          folder: "poze",
          bucketName: "poze-dosare",
          extraFields: {
            categoria: "generale",
            nume: file.name || `foto_quick_${todayISO()}.jpg`,
            data: todayISO(),
          },
        });
        if (uploaded) {
          uploadedPhotos.push(uploaded);
        }
      }
      if (uploadedPhotos.length > 0) {
        await onPatch?.(claim.id, { appendPoze: uploadedPhotos });
        const updatedPoze = await refreshStorageUrls(
          [...(claim.poze || []), ...uploadedPhotos],
          "poze-dosare",
          supabase
        );
        setPhotos(updatedPoze);
        onNotify?.(`S-au salvat ${uploadedPhotos.length} foto în dosar.`, "success");
      }
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la încărcarea fotografiilor: " + err.message, "error");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoToDelete, idx) => {
    if (readOnly || !claim?.id) return;
    if (!window.confirm("Sigur dorești să ștergi această fotografie?")) return;
    try {
      if (photoToDelete?.path) {
        await supabase.storage.from("poze-dosare").remove([photoToDelete.path]);
      }
      const rawPoze = Array.isArray(claim.poze) ? claim.poze : [];
      const updatedPoze = rawPoze.filter((p, i) => {
        if (typeof p === "object" && photoToDelete?.id && p.id) return p.id !== photoToDelete.id;
        if (typeof p === "object" && photoToDelete?.path && p.path) return p.path !== photoToDelete.path;
        return i !== idx;
      });
      await onPatch?.(claim.id, { poze: updatedPoze });
      const refreshed = await refreshStorageUrls(updatedPoze, "poze-dosare", supabase);
      setPhotos(refreshed);
      onNotify?.("Fotografia a fost ștearsă.", "success");
      if (previewIndex != null) {
        if (refreshed.length === 0) setPreviewIndex(null);
        else if (previewIndex >= refreshed.length) setPreviewIndex(refreshed.length - 1);
      }
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la ștergerea fotografiei: " + err.message, "error");
    }
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text || readOnly || !claim?.id) return;
    const entry = { id: uid(), data: nowISO(), text };
    setNoteDraft("");
    setSavingNote(true);
    try {
      await onPatch?.(claim.id, { note: [entry, ...(claim.note || [])] });
      onNotify?.("Notiță adăugată.", "success");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${mounted ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-[var(--app-surface)] shadow-2xl border-l border-[var(--app-border)] z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0">
          <h2 className="text-sm font-semibold text-[var(--app-text-strong)] flex items-center gap-2">
            Inspecție Rapidă
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)] rounded-md transition-colors cursor-pointer"
            title="Închide (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          
          {/* Header Info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <span className="font-mono font-black text-2xl text-[var(--app-text-strong)] tracking-wider uppercase">
                {claim.numarInmatriculare || "FĂRĂ NR."}
              </span>
              <Pill tone={claim.tipAsigurare === "CASCO" ? "amber" : "steel"}>{claim.tipAsigurare}</Pill>
            </div>
            
            <div className="flex items-center gap-2 text-[var(--app-muted)] mb-3">
              <Car size={14} />
              <span className="font-medium text-sm text-[var(--app-text)]">{claim.marcaModel || "—"}</span>
            </div>

            <div className="bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)] space-y-2 text-[13px]">
               <div className="flex items-center justify-between">
                 <span className="text-[var(--app-muted)] font-semibold">Dosar:</span>
                 <DosarNumber value={claim.numarDosar} prefix="" className="font-mono font-bold" />
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-[var(--app-muted)] font-semibold">Asigurător:</span>
                 <span className="font-bold text-[var(--app-text)]">{claim.asigurator || "—"}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-[var(--app-muted)] font-semibold">Client:</span>
                 <span className="font-bold text-[var(--app-text)]">{claim.client || "—"}</span>
               </div>
               {claim.delegat && claim.delegat.trim().toLowerCase() !== (claim.client || "").trim().toLowerCase() && (
                 <div className="flex items-center justify-between">
                   <span className="text-[var(--app-muted)] font-semibold">Delegat / Contact:</span>
                   <span className="font-bold text-[var(--app-text)]">{claim.delegat}</span>
                 </div>
               )}
            </div>
          </div>

          {/* ACȚIUNI RAPIDE PDF & DOCUMENTE */}
          <div className="bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)] space-y-2">
            <h3 className="text-xs font-extrabold text-[var(--app-muted)] uppercase tracking-wide flex items-center gap-1.5">
              <Printer size={13} className="text-[var(--app-accent)]" /> Acțiuni &amp; Documente PDF
            </h3>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handlePrintCerere}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] font-extrabold text-[11.5px] hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Generează / Printează Cerere Despăgubire"
              >
                <Printer size={13} />
                <span>Cerere Despăgubire</span>
              </button>

              <button
                type="button"
                onClick={handlePrintFisaService}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-strong)] font-bold text-[11.5px] active:scale-95 transition-all cursor-pointer"
                title="Fișă Intrare Service"
              >
                <FileText size={13} />
                <span>Fișă Service</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsReceptieOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11.5px] hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <FileCheck size={13} /> Recepție Auto
              </button>
              <button
                type="button"
                onClick={() => setIsSettlementOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-[11.5px] hover:bg-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <FolderArchive size={13} /> Pachet Decont (ZIP)
              </button>
            </div>
          </div>

          {/* Status & Mutare Stadiu */}
          <div className="bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[var(--app-muted)] uppercase tracking-wide">
                Stadiu curent
              </h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setStatusOpen((v) => !v)}
                  className="text-[11px] font-extrabold text-[var(--app-accent)] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Schimbă</span>
                  <ChevronDown size={13} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            <div className="font-extrabold text-[14px] text-[var(--app-text-strong)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--app-accent)] shrink-0" />
              <span>{String(statusDef.num).padStart(2, "0")}. {statusDef.label}</span>
            </div>

            {stageSince.dateTimeLabel && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--app-muted)] font-semibold">
                <Clock size={13} />
                În stadiu din {stageSince.dateTimeLabel}
              </div>
            )}

            {statusOpen && !readOnly && (
              <div className="m-status-menu space-y-1 max-h-48 overflow-y-auto border-t border-[var(--app-border)] pt-2 mt-2">
                {STATUSES.map((s) => {
                  const active = s.key === statusDef.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleStatusChange(s.key)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-colors cursor-pointer ${
                        active
                          ? "bg-[var(--app-accent)] text-white"
                          : "bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)] text-[var(--app-text)]"
                      }`}
                    >
                      {s.num}. {s.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pas Următor CTA Button */}
            {nextStatus && !readOnly && (
              <button
                type="button"
                onClick={() => onMoveToStatus?.(claim, nextStatus.key)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-strong)] font-extrabold text-[12px] flex items-center justify-between transition-all active:scale-98 cursor-pointer"
              >
                <span className="text-[11px] font-bold text-[var(--app-muted)]">Pas Următor:</span>
                <span className="flex items-center gap-1 text-[var(--app-accent)]">
                  {nextStatus.label} <ArrowRight size={14} />
                </span>
              </button>
            )}

            {/* If Piese status */}
            {isPieseComandateStatus(claim.status) && (
              <div className="pt-2 border-t border-[var(--app-border)]">
                <MobilePieseSositeRow
                  claim={claim}
                  canEdit={!readOnly}
                  layout="inline"
                  onToggle={(c, val) => onPatch?.(c.id, { pieseSosite: val })}
                  onSchedule={async (c, iso) => {
                    await onPatch?.(c.id, { dataProgramare: iso });
                    return true;
                  }}
                  onPatchDates={async (c, updates) => {
                    await onPatch?.(c.id, updates);
                  }}
                />
              </div>
            )}
          </div>

          {/* POZE RAPIDE & GALERIE */}
          <div className="bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[var(--app-muted)] uppercase tracking-wide flex items-center gap-1.5">
                <Camera size={13} className="text-[var(--app-accent)]" /> Poze ({photos.length})
              </h3>
            </div>

            {uploadingPhotos && (
              <div className="flex items-center justify-center gap-2 p-2 bg-[var(--app-surface)] rounded-lg text-[11px] font-bold text-[var(--app-accent)]">
                <Loader2 size={14} className="animate-spin" /> Se încarcă...
              </div>
            )}

            {photos.length === 0 ? (
              <p className="text-[11.5px] text-[var(--app-muted)] italic">Fără fotografii încă pe acest dosar.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {photos.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="relative group shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)] cursor-pointer hover:opacity-90 block"
                    >
                      <img src={p.url || p} alt="" className="w-full h-full object-cover" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(p, idx);
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors z-10 cursor-pointer"
                        title="Șterge fotografia"
                        aria-label="Șterge fotografia"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--app-border)]">
                <button
                  type="button"
                  onClick={() => setShowLiveCam(true)}
                  className="py-2 px-2.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[11.5px] font-extrabold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <Camera size={13} /> Foto
                </button>
                <label className="py-2 px-2.5 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-strong)] text-[11.5px] font-extrabold flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all">
                  <ImageIcon size={13} /> Galerie
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) handleDirectPhotoUpload(files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* NOTIȚĂ RAPIDĂ */}
          <div className="bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)] space-y-2">
            <h3 className="text-xs font-extrabold text-[var(--app-muted)] uppercase tracking-wide">
              Notiță Rapidă
            </h3>
            {latestNote && (
              <div className="text-[11.5px] text-[var(--app-muted)] bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border)]">
                <div className="text-[9.5px] font-bold opacity-75 mb-0.5">{fmtDateTime(latestNote.data)}</div>
                <div className="line-clamp-2 text-[var(--app-text)] font-medium">{latestNote.text}</div>
              </div>
            )}
            {!readOnly && (
              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Adaugă o notiță..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[12px] font-semibold outline-none focus:border-[var(--app-accent)]"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteDraft.trim() || savingNote}
                  className="px-3 py-1.5 rounded-lg bg-[var(--app-accent)] text-white text-[11.5px] font-extrabold disabled:opacity-40 cursor-pointer"
                >
                  Adaugă
                </button>
              </div>
            )}
          </div>

          {/* Contact */}
          {claim.telefonClient && (
            <div>
              <h3 className="text-xs font-bold text-[var(--app-muted)] uppercase mb-2 tracking-wide">Contact Client</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={telLink(claim.telefonClient)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] rounded-lg font-bold text-xs transition-colors"
                >
                  <Phone size={14} /> Sună
                </a>
                <WhatsAppButton phone={claim.telefonClient} claim={claim} size={14} className="py-2 px-4 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors h-[38px] flex items-center justify-center" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0">
          <button
            type="button"
            onClick={() => onOpenFull?.(claim)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] font-extrabold rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            <ExternalLink size={16} />
            Deschide dosar complet
          </button>
        </div>
      </div>

      {/* Lightbox / Modale foto & decont */}
      {previewIndex != null && photos.length > 0 && (
        <PhotoLightbox
          items={photos}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onDelete={!readOnly ? handleDeletePhoto : undefined}
          zIndexClass="z-[20000]"
        />
      )}

      {isReceptieOpen && (
        <ReceptieAutoModal
          isOpen={isReceptieOpen}
          onClose={() => setIsReceptieOpen(false)}
          claim={claim}
          onPatchClaim={onPatch}
          onNotify={onNotify}
          atelierBranding={loadCachedBranding()}
        />
      )}

      {isSettlementOpen && (
        <SettlementPackageModal
          isOpen={isSettlementOpen}
          onClose={() => setIsSettlementOpen(false)}
          claim={claim}
          onNotify={onNotify}
          atelierBranding={loadCachedBranding()}
          onPatchClaim={onPatch}
          onMoveToStatus={onMoveToStatus}
        />
      )}

      {showLiveCam && (
        <LiveStreamCameraModal
          initialCategorie="receptie"
          onSavePhoto={(files, cat) => handleDirectPhotoUpload(files)}
          onClose={() => setShowLiveCam(false)}
        />
      )}
    </>
  );
}
