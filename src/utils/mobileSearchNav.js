import { filterClaimsBySearch } from "./searchUtils";

/** Lista deasupra barei: destul de scurtă ca să rămână deasupra tastaturii. */
export const MOBILE_SEARCH_LIST_LIMIT = 12;

/** Un singur rezultat → deschide fișa imediat (fără overlay). */
export function uniqueSearchMatch(claims, query) {
  const q = (query || "").trim();
  if (!q) return null;
  const matches = filterClaimsBySearch(claims, q, { limit: 2 });
  return matches.length === 1 ? matches[0] : null;
}

export function mobileSearchHits(claims, query) {
  return filterClaimsBySearch(claims, query, { limit: MOBILE_SEARCH_LIST_LIMIT });
}

/**
 * Lista deasupra barei: query activ și nu e cazul de auto-open (0 sau 2+ rezultate).
 */
export function shouldShowMobileSearchHits(query, matchCount) {
  const q = (query || "").trim();
  if (!q) return false;
  return matchCount !== 1;
}

/**
 * Inbox Foto / meniu Foto: dosarul din search (unic) sau ultimul folosit.
 * La 0 sau 2+ rezultate de search nu ghicește — rămâne lista de deasupra barei.
 */
export function resolveInboxFotoClaim({ claims, searchQuery, lastClaimId }) {
  const q = (searchQuery || "").trim();
  if (q) {
    const unique = uniqueSearchMatch(claims, q);
    return unique || null;
  }
  if (!lastClaimId) return null;
  return (claims || []).find((c) => c.id === lastClaimId) || null;
}
