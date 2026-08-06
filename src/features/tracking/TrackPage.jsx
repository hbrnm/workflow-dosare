import React, { useEffect, useState } from "react";
import { getStatusDefinition, getPhaseColors, PIPELINE_PHASES } from "../../constants/config";
import { supabase } from "../../supabaseClient";

/** Pagină publică: /?track=TOKEN — fără login. */
export default function TrackPage({ token }) {
  const [data, setData] = useState(undefined); // undefined loading, null not found
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
  const atelier = data.atelier?.nume || "Service auto";
  const phaseIdx = PIPELINE_PHASES.findIndex((p) => p.statuses.includes(st.key));

  return (
    <div className="v2-root min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--v2-accent)]">
            {atelier}
          </div>
          <h1 className="mt-2 font-[family-name:var(--v2-font-display)] text-2xl font-bold text-[var(--v2-text)]">
            Stadiul reparației
          </h1>
          <p className="mt-1 text-sm text-[var(--v2-muted)]">
            {[data.marca, data.model].filter(Boolean).join(" ") || "Vehiculul tău"}
            {data.numar_inmatriculare ? ` · ${data.numar_inmatriculare}` : ""}
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-5 text-center text-white shadow-lg"
          style={{ background: colors.bg }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Status curent</div>
          <div className="mt-1 text-xl font-bold">
            {st.num}. {st.label}
          </div>
          {data.gata_de_ridicare && !data.ridicata && (
            <div className="mt-2 text-sm font-medium">Mașina este gata de ridicare</div>
          )}
          {data.ridicata && <div className="mt-2 text-sm font-medium">Vehicul predat</div>}
        </div>

        <ol className="mt-6 space-y-2">
          {PIPELINE_PHASES.map((phase, i) => {
            const done = phaseIdx > i || (phaseIdx === i && st.key === phase.statuses[phase.statuses.length - 1] && ["predat_client", "facturat"].includes(st.key));
            const current = phaseIdx === i;
            return (
              <li
                key={phase.key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                  current
                    ? "border-[var(--v2-accent)] bg-[var(--v2-surface)]"
                    : "border-[var(--v2-border)] bg-[var(--v2-surface)]/60"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done || current ? "bg-[var(--v2-accent)] text-[#1a1510]" : "bg-[var(--v2-surface-2)] text-[var(--v2-muted)]"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <div className={`text-sm font-semibold ${current ? "text-[var(--v2-text)]" : "text-[var(--v2-muted)]"}`}>
                    {phase.label}
                  </div>
                  {current && (
                    <div className="text-xs text-[var(--v2-accent)]">{st.label}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 text-center text-[10px] text-[var(--v2-muted)]">
          Link de urmărire generat de Workflow Daune 2.0 · tip {data.tip_asigurare || "—"}
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
