import React, { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, Check, X } from "lucide-react";
import {
  AUDATEX_IMPORT_FIELDS,
  applyEstimateValuesToClaim,
  countExtractedFields,
} from "../../utils/audatexParse";
import { parseEstimateFile } from "../../utils/audatexImportFile";

function formatRon(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Upload Audatex/DAT estimate → preview extracted costs → apply onto claim form.
 * @param {{ claim: object, setClaim: Function, showNotice?: Function, compact?: boolean }} props
 */
export default function AudatexImportCard({ claim, setClaim, showNotice, compact = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const onPick = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    setBusy(true);
    setPreview(null);
    try {
      const result = await parseEstimateFile(file);
      const n = countExtractedFields(result.values);
      if (n === 0) {
        showNotice?.(
          "Nu am putut extrage sume din fișier. Verifică că e un export Audatex/DAT (PDF/XML/CSV) cu recapitulare.",
          "error"
        );
        setPreview({ ...result, fileName: file.name, empty: true });
        return;
      }
      setPreview({ ...result, fileName: file.name, empty: false });
      showNotice?.(
        `Extrase ${n} valori din ${file.name} (${result.format || "deviz"}). Verifică și aplică.`,
        "success"
      );
    } catch (err) {
      showNotice?.(err?.message || "Citirea fișierului a eșuat.", "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const apply = () => {
    if (!preview?.values || preview.empty) return;
    setClaim((c) => applyEstimateValuesToClaim(c || claim, preview.values));
    showNotice?.("Valorile din deviz au fost aplicate pe dosar.", "success");
    setPreview(null);
  };

  const dismiss = () => setPreview(null);

  return (
    <div
      className={`rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] ${
        compact ? "p-3" : "p-4"
      } space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
            <Sparkles size={14} className="text-[var(--app-accent)]" />
            Import cheltuieli din deviz
          </div>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              PDF / XML / CSV / Excel Audatex sau DAT — extrage piese, manoperă, materiale vopsitorie.
            </p>
          )}
        </div>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5 text-[11px] font-bold text-[var(--app-text)] hover:border-[var(--app-accent)] ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {busy ? "Analizez…" : "Încarcă deviz"}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.xml,.csv,.xlsx,.xls,.txt,application/pdf,text/xml,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPick(e.target.files)}
          />
        </label>
      </div>

      {preview && (
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[11px]">
              <div className="truncate font-semibold text-[var(--app-text)]">{preview.fileName}</div>
              <div className="text-[var(--app-muted)]">
                Format: {preview.format || "?"} · încredere: {preview.confidence || "?"}
                {preview.empty ? " · fără sume" : ""}
              </div>
            </div>
            <button type="button" className="shrink-0 p-1 text-[var(--app-muted)]" onClick={dismiss} aria-label="Închide">
              <X size={14} />
            </button>
          </div>

          {!preview.empty && (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {AUDATEX_IMPORT_FIELDS.map((f) => {
                const v = preview.values?.[f.key];
                if (v == null) return null;
                return (
                  <div
                    key={f.key}
                    className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5"
                  >
                    <div className="text-[9px] font-semibold uppercase text-[var(--app-muted)]">{f.label}</div>
                    <div className="font-mono text-[12px] font-bold text-[var(--app-text-strong)]">
                      {f.key === "zileChirieAudatex" ? Math.round(v) : formatRon(v)}
                      {f.key !== "zileChirieAudatex" ? (
                        <span className="ml-0.5 text-[9px] font-normal text-[var(--app-muted)]">lei</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!preview.empty && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={apply}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-[11px] font-bold text-white"
              >
                <Check size={14} /> Aplică pe dosar
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--app-muted)]"
              >
                Anulează
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
