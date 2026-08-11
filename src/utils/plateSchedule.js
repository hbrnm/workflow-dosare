import { STATUSES, getStatusDefinition } from "../constants/config";
import { isAwaitingSchedule, POST_PROGRAMAT_STATUSES } from "./scheduleStatusEffects";

export function normalizePlate(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidPlateKey(plate) {
  return Boolean(plate && String(plate).length > 2);
}

export function plateGroupKey(claim) {
  const plate = normalizePlate(claim?.numarInmatriculare);
  return isValidPlateKey(plate) ? plate : claim?.id || "";
}

/** Sibling eligible to receive the same appointment when one dosar is scheduled. */
export function isCoScheduleEligible(sibling) {
  if (!sibling || sibling.status === "facturat") return false;
  const key = sibling.status;

  // Post-repair / closed-ish: only keep aligned if already scheduled
  if (
    (key === "accept_plata" ||
      key === "gata_de_ridicare" ||
      key === "predat_client") &&
    !sibling.dataProgramare
  ) {
    return false;
  }

  if (POST_PROGRAMAT_STATUSES.includes(key)) {
    return key === "in_lucru" || Boolean(sibling.dataProgramare);
  }

  return (
    isAwaitingSchedule(sibling) ||
    key === "programat" ||
    Boolean(sibling.dataProgramare)
  );
}

/**
 * Other claims on the same plate that should share schedule changes.
 * @param {"set"|"clear"} mode
 * @param {string|null} previousDate — for clear: only siblings on this datetime
 */
export function findCoScheduleSiblings(claims, claim, { mode = "set", previousDate } = {}) {
  const plate = normalizePlate(claim?.numarInmatriculare);
  if (!isValidPlateKey(plate) || !claim?.id) return [];

  return (claims || []).filter((c) => {
    if (!c || c.id === claim.id) return false;
    if (normalizePlate(c.numarInmatriculare) !== plate) return false;
    if (!isCoScheduleEligible(c)) return false;

    if (mode === "clear") {
      const anchor = previousDate != null ? previousDate : claim.dataProgramare;
      return Boolean(anchor) && String(c.dataProgramare || "") === String(anchor || "");
    }

    // set / reschedule: align eligible siblings (overwrite different dates)
    return true;
  });
}

/** Group claims by plate for Programator / MobileProgramari stacking. */
export function groupClaimsByPlate(claims = []) {
  const map = new Map();
  for (const c of claims || []) {
    const key = plateGroupKey(c) || c.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return Array.from(map.values());
}

/** Number of unique vehicles (plate-grouped claims). */
export function countUniqueVehicles(claims = []) {
  return groupClaimsByPlate(claims).length;
}

const UNIQUE_VEHICLE_STATUS_KEYS = new Set(["programat", "in_lucru"]);

function claimStatusKey(claim) {
  return getStatusDefinition(claim?.status).key;
}

/** Count claims in a status; programat + in_lucru dedupe by plate (1 vehicle = 1). */
export function countClaimsForStatus(claims = [], statusKey) {
  const matching = (claims || []).filter((c) => claimStatusKey(c) === statusKey);
  if (UNIQUE_VEHICLE_STATUS_KEYS.has(statusKey)) {
    return countUniqueVehicles(matching);
  }
  return matching.length;
}

/** Stage badge counts for Flux / Tabel / Brief — unique vehicles for Programări & Reparație. */
export function buildStatusCounts(claims = []) {
  const counts = {};
  STATUSES.forEach((s) => {
    counts[s.key] = countClaimsForStatus(claims, s.key);
  });
  return counts;
}

/** Group by plate + exact appointment ISO (same date & time). */
export function groupClaimsByPlateAndSchedule(claims = []) {
  const map = new Map();
  for (const c of claims || []) {
    const plate = plateGroupKey(c) || c.id;
    const when = String(c.dataProgramare || "");
    const key = `${plate}__${when}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return Array.from(map.values());
}
