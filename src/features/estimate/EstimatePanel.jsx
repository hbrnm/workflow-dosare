import React, { useMemo } from "react";
import { Plus, Trash2, Wrench, FileUp, Paperclip } from "lucide-react";
import {
  OP_FLAGS,
  DEVIZ_FILE_TYPES,
  normalizeOperations,
  operationsSummary,
  countOperationsByFlag,
  emptyOperationLine,
} from "../../utils/estimateUtils";
import { uid } from "../../utils/dateUtils";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_MB,
  MAX_DOCUMENTE_PER_DOSAR,
} from "../../constants/config";
import { uploadStorageItem } from "../../utils/claimUtils";
import { supabase } from "../../supabaseClient";

/**
 * Tab Deviz & piese — linii INL/REV/REP/UNI + import fișiere Audatex/DAT/PDF.
 */
export default function EstimatePanel({ claim, setClaim, fullEdit, showNotice }) {
  const lines = useMemo(
    () => normalizeOperations(claim.operatiuni, claim.ceEsteDeReparat),
    [claim.operatiuni, claim.ceEsteDeReparat]
  );
  const counts = useMemo(() => countOperationsByFlag(lines), [lines]);
  const devize = Array.isArray(claim.devize) ? claim.devize : [];

  const setLines = (next) => {
    setClaim((c) => ({
      ...c,
      operatiuni: next,
      ceEsteDeReparat: operationsSummary(next),
    }));
  };

  const updateLine = (idx, patch) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    setLines(next);
  };

  const addLine = () => setLines([...lines, emptyOperationLine()]);

  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const setMoney = (key, value) => {
    const n = value === "" ? 0 : Number(value);
    setClaim((c) => ({ ...c, [key]: Number.isNaN(n) ? 0 : n }));
  };

  const uploadDeviz = async (fileList, tip) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (devize.length + files.length > MAX_DOCUMENTE_PER_DOSAR) {
      showNotice?.(`Maxim ${MAX_DOCUMENTE_PER_DOSAR} fișiere deviz.`, "error");
      return;
    }
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          showNotice?.(`${file.name} depășește ${MAX_UPLOAD_SIZE_MB}MB.`, "error");
          continue;
        }
        const item = await uploadStorageItem(
          supabase,
          "documente-dosare",
          claim.id,
          file,
          "documente"
        );
        uploaded.push({
          ...item,
          tip: tip || "pdf",
          id: item.id || uid(),
        });
      }
      if (uploaded.length) {
        setClaim((c) => ({
          ...c,
          devize: [...uploaded, ...(c.devize || [])],
          documente: [...uploaded, ...(c.documente || [])],
        }));
        showNotice?.(`${uploaded.length} fișier(e) deviz încărcate.`, "success");
      }
    } catch (err) {
      showNotice?.(err.message || "Upload eșuat.", "error");
    }
  };

  const removeDeviz = (id) => {
    setClaim((c) => ({
      ...c,
      devize: (c.devize || []).filter((d) => d.id !== id),
    }));
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--v2-text)]">
          <Wrench size={16} className="text-[var(--v2-accent)]" />
          Operațiuni / piese
        </div>
        {fullEdit && (
          <button type="button" className="v2-btn-secondary !py-1.5 text-xs" onClick={addLine}>
            <Plus size={14} /> Linie
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-[var(--v2-muted)]">
        <span>{counts.total} linii</span>
        <span>INL {counts.inl}</span>
        <span>REV {counts.rev}</span>
        <span>REP {counts.rep}</span>
        <span>UNI {counts.uni}</span>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--v2-border)] px-3 py-6 text-center text-sm text-[var(--v2-muted)]">
          Nicio linie. {fullEdit ? "Adaugă piese de înlocuit / reparat / vopsit." : ""}
        </div>
      ) : (
        <ul className="space-y-2">
          {lines.map((op, idx) => (
            <li
              key={op.id || idx}
              className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-2"
            >
              <div className="flex gap-2">
                <input
                  className="v2-input flex-1 !py-2 text-sm uppercase"
                  placeholder="ex: BARA FAȚĂ, ARIPĂ ST…"
                  value={op.piesa || ""}
                  disabled={!fullEdit}
                  onChange={(e) => updateLine(idx, { piesa: e.target.value.toUpperCase() })}
                />
                {fullEdit && (
                  <button
                    type="button"
                    className="v2-btn-ghost !px-2 text-[var(--v2-danger)]"
                    onClick={() => removeLine(idx)}
                    aria-label="Șterge linie"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {OP_FLAGS.map((f) => (
                  <label
                    key={f.key}
                    title={f.title}
                    className={`cursor-pointer rounded-lg border px-2 py-1 text-[10px] font-extrabold transition ${
                      op[f.key]
                        ? f.active
                        : "border-[var(--v2-border)] bg-[var(--v2-bg)] text-[var(--v2-muted)]"
                    } ${!fullEdit ? "pointer-events-none opacity-70" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!!op[f.key]}
                      disabled={!fullEdit}
                      onChange={(e) => updateLine(idx, { [f.key]: e.target.checked })}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
        <label className="block">
          <span className="v2-label">Valoare piese Audatex</span>
          <input
            className="v2-input"
            type="number"
            disabled={!fullEdit}
            value={claim.valoarePieseAudatex ?? 0}
            onChange={(e) => setMoney("valoarePieseAudatex", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="v2-label">Achiziție piese service</span>
          <input
            className="v2-input"
            type="number"
            disabled={!fullEdit}
            value={claim.valoareAchizitiePiese ?? 0}
            onChange={(e) => setMoney("valoareAchizitiePiese", e.target.value)}
          />
        </label>
        <div className="col-span-2 text-xs text-[var(--v2-muted)]">
          Marjă piese:{" "}
          <span className="font-semibold text-[var(--v2-text)]">
            {(
              Number(claim.valoarePieseAudatex || 0) - Number(claim.valoareAchizitiePiese || 0)
            ).toLocaleString("ro-RO")}{" "}
            RON
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-3">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--v2-text)]">
          <Paperclip size={14} /> Import / stocare deviz extern
        </h3>
        <p className="mb-3 text-xs text-[var(--v2-muted)]">
          Încarcă export Audatex / DAT / PDF generat extern — fără integrare API.
        </p>
        {fullEdit && (
          <div className="flex flex-wrap gap-2">
            {DEVIZ_FILE_TYPES.map((t) => (
              <label key={t.key} className="v2-btn-secondary cursor-pointer text-xs">
                <FileUp size={14} /> {t.label}
                <input
                  type="file"
                  accept=".pdf,.xml,.csv,.xlsx,.xls,.txt,image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    uploadDeviz(e.target.files, t.key);
                    e.target.value = "";
                  }}
                />
              </label>
            ))}
          </div>
        )}
        {devize.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--v2-muted)]">Niciun fișier deviz atașat.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {devize.map((d) => (
              <li
                key={d.id || d.path}
                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--v2-bg)] px-3 py-2 text-sm"
              >
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate text-[var(--v2-accent)] underline"
                >
                  {(DEVIZ_FILE_TYPES.find((t) => t.key === d.tip)?.label || d.tip || "Deviz") +
                    " — " +
                    (d.nume || "fișier")}
                </a>
                {fullEdit && (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-[var(--v2-danger)]"
                    onClick={() => removeDeviz(d.id)}
                  >
                    Șterge
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
