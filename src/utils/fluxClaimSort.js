import { STATUSES } from "../constants/config";
import { daysBetween } from "./dateUtils";
import { isStageOverdue, isDeliveryDeadlineOverdue, isPartsOrderOverdue, getDaysPastDeliveryDeadline } from "./alertUtils";

export function getClaimStageDays(claim) {
  return claim?.dataSchimbareStatus ? daysBetween(claim.dataSchimbareStatus) : 0;
}

/** Timestamp deschidere — pentru sortare (fără dată = 0, rămâne la final la desc). */
export function getClaimOpenedAt(claim) {
  const raw = claim?.dataDeschiderii || claim?.dataSchimbareStatus || "";
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/** Scor alertă — mai mare = mai urgent (blocat > termen > piese > stagnare). */
export function getClaimAlertScore(claim, pieseAlertDays) {
  let score = 0;
  if (claim.blocat) score += 10_000;
  if (isDeliveryDeadlineOverdue(claim)) score += 5_000 + getDaysPastDeliveryDeadline(claim);
  if (isPartsOrderOverdue(claim, pieseAlertDays)) score += 2_000 + getClaimStageDays(claim);
  if (isStageOverdue(claim)) score += 1_000 + getClaimStageDays(claim);
  return score;
}

function getGroupSortValue(groupClaims, sortKey, pieseAlertDays) {
  if (sortKey === "deschidere") {
    // Cel mai recent din grup — pentru „ultimul deschis” sus-stânga
    return Math.max(...groupClaims.map(getClaimOpenedAt));
  }
  if (sortKey === "vechime") {
    return Math.max(...groupClaims.map(getClaimStageDays));
  }
  return Math.max(...groupClaims.map((c) => getClaimAlertScore(c, pieseAlertDays)));
}

export function groupAndSortStageClaims(stageClaims, sortKey, pieseAlertDays) {
  const groupedMap = new Map();
  stageClaims.forEach((c) => {
    const plate = (c.numarInmatriculare || "").trim().toUpperCase();
    const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key).push(c);
  });

  const compareClaims = (a, b) => {
    if (sortKey === "deschidere") {
      // Cel mai recent deschis primul (grid: sus-stânga → dreapta)
      const diff = getClaimOpenedAt(b) - getClaimOpenedAt(a);
      if (diff !== 0) return diff;
      return String(b.numarDosar || "").localeCompare(String(a.numarDosar || ""), "ro");
    }
    if (sortKey === "vechime") return getClaimStageDays(b) - getClaimStageDays(a);
    const diff = getClaimAlertScore(b, pieseAlertDays) - getClaimAlertScore(a, pieseAlertDays);
    return diff !== 0 ? diff : getClaimStageDays(b) - getClaimStageDays(a);
  };

  groupedMap.forEach((group) => group.sort(compareClaims));

  return Array.from(groupedMap.entries()).sort(([, ga], [, gb]) => {
    if (sortKey === "deschidere") {
      const diff = getGroupSortValue(gb, sortKey, pieseAlertDays) - getGroupSortValue(ga, sortKey, pieseAlertDays);
      if (diff !== 0) return diff;
      const plateA = (ga[0]?.numarInmatriculare || "").trim();
      const plateB = (gb[0]?.numarInmatriculare || "").trim();
      return plateA.localeCompare(plateB, "ro");
    }
    const diff = getGroupSortValue(gb, sortKey, pieseAlertDays) - getGroupSortValue(ga, sortKey, pieseAlertDays);
    if (diff !== 0) return diff;
    const plateA = (ga[0]?.numarInmatriculare || "").trim();
    const plateB = (gb[0]?.numarInmatriculare || "").trim();
    return plateA.localeCompare(plateB, "ro");
  });
}

/** Listă plată pentru export — aceeași ordine ca în Flux. */
export function getFluxExportClaims(
  claims = [],
  { focusedStage = null, sortKey = "deschidere", pieseAlertDays = 4 } = {},
) {
  const stages = focusedStage
    ? STATUSES.filter((s) => s.key === focusedStage)
    : STATUSES.filter((s) => claims.some((c) => c.status === s.key));

  const result = [];
  stages.forEach((status) => {
    const stageClaims = claims.filter((c) => c.status === status.key);
    groupAndSortStageClaims(stageClaims, sortKey, pieseAlertDays).forEach(([, groupClaims]) => {
      result.push(...groupClaims);
    });
  });
  return result;
}
