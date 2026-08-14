import React from "react";
import { FileText, X, Trash2, Plus, Loader2, Save } from "lucide-react";

export default function ClaimScannerOverlay({
  scanSession,
  setScanSession,
  uploadingDocumente = false,
  uploadingPoze = false,
  handleAddPageToScan,
  handleSaveMultiPageScan,
}) {
  if (!scanSession) return null;

  return (
    <div className="absolute inset-0 bg-[var(--app-surface)]/95 z-50 flex flex-col p-4 text-white">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
        <h3 className="font-bold text-[13.5px] flex items-center gap-1.5 text-[var(--app-accent)]">
          <FileText size={16} /> Scanare document pagini multiple
        </h3>
        <button
          type="button"
          onClick={() => setScanSession(null)}
          className="text-white/70 hover:text-white cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {scanSession.pages.map((pageDataUrl, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/20 aspect-[3/4] bg-white/5">
              <img src={pageDataUrl} alt={`Pagina ${idx + 1}`} className="w-full h-full object-contain" />
              <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                Pag. {idx + 1}
              </div>
              <button
                type="button"
                onClick={() => {
                  setScanSession((prev) => ({
                    ...prev,
                    pages: prev.pages.filter((_, i) => i !== idx),
                  }));
                }}
                className="absolute top-1 right-1 bg-[var(--app-danger)] text-white rounded p-1 hover:opacity-80 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 cursor-pointer aspect-[3/4] bg-white/5 transition-all text-center p-2 hover:bg-white/10">
            <Plus size={20} className="text-[var(--app-accent)]" />
            <span className="text-[11px] font-semibold text-white/80">Adaugă pagină</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleAddPageToScan?.(e.target.files)}
            />
          </label>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full">
            <label className="block text-[10.5px] text-white/60 font-semibold mb-1">
              Nume fișier (fără extensie)
            </label>
            <div className="flex items-center gap-1 bg-white/5 border border-white/20 rounded-lg px-2.5 py-1.5">
              <input
                className="bg-transparent border-0 text-[13px] text-white focus:outline-hidden w-full placeholder:text-white/30"
                placeholder="ex: Declaratie_accident"
                value={scanSession.fileName}
                onChange={(e) =>
                  setScanSession((prev) => ({ ...prev, fileName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0 self-stretch sm:self-auto justify-center">
            <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
              <input
                type="checkbox"
                checked={scanSession.saveAsPdf}
                onChange={(e) =>
                  setScanSession((prev) => ({ ...prev, saveAsPdf: e.target.checked }))
                }
                className="rounded border-white/20 bg-white/5 text-[var(--app-accent)] focus:ring-0 focus:ring-offset-0"
              />
              <span>Salvează ca PDF unic</span>
            </label>
            <label className="flex items-center gap-2 text-[11.5px] font-semibold select-none cursor-pointer">
              <input
                type="checkbox"
                checked={scanSession.saveAsPhotos}
                onChange={(e) =>
                  setScanSession((prev) => ({ ...prev, saveAsPhotos: e.target.checked }))
                }
                className="rounded border-white/20 bg-white/5 text-[var(--app-accent)] focus:ring-0 focus:ring-offset-0"
              />
              <span>Salvează ca poze în Galerie</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setScanSession(null)}
            className="px-4 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 text-[12.5px] font-semibold text-white/80 transition-colors cursor-pointer"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={handleSaveMultiPageScan}
            disabled={scanSession.pages.length === 0}
            className="flex items-center gap-1 px-5 py-1.5 rounded-lg bg-[var(--app-accent)] text-white text-[12.5px] font-bold hover:bg-[var(--app-accent-hover)] shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {uploadingDocumente || uploadingPoze ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Se salvează...
              </>
            ) : (
              <>
                <Save size={13} /> Finalizează ({scanSession.pages.length} pag.)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
