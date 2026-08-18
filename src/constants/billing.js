/**
 * Billing Engine — Tiered + Pay-per-Seat Plans & Feature Gating.
 */

export const BILLING_PLANS = {
  trial: {
    id: "trial",
    label: "14 Zile Trial Gratuit (Pro)",
    priceLabel: "Gratuit",
    description: "Acces complet la toate funcțiile Pro timp de 14 zile — fără card necesar.",
    maxMonthlyClaims: null,
    seatLimit: 5,
    audatexImport: true,
    excelExport: true,
    badge: "14 Zile Trial",
  },
  starter: {
    id: "starter",
    label: "Starter",
    priceLabel: "199 RON / lună",
    description: "Ideale pentru ateliere mici: până la 20 dosare/lună și 2 utilizatori incluși.",
    maxMonthlyClaims: 20,
    seatLimit: 2,
    audatexImport: false,
    excelExport: false,
    badge: "Starter",
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceLabel: "499 RON / lună",
    description: "Dosare nelimitate, 5 utilizatori incluși și modul import devize Audatex / DAT automat.",
    maxMonthlyClaims: null,
    seatLimit: 5,
    audatexImport: true,
    excelExport: true,
    popular: true,
    badge: "Cel mai popular",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    priceLabel: "Custom / Personalizat",
    description: "Pentru grupuri de service-uri multi-locație, utilizatori nelimitați, API custom și suport dedicat.",
    maxMonthlyClaims: null,
    seatLimit: 999,
    audatexImport: true,
    excelExport: true,
    multiLocation: true,
    badge: "Multi-Locație",
  },
  active: {
    id: "active",
    label: "Activ (Pro)",
    priceLabel: "Abonament Activ",
    description: "Abonament Stripe activ — acces complet.",
    maxMonthlyClaims: null,
    seatLimit: 10,
    audatexImport: true,
    excelExport: true,
  },
  past_due: {
    id: "past_due",
    label: "Restanță / Trial Expirat",
    priceLabel: "Plată necesară",
    description: "Perioada de trial a expirat sau plata a fost refuzată. Selectează un plan pentru a continua.",
    maxMonthlyClaims: 0,
    seatLimit: 1,
    audatexImport: false,
    excelExport: false,
  },
  canceled: {
    id: "canceled",
    label: "Anulat",
    priceLabel: "Inactiv",
    description: "Abonament anulat — acces doar în citire.",
    maxMonthlyClaims: 0,
    seatLimit: 1,
    audatexImport: false,
    excelExport: false,
  },
};

export const DEFAULT_SEAT_LIMIT = 5;

/**
 * Normalizează starea de billing & calculul de consum resurse/limite
 * @param {{
 *   plan?: string,
 *   trialEndsAt?: string|null,
 *   seatLimit?: number|null,
 *   memberCount?: number,
 *   monthlyClaimsCount?: number,
 *   stripeCustomerId?: string|null,
 *   stripeSubscriptionId?: string|null
 * }} input
 */
export function normalizeBilling(input = {}) {
  const rawPlan = String(input.plan || "trial").toLowerCase();
  const planKey = BILLING_PLANS[rawPlan] ? rawPlan : "trial";

  const trialEndsAt = input.trialEndsAt || null;
  const trialEnded =
    planKey === "trial" && trialEndsAt
      ? new Date(trialEndsAt).getTime() < Date.now()
      : false;

  const effectivePlanKey = trialEnded && planKey === "trial" ? "past_due" : planKey;
  const effectiveMeta = BILLING_PLANS[effectivePlanKey] || BILLING_PLANS.starter;

  const seatLimit = Number.isFinite(Number(input.seatLimit))
    ? Math.max(1, Number(input.seatLimit))
    : effectiveMeta.seatLimit || DEFAULT_SEAT_LIMIT;

  const memberCount = Math.max(0, Number(input.memberCount) || 0);
  const monthlyClaimsCount = Math.max(0, Number(input.monthlyClaimsCount) || 0);

  const seatsLeft = Math.max(0, seatLimit - memberCount);
  const overSeatLimit = memberCount >= seatLimit;

  const maxMonthlyClaims = effectiveMeta.maxMonthlyClaims;
  const monthlyClaimsPct = maxMonthlyClaims
    ? Math.min(100, Math.round((monthlyClaimsCount / maxMonthlyClaims) * 100))
    : 0;

  const claimLimitReached = maxMonthlyClaims ? monthlyClaimsCount >= maxMonthlyClaims : false;
  const canInvite = effectivePlanKey !== "canceled" && effectivePlanKey !== "past_due" && !overSeatLimit;
  const canCreateClaim = effectivePlanKey !== "canceled" && effectivePlanKey !== "past_due" && !claimLimitReached;

  const stripeCustomerId = input.stripeCustomerId || null;
  const stripeSubscriptionId = input.stripeSubscriptionId || null;
  const hasStripeCustomer = Boolean(stripeCustomerId);

  return {
    plan: effectivePlanKey,
    planMeta: effectiveMeta,
    trialEndsAt,
    trialEnded,
    seatLimit,
    memberCount,
    seatsLeft,
    overSeatLimit,
    monthlyClaimsCount,
    maxMonthlyClaims,
    monthlyClaimsPct,
    claimLimitReached,
    canInvite,
    canCreateClaim,
    audatexImportAllowed: effectiveMeta.audatexImport ?? true,
    excelExportAllowed: effectiveMeta.excelExport ?? true,
    stripeCustomerId,
    stripeSubscriptionId,
    hasStripeCustomer,
    needsUpgrade:
      effectivePlanKey === "trial" ||
      effectivePlanKey === "past_due" ||
      effectivePlanKey === "canceled" ||
      effectivePlanKey === "starter",
  };
}
