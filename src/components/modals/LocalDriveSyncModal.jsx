import React, { useState, useMemo } from "react";
import {
  HardDrive, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink,
  Sparkles, ArrowRight, FolderPlus, Download, Check
} from "lucide-react";
import { normalizePlate } from "../../utils/plateSchedule";
import ClaimPlate from "../common/ClaimPlate";
import AppButton from "../common/AppButton";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-surface-2)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--app-accent)]/15 text-[var(--app-accent)] flex items-center justify-center border border-[var(--app-accent)]/25">
              <HardDrive size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--app-text-strong)] flex items-center gap-2">
                Conectivitate &amp; Sincronizare Hard Drive
                {driveState.connected ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--app-success)] bg-[var(--app-success)]/10 border border-[var(--app-success)]/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-success)]"></span> Conectat
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--app-danger)] bg-[var(--app-danger)]/10 border border-[var(--app-danger)]/20 px-2.5 py-0.5 rounded-full">
                    Deconectat
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--app-muted)] font-mono">
                {driveState.baseDir || "C:\\Users\\pc1\\Desktop\\DOSARE"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] text-center">
              <span className="text-[11px] text-[var(--app-muted)] block mb-0.5 font-medium">Dosare Hard Drive</span>
              <strong className="text-xl font-extrabold text-[var(--app-text-strong)] font-mono">
                {driveCars.length}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] text-center">
              <span className="text-[11px] text-[var(--app-muted)] block mb-0.5 font-medium">Sincronizate Online</span>
              <strong className="text-xl font-extrabold text-[var(--app-success)] font-mono">
                {matched.length}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] text-center">
              <span className="text-[11px] text-[var(--app-muted)] block mb-0.5 font-medium">Doar pe Calculator</span>
              <strong className="text-xl font-extrabold text-[var(--app-accent)] font-mono">
                {onlyOnDrive.length}
              </strong>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AppButton
              variant="secondary"
              onClick={onOpenRoot}
              className="text-xs"
            >
              <ExternalLink size={13} className="text-[var(--app-muted)]" /> Deschide C:\DOSARE în Windows Explorer
            </AppButton>

            <AppButton
              variant="secondary"
              onClick={onOrganizeDrive}
              className="text-xs"
            >
              <Sparkles size={13} className="text-[var(--app-muted)]" /> Curăță &amp; Sortează Automat Fișierele pe Categorii
            </AppButton>

            <AppButton
              variant="primary"
              onClick={() => {
                onClose();
                onOpenDriveView?.();
              }}
              className="text-xs ml-auto"
            >
              <ArrowRight size={13} /> Deschide Vizualizarea File Pilot Auto
            </AppButton>
          </div>

          {/* Unsynced Section: Folders on Hard Drive not yet online */}
          {onlyOnDrive.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/25 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-[var(--app-accent)]" />
                  <span className="font-bold text-[var(--app-text-strong)] text-xs">
                    {onlyOnDrive.length} dosare găsite pe hard drive nepreluate online
                  </span>
                </div>
                <AppButton
                  variant="primary"
                  disabled={syncingAll}
                  onClick={handleImportAll}
                  className="text-xs py-1 px-3"
                >
                  {syncingAll ? "Se preiau..." : "Preia Toate în Workflow"}
                </AppButton>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {onlyOnDrive.map(({ plate, driveCar }) => (
                  <div
                    key={plate}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border-soft)] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ClaimPlate value={plate} className="text-xs" />
                      <span className="text-[var(--app-muted)] truncate max-w-[220px]">
                        {driveCar.clientName || "Fără detalii client"}
                      </span>
                    </div>
                    <AppButton
                      variant="primary"
                      onClick={async () => {
                        await onImportDriveCar(driveCar);
                        showNotice?.(`Dosar ${plate} preluat online!`, "success");
                        onRefreshDriveCars?.();
                      }}
                      className="text-[11px] py-1 px-2.5"
                    >
                      + Preia
                    </AppButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unsynced Section: Online Claims without hard drive folder */}
          {onlyOnline.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderPlus size={15} className="text-[var(--app-accent)]" />
                  <span className="font-bold text-[var(--app-text-strong)] text-xs">
                    {onlyOnline.length} dosare create online nu au folder pe calculator
                  </span>
                </div>
                <AppButton
                  variant="primary"
                  disabled={syncingAll}
                  onClick={handlePushAllToDrive}
                  className="text-xs py-1 px-3"
                >
                  {syncingAll ? "Se creează..." : "Creează Foldere pe PC"}
                </AppButton>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {onlyOnline.slice(0, 15).map(({ plate, claim }) => (
                  <div
                    key={plate}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border-soft)] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ClaimPlate value={plate} className="text-xs" />
                      <span className="text-[var(--app-muted)] truncate max-w-[220px]">
                        {claim.client || "Client nespecificat"}
                      </span>
                    </div>
                    <AppButton
                      variant="primary"
                      onClick={async () => {
                        await onPushClaimToDrive(claim);
                        showNotice?.(`Folder creat pe PC pentru ${plate}!`, "success");
                        onRefreshDriveCars?.();
                      }}
                      className="text-[11px] py-1 px-2.5"
                    >
                      Creează Folder
                    </AppButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onlyOnDrive.length === 0 && onlyOnline.length === 0 && (
            <div className="p-6 text-center text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]/30">
              <CheckCircle2 size={32} className="mx-auto text-[var(--app-success)] mb-2" />
              <p className="font-bold text-[var(--app-text-strong)]">Hard Drive-ul este sincronizat 100% cu Workflow Daune!</p>
              <p className="text-[11px] text-[var(--app-muted)] mt-1">
                Toate folderele create pe calculator sunt preluate automat online în timp real.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] flex items-center justify-between">
          <button
            type="button"
            onClick={onRefreshDriveCars}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text-strong)] font-semibold cursor-pointer text-xs"
          >
            <RefreshCw size={13} className={loadingDriveCars ? "animate-spin" : ""} /> Reîncarcă starea
          </button>
          <AppButton
            variant="secondary"
            onClick={onClose}
            className="text-xs px-4"
          >
            Închide
          </AppButton>
        </div>
      </div>
    </div>
  );
}