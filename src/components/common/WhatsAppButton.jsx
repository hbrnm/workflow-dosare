import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, ChevronDown } from "lucide-react";
import { WA_TEMPLATES, getWaTemplateLink, waLink } from "../../utils/dateUtils";

export default function WhatsAppButton({ phone, claim, size = 13, className = "" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

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
        className={`p-1 rounded-md bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors flex items-center gap-0.5 ${className}`}
      >
        <MessageCircle size={size} />
        <ChevronDown size={size - 2} className="opacity-70" />
      </button>

      {open &&
        createPortal(
          <>
            {/* Fundal semitransparent pentru închidere la apăsare în exterior */}
            <div
              className="fixed inset-0 z-[99998] bg-[#12161A]/10 backdrop-blur-[1px]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />

            {/* Popover poziționat dinamic prin Portal pe document.body */}
            <div
              style={{
                top: `${coords.top}px`,
                right: `${coords.right}px`,
              }}
              className="fixed z-[99999] bg-white rounded-xl border border-[#DAD4C6] shadow-2xl p-1.5 w-60 text-[11.5px] space-y-1 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] font-extrabold text-[#8A8375] uppercase border-b border-[#EFEAE1] tracking-wider">
                Alege șablon WhatsApp:
              </div>

              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {WA_TEMPLATES.map((tmpl) => (
                  <a
                    key={tmpl.key}
                    href={getWaTemplateLink(phone, tmpl.key, claim)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="block w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#EEF5EE] hover:text-[#3E6B45] text-[#23282E] transition-colors font-semibold text-[11.5px]"
                  >
                    {tmpl.label}
                  </a>
                ))}
              </div>

              <div className="border-t border-[#EFEAE1] pt-1">
                <a
                  href={waLink(phone)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="block w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#6B6558] italic font-semibold text-[11px]"
                >
                  💬 Deschide chat fără mesaj pre-definit
                </a>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
