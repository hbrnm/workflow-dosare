export const ACTIVE_ATELIER_KEY = "workflow_dosare_active_atelier_id";

export function loadActiveAtelierId() {
  try {
    return localStorage.getItem(ACTIVE_ATELIER_KEY) || null;
  } catch {
    return null;
  }
}

export function saveActiveAtelierId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_ATELIER_KEY, id);
    else localStorage.removeItem(ACTIVE_ATELIER_KEY);
  } catch {
    /* ignore */
  }
}

/** Read ?atelier=slug from location */
export function readAtelierSlugFromUrl(search = typeof window !== "undefined" ? window.location.search : "") {
  try {
    const params = new URLSearchParams(search);
    const slug = String(params.get("atelier") || "").trim().toLowerCase();
    return slug || null;
  } catch {
    return null;
  }
}

export function writeAtelierSlugToUrl(slug) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set("atelier", slug);
    else url.searchParams.delete("atelier");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

/**
 * Pick active membership from list.
 * @param {Array<{atelier_id: string, role?: string, atelier?: {slug?: string}}>} memberships
 * @param {{ preferredId?: string|null, preferredSlug?: string|null }} opts
 */
export function resolveActiveMembership(memberships, { preferredId = null, preferredSlug = null } = {}) {
  const list = Array.isArray(memberships) ? memberships : [];
  if (!list.length) return null;

  if (preferredSlug) {
    const bySlug = list.find(
      (m) => String(m.atelier?.slug || "").toLowerCase() === String(preferredSlug).toLowerCase()
    );
    if (bySlug) return bySlug;
  }
  if (preferredId) {
    const byId = list.find((m) => m.atelier_id === preferredId);
    if (byId) return byId;
  }

  const ranked = [...list].sort((a, b) => {
    const rank = (r) => (r === "admin" ? 0 : r === "receptioner" ? 1 : 2);
    return rank(a.role) - rank(b.role);
  });
  return ranked[0];
}
