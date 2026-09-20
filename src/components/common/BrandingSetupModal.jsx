import React, { useEffect, useState, useRef } from "react";
import { Building2, ImagePlus, X } from "lucide-react";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "./modalShellClasses";
import { useModalEscape } from "../../hooks/useModalEscape";
import { atelierInitials } from "../../constants/branding";

/**
 * First-login identity: atelier name + logo, never the product placeholder.
 */
export default function BrandingSetupModal({
  open,
  branding,
  onSave,
  onDismiss,
  onUploadLogo,
  onNotify,
  desktopUi = false,
}) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (!initializedRef.current) {
      initializedRef.current = true;
      const nextName = String(branding?.atelierNume || "").trim();
      setName(nextName);
      setShort(String(branding?.atelierShort || atelierInitials(nextName)).slice(0, 4));
      setLogoUrl(String(branding?.logoUrl || "").trim());
    }
  }, [open]);

  useModalEscape(onDismiss || (() => {}), { enabled: Boolean(onDismiss) });

  if (!open) return null;

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUploadLogo) return;
    setUploading(true);
    try {
      const url = await onUploadLogo(file);
      setLogoUrl(url);
      onNotify?.("Logo încărcat.", "success");
    } catch (err) {
      onNotify?.(err.message || "Eroare la încărcarea logo-ului.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      onNotify?.("Introdu numele atelierului (min. 2 caractere).", "error");
      return;
    }
    setSaving(true);
    try {
      const initials = (short.trim() || atelierInitials(clean)).slice(0, 4).toUpperCase();
      const ok = await onSave?.({
        atelierNume: clean,
        atelierShort: initials,
        logoUrl,
      });
      if (ok === false) {
        onNotify?.("Nu am putut salva identitatea atelierului.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const mark = (short.trim() || atelierInitials(name) || "AT").slice(0, 2);

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true, layer: "front" })}
      {...modalOverlayProps(desktopUi)}
    >
      <form
        onSubmit={handleSave}
        className={modalPanelClass(
          desktopUi,
          "w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        )}
        role="dialog"
        aria-labelledby="branding-setup-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--app-border)]">
          <div>
            <h2 id="branding-setup-title" className="font-semibold text-[17px] text-[var(--app-text-strong)] tracking-tight">
              Identitate atelier
            </h2>
            <p className="text-[12px] text-[var(--app-muted)] mt-1 leading-relaxed">
              Numele și logo-ul apar pe laptop și pe telefon. Fără ele, ecranul arată ca un demo.
            </p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text-strong)] rounded-lg hover:bg-[var(--app-surface-2)] transition ml-2"
              title="Închide"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)]">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-11 h-11 rounded-xl object-contain bg-white" />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-[13px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-strong)]">
                {mark}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-extrabold text-[14px] truncate text-[var(--app-text-strong)]">
                {name.trim() || "Numele atelierului"}
              </div>
              <div className="text-[11px] text-[var(--app-muted)]">Previzualizare</div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">Nume atelier</label>
            <input
              type="text"
              required
              minLength={2}
              autoFocus
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!short || short === atelierInitials(name)) {
                  setShort(atelierInitials(v));
                }
              }}
              className="w-full p-2.5 border border-[var(--app-border,#cbd5e1)] rounded-lg text-[14px] font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent,#c98a2b)]"
              placeholder="ex. AutoService Popescu"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">Inițiale (max 4)</label>
            <input
              type="text"
              maxLength={4}
              value={short}
              onChange={(e) => setShort(e.target.value.toUpperCase().slice(0, 4))}
              className="w-full p-2.5 border border-[var(--app-border,#cbd5e1)] rounded-lg text-[14px] font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-[var(--app-accent,#c98a2b)]"
              placeholder="AP"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">Logo</label>
            <label className="flex items-center gap-2 w-full p-2.5 rounded-lg border border-dashed border-[var(--app-border)] text-[12px] font-semibold text-[var(--app-text)] cursor-pointer hover:bg-[var(--app-surface-2)]">
              <ImagePlus size={16} />
              {uploading ? "Se încarcă..." : logoUrl ? "Schimbă logo-ul" : "Încarcă logo (PNG, JPG)"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} disabled={uploading} />
            </label>
            {logoUrl ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] inline-flex items-center gap-1"
                onClick={() => setLogoUrl("")}
              >
                <X size={12} /> Scoate logo-ul
              </button>
            ) : (
              <p className="text-[11px] text-[var(--app-muted)]">Opțional acum — îl poți adăuga oricând din Setări.</p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <AppButton type="submit" variant="primary" className="w-full app-btn-lg" disabled={saving}>
            <Building2 size={16} /> {saving ? "Se salvează..." : "Salvează identitatea"}
          </AppButton>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full text-center py-1 text-[12px] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:underline"
            >
              Configurează mai târziu
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
