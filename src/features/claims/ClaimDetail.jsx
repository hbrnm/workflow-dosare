import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  Camera,
  FileText,
  Save,
  Trash2,
  Link2,
  Wallet,
} from "lucide-react";
import {
  STATUSES,
  getStatusDefinition,
  getPhaseColors,
  INSURANCE_TYPES,
  INSURERS,
  MAX_POZE_PER_DOSAR,
  MAX_DOCUMENTE_PER_DOSAR,
  MAX_UPLOAD_SIZE_BYTES,
} from "../../constants/config";
import { OFFICIAL_DOC_TYPES, PHOTO_CATEGORIES_V2 } from "../../constants/vehicleParts";
import {
  canEditClaimFull,
  canEditWorkshop,
  canChangeStatus,
  canDeleteClaim,
} from "../../constants/roles";
import { uploadStorageItem, refreshStorageUrls } from "../../utils/claimUtils";
import { compressImage } from "../../utils/imageUtils";
import { nowISO, todayISO } from "../../utils/dateUtils";
import { supabase } from "../../supabaseClient";
import VehicleDamageDiagram from "../inspection/VehicleDamageDiagram";
import { buildTrackingUrl } from "../tracking/TrackPage";
import {
  getEffectivePaymentDue,
  isPaymentOverdue,
  getDaysPaymentOverdue,
} from "../../utils/settlementUtils";
import EstimatePanel from "../estimate/EstimatePanel";

