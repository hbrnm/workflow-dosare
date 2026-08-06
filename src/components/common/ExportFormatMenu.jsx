import React, { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { EXPORT_FORMAT } from "../../utils/exportClaimsList";

/** Buton descărcare listă cu alegere Excel / PDF. */
export default function ExportFormatMenu({
  count = 0,
  disabled = false,
  onExport,
  className = "",
  label = "Descarcă listă",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (format) => {
    setOpen(false);
    onExport?.(format);
  };

  const countLabel = count > 0 ? ` (${count})` : "";

  return (
    <div ref={rootRef} className={`app-export-menu relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="app-table-export-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        title="Descarcă lista filtrată"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download size={14} />
        {label}{countLabel}
        <ChevronDown size={12} className={`opacity-70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="app-export-menu-panel absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[10.5rem] rounded-lg border py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(EXPORT_FORMAT.XLSX)}
            className="app-export-menu-item w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold"
          >
            <FileSpreadsheet size={14} />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(EXPORT_FORMAT.PDF)}
            className="app-export-menu-item w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold"
          >
            <FileText size={14} />
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}
