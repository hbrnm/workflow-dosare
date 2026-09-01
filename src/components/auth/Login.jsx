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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden font-sans">
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-400/20 dark:bg-sky-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/80 dark:border-slate-800/80 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(8,112,184,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 space-y-6">
        
        {/* Floating Top Badge Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700/80 flex items-center justify-center p-2.5 transform hover:scale-105 transition-transform">
            {display.logoUrl ? (
              <img src={display.logoUrl} alt="" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <img src="/icon.svg" alt="Workflow Daune" className="w-full h-full object-contain rounded-xl" />
            )}
          </div>
        </div>

        {/* Title & Subtitle Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {atelierName || (mode === "forgot" ? "Resetare parolă" : "Autentificare în cont")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-normal max-w-xs mx-auto leading-relaxed">
            {atelierName
              ? mode === "forgot"
                ? "Resetare parolă pentru atelier"
                : "Autentificare atelier digital"
              : mode === "forgot"
                ? "Introdu emailul pentru resetare"
                : "Gestionare digitală daune auto, recepție vehicule și devize."}
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={mode === "forgot" ? handleForgot : handleLogin} className="space-y-4 pt-1">
          {/* Email Field */}
          <div className="space-y-1 relative">
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                className="w-full bg-slate-100/90 dark:bg-slate-800/90 border-0 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-sky-500/80 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="Email"
              />
            </div>
          </div>

          {/* Password Field */}
          {mode === "login" ? (
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  className="w-full bg-slate-100/90 dark:bg-slate-800/90 border-0 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-sky-500/80 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Parolă"
                />
              </div>

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setInfo("");
                  }}
                >
                  Am uitat parola?
                </button>
              </div>
            </div>
          ) : null}

          {/* Error & Info Alerts */}
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-300">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              {info}
            </div>
          ) : null}

          {/* Primary Main Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white font-semibold text-base shadow-lg shadow-slate-900/10 dark:shadow-sky-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              mode === "forgot" ? "Se trimite..." : "Se conectează..."
            ) : mode === "forgot" ? (
              "Trimite link de resetare"
            ) : (
              "Conectare"
            )}
          </button>
        </form>

        {/* SSO & Additional Options */}
        {mode === "login" ? (
          <div className="space-y-4 pt-1">
            {/* Dotted Divider */}
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 justify-center">
              <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-800" />
              <span className="px-2 font-medium">Sau autentificare cu</span>
              <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-800" />
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              disabled={Boolean(ssoLoading)}
              onClick={() => handleOAuthLogin("google")}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-[0.99]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

            {/* DEV BYPASS BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (onLoginSuccess) {
                  onLoginSuccess({
                    user: {
                      id: "dev-bypass-123",
                      email: "admin@local.dev",
                      user_metadata: { role: "admin" }
                    },
                    access_token: "dummy-token"
                  });
                }
              }}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/80 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-sm font-semibold text-amber-900 dark:text-amber-200 shadow-sm transition-all active:scale-[0.99]"
            >
              <span>Bypass Login (Mod Offline)</span>
            </button>
          </div>
        ) : null}

        {/* Footer Actions — Create New Workshop */}
        {mode === "forgot" ? (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white pt-1 transition-colors"
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
          >
            <ArrowLeft className="w-4 h-4" /> Înapoi la conectare
          </button>
        ) : (
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            {onGoSignup ? (
              <button
                type="button"
                className="w-full text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline py-1 flex items-center justify-center gap-1"
                onClick={onGoSignup}
              >
                <span>Creează atelier nou (14 zile trial gratuit)</span>
                <span>→</span>
              </button>
            ) : null}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Dacă ești mecanic/coleg, cere o invitație administratorului din atelier.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
