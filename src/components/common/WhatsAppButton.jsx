import React, { useState } from "react";
import { MessageCircle, ChevronDown } from "lucide-react";
import { WA_TEMPLATES, getWaTemplateLink, waLink } from "../../utils/dateUtils";

export default function WhatsAppButton({ phone, claim, size = 13, className = "" }) {
  const [open, setOpen] = useState(false);

  if (!phone) return null;

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Trimite mesaj WhatsApp (Apasă pentru șabloane)"
        className={`p-1 rounded-md bg-[#EEF5EE] border border-[#3E6B45]/30 hover:bg-[#D3E8D5] text-[#3E6B45] transition-colors flex items-center gap-0.5 ${className}`}
      >
        <MessageCircle size={size} />
        <ChevronDown size={size - 2} className="opacity-70" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-[#DAD4C6] shadow-xl p-1 w-56 text-[11px] space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-bold text-[#8A8375] uppercase border-b border-[#EFEAE1]">
              Alege șablon WhatsApp:
            </div>
            {WA_TEMPLATES.map((tmpl) => (
              <a
                key={tmpl.key}
                href={getWaTemplateLink(phone, tmpl.key, claim)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-[#EEF5EE] text-[#23282E] transition-colors font-medium text-[11px]"
              >
                {tmpl.label}
              </a>
            ))}
            <div className="border-t border-[#EFEAE1] pt-0.5">
              <a
                href={waLink(phone)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="block w-full text-left px-2 py-1 rounded hover:bg-[#FAF8F5] text-[#8A8375] italic text-[10.5px]"
              >
                💬 Deschide chat fără mesaj pre-definit
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
