import { nowISO, todayISO } from "./dateUtils";

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

/** Statusuri din care o programare nouă promovează automat la „Programat”. */
export const PRE_PROGRAMAT_STATUSES = [
  "deschidere",
  "reconstatare",
  "accept_plata",
  "piese_comandate",
  "piese_sosite",
  "primit",
  "cerere_reparatie",
];

export function isAwaitingSchedule(claim) {
  return Boolean(
    claim?.pieseSosite ||
    claim?.status === "piese_comandate" ||
    claim?.status === "piese_sosite"
  );
}

export function shouldPromoteToProgramatOnSchedule(claim) {
  if (!claim) return false;
  if (POST_SCHEDULE_STATUSES.includes(claim.status)) return false;
  return PRE_PROGRAMAT_STATUSES.includes(claim.status) || isAwaitingSchedule(claim);
}

/**
 * Brief „Intrări Programate Astăzi”: doar mașini încă pe Programat.
 * După bifă „În lucru” (sau stadii ulterioare) dispar din listă.
 */
export function isPendingArrivalToday(claim, today = todayISO()) {
  if (!claim?.dataProgramare) return false;
  if (String(claim.dataProgramare).slice(0, 10) !== today) return false;
  return claim.status === "programat";
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
  const dateChanged =
    hasDateKey &&
    String(patch.dataProgramare || "") !== String(current.dataProgramare || "");

  if (dateChanged || clearingDate) {
    next.programareStatus = null;
  }

  // 2) Nu demota statusuri avansate când UI forțează status: programat la editare dată
  if (
    POST_PROGRAMAT_STATUSES.includes(current.status) &&
    next.status === "programat"
  ) {
    delete next.status;
  }

  // 1) Programare nouă din Accept / Piese / etape anterioare → Programat
  // (alerta Accept dispare automat — nu mai e pe accept_plata)
  if (settingDate) {
    const alreadyBeyondParts =
      POST_SCHEDULE_STATUSES.includes(current.status);
    if (shouldPromoteToProgramatOnSchedule(current) && !alreadyBeyondParts) {
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
    next.financiar = {
      ...(current.financiar || {}),
      ...(next.financiar || {}),
      dataAdusaFizic: nowISO(),
    };
  }

  return { patch: next, notices };
}
