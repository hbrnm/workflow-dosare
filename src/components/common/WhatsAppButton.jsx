import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, ChevronDown } from "lucide-react";
import { loadCachedBranding } from "../../constants/branding";
import { isCompactMobileViewport } from "../../utils/viewport";
import { WhatsAppTemplateList } from "./WhatsAppSheet";
import { useWhatsAppSheet } from "./WhatsAppSheetContext";

export default function WhatsAppButton({ phone, claim, size = 13, className = "", brandName }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const atelierName = brandName || loadCachedBranding()?.atelierNume || "service";
  const sheet = useWhatsAppSheet();

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let topPos = rect.bottom + 4;
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

  const openMenu = (e) => {
    e.stopPropagation();
    if (sheet?.open && isCompactMobileViewport()) {
      sheet.open({ phone, claim, atelierName });
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        title="Trimite mesaj WhatsApp (Apasă pentru șabloane)"
        aria-label="Mesaj WhatsApp"
        aria-expanded={open || Boolean(sheet?.isOpen)}
        aria-haspopup="dialog"
        className={`wa-btn p-1.5 rounded-md transition-colors flex items-center gap-0.5 ${className}`}
      >
        <MessageCircle size={size} />
        <ChevronDown size={size - 2} className="opacity-70" />
      </button>

      {open &&
        createPortal(
          <div className="app-shell">
            <div
              className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[1px]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />

            <div
              role="menu"
              style={{
                top: `${coords.top}px`,
                right: `${coords.right}px`,
              }}
              className="wa-popover fixed z-[99999] rounded-xl shadow-2xl p-1.5 w-60 text-[11.5px] space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="wa-popover-label px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border-b flex items-center justify-between">
                <span>Șablon WhatsApp:</span>
                <span className="text-[9px] text-emerald-400 font-bold">Auto-Selectat</span>
              </div>
              <WhatsAppTemplateList
                phone={phone}
                claim={claim}
                atelierName={atelierName}
                onPick={() => setOpen(false)}
                compact
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
