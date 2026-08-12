import { uid, nowISO } from "./dateUtils";

export function storagePath(claimId, file, folder = "poze") {
  const ext = file.name ? file.name.split(".").pop() : "bin";
  return `${claimId || "temp"}/${folder}/${uid()}.${ext}`;
}

/** TTL pentru URL-uri semnate Storage (24h). Se regenerează la deschiderea dosarului. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

/**
 * Regenerates signed URLs for storage items that have a path.
 * Always refreshes http(s) signed URLs (they expire). Keeps data: URLs as-is.
 */
export async function refreshStorageUrls(items = [], bucketName, supabaseClient) {
  if (!items || !items.length || !supabaseClient) return items || [];

  const result = items.map((item) => (item && typeof item === "object" ? { ...item } : item));
  const toSign = [];

  result.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const url = item.url ? String(item.url) : "";
    if (url.startsWith("data:")) return;
    if (!item.path) return;
    toSign.push({ index, path: item.path });
  });

  if (toSign.length === 0) return result;

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .createSignedUrls(
        toSign.map((t) => t.path),
        SIGNED_URL_TTL_SECONDS
      );

    if (!error && Array.isArray(data)) {
      data.forEach((signed, i) => {
        const target = toSign[i];
        if (!target) return;
        if (signed?.signedUrl) {
          result[target.index] = { ...result[target.index], url: signed.signedUrl };
        }
      });
      return result;
    }
  } catch (err) {
    console.warn("createSignedUrls batch failed, falling back", err);
  }

  // Fallback: one-by-one
  await Promise.all(
    toSign.map(async ({ index, path }) => {
      try {
        const { data: signed } = await supabaseClient.storage
          .from(bucketName)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) {
          result[index] = { ...result[index], url: signed.signedUrl };
        }
      } catch (err) {
        /* keep previous url */
      }
    })
  );

  return result;
}

/** Don't persist expired signed URLs — only path (+ metadata). data: URLs kept. */
export function stripEphemeralMediaUrls(items = []) {
  if (!Array.isArray(items)) return items || [];
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const url = item.url ? String(item.url) : "";
    if (url.startsWith("data:")) return item;
    if (!item.path) return item;
    const { url: _drop, ...rest } = item;
    return rest;
  });
}

/** Stable key for media merge / dedupe (path preferred over id/url). */
export function mediaItemKey(item) {
  if (!item || typeof item !== "object") return "";
  if (item.path) return `path:${item.path}`;
  if (item.id != null && item.id !== "") return `id:${String(item.id)}`;
  if (item.url) return `url:${String(item.url)}`;
  return "";
}

/** Prepend additions; same-key items keep the addition (newer metadata). */
export function appendMediaItems(base = [], additions = []) {
  const baseList = Array.isArray(base) ? base : [];
  const addList = Array.isArray(additions) ? additions : [];
  if (!addList.length) return baseList.slice();
  const seen = new Set();
  const out = [];
  for (const item of addList) {
    const key = mediaItemKey(item);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(item);
  }
  for (const item of baseList) {
    const key = mediaItemKey(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(item);
  }
  return out;
}

export function removeMediaItems(base = [], toRemove = []) {
  const keys = new Set(
    (Array.isArray(toRemove) ? toRemove : []).map(mediaItemKey).filter(Boolean)
  );
  if (!keys.size) return Array.isArray(base) ? base.slice() : [];
  return (Array.isArray(base) ? base : []).filter((item) => {
    const key = mediaItemKey(item);
    return !key || !keys.has(key);
  });
}

/**
 * Prefer `primary` order/metadata; keep any `secondary` items not present in primary.
 * Used on full save so concurrent uploads are not clobbered.
 */
export function unionMediaLists(primary = [], secondary = []) {
  return appendMediaItems(secondary, primary);
}

const MEDIA_OP_KEYS = new Set([
  "appendPoze",
  "appendDocumente",
  "removePoze",
  "removeDocumente",
]);

export function stripMediaOps(patch = {}) {
  const next = { ...patch };
  for (const key of MEDIA_OP_KEYS) delete next[key];
  return next;
}

export function hasMediaOps(patch = {}) {
  return (
    (Array.isArray(patch.appendPoze) && patch.appendPoze.length > 0) ||
    (Array.isArray(patch.appendDocumente) && patch.appendDocumente.length > 0) ||
    (Array.isArray(patch.removePoze) && patch.removePoze.length > 0) ||
    (Array.isArray(patch.removeDocumente) && patch.removeDocumente.length > 0) ||
    patch.poze !== undefined ||
    patch.documente !== undefined
  );
}

/**
 * Apply append/remove (or full replace) media ops against the latest claim lists.
 * Prefer append/remove ops from concurrent UIs; full poze/documente is replace-only when ops absent.
 */
export function resolveMediaPatch(currentClaim = {}, patch = {}) {
  const next = {};
  let poze = Array.isArray(currentClaim.poze) ? currentClaim.poze : [];
  let documente = Array.isArray(currentClaim.documente) ? currentClaim.documente : [];
  let touchedPoze = false;
  let touchedDocs = false;

  const hasAppendPoze = Array.isArray(patch.appendPoze) && patch.appendPoze.length > 0;
  const hasRemovePoze = Array.isArray(patch.removePoze) && patch.removePoze.length > 0;
  const hasAppendDocs = Array.isArray(patch.appendDocumente) && patch.appendDocumente.length > 0;
  const hasRemoveDocs = Array.isArray(patch.removeDocumente) && patch.removeDocumente.length > 0;

  if (hasAppendPoze) {
    poze = appendMediaItems(poze, patch.appendPoze);
    touchedPoze = true;
  }
  if (hasRemovePoze) {
    poze = removeMediaItems(poze, patch.removePoze);
    touchedPoze = true;
  }
  if (patch.poze !== undefined && !hasAppendPoze && !hasRemovePoze) {
    poze = Array.isArray(patch.poze) ? patch.poze : [];
    touchedPoze = true;
  }

  if (hasAppendDocs) {
    documente = appendMediaItems(documente, patch.appendDocumente);
    touchedDocs = true;
  }
  if (hasRemoveDocs) {
    documente = removeMediaItems(documente, patch.removeDocumente);
    touchedDocs = true;
  }
  if (patch.documente !== undefined && !hasAppendDocs && !hasRemoveDocs) {
    documente = Array.isArray(patch.documente) ? patch.documente : [];
    touchedDocs = true;
  }

  if (touchedPoze) next.poze = poze;
  if (touchedDocs) next.documente = documente;
  return next;
}

export async function uploadStorageItem(supabaseClient, bucketName, claimId, file, folder) {
  const path = storagePath(claimId, file, folder);
  const { error } = await supabaseClient.storage.from(bucketName).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: signed, error: signedError } = await supabaseClient.storage
    .from(bucketName)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signedError) {
    await supabaseClient.storage.from(bucketName).remove([path]);
    throw signedError;
  }
  return { id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() };
}
