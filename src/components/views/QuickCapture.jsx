import React, { useState, useMemo } from "react";
import {
  X, ChevronLeft, Camera, Upload, FileText, Search, Loader2, Car, ImageIcon,
  Trash2, CheckCircle2, FolderOpen
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { getStatusDefinition, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES, MAX_POZE_PER_DOSAR, MAX_DOCUMENTE_PER_DOSAR } from "../../constants/config";
import { uid } from "../../utils/dateUtils";
import { refreshStorageUrls, uploadStorageItem } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import Pill from "../common/Pill";

export default function QuickCapture({ claims, onClose, onPatch, canEditFn, onNotify }) {
  const [step, setStep] = useState("pick"); // "pick" | "capture"
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [poze, setPoze] = useState([]);
  const [documente, setDocumente] = useState([]);
  const [pending, setPending] = useState([]); // { tempId, kind, name, previewUrl }
  const [loadingMedia, setLoadingMedia] = useState(false);

  const editableClaims = useMemo(() => claims.filter((c) => canEditFn(c)), [claims, canEditFn]);

  const recent = useMemo(
    () => [...editableClaims].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || "")).slice(0, 10),
    [editableClaims]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return editableClaims.filter((c) =>
      (c.numarDosar || "").toLowerCase().includes(q) ||
      (c.client || "").toLowerCase().includes(q) ||
      (c.numarInmatriculare || "").toLowerCase().includes(q) ||
      (c.vin || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [editableClaims, query, recent]);

  const selectClaim = async (c) => {
    setSelected(c);
    setStep("capture");
    setPoze(c.poze || []);
    setDocumente(c.documente || []);
    setLoadingMedia(true);
    const [p, d] = await Promise.all([
      refreshStorageUrls(c.poze || [], "poze-dosare", supabase),
      refreshStorageUrls(c.documente || [], "documente-dosare", supabase),
    ]);
    setPoze(p);
    setDocumente(d);
    setLoadingMedia(false);
  };

  const backToPick = () => {
    setStep("pick");
    setSelected(null);
    setPoze([]);
    setDocumente([]);
    setPending([]);
  };

  const handleFiles = async (fileList, kind) => {
    const files = Array.from(fileList || []);
    if (!files.length || !selected) return;

    const limit = kind === "poza" ? MAX_POZE_PER_DOSAR : MAX_DOCUMENTE_PER_DOSAR;
    let currentPoze = poze;
    let currentDocs = documente;
    let usedSlots = kind === "poza" ? currentPoze.length : currentDocs.length;

    const queue = [];
    for (const f of files) {
      if (usedSlots >= limit) {
        onNotify(`Ai atins limita de ${limit} ${kind === "poza" ? "poze" : "documente"} pentru acest dosar.`, "error");
        break;
      }
      queue.push({ tempId: uid(), file: f, kind, name: f.name, previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null });
      usedSlots += 1;
    }
    if (!queue.length) return;

    setPending((p) => [...queue, ...p]);

    for (const item of queue) {
      try {
        const isImage = item.file.type.startsWith("image/");
        const toUpload = isImage ? await compressImage(item.file) : item.file;
        if (toUpload.size > MAX_UPLOAD_SIZE_BYTES) {
          throw new Error(`fișierul depășește ${MAX_UPLOAD_SIZE_MB}MB`);
        }
        const bucket = kind === "poza" ? "poze-dosare" : "documente-dosare";
        const folder = kind === "poza" ? "poze" : "documente";
        const uploaded = await uploadStorageItem(supabase, bucket, selected.id, toUpload, folder);

        if (kind === "poza") {
          currentPoze = [uploaded, ...currentPoze];
          setPoze(currentPoze);
          onPatch(selected.id, { poze: currentPoze });
        } else {
          currentDocs = [uploaded, ...currentDocs];
          setDocumente(currentDocs);
          onPatch(selected.id, { documente: currentDocs });
        }
      } catch (err) {
        onNotify(`Eroare la „${item.name}": ${err.message || err}`, "error");
      } finally {
        setPending((p) => p.filter((x) => x.tempId !== item.tempId));
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    }
  };

  const removePoza = async (poza) => {
    if (poza?.path) await supabase.storage.from("poze-dosare").remove([poza.path]);
    const next = poze.filter((p) => p.id !== poza.id);
    setPoze(next);
    onPatch(selected.id, { poze: next });
  };

  const removeDoc = async (doc) => {
    if (doc?.path) await supabase.storage.from("documente-dosare").remove([doc.path]);
    const next = documente.filter((d) => d.id !== doc.id);
    setDocumente(next);
    onPatch(selected.id, { documente: next });
  };

  const pendingPoze = pending.filter((p) => p.kind === "poza");
  const pendingDocs = pending.filter((p) => p.kind === "document");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-5 overflow-y-auto">
      <div className="bg-[#FCFAF5] w-full h-[100dvh] sm:h-auto max-w-lg rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-[#DAD4C6] flex flex-col max-h-[100dvh] sm:max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#23282E] text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "capture" ? (
              <button onClick={backToPick} className="p-1 -ml-1 rounded-md hover:bg-white/10 shrink-0" title="Schimbă dosarul">
                <ChevronLeft size={20} />
              </button>
            ) : (
              <Camera size={18} className="text-[#C98A2B] shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-[13.5px] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {step === "pick" ? "Poze & documente rapid" : (selected?.numarDosar || "(fără nr.)")}
              </div>
              {step === "capture" && selected && (
                <div className="text-[11px] text-white/60 truncate">{selected.client || "Client neintrodus"} · {selected.numarInmatriculare || "—"}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 shrink-0">
            <X size={20} />
          </button>
        </div>

        {step === "pick" ? (
          <>
            {/* Search */}
            <div className="px-3 py-2.5 bg-white border-b border-[#DAD4C6] shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8375]" />
                <input
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#DAD4C6] text-[14px] bg-[#FAF8F5] focus:bg-white"
                  placeholder="Caută nr. dosar, client, nr. auto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-1 pb-1.5">
                {query.trim() ? `${results.length} rezultat(e)` : "Dosare recente"}
              </div>
              <div className="space-y-1.5">
                {results.map((c) => {
                  const s = getStatusDefinition(c.status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectClaim(c)}
                      className="w-full flex items-center gap-2.5 bg-white border border-[#DAD4C6] rounded-lg px-3 py-2.5 text-left hover:border-[#C98A2B] hover:shadow-sm transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#DAD4C6] flex items-center justify-center shrink-0 text-[#8A8375]">
                        <Car size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[13px] text-[#23282E] truncate">{c.numarDosar || "(fără nr.)"}</span>
                          <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>{c.tipAsigurare}</Pill>
                        </div>
                        <div className="text-[11.5px] text-[#6B6558] truncate">{c.client || "Client neintrodus"} · {c.numarInmatriculare || "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-[10px]">
                        <span className="text-[#8A8375] font-semibold">{String(s.num).padStart(2, "0")}. {s.label}</span>
                        {(c.poze?.length > 0) && (
                          <span className="flex items-center gap-0.5 text-[#3B5166] font-bold"><ImageIcon size={10} /> {c.poze.length}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {results.length === 0 && (
                  <div className="text-center py-10 text-[12.5px] text-[#8A8375] italic">Niciun dosar găsit.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
            {/* Camera action */}
            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#C98A2B]/50 rounded-xl py-6 bg-[#FBF3E6] hover:bg-[#F7EAD3] transition-colors cursor-pointer">
              <Camera size={28} className="text-[#C98A2B]" />
              <span className="text-[13.5px] font-bold text-[#7A5316]">Fotografiază</span>
              <span className="text-[10.5px] text-[#8A8375]">se comprimă și se încarcă automat</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handleFiles(e.target.files, "poza"); e.target.value = ""; }} />
            </label>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-1.5 border border-[#DAD4C6] rounded-lg py-2.5 bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer text-[12px] font-semibold text-[#3B5166]">
                <Upload size={15} /> Din galerie
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, "poza"); e.target.value = ""; }} />
              </label>
              <label className="flex items-center justify-center gap-1.5 border border-[#DAD4C6] rounded-lg py-2.5 bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer text-[12px] font-semibold text-[#3B5166]">
                <FolderOpen size={15} /> Document
                <input type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files, "document"); e.target.value = ""; }} />
              </label>
            </div>

            {/* Photo grid */}
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-0.5 pb-1.5 flex items-center gap-1.5">
                <ImageIcon size={12} /> Poze ({poze.length + pendingPoze.length})
                {loadingMedia && <Loader2 size={11} className="animate-spin" />}
              </div>
              {poze.length === 0 && pendingPoze.length === 0 ? (
                <div className="text-[11.5px] text-[#8A8375] italic py-4 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                  Nicio fotografie încă — apasă „Fotografiază” mai sus.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {pendingPoze.map((p) => (
                    <div key={p.tempId} className="relative rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                      {p.previewUrl && <img src={p.previewUrl} alt="" className="w-full h-full object-cover opacity-50" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    </div>
                  ))}
                  {poze.map((p) => (
                    <div key={p.id} className="relative group rounded-lg overflow-hidden border border-[#DAD4C6] bg-black/5 aspect-square">
                      <a href={p.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img src={p.url} alt={p.nume} className="w-full h-full object-cover" />
                      </a>
                      <button type="button" onClick={() => removePoza(p)} className="absolute top-1 right-1 bg-black/70 hover:bg-[#B23A2E] text-white rounded p-1">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents list */}
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A8375] px-0.5 pb-1.5 flex items-center gap-1.5">
                <FileText size={12} /> Documente ({documente.length + pendingDocs.length})
              </div>
              <div className="space-y-1.5">
                {pendingDocs.map((d) => (
                  <div key={d.tempId} className="flex items-center gap-2 bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                    <Loader2 size={13} className="animate-spin text-[#8A8375] shrink-0" />
                    <span className="truncate flex-1 text-[#8A8375]">{d.name}</span>
                  </div>
                ))}
                {documente.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-white border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={14} className="text-[#3B5166] shrink-0" />
                      <a href={d.url || d.link} target="_blank" rel="noreferrer" className="text-[#2C4160] font-semibold hover:underline truncate flex-1">{d.nume}</a>
                    </div>
                    <button type="button" onClick={() => removeDoc(d)} className="text-[#B23A2E] hover:opacity-70 ml-2 p-1"><Trash2 size={13} /></button>
                  </div>
                ))}
                {documente.length === 0 && pendingDocs.length === 0 && (
                  <div className="text-[11.5px] text-[#8A8375] italic py-3 text-center border border-dashed border-[#DAD4C6] rounded-lg">
                    Niciun document atașat.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {step === "capture" && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-[#DAD4C6] bg-white shrink-0">
            <button type="button" onClick={backToPick} className="px-3 py-1.5 rounded border border-[#C7C0B0] text-[12px] font-semibold text-[#4A443A] hover:bg-[#EFEAE1]">
              Alt dosar
            </button>
            <button type="button" onClick={onClose} className="flex items-center gap-1 px-4 py-1.5 rounded bg-[#3E6B45] text-white text-[12.5px] font-bold hover:bg-[#345A3B]">
              <CheckCircle2 size={14} /> Am terminat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
