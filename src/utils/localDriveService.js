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
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/+$/, "");
      // Nu persista 127.0.0.1 dacă utilizatorul a acordat permisiuni pe localhost
      if (clean === "http://127.0.0.1:3000" || clean === "127.0.0.1:3000") {
        return `http://localhost:${DEFAULT_PORT}`;
      }
      return clean.startsWith("http") ? clean : `http://${clean}`;
    }
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

export function resetLocalDriveUrl() {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
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
    // Dacă localhost dă eroare, încercăm o singură dată și cu 127.0.0.1
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
      apiVersion: data.apiVersion || 1,
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
export async function attachDriveTemplate(carName, templatePath, targetCategory, claimId) {
  const res = await driveFetch("/api/templates/attach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ carName, templatePath, targetCategory, ...(claimId ? { claimId } : {}) }),
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

// ==========================================================================
// API v2: structura pe mașină -> daună -> categorie
//   <NR AUTO>\<AAAA-LL-ZZ>_<ASIGURATOR>_<NRDOSAR>\01_Acte ... 08_Pachet
// Serverul v2 răspunde și la API-ul vechi (v1), deci funcțiile de mai sus rămân valabile.
// ==========================================================================

export const DRIVE_V2_CATEGORIES = [
  { key: "01_Acte", label: "01 Acte", icon: "📑" },
  { key: "02_Foto_Intrare", label: "02 Foto intrare", icon: "📷" },
  { key: "03_Devize", label: "03 Devize", icon: "🧾" },
  { key: "04_Reconstatare", label: "04 Reconstatare", icon: "🔧" },
  { key: "05_Corespondenta", label: "05 Corespondență", icon: "✉️" },
  { key: "06_Facturi", label: "06 Facturi", icon: "💳" },
  { key: "07_Foto_Final", label: "07 Foto final", icon: "🏁" },
  { key: "08_Pachet", label: "08 Pachet", icon: "📦" },
];

const apiVersionCache = new Map();

/**
 * Versiunea API a serverului local (1 = structura veche, 2 = mașină/daună). Rezultatul se ține minte per adresă.
 */
export async function getDriveApiVersion() {
  const base = getLocalDriveUrl();
  if (apiVersionCache.has(base)) return apiVersionCache.get(base);
  const status = await checkDriveStatus();
  if (!status.connected) return 1;
  apiVersionCache.set(base, status.apiVersion || 1);
  return status.apiVersion || 1;
}

export function resetDriveApiVersionCache() {
  apiVersionCache.clear();
}

/**
 * Găsește dauna locală care corespunde unui număr de dosar din aplicație
 * (nr. dosar, programare Omniasig 60…, sau numărul din numele folderului).
 */
export function findMatchingDriveClaim(claims, numarDosar) {
  const nr = String(numarDosar || "").trim().toUpperCase();
  if (!nr || !Array.isArray(claims)) return null;
  const safe = nr.replace(/[\\/:*?"<>|\s]+/g, "-");
  return (
    claims.find((c) => String(c.numarDosar || "").trim().toUpperCase() === nr) ||
    claims.find((c) => (c.numereLegate || []).map(String).includes(nr) || (c.programari || []).map(String).includes(nr)) ||
    claims.find((c) => String(c.id || "").toUpperCase().endsWith(`_${safe}`)) ||
    null
  );
}

async function driveJson(endpoint, options, errorMessage) {
  const res = await driveFetch(endpoint, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || errorMessage);
  return json;
}

const postJson = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});

/** Mașina cu toate daunele, fișierele pe categorii și fișierele nerepartizate */
export function getDriveCarV2(carName) {
  return driveJson(`/api/v2/cars/${encodeURIComponent(carName)}`, {}, `Dosarul ${carName} nu a fost găsit pe hard drive`);
}

/** Creează o mașină nouă (opțional cu prima daună) */
export function createDriveCarV2(plate, masina = {}, claim = null) {
  return driveJson("/api/v2/cars", postJson({ ...masina, plate: normalizePlate(plate), ...(claim ? { claim } : {}) }), "Eroare creare dosar pe hard drive");
}

/** Creează o daună nouă pentru o mașină: { data, asigurator, numarDosar, tipAsigurare } */
export function createDriveClaim(carName, fields) {
  return driveJson(`/api/v2/cars/${encodeURIComponent(carName)}/claims`, postJson(fields), "Eroare creare daună pe hard drive");
}

/** Actualizează statusul unei daune; răspunsul conține claimId (folderul poate fi redenumit când se află nr. dosarului) */
export function updateDriveClaimStatus(carName, claimId, patch) {
  return driveJson(
    `/api/v2/cars/${encodeURIComponent(carName)}/claims/${encodeURIComponent(claimId)}/status`,
    postJson(patch),
    "Eroare actualizare daună"
  );
}

/** Lista de verificare a actelor obligatorii (RCA / CASCO) */
export function getDriveClaimChecklist(carName, claimId) {
  return driveJson(
    `/api/v2/cars/${encodeURIComponent(carName)}/claims/${encodeURIComponent(claimId)}/checklist`,
    {},
    "Eroare listă de verificare"
  );
}

/** Încarcă fișiere într-o categorie a unei daune */
export async function uploadFilesToDriveClaim(carName, claimId, category, files) {
  const formData = new FormData();
  formData.append("car", carName);
  formData.append("claim", claimId);
  formData.append("category", category);
  for (const file of files) formData.append("file", file);
  return driveJson("/api/v2/upload", { method: "POST", body: formData }, "Eroare încărcare fișiere");
}

/** Mută un fișier între daune / categorii (ex. din _De_repartizat) */
export function moveDriveFile(carName, from, to) {
  return driveJson("/api/v2/move", postJson({ car: carName, from, to }), "Eroare mutare fișier");
}

/** Deschide folderul unei daune în Windows Explorer */
export function openClaimInExplorer(carName, claimId) {
  return driveJson(
    `/api/v2/cars/${encodeURIComponent(carName)}/open-explorer?claim=${encodeURIComponent(claimId)}`,
    { method: "POST" },
    "Nu s-a putut deschide Explorer"
  );
}

/** URL pentru vizualizare / descărcare fișier dintr-o daună */
export function getDriveClaimFileUrl(carName, claimId, category, fileName) {
  const base = getLocalDriveUrl();
  return `${base}/api/v2/file?car=${encodeURIComponent(carName)}&claim=${encodeURIComponent(claimId)}&cat=${encodeURIComponent(category || "")}&file=${encodeURIComponent(fileName)}`;
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
