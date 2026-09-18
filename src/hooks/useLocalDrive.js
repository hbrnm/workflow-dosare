import { useState, useEffect, useCallback, useRef } from "react";
import {
  checkDriveStatus,
  getDriveCars,
  openCarInExplorer,
  openRootInExplorer,
  createDriveCar,
  pushClaimToDrive,
  updateDriveCarStatus,
  organizeDriveFiles,
  subscribeToDriveEvents,
} from "../utils/localDriveService";
import { normalizePlate } from "../utils/plateSchedule";
import { emptyClaim } from "../utils/claimUtils";

export function useLocalDrive({ claims = [], saveClaim, onAutoOpenClaim, showNotice } = {}) {
  const [driveState, setDriveState] = useState({
    connected: false,
    checking: true,
    localIp: "127.0.0.1",
    port: 3000,
    baseDir: "C:\\Users\\pc1\\Desktop\\DOSARE",
    totalKnownCars: 0,
  });

  const [driveCars, setDriveCars] = useState([]);
  const [loadingDriveCars, setLoadingDriveCars] = useState(false);
  const claimsRef = useRef(claims);
  claimsRef.current = claims;

  const saveClaimRef = useRef(saveClaim);
  saveClaimRef.current = saveClaim;

  const onAutoOpenClaimRef = useRef(onAutoOpenClaim);
  onAutoOpenClaimRef.current = onAutoOpenClaim;

  const showNoticeRef = useRef(showNotice);
  showNoticeRef.current = showNotice;

  // Refresh Drive status
  const checkStatus = useCallback(async () => {
    const res = await checkDriveStatus();
    setDriveState((prev) => ({
      ...prev,
      ...res,
      checking: false,
    }));
    return res.connected;
  }, []);

  // Fetch all cars from hard drive
  const refreshDriveCars = useCallback(async () => {
    try {
      setLoadingDriveCars(true);
      const cars = await getDriveCars();
      setDriveCars(cars || []);
    } catch {
      /* ignore if offline */
    } finally {
      setLoadingDriveCars(false);
    }
  }, []);

  // Initial check & interval
  useEffect(() => {
    checkStatus().then((connected) => {
      if (connected) refreshDriveCars();
    });

    const interval = setInterval(async () => {
      const isConn = await checkStatus();
      if (isConn) {
        // quiet refresh
        getDriveCars().then((cars) => setDriveCars(cars || [])).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [checkStatus, refreshDriveCars]);

  // Real-time listener for events (e.g. user creates a new folder in Windows Explorer)
  useEffect(() => {
    const unsubscribe = subscribeToDriveEvents({
      onNewFolder: async (event) => {
        const plate = normalizePlate(event.plate || event.name || "");
        if (!plate) return;

        showNoticeRef.current?.(
          `📁 Folder nou detectat pe Hard Drive: ${plate}! Se preia automat în Workflow Daune...`,
          "info"
        );

        // Check if already in claims list
        const currentClaims = claimsRef.current || [];
        const existing = currentClaims.find(
          (c) => normalizePlate(c.numarInmatriculare || "") === plate
        );

        if (!existing && saveClaimRef.current) {
          const newClaimDraft = {
            ...emptyClaim("constatare"),
            numarInmatriculare: plate,
            client: event.statusData?.clientName || "",
            telefonClient: event.statusData?.clientPhone || "",
            vin: event.statusData?.vin || "",
            numarDosar: event.statusData?.numarDosar || "",
            asigurator: event.statusData?.asigurator || "",
            observatii: event.statusData?.notes || "Creat automat din folderul local DOSARE.",
          };

          const res = await saveClaimRef.current(newClaimDraft);
          if (res?.success) {
            showNoticeRef.current?.(
              `✅ Dosar ${plate} creat și sincronizat online cu succes!`,
              "success"
            );
            // Deschide automat dosarul pentru completare date
            onAutoOpenClaimRef.current?.(newClaimDraft);
          }
        } else if (existing) {
          showNoticeRef.current?.(
            `Dosarul ${plate} există deja în Workflow Daune — folderul fizic este conectat.`,
            "success"
          );
          onAutoOpenClaimRef.current?.(existing);
        }

        refreshDriveCars();
      },
      onStatusChange: (isConnected) => {
        setDriveState((prev) => ({ ...prev, connected: isConnected }));
      },
    });

    return () => unsubscribe();
  }, [refreshDriveCars]);

  // Open in Windows Explorer
  const handleOpenExplorer = useCallback(
    async (plate) => {
      try {
        await openCarInExplorer(plate);
        showNoticeRef.current?.(`Deschis în Explorer: ${plate}`, "success");
        return true;
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes("explorer")) {
          showNoticeRef.current?.(`Deschis în Explorer: ${plate}`, "success");
          return true;
        }
        showNoticeRef.current?.(`Eroare deschidere Explorer: ${err.message}`, "error");
        return false;
      }
    },
    []
  );

  // Open Root DOSARE in Windows Explorer
  const handleOpenRoot = useCallback(async () => {
    try {
      await openRootInExplorer();
      showNoticeRef.current?.("Folderul DOSARE a fost deschis în Windows Explorer.", "success");
      return true;
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("explorer")) {
        showNoticeRef.current?.("Folderul DOSARE a fost deschis în Windows Explorer.", "success");
        return true;
      }
      showNoticeRef.current?.(`Eroare: ${err.message}`, "error");
      return false;
    }
  }, []);

  // Auto-organize files
  const handleOrganize = useCallback(async () => {
    try {
      const res = await organizeDriveFiles();
      showNoticeRef.current?.(
        `Organizare finalizată: ${res.movedCount || 0} fișiere mutate în foldere standard, ${res.renamedCount || 0} foldere verificate.`,
        "success"
      );
      refreshDriveCars();
      return res;
    } catch (err) {
      showNoticeRef.current?.(`Eroare organizare: ${err.message}`, "error");
      return null;
    }
  }, [refreshDriveCars]);

  // Sincronizează toate dosarele de pe hard drive în online
  const handleImportDriveToWorkflow = useCallback(
    async (driveCar) => {
      if (!saveClaimRef.current) return false;
      const plate = normalizePlate(driveCar.name || "");
      const newClaimDraft = {
        ...emptyClaim(driveCar.status || "constatare"),
        numarInmatriculare: plate,
        client: driveCar.clientName || "",
        telefonClient: driveCar.clientPhone || "",
        vin: driveCar.vin || "",
        numarDosar: driveCar.numarDosar || "",
        asigurator: driveCar.asigurator || "",
        observatii: driveCar.notes || "Importat de pe Hard Drive DOSARE.",
        piese: driveCar.piese || "",
        pieseSosite: !!driveCar.pieseSosite,
      };
      const res = await saveClaimRef.current(newClaimDraft);
      return res?.success;
    },
    []
  );

  // Sincronizează un dosar online pe hard drive (creează folderul fizic)
  const handlePushClaimToDrive = useCallback(
    async (claim) => {
      try {
        await pushClaimToDrive(claim);
        showNoticeRef.current?.(`Folder creat / actualizat pe Hard Drive pentru ${claim.numarInmatriculare}`, "success");
        refreshDriveCars();
        return true;
      } catch (err) {
        showNoticeRef.current?.(`Eroare sincronizare pe Hard Drive: ${err.message}`, "error");
        return false;
      }
    },
    [refreshDriveCars]
  );

  return {
    driveState,
    driveCars,
    loadingDriveCars,
    refreshDriveCars,
    checkStatus,
    openExplorer: handleOpenExplorer,
    openRoot: handleOpenRoot,
    organizeDrive: handleOrganize,
    importDriveToWorkflow: handleImportDriveToWorkflow,
    pushClaimToDrive: handlePushClaimToDrive,
  };
}
