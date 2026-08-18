import React from "react";
import { Shield, Zap, CreditCard, Users, FileText, ArrowUpRight, CheckCircle2, Clock, BarChart2 } from "lucide-react";
import AppButton from "../../common/AppButton";
import { fmtDate } from "../../../utils/dateUtils";

export default function SettingsBillingTab({
  billingView,
  tenancyReady = false,
  atelierId = null,
  stripeBusy = false,
  handleStripeCheckout,
  handleStripePortal,
  isAdmin = false,
  onOpenUpgradeModal,
}) {
  const planMeta = billingView?.planMeta;
  const planName = planMeta?.label || "14 Zile Trial";
  const isTrial = billingView?.plan === "trial";
  const isStarter = billingView?.plan === "starter";
  const isPro = billingView?.plan === "pro";
  const isEnterprise = billingView?.plan === "enterprise";

  const monthlyClaimsCount = billingView?.monthlyClaimsCount || 0;
  const maxMonthlyClaims = billingView?.maxMonthlyClaims;
  const monthlyClaimsPct = billingView?.monthlyClaimsPct || 0;

  const memberCount = billingView?.memberCount || 1;
  const seatLimit = billingView?.seatLimit || 5;

  return (
    <div className="space-y-4">
      {/* Overview Plan Curent */}
      <div className="bg-gradient-to-r from-sky-950/40 via-[var(--app-surface-2)] to-slate-900/60 border border-[var(--app-primary,#0284c7)]/30 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--app-primary,#0284c7)]/20 text-[var(--app-primary,#0284c7)] flex items-center justify-center font-bold shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[16px] text-[var(--app-text-strong)] tracking-tight">
                  Plan Curent: {planName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[var(--app-primary,#0284c7)]/20 text-[var(--app-primary,#0284c7)]">
                  {planMeta?.priceLabel || "Gratuit"}
                </span>
              </div>
              <p className="text-[12px] text-[var(--app-muted)] mt-0.5">
                {planMeta?.description}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              {billingView?.hasStripeCustomer ? (
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={stripeBusy || !atelierId}
                  onClick={handleStripePortal}
                  className="flex items-center gap-1.5"
                >
                  <CreditCard size={14} />
                  <span>Stripe Portal</span>
                  <ArrowUpRight size={13} />
                </AppButton>
              ) : null}

              <AppButton
                type="button"
                variant="primary"
                disabled={stripeBusy || !atelierId}
                onClick={onOpenUpgradeModal || handleStripeCheckout}
                className="bg-[var(--app-primary,#0284c7)] hover:bg-[var(--app-primary-hover,#0369a1)] text-white font-bold flex items-center gap-1.5"
              >
                <Zap size={14} />
                <span>{billingView?.hasStripeCustomer ? "Schimbă Planul" : "Treci la Pro"}</span>
              </AppButton>
            </div>
          ) : null}
        </div>

        {/* Status trial sau dată facturare */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--app-muted)]">
          <Clock size={14} className="text-amber-400" />
          <span>
            {isTrial && billingView?.trialEndsAt
              ? `Perioada de trial gratuit expiră pe ${fmtDate(billingView.trialEndsAt)}.`
              : `Următoarea dată de facturare este gestionată prin Stripe Customer Portal.`}
          </span>
        </div>
      </div>

      {/* Consum Resurse (Monthly Claims & Team Seats) */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <BarChart2 size={16} className="text-[var(--app-primary,#0284c7)]" /> Consum Resurse &amp; Limite
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Progress Dosare Lunare */}
          <div className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2">
            <div className="flex items-center justify-between text-[12.5px] font-bold">
              <span className="text-[var(--app-text-strong)] flex items-center gap-1.5">
                <FileText size={15} className="text-[var(--app-primary,#0284c7)]" /> Dosare Luna Aceasta
              </span>
              <span className="font-mono text-[var(--app-text-strong)]">
                {monthlyClaimsCount} / {maxMonthlyClaims ? maxMonthlyClaims : "∞ (Nelimitat)"}
              </span>
            </div>

            <div className="w-full h-2 bg-[var(--app-border)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  monthlyClaimsPct >= 90
                    ? "bg-red-500"
                    : monthlyClaimsPct >= 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${maxMonthlyClaims ? monthlyClaimsPct : 100}%` }}
              />
            </div>

            <p className="text-[11px] text-[var(--app-muted)]">
              {maxMonthlyClaims
                ? `${maxMonthlyClaims - monthlyClaimsCount} dosare rămase în planul Starter.`
                : "Planul tău permite deschiderea unui număr nelimitat de dosare."}
            </p>
          </div>

          {/* Progress Membri Echipă */}
          <div className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-2">
            <div className="flex items-center justify-between text-[12.5px] font-bold">
              <span className="text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Users size={15} className="text-[var(--app-primary,#0284c7)]" /> Membri Echipă (Seats)
              </span>
              <span className="font-mono text-[var(--app-text-strong)]">
                {memberCount} / {seatLimit}
              </span>
            </div>

            <div className="w-full h-2 bg-[var(--app-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((memberCount / seatLimit) * 100))}%` }}
              />
            </div>

            <p className="text-[11px] text-[var(--app-muted)]">
              {seatLimit - memberCount > 0
                ? `Poți mai adăuga ${seatLimit - memberCount} membri în echipa atelierului.`
                : "Ai atins limita de locuri incluse în planul curent."}
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Self-Service Customer Portal Info */}
      <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-[13.5px] text-[var(--app-text-strong)] flex items-center gap-1.5">
            <CreditCard size={16} className="text-emerald-400" /> Facturi PDF &amp; Modificare Card (Stripe Portal)
          </h4>
          <p className="text-[11.5px] text-[var(--app-muted)] mt-0.5">
            Descarcă facturile lunare în format PDF, actualizează datele de pe card sau modifică metoda de plată 100% securizat.
          </p>
        </div>

        {isAdmin && billingView?.hasStripeCustomer ? (
          <AppButton
            type="button"
            variant="secondary"
            disabled={stripeBusy || !atelierId}
            onClick={handleStripePortal}
            className="shrink-0 flex items-center gap-1.5"
          >
            <CreditCard size={14} />
            <span>Portal Facturi Stripe</span>
          </AppButton>
        ) : null}
      </div>
    </div>
  );
}
