import { isReadyForPickupOverdue, isStageOverdue } from "./alertUtils";
import { countUniqueVehicles } from "./plateSchedule";

/**
 * Product funnel from loaded claims (no external analytics).
 * Steps: create → programare → alerte
 *
 * @param {Array} claims
 * @param {{ pragRidicare?: number }} [opts]
 */
export function buildAtelierFunnel(claims = [], opts = {}) {
  const list = Array.isArray(claims) ? claims : [];
  const pragRidicare = opts.pragRidicare ?? 3;

  const created = list.length;
  const withProgramare = countUniqueVehicles(list.filter((c) => !!c?.dataProgramare));
  const withAlert = list.filter((c) => {
    if (c?.blocat) return true;
    if (isStageOverdue(c)) return true;
    if (isReadyForPickupOverdue(c, pragRidicare)) return true;
    return false;
  }).length;

  const pct = (n, d) => (d <= 0 ? null : Math.round((n / d) * 100));

  return {
    steps: [
      {
        id: "create",
        label: "Create",
        hint: "Dosare în atelier",
        count: created,
        rateFromPrev: null,
      },
      {
        id: "programare",
        label: "Programare",
        hint: "Au dată de programare",
        count: withProgramare,
        rateFromPrev: pct(withProgramare, created),
      },
      {
        id: "alerte",
        label: "Alerte",
        hint: "Blocate / întârziate / neridicate",
        count: withAlert,
        rateFromPrev: pct(withAlert, created),
      },
    ],
    created,
    withProgramare,
    withAlert,
    programareRate: pct(withProgramare, created),
    alertRate: pct(withAlert, created),
  };
}
