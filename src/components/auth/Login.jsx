import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { loadCachedBranding, resolveDisplayBranding } from "../../constants/branding";
import { useDayNightTheme } from "../../hooks/useDayNightTheme";
import { readAtelierSlugFromUrl } from "../../utils/atelierPrefs";

export default function Login({ onLoginSuccess, onGoSignup, branding: brandingProp }) {
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(() => brandingProp || loadCachedBranding());

  useEffect(() => {
    if (brandingProp) setBranding(brandingProp);
  }, [brandingProp]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const slug = readAtelierSlugFromUrl();
      const remote = await fetchPublicBranding(slug);
      if (alive && remote) setBranding(remote);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useDayNightTheme();

  const [ssoLoading, setSsoLoading] = useState(null);

  const handleOAuthLogin = async (provider) => {
    setError("");
    setInfo("");
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (!signInErr && authData?.session) {
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess(authData.session);
      return;
    }

    setLoading(false);
    setError("Email sau parolă incorectă.");
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setLoading(false);
      setError("Introdu adresa de email a contului.");
      return;
    }

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message || "Nu am putut trimite emailul de resetare.");
      return;
    }
    setInfo("Dacă există un cont cu acest email, vei primi un link de resetare. Verifică și spam-ul.");
  };

  const display = resolveDisplayBranding(branding);
  const short = (display.atelierShort || "").slice(0, 2);
  const atelierName = display.atelierNume;

  return (
    <div className="app-shell app-login">
      <div className="app-login-glow" aria-hidden />
      <form
        onSubmit={mode === "forgot" ? handleForgot : handleLogin}
        className="app-login-card space-y-4 max-w-[400px] shadow-2xl border border-[var(--app-border)] bg-[var(--app-surface)] rounded-2xl p-6"
      >
        {/* Header - Clean Centered Logo & Title */}
        <div className="text-center space-y-2 pt-1 pb-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--app-surface-2)] border border-[var(--app-border)] shadow-sm mb-1">
            {display.logoUrl ? (
              <img
                src={display.logoUrl}
                alt=""
                className="w-10 h-10 object-contain rounded-xl"
              />
            ) : (
              <img
                src="/icon.svg"
                alt="Workflow Daune"
                className="w-10 h-10 object-contain rounded-xl"
              />
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--app-text-strong)] tracking-tight">
              {atelierName || (mode === "forgot" ? "Resetare parolă" : "Workflow Daune")}
            </h1>
            <p className="text-xs font-semibold text-[var(--app-muted)] mt-0.5">
              {atelierName
                ? mode === "forgot"
                  ? "Resetare parolă atelier"
                  : "Autentificare atelier digital"
                : mode === "forgot"
                  ? "Introdu adresa de email a contului"
                  : "Gestionare digitală daune auto"}
            </p>
          </div>
        </div>

        {mode === "login" ? (
          <div className="space-y-3 pt-1">
            {/* Google SSO Button */}
            <button
              type="button"
              disabled={Boolean(ssoLoading)}
              onClick={() => handleOAuthLogin("google")}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[13px] font-bold text-[var(--app-text-strong)] transition-all shadow-sm active:scale-[0.99]"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
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
              <span>{ssoLoading === "google" ? "Se conectează..." : "Conectare cu Google"}</span>
            </button>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--app-muted)] my-2">
              <div className="flex-1 h-px bg-[var(--app-border)]" />
              <span>sau cu email și parolă</span>
              <div className="flex-1 h-px bg-[var(--app-border)]" />
            </div>
          </div>
        ) : null}

        {/* Input Form Fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-muted)] flex items-center gap-1.5">
              <Mail size={12} /> Email
            </label>
            <input
              type="email"
              required
              className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl text-[14px] font-semibold text-[var(--app-text-strong)] px-3.5 py-2.5 outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/20 transition-all placeholder:text-[var(--app-muted-2)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="nume@atelier.ro"
            />
          </div>

          {mode === "login" ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-muted)] flex items-center gap-1.5 mb-0">
                  <Lock size={12} /> Parolă
                </label>
                <button
                  type="button"
                  className="text-[11.5px] font-semibold text-[var(--app-accent)] hover:underline"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setInfo("");
                  }}
                >
                  Am uitat parola
                </button>
              </div>
              <input
                type="password"
                required
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl text-[14px] font-semibold text-[var(--app-text-strong)] px-3.5 py-2.5 outline-none focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[var(--app-accent)]/20 transition-all placeholder:text-[var(--app-muted-2)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          ) : (
            <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
              Trimitem un link pe email. După click, setezi o parolă nouă în aplicație.
            </p>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 px-3.5 py-2.5 text-[12px] font-bold text-[var(--app-danger)]">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--app-text)] leading-relaxed">
            {info}
          </div>
        ) : null}

        {/* Submit Primary Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold text-[14px] shadow-sm hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            mode === "forgot" ? "Se trimite..." : "Se conectează..."
          ) : mode === "forgot" ? (
            <>
              <Mail size={16} /> Trimite link de resetare
            </>
          ) : (
            <>
              <ShieldCheck size={16} /> Conectare
            </>
          )}
        </button>

        {/* Footer Actions — Create New Workshop */}
        {mode === "forgot" ? (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] pt-1"
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
          >
            <ArrowLeft size={14} /> Înapoi la conectare
          </button>
        ) : (
          <div className="pt-2 text-center border-t border-[var(--app-border)] mt-4 space-y-2">
            {onGoSignup ? (
              <button
                type="button"
                className="w-full py-2.5 px-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-[13px] font-bold text-[var(--app-text-strong)] transition-all flex items-center justify-center gap-1.5"
                onClick={onGoSignup}
              >
                <span>Creează atelier nou (14 zile trial)</span>
                <span className="text-[var(--app-accent)]">→</span>
              </button>
            ) : null}
            <p className="text-[11px] text-[var(--app-muted)] leading-relaxed">
              Dacă ești mecanic/coleg, cere o invitație administratorului din atelier.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
