import React, { useState, useRef, useEffect } from "react";
import { Printer, FileSpreadsheet, FileText } from "lucide-react";
import { EXPORT_FORMAT } from "../../utils/exportClaimsList";
import AppButton from "./AppButton";

/** Buton print/export listă — doar icoană imprimantă, meniu Excel / PDF. */
export default function ExportFormatMenu({
  count = 0,
  disabled = false,
  onExport,
  className = "",
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

  const title =
    count > 0
      ? `Printează / exportă lista (${count})`
      : "Printează / exportă lista";

  return (
    <div ref={rootRef} className={`app-export-menu relative ${className}`}>
      <AppButton
        variant="icon"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="app-table-export-btn"
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Printer size={16} />
      </AppButton>

      {open && (
        <div
          role="menu"
          className="app-export-menu-panel absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[11rem] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-2xl animate-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(EXPORT_FORMAT.XLSX)}
            className="app-export-menu-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[12px] font-bold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] transition-colors"
          >
            <FileSpreadsheet size={15} className="text-[var(--app-accent)] shrink-0" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(EXPORT_FORMAT.PDF)}
            className="app-export-menu-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[12px] font-bold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] transition-colors"
          >
            <FileText size={15} className="text-[var(--app-accent)] shrink-0" />
            <span>PDF (.pdf)</span>
          </button>
        </div>
      )}
    </div>
  );
}
