import React, { useEffect, useMemo, useState } from "react";
import {
  X, Phone, ChevronRight, ChevronDown, Camera, FileText, Car, User,
  ArrowRight, ExternalLink, Loader2, FileCheck, FolderArchive, ImageIcon, Trash2
} from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors, isPieseComandateStatus, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "../../constants/config";
import { telLink, nowISO, uid, fmtDateTime, todayISO } from "../../utils/dateUtils";
import { refreshStorageUrls, uploadStorageItem } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { supabase } from "../../supabaseClient";
import WhatsAppButton from "../common/WhatsAppButton";
import PhotoLightbox from "../common/PhotoLightbox";
import ClaimAuditMeta from "../common/ClaimAuditMeta";
import ReceptieAutoModal from "../modals/ReceptieAutoModal";
import SettlementPackageModal from "../modals/SettlementPackageModal";
import LiveStreamCameraModal from "../common/LiveStreamCameraModal";
import MobilePieseSositeRow from "./MobilePieseSositeRow";
import { loadCachedBranding } from "../../constants/branding";

/**
 * Thin field sheet for mobile — plate, client, phone, status, photos, next step.
 * Full ClaimModal stays behind "Detalii complete".
 */
export default function MobileClaimSheet({
  claim,
  onClose,
  onOpenFull,
  onPatch,
  onMoveToStatus,
  canEdit,
  onNotify,
  userEmail = "",
  liveCameraOpen = undefined,
  onLiveCameraOpen = null,
  onLiveCameraClose = null,
  initialCameraCategory = null,
}) {
  const readOnly = !canEdit;
  const [plate, setPlate] = useState(claim?.numarInmatriculare || "");
  const [client, setClient] = useState(claim?.client || "");
  const [phone, setPhone] = useState(claim?.telefonClient || "");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [photos, setPhotos] = useState(() => (Array.isArray(claim?.poze) ? claim.poze : []));
  const [docs, setDocs] = useState(() => (Array.isArray(claim?.documente) ? claim.documente : []));
  const [previewIndex, setPreviewIndex] = useState(null);
  const [isReceptieOpen, setIsReceptieOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showLiveCam, setShowLiveCam] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const cameraOpen = liveCameraOpen ?? showLiveCam;

  const openLiveCam = () => {
    if (onLiveCameraOpen) onLiveCameraOpen();
    else setShowLiveCam(true);
  };

  const closeLiveCam = () => {
    if (onLiveCameraClose) onLiveCameraClose();
    else setShowLiveCam(false);
  };

  const suggestedCategory = useMemo(() => {
    if (["receptie", "predare", "reconstatare"].includes(initialCameraCategory)) {
      return initialCameraCategory;
    }
    const s = claim?.status;
    if (s === "deschidere") return "receptie";
    if (["constatare_efectuata", "piese_comandate", "in_lucru"].includes(s)) return "reconstatare";
    if (["reparatie_finalizata", "predat"].includes(s)) return "predare";
    return "receptie";
  }, [claim?.status, initialCameraCategory]);

  const handleDirectPhotoUpload = async (files, targetCategory = null) => {
    if (!claim?.id || readOnly || !files?.length) return;
    const cat = targetCategory || suggestedCategory;
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
        await onPatch?.(claim.id, { appendPoze: uploadedPhotos }, { canEditFn: () => !readOnly });
        const updatedPoze = await refreshStorageUrls(
          [...(claim.poze || []), ...uploadedPhotos],
          "poze-dosare",
          supabase
        );
        setPhotos(updatedPoze);

        onNotify?.(`S-au salvat ${uploadedPhotos.length} foto [${cat.toUpperCase()}] în dosar.`, "success");
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
      await onPatch?.(claim.id, { poze: updatedPoze }, { canEditFn: () => !readOnly });
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

  // Keep local fields in sync when realtime / patch refreshes the claim
  useEffect(() => {
    setPlate(claim?.numarInmatriculare || "");
    setClient(claim?.client || "");
    setPhone(claim?.telefonClient || "");
  }, [claim?.id, claim?.numarInmatriculare, claim?.client, claim?.telefonClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!claim?.id) {
        setPhotos([]);
        setDocs([]);
        return;
      }
      const [p, d] = await Promise.all([
        refreshStorageUrls(claim.poze || [], "poze-dosare", supabase),
        refreshStorageUrls(claim.documente || [], "documente-dosare", supabase),
      ]);
      if (!cancelled) {
        setPhotos(p);
        setDocs(d);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claim?.id, claim?.poze, claim?.documente]);

  const statusDef = getStatusDefinition(claim?.status);
  const phaseColors = getPhaseColors(claim?.status);

  const nextStatus = useMemo(() => {
    const idx = STATUSES.findIndex((s) => s.key === statusDef.key);
    if (idx < 0 || idx >= STATUSES.length - 1) return null;
    return STATUSES[idx + 1];
  }, [statusDef.key]);

  const latestNote = Array.isArray(claim?.note) && claim.note.length > 0 ? claim.note[0] : null;

  const persistField = async (patch) => {
    if (readOnly || !claim?.id) return;
    setSaving(true);
    try {
      await onPatch(claim.id, patch);
    } finally {
      setSaving(false);
    }
  };

  const handleBlurPlate = () => {
    const next = plate.trim().toUpperCase();
    if (next === (claim.numarInmatriculare || "").trim().toUpperCase()) return;
    persistField({ numarInmatriculare: next });
  };

  const handleBlurClient = () => {
    const next = client.trim();
    if (next === (claim.client || "").trim()) return;
    persistField({ client: next });
  };

  const handleBlurPhone = () => {
    const next = phone.trim();
    if (next === (claim.telefonClient || "").trim()) return;
    persistField({ telefonClient: next });
  };

  const handleStatusChange = (key) => {
    setStatusOpen(false);
    if (readOnly || key === claim.status) return;
    onMoveToStatus?.(claim, key);
  };

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text || readOnly) return;
    const author = String(userEmail || "").trim() || null;
    const entry = { id: uid(), data: nowISO(), text, ...(author ? { author } : {}) };
    setNoteDraft("");
    setSaving(true);
    try {
      await onPatch(claim.id, { note: [entry, ...(claim.note || [])] });
      onNotify?.("Notiță adăugată.", "success");
    } finally {
      setSaving(false);
    }
  };

  if (!claim) return null;

  return (
    <div
      className="m-claim-sheet app-shell fixed inset-0 z-[9100] flex flex-col font-sans"
      style={{ background: "var(--app-bg)", color: "var(--app-text)" }}
    >
      <header className="m-sheet-header shrink-0">
        <div className="min-w-0 flex-1">
          <div className="m-sheet-header-kicker">
            {claim.numarDosar ? `Dosar ${claim.numarDosar}` : "Fără nr. dosar"}
          </div>
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onBlur={handleBlurPlate}
            disabled={readOnly}
            placeholder="NR. AUTO"
            className="m-plate outline-none disabled:opacity-80"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {saving && <Loader2 size={16} className="animate-spin text-[var(--app-accent)]" />}
          <button
            type="button"
            onClick={onClose}
            className="m-sheet-close"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="m-sheet-body">
        {/* Status */}
        <section className="m-sheet-card">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => !readOnly && setStatusOpen((v) => !v)}
              disabled={readOnly}
              aria-expanded={statusOpen}
              aria-label="Schimbă status"
              className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:opacity-80"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: phaseColors.bar }}
              />
              <span className="font-extrabold text-[14px] truncate" style={{ fontFamily: "var(--app-font-display)" }}>
                {statusDef.label}
              </span>
              {!readOnly && <ChevronRight size={16} className={`m-brief-chevron shrink-0 transition-transform ${statusOpen ? "rotate-90" : ""}`} />}
            </button>
            {claim.marcaModel && (
              <span className="text-[11px] font-semibold m-muted truncate max-w-[40%] flex items-center gap-1">
                <Car size={12} /> {claim.marcaModel}
              </span>
            )}
          </div>

          {statusOpen && (
            <div className="m-status-menu mt-3 space-y-1 max-h-52 overflow-y-auto border-t border-[var(--app-border)] pt-2">
              {STATUSES.map((s) => {
                const active = s.key === statusDef.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleStatusChange(s.key)}
                    className={`m-status-option w-full text-left px-3 py-2 rounded-full text-[13px] font-bold transition-colors ${
                      active ? "is-active" : ""
                    }`}
                  >
                    {s.num}. {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Telefon */}
        <section className="m-sheet-card">
          <div className="flex items-center gap-2">
            <Phone size={15} className="m-muted shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handleBlurPhone}
              disabled={readOnly}
              placeholder="Telefon"
              className="flex-1 min-w-0 bg-transparent font-mono font-bold text-[14px] outline-none placeholder:opacity-40 disabled:opacity-80"
            />
            {phone.trim() && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={telLink(phone)}
                  className="m-call-btn p-2 rounded-full"
                  title="Sună"
                  aria-label="Sună"
                >
                  <Phone size={16} />
                </a>
                <WhatsAppButton phone={phone} claim={claim} size={14} />
              </div>
            )}
          </div>
        </section>

        {nextStatus && !readOnly && (
          <button
            type="button"
            onClick={() => onMoveToStatus?.(claim, nextStatus.key)}
            className="m-sheet-next-row"
          >
            <span className="truncate">
              Pas următor · {nextStatus.short || nextStatus.label}
            </span>
            <ArrowRight size={16} className="shrink-0" />
          </button>
        )}

        {/* Foto + Galerie */}
        <section className="m-sheet-card space-y-2.5">
          {uploadingPhotos && (
            <div className="flex items-center justify-center gap-2 p-2 bg-[var(--app-surface-2)] border border-[var(--app-accent)]/30 rounded-xl text-[12px] font-bold text-[var(--app-accent)]">
              <Loader2 size={15} className="animate-spin" /> Se încarcă fotografia...
            </div>
          )}

          {photos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {photos.slice(0, 12).map((p, idx) => (
                <div key={idx} className="relative group shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    aria-label={`Vezi poza ${idx + 1}`}
                    className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-2)] block"
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
          ) : null}

          {!readOnly && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openLiveCam}
                className="py-2.5 px-3 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[12px] font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                <Camera size={15} />
                <span>Foto</span>
              </button>
              <label className="py-2.5 px-3 rounded-xl bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-strong)] text-[12px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                <ImageIcon size={15} />
                <span>Galerie</span>
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
        </section>

        <button
          type="button"
          className="m-sheet-more-btn"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span>{moreOpen ? "Mai putin" : "Mai mult"}</span>
          <ChevronDown size={15} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
        </button>

        {moreOpen ? (
          <>
            <section className="m-sheet-card space-y-3">
              <ClaimAuditMeta claim={claim} compact />
              <div className="flex items-center gap-2">
                <User size={15} className="m-muted shrink-0" />
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  onBlur={handleBlurClient}
                  disabled={readOnly}
                  placeholder="Nume client"
                  className="flex-1 min-w-0 bg-transparent font-bold text-[14px] outline-none placeholder:opacity-40 disabled:opacity-80"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[12px] m-muted">
                <FileText size={12} /> {docs.length} doc · {photos.length} poze
              </div>
            </section>

            {isPieseComandateStatus(claim.status) && (
              <section className="m-sheet-card">
                <MobilePieseSositeRow
                  claim={claim}
                  canEdit={!readOnly}
                  onToggle={async (c, val) => {
                    const ok = await onPatch?.(c.id, { pieseSosite: val });
                    if (ok === false) return;
                    onNotify?.(
                      val
                        ? "Piese marcate ca sosite — apasă Programare ca să alegi data."
                        : "Bifa „Piese sosite” a fost stearsă.",
                      val ? "success" : "info"
                    );
                  }}
                  onSchedule={async (c, iso) => {
                    const ok = await onPatch?.(c.id, { dataProgramare: iso });
                    if (ok === false) return false;
                    onNotify?.(
                      `Programare salvată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""}`.trim(),
                      "success"
                    );
                    return true;
                  }}
                />
              </section>
            )}

            <section className="m-sheet-card space-y-2.5">
              <h3 className="font-extrabold text-[13px]" style={{ fontFamily: "var(--app-font-display)" }}>
                Notiță rapidă
              </h3>
              {latestNote && (
                <div className="text-[12px] m-muted bg-[var(--app-surface-2)] rounded-2xl px-3 py-2 border border-[var(--app-border)]">
                  <div className="text-[10px] font-bold mb-0.5 opacity-80">
                    {fmtDateTime(latestNote.data)}
                    {latestNote.author ? (
                      <span className="ml-1.5 font-semibold text-[var(--app-text)]">
                        · {latestNote.author}
                      </span>
                    ) : null}
                  </div>
                  <div className="line-clamp-3 text-[var(--app-text)]">{latestNote.text}</div>
                </div>
              )}
              {!readOnly && (
                <div className="flex gap-2">
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
                    placeholder="Adaugă notiță…"
                    className="flex-1 min-w-0 px-3 py-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[13px] font-semibold outline-none focus:bg-[var(--app-surface)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!noteDraft.trim()}
                    className="m-btn-primary px-3.5 py-2 rounded-full text-[12px] font-extrabold disabled:opacity-40"
                  >
                    Adaugă
                  </button>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsReceptieOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[12px] hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                <FileCheck size={14} /> Recepție &amp; Semnează
              </button>
              <button
                type="button"
                onClick={() => setIsSettlementOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold text-[12px] hover:bg-indigo-500/20 active:scale-95 transition-all"
              >
                <FolderArchive size={14} /> Pachet Decont (ZIP)
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenFull?.(claim)}
              className="m-sheet-link"
            >
              <ExternalLink size={15} />
              Detalii complete
            </button>
          </>
        ) : null}
      </div>

      {previewIndex != null && photos.length > 0 && (
        <PhotoLightbox
          items={photos}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onDelete={!readOnly ? handleDeletePhoto : undefined}
        />
      )}

      {/* Modal Recepție Auto Mobil */}
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

      {/* Modal Pachet Decont Mobil */}
      {isSettlementOpen && (
        <SettlementPackageModal
          isOpen={isSettlementOpen}
          onClose={() => setIsSettlementOpen(false)}
          claim={claim}
          onNotify={onNotify}
          atelierBranding={loadCachedBranding()}
        />
      )}

      {/* Modal Cameră Foto Live — Fotografiază direct pe cardul dosarului fără să închidă fișa */}
      {cameraOpen && (
        <LiveStreamCameraModal
          initialCategorie={suggestedCategory}
          onSavePhoto={(files, cat) => handleDirectPhotoUpload(files, cat)}
          onClose={closeLiveCam}
        />
      )}
    </div>
  );
}
