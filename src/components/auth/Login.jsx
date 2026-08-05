import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchPublicBranding } from "../../hooks/useSettings";
import { DEFAULT_BRANDING, darkenHex, loadCachedBranding } from "../../constants/branding";

export default function Login({ onLoginSuccess, branding: brandingProp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    if (branding?.accentColor) {
      document.documentElement.style.setProperty("--brand-accent", branding.accentColor);
    }
  }, [branding?.accentColor]);

  const accent = branding?.accentColor || DEFAULT_BRANDING.accentColor;
  const accentDark = darkenHex(accent);

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

  return (
    <div className="min-h-screen bg-[#EFEAE1] flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-lg border border-[#DAD4C6] shadow-xl p-6 w-full max-w-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="w-8 h-8 rounded object-contain bg-[#FAF8F5] border border-[#DAD4C6]"
            />
          ) : (
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: accent }}
            >
              <ShieldCheck size={18} className="text-white" />
            </div>
          )}
          <div className="font-bold text-[15px] text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {branding?.atelierNume || DEFAULT_BRANDING.atelierNume}
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Email</label>
          <input
            type="email"
            required
            className="in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Parolă</label>
          <input
            type="password"
            required
            className="in"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-[12px] text-[#B23A2E]">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-white text-[13px] font-semibold disabled:opacity-60"
          style={{ backgroundColor: accent }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accentDark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = accent;
          }}
        >
          {loading ? "Se conectează..." : "Conectare"}
        </button>
        <div className="text-[11px] text-[#8A8375] text-center">
          Cont nou? Cere administratorului să-ți creeze unul din Setări.
        </div>
      </form>
    </div>
  );
}
