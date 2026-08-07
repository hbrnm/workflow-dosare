import React, { useEffect, useMemo, useState } from "react";
import {
  X, Phone, ChevronRight, Camera, FileText, Car, User,
  ArrowRight, ExternalLink, Loader2
} from "lucide-react";
import { STATUSES, getStatusDefinition, getPhaseColors, isPieseComandateStatus } from "../../constants/config";
import { telLink, nowISO, uid, fmtDateTime } from "../../utils/dateUtils";
import { refreshStorageUrls } from "../../utils/claimUtils";
import { supabase } from "../../supabaseClient";
import WhatsAppButton from "../common/WhatsAppButton";
import MobilePieseSositeRow from "./MobilePieseSositeRow";

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
    const entry = { id: uid(), data: nowISO(), text };
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
      className="m-claim-sheet app-shell fixed inset-0 z-[9000] flex flex-col font-sans"
      style={{ background: "var(--app-bg)", color: "var(--app-text)" }}
    >
      {/* Header */}
      <header className="px-3.5 py-3 flex items-center justify-between shrink-0 border-b" style={{ background: "var(--app-chrome)", color: "var(--app-chrome-text)", borderColor: "var(--app-border)" }}>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
            {claim.numarDosar ? `Dosar ${claim.numarDosar}` : "Fără nr. dosar"}
          </div>
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onBlur={handleBlurPlate}
            disabled={readOnly}
            placeholder="NR. AUTO"
            className="w-full bg-transparent font-mono font-extrabold text-[22px] text-white tracking-wide outline-none placeholder:text-white/30 disabled:opacity-80"
            style={{ fontFamily: "'Space Grotesk', monospace" }}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {saving && <Loader2 size={16} className="animate-spin text-[var(--app-accent)]" />}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Închide"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
        {/* Status */}
        <section className="m-sheet-card">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => !readOnly && setStatusOpen((v) => !v)}
              disabled={readOnly}
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
                    className={`m-status-option w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold transition-colors ${
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
                  className="m-call-btn p-2"
                  title="Sună"
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
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-[var(--app-accent)] text-[var(--app-accent-text)] active:scale-[0.98] transition-transform"
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

          {photos.length === 0 ? (
            <div className="m-ui-hint space-y-2">
              <p>Nicio poză încă pe acest dosar.</p>
              {onCapturePhotos && !readOnly && (
                <button
                  type="button"
                  onClick={() => onCapturePhotos(claim)}
                  className="m-btn-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-extrabold active:scale-[0.98]"
                >
                  <Camera size={14} /> Fotografiază acum
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {photos.slice(0, 12).map((p, idx) => (
                <a
                  key={idx}
                  href={p.url || p}
                  target="_blank"
                  rel="noreferrer"
                  className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-2)]"
                >
                  <img src={p.url || p} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}

          {onCapturePhotos && !readOnly && photos.length > 0 && (
            <button
              type="button"
              onClick={() => onCapturePhotos(claim)}
              className="m-ui-select-row justify-center gap-2 font-extrabold text-[12.5px]"
            >
              <Camera size={16} /> Adaugă poze
            </button>
          )}
        </section>

        {/* Quick note */}
        <section className="m-sheet-card space-y-2.5">
          <h3 className="font-extrabold text-[13px]" style={{ fontFamily: "var(--app-font-display)" }}>
            Notiță rapidă
          </h3>
          {latestNote && (
            <div className="text-[12px] m-muted bg-[var(--app-surface-2)] rounded-xl px-3 py-2 border border-[var(--app-border)]">
              <div className="text-[10px] font-bold mb-0.5 opacity-80">
                {fmtDateTime(latestNote.data)}
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
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] text-[13px] font-semibold outline-none focus:bg-[var(--app-surface)]"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                className="m-btn-primary px-3 py-2 rounded-xl text-[12px] font-extrabold disabled:opacity-40"
              >
                Adaugă
              </button>
            </div>
          )}
        </section>

        {/* Open full modal */}
        <button
          type="button"
          onClick={() => onOpenFull?.(claim)}
          className="m-ui-select-row justify-center gap-2 py-3 font-extrabold text-[13px]"
        >
          <ExternalLink size={15} />
          Detalii complete
        </button>
      </div>
    </div>
  );
}
