import React, { useEffect, useState } from "react";
import { Check, Car, Phone } from "lucide-react";
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
        Se încarcă stadiul reparației…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="v2-root flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          Link invalid
        </h1>
        <p className="text-sm text-[var(--v2-muted)]">
          {error || "Nu am găsit un dosar pentru acest link de urmărire."}
        </p>
      </div>
    );
  }

  const st = getStatusDefinition(data.status);
  const colors = getPhaseColors(data.status);
  const copy = getClientStatusCopy(data.status);
  const atelier = data.atelier?.nume || "Service auto";
  const phaseIdx = getClientPhaseIndex(data.status);
  const progress = getClientProgressPercent(data);
  const ready = !!(data.gata_de_ridicare || st.key === "gata_de_ridicare") && !data.ridicata;
  const delivered = !!(data.ridicata || st.key === "predat_client" || st.key === "facturat");
  const customMsg = String(data.mesaj_client || "").trim();
  const vehicle = [data.marca, data.model].filter(Boolean).join(" ") || "Vehiculul tău";

  return (
    <div className="v2-root min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center animate-[v2-toast-in_0.35s_ease]">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--v2-accent)]">
            {atelier}
          </div>
          <h1 className="mt-2 font-[family-name:var(--v2-font-display)] text-2xl font-bold text-[var(--v2-text)]">
            Urmărire reparație
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[var(--v2-muted)]">
            <Car size={14} />
            {vehicle}
            {data.numar_inmatriculare ? ` · ${data.numar_inmatriculare}` : ""}
          </p>
        </div>

        {/* Hero status */}
        <div
          className="rounded-2xl px-4 py-5 text-center text-white shadow-lg"
          style={{ background: ready ? "#2F6B4E" : delivered ? "#1E2A44" : colors.bg }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {ready ? "Acțiune pentru tine" : delivered ? "Finalizat" : "Status curent"}
          </div>
          <div className="mt-1 text-xl font-bold">
            {ready ? "Mașina e gata de ridicare" : delivered ? "Vehicul predat" : copy.title}
          </div>
          <p className="mt-2 text-sm opacity-90">
            {ready
              ? "Reparația este finalizată. Te așteptăm la service pentru predare."
              : delivered
              ? copy.body
              : customMsg || copy.body}
          </p>
          {!ready && !delivered && customMsg && (
            <p className="mt-2 text-xs opacity-75">{copy.body}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mt-5 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--v2-muted)]">
            <span>Progres</span>
            <span className="font-semibold text-[var(--v2-text)]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--v2-bg)]">
            <div
              className="h-full rounded-full bg-[var(--v2-accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timeline */}
        <ol className="mt-6 space-y-2">
          {PIPELINE_PHASES.map((phase, i) => {
            const done = phaseIdx > i || (delivered && i === PIPELINE_PHASES.length - 1) || (ready && i >= 3);
            const current = !delivered && phaseIdx === i;
            return (
              <li
                key={phase.key}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
                  current
                    ? "border-[var(--v2-accent)] bg-[var(--v2-surface)]"
                    : "border-[var(--v2-border)] bg-[var(--v2-surface)]/60"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done || current
                      ? "bg-[var(--v2-accent)] text-[#1a1510]"
                      : "bg-[var(--v2-surface-2)] text-[var(--v2-muted)]"
                  }`}
                >
                  {done && !current ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-semibold ${
                      current || done ? "text-[var(--v2-text)]" : "text-[var(--v2-muted)]"
                    }`}
                  >
                    {CLIENT_PHASE_HINTS[phase.key] || phase.label}
                  </div>
                  {current && (
                    <div className="mt-0.5 text-xs text-[var(--v2-accent)]">
                      Acum: {st.label}
                      {data.piese_sosite && st.key === "piese_comandate" ? " · piese sosite" : ""}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {ready && (
          <div className="mt-6 rounded-2xl border border-[#3E6B45]/50 bg-[#1e3d32] px-4 py-4 text-center">
            <div className="text-sm font-bold text-[#b6f0d0]">Pregătită pentru predare</div>
            <p className="mt-1 text-xs text-[#b6f0d0]/80">
              Contactează service-ul pentru programarea ridicării
              {data.data_gata_ridicare
                ? ` · gata din ${String(data.data_gata_ridicare).slice(0, 10)}`
                : ""}
              .
            </p>
          </div>
        )}

        {customMsg && (ready || delivered) && (
          <div className="mt-4 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3 text-sm text-[var(--v2-text)]">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">
              Mesaj de la service
            </div>
            <p className="mt-1">{customMsg}</p>
          </div>
        )}

        <p className="mt-8 flex items-center justify-center gap-1 text-center text-[10px] text-[var(--v2-muted)]">
          <Phone size={10} />
          Actualizat automat · tip {data.tip_asigurare || "—"} · Workflow Daune
        </p>
      </div>
    </div>
  );
}

export function getTrackingTokenFromLocation() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("track") || params.get("t") || "";
  } catch {
    return "";
  }
}

export function buildTrackingUrl(token) {
  if (!token || typeof window === "undefined") return "";
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("track", token);
  return url.toString();
}
