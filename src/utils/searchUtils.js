/** Potrivire căutare — aceleași câmpuri în filtre, highlight și paletă comenzi. */
export function claimMatchesSearch(claim, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q || !claim) return false;
  return (
    (claim.numarInmatriculare || "").toLowerCase().includes(q) ||
    (claim.client || "").toLowerCase().includes(q) ||
    (claim.numarDosar || "").toLowerCase().includes(q) ||
    (claim.asigurator || "").toLowerCase().includes(q) ||
    (claim.vin || "").toLowerCase().includes(q)
  );
}

/** Set de id-uri dosare care conțin textul căutat, sau null dacă nu e căutare activă. */
export function getSearchHighlightIds(claims, query) {
  const q = (query || "").trim();
  if (!q) return null;
  const ids = new Set();
  (claims || []).forEach((c) => {
    if (claimMatchesSearch(c, q)) ids.add(c.id);
  });
  return ids.size ? ids : null;
}

export function isSearchHighlighted(claimId, highlightClaimIds) {
  return Boolean(claimId && highlightClaimIds?.has(claimId));
}

export function groupHasSearchHighlight(groupClaims, highlightClaimIds) {
  return Boolean(
    highlightClaimIds &&
    groupClaims?.some((c) => highlightClaimIds.has(c.id))
  );
}

/** Scroll la primul element vizibil din listă. */
export function scrollToFirstHighlight(highlightClaimIds, idPrefix = "claim-card") {
  if (!highlightClaimIds?.size) return;
  for (const id of highlightClaimIds) {
    const el =
      document.getElementById(`${idPrefix}-${id}`) ||
      document.getElementById(`claim-row-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      break;
    }
  }
}
