import React, { useState, useEffect } from "react";
import { Building2, Lock, Mail, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { loadCachedBranding, normalizeBranding, cacheBranding, resolveDisplayBranding } from "../../constants/branding";
import { useDayNightTheme } from "../../hooks/useDayNightTheme";
import {
  slugifyAtelierName,
  shortFromName,
  validateAtelierSignup,
} from "../../utils/atelierSignup";
import { resetOnboarding } from "../../utils/onboardingPrefs";

export default function Signup({ onSuccess, onBackToLogin, branding: brandingProp }) {
  const [step, setStep] = useState(1); // 1: Auth (email/pass + SSO), 2: Service Profile
  const [atelierNume, setAtelierNume] = useState("");
  const [atelierShort, setAtelierShort] = useState("");
  const [estimatDosare, setEstimatDosare] = useState("11-30"); // "1-10" | "11-30" | "31-50" | "50+"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(null); // "google" | "azure"
  const [acceptDataResponsibility, setAcceptDataResponsibility] = useState(true);
  const [branding, setBranding] = useState(() => brandingProp || loadCachedBranding());

  useEffect(() => {
    if (brandingProp) setBranding(brandingProp);
  }, [brandingProp]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const remote = await fetchPublicBranding();
      if (alive && remote) setBranding(remote);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useDayNightTheme();

  const handleOAuthSignup = async (provider) => {
    setError("");
    setSsoLoading(provider);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error: ssoErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (ssoErr) {
        setError(ssoErr.message || `Eroare la autentificarea cu ${provider}.`);
        setSsoLoading(null);
      }
    } catch (err) {
      setError(err?.message || "Eroare neașteptată la autentificarea SSO.");
      setSsoLoading(null);
    }
  };

  const handleGoToStep2 = (e) => {
    e?.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail.includes("@")) {
      setError("Introdu o adresă de email validă.");
      return;
    }
    if (cleanPassword.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    if (cleanPassword !== passwordConfirm.trim()) {
      setError("Parolele nu coincid.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validateAtelierSignup({
      email,
      password,
      passwordConfirm,
      atelierNume,
      acceptDataResponsibility,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const name = atelierNume.trim();
    const short = (atelierShort.trim() || shortFromName(name)).slice(0, 4).toUpperCase();
    const slug = slugifyAtelierName(name);

    try {
      // 1) Prefer edge function (atomic, email_confirm)
      const { data, error: fnErr } = await supabase.functions.invoke("create-atelier", {
        body: {
          email: cleanEmail,
          password: cleanPassword,
          atelierNume: name,
          atelierShort: short,
          slug,
          estimatDosare,
        },
      });

      if (!fnErr && data?.ok) {
        if (data.atelier) {
          const nextBrand = normalizeBranding({
            atelier_nume: data.atelier.nume,
            atelier_short: data.atelier.short,
            logo_url: null,
          });
          cacheBranding(nextBrand);
        }
        try {
          resetOnboarding();
        } catch {
          /* ignore */
        }

        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          setLoading(false);
          onSuccess?.(data.session);
          return;
        }

        const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        setLoading(false);
        if (signErr || !signed?.session) {
          setError("Atelier creat — conectează-te cu emailul și parola.");
          onBackToLogin?.();
          return;
        }
        onSuccess?.(signed.session);
        return;
      }

      const edgeMsg = data?.error || fnErr?.message || "";
      // 2) Fallback: signUp + RPC
      if (/migrare 29|multi-tenant|404|not found|Failed to send/i.test(edgeMsg) || fnErr) {
        const { data: signedUp, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              atelier_name: name,
              estimat_dosare: estimatDosare,
            },
          },
        });
        if (signUpErr) {
          setLoading(false);
          setError(signUpErr.message || edgeMsg || "Nu am putut crea contul.");
          return;
        }
        if (!signedUp?.session) {
          const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (signErr || !signed?.session) {
            setLoading(false);
            setError(
              edgeMsg ||
                "Cont creat. Confirmă emailul (dacă e cerut), apoi conectează-te — atelierul se poate crea din aplicație."
            );
            return;
          }
        }

        const { error: rpcErr } = await supabase.rpc("bootstrap_atelier", {
          p_nume: name,
          p_short: short,
          p_slug: slug,
        });

        if (rpcErr) {
          setLoading(false);
          setError(
            rpcErr.message ||
              edgeMsg ||
              "Cont creat, dar atelierul nu s-a putut inițializa."
          );
          return;
        }

        cacheBranding(
          normalizeBranding({
            atelier_nume: name,
            atelier_short: short,
            logo_url: null,
          })
        );
        try {
          resetOnboarding();
        } catch {
          /* ignore */
        }

        const { data: sessData } = await supabase.auth.getSession();
        setLoading(false);
        onSuccess?.(sessData?.session || signedUp?.session);
        return;
      }

      setLoading(false);
      setError(edgeMsg || "Nu am putut crea atelierul.");
    } catch (err) {
      setLoading(false);
      setError(err?.message || "Eroare neașteptată la creare.");
    }
  };

  const display = resolveDisplayBranding(branding);
  const shortMark = (display.atelierShort || "").slice(0, 2);

  return (
    <div className="app-shell app-login">
      <div className="app-login-glow" aria-hidden />
      <div className="app-login-card space-y-4 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3">
          {display.logoUrl ? (
            <img
              src={display.logoUrl}
              alt=""
              className="app-login-logo w-11 h-11 rounded-xl object-contain"
            />
          ) : (
            <div className="app-login-mark w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-[13px]">
              {shortMark || "WD"}
            </div>
          )}
          <div className="min-w-0">
            <div className="app-login-title truncate">Creează cont atelier</div>
            <div className="app-login-sub">Trial gratuit 30 zile · Fără card de credit</div>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-2 py-1">
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step >= 1 ? "bg-[var(--app-primary,#0284c7)]" : "bg-[var(--app-border)]"
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              step >= 2 ? "bg-[var(--app-primary,#0284c7)]" : "bg-[var(--app-border)]"
            }`}
          />
          <span className="text-[11px] font-bold text-[var(--app-muted)] ml-1">
            Pasul {step} din 2
          </span>
        </div>

        {/* STEP 1: AUTH credentials & SSO */}
        {step === 1 ? (
          <form onSubmit={handleGoToStep2} className="space-y-3.5">
            {/* 1-Click SSO Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={Boolean(ssoLoading)}
                onClick={() => handleOAuthSignup("google")}
                className="w-full flex items-center justify-center gap-2.5 p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[13px] font-semibold text-[var(--app-text)] transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {ssoLoading === "google" ? "Se conectează..." : "Continuă cu Google"}
              </button>

              <button
                type="button"
                disabled={Boolean(ssoLoading)}
                onClick={() => handleOAuthSignup("azure")}
                className="w-full flex items-center justify-center gap-2.5 p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[13px] font-semibold text-[var(--app-text)] transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                {ssoLoading === "azure" ? "Se conectează..." : "Continuă cu Microsoft Work Account"}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--app-muted)] my-2">
              <div className="flex-1 h-px bg-[var(--app-border)]" />
              <span>sau cu email</span>
              <div className="flex-1 h-px bg-[var(--app-border)]" />
            </div>

            <div className="space-y-1.5">
              <label className="app-login-label">
                <Mail size={12} /> Email administrator
              </label>
              <input
                type="email"
                required
                className="app-login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="patron@service.ro"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="app-login-label">
                  <Lock size={12} /> Parolă
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="app-login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="min. 6 caractere"
                />
              </div>
              <div className="space-y-1.5">
                <label className="app-login-label">Confirmă parola</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="app-login-input"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error ? <div className="app-login-error">{error}</div> : null}

            <button type="submit" className="app-login-submit group">
              <span>Pasul următor: Profil Atelier</span>
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        ) : (
          /* STEP 2: Service profile (Nume atelier, dosare lunare, GDPR) */
          <form onSubmit={handleSubmit} className="space-y-3.5 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="space-y-1.5">
              <label className="app-login-label">
                <Building2 size={12} /> Nume service auto
              </label>
              <input
                type="text"
                required
                className="app-login-input"
                value={atelierNume}
                onChange={(e) => {
                  setAtelierNume(e.target.value);
                  if (!atelierShort) setAtelierShort(shortFromName(e.target.value));
                }}
                autoFocus
                placeholder="ex: Auto Service Rapid"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="app-login-label">Inițiale atelier (max 4)</label>
                <input
                  type="text"
                  className="app-login-input uppercase font-bold tracking-wider"
                  maxLength={4}
                  value={atelierShort}
                  onChange={(e) => setAtelierShort(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="SR"
                />
              </div>

              <div className="space-y-1.5">
                <label className="app-login-label">Volum dosare / lună</label>
                <select
                  className="app-login-input font-medium cursor-pointer"
                  value={estimatDosare}
                  onChange={(e) => setEstimatDosare(e.target.value)}
                >
                  <option value="1-10">1 - 10 dosare / lună</option>
                  <option value="11-30">11 - 30 dosare / lună</option>
                  <option value="31-50">31 - 50 dosare / lună</option>
                  <option value="50+">50+ dosare / lună</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-[11.5px] text-[var(--app-muted)] leading-snug cursor-pointer p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)]">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0 accent-[var(--app-primary,#0284c7)]"
                checked={acceptDataResponsibility}
                onChange={(e) => setAcceptDataResponsibility(e.target.checked)}
              />
              <span>
                Confirm că atelierul este responsabil pentru datele clienților (GDPR) introduse în Workflow Dosare.
              </span>
            </label>

            {error ? <div className="app-login-error">{error}</div> : null}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] text-[12.5px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] transition-all"
              >
                ← Înapoi
              </button>

              <button type="submit" disabled={loading} className="app-login-submit flex-1">
                {loading ? (
                  "Se creează atelierul..."
                ) : (
                  <>
                    <Sparkles size={16} /> Creează atelierul (30 zile trial)
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] pt-2"
          onClick={onBackToLogin}
        >
          <ArrowLeft size={14} /> Am deja cont — conectare
        </button>
      </div>
    </div>
  );
}

