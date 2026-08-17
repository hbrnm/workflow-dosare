import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { resolveDisplayBranding } from "../../constants/branding";

/** Set new password after email recovery link. */
export default function RecoveryPassword({ onDone, branding }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const display = resolveDisplayBranding(branding);
  const name = display.atelierNume || "Parolă nouă";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.trim().length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    if (password !== confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: password.trim() });
    setLoading(false);
    if (err) {
      setError(err.message || "Nu am putut actualiza parola.");
      return;
    }
    onDone?.();
  };

  return (
    <div className="app-shell app-login">
      <div className="app-login-glow" aria-hidden />
      <form onSubmit={handleSubmit} className="app-login-card space-y-4">
        <div>
          <div className="app-login-title">{name}</div>
          <div className="app-login-sub">Setează o parolă nouă</div>
        </div>

        <div className="space-y-1.5">
          <label className="app-login-label">
            <Lock size={12} /> Parolă nouă
          </label>
          <input
            type="password"
            required
            className="app-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="new-password"
            placeholder="Minim 6 caractere"
          />
        </div>

        <div className="space-y-1.5">
          <label className="app-login-label">
            <Lock size={12} /> Confirmă parola
          </label>
          <input
            type="password"
            required
            className="app-login-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Repetă parola"
          />
        </div>

        {error ? <div className="app-login-error">{error}</div> : null}

        <button type="submit" disabled={loading} className="app-login-submit">
          {loading ? (
            "Se salvează..."
          ) : (
            <>
              <ShieldCheck size={16} /> Salvează parola
            </>
          )}
        </button>
      </form>
    </div>
  );
}
