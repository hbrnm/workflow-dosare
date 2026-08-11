import React, { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, Check, X, AlertCircle } from "lucide-react";
import { AUDATEX_DEVIZ_UI_FIELDS } from "../../constants/audatexDevizFields";
import {
  applyEstimateValuesToClaim,
  countExtractedFields,
  countExtractedOperations,
  normalizeAudatexImportValues,
} from "../../utils/audatexParse";
import { parseEstimateFile } from "../../utils/audatexImportFile";

function formatRon(n) {
  if (n == null || n === "") return "—";
  return Number(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function flagChips(op) {
  const chips = [];
  if (op.inl) chips.push("INL");
  if (op.rev) chips.push("REV");
  if (op.rep) chips.push("REP");
  if (op.uni) chips.push("UNI");
  return chips;
}

function buildImportMeta(file, result) {
  return {
    fileName: file?.name || "",
    importedAt: new Date().toISOString(),
    format: result?.format || "unknown",
    confidence: result?.confidence || "",
  };
}

/**
 * Upload Audatex/DAT estimate → parse → apply automatically on claim form.
 */
export default function AudatexImportCard({ claim, setClaim, showNotice, compact = false, readOnly = false, onImported, manoperaTarife = null }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [applyOps, setApplyOps] = useState(true);
  const [lastError, setLastError] = useState("");

  const doApply = (result, file, withOps = applyOps) => {
    const ops = result.lineItems?.operations || [];
    setClaim((c) =>
      applyEstimateValuesToClaim(c, result.values || {}, {
        operations: ops,
        applyOperations: withOps && ops.length > 0,
        replaceOperations: true,
        importMeta: buildImportMeta(file, result),
        manoperaTarife,
      })
    );
    onImported?.();
    const n = countExtractedFields(result.values);
    const opCount = countExtractedOperations(result.lineItems);
    showNotice?.(
      `Import aplicat: ${n} totaluri Audatex` + (withOps && opCount ? ` + ${opCount} linii pe dosar` : "") + `.`,
      "success"
    );
  };

  const onPick = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file || readOnly) return;
    setBusy(true);
    setPreview(null);
    setLastError("");
    try {
      const result = await parseEstimateFile(file);
      const n = countExtractedFields(result.values);
      const ops = countExtractedOperations(result.lineItems);
      if (n === 0 && ops === 0) {
        const err =
          "Nu am putut extrage date din fișier. Folosește export PDF nativ Audatex/DAT (cu text), nu scan.";
        setLastError(err);
        showNotice?.(err, "error");
        setPreview({ ...result, fileName: file.name, empty: true });
        return;
      }
      const withOps = ops > 0;
      setApplyOps(withOps);
      setPreview({ ...result, fileName: file.name, empty: false, applied: true });
      doApply(result, file, withOps);
    } catch (err) {
      const msg = err?.message || "Citirea fișierului a eșuat.";
      setLastError(msg);
      showNotice?.(msg, "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reApply = () => {
    if (!preview || preview.empty) return;
    doApply(preview, { name: preview.fileName }, applyOps);
  };

  const dismiss = () => setPreview(null);
  const ops = preview?.lineItems?.operations || [];
  const partsCount = preview?.lineItems?.parts?.length || 0;
  const lastImport = claim?.financiar?.audatexImport;

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
            Import deviz Audatex
          </div>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              PDF / XML / CSV — completează automat câmpurile financiare + operațiuni (INL, REV, REP, UNI).
            </p>
          )}
          {lastImport?.fileName && !preview && (
            <p className="mt-1 text-[10px] text-[var(--app-success)]">
              Ultim import: {lastImport.fileName}
              {lastImport.format ? ` · ${lastImport.format}` : ""}
            </p>
          )}
        </div>
        {!readOnly && (
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
        )}
      </div>

      {lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 px-3 py-2 text-[11px] text-[var(--app-danger)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{lastError}</span>
        </div>
      )}

      {preview && !preview.empty && (
        <div className="rounded-lg border border-[var(--app-success)]/30 bg-[var(--app-success)]/10 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--app-success)]">
                <Check size={14} /> Import aplicat — {preview.fileName}
              </div>
              <div className="text-[var(--app-muted)]">
                Format: {preview.format || "?"} · încredere: {preview.confidence || "?"}
                {ops.length ? ` · ${ops.length} linii` : ""}
                {partsCount ? ` · ${partsCount} piese` : ""}
              </div>
            </div>
            <button type="button" className="shrink-0 p-1 text-[var(--app-muted)]" onClick={dismiss} aria-label="Închide">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {AUDATEX_DEVIZ_UI_FIELDS.map((f) => {
              const normalized = normalizeAudatexImportValues(preview.values || {});
              const v = normalized[f.key];
              if (v == null || v === "") return null;
              return (
                <div
                  key={f.key}
                  className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5"
                >
                  <div className="text-[9px] font-semibold uppercase text-[var(--app-muted)]">{f.label}</div>
                  <div className="font-mono text-[12px] font-bold text-[var(--app-text-strong)]">
                    {formatRon(v)}
                    <span className="ml-0.5 text-[9px] font-normal text-[var(--app-muted)]">lei</span>
                  </div>
                </div>
              );
            })}
          </div>

          {ops.length > 0 && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--app-text)]">
                <input
                  type="checkbox"
                  checked={applyOps}
                  onChange={(e) => setApplyOps(e.target.checked)}
                  className="rounded border-[var(--app-border)]"
                />
                Include lista pe dosar ({ops.length} linii)
              </label>
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-2">
                {ops.slice(0, 25).map((op) => (
                  <li key={op.id || op.piesa} className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate font-medium text-[var(--app-text)]">{op.piesa}</span>
                    <span className="shrink-0 text-[9px] font-bold text-[var(--app-muted)]">
                      {flagChips(op).join(" · ") || "—"}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={reApply}
                className="text-[10px] font-semibold text-[var(--app-accent)] underline"
              >
                Reaplică sume{applyOps ? " + linii" : ""}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
