import React, { useEffect, useMemo, useState } from "react";
import {
  X, Phone, ChevronRight, Camera, FileText, Car, User,
  ArrowRight, ExternalLink, Loader2, FileCheck, FolderArchive, ImageIcon
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
  onCapturePhotos,
  userEmail = "",
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

  const handleDirectPhotoUpload = async (files, targetCategory = "generale") => {
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
            categoria: targetCategory || "generale",
            nume: file.name || `foto_mobil_${todayISO()}.jpg`,
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
        onNotify?.(`S-au salvat ${uploadedPhotos.length} foto în dosar.`, "success");
      }
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la încărcarea fotografiilor: " + err.message, "error");
    } finally {
      setUploadingPhotos(false);
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
            className="m-plate w-full bg-transparent outline-none placeholder:opacity-30 disabled:opacity-80"
            style={{ color: "inherit" }}
          />
          <ClaimAuditMeta claim={claim} compact className="mt-1" />
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

          {isPieseComandateStatus(claim.status) && (
            <div className="mt-3 pt-3 border-t border-[var(--app-border)]">
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
            </div>
          )}
        </section>

        {/* Client + phone */}
        <section className="m-sheet-card space-y-3">
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

        {/* Next step CTA */}
        {nextStatus && !readOnly && (
          <button
            type="button"
            onClick={() => onMoveToStatus?.(claim, nextStatus.key)}
            className="m-sheet-cta"
          >
            <div className="text-left min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pas următor</div>
              <div className="font-extrabold text-[15px] truncate" style={{ fontFamily: "var(--app-font-display)" }}>
                {nextStatus.label}
              </div>
            </div>
            <ArrowRight size={22} className="shrink-0" />
          </button>
        )}

        {/* Photos strip */}
        <section className="m-sheet-card space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[13px] flex items-center gap-1.5" style={{ fontFamily: "var(--app-font-display)" }}>
              <Camera size={15} className="text-[var(--app-accent)]" />
              Poze ({photos.length})
            </h3>
            <span className="m-ui-chip flex items-center gap-1">
              <FileText size={12} /> {docs.length} doc
            </span>
          </div>

          {uploadingPhotos && (
            <div className="flex items-center justify-center gap-2 p-2 bg-[var(--app-surface-2)] border border-[var(--app-accent)]/30 rounded-xl text-[12px] font-bold text-[var(--app-accent)]">
              <Loader2 size={15} className="animate-spin" /> Se încarcă fotografia...
            </div>
          )}

          {photos.length === 0 ? (
            <div className="m-ui-hint space-y-2">
              <p>Nicio poză încă pe acest dosar.</p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {photos.slice(0, 12).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  aria-label={`Vezi poza ${idx + 1}`}
                  className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-2)]"
                >
                  <img src={p.url || p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {!readOnly && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--app-border)]">
              {/* Buton Cameră Live cu Shutter */}
              <button
                type="button"
                onClick={() => setShowLiveCam(true)}
                className="py-2.5 px-3 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[12px] font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                <Camera size={15} />
                <span>Cameră Foto Live</span>
              </button>

              {/* Buton Galerie */}
              <label className="py-2.5 px-3 rounded-xl bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-strong)] text-[12px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                <ImageIcon size={15} />
                <span>Din Galerie</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleDirectPhotoUpload(files, "generale");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {!readOnly && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--app-muted)] pt-0.5">
              <span>Opțiune foto nativă:</span>
              <label className="cursor-pointer font-bold text-[var(--app-text)] hover:underline flex items-center gap-1">
                <Camera size={13} />
                <span>Cameră Nativă Phone</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleDirectPhotoUpload(files, "generale");
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </section>

        {/* Quick note */}
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

        {/* Butoane Rapide: Recepție cu Semnătură & Pachet Decont */}
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
      </div>

      {previewIndex != null && photos.length > 0 && (
        <PhotoLightbox
          items={photos}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
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
      {showLiveCam && (
        <LiveStreamCameraModal
          initialCategorie="receptie"
          onSavePhoto={(files, cat) => handleDirectPhotoUpload(files, cat)}
          onClose={() => setShowLiveCam(false)}
        />
      )}
    </div>
  );
}
