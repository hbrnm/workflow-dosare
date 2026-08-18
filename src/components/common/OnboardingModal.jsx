import React, { useState } from "react";
import { Sunrise, Layers, FileUp, Plus, X, ArrowRight, CheckCircle2, Zap } from "lucide-react";
import AppButton from "./AppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "./modalShellClasses";
import { useModalEscape } from "../../hooks/useModalEscape";

/**
 * 3-step onboarding wizard designed to reach the first "Aha! moment"
 * (Audatex / DAT deviz import or quick claim creation in < 30 seconds).
 */
export default function OnboardingModal({
  open,
  onDismiss,
  onCreateClaim,
  desktopUi = false,
  roleLabel = null,
}) {
  const [activeStep, setActiveStep] = useState(1); // 1, 2, 3

  useModalEscape(onDismiss, { enabled: open });

  if (!open) return null;

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        )}
        role="dialog"
        aria-labelledby="onboarding-title"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-[var(--app-border)]">
          <div className="min-w-0">
            <h2 id="onboarding-title" className="font-semibold text-[17px] text-[var(--app-text-strong)] tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-[var(--app-primary,#0284c7)]" />
              <span>Bun venit în Workflow Daune!</span>
            </h2>
            <p className="text-[12px] text-[var(--app-muted)] mt-1 leading-relaxed">
              Configurare rapidă în 3 pași. {roleLabel ? `Rol: ${roleLabel}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] shrink-0"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              onClick={() => setActiveStep(s)}
              className={`flex-1 h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                s <= activeStep ? "bg-[var(--app-primary,#0284c7)]" : "bg-[var(--app-border)]"
              }`}
            />
          ))}
          <span className="text-[11px] font-bold text-[var(--app-muted)] ml-1">
            {activeStep}/3
          </span>
        </div>

        {/* Step 1: Welcome & Overview */}
        {activeStep === 1 ? (
          <div className="px-5 py-4 space-y-3.5 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] space-y-2">
              <div className="font-semibold text-[13.5px] text-[var(--app-text-strong)] flex items-center gap-2">
                <Sunrise size={16} className="text-[var(--app-primary,#0284c7)]" />
                <span>Fluxul digital al atelierului tău</span>
              </div>
              <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
                Workflow Daune standardizează toate cele 6 etape (de la Acord reparație la Facturat) și îți oferă alerte automate, programator și rapoarte de decontare.
              </p>
            </div>

            <ul className="space-y-2 text-[12px] text-[var(--app-text)]">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span><strong>Brief zilnic</strong> — alerte prioritare & mașini programate</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span><strong>Flux operațional</strong> — carduri compacte pe 6 stadii</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span><strong>Import instant deviz Audatex / DAT</strong></span>
              </li>
            </ul>

            <div className="pt-2">
              <AppButton
                variant="primary"
                className="w-full app-btn-lg justify-center"
                onClick={() => setActiveStep(2)}
              >
                <span>Pasul următor: Primul dosar</span>
                <ArrowRight size={16} />
              </AppButton>
            </div>
          </div>
        ) : null}

        {/* Step 2: Aha! Moment (Import Deviz / Creare Dosar Nou in < 30s) */}
        {activeStep === 2 ? (
          <div className="px-5 py-4 space-y-3.5 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-2">
              <div className="font-semibold text-[13.5px] text-[var(--app-text-strong)] flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                <span>Experiență rapidă — Primul „Aha!”</span>
              </div>
              <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
                Creează primul dosar în mai puțin de 30 de secunde sau importă un deviz Audatex/DAT direct în aplicație.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {onCreateClaim ? (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss?.();
                    onCreateClaim();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--app-primary,#0284c7)] bg-[var(--app-surface-2)] hover:bg-[var(--app-surface)] text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--app-primary,#0284c7)] text-white flex items-center justify-center shrink-0">
                    <FileUp size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px] text-[var(--app-text-strong)] group-hover:text-[var(--app-primary,#0284c7)] transition-colors">
                      ⚡ Importă Deviz Audatex / DAT
                    </div>
                    <div className="text-[11px] text-[var(--app-muted)]">
                      Extrage automat datele mașinii, piesele și suma devizului.
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[var(--app-muted)] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : null}

              {onCreateClaim ? (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss?.();
                    onCreateClaim();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-left transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Plus size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px] text-[var(--app-text-strong)]">
                      + Adaugă Dosar Nou Manual (30s)
                    </div>
                    <div className="text-[11px] text-[var(--app-muted)]">
                      Formular rapid cu număr auto, marcă și asigurator.
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[var(--app-muted)] group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : null}
            </div>

            <div className="pt-1 flex gap-2">
              <AppButton
                variant="secondary"
                className="flex-1"
                onClick={() => setActiveStep(1)}
              >
                Înapoi
              </AppButton>
              <AppButton
                variant="primary"
                className="flex-1 justify-center"
                onClick={() => setActiveStep(3)}
              >
                <span>Gata de lucru</span>
                <ArrowRight size={16} />
              </AppButton>
            </div>
          </div>
        ) : null}

        {/* Step 3: Ready & Exploration */}
        {activeStep === 3 ? (
          <div className="px-5 py-4 space-y-3.5 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-[15px] text-[var(--app-text-strong)]">
                Profilul atelierului tău este gata!
              </h3>
              <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
                Poți accesa oricând <strong>Setări → Branding</strong> pentru a adăuga sigla atelierului sau pentru a invita colegi.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {onCreateClaim ? (
                <AppButton
                  variant="primary"
                  className="w-full app-btn-lg justify-center"
                  onClick={() => {
                    onDismiss?.();
                    onCreateClaim();
                  }}
                >
                  <Plus size={16} /> Creează primul dosar acum
                </AppButton>
              ) : null}
              <AppButton variant="secondary" className="w-full app-btn-lg justify-center" onClick={onDismiss}>
                Explorează aplicația
              </AppButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

