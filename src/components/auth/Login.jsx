import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Mail } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { DEFAULT_BRANDING, loadCachedBranding } from "../../constants/branding";
import { loadMobileThemeId } from "../../constants/mobileThemes";
import "../../styles/mobileThemes.css";

export default function Login({ onLoginSuccess, branding: brandingProp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(() => brandingProp || loadCachedBranding() || DEFAULT_BRANDING);
  const themeId = loadMobileThemeId();

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

  useEffect(() => {
    try {
      document.documentElement.dataset.mtheme = themeId || "forge";
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
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

  const short = (branding?.atelierShort || "WD").slice(0, 2);
  const name = branding?.atelierNume || DEFAULT_BRANDING.atelierNume;

  return (
    <div className="m-login min-h-screen flex items-center justify-center p-4" data-mtheme={themeId || "forge"}>
      <div className="m-login-glow" aria-hidden />
      <form onSubmit={handleLogin} className="m-login-card relative w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="m-login-logo w-11 h-11 rounded-xl object-contain"
            />
          ) : (
            <div className="m-login-mark w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-[13px]">
              {short}
            </div>
          )}
          <div className="min-w-0">
            <div className="m-login-title truncate">{name}</div>
            <div className="m-login-sub">Autentificare atelier</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="m-login-label">
            <Mail size={12} /> Email
          </label>
          <input
            type="email"
            required
            className="m-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="nume@atelier.ro"
          />
        </div>

        <div className="space-y-1.5">
          <label className="m-login-label">
            <Lock size={12} /> Parolă
          </label>
          <input
            type="password"
            required
            className="m-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="m-login-error">{error}</div>}

        <button type="submit" disabled={loading} className="m-login-submit">
          {loading ? (
            "Se conectează..."
          ) : (
            <>
              <ShieldCheck size={16} /> Conectare
            </>
          )}
        </button>

        <p className="m-login-hint text-center">
          Cont nou? Cere administratorului să-ți creeze unul din Setări.
        </p>
      </form>
    </div>
  );
}
