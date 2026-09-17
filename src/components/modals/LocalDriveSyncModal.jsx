import React, { useState, useMemo } from "react";
import {
  HardDrive, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink,
  Sparkles, ArrowRight, FolderPlus, Download, Check
} from "lucide-react";
import { normalizePlate } from "../../utils/plateSchedule";

export default function LocalDriveSyncModal({
  isOpen,
  onClose,
  driveState,
  driveCars = [],
  claims = [],
  loadingDriveCars = false,
  onRefreshDriveCars,
  onOpenRoot,
  onOrganizeDrive,
  onImportDriveCar,
  onPushClaimToDrive,
  onOpenDriveView,
  showNotice,
}) {
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncedPlates, setSyncedPlates] = useState(new Set());

  // Comparison between hard drive and online claims
  const { onlyOnDrive, onlyOnline, matched } = useMemo(() => {
    const claimsPlateMap = new Map();
    for (const c of claims) {
      const p = normalizePlate(c.numarInmatriculare || "");
      if (p) claimsPlateMap.set(p, c);
    }

    const drivePlateMap = new Map();
    for (const d of driveCars) {
      const p = normalizePlate(d.name || "");
      if (p) drivePlateMap.set(p, d);
    }

    const onDrive = [];
    const online = [];
    const both = [];

    for (const [p, d] of drivePlateMap.entries()) {
      if (claimsPlateMap.has(p)) {
        both.push({ plate: p, driveCar: d, claim: claimsPlateMap.get(p) });
      } else {
        onDrive.push({ plate: p, driveCar: d });
      }
    }

    for (const [p, c] of claimsPlateMap.entries()) {
      if (!drivePlateMap.has(p)) {
        online.push({ plate: p, claim: c });
      }
    }

    return {
      onlyOnDrive: onDrive,
      onlyOnline: online,
      matched: both,
    };
  }, [driveCars, claims]);

  // Bulk Import all unsynced Drive cars to Online
  const handleImportAll = async () => {
    if (!onlyOnDrive.length) return;
    try {
      setSyncingAll(true);
      let count = 0;
      for (const item of onlyOnDrive) {
        const ok = await onImportDriveCar(item.driveCar);
        if (ok) {
          count++;
          setSyncedPlates((prev) => new Set(prev).add(item.plate));
        }
      }
      showNotice?.(`Sincronizare completă: ${count} dosare preluate în Workflow Daune!`, "success");
      onRefreshDriveCars?.();
    } catch (err) {
      showNotice?.(`Eroare sincronizare masivă: ${err.message}`, "error");
    } finally {
      setSyncingAll(false);
    }
  };

  // Bulk Push all unsynced online claims to Drive
  const handlePushAllToDrive = async () => {
    if (!onlyOnline.length) return;
    try {
      setSyncingAll(true);
      let count = 0;
      for (const item of onlyOnline) {
        const ok = await onPushClaimToDrive(item.claim);
        if (ok) {
          count++;
          setSyncedPlates((prev) => new Set(prev).add(item.plate));
        }
      }
      showNotice?.(`S-au creat ${count} foldere fizice noi pe calculator!`, "success");
      onRefreshDriveCars?.();
    } catch (err) {
      showNotice?.(`Eroare: ${err.message}`, "error");
    } finally {
      setSyncingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--app-surface,#1e293b)] border border-[var(--app-border,#334155)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--app-border,#334155)] flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <HardDrive size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--app-text,#f8fafc)] flex items-center gap-2">
                Conectivitate &amp; Sincronizare Hard Drive
                {driveState.connected ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Conectat
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.2 rounded-full">
                    Deconectat
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--app-muted,#94a3b8)] font-mono">
                {driveState.baseDir || "C:\\Users\\pc1\\Desktop\\DOSARE"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">Dosare Hard Drive</span>
              <strong className="text-lg font-extrabold text-white font-mono">
                {driveCars.length}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">Sincronizate Online</span>
              <strong className="text-lg font-extrabold text-emerald-400 font-mono">
                {matched.length}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">Doar pe Calculator</span>
              <strong className="text-lg font-extrabold text-amber-400 font-mono">
                {onlyOnDrive.length}
              </strong>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenRoot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
            >
              <ExternalLink size={13} /> Deschide C:\DOSARE în Windows Explorer
            </button>

            <button
              type="button"
              onClick={onOrganizeDrive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold cursor-pointer"
            >
              <Sparkles size={13} /> Curăță &amp; Sortează Automat Fișierele pe Categorii
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDriveView?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold ml-auto cursor-pointer"
            >
              <ArrowRight size={13} /> Deschide Vizualizarea File Pilot Auto
            </button>
          </div>

          {/* Unsynced Section: Folders on Hard Drive not yet online */}
          {onlyOnDrive.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <span className="font-bold text-amber-300">
                    {onlyOnDrive.length} dosare găsite pe hard drive nepreluate online
                  </span>
                </div>
                <button
                  type="button"
                  disabled={syncingAll}
                  onClick={handleImportAll}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer"
                >
                  {syncingAll ? "Se preiau..." : "Preia Toate în Workflow"}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {onlyOnDrive.map(({ plate, driveCar }) => (
                  <div
                    key={plate}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px]"
                  >
                    <span className="font-mono font-bold text-slate-200">{plate}</span>
                    <span className="text-slate-400 truncate max-w-[200px]">
                      {driveCar.clientName || "Fără detalii client"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await onImportDriveCar(driveCar);
                        showNotice?.(`Dosar ${plate} preluat online!`, "success");
                        onRefreshDriveCars?.();
                      }}
                      className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] cursor-pointer"
                    >
                      + Preia
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unsynced Section: Online Claims without hard drive folder */}
          {onlyOnline.length > 0 && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderPlus size={15} className="text-sky-400" />
                  <span className="font-bold text-sky-300">
                    {onlyOnline.length} dosare create online nu au folder pe calculator
                  </span>
                </div>
                <button
                  type="button"
                  disabled={syncingAll}
                  onClick={handlePushAllToDrive}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                >
                  {syncingAll ? "Se creează..." : "Creează Foldere pe PC"}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {onlyOnline.slice(0, 10).map(({ plate, claim }) => (
                  <div
                    key={plate}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px]"
                  >
                    <span className="font-mono font-bold text-slate-200">{plate}</span>
                    <span className="text-slate-400 truncate max-w-[200px]">
                      {claim.client || "Client nespecificat"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await onPushClaimToDrive(claim);
                        showNotice?.(`Folder creat pe PC pentru ${plate}!`, "success");
                        onRefreshDriveCars?.();
                      }}
                      className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] cursor-pointer"
                    >
                      Creează Folder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onlyOnDrive.length === 0 && onlyOnline.length === 0 && (
            <div className="p-6 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="font-bold text-slate-200">Hard Drive-ul este sincronizat 100% cu Workflow Daune!</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Toate folderele create pe calculator sunt preluate automat online în timp real.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--app-border,#334155)] bg-slate-900/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onRefreshDriveCars}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
          >
            <RefreshCw size={13} className={loadingDriveCars ? "animate-spin" : ""} /> Reîncarcă starea
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}