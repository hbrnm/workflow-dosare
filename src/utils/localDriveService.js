/**
 * localDriveService.js
 * Serviciu de comunicare cu serverul local DOSARE de pe calculator (http://localhost:3000).
 * Permite:
 * - Verificare conexiune hard drive
 * - Sincronizare automată bidirecțională (Hard Drive <-> Workflow Daune Supabase)
 * - Deschidere directă a folderelor mașinilor în Windows Explorer
 * - Ascultare în timp real (SSE/Polling) pentru detectarea automată a folderelor noi create pe hard drive
 * - Organizare automată a fișierelor pe cele 5 categorii standard
 * - Gestionare șabloane documente (cereri despăgubire, declarații, etc.)
 */

import { normalizePlate } from "./plateSchedule";

const DEFAULT_PORT = 3000;
const STORAGE_KEY_URL = "workflow_dosare_local_drive_url";

export function getLocalDriveUrl() {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_URL);
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, "");
  } catch {
    /* ignore */
  }
  return `http://localhost:${DEFAULT_PORT}`;
}

export function setLocalDriveUrl(url) {
  try {
    if (!url) localStorage.removeItem(STORAGE_KEY_URL);
    else localStorage.setItem(STORAGE_KEY_URL, url.trim().replace(/\/+$/, ""));
  } catch {
    /* ignore */
  }
}

/**
 * Helper fetch robust cu timeout și fallback automat de la localhost la 127.0.0.1
 */
