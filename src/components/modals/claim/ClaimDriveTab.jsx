import React, { useState, useEffect } from "react";
import {
  HardDrive, Folder, File, Image, Film, FileText, ExternalLink,
  Sparkles, Plus, Download, RefreshCw, Upload, FileCheck
} from "lucide-react";
import {
  getDriveCarDetails,
  openCarInExplorer,
  organizeDriveFiles,
  getDriveFileUrl,
  createDriveCar,
  getDriveTemplates,
  attachDriveTemplate,
  uploadFilesToDrive,
} from "../../../utils/localDriveService";
import { normalizePlate } from "../../../utils/plateSchedule";

const CATEGORIES = [
  { key: "01_Acte_Client", label: "01 Acte Client", icon: "📑" },
  { key: "02_Asigurator_si_Dauna", label: "02 Asigurator & Daună", icon: "📄" },
  { key: "03_Foto_Dauna", label: "03 Foto Daună", icon: "📷" },
  { key: "04_Reconstatare", label: "04 Reconstatare", icon: "🔧" },
  { key: "05_Dosar_Final", label: "05 Dosar Final", icon: "🏁" },
];

export default function ClaimDriveTab({ form, onNotify }) {
  const plate = normalizePlate(form.numarInmatriculare || "");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("03_Foto_Dauna");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const loadDetails = async () => {
    if (!plate) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDriveCarDetails(plate);
      setDetails(data);
    } catch (err) {
      setError(err.message);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [plate]);

  const handleCreateFolder = async () => {
    if (!plate) return;
    try {
      setCreatingFolder(true);
      await createDriveCar({
        plate,
        clientName: form.client || "",
        clientPhone: form.telefonClient || "",
        vin: form.vin || "",
        numarDosar: form.numarDosar || "",
        status: form.status || "Constatare",
      });
      onNotify?.(`Folder fizic creat pe Hard Drive pentru ${plate}!`, "success");
      loadDetails();
    } catch (err) {
      onNotify?.(`Eroare: ${err.message}`, "error");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleOpenExplorer = async () => {
    if (!plate) return;
    try {
      await openCarInExplorer(plate);
      onNotify?.(`Deschis în Windows Explorer: ${plate}`, "success");
    } catch (err) {
      onNotify?.(`Eroare deschidere: ${err.message}`, "error");
    }
  };

  const handleOrganize = async () => {
    try {
      const res = await organizeDriveFiles();
      onNotify?.(`Organizare finalizată: ${res.movedCount || 0} fișiere sortate.`, "success");
      loadDetails();
    } catch (err) {
      onNotify?.(`Eroare: ${err.message}`, "error");
    }
  };

  const handleOpenTemplates = async () => {
    try {
      const list = await getDriveTemplates();
      setTemplates(list);
      setShowTemplatesModal(true);
    } catch (err) {
      onNotify?.(`Eroare șabloane: ${err.message}`, "error");
    }
  };

  const handleAttachTemplate = async (tmpl) => {
    if (!plate) return;
    try {
      await attachDriveTemplate(plate, tmpl.path, activeCategory);
      onNotify?.(`Șablonul "${tmpl.name}" a fost adăugat în folderul fizic!`, "success");
      setShowTemplatesModal(false);
      loadDetails();
    } catch (err) {
      onNotify?.(`Eroare: ${err.message}`, "error");
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !plate) return;
    try {
      onNotify?.(`Se încarcă ${files.length} fișier(e) pe Hard Drive...`, "info");
      await uploadFilesToDrive(plate, activeCategory, files);
      onNotify?.("Fișiere încărcate cu succes direct pe Hard Drive!", "success");
      loadDetails();
    } catch (err) {
      onNotify?.(`Eroare upload: ${err.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  if (!plate) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[var(--app-surface-2)] rounded-xl border border-[var(--app-border)]">
        <HardDrive size={36} className="mx-auto mb-2 text-slate-500" />
        <p className="font-bold">Completează numărul de înmatriculare pentru a conecta folderul fizic.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 bg-[var(--app-surface-2)] rounded-xl border border-[var(--app-border)]">
        <RefreshCw className="animate-spin mx-auto mb-2 text-sky-500" size={24} />
        <p className="text-xs">Se verifică folderul C:\DOSARE\{plate}...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="p-6 text-center bg-[var(--app-surface-2)] rounded-xl border border-dashed border-[var(--app-border)] space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
          <HardDrive size={24} />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--app-text-strong)]">
            Nu există încă un folder pe calculator pentru {plate}
          </h4>
          <p className="text-xs text-[var(--app-muted)] mt-1">
            Poți crea automat folderul standardizat cu cele 5 categorii pe hard drive cu un singur click.
          </p>
        </div>
        <button
          type="button"
          disabled={creatingFolder}
          onClick={handleCreateFolder}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> {creatingFolder ? "Se creează..." : `Creează Folderul C:\\DOSARE\\${plate}`}
        </button>
      </div>
    );
  }

  const categoryFiles = details?.categories?.[activeCategory] || [];

  return (
    <div className="space-y-4">
      {/* Top Banner with Quick Actions */}
      <div className="p-3 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <HardDrive size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Folder Fizic Conectat
            </span>
            <span className="text-xs font-mono font-bold text-[var(--app-text-strong)] truncate block">
              C:\DOSARE\{plate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenExplorer}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} /> Deschide în Windows Explorer
          </button>

          <button
            type="button"
            onClick={handleOrganize}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition-colors cursor-pointer"
          >
            <Sparkles size={13} /> Curăță &amp; Sortează
          </button>

          <button
            type="button"
            onClick={handleOpenTemplates}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-colors cursor-pointer"
          >
            <FileText size={13} /> Atașează Șablon
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          const count = details?.categories?.[cat.key]?.length || 0;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-400/15 border-amber-400 text-[var(--app-text-strong)] font-bold shadow-xs"
                  : "bg-[var(--app-surface)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-text)]"
              }`}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{cat.icon}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    count > 0 ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </div>
              <span className="text-[11px] leading-tight block truncate font-medium">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Files in Selected Category */}
      <div className="p-3 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--app-text-strong)]">
            Fișiere în {activeCategory} ({categoryFiles.length})
          </span>

          <label className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-500 cursor-pointer">
            <Upload size={14} /> Încarcă în acest folder
            <input type="file" multiple onChange={handleUpload} className="hidden" />
          </label>
        </div>

        {categoryFiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-lg">
            Niciun fișier pe hard drive în acest folder.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {categoryFiles.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {f.isImage ? (
                    <Image size={15} className="text-emerald-500 shrink-0" />
                  ) : f.isVideo ? (
                    <Film size={15} className="text-purple-500 shrink-0" />
                  ) : (
                    <FileText size={15} className="text-sky-500 shrink-0" />
                  )}
                  <span className="font-mono text-[11px] truncate text-[var(--app-text-strong)]" title={f.name}>
                    {f.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--app-muted)]">
                  <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                  <a
                    href={getDriveFileUrl(plate, activeCategory, f.name)}
                    download={f.name}
                    className="p-1 rounded hover:bg-[var(--app-surface-3)] text-sky-500"
                    title="Descarcă fișierul"
                  >
                    <Download size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-2xl overflow-hidden text-xs">
            <div className="p-3 border-b border-[var(--app-border)] flex items-center justify-between">
              <h4 className="font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <FileText size={16} className="text-purple-500" /> Șabloane Oficiale pe Calculator
              </h4>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 max-h-64 overflow-y-auto space-y-1.5">
              {templates.length === 0 ? (
                <p className="text-center text-slate-400 p-4">Nu s-au găsit șabloane pe calculator.</p>
              ) : (
                templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)]"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-purple-400 font-semibold block">{tmpl.category}</span>
                      <strong className="text-[var(--app-text-strong)] truncate block">{tmpl.name}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttachTemplate(tmpl)}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                    >
                      Atașează în Dosar
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