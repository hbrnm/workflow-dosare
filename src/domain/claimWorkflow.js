import { getStatusDefinition } from "../constants/config";

/**
 * Reguli minime de tranziție pentru fluxul dosarului.
 * Kanban-ul permite reordonări libere (inclusiv „Accept plată” din orice etapă, ex. pachet decont
 * trimis înainte de reparație), dar un dosar nu poate fi „Facturat” fără să treacă prin „Accept plată”.
 * Mutările înapoi sunt permise (corecturi).
 */
const ENTRY_RULES = {
  facturat: { from: ["accept_plata"], reason: "Dosarul poate fi facturat doar din etapa „Accept plată”." },
};

export function canTransition(fromStatus, toStatus) {
  const from = getStatusDefinition(fromStatus).key;
  const to = getStatusDefinition(toStatus).key;
  if (from === to) return { ok: true };
  const rule = ENTRY_RULES[to];
  if (rule && !rule.from.includes(from)) return { ok: false, reason: rule.reason };
  return { ok: true };
}

/** Cheie de status sigură: doar text nenul, altfel `fallback` (evită obiecte/evenimente folosite ca status). */
export function safeStatusKey(value, fallback = undefined) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
