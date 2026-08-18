import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, Sparkles, Building2, UserPlus, FilePlus2, ChevronDown, ChevronUp, X } from "lucide-react";
import AppButton from "./AppButton";

const BANNER_DISMISS_KEY = "workflow_dosare_checklist_dismissed";

export default function OnboardingChecklistBanner({
  branding,
  memberCount = 1,
  realClaimsCount = 0,
  onOpenSettingsBranding,
  onOpenSettingsUsers,
  onOpenNewClaim,
  onRemoveDemoData,
  hasDemoData = false,
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [collapsed, setCollapsed] = useState(false);

  // Calculate task completions
  const step1Done = Boolean(branding?.atelierNume && branding.atelierNume !== "Atelier");
  const step2Done = memberCount > 1;
  const step3Done = realClaimsCount > 0;

  const completedCount = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const progressPct = Math.round((completedCount / 3) * 100);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-[var(--app-primary,#0284c7)]/30 bg-gradient-to-r from-sky-950/40 via-[var(--app-surface-2)] to-slate-900/60 p-4 shadow-sm transition-all animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--app-primary,#0284c7)]/20 border border-[var(--app-primary,#0284c7)]/40 text-[var(--app-primary,#0284c7)] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[14.5px] text-[var(--app-text-strong)] tracking-tight truncate">
                Ghid de configurare rapidă atelier
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[var(--app-primary,#0284c7)]/20 text-[var(--app-primary,#0284c7)] shrink-0">
                {progressPct}% completat
              </span>
            </div>
            <p className="text-[12px] text-[var(--app-muted)] mt-0.5 truncate">
              {completedCount === 3
                ? "Excelent! Ai configurat toate etapele principale ale atelierului."
                : "Urmează pașii de mai jos pentru a activa complet fluxul operațional."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasDemoData ? (
            <button
              type="button"
              onClick={onRemoveDemoData}
              className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11.5px] font-semibold hover:bg-amber-500/20 transition-all hidden sm:inline-flex items-center gap-1"
              title="Curăță dosarele demonstrative"
            >
              Curăță date demo
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
            title={collapsed ? "Extinde ghidul" : "Restrânge ghidul"}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
            title="Închide ghidul"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[var(--app-border)] rounded-full overflow-hidden my-3">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Checklist items */}
      {!collapsed ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Step 1: Atelier details */}
          <div
            onClick={onOpenSettingsBranding}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              step1Done
                ? "bg-emerald-950/20 border-emerald-500/30 opacity-90"
                : "bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-primary,#0284c7)]"
            }`}
          >
            {step1Done ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-[var(--app-muted)] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Building2 size={13} className="text-[var(--app-muted)]" />
                <span>1. Datele service-ului</span>
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] leading-snug mt-0.5">
                {step1Done ? "Nume atelier configurat" : "Adaugă nume, CUI și adresă în Setări"}
              </p>
            </div>
          </div>

          {/* Step 2: Invite team */}
          <div
            onClick={onOpenSettingsUsers}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              step2Done
                ? "bg-emerald-950/20 border-emerald-500/30 opacity-90"
                : "bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-primary,#0284c7)]"
            }`}
          >
            {step2Done ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-[var(--app-muted)] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <UserPlus size={13} className="text-[var(--app-muted)]" />
                <span>2. Invită un coleg</span>
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] leading-snug mt-0.5">
                {step2Done ? `${memberCount} membri în atelier` : "Adaugă mecanici sau recepționeri"}
              </p>
            </div>
          </div>

          {/* Step 3: First claim */}
          <div
            onClick={onOpenNewClaim}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              step3Done
                ? "bg-emerald-950/20 border-emerald-500/30 opacity-90"
                : "bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-primary,#0284c7)]"
            }`}
          >
            {step3Done ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-[var(--app-muted)] shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <FilePlus2 size={13} className="text-[var(--app-muted)]" />
                <span>3. Primul dosar</span>
              </div>
              <p className="text-[11.5px] text-[var(--app-muted)] leading-snug mt-0.5">
                {step3Done ? `${realClaimsCount} dosare reale create` : "Creează sau importă un deviz"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
