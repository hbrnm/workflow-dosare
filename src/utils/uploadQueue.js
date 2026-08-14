/**
 * Coadă locală persistentă IndexedDB pentru încărcări foto/documente reziliente offline.
 * Când conexiunea cade sau este instabilă în atelier, pozele sunt salvate local
 * și retrimise automat când conexiunea redevine activă.
 */

const DB_NAME = "workflow_dosare_upload_queue";
const DB_VERSION = 1;
const STORE_NAME = "pending_uploads";

function openUploadDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineUpload({ id, claimId, category, file, fileName }) {
  try {
    const db = await openUploadDatabase();
    if (!db) return false;

    const item = {
      id: id || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      claimId,
      category: category || "receptie",
      fileName: fileName || file?.name || "document.jpg",
      fileBlob: file,
      retries: 0,
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve(item.id);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Eroare la salvarea în coada offline IndexedDB:", err);
    return false;
  }
}

export async function getPendingUploads() {
  try {
    const db = await openUploadDatabase();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Eroare la citirea din coada offline:", err);
    return [];
  }
}

export async function removePendingUpload(id) {
  try {
    const db = await openUploadDatabase();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Eroare la ștergerea din coada offline:", err);
    return false;
  }
}

/**
 * Procesează coada de încărcări salvate offline utilizând funcția de upload furnizată.
 */
export async function flushUploadQueue(uploadFn, { maxRetries = 3 } = {}) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, failed: 0, remaining: (await getPendingUploads()).length };
  }

  const items = await getPendingUploads();
  if (!items.length) return { processed: 0, failed: 0, remaining: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const ok = await uploadFn(item);
      if (ok) {
        await removePendingUpload(item.id);
        processed++;
      } else {
        throw new Error("Upload refuzat");
      }
    } catch (err) {
      failed++;
      try {
        const db = await openUploadDatabase();
        if (db) {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          if (item.retries >= maxRetries) {
            console.warn(`Upload-ul ${item.id} a atins numărul maxim de încercări.`);
          } else {
            item.retries += 1;
            store.put(item);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  const remaining = (await getPendingUploads()).length;
  return { processed, failed, remaining };
}
