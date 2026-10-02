import React, { useState, useEffect, useCallback } from "react";
import {
  HardDrive, Image, Film, FileText, ExternalLink, Plus, Download, RefreshCw, Upload,
  CheckCircle2, AlertTriangle, FolderInput,
} from "lucide-react";
import {
  DRIVE_V2_CATEGORIES,
  getDriveCarV2,
  createDriveCarV2,
  createDriveClaim,
  findMatchingDriveClaim,
  getDriveClaimChecklist,
  uploadFilesToDriveClaim,
  getDriveClaimFileUrl,
  openClaimInExplorer,
  moveDriveFile,
  getDriveTemplates,
  attachDriveTemplate,
} from "../../../utils/localDriveService";
import { normalizePlate } from "../../../utils/plateSchedule";

const UNASSIGNED = "_De_repartizat";

function claimLabel(c) {
  const nr = c.numarDosar || (c.programari || [])[0] || "fără nr.";
  return `${String(c.id || "").slice(0, 10)} · ${c.asigurator || "—"} · ${nr}`;
}

function FileIcon({ f }) {
  if (f.isImage) return <Image size={15} className="text-[var(--app-muted)] shrink-0" />;
  if (f.isVideo) return <Film size={15} className="text-[var(--app-muted)] shrink-0" />;
  return <FileText size={15} className="text-[var(--app-muted)] shrink-0" />;
}

