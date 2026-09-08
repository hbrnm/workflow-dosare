import React, { useEffect, useState } from "react";
import { Check, Car, Phone, Calendar, Clock, Sparkles, ShieldCheck } from "lucide-react";
import { getStatusDefinition, getPhaseColors, PIPELINE_PHASES } from "../../constants/config";
import { supabase } from "../../supabaseClient";
import {
  getClientStatusCopy,
  getClientProgressPercent,
  getClientPhaseIndex,
  CLIENT_PHASE_HINTS,
} from "../../constants/trackingCopy";

/** Pagină publică: /?track=TOKEN — fără login. */
export default function TrackPage({ token }) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: row, error: err } = await supabase.rpc("get_public_tracking", {
          p_token: token,
        });
        if (!alive) return;
        if (err) {
          setError(err.message);
          setData(null);
          return;
        }
        setData(row || null);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Eroare");
        setData(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (data === undefined) {
    return (
      <div className="v2-root flex min-h-dvh items-center justify-center text-[var(--v2-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--v2-accent)] border-t-transparent animate-spin" />
          <span className="text-sm font-medium">Se încarcă stadiul reparației…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="v2-root flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-1">
          <Car size={24} />
        </div>
        <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          Link invalid sau expirat
        </h1>
        <p className="text-sm text-[var(--v2-muted)] max-w-sm">
          {error || "Nu am găsit un dosar activ pentru acest cod de urmărire. Te rugăm să contactezi service-ul."}
        </p>
      </div>
    );
  }

  const st = getStatusDefinition(data.status);
  const colors = getPhaseColors(data.status);
  const copy = getClientStatusCopy(data.status);
  const atelier = data.atelier?.nume || "Service auto";
  const atelierLogo = data.atelier?.logo_url || null;
  const atelierPhone = data.atelier?.telefon || data.atelier_telefon || null;
  const phaseIdx = getClientPhaseIndex(data.status);
  const progress = getClientProgressPercent(data);
  const ready = !!(data.gata_de_ridicare || data.gataDeRidicare) && !data.ridicata && st.key === "in_lucru";
  const delivered = !!(data.ridicata || st.key === "accept_plata" || st.key === "facturat");
  const customMsg = String(data.mesaj_client || "").trim();
  const vehicle = [data.marca, data.model].filter(Boolean).join(" ") || "Vehiculul tău";

  return (
    <div className="v2-root min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Antet Atelier */}
        <div className="mb-6 text-center animate-[v2-toast-in_0.35s_ease]">
          {atelierLogo ? (
            <img
              src={atelierLogo}
              alt={atelier}
              className="mx-auto h-12 max-w-[160px] object-contain mb-3 rounded-lg"
            />
          ) : (
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--v2-accent)]">
              {atelier}
            </div>
          )}
          <h1 className="mt-1 font-[family-name:var(--v2-font-display)] text-2xl font-bold text-[var(--v2-text)]">
            Urmărire Reparație
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[var(--v2-muted)]">
            <Car size={15} className="text-[var(--v2-accent)]" />
            <span className="font-semibold text-[var(--v2-text)]">{vehicle}</span>
            {data.numar_inmatriculare ? (
              <span className="font-mono bg-[var(--v2-surface-2)] px-1.5 py-0.5 rounded text-xs">
                {data.numar_inmatriculare}
              </span>
            ) : null}
          </p>
        </div>

        {/* Hero status card */}
        <div
          className="rounded-2xl px-5 py-5 text-center text-white shadow-xl transition-all"
          style={{ background: ready ? "#2F6B4E" : delivered ? "#1E2A44" : colors.bg }}
        >
          <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider opacity-85 bg-black/20 px-2.5 py-0.5 rounded-full mb-2">
            {ready ? <Sparkles size={12} /> : null}
            {ready ? "Acțiune pentru tine" : delivered ? "Finalizat" : "Stadiu Curent"}
          </div>
          <div className="text-xl font-black tracking-tight">
            {ready ? "Mașina e gata de ridicare" : delivered ? "Vehicul predat" : copy.title}
          </div>
          <p className="mt-2 text-sm opacity-90 leading-relaxed">
            {ready
              ? "Reparația este finalizată. Te așteptăm la service pentru recepția și predarea vehiculului."
              : delivered
              ? copy.body
              : customMsg || copy.body}
          </p>
          {!ready && !delivered && customMsg && (
            <p className="mt-2 text-xs opacity-75 italic">{copy.body}</p>
          )}
        </div>

        {/* Bara de progres */}
        <div className="mt-4 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--v2-muted)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Progres reparație</span>
            <span className="font-bold text-[var(--v2-accent)]">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--v2-bg)] p-0.5">
            <div
              className="h-full rounded-full bg-[var(--v2-accent)] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timeline stadii */}
        <ol className="mt-5 space-y-2">
          {PIPELINE_PHASES.map((phase, i) => {
            const done = phaseIdx > i || (delivered && i === PIPELINE_PHASES.length - 1) || (ready && i >= 3);
            const current = !delivered && phaseIdx === i;
            return (
              <li
                key={phase.key}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                  current
                    ? "border-[var(--v2-accent)] bg-[var(--v2-surface)] shadow-md"
                    : "border-[var(--v2-border)] bg-[var(--v2-surface)]/60"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done || current
                      ? "bg-[var(--v2-accent)] text-[#1a1510]"
                      : "bg-[var(--v2-surface-2)] text-[var(--v2-muted)]"
                  }`}
                >
                  {done && !current ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      current || done ? "text-[var(--v2-text)]" : "text-[var(--v2-muted)]"
                    }`}
                  >
                    {CLIENT_PHASE_HINTS[phase.key] || phase.label}
                  </div>
                  {current && (
                    <div className="mt-0.5 text-xs text-[var(--v2-accent)] font-medium">
                      Acum: {st.label}
                      {data.piese_sosite && st.key === "piese_comandate" ? " · piese sosite în atelier" : ""}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Mesaj de la service */}
        {customMsg && (ready || delivered) && (
          <div className="mt-4 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3 text-sm text-[var(--v2-text)]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-muted)] mb-1">
              Mesaj de la consilierul tău
            </div>
            <p className="leading-relaxed">{customMsg}</p>
          </div>
        )}

        {/* Buton Contact Service */}
        {atelierPhone && (
          <div className="mt-5">
            <a
              href={`tel:${String(atelierPhone).replace(/\D/g, "")}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--v2-surface)] border border-[var(--v2-border)] text-[var(--v2-text)] font-semibold text-sm hover:bg-[var(--v2-surface-2)] transition-colors"
            >
              <Phone size={15} className="text-[var(--v2-accent)]" />
              Sună la recepție ({atelierPhone})
            </a>
          </div>
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[10px] text-[var(--v2-muted)]">
          <ShieldCheck size={12} className="text-[var(--v2-muted)]" />
          Actualizat în timp real · Dosar administrat prin Workflow Daune
        </p>
      </div>
    </div>
  );
}

export { getTrackingTokenFromLocation, buildTrackingUrl } from "../../constants/trackingCopy";

