import React from "react";
import { Sparkles, Check, X, Shield, ArrowRight, Zap, Crown, Building } from "lucide-react";
import AppButton from "./AppButton";
import { BILLING_PLANS } from "../../constants/billing";
import { modalOverlayClass, modalOverlayProps, modalPanelClass } from "./modalShellClasses";

export default function UpgradeModal({
  open = false,
  onClose,
  title = "Deblochează tot potențialul cu planul Pro",
  reason = "Ai atins limita planului Starter. Treci la Pro pentru dosare nelimitate și import automat de devize.",
  currentPlan = "starter",
  onSelectPlan,
  stripeBusy = false,
}) {
  if (!open) return null;

  return (
    <div className={modalOverlayClass} {...modalOverlayProps}>
      <div
        className={`${modalPanelClass} max-w-3xl border border-[var(--app-primary,#0284c7)]/40 bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--app-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-[18px] font-black text-[var(--app-text-strong)] tracking-tight">
                {title}
              </h2>
              <p className="text-[12.5px] text-[var(--app-muted)] mt-0.5">{reason}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Plan Cards Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {/* Starter Plan */}
          <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]/50 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-muted)]">
                Starter
              </div>
              <div className="text-[20px] font-extrabold text-[var(--app-text-strong)] mt-1">
                199 RON <span className="text-[11px] font-normal text-[var(--app-muted)]">/lună</span>
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] mt-1.5 leading-snug">
                Până la 20 dosare/lună &amp; 2 utilizatori incluși.
              </p>

              <ul className="space-y-2 mt-4 text-[12px]">
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Check size={14} className="text-emerald-500" /> Max. 20 dosare/lună
                </li>
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Check size={14} className="text-emerald-500" /> 2 membri echipă
                </li>
                <li className="flex items-center gap-2 text-[var(--app-muted)] line-through">
                  <X size={14} className="text-slate-500" /> Import Devize Audatex/DAT
                </li>
                <li className="flex items-center gap-2 text-[var(--app-muted)] line-through">
                  <X size={14} className="text-slate-500" /> Export Excel &amp; ZIP Arhivă
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={currentPlan === "starter" || stripeBusy}
              onClick={() => onSelectPlan?.("starter")}
              className="mt-5 w-full py-2 px-3 rounded-lg border border-[var(--app-border)] text-[12px] font-bold text-[var(--app-text)] hover:bg-[var(--app-surface)] disabled:opacity-50"
            >
              {currentPlan === "starter" ? "Plan Curent" : "Alege Starter"}
            </button>
          </div>

          {/* Pro Plan (Popular Highlight) */}
          <div className="p-4 rounded-xl border-2 border-[var(--app-primary,#0284c7)] bg-gradient-to-b from-sky-950/30 via-[var(--app-surface)] to-[var(--app-surface-2)] shadow-lg relative flex flex-col justify-between">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--app-primary,#0284c7)] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Crown size={11} /> Recomandat
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-primary,#0284c7)] mt-1">
                Pro
              </div>
              <div className="text-[22px] font-extrabold text-[var(--app-text-strong)] mt-1">
                499 RON <span className="text-[11px] font-normal text-[var(--app-muted)]">/lună</span>
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] mt-1.5 leading-snug">
                Dosare nelimitate, 5 utilizatori incluși &amp; import automat devize.
              </p>

              <ul className="space-y-2 mt-4 text-[12px]">
                <li className="flex items-center gap-2 font-bold text-[var(--app-text-strong)]">
                  <Check size={14} className="text-emerald-400" /> Dosare nelimitate
                </li>
                <li className="flex items-center gap-2 font-bold text-[var(--app-text-strong)]">
                  <Check size={14} className="text-emerald-400" /> 5 membri echipă incluși
                </li>
                <li className="flex items-center gap-2 font-bold text-sky-400">
                  <Sparkles size={14} /> Import Devize Audatex / DAT
                </li>
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Check size={14} className="text-emerald-400" /> Export Excel &amp; ZIP Arhivă Complete
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={stripeBusy}
              onClick={() => onSelectPlan?.("pro")}
              className="mt-5 w-full py-2.5 px-3 rounded-lg bg-[var(--app-primary,#0284c7)] hover:bg-[var(--app-primary-hover,#0369a1)] text-white text-[12.5px] font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>{stripeBusy ? "Se procesează..." : "Treci la Pro Acum"}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]/50 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                Enterprise
              </div>
              <div className="text-[20px] font-extrabold text-[var(--app-text-strong)] mt-1">
                Personalizat
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] mt-1.5 leading-snug">
                Multi-locație, utilizatori nelimitați, API custom &amp; suport dedicat.
              </p>

              <ul className="space-y-2 mt-4 text-[12px]">
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Building size={14} className="text-indigo-400" /> Multi-Service / Puncte de lucru
                </li>
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Check size={14} className="text-emerald-500" /> Utilizatori &amp; Dosare Nelimitate
                </li>
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Check size={14} className="text-emerald-500" /> Integrări API &amp; Webhooks Custom
                </li>
                <li className="flex items-center gap-2 text-[var(--app-text)]">
                  <Shield size={14} className="text-indigo-400" /> Suport prioritar 24/7
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={stripeBusy}
              onClick={() => onSelectPlan?.("enterprise")}
              className="mt-5 w-full py-2 px-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[12px] font-bold"
            >
              Contactează-ne
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-2 border-t border-[var(--app-border)] text-[11.5px] text-[var(--app-muted)]">
          🔒 Plăți securizate prin Stripe. Poți schimba sau anula abonamentul oricând din setările atelierului.
        </div>
      </div>
    </div>
  );
}
