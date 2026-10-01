import { getStatusDefinition } from "../constants/config";

/**
 * Reguli minime de tranziție pentru fluxul dosarului.
 * Kanban-ul permite reordonări libere, dar nu și sărirea peste etapele financiare:
 *  - nu se poate ajunge la „Facturat” decât din „Accept plată”;
 *  - nu se poate ajunge la „Accept plată” înainte să înceapă reparația (din „Acord”/„Piese”).
 * Mutările înapoi sunt permise (corecturi).
 */
const ENTRY_RULES = {
  facturat: { from: ["accept_plata"], reason: "Dosarul poate fi facturat doar din etapa „Accept plată”." },
  accept_plata: {
    from: ["programat", "in_lucru", "facturat"],
    reason: "„Accept plată” se poate seta doar după programare/reparație.",
  },
};

export function canTransition(fromStatus, toStatus) {
  const from = getStatusDefinition(fromStatus).key;
  const to = getStatusDefinition(toStatus).key;
  if (from === to) return { ok: true };
  const rule = ENTRY_RULES[to];
  if (rule && !rule.from.includes(from)) return { ok: false, reason: rule.reason };
  return { ok: true };
}
