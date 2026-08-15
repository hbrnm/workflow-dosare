import React from "react";
import {
  ImageIcon, Download, Car, ClipboardList, Sparkles, Loader2, Upload,
  Trash2, FolderOpen, FileText
} from "lucide-react";

export default function ClaimMediaTab({
  form,
  uploadingPoze = false,
  uploadingDocumente = false,
  downloadingZip = false,
  handleUploadPoze,
  handleUploadDocumente,
  handleDownloadZip,
  removePoza,
  removeDoc,
  setPreviewPozaIndex,
  setCropMode,
  setCropImageSrc,
  onOpenLiveCamera,
}) {
  const pozeList = Array.isArray(form.poze) ? form.poze : [];
  const documenteList = Array.isArray(form.documente) ? form.documente : [];

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {/* Galerie Poze */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
          <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Galerie Poze ({pozeList.length})</span>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip || pozeList.length === 0}
            className="text-[11px] font-bold text-[var(--app-muted)] hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <Download size={12} /> Descarcă ZIP
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10.5px] font-bold text-[var(--app-muted)]">Adaugă poze direct în Categorie:</div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <Car size={12} /> <span>Recepție</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "receptie")} />
            </label>
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <ClipboardList size={12} /> <span>Reconstatare</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "reconstatare")} />
            </label>
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <Sparkles size={12} /> <span>Predare</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "predare")} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--app-border)]">
          <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
            {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Galerie generală</>}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUploadPoze(e.target.files, "generale")} />
          </label>
          <button type="button" onClick={() => onOpenLiveCamera?.("generale")} className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${uploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
            {uploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><Car size={13} /> Cameră auto</>}
          </button>
        </div>

        {pozeList.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1 pt-1">
            {pozeList.map((p, idx) => (
              <div key={p.id || idx} className="relative group rounded-lg overflow-hidden border border-[var(--app-border)] bg-black/5 aspect-square">
                <button type="button" onClick={() => setPreviewPozaIndex(idx)} className="w-full h-full block text-left cursor-pointer">
                  <img src={p.url} alt={p.nume || "foto"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
                {p.categoria && p.categoria !== "generale" && (
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded uppercase pointer-events-none">
                    {p.categoria}
                  </span>
                )}
                <button type="button" onClick={() => removePoza(p)} className="absolute top-1 right-1 bg-black/70 hover:bg-[var(--app-danger)] text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-[var(--app-muted)] italic p-8 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
            Nicio fotografie adăugată. Adaugă poze folosind butoanele de mai sus.
          </div>
        )}
      </div>

      {/* Documente PDF & Scaner Pro */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
          <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documente PDF &amp; Scanate ({documenteList.length})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-muted)]/40 text-[var(--app-muted)] font-bold"}`}>
            {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Se încarcă...</> : <><Upload size={13} /> Încarcă documente</>}
            <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
          </label>
          <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${uploadingDocumente ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-accent)]/40 text-[var(--app-warning)] font-bold"}`}>
            {uploadingDocumente ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><FileText size={13} /> Scanează &amp; Crop Pro</>}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCropMode("document");
                  const reader = new FileReader();
                  reader.onload = (ev) => setCropImageSrc(ev.target.result);
                  reader.readAsDataURL(file);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {documenteList.map((d) => (
            <div key={d.id} className="flex items-center justify-between bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[12px]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText size={14} className="text-[var(--app-muted)] shrink-0" />
                <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[var(--app-text)] font-semibold hover:underline truncate flex-1">{d.nume}</a>
              </div>
              <button type="button" onClick={() => removeDoc(d.id)} className="text-[var(--app-danger)] hover:opacity-70 ml-2 p-1 cursor-pointer"><Trash2 size={13} /></button>
            </div>
          ))}
          {documenteList.length === 0 && (
            <div className="text-[12px] text-[var(--app-muted)] italic p-8 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
              Niciun document atașat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