export default function ClaimDetail({
  claim: initial,
  role,
  userId,
  userEmail,
  onBack,
  onSave,
  onDelete,
  showNotice,
}) {
  const [claim, setClaim] = useState(initial);
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  const fullEdit = canEditClaimFull(role, claim, userId, userEmail);
  const workshop = canEditWorkshop(role);
  const statusOk = canChangeStatus(role);
  const deleteOk = canDeleteClaim(role, claim, userId, userEmail);
  const readOnlyDiagram = !fullEdit && !workshop;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const poze = await refreshStorageUrls(initial.poze || [], "poze-dosare", supabase);
      const documente = await refreshStorageUrls(initial.documente || [], "documente-dosare", supabase);
      const tipDocumente = await refreshStorageUrls(
        initial.tipDocumente || [],
        "documente-dosare",
        supabase
      );
      const devize = await refreshStorageUrls(initial.devize || [], "documente-dosare", supabase);
      if (!alive) return;
      setClaim((c) => ({ ...c, ...initial, poze, documente, tipDocumente, devize }));
      setMediaReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [initial.id]);

  const st = getStatusDefinition(claim.status);
  const colors = getPhaseColors(claim.status);

  const setField = (key, value) => setClaim((c) => ({ ...c, [key]: value }));

  const handleStatus = (key) => {
    if (!statusOk) return;
    setClaim((c) => ({
      ...c,
      status: key,
      dataSchimbareStatus: nowISO(),
      dataUltimeiActualizari: nowISO(),
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const marcaModel = [claim.marca, claim.model].filter(Boolean).join(" ") || claim.marcaModel;
      await onSave({ ...claim, marcaModel, dataUltimeiActualizari: nowISO() });
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (files, category) => {
    if (!workshop) return;
    const list = Array.from(files || []);
    let poze = [...(claim.poze || [])];
    for (const file of list) {
      if (poze.length >= MAX_POZE_PER_DOSAR) break;
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        showNotice?.(`Fișier prea mare: ${file.name}`, "error");
        continue;
      }
      const prepared = file.type.startsWith("image/") ? await compressImage(file) : file;
      const uploaded = await uploadStorageItem(supabase, "poze-dosare", claim.id, prepared, "poze");
      poze.push({ ...uploaded, categorie: category || "generale" });
    }
    setClaim((c) => ({ ...c, poze }));
  };

  const addOfficialDoc = async (files, tip) => {
    if (!fullEdit) return;
    const list = Array.from(files || []);
    let tipDocumente = [...(claim.tipDocumente || [])];
    let documente = [...(claim.documente || [])];
    for (const file of list) {
      if (documente.length >= MAX_DOCUMENTE_PER_DOSAR) break;
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        showNotice?.(`Fișier prea mare: ${file.name}`, "error");
        continue;
      }
      const uploaded = await uploadStorageItem(
        supabase,
        "documente-dosare",
        claim.id,
        file,
        "documente"
      );
      const entry = { ...uploaded, tip: tip || "altele" };
      tipDocumente.push(entry);
      documente.push(entry);
    }
    setClaim((c) => ({ ...c, tipDocumente, documente }));
  };

  const tabs = useMemo(
    () => [
      { key: "general", label: "General" },
      { key: "avarii", label: "Avarii" },
      { key: "deviz", label: "Deviz" },
      { key: "media", label: "Media" },
      { key: "decontare", label: "Decontare" },
      { key: "status", label: "Status" },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--v2-bg)]">
      <header className="shrink-0 border-b border-[var(--v2-border)] bg-[var(--v2-surface)] px-3 py-2">
        <div className="flex items-center gap-2">
          <button type="button" className="v2-btn-ghost !px-2" onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-[var(--v2-text)]">
              {claim.numarInmatriculare || "Dosar"}
            </div>
            <div className="truncate text-xs text-[var(--v2-muted)]">
              {[claim.marca, claim.model, claim.client].filter(Boolean).join(" · ")}
            </div>
          </div>
          {(fullEdit || workshop) && (
            <button type="button" className="v2-btn-primary !px-3" disabled={saving} onClick={save}>
              <Save size={14} /> {saving ? "…" : "Salvează"}
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === t.key
                  ? "bg-[var(--v2-accent)] text-[#1a1510]"
                  : "bg-[var(--v2-surface-2)] text-[var(--v2-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "general" && (
          <div className="mx-auto max-w-lg space-y-3">
            <div
              className="rounded-xl px-3 py-2 text-sm font-medium text-white"
              style={{ background: colors.bg }}
            >
              {st.num}. {st.label}
            </div>
            <Field label="Nr. înmatriculare" value={claim.numarInmatriculare} disabled={!fullEdit}
              onChange={(v) => setField("numarInmatriculare", v.toUpperCase())} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marcă" value={claim.marca} disabled={!fullEdit}
                onChange={(v) => setField("marca", v)} />
              <Field label="Model" value={claim.model} disabled={!fullEdit}
                onChange={(v) => setField("model", v)} />
            </div>
            <Field label="VIN" value={claim.vin} disabled={!fullEdit}
              onChange={(v) => setField("vin", v.toUpperCase())} />
            <Field label="Kilometraj" type="number" value={claim.kilometraj ?? ""} disabled={!fullEdit}
              onChange={(v) => setField("kilometraj", v === "" ? null : Number(v))} />
            <Field label="Client" value={claim.client} disabled={!fullEdit}
              onChange={(v) => setField("client", v)} />
            <Field label="Telefon" value={claim.telefonClient} disabled={!fullEdit}
              onChange={(v) => setField("telefonClient", v)} />
            {fullEdit && (
              <>
                <label className="block">
                  <span className="v2-label">Tip dosar</span>
                  <select className="v2-input" value={claim.tipAsigurare}
                    onChange={(e) => setField("tipAsigurare", e.target.value)}>
                    {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="v2-label">Asigurător</span>
                  <select className="v2-input"
                    value={INSURERS.includes(claim.asigurator) ? claim.asigurator : claim.asigurator || ""}
                    onChange={(e) => setField("asigurator", e.target.value)}>
                    {INSURERS.map((i) => <option key={i} value={i}>{i}</option>)}
                    {claim.asigurator && !INSURERS.includes(claim.asigurator) && (
                      <option value={claim.asigurator}>{claim.asigurator}</option>
                    )}
                  </select>
                </label>
                <Field label="Nr. dosar asigurător" value={claim.nrDosarAsigurator}
                  onChange={(v) => setField("nrDosarAsigurator", v)} />
                <Field label="Inspector daună" value={claim.inspectorDauna}
                  onChange={(v) => setField("inspectorDauna", v)} />
              </>
            )}
            {workshop && (
              <label className="block">
                <span className="v2-label">Notă progres (atelier)</span>
                <textarea
                  className="v2-input min-h-[80px]"
                  placeholder="Adaugă o notă de progres…"
                  onBlur={(e) => {
                    const text = e.target.value.trim();
                    if (!text) return;
                    const note = {
                      id: `n_${Date.now()}`,
                      text,
                      createdAt: nowISO(),
                      author: userEmail || "",
                    };
                    setClaim((c) => ({ ...c, note: [...(c.note || []), note] }));
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {(claim.note || []).length > 0 && (
              <ul className="space-y-1.5">
                {[...(claim.note || [])].reverse().slice(0, 8).map((n) => (
                  <li key={n.id || n.createdAt} className="rounded-lg bg-[var(--v2-surface-2)] px-3 py-2 text-sm">
                    <div className="text-[var(--v2-text)]">{n.text || n}</div>
                    <div className="text-[10px] text-[var(--v2-muted)]">
                      {n.author || ""} {n.createdAt ? `· ${String(n.createdAt).slice(0, 16)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {fullEdit && claim.trackingToken && (
              <>
                <label className="block">
                  <span className="v2-label">Mesaj pe linkul client (opțional)</span>
                  <textarea
                    className="v2-input min-h-[70px]"
                    placeholder="ex: Te sunăm mâine după-amiază pentru ridicare."
                    value={claim.mesajClient || ""}
                    onChange={(e) => setField("mesajClient", e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="v2-btn-secondary flex-1"
                    onClick={async () => {
                      const url = buildTrackingUrl(claim.trackingToken);
                      try {
                        await navigator.clipboard.writeText(url);
                        showNotice?.("Link tracking copiat.", "success");
                      } catch {
                        window.prompt("Copiază linkul tracking:", url);
                      }
                    }}
                  >
                    <Link2 size={14} /> Copiază link
                  </button>
                  <a
                    className="v2-btn-ghost flex-1 text-center"
                    href={buildTrackingUrl(claim.trackingToken)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview
                  </a>
                </div>
              </>
            )}
            {deleteOk && (
              <button
                type="button"
                className="v2-btn-ghost w-full text-[var(--v2-danger)]"
                onClick={() => {
                  if (window.confirm("Ștergi acest dosar?")) onDelete?.(claim.id);
                }}
              >
                <Trash2 size={14} /> Șterge dosar
              </button>
            )}
          </div>
        )}

        {tab === "avarii" && (
          <div className="mx-auto max-w-lg">
            <VehicleDamageDiagram
              marks={claim.damageMarks}
              readOnly={readOnlyDiagram}
              onChange={(marks) => setField("damageMarks", marks)}
            />
          </div>
        )}

        {tab === "deviz" && (
          <EstimatePanel
            claim={claim}
            setClaim={setClaim}
            fullEdit={fullEdit}
            showNotice={showNotice}
          />
        )}

        {tab === "media" && (
          <div className="mx-auto max-w-lg space-y-4">
            {workshop && (
              <div className="flex flex-wrap gap-2">
                {PHOTO_CATEGORIES_V2.map((cat) => (
                  <label key={cat.key} className="v2-btn-secondary cursor-pointer text-xs">
                    <Camera size={14} /> {cat.label}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files, cat.key);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            {!mediaReady ? (
              <p className="text-sm text-[var(--v2-muted)]">Se încarcă media…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(claim.poze || []).map((p) => (
                  <a
                    key={p.id || p.path}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-[var(--v2-surface-2)]"
                  >
                    {p.url ? (
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--v2-muted)]">poză</div>
                    )}
                  </a>
                ))}
              </div>
            )}

            {fullEdit && (
              <section className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FileText size={14} /> Documente oficiale
                </h3>
                <div className="flex flex-wrap gap-2">
                  {OFFICIAL_DOC_TYPES.map((d) => (
                    <label key={d.key} className="v2-btn-ghost cursor-pointer text-xs">
                      {d.label}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          addOfficialDoc(e.target.files, d.key);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ))}
                </div>
                <ul className="mt-2 space-y-1">
                  {(claim.tipDocumente || claim.documente || []).map((d) => (
                    <li key={d.id || d.path}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[var(--v2-accent)] underline"
                      >
                        {OFFICIAL_DOC_TYPES.find((t) => t.key === d.tip)?.label || d.tip || "Document"} — {d.nume}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === "decontare" && (
          <div className="mx-auto max-w-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--v2-text)]">
              <Wallet size={16} className="text-[var(--v2-accent)]" />
              Factură & încasare
            </div>

            {isPaymentOverdue(claim) && (
              <div className="rounded-xl border border-[var(--v2-danger)]/40 bg-[#3d1e1c] px-3 py-2 text-sm text-[#ffc4bf]">
                Plată restantă de {getDaysPaymentOverdue(claim)} zile
                {getEffectivePaymentDue(claim) ? ` · scadență ${getEffectivePaymentDue(claim)}` : ""}
              </div>
            )}

            <Field
              label="Nr. factură"
              value={claim.financiar?.numarFactura || ""}
              disabled={!fullEdit}
              onChange={(v) =>
                setClaim((c) => ({
                  ...c,
                  financiar: { ...(c.financiar || {}), numarFactura: v },
                }))
              }
            />
            <Field
              label="Data factură"
              type="date"
              value={(claim.financiar?.dataFactura || "").toString().slice(0, 10)}
              disabled={!fullEdit}
              onChange={(v) =>
                setClaim((c) => ({
                  ...c,
                  financiar: { ...(c.financiar || {}), dataFactura: v || null },
                }))
              }
            />
            <Field
              label="Termen plată"
              type="date"
              value={(claim.termenPlata || "").toString().slice(0, 10)}
              disabled={!fullEdit}
              onChange={(v) => setField("termenPlata", v || null)}
            />
            <p className="text-[10px] text-[var(--v2-muted)]">
              Dacă nu setezi termen, se folosește data facturii + 30 zile.
              {getEffectivePaymentDue(claim)
                ? ` Efectiv: ${getEffectivePaymentDue(claim)}`
                : ""}
            </p>
            <Field
              label="Sumă decont (RON)"
              type="number"
              value={claim.sumaDecont ?? ""}
              disabled={!fullEdit}
              onChange={(v) => setField("sumaDecont", v === "" ? 0 : Number(v))}
            />

            {fullEdit && (
              <label className="v2-btn-secondary inline-flex cursor-pointer items-center gap-2 text-xs">
                <FileText size={14} />
                Încarcă factura (PDF / imagine)
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    try {
                      const file = files[0];
                      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                        showNotice?.(`Fișier prea mare (max ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB)`, "error");
                        return;
                      }
                      const uploaded = await uploadStorageItem(
                        supabase,
                        "documente-dosare",
                        claim.id,
                        file,
                        "documente"
                      );
                      const entry = { ...uploaded, tip: "factura" };
                      setClaim((c) => ({
                        ...c,
                        tipDocumente: [...(c.tipDocumente || []), entry],
                        documente: [...(c.documente || []), entry],
                      }));
                      showNotice?.("Factura a fost atașată.", "success");
                    } catch (err) {
                      showNotice?.(err.message || "Upload eșuat", "error");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            <ul className="space-y-1">
              {(claim.tipDocumente || [])
                .filter((d) => d.tip === "factura")
                .map((d) => (
                  <li key={d.id || d.path}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--v2-accent)] underline"
                    >
                      Factură — {d.nume}
                    </a>
                  </li>
                ))}
            </ul>

            <label className="flex items-center gap-3 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-3 py-3">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!claim.incasat}
                disabled={!fullEdit}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setClaim((c) => ({
                    ...c,
                    incasat: checked,
                    dataIncasarii: checked ? c.dataIncasarii || todayISO() : null,
                  }));
                }}
              />
              <span className="text-sm font-medium text-[var(--v2-text)]">Marcat ca încasat / decontat</span>
            </label>
            {claim.incasat && (
              <Field
                label="Data încasării"
                type="date"
                value={(claim.dataIncasarii || "").toString().slice(0, 10)}
                disabled={!fullEdit}
                onChange={(v) => setField("dataIncasarii", v || null)}
              />
            )}

            {fullEdit && claim.status !== "facturat" && (
              <button
                type="button"
                className="v2-btn-secondary w-full"
                onClick={() =>
                  setClaim((c) => ({
                    ...c,
                    status: "facturat",
                    dataSchimbareStatus: nowISO(),
                  }))
                }
              >
                Treci statusul pe „Facturat asigurător”
              </button>
            )}
          </div>
        )}

        {tab === "status" && (
          <div className="mx-auto max-w-lg space-y-2">
            {STATUSES.map((s) => {
              const active = claim.status === s.key;
              const pc = getPhaseColors(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={!statusOk}
                  onClick={() => handleStatus(s.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-transparent text-white"
                      : "border-[var(--v2-border)] bg-[var(--v2-surface)] text-[var(--v2-text)]"
                  }`}
                  style={active ? { background: pc.bg } : undefined}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-white/20" : "bg-[var(--v2-surface-2)]"
                  }`}>
                    {s.num}
                  </span>
                  <span className="font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled }) {
  return (
    <label className="block">
      <span className="v2-label">{label}</span>
      <input
        className="v2-input"
        type={type}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
