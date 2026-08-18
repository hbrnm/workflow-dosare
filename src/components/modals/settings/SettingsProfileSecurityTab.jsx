import React, { useState, useEffect } from "react";
import { User, Key, ShieldCheck, QrCode, Smartphone, Laptop, LogOut, CheckCircle2, AlertCircle, Copy, Check, Lock } from "lucide-react";
import AppButton from "../../common/AppButton";
import { supabase } from "../../../supabaseClient";

export default function SettingsProfileSecurityTab({
  userEmail = "",
  isAdmin = false,
  onSignOut,
  myNewPassword = "",
  setMyNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  updatingPassword = false,
  handleChangePasswordSubmit,
  onNotify,
}) {
  // 2FA TOTP State
  const [totpFactor, setTotpFactor] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState(null); // { id, totp: { qr_code, secret, uri } }
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Active Sessions State
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Check existing 2FA factors on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (!error && alive && data?.all) {
          const activeTotp = data.all.find((f) => f.factor_type === "totp" && f.status === "verified");
          setTotpFactor(activeTotp || null);
        }
      } catch (err) {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleStartEnroll2FA = async () => {
    setEnrolling(true);
    setEnrollData(null);
    setVerifyCode("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Workflow Daune",
        friendlyName: userEmail || "Atelier User",
      });

      if (error) {
        onNotify?.(error.message || "Nu am putut genera codul QR pentru 2FA.", "error");
      } else if (data) {
        setEnrollData(data);
      }
    } catch (err) {
      onNotify?.(err?.message || "Eroare la configurarea 2FA.", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyEnroll2FA = async (e) => {
    e.preventDefault();
    if (!enrollData?.id || verifyCode.trim().length !== 6) {
      onNotify?.("Introdu codul din 6 cifre din aplicația authenticator.", "error");
      return;
    }

    setVerifying(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      });

      if (challengeErr) {
        onNotify?.(challengeErr.message || "Eroare la verificare 2FA.", "error");
        setVerifying(false);
        return;
      }

      const { data: verifyData, error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });

      if (verifyErr) {
        onNotify?.(verifyErr.message || "Codul de verificare este incorect.", "error");
      } else {
        setTotpFactor({ id: enrollData.id, factor_type: "totp", status: "verified" });
        setEnrollData(null);
        setVerifyCode("");
        onNotify?.("Autentificarea în doi pași (2FA TOTP) a fost activată cu succes!", "success");
      }
    } catch (err) {
      onNotify?.(err?.message || "Eroare la activarea 2FA.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!totpFactor?.id) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      if (error) {
        onNotify?.(error.message || "Nu am putut dezactiva 2FA.", "error");
      } else {
        setTotpFactor(null);
        onNotify?.("Autentificarea în doi pași a fost dezactivată.", "info");
      }
    } catch (err) {
      onNotify?.(err?.message || "Eroare la dezactivarea 2FA.", "error");
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokingSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) {
        onNotify?.(error.message || "Nu am putut deconecta alte sesiuni.", "error");
      } else {
        onNotify?.("Toate celelalte sesiuni active au fost deconectate cu succes!", "success");
      }
    } catch (err) {
      onNotify?.(err?.message || "Eroare la deconectarea sesiunilor.", "error");
    } finally {
      setRevokingSessions(false);
    }
  };

  const copySecret = () => {
    if (!enrollData?.totp?.secret) return;
    try {
      navigator.clipboard.writeText(enrollData.totp.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      {/* Profil utilizator */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User size={16} className="text-[var(--app-primary,#0284c7)]" /> Profil Utilizator
          </span>
          <span
            className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${
              isAdmin ? "bg-[var(--app-primary,#0284c7)] text-white" : "bg-[var(--app-muted)] text-white"
            }`}
          >
            {isAdmin ? "Rol: ADMINISTRATOR" : "Rol: OPERATOR"}
          </span>
        </h3>

        <div className="p-3.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--app-muted)] font-bold uppercase block">
              Email conectat
            </span>
            <span className="font-mono font-bold text-[14px] text-[var(--app-text-strong)] truncate block">
              {userEmail || "—"}
            </span>
            <span className="text-[11.5px] text-[var(--app-muted)] block mt-0.5">
              {isAdmin
                ? "Drepturi de administrare completă pe atelier."
                : "Drepturi de acces pe dosarele proprii."}
            </span>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-3.5 py-1.5 bg-[var(--app-danger)] hover:bg-[#922D24] text-white text-[12px] font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
            >
              <LogOut size={14} /> Deconectare
            </button>
          )}
        </div>
      </div>

      {/* 2FA Autentificare în Doi Pași (TOTP / Authenticator App) */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" /> Autentificare în Doi Pași (2FA TOTP)
          </span>
          {totpFactor ? (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <CheckCircle2 size={13} /> Activat
            </span>
          ) : (
            <span className="text-[11px] font-extrabold text-[var(--app-muted)] bg-[var(--app-surface)] px-2.5 py-1 rounded-full border border-[var(--app-border)]">
              Inactiv
            </span>
          )}
        </h3>

        <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
          Protejează-ți contul de atelier adăugând un nivel suplimentar de securitate prin aplicația ta preferată de autentificare (Google Authenticator, Microsoft Authenticator, 1Password).
        </p>

        {totpFactor ? (
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone size={18} />
              </div>
              <div>
                <div className="font-bold text-[13px] text-[var(--app-text-strong)]">
                  Dispozitiv 2FA Verificat
                </div>
                <div className="text-[11px] text-[var(--app-muted)]">
                  Codul din 6 cifre este solicitat la logările noi.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisable2FA}
              className="px-3 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[12px] font-bold text-[var(--app-danger)] transition-all"
            >
              Dezactivează 2FA
            </button>
          </div>
        ) : enrollData ? (
          /* Enrollment Step: Show QR Code & Verification Input */
          <form onSubmit={handleVerifyEnroll2FA} className="p-4 rounded-xl border border-[var(--app-primary,#0284c7)]/40 bg-[var(--app-surface)] space-y-4 animate-in fade-in duration-200">
            <div className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-2">
              <QrCode size={16} className="text-[var(--app-primary,#0284c7)]" />
              <span>Pasul 1: Scanează codul QR în aplicația Authenticator</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--app-surface-2)] p-3 rounded-xl border border-[var(--app-border)]">
              {enrollData.totp?.qr_code ? (
                <img
                  src={enrollData.totp.qr_code}
                  alt="QR Code 2FA"
                  className="w-36 h-36 bg-white p-2 rounded-lg object-contain shadow-sm shrink-0"
                />
              ) : null}

              <div className="space-y-2 text-center sm:text-left min-w-0">
                <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
                  Deschide Google Authenticator sau Microsoft Authenticator pe telefon și scanează imaginea.
                </p>
                <div className="text-[11px] font-bold text-[var(--app-muted)] uppercase">
                  Sau introdu cheia manual:
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border)] font-mono text-[12px] text-[var(--app-text-strong)] overflow-x-auto max-w-full">
                  <span className="truncate flex-1">{enrollData.totp?.secret}</span>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-1 rounded text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    title="Copiază cheia"
                  >
                    {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-[var(--app-border)]">
              <label className="block text-[12px] font-bold text-[var(--app-text-strong)]">
                Pasul 2: Introdu codul din 6 cifre generat pe telefon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="p-2.5 border border-[var(--app-border)] rounded-lg text-[16px] font-mono tracking-widest text-center font-bold bg-[var(--app-surface-2)] w-40"
                  autoFocus
                />
                <AppButton type="submit" variant="primary" disabled={verifying || verifyCode.length !== 6}>
                  {verifying ? "Se verifică..." : "Verifică & Activează 2FA"}
                </AppButton>
              </div>
            </div>
          </form>
        ) : (
          <button
            type="button"
            disabled={enrolling}
            onClick={handleStartEnroll2FA}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--app-primary,#0284c7)] hover:bg-[var(--app-primary-hover,#0369a1)] text-white text-[12.5px] font-bold transition-all shadow-sm"
          >
            <QrCode size={16} />
            <span>{enrolling ? "Se generează codul QR..." : "Activează Autentificare 2FA"}</span>
          </button>
        )}
      </div>

      {/* Sesiuni Active & Deconectare la distanță (Revoke Session) */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Laptop size={16} className="text-[var(--app-primary,#0284c7)]" /> Dispozitive &amp; Sesiuni Conectate
          </span>
        </h3>

        <div className="p-3.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-text-strong)] flex items-center justify-center shrink-0">
              <Laptop size={18} />
            </div>
            <div>
              <div className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-2">
                <span>Dispozitivul Curent</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                  Activ acum
                </span>
              </div>
              <div className="text-[11px] text-[var(--app-muted)]">
                {typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 55) : "Browser web"}&hellip;
              </div>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-between items-center">
          <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
            Ai lăsat contul deschis pe alt calculator sau telefon? Deconectează toate celelalte sesiuni la distanță.
          </p>
          <button
            type="button"
            disabled={revokingSessions}
            onClick={handleRevokeOtherSessions}
            className="px-3.5 py-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-red-500/10 text-[12px] font-bold text-[var(--app-danger)] transition-all shrink-0 ml-2"
          >
            {revokingSessions ? "Se deconectează..." : "Deconectează celelalte dispozitive"}
          </button>
        </div>
      </div>

      {/* Formular Schimbare Parolă */}
      <form onSubmit={handleChangePasswordSubmit} className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <div>
          <h4 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5">
            <Key size={15} className="text-[var(--app-primary,#0284c7)]" /> Schimbă Parola Contului
          </h4>
          <p className="text-[11px] text-[var(--app-muted)]">
            Setează o parolă nouă confidențială pentru contul tău.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1">Parolă Nouă</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Parola nouă (min. 6 caractere)..."
              className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] focus:border-[var(--app-primary,#0284c7)]"
              value={myNewPassword}
              onChange={(e) => setMyNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1">Confirmare Parolă Nouă</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Reintroduceți parola nouă..."
              className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] focus:border-[var(--app-primary,#0284c7)]"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updatingPassword || !myNewPassword}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-primary,#0284c7)] hover:bg-[var(--app-primary-hover,#0369a1)] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all disabled:opacity-50"
          >
            <Lock size={14} /> {updatingPassword ? "Se actualizează..." : "Actualizează Parola"}
          </button>
        </div>
      </form>
    </div>
  );
}
