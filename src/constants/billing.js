/**
 * Billing stub — no Stripe yet. Plans live on setari / ateliere after migrare 29.
 */

export const BILLING_PLANS = {
  trial: {
    id: "trial",
    label: "Trial",
    description: "Perioadă de evaluare — fără card.",
  },
  active: {
    id: "active",
    label: "Activ",
    description: "Abonament activ (manual / Stripe ulterior).",
  },
  past_due: {
    id: "past_due",
    label: "Restanță",
    description: "Plată întârziată — invitările pot fi blocate.",
  },
  canceled: {
    id: "canceled",
    label: "Anulat",
    description: "Plan anulat — doar citire recomandată.",
  },
};

export const DEFAULT_SEAT_LIMIT = 10;
export const DEFAULT_TRIAL_DAYS = 30;

/**
 * @param {{ plan?: string, trialEndsAt?: string|null, seatLimit?: number|null, memberCount?: number }} input
 */
export function normalizeBilling(input = {}) {
  const rawPlan = String(input.plan || "trial").toLowerCase();
  const plan = BILLING_PLANS[rawPlan] ? rawPlan : "trial";
  const seatLimit = Number.isFinite(Number(input.seatLimit))
    ? Math.max(1, Number(input.seatLimit))
    : DEFAULT_SEAT_LIMIT;
  const memberCount = Math.max(0, Number(input.memberCount) || 0);
  const trialEndsAt = input.trialEndsAt || null;
  const trialEnded =
    plan === "trial" && trialEndsAt
      ? new Date(trialEndsAt).getTime() < Date.now()
      : false;

  const effectivePlan = trialEnded && plan === "trial" ? "past_due" : plan;
  const seatsLeft = Math.max(0, seatLimit - memberCount);
  const overSeatLimit = memberCount >= seatLimit;
  const canInvite = effectivePlan !== "canceled" && !overSeatLimit;
  const canCreateClaim = effectivePlan !== "canceled";

  return {
    plan: effectivePlan,
    planMeta: BILLING_PLANS[effectivePlan] || BILLING_PLANS.trial,
    trialEndsAt,
    trialEnded,
    seatLimit,
    memberCount,
    seatsLeft,
    overSeatLimit,
    canInvite,
    canCreateClaim,
  };
}
