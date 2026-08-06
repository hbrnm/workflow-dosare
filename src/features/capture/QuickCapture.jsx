import React, { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  Car,
  ImageIcon,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  MAX_POZE_PER_DOSAR,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  getStatusDefinition,
  getPhaseColors,
} from "../../constants/config";
import { PHOTO_CATEGORIES_V2 } from "../../constants/vehicleParts";
import { uploadStorageItem, refreshStorageUrls } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { loadLastCaptureClaimId, saveLastCaptureClaimId } from "../../utils/mobilePrefs";
import LiveStreamCameraModal from "../../components/common/LiveStreamCameraModal";
import { canEditWorkshop } from "../../constants/roles";

const CAPTURE_CATS = PHOTO_CATEGORIES_V2.filter((c) =>
  ["receptie", "reparatie", "predare", "documente_client"].includes(c.key)
);

/**
 * Capture rapidă — alege dosar existent, fotografiază din curte, salvează pe dosar.
 */
export default function QuickCapture({
  claims,
  role,
  canEditFn,
  onPatch,
  onNotify,
  onOpenClaim,
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(() => loadLastCaptureClaimId());
  const [uploading, setUploading] = useState(false);
  const [lastOk, setLastOk] = useState(null);
  const [displayPoze, setDisplayPoze] = useState([]);
  const [showLive, setShowLive] = useState(false);
  const [liveUiCategory, setLiveUiCategory] = useState("receptie");
  const [uploadCategory, setUploadCategory] = useState("receptie");

  const eligible = useMemo(() => {
    const list = claims || [];
    if (!canEditFn) return list;
    return list.filter((c) => canEditFn(c));
  }, [claims, canEditFn]);

  const recent = useMemo(
    () =>
      [...eligible]
        .sort((a, b) =>
          String(b.dataUltimeiActualizari || "").localeCompare(String(a.dataUltimeiActualizari || ""))
        )
        .slice(0, 12),
    [eligible]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return eligible
      .filter((c) => {
        const hay = [
          c.numarInmatriculare,
          c.client,
          c.numarDosar,
          c.vin,
          c.marca,
          c.model,
          c.marcaModel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [eligible, query, recent]);

  const selected = useMemo(
    () => (selectedId ? claims.find((c) => c.id === selectedId) || null : null),
    [claims, selectedId]
  );

  useEffect(() => {
    if (selectedId) saveLastCaptureClaimId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !claims?.length) return;
    const ok = claims.some((c) => c.id === selectedId && (!canEditFn || canEditFn(c)));
    if (!ok) setSelectedId(null);
  }, [claims, selectedId, canEditFn]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selected?.poze?.length) {
        setDisplayPoze([]);
        return;
      }
      const refreshed = await refreshStorageUrls(selected.poze, "poze-dosare", supabase);
      if (alive) setDisplayPoze(refreshed.slice(0, 12));
    })();
    return () => {
      alive = false;
    };
  }, [selected?.id, selected?.poze]);

  const selectClaim = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setLastOk(null);
  };

  const uploadFiles = async (fileList, categoria) => {
    if (!selected) {
      onNotify?.("Alege mai întâi un dosar.", "error");
      return;
    }
    if (!canEditWorkshop(role) && canEditFn && !canEditFn(selected)) {
      onNotify?.("Nu poți adăuga media pe acest dosar.", "error");
      return;
    }

    const files = Array.from(fileList || []);
    if (!files.length) return;

    let poze = [...(selected.poze || [])];
    setUploading(true);
    let added = 0;

    try {
      for (const file of files) {
        if (poze.length >= MAX_POZE_PER_DOSAR) {
          onNotify?.(`Limita e ${MAX_POZE_PER_DOSAR} poze / dosar.`, "error");
          break;
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          onNotify?.(`${file.name} depășește ${MAX_UPLOAD_SIZE_MB}MB.`, "error");
          continue;
        }
        const prepared = file.type?.startsWith("image/")
          ? await compressImage(file)
          : file;
        const uploaded = await uploadStorageItem(
          supabase,
          "poze-dosare",
          selected.id,
          prepared,
          "poze"
        );
        poze = [{ ...uploaded, categoria: categoria || "generale" }, ...poze];
        added += 1;
      }

      if (added > 0) {
        const ok = await onPatch?.(selected.id, { poze });
        if (ok !== false) {
          setLastOk({ count: added, plate: selected.numarInmatriculare, at: Date.now() });
          onNotify?.(
            `${added} poză${added > 1 ? "e" : ""} pe ${selected.numarInmatriculare || "dosar"}.`,
            "success"
          );
          try {
            navigator.vibrate?.(12);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error(err);
      onNotify?.(err.message || "Upload eșuat.", "error");
    } finally {
      setUploading(false);
    }
  };

  const openLive = (cat) => {
    if (!selected) {
      onNotify?.("Alege mai întâi un dosar.", "error");
      return;
    }
    const liveMap = {
      receptie: "receptie",
      reparatie: "reconstatare",
      predare: "predare",
      documente_client: "receptie",
    };
    setUploadCategory(cat);
    setLiveUiCategory(liveMap[cat] || "receptie");
    setShowLive(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-border)] px-4 py-3">
        <h1 className="flex items-center gap-2 font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          <Camera size={20} className="text-[var(--v2-accent)]" />
          Capture rapidă
        </h1>
        <p className="text-xs text-[var(--v2-muted)]">
          Alege dosarul → fotografiază din curte → se salvează automat
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="relative mb-3">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--v2-muted)]"
          />
          <input
            className="v2-input pl-9"
            placeholder="Caută nr. auto, client, VIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Claim picker */}
        <div className="mb-4 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">
            {query.trim() ? "Rezultate" : "Recente"}
          </div>
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--v2-muted)]">Niciun dosar.</p>
          ) : (
            results.map((c) => {
              const active = c.id === selectedId;
              const st = getStatusDefinition(c.status);
              const colors = getPhaseColors(c.status);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClaim(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[var(--v2-accent)] bg-[var(--v2-surface-2)]"
                      : "border-[var(--v2-border)] bg-[var(--v2-surface)] hover:bg-[var(--v2-surface-2)]"
                  }`}
                >
                  <Car
                    size={18}
                    className={active ? "text-[var(--v2-accent)]" : "text-[var(--v2-muted)]"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[var(--v2-text)]">
                      {c.numarInmatriculare || "Fără nr."}
                    </div>
                    <div className="truncate text-xs text-[var(--v2-muted)]">
                      {[c.client, c.marca || c.marcaModel].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                    style={{ background: colors.bg }}
                  >
                    {st.num}
                  </span>
                  {active && <CheckCircle2 size={18} className="shrink-0 text-[var(--v2-accent)]" />}
                </button>
              );
            })
          )}
        </div>

        {/* Capture actions */}
        <div
          className={`rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-4 transition ${
            selected ? "opacity-100" : "opacity-50"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-[var(--v2-text)]">
              {selected
                ? `Capture pe ${selected.numarInmatriculare}`
                : "Selectează un dosar mai sus"}
            </div>
            {selected && (
              <button
                type="button"
                className="text-xs font-medium text-[var(--v2-accent)]"
                onClick={() => onOpenClaim?.(selected.id)}
              >
                Deschide fișa →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CAPTURE_CATS.map((cat) => (
              <button
                key={cat.key}
                type="button"
                disabled={!selected || uploading}
                onClick={() => openLive(cat.key)}
                className="v2-btn-primary flex flex-col items-center gap-1 !py-4"
              >
                <Camera size={22} />
                <span className="text-[11px]">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CAPTURE_CATS.map((cat) => (
              <label
                key={`up-${cat.key}`}
                className={`v2-btn-secondary cursor-pointer text-xs ${
                  !selected || uploading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Upload size={14} />
                Galerie · {cat.label}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  disabled={!selected || uploading}
                  onChange={(e) => {
                    uploadFiles(e.target.files, cat.key);
                    e.target.value = "";
                  }}
                />
              </label>
            ))}
          </div>

          {uploading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--v2-accent)]">
              <Loader2 size={16} className="animate-spin" /> Se încarcă…
            </div>
          )}

          {lastOk && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#1e3d32] px-3 py-2 text-sm text-[#b6f0d0]">
              <CheckCircle2 size={16} />
              +{lastOk.count} pe {lastOk.plate || "dosar"}
            </div>
          )}
        </div>

        {/* Thumbs */}
        {selected && displayPoze.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">
              <ImageIcon size={12} /> Ultimele poze pe dosar
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {displayPoze.map((p) => (
                <a
                  key={p.id || p.path}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square overflow-hidden rounded-lg bg-[var(--v2-surface-2)]"
                >
                  {p.url ? (
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {showLive && (
        <LiveStreamCameraModal
          initialCategorie={liveUiCategory}
          onClose={() => setShowLive(false)}
          onSavePhoto={async (files, categorie) => {
            // Preferă categoria aleasă din ecranul V2; fallback la cea din modal
            const cat =
              uploadCategory === "reparatie" || uploadCategory === "documente_client"
                ? uploadCategory
                : categorie || uploadCategory;
            await uploadFiles(files, cat);
          }}
        />
      )}
    </div>
  );
}
