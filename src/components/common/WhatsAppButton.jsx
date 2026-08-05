import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, ChevronDown } from "lucide-react";
import { WA_TEMPLATES, getWaTemplateLink, waLink } from "../../utils/dateUtils";
import { loadCachedBranding } from "../../constants/branding";

export default function WhatsAppButton({ phone, claim, size = 13, className = "", brandName }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const atelierName = brandName || loadCachedBranding()?.atelierNume || "service";

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let topPos = rect.bottom + 4;
      // Dacă nu este loc dedesubt, deschide în sus
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        topPos = Math.max(10, rect.top - popoverHeight - 4);
      }

      let rightPos = window.innerWidth - rect.right;
      if (rightPos < 10) rightPos = 10;
      if (rect.left < 10) rightPos = Math.max(10, window.innerWidth - 240);

      setCoords({
        top: topPos,
        right: rightPos,
      });
    }
  }, [open]);

  if (!phone) return null;

  return (
    <div className="inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        title="Trimite mesaj WhatsApp (Apasă pentru șabloane)"
        className={`wa-btn p-1.5 rounded-md transition-colors flex items-center gap-0.5 ${className}`}
      >
        <MessageCircle size={size} />
        <ChevronDown size={size - 2} className="opacity-70" />
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[1px]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />

            <div
              style={{
                top: `${coords.top}px`,
                right: `${coords.right}px`,
              }}
              className="wa-popover fixed z-[99999] rounded-xl shadow-2xl p-1.5 w-60 text-[11.5px] space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wa-popover-label px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border-b">
                Alege șablon WhatsApp:
              </div>

              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {WA_TEMPLATES.map((tmpl) => (
                  <a
                    key={tmpl.key}
                    href={getWaTemplateLink(phone, tmpl.key, claim, atelierName)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="wa-popover-item block w-full text-left px-2.5 py-1.5 rounded-lg transition-colors font-semibold text-[11.5px]"
                  >
                    {tmpl.label}
                  </a>
                ))}
              </div>

              <div className="wa-popover-footer border-t pt-1">
                <a
                  href={waLink(phone)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="wa-popover-muted block w-full text-left px-2.5 py-1.5 rounded-lg italic font-semibold text-[11px]"
                >
                  Deschide chat fără mesaj pre-definit
                </a>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