// Tab „Hard Drive” pentru serverul local v2: un folder per mașină, un subfolder per daună.
// Dauna se alege automat după numărul de dosar din fișa curentă.
export default function ClaimDriveTabV2({ form = {}, onNotify }) {
  const plate = normalizePlate(form?.numarInmatriculare || "");
  const numarDosar = String(form?.numarDosar || "").trim();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimId, setClaimId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("02_Foto_Intrare");
  const [checklist, setChecklist] = useState(null);
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const load = useCallback(async (preferClaimId) => {
    if (!plate) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDriveCarV2(plate);
      setCar(data);
      const match = findMatchingDriveClaim(data.claims, numarDosar);
      const keep = preferClaimId && data.claims.find((c) => c.id === preferClaimId);
      setClaimId(keep ? keep.id : match ? match.id : null);
    } catch (err) {
      setError(err.message);
      setCar(null);
    } finally {
      setLoading(false);
    }
  }, [plate, numarDosar]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!car || !claimId) {
      setChecklist(null);
      return;
    }
    getDriveClaimChecklist(car.name, claimId).then(setChecklist).catch(() => setChecklist(null));
  }, [car, claimId]);

  const claimFields = () => ({
    numarDosar,
    asigurator: form.asigurator || "",
    tipAsigurare: form.tipAsigurare === "CASCO" ? "CASCO" : "RCA",
  });

  const run = async (fn, okMsg) => {
    try {
      setBusy(true);
      const r = await fn();
      if (okMsg) onNotify?.(okMsg, "success");
      return r;
    } catch (err) {
      onNotify?.(`Eroare: ${err.message}`, "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCar = async () => {
    const r = await run(
      () => createDriveCarV2(plate, { clientName: form.client || "", clientPhone: form.telefonClient || "", vin: form.vin || "" }, claimFields()),
      `Folder creat pe calculator pentru ${plate}`
    );
    if (r) load(r.claimId);
  };

  const handleCreateClaim = async () => {
    const r = await run(() => createDriveClaim(car.name, claimFields()), "Dauna a fost creată pe calculator");
    if (r) load(r.claimId);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !claimId) return;
    onNotify?.(`Se încarcă ${files.length} fișier(e)...`, "info");
    const r = await run(() => uploadFilesToDriveClaim(car.name, claimId, activeCategory, files), "Fișiere încărcate pe calculator");
    if (r) load(claimId);
  };

  const handleOpenTemplates = async () => {
    const list = await run(() => getDriveTemplates());
    if (list) {
      setTemplates(list);
      setShowTemplates(true);
    }
  };

  const handleAttachTemplate = async (tmpl) => {
    const r = await run(() => attachDriveTemplate(car.name, tmpl.path, activeCategory, claimId), `Șablonul "${tmpl.name}" a fost adăugat`);
    if (r) {
      setShowTemplates(false);
      load(claimId);
    }
  };

  const handleAssign = async (f) => {
    const r = await run(
      () => moveDriveFile(car.name, { claim: UNASSIGNED, cat: f.cat || "", file: f.name }, { claim: claimId, cat: activeCategory }),
      `${f.name} → ${activeCategory}`
    );
    if (r) load(claimId);
  };

  if (!plate) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[var(--app-surface-2)] rounded-xl border border-[var(--app-border)]">
        <HardDrive size={36} className="mx-auto mb-2 text-slate-500" />
        <p className="font-bold">Completează numărul de înmatriculare pentru a conecta folderul de pe calculator.</p>
      </div>
    );
  }

  if (loading && !car) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[var(--app-surface-2)] rounded-xl border border-[var(--app-border)]">
        <RefreshCw className="animate-spin mx-auto mb-2 text-sky-500" size={24} />
        <p className="text-xs">Se caută dosarul {plate} pe calculator...</p>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="p-6 text-center bg-[var(--app-surface-2)] rounded-xl border border-dashed border-[var(--app-border)] space-y-3">
        <HardDrive size={24} className="mx-auto text-amber-500" />
        <h4 className="font-bold text-sm text-[var(--app-text-strong)]">Nu există încă un folder pe calculator pentru {plate}</h4>
        <p className="text-xs text-[var(--app-muted)]">Se creează folderul mașinii și dauna {numarDosar || "(fără nr. dosar)"} cu cele 8 categorii.</p>
        <button
          type="button"
          disabled={busy}
          onClick={handleCreateCar}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> {busy ? "Se creează..." : `Creează folderul ${plate}`}
        </button>
      </div>
    );
  }

  const claim = car.claims.find((c) => c.id === claimId) || null;
  const files = claim?.categories?.[activeCategory] || [];
  const unassigned = car.unassigned || [];

  return (
    <div className="space-y-4">
      {/* Antet: mașina + alegerea daunei */}
      <div className="p-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] space-y-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive size={16} className="text-[var(--app-success)] shrink-0" />
            <span className="text-xs font-mono font-bold text-[var(--app-text-strong)] truncate">{car.name}</span>
            <span className="text-[10px] text-[var(--app-muted)]">{car.claims.length} daun{car.claims.length === 1 ? "ă" : "e"}</span>
          </div>
          <div className="flex items-center gap-2">
            {claim && (
              <button
                type="button"
                onClick={() => run(() => openClaimInExplorer(car.name, claim.id), "Deschis în Explorer")}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--app-surface-2)] hover:bg-[var(--app-border-soft)] text-[var(--app-text-strong)] border border-[var(--app-border)] cursor-pointer"
              >
                <ExternalLink size={13} /> Explorer
              </button>
            )}
            {claim && (
              <button
                type="button"
                onClick={handleOpenTemplates}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--app-surface-2)] hover:bg-[var(--app-border-soft)] text-[var(--app-text-strong)] border border-[var(--app-border)] cursor-pointer"
              >
                <FileText size={13} /> Șabloane
              </button>
            )}
            <button
              type="button"
              onClick={() => load(claimId)}
              className="p-1.5 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-muted)] cursor-pointer"
              title="Reîncarcă"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={claimId || ""}
            onChange={(e) => setClaimId(e.target.value || null)}
            className="text-xs px-2 py-1.5 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-text-strong)] max-w-full"
          >
            <option value="">— alege dauna —</option>
            {car.claims.map((c) => (
              <option key={c.id} value={c.id}>{claimLabel(c)}</option>
            ))}
          </select>
          {!findMatchingDriveClaim(car.claims, numarDosar) && (
            <button
              type="button"
              disabled={busy}
              onClick={handleCreateClaim}
              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} /> Creează dauna {numarDosar || "nouă"}
            </button>
          )}
        </div>
        {!claim && (
          <p className="text-[11px] text-amber-500 flex items-center gap-1">
            <AlertTriangle size={12} /> Nicio daună de pe calculator nu are nr. dosar {numarDosar || "(gol)"}. Alege una din listă sau creeaz-o.
          </p>
        )}
      </div>

      {/* Lista de verificare */}
      {claim && checklist && (
        <div className={`p-3 rounded-xl border text-xs ${checklist.complet ? "border-[var(--app-success)]/40 bg-[var(--app-success)]/5" : "border-amber-500/40 bg-amber-500/5"}`}>
          <div className="font-bold mb-1.5 flex items-center gap-1.5 text-[var(--app-text-strong)]">
            {checklist.complet ? <CheckCircle2 size={14} className="text-[var(--app-success)]" /> : <AlertTriangle size={14} className="text-amber-500" />}
            Acte {checklist.tipAsigurare}: {checklist.complet ? "complet" : `lipsesc ${checklist.lipsa.length}`}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {checklist.items.map((i) => (
              <span
                key={i.key}
                title={i.fisiere?.join(", ") || i.sursa || ""}
                className={`px-2 py-0.5 rounded-full border ${i.ok ? "border-[var(--app-success)]/40 text-[var(--app-success)]" : "border-amber-500/40 text-amber-600"}`}
              >
                {i.ok ? "✓" : "✗"} {i.label}{i.sursa === "la_inspector" ? " (la inspector)" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Categorii */}
      {claim && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DRIVE_V2_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const count = claim.categories?.[cat.key]?.length || 0;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-bold"
                    : "bg-[var(--app-surface)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-text)]"
                }`}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{cat.icon}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">{count}</span>
                </div>
                <span className="text-[11px] leading-tight block truncate font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fișiere */}
      {claim && (
        <div className="p-3 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--app-text-strong)]">
              {activeCategory} ({files.length})
            </span>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-accent)] hover:opacity-80 cursor-pointer">
              <Upload size={14} /> Încarcă aici
              <input type="file" multiple onChange={handleUpload} className="hidden" />
            </label>
          </div>
          {files.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-lg">
              Niciun fișier în această categorie.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon f={f} />
                    <span className="font-mono text-[11px] truncate text-[var(--app-text-strong)]" title={f.name}>{f.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--app-muted)]">
                    <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                    <a
                      href={getDriveClaimFileUrl(car.name, claim.id, activeCategory, f.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-[var(--app-surface)] hover:text-[var(--app-accent)]"
                      title="Deschide fișierul"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fișiere nerepartizate pe daune */}
      {unassigned.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 text-xs space-y-2">
          <button
            type="button"
            onClick={() => setShowUnassigned((v) => !v)}
            className="font-bold text-[var(--app-text-strong)] flex items-center gap-1.5 cursor-pointer"
          >
            <FolderInput size={14} className="text-amber-500" /> {unassigned.length} fișier(e) nerepartizate pe o daună
          </button>
          {showUnassigned && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {!claim && <p className="text-amber-600">Alege întâi dauna în care vrei să muți fișierele.</p>}
              {unassigned.map((f) => (
                <div key={`${f.cat}/${f.name}`} className="flex items-center justify-between gap-2 p-1.5 rounded bg-[var(--app-surface)] border border-[var(--app-border)]">
                  <a
                    href={getDriveClaimFileUrl(car.name, UNASSIGNED, f.cat, f.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] truncate text-[var(--app-text-strong)] hover:underline"
                    title={`${f.cat}/${f.name}`}
                  >
                    {f.name}
                  </a>
                  <button
                    type="button"
                    disabled={!claim || busy}
                    onClick={() => handleAssign(f)}
                    className="shrink-0 px-2 py-0.5 rounded bg-sky-600 disabled:opacity-40 text-white font-semibold text-[10px] cursor-pointer"
                    title={claim ? `Mută în ${claim.id} / ${activeCategory}` : ""}
                  >
                    → {activeCategory}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Șabloane */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-2xl overflow-hidden text-xs">
            <div className="p-3 border-b border-[var(--app-border)] flex items-center justify-between">
              <h4 className="font-bold text-[var(--app-text-strong)]">Șabloane pe calculator → {activeCategory}</h4>
              <button type="button" onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
              {templates.length === 0 ? (
                <p className="text-center text-slate-400 p-4">Nu s-au găsit șabloane pe calculator.</p>
              ) : (
                templates.map((tmpl) => (
                  <div key={tmpl.path} className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)]">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-purple-400 font-semibold block">{tmpl.category}</span>
                      <strong className="text-[var(--app-text-strong)] truncate block">{tmpl.name}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttachTemplate(tmpl)}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                    >
                      Atașează
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
