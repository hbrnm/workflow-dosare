import React from "react";
import { X } from "lucide-react";
import { WA_TEMPLATES, getWaTemplateLink, waLink } from "../../utils/dateUtils";

export function isWhatsAppTemplateRecommended(claim, templateKey) {
  return (
    (claim?.status === "reparatie_finalizata" && templateKey === "gata") ||
    (claim?.status === "piese_comandate" && templateKey === "piese") ||
    (claim?.status === "deschidere" && templateKey === "acte")
  );
}

export function WhatsAppTemplateList({ phone, claim, atelierName, onPick, compact = false }) {
  if (!phone) return null;

  return (
    <>
      <div className={compact ? "space-y-0.5 max-h-56 overflow-y-auto" : "space-y-1.5"}>
        {WA_TEMPLATES.map((tmpl) => {
          const isRec = isWhatsAppTemplateRecommended(claim, tmpl.key);
          return (
            <a
              key={tmpl.key}
              role="menuitem"
              href={getWaTemplateLink(phone, tmpl.key, claim, atelierName)}
              target="_blank"
              rel="noreferrer"
              onClick={() => onPick?.()}
              className={`wa-popover-item block w-full text-left rounded-xl transition-colors font-semibold ${
                compact ? "px-2.5 py-1.5 text-[11.5px]" : "px-3.5 py-3 text-[14px]"
              } ${isRec ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{tmpl.label}</span>
                {isRec && (
                  <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded shrink-0">
                    Recomandat
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
      <div className={`wa-popover-footer border-t ${compact ? "pt-1" : "pt-2 mt-2"}`}>
        <a
          role="menuitem"
          href={waLink(phone)}
          target="_blank"
          rel="noreferrer"
          onClick={() => onPick?.()}
          className={`wa-popover-muted block w-full text-left rounded-xl italic font-semibold ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2.5 text-[13px]"
          }`}
        >
          Deschide chat fără mesaj pre-definit
        </a>
      </div>
    </>
  );
}

export default function WhatsAppSheet({ payload, onClose }) {
  if (!payload?.phone) return null;

  return (
    <div className="wa-sheet-root" role="presentation">
      <button
        type="button"
        className="wa-sheet-backdrop"
        aria-label="Inchide WhatsApp"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sablon WhatsApp"
        className="wa-sheet app-shell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wa-sheet-handle" aria-hidden="true" />
        <div className="wa-sheet-head">
          <div className="min-w-0">
            <p className="wa-popover-label text-[10px] font-extrabold uppercase tracking-wider">
              Sablon WhatsApp
            </p>
            <p className="text-[15px] font-extrabold text-[var(--app-text-strong)] truncate">
              {payload.claim?.numarInmatriculare || payload.phone}
            </p>
          </div>
          <button
            type="button"
            className="m-sheet-close"
            onClick={onClose}
            aria-label="Inchide"
          >
            <X size={18} />
          </button>
        </div>
        <WhatsAppTemplateList
          phone={payload.phone}
          claim={payload.claim}
          atelierName={payload.atelierName}
          onPick={onClose}
        />
      </div>
    </div>
  );
}