export async function driveFetch(endpoint, options = {}) {
  const base = getLocalDriveUrl();
  const ctrl = new AbortController();
  const timeoutMs = options.timeout || 12000;
  const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${endpoint}`, {
      ...options,
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    // Dacă localhost dă eroare (rezoluție DNS / PNA), încercăm direct cu 127.0.0.1
    if (base.includes("localhost")) {
      const altBase = base.replace("localhost", "127.0.0.1");
      const altCtrl = new AbortController();
      const altTimer = setTimeout(() => altCtrl.abort(), 6000);
      try {
        const altRes = await fetch(`${altBase}${endpoint}`, {
          ...options,
          signal: altCtrl.signal,
        });
        clearTimeout(altTimer);
        if (altRes.ok || altRes.status < 500) {
          setLocalDriveUrl(altBase);
          return altRes;
        }
      } catch {
        clearTimeout(altTimer);
      }
    }
    throw err;
  }
}

/**
 * Verifică starea conexiunii cu serverul local DOSARE
 */
export async function checkDriveStatus() {
  try {
    const res = await driveFetch("/api/network-info", {
      method: "GET",
      timeout: 3500,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      connected: true,
      localIp: data.localIp || "127.0.0.1",
      port: data.port || DEFAULT_PORT,
      baseDir: data.baseDir || "C:\\Users\\pc1\\Desktop\\DOSARE",
      totalKnownCars: data.totalKnownCars !== undefined ? data.totalKnownCars : (data.totalCars || 0),
      url: getLocalDriveUrl(),
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      url: getLocalDriveUrl(),
    };
  }
}

/**
 * Returnează toate dosarele de pe hard drive
 */
export async function getDriveCars() {
  const res = await driveFetch("/api/cars");
  if (!res.ok) throw new Error(`Eroare încărcare mașini hard drive (${res.status})`);
  return await res.json();
}

/**
 * Returnează detaliile și lista de fișiere pe categorii pentru un dosar specific
 */
export async function getDriveCarDetails(carName) {
  const res = await driveFetch(`/api/cars/${encodeURIComponent(carName)}`);
  if (!res.ok) throw new Error(`Dosarul ${carName} nu a fost găsit pe hard drive`);
  return await res.json();
}

/**
 * Deschide folderul dosarului în Windows Explorer pe calculator
 */
export async function openCarInExplorer(carName) {
  const res = await driveFetch(`/api/cars/${encodeURIComponent(carName)}/open-explorer`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Nu s-a putut deschide Explorer");
  }
  return true;
}

/**
 * Deschide folderul principal DOSARE în Windows Explorer
 */
export async function openRootInExplorer() {
  const res = await driveFetch("/api/drive/open-root", {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Nu s-a putut deschide folderul DOSARE");
  }
  return true;
}

/**
 * Creează un nou folder de mașină pe hard drive cu cele 5 subfoldere standard
 */
export async function createDriveCar(plateOrData, extraData = {}) {
  const payload = typeof plateOrData === "string"
    ? { plate: normalizePlate(plateOrData), ...extraData }
    : { ...plateOrData, plate: normalizePlate(plateOrData?.plate || plateOrData?.name || "") };
  const res = await driveFetch("/api/cars/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare creare dosar pe hard drive");
  return json;
}

/**
 * Sincronizează datele unui dosar (status, client, vin, etc.) în status.json de pe hard drive
 */
export async function pushClaimToDrive(claim) {
  const payload = {
    ...claim,
    plate: claim?.numarInmatriculare || claim?.plate || "",
    workflowStatus: claim?.status || claim?.workflowStatus || "",
    clientName: claim?.client || claim?.clientName || "",
  };
  const res = await driveFetch("/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare trimitere date către hard drive");
  return json;
}

/**
 * Actualizează statusul unui dosar pe hard drive
 */
export async function updateDriveCarStatus(carName, patch) {
  const res = await driveFetch(`/api/cars/${encodeURIComponent(carName)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare actualizare status");
  return json;
}

/**
 * Rulează organizarea automată a fișierelor pe hard drive
 */
export async function organizeDriveFiles() {
  const res = await driveFetch("/api/organize", { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare organizare fișiere");
  return json;
}

/**
 * Încarcă fișiere direct într-o categorie a unui dosar de pe hard drive
 */
export async function uploadFilesToDrive(carName, category, files) {
  const formData = new FormData();
  formData.append("car", carName);
  formData.append("category", category || "03_Foto_Dauna");
  for (const file of files) {
    formData.append("file", file);
  }
  const res = await driveFetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare încărcare fișiere");
  return json;
}

/**
 * Returnează lista de șabloane de documente oficiale de pe calculator
 */
export async function getDriveTemplates() {
  try {
    const res = await driveFetch("/api/templates");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Atașează un șablon în folderul mașinii
 */
export async function attachDriveTemplate(carName, templatePath, targetCategory) {
  const res = await driveFetch("/api/templates/attach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carName, templatePath, targetCategory }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Eroare atașare șablon");
  return json;
}

/**
 * URL pentru descărcare/vizualizare fișier de pe hard drive
 */
export function getDriveFileUrl(carName, category, fileName) {
  const base = getLocalDriveUrl();
  return `${base}/api/file?car=${encodeURIComponent(carName)}&cat=${encodeURIComponent(category)}&file=${encodeURIComponent(fileName)}`;
}

/**
 * Ascultă evenimentele în timp real din hard drive (Server-Sent Events cu fallback pe polling)
 * Apelează onNewFolder când utilizatorul creează un folder nou pe calculator!
 */
export function subscribeToDriveEvents({ onNewFolder, onEvent, onStatusChange }) {
  const base = getLocalDriveUrl();
  let eventSource = null;
  let pollTimer = null;
  let lastEventId = 0;
  let active = true;

  function handleEvent(evt) {
    if (!evt || !active) return;
    if (evt.id && evt.id > lastEventId) lastEventId = evt.id;
    onEvent?.(evt);
    if (evt.type === "new_folder") {
      onNewFolder?.(evt);
    }
  }

  // Încearcă SSE mai întâi
  try {
    eventSource = new EventSource(`${base}/api/sync/events/stream`);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data);
      } catch {
        /* ignore parse */
      }
    };
    eventSource.onerror = () => {
      // Dacă SSE eșuează sau este deconectat, facem fallback pe polling
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      startPolling();
    };
  } catch {
    startPolling();
  }

  function startPolling() {
    if (pollTimer || !active) return;
    pollTimer = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`${base}/api/sync/events?since=${lastEventId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.events && json.events.length > 0) {
            for (const evt of json.events) {
              handleEvent(evt);
            }
          }
          if (json.latestId) lastEventId = json.latestId;
          onStatusChange?.(true);
        } else {
          onStatusChange?.(false);
        }
      } catch {
        onStatusChange?.(false);
      }
    }, 2000);
  }

  return () => {
    active = false;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}
