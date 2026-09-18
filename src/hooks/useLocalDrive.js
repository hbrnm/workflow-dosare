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
import { normalizePlate, cleanPlateKey, formatPlateStandard } from "../utils/plateSchedule";
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
    setDriveState((prev) => ({ ...prev, checking: true }));
    const status = await checkDriveStatus();
    setDriveState({ ...status, checking: false });
    return status.connected;
  }, []);

  // Fetch cars on Drive
  const refreshDriveCars = useCallback(async () => {
    try {
      setLoadingDriveCars(true);
      const cars = await getDriveCars();
      setDriveCars(cars);
      setDriveState((prev) => ({ ...prev, connected: true, totalKnownCars: cars.length }));
    } catch {
      setDriveState((prev) => ({ ...prev, connected: false }));
    } finally {
      setLoadingDriveCars(false);
    }
  }, []);

  // Initial check and periodic polling
  useEffect(() => {
    checkStatus().then((connected) => {
      if (connected) refreshDriveCars();
    });

    const timer = setInterval(() => {
      checkStatus().then((connected) => {
        if (connected) refreshDriveCars();
      });
    }, 15000);

    return () => clearInterval(timer);
  }, [checkStatus, refreshDriveCars]);

  // Real-time listener for events (e.g. user creates a new folder in Windows Explorer)
  useEffect(() => {
    const unsubscribe = subscribeToDriveEvents({
      onNewFolder: async (event) => {
        const plate = formatPlateStandard(event.plate || event.name || "");
        const cleanKey = cleanPlateKey(plate);
        if (!cleanKey) return;

        showNoticeRef.current?.(
          `📁 Folder nou detectat pe Hard Drive: ${plate}! Se sincronizează cu Workflow Daune...`,
          "info"
        );

        // Check if already in claims list
        const currentClaims = claimsRef.current || [];
        const existing = currentClaims.find(
          (c) =>
            cleanPlateKey(c.numarInmatriculare || "") === cleanKey ||
            (event.statusData?.numarDosar &&
              c.numarDosar &&
              String(c.numarDosar).trim() === String(event.statusData.numarDosar).trim())
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

  // Sincronizează un dosar de pe hard drive în online (cu verificare anti-duplicare și îmbinare automată)
  const handleImportDriveToWorkflow = useCallback(
    async (driveCar) => {
      if (!saveClaimRef.current) return false;
      const cleanKey = cleanPlateKey(driveCar.name || "");
      const formattedPlate = formatPlateStandard(driveCar.name || "");

      // Căutare dosar existent online pentru prevenirea duplicării (după număr mașină, număr dosar sau VIN)
      const currentClaims = claimsRef.current || [];
      const existing = currentClaims.find((c) => {
        if (cleanKey && cleanPlateKey(c.numarInmatriculare) === cleanKey) return true;
        if (
          driveCar.numarDosar &&
          c.numarDosar &&
          String(c.numarDosar).trim() === String(driveCar.numarDosar).trim()
        )
          return true;
        if (
          driveCar.vin &&
          c.vin &&
          String(c.vin).trim().toUpperCase() === String(driveCar.vin).trim().toUpperCase()
        )
          return true;
        return false;
      });

      if (existing) {
        // DUPĂ CUM A CERUT UTILIZATORUL: NU se duplică! Cele duble sunt îmbinate în unul singur
        const mergedClaim = {
          ...existing,
          numarInmatriculare: formattedPlate || existing.numarInmatriculare,
          client: existing.client || driveCar.clientName || "",
          telefonClient: existing.telefonClient || driveCar.clientPhone || "",
          vin: existing.vin || driveCar.vin || "",
          numarDosar: existing.numarDosar || driveCar.numarDosar || "",
          asigurator: existing.asigurator || driveCar.asigurator || "",
          observatii: existing.observatii
            ? driveCar.notes && !existing.observatii.includes(driveCar.notes)
              ? `${existing.observatii}\n${driveCar.notes}`
              : existing.observatii
            : driveCar.notes || "Sincronizat de pe Hard Drive DOSARE.",
          piese: existing.piese || driveCar.piese || "",
          pieseSosite:
            existing.pieseSosite !== undefined ? existing.pieseSosite : !!driveCar.pieseSosite,
        };
        const res = await saveClaimRef.current(mergedClaim);
        return res?.success;
      }

      // Nu există încă online -> creăm dosar nou cu numărul standardizat
      const newClaimDraft = {
        ...emptyClaim(driveCar.status || "constatare"),
        numarInmatriculare: formattedPlate,
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
        const standardPlate = formatPlateStandard(claim.numarInmatriculare);
        await pushClaimToDrive({ ...claim, numarInmatriculare: standardPlate });
        showNoticeRef.current?.(
          `Folder creat / actualizat pe Hard Drive pentru ${standardPlate}`,
          "success"
        );
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
