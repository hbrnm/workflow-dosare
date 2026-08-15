import React, { useEffect, useState } from "react";
import { X, ExternalLink, Clock, Phone, Car } from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { fmtDate, telLink, getSinceMeta } from "../../utils/dateUtils";
import Pill from "./Pill";
import WhatsAppButton from "./WhatsAppButton";
import DosarNumber from "./DosarNumber";

export default function QuickViewDrawer({
  claim,
  onClose,
  onOpenFull,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (claim) {
      // Short timeout to allow CSS transition to apply
      setTimeout(() => setMounted(true), 10);
    } else {
      setMounted(false);
    }
  }, [claim]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && claim) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [claim, onClose]);

  if (!claim) return null;

  const statusDef = getStatusDefinition(claim.status);
  const stageSince = getSinceMeta(claim.dataSchimbareStatus || claim.dataDeschiderii || null);

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
            className="p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-surface-hover)] rounded-md transition-colors"
            title="Închide (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
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

            <div className="bg-[var(--app-surface-2)] p-3 rounded-lg border border-[var(--app-border)] space-y-2">
               <div className="flex items-center justify-between text-[13px]">
                 <span className="text-[var(--app-muted)]">Dosar:</span>
                 <DosarNumber value={claim.numarDosar} prefix="" className="font-mono font-semibold" />
               </div>
               <div className="flex items-center justify-between text-[13px]">
                 <span className="text-[var(--app-muted)]">Asigurător:</span>
                 <span className="font-semibold text-[var(--app-text)]">{claim.asigurator || "—"}</span>
               </div>
               <div className="flex items-center justify-between text-[13px]">
                 <span className="text-[var(--app-muted)]">Client:</span>
                 <span className="font-semibold text-[var(--app-text)]">{claim.client || "—"}</span>
               </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-bold text-[var(--app-muted)] uppercase mb-3 tracking-wide">Stadiu curent</h3>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="font-semibold text-[14px] text-[var(--app-text-strong)] mb-1">
                  {String(statusDef.num).padStart(2, "0")}. {statusDef.label}
                </div>
                {stageSince.dateTimeLabel && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
                    <Clock size={13} />
                    În stadiu din {stageSince.dateTimeLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          {claim.telefonClient && (
            <div>
              <h3 className="text-xs font-bold text-[var(--app-muted)] uppercase mb-3 tracking-wide">Contact Client</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={telLink(claim.telefonClient)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[var(--app-surface-3)] hover:bg-[var(--app-surface-hover)] border border-[var(--app-border)] rounded-md font-semibold text-sm transition-colors"
                >
                  <Phone size={14} /> Sună
                </a>
                <WhatsAppButton phone={claim.telefonClient} claim={claim} size={14} className="py-2 px-4 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors h-[38px] flex items-center justify-center" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              setTimeout(() => onOpenFull(claim), 150); // slight delay to allow drawer to start closing
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ExternalLink size={16} />
            Deschide dosar complet
          </button>
        </div>
      </div>
    </>
  );
}
