import React, { useEffect, useState } from "react";
import { Check, Car, Phone, Calendar, Clock, Sparkles, ShieldCheck, Camera, Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusDefinition, getPhaseColors, PIPELINE_PHASES } from "../../constants/config";
import { supabase } from "../../supabaseClient";
import {
  getClientStatusCopy,
  getClientProgressPercent,
  getClientPhaseIndex,
  CLIENT_PHASE_HINTS,
} from "../../constants/trackingCopy";
import { refreshStorageUrls } from "../../utils/claimMedia";

/** Pagină publică: /?track=TOKEN — fără login. */
export default function TrackPage({ token }) {
  const [data, setData] = useState(undefined);
  const [photos, setPhotos] = useState([]);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1. Preia datele dosarului via RPC securizat
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

        // 2. Preia fotografiile marcate ca vizibilClient: true sau categoria predare
        let rawPoze = [];
        if (row && Array.isArray(row.poze)) {
          rawPoze = row.poze;
        } else if (row) {
          try {
            const { data: claimRows } = await supabase
              .from("dosare")
              .select("poze")
              .eq("tracking_token", String(token).trim())
              .limit(1);
            if (!alive) return;
            rawPoze = Array.isArray(claimRows?.[0]?.poze) ? claimRows[0].poze : [];
          } catch {
            // RLS fallback pentru anonim
          }
        }

        const filtered = rawPoze.filter((p) => p && (p.vizibilClient || p.categoria === "predare"));
        if (filtered.length > 0) {
          // Încearcă mai întâi refreshStorageUrls (pentru URL-uri semnate proaspete)
          let resolved = await refreshStorageUrls(filtered, "poze-dosare", supabase);
          // Fallback pe publicUrl dacă vreun item nu are url valid sau e anonim
          resolved = resolved.map((item) => {
            if (!item) return item;
            if (item.url && !item.url.startsWith("data:")) return item;
            if (item.path) {
              const { data: pub } = supabase.storage.from("poze-dosare").getPublicUrl(item.path);
              if (pub?.publicUrl) {
                return { ...item, url: pub.publicUrl };
              }
            }
            return item;
          });
          if (alive) {
            setPhotos(resolved);
          }
        } else if (alive) {
          setPhotos([]);
        }
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

        {/* Galeria Foto din Atelier (Jurnal de Lucru) */}
        {photos.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-[var(--v2-border)]/70 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--v2-accent)] flex items-center gap-1.5">
                <Camera size={14} /> Jurnal Foto din Atelier ({photos.length})
              </span>
              <span className="text-[10px] text-[var(--v2-muted)] font-medium">
                Atinge pentru a mări
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {photos.map((photo, pIdx) => (
                <button
                  key={photo.id || pIdx}
                  type="button"
                  onClick={() => setPreviewPhotoIndex(pIdx)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-[var(--v2-border)] bg-black/20 focus:outline-none focus:ring-2 focus:ring-[var(--v2-accent)] transition-all"
                >
                  <img
                    src={photo.url}
                    alt={photo.reperLabel || photo.nume || "Foto atelier"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 text-left pointer-events-none">
                    <span className="inline-block text-[10px] font-bold text-white leading-tight truncate max-w-full drop-shadow">
                      {photo.reperLabel || (photo.categoria === "predare" ? "Gata de predare" : "Lucrare atelier")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Lightbox Preview Modal */}
      {previewPhotoIndex != null && photos[previewPhotoIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewPhotoIndex(null)}
        >
          {/* Header Lightbox */}
          <div className="flex items-center justify-between text-white pb-2" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-semibold">
              Foto {previewPhotoIndex + 1} din {photos.length}
              {photos[previewPhotoIndex].reperLabel && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--v2-accent)] text-[#1a1510] text-[10px] font-bold">
                  {photos[previewPhotoIndex].reperLabel}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewPhotoIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Închide"
            >
              <X size={20} />
            </button>
          </div>

          {/* Imagine Centrată */}
          <div
            className="relative flex-1 flex items-center justify-center min-h-0 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[previewPhotoIndex].url}
              alt="Foto mare atelier"
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />

            {/* Buton Navigare Stânga */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Buton Navigare Dreapta */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Footer Lightbox cu descriere */}
          <div className="text-center text-xs text-white/80 pt-2" onClick={(e) => e.stopPropagation()}>
            {photos[previewPhotoIndex].nume || "Fotografie din atelier"}
            {photos[previewPhotoIndex].categoria && photos[previewPhotoIndex].categoria !== "generale" ? (
              <span className="opacity-70 ml-1.5">({photos[previewPhotoIndex].categoria})</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}


export { getTrackingTokenFromLocation, buildTrackingUrl } from "../../constants/trackingCopy";

