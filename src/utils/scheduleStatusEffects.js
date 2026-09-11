import { nowISO, todayISO } from "./dateUtils";
import { getStatusDefinition } from "../constants/config";

/** Statusuri după (inclusiv) programare — nu le demotăm la reprogramare. */
export const POST_SCHEDULE_STATUSES = [
  "programat",
  "in_lucru",
  "accept_plata",
  "facturat",
  // legacy keys still present in DB until migrated at read time
  "gata_de_ridicare",
  "predat_client",
];

/** Statusuri după programat — reprogramarea nu trebuie să le trimită înapoi la „programat”. */
export const POST_PROGRAMAT_STATUSES = [
  "in_lucru",
  "accept_plata",
  "facturat",
  "gata_de_ridicare",
  "predat_client",
];

/**
 * Statusuri din care o programare nouă promovează automat la „Programat”.
 * Accept plată e după reparație — nu se promovează din Accept înapoi la Programat.
 */
export const PRE_PROGRAMAT_STATUSES = [
  "deschidere",
  "reconstatare",
  "piese_comandate",
  "piese_sosite",
  "primit",
  "cerere_reparatie",
];

export function isAwaitingSchedule(claim) {
  const key = getStatusDefinition(claim?.status).key;
  return Boolean(
    claim?.pieseSosite ||
    key === "piese_comandate" ||
    claim?.status === "piese_sosite"
  );
}

export function shouldPromoteToProgramatOnSchedule(claim) {
  if (!claim) return false;
  const key = getStatusDefinition(claim.status).key;
  if (POST_SCHEDULE_STATUSES.includes(key) || POST_SCHEDULE_STATUSES.includes(claim.status)) {
    return false;
  }
  return (
    PRE_PROGRAMAT_STATUSES.includes(claim.status) ||
    PRE_PROGRAMAT_STATUSES.includes(key) ||
    isAwaitingSchedule(claim)
  );
}

/**
 * Brief „Intrări Programate Astăzi”: doar mașini încă pe Programat.
 * După bifă „În lucru” / Reparație (sau stadii ulterioare) dispar din listă.
 */
export function isPendingArrivalToday(claim, today = todayISO()) {
  if (!claim?.dataProgramare) return false;
  if (String(claim.dataProgramare).slice(0, 10) !== today) return false;
  return getStatusDefinition(claim.status).key === "programat";
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

/**
 * Side-effects Programări ↔ status.
 * Pure: returns enriched patch + optional user notices.
 *
 * Rules:
 * 1. Set dataProgramare on parts-ready / pre-schedule claim → status programat
 * 2. Reschedule while in reparație / accept / facturat → never demote to programat
 * 3. Clear dataProgramare while programat → piese_comandate (keep pieseSosite)
 * 4. adusaFizic=true while programat → in_lucru (Reparație)
 * 5. Explicit status in_lucru from programat → set adusaFizic
 */
export function applyScheduleStatusEffects(current, patch = {}) {
  if (!current) return { patch: { ...patch }, notices: [] };

  const next = { ...patch };
  const notices = [];
  const currentKey = getStatusDefinition(current.status).key;

  const hasDateKey = hasOwn(patch, "dataProgramare");
  const settingDate = hasDateKey && Boolean(patch.dataProgramare);
  const clearingDate = hasDateKey && !patch.dataProgramare;
  const dateChanged =
    hasDateKey &&
    String(patch.dataProgramare || "") !== String(current.dataProgramare || "");

  if (dateChanged || clearingDate) {
    next.programareStatus = null;
  }

  // 2) Nu demota statusuri avansate când UI forțează status: programat la editare dată
  if (
    (POST_PROGRAMAT_STATUSES.includes(currentKey) ||
      POST_PROGRAMAT_STATUSES.includes(current.status)) &&
    next.status === "programat"
  ) {
    delete next.status;
  }

  // 1) Programare nouă din AIR / Piese / etape anterioare → Programat
  if (settingDate) {
    const alreadyBeyondParts =
      POST_SCHEDULE_STATUSES.includes(currentKey) ||
      POST_SCHEDULE_STATUSES.includes(current.status);
    if (shouldPromoteToProgramatOnSchedule(current) && !alreadyBeyondParts) {
      next.status = "programat";
      next.dataSchimbareStatus = nowISO();
      notices.push('Dosar mutat automat în „Programări".');
    }
  }

  // 3) Anulare programare pe status Programat → înapoi la Piese
  if (
    clearingDate &&
    currentKey === "programat" &&
    !hasOwn(next, "status")
  ) {
    next.status = "piese_comandate";
    next.dataSchimbareStatus = nowISO();
    notices.push('Programare anulată — dosar revenit la „Piese".');
  }

  // 4) Adus fizic pe Programat → Reparație
  if (hasOwn(next, "adusaFizic") && next.adusaFizic === true) {
    const effective = hasOwn(next, "status")
      ? getStatusDefinition(next.status).key
      : currentKey;
    if (effective === "programat") {
      next.status = "in_lucru";
      next.dataSchimbareStatus = nowISO();
      notices.push('Dosar mutat automat în „Reparație".');
    }
  }

  // 5) Mutare explicită Reparație din Programat → marchează adus fizic
  if (
    next.status === "in_lucru" &&
    currentKey === "programat" &&
    !hasOwn(next, "adusaFizic")
  ) {
    next.adusaFizic = true;
    next.financiar = {
      ...(current.financiar || {}),
      ...(next.financiar || {}),
      dataAdusaFizic: nowISO(),
    };
  }

  // 6) Piese sosite pe Piese cu dată de programare existentă → Programat
  if (
    hasOwn(next, "pieseSosite") &&
    next.pieseSosite === true &&
    currentKey === "piese_comandate" &&
    !hasOwn(next, "status") &&
    Boolean(current.dataProgramare)
  ) {
    next.status = "programat";
    next.dataSchimbareStatus = nowISO();
    notices.push('Piese sosite — dosar promovat automat în „Programări".');
  }

  return { patch: next, notices };
}
