import React, { useState, useMemo } from "react";
import {
  ImageIcon, Download, Car, ClipboardList, Sparkles, Loader2, Upload,
  Trash2, FolderOpen, FileText, Filter, Tag, Eye, EyeOff
} from "lucide-react";
import { CAR_PANELS } from "../../common/CarDamageVisualSelector";

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
  onTogglePozaClient,
  setPreviewPozaIndex,
  setCropMode,
  setCropImageSrc,
  onOpenLiveCamera,
}) {
  const isUploadingPoze = Boolean(uploadingPoze);
  const pozeProgress = typeof uploadingPoze === "object" && uploadingPoze !== null ? uploadingPoze : null;

  const isUploadingDocs = Boolean(uploadingDocumente);
  const docsProgress = typeof uploadingDocumente === "object" && uploadingDocumente !== null ? uploadingDocumente : null;

  const pozeList = Array.isArray(form.poze) ? form.poze : [];
  const documenteList = Array.isArray(form.documente) ? form.documente : [];

  const [selectedReperFilter, setSelectedReperFilter] = useState("toate");
  const [selectedUploadReper, setSelectedUploadReper] = useState("");

  // Extrage lista unică a reperelor care au fotografii atașate
  const repereWithPhotos = useMemo(() => {
    const map = {};
    pozeList.forEach((p) => {
      if (p.reper) {
        map[p.reper] = {
          id: p.reper,
          label: p.reperLabel || p.reper,
          count: (map[p.reper]?.count || 0) + 1,
        };
      }
    });
    return Object.values(map);
  }, [pozeList]);

  // Lista de fotografii filtrate
  const filteredPoze = useMemo(() => {
    if (selectedReperFilter === "toate") return pozeList;
    return pozeList.filter((p) => p.reper === selectedReperFilter);
  }, [pozeList, selectedReperFilter]);

  const onUploadCategory = (files, cat) => {
    const reperObj = selectedUploadReper ? CAR_PANELS.find((p) => p.id === selectedUploadReper) : null;
    handleUploadPoze(files, cat, reperObj);
  };

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {/* Galerie Poze organizată pe Repere Avariate */}
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

        {/* Selector Reper Avariat pentru Upload */}
        <div className="bg-[var(--app-surface)] border border-[var(--app-border-soft)] rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[var(--app-text)] flex items-center gap-1">
              <Tag size={12} className="text-[var(--app-accent)]" /> Reper caroserie pentru foto:
            </span>
            {selectedUploadReper && (
              <button
                type="button"
                onClick={() => setSelectedUploadReper("")}
                className="text-[10px] text-[var(--app-muted)] hover:underline"
              >
                Resetează (Generale)
              </button>
            )}
          </div>
          <select
            value={selectedUploadReper}
            onChange={(e) => setSelectedUploadReper(e.target.value)}
            className="w-full text-[11.5px] bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-md px-2 py-1.5 text-[var(--app-text)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
          >
            <option value="">Fără reper specific (Generale)</option>
            {CAR_PANELS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Butoane Upload Categorie */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-bold text-[var(--app-muted)]">Adaugă poze direct în Categorie:</div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <Car size={12} /> <span>Recepție</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadCategory(e.target.files, "receptie")} />
            </label>
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <ClipboardList size={12} /> <span>Reconstatare</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadCategory(e.target.files, "reconstatare")} />
            </label>
            <label className="flex items-center justify-center gap-1 border border-dashed border-[var(--app-border)] rounded-lg p-2 bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] cursor-pointer text-[var(--app-text)] font-semibold text-center">
              <Sparkles size={12} /> <span>Predare</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadCategory(e.target.files, "predare")} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--app-border)]">
          <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${isUploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
            {isUploadingPoze ? (
              <>
                <Loader2 size={13} className="animate-spin text-[var(--app-accent)]" />
                <span>
                  {pozeProgress?.total > 1
                    ? `Se încarcă ${pozeProgress.current}/${pozeProgress.total}...`
                    : "Se încarcă..."}
                </span>
              </>
            ) : (
              <><Upload size={13} /> Galerie generală</>
            )}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUploadCategory(e.target.files, "generale")} />
          </label>
          <button type="button" onClick={() => onOpenLiveCamera?.("generale")} className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2 text-[11.5px] cursor-pointer transition-all ${isUploadingPoze ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-muted)] font-bold"}`}>
            {isUploadingPoze ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><Car size={13} /> Cameră auto</>}
          </button>
        </div>

        {/* Filtru pe repere dacă există fotografii etichetate */}
        {repereWithPhotos.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10.5px]">
            <Filter size={11} className="text-[var(--app-muted)] shrink-0" />
            <button
              type="button"
              onClick={() => setSelectedReperFilter("toate")}
              className={`px-2 py-0.5 rounded-full border shrink-0 font-medium transition-colors ${
                selectedReperFilter === "toate"
                  ? "bg-[var(--app-accent)] text-white border-[var(--app-accent)]"
                  : "bg-[var(--app-surface)] text-[var(--app-muted)] border-[var(--app-border)] hover:text-[var(--app-text)]"
              }`}
            >
              Toate ({pozeList.length})
            </button>
            {repereWithPhotos.map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedReperFilter(rep.id)}
                className={`px-2 py-0.5 rounded-full border shrink-0 font-medium transition-colors ${
                  selectedReperFilter === rep.id
                    ? "bg-[var(--app-accent)] text-white border-[var(--app-accent)]"
                    : "bg-[var(--app-surface)] text-[var(--app-muted)] border-[var(--app-border)] hover:text-[var(--app-text)]"
                }`}
              >
                {rep.label} ({rep.count})
              </button>
            ))}
          </div>
        )}

        {filteredPoze.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1 pt-1">
            {filteredPoze.map((p, idx) => (
              <div key={p.id || idx} className="relative group rounded-lg overflow-hidden border border-[var(--app-border)] bg-black/5 aspect-square">
                <button type="button" onClick={() => setPreviewPozaIndex(pozeList.indexOf(p))} className="w-full h-full block text-left cursor-pointer">
                  <img src={p.url} alt={p.nume || "foto"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
                <div className="absolute bottom-1 left-1 flex flex-col gap-0.5 pointer-events-none max-w-[85%]">
                  {p.vizibilClient && (
                    <span className="bg-emerald-900/90 text-emerald-200 text-[8.5px] font-bold px-1 rounded truncate border border-emerald-500/40 flex items-center gap-0.5">
                      <Eye size={9} /> Vizibil Client
                    </span>
                  )}
                  {p.reperLabel && (
                    <span className="bg-sky-950/80 text-sky-200 text-[8.5px] font-bold px-1 rounded truncate border border-sky-600/40">
                      {p.reperLabel}
                    </span>
                  )}
                  {p.categoria && p.categoria !== "generale" && (
                    <span className="bg-black/70 text-white text-[8.5px] font-bold px-1 rounded uppercase truncate">
                      {p.categoria}
                    </span>
                  )}
                </div>
                <div className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity ${p.vizibilClient ? "opacity-100" : "opacity-90 sm:opacity-0 sm:group-hover:opacity-100"}`}>
                  {onTogglePozaClient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePozaClient(p);
                      }}
                      className={`rounded p-1 text-white shadow-sm transition-all cursor-pointer ${
                        p.vizibilClient
                          ? "bg-emerald-600 hover:bg-emerald-700 ring-1 ring-white/50"
                          : "bg-black/75 hover:bg-black text-slate-300"
                      }`}
                      title={p.vizibilClient ? "Vizibilă pentru client pe link (Click pentru a ascunde)" : "Ascunsă de client (Click pentru a face vizibilă pe link)"}
                      aria-label={p.vizibilClient ? "Ascunde poza de client" : "Fă poza vizibilă clientului"}
                    >
                      {p.vizibilClient ? <Eye size={13} className="text-white" /> : <EyeOff size={13} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePoza(p);
                    }}
                    className="bg-black/70 hover:bg-[var(--app-danger)] text-white rounded p-1 transition-colors cursor-pointer"
                    title="Șterge fotografia"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        ) : (
          <div className="text-[12px] text-[var(--app-muted)] italic p-8 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
            {selectedReperFilter !== "toate"
              ? "Nicio fotografie pentru reperul selectat."
              : "Nicio fotografie adăugată. Adaugă poze folosind butoanele de mai sus."}
          </div>
        )}
      </div>

      {/* Documente PDF & Scaner Pro */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs flex flex-col">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
          <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Documente PDF &amp; Scanate ({documenteList.length})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${isUploadingDocs ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-muted)]/40 text-[var(--app-muted)] font-bold"}`}>
            {isUploadingDocs ? (
              <>
                <Loader2 size={13} className="animate-spin text-[var(--app-accent)]" />
                <span>
                  {docsProgress?.total > 1
                    ? `Se încarcă ${docsProgress.current}/${docsProgress.total}...`
                    : "Se încarcă..."}
                </span>
              </>
            ) : (
              <><Upload size={13} /> Încarcă documente</>
            )}
            <input type="file" multiple className="hidden" onChange={(e) => handleUploadDocumente(e.target.files)} />
          </label>
          <button
            type="button"
            onClick={() => onOpenLiveCamera?.("scan_crop")}
            disabled={isUploadingDocs}
            className={`flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] cursor-pointer transition-all ${isUploadingDocs ? "opacity-50 pointer-events-none" : "hover:bg-[var(--app-surface-2)] border-[var(--app-accent)]/40 text-[var(--app-warning)] font-bold"}`}
          >
            {isUploadingDocs ? <><Loader2 size={13} className="animate-spin" /> Cameră...</> : <><FileText size={13} /> Scanează &amp; Crop Pro</>}
          </button>
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
