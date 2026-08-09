/**
 * Lightweight claim authorship helpers — fields already stamped by useClaims.
 */

/** Columns that clutter the activity journal without helping operators. */
export const ISTORIC_NOISE_FIELDS = new Set([
  "updated_by_email",
  "data_ultimei_actualizari",
  "created_at",
  "created_by",
  "created_by_email",
]);

/**
 * @param {{ createdByEmail?: string, updatedByEmail?: string, dataUltimeiActualizari?: string, dataDeschiderii?: string } | null} claim
 */
export function getClaimAuditMeta(claim) {
  if (!claim) {
    return { createdByEmail: "", updatedByEmail: "", updatedAt: null };
  }
  const createdByEmail = String(claim.createdByEmail || "").trim();
  const updatedByEmail = String(claim.updatedByEmail || "").trim();
  const updatedAt = claim.dataUltimeiActualizari || claim.dataDeschiderii || null;
  return { createdByEmail, updatedByEmail, updatedAt };
}

/**
 * Filter trigger diffs for display (keep _creat and meaningful field changes).
 * @param {Record<string, unknown> | null | undefined} modificari
 */
export function filterIstoricModificari(modificari) {
  if (!modificari || typeof modificari !== "object") return {};
  return Object.fromEntries(
    Object.entries(modificari).filter(([camp]) => !ISTORIC_NOISE_FIELDS.has(camp))
  );
}
