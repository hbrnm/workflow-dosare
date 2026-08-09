import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { DEFAULT_BRANDING, loadCachedBranding } from "../../constants/branding";
import { useDayNightTheme } from "../../hooks/useDayNightTheme";

export default function Login({ onLoginSuccess, onGoSignup, branding: brandingProp }) {
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(() => brandingProp || loadCachedBranding() || DEFAULT_BRANDING);

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

  const short = (branding?.atelierShort || "WD").slice(0, 2);
  const name = branding?.atelierNume || DEFAULT_BRANDING.atelierNume;

  return (
    <div className="app-shell app-login">
      <div className="app-login-glow" aria-hidden />
      <form
        onSubmit={mode === "forgot" ? handleForgot : handleLogin}
        className="app-login-card space-y-4"
      >
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="app-login-logo w-11 h-11 rounded-xl object-contain"
            />
          ) : (
            <div className="app-login-mark w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-[13px]">
              {short}
            </div>
          )}
          <div className="min-w-0">
            <div className="app-login-title truncate">{name}</div>
            <div className="app-login-sub">
              {mode === "forgot" ? "Resetare parolă" : "Autentificare atelier"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="app-login-label">
            <Mail size={12} /> Email
          </label>
          <input
            type="email"
            required
            className="app-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="nume@atelier.ro"
          />
        </div>

        {mode === "login" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="app-login-label mb-0">
                <Lock size={12} /> Parolă
              </label>
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
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
              className="app-login-input"
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

        {error ? <div className="app-login-error">{error}</div> : null}
        {info ? (
          <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[12px] text-[var(--app-text)] leading-relaxed">
            {info}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="app-login-submit">
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

        {mode === "forgot" ? (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
            }}
          >
            <ArrowLeft size={14} /> Înapoi la conectare
          </button>
        ) : (
          <div className="space-y-2 text-center">
            {onGoSignup ? (
              <button
                type="button"
                className="w-full text-[12.5px] font-semibold text-[var(--app-text)] hover:underline"
                onClick={onGoSignup}
              >
                Creează atelier nou (trial)
              </button>
            ) : null}
            <p className="app-login-hint">
              Coleg? Cere invitație din Setări → Utilizatori. Parolă uitată: linkul de mai sus.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
