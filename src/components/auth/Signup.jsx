import React, { useState, useEffect } from "react";
import { Building2, Lock, Mail, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { DEFAULT_BRANDING, loadCachedBranding, normalizeBranding, cacheBranding } from "../../constants/branding";
import { useDayNightTheme } from "../../hooks/useDayNightTheme";
import {
  slugifyAtelierName,
  shortFromName,
  validateAtelierSignup,
} from "../../utils/atelierSignup";
import { resetOnboarding } from "../../utils/onboardingPrefs";

/**
 * Self-serve: creează cont + atelier (edge create-atelier, fallback signUp + RPC).
 */
export default function Signup({ onSuccess, onBackToLogin, branding: brandingProp }) {
  const [atelierNume, setAtelierNume] = useState("");
  const [atelierShort, setAtelierShort] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validateAtelierSignup({
      email,
      password,
      passwordConfirm,
      atelierNume,
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
      // 2) Fallback: signUp + RPC (migrare 30)
      if (/migrare 29|multi-tenant|404|not found|Failed to send/i.test(edgeMsg) || fnErr) {
        const { data: signedUp, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (signUpErr) {
          setLoading(false);
          setError(signUpErr.message || edgeMsg || "Nu am putut crea contul.");
          return;
        }
        if (!signedUp?.session) {
          // email confirmation required
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

        const { data: atelierId, error: rpcErr } = await supabase.rpc("bootstrap_atelier", {
          p_nume: name,
          p_short: short,
          p_slug: slug,
        });

        if (rpcErr) {
          setLoading(false);
          setError(
            rpcErr.message ||
              edgeMsg ||
              "Cont creat, dar atelierul nu s-a putut inițializa. Rulează migrările 29–30."
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

  const short = (branding?.atelierShort || "WD").slice(0, 2);

  return (
    <div className="app-shell app-login">
      <div className="app-login-glow" aria-hidden />
      <form onSubmit={handleSubmit} className="app-login-card space-y-4">
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
            <div className="app-login-title truncate">Creează atelier</div>
            <div className="app-login-sub">Trial 30 zile · fără card</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="app-login-label">
            <Building2 size={12} /> Nume atelier
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
            placeholder="ex: Service Rapid"
          />
        </div>

        <div className="space-y-1.5">
          <label className="app-login-label">Inițiale (max 4)</label>
          <input
            type="text"
            className="app-login-input uppercase"
            maxLength={4}
            value={atelierShort}
            onChange={(e) => setAtelierShort(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="SR"
          />
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
            autoComplete="username"
            placeholder="patron@atelier.ro"
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

        <button type="submit" disabled={loading} className="app-login-submit">
          {loading ? (
            "Se creează..."
          ) : (
            <>
              <Sparkles size={16} /> Creează atelierul
            </>
          )}
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
          onClick={onBackToLogin}
        >
          <ArrowLeft size={14} /> Am deja cont — conectare
        </button>
      </form>
    </div>
  );
}
