import React, { useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, FileText, Check } from "lucide-react";
import { INSURANCE_TYPES, INSURERS, MAX_POZE_PER_DOSAR, MAX_UPLOAD_SIZE_BYTES } from "../../constants/config";
import { OFFICIAL_DOC_TYPES, PHOTO_CATEGORIES_V2 } from "../../constants/vehicleParts";
import { emptyClaim, uploadStorageItem } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { nowISO, uid } from "../../utils/dateUtils";
import { supabase } from "../../supabaseClient";
import VehicleDamageDiagram from "../inspection/VehicleDamageDiagram";

const STEPS = [
  { key: "vehicul", label: "Vehicul" },
  { key: "client", label: "Client & dosar" },
  { key: "avarii", label: "Avarii" },
  { key: "media", label: "Poze & acte" },
];

export default function ReceptionWizard({
  defaultInsurer,
  onCancel,
  onCreated,
  showNotice,
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => {
    const c = emptyClaim("deschidere", defaultInsurer);
    c.adusaFizic = true;
    return c;
  });
  const [pendingFiles, setPendingFiles] = useState([]); // {file, category, kind: 'poza'|'doc', docTip?}

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const marcaModel = useMemo(
    () => [draft.marca, draft.model].filter(Boolean).join(" "),
    [draft.marca, draft.model]
  );

  const canNext = () => {
    if (step === 0) return String(draft.numarInmatriculare || "").trim().length >= 3;
    if (step === 1) return true;
    return true;
  };

  const addFiles = async (fileList, { kind, category, docTip }) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const next = [];
    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        showNotice?.(`Fișier prea mare: ${file.name}`, "error");
        continue;
      }
      let prepared = file;
      if (kind === "poza" && file.type.startsWith("image/")) {
        prepared = await compressImage(file);
      }
      next.push({
        id: uid(),
        file: prepared,
        kind,
        category: category || "receptie",
        docTip: docTip || null,
      });
    }
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const removePending = (id) => setPendingFiles((prev) => prev.filter((p) => p.id !== id));

  const finish = async () => {
    if (!canNext()) {
      showNotice?.("Completează numărul de înmatriculare.", "error");
      return;
    }
    setSaving(true);
    try {
      const claim = {
        ...draft,
        marcaModel,
        dataUltimeiActualizari: nowISO(),
        dataSchimbareStatus: nowISO(),
      };

      // Upload media după ce avem id (deja generat în emptyClaim)
      const poze = [...(claim.poze || [])];
      const tipDocumente = [...(claim.tipDocumente || [])];
      const documente = [...(claim.documente || [])];

      for (const item of pendingFiles) {
        if (item.kind === "poza") {
          if (poze.length >= MAX_POZE_PER_DOSAR) continue;
          const uploaded = await uploadStorageItem(supabase, "poze-dosare", claim.id, item.file, "poze");
          poze.push({ ...uploaded, categorie: item.category });
        } else {
          const uploaded = await uploadStorageItem(
            supabase,
            "documente-dosare",
            claim.id,
            item.file,
            "documente"
          );
          const entry = { ...uploaded, tip: item.docTip || "altele" };
          tipDocumente.push(entry);
          documente.push(entry);
        }
      }

      const finalClaim = { ...claim, poze, tipDocumente, documente };
      await onCreated?.(finalClaim);
    } catch (err) {
      console.error(err);
      showNotice?.(err.message || "Eroare la salvare.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--v2-bg)]">
      <header className="shrink-0 border-b border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="v2-btn-ghost" onClick={onCancel}>
            <ChevronLeft size={18} /> Înapoi
          </button>
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--v2-accent)]">
              Recepție vehicul
            </div>
            <div className="text-sm text-[var(--v2-muted)]">
              Pas {step + 1} / {STEPS.length} — {STEPS[step].label}
            </div>
          </div>
          <div className="w-20" />
        </div>
        <div className="mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-[var(--v2-accent)]" : "bg-[var(--v2-border)]"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 0 && (
          <div className="mx-auto max-w-lg space-y-3">
            <Field label="Număr înmatriculare *" value={draft.numarInmatriculare}
              onChange={(v) => setField("numarInmatriculare", v.toUpperCase())} autoFocus />
            <Field label="Serie șasiu / VIN" value={draft.vin}
              onChange={(v) => setField("vin", v.toUpperCase())} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marcă" value={draft.marca} onChange={(v) => setField("marca", v)} />
              <Field label="Model" value={draft.model} onChange={(v) => setField("model", v)} />
            </div>
            <Field
              label="Kilometraj"
              type="number"
              value={draft.kilometraj ?? ""}
              onChange={(v) => setField("kilometraj", v === "" ? null : Number(v))}
            />
            <label className="block">
              <span className="v2-label">Tip dosar</span>
              <select
                className="v2-input"
                value={draft.tipAsigurare}
                onChange={(e) => setField("tipAsigurare", e.target.value)}
              >
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="mx-auto max-w-lg space-y-3">
            <Field label="Nume client" value={draft.client} onChange={(v) => setField("client", v)} />
            <Field label="Telefon" value={draft.telefonClient} onChange={(v) => setField("telefonClient", v)} type="tel" />
            <label className="block">
              <span className="v2-label">Asigurător</span>
              <select
                className="v2-input"
                value={INSURERS.includes(draft.asigurator) ? draft.asigurator : "__other__"}
                onChange={(e) => {
                  if (e.target.value === "__other__") setField("asigurator", "");
                  else setField("asigurator", e.target.value);
                }}
              >
                {INSURERS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
                <option value="__other__">Altul…</option>
              </select>
            </label>
            {!INSURERS.includes(draft.asigurator) && (
              <Field label="Asigurător (custom)" value={draft.asigurator}
                onChange={(v) => setField("asigurator", v)} />
            )}
            <Field label="Nr. dosar daună (asigurător)" value={draft.nrDosarAsigurator}
              onChange={(v) => setField("nrDosarAsigurator", v)} />
            <Field label="Nr. dosar intern" value={draft.numarDosar}
              onChange={(v) => setField("numarDosar", v)} />
            <Field label="Inspector de daună" value={draft.inspectorDauna}
              onChange={(v) => setField("inspectorDauna", v)} />
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-lg">
            <VehicleDamageDiagram
              marks={draft.damageMarks}
              onChange={(marks) => setField("damageMarks", marks)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-lg space-y-4">
            <section className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--v2-text)]">
                <Camera size={16} /> Poze avarii
              </h3>
              <label className="v2-btn-secondary inline-flex cursor-pointer items-center gap-2">
                <Camera size={16} />
                Fotografiază / Încarcă
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, { kind: "poza", category: "receptie" });
                    e.target.value = "";
                  }}
                />
              </label>
            </section>

            <section className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--v2-text)]">
                <FileText size={16} /> Documente client
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {OFFICIAL_DOC_TYPES.filter((d) =>
                  ["talon", "buletin", "permis", "polita"].includes(d.key)
                ).map((d) => (
                  <label key={d.key} className="v2-btn-ghost cursor-pointer text-center text-xs">
                    {d.label}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        addFiles(e.target.files, {
                          kind: "doc",
                          category: "documente_client",
                          docTip: d.key,
                        });
                        e.target.value = "";
                      }}
                    />
                  </label>
                ))}
              </div>
            </section>

            {pendingFiles.length > 0 && (
              <ul className="space-y-1.5">
                {pendingFiles.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--v2-surface-2)] px-3 py-2 text-sm"
                  >
                    <span className="truncate text-[var(--v2-text)]">
                      {p.kind === "poza" ? "📷" : "📄"} {p.file.name}
                      {p.docTip ? ` (${p.docTip})` : ""}
                    </span>
                    <button type="button" className="text-[var(--v2-danger)]" onClick={() => removePending(p.id)}>
                      Șterge
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-[var(--v2-muted)]">
              Poți adăuga și mai târziu din fișa dosarului. Categorii:{" "}
              {PHOTO_CATEGORIES_V2.map((c) => c.label).join(", ")}.
            </p>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--v2-border)] bg-[var(--v2-surface)] px-4 py-3">
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 ? (
            <button type="button" className="v2-btn-ghost flex-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={16} /> Înapoi
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="v2-btn-primary flex-1"
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuă <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="v2-btn-primary flex-1"
              disabled={saving || !canNext()}
              onClick={finish}
            >
              <Check size={16} /> {saving ? "Salvez…" : "Creează dosarul"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoFocus }) {
  return (
    <label className="block">
      <span className="v2-label">{label}</span>
      <input
        className="v2-input"
        type={type}
        value={value ?? ""}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
