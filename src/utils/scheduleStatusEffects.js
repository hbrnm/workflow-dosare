import { nowISO } from "./dateUtils";

/** Statusuri după (inclusiv) programare — nu le demotăm la reprogramare. */
export const POST_SCHEDULE_STATUSES = [
  "programat",
  "in_lucru",
  "gata_de_ridicare",
  "predat_client",
  "facturat",
];

/** Statusuri după programat — reprogramarea nu trebuie să le trimită înapoi la „programat”. */
export const POST_PROGRAMAT_STATUSES = [
  "in_lucru",
  "gata_de_ridicare",
  "predat_client",
  "facturat",
];

export function isAwaitingSchedule(claim) {
  return Boolean(
    claim?.pieseSosite ||
    claim?.status === "piese_comandate" ||
    claim?.status === "piese_sosite"
  );
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

/**
 * Side-effects Programări ↔ status.
 * Pure: returns enriched patch + optional user notices.
 *
 * Rules:
 * 1. Set dataProgramare on parts-ready claim → status programat
 * 2. Reschedule while in_lucru / gata / predat / facturat → never demote to programat
 * 3. Clear dataProgramare while programat → piese_comandate (keep pieseSosite)
 * 4. adusaFizic=true while programat → in_lucru
 * 5. Explicit status in_lucru from programat → set adusaFizic
 */
export function applyScheduleStatusEffects(current, patch = {}) {
  if (!current) return { patch: { ...patch }, notices: [] };

  const next = { ...patch };
  const notices = [];

  const hasDateKey = hasOwn(patch, "dataProgramare");
  const settingDate = hasDateKey && Boolean(patch.dataProgramare);
  const clearingDate = hasDateKey && !patch.dataProgramare;

  // 2) Nu demota statusuri avansate când UI forțează status: programat la editare dată
  if (
    POST_PROGRAMAT_STATUSES.includes(current.status) &&
    next.status === "programat"
  ) {
    delete next.status;
  }

  // 1) Programare nouă din piese gata → Programat
  if (settingDate) {
    const alreadyBeyondParts =
      POST_SCHEDULE_STATUSES.includes(current.status);
    if (isAwaitingSchedule(current) && !alreadyBeyondParts) {
      next.status = "programat";
      next.dataSchimbareStatus = nowISO();
      notices.push('Dosar mutat automat în „Programat".');
    }
  }

  // 3) Anulare programare pe status Programat → înapoi la Piese comandate
  if (clearingDate && current.status === "programat" && !hasOwn(next, "status")) {
    next.status = "piese_comandate";
    next.dataSchimbareStatus = nowISO();
    notices.push('Programare anulată — dosar revenit la „Piese comandate".');
  }

  // 4) Adus fizic pe Programat → În lucru
  if (hasOwn(next, "adusaFizic") && next.adusaFizic === true) {
    const effective = hasOwn(next, "status") ? next.status : current.status;
    if (effective === "programat" || (!hasOwn(next, "status") && current.status === "programat")) {
      next.status = "in_lucru";
      next.dataSchimbareStatus = nowISO();
      notices.push('Dosar mutat automat în „În lucru".');
    }
  }

  // 5) Mutare explicită În lucru din Programat → marchează adus fizic
  if (
    next.status === "in_lucru" &&
    current.status === "programat" &&
    !hasOwn(next, "adusaFizic")
  ) {
    next.adusaFizic = true;
    if (!hasOwn(next, "dataAdusaFizic")) {
      next.dataAdusaFizic = nowISO();
    }
  }

  return { patch: next, notices };
}
