import React, { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, Check, X, AlertCircle, Edit3, ScanText, Calculator } from "lucide-react";
import { AUDATEX_DEVIZ_UI_FIELDS } from "../../constants/audatexDevizFields";
import {
  applyEstimateValuesToClaim,
  countExtractedFields,
  countExtractedOperations,
  normalizeAudatexImportValues,
  parseEstimateText,
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

function buildImportMeta(file, result, mode = "auto") {
  return {
    fileName: file?.name || (mode === "manual" ? "Completare manuală" : "Deviz importat"),
    importedAt: new Date().toISOString(),
    format: result?.format || (mode === "manual" ? "Completare manuală (fallback)" : "unknown"),
    confidence: result?.confidence || (mode === "manual" ? "100%" : ""),
  };
}

/**
 * Upload Audatex/DAT estimate → parse → apply automatically on claim form.
 * Includes guided Manual Entry Fallback and OCR Scan Fallback for scanned/unreadable PDFs.
 */
export default function AudatexImportCard({
  claim,
  setClaim,
  showNotice,
  compact = false,
  readOnly = false,
  onImported,
  manoperaTarife = null,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [applyOps, setApplyOps] = useState(true);
  const [lastError, setLastError] = useState("");
  const [currentFile, setCurrentFile] = useState(null);

  // State fallback completare manuală
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualValues, setManualValues] = useState({
    totalPieseAudatex: "",
    manoperaTinichigerie: "",
    oreTinichigerieAudatex: "",
    manoperaVopsitorie: "",
    oreVopsitorieAudatex: "",
    materialeVopsitorie: "",
    costReparatieFaraTva: "",
    costReparatieCuTva: "",
  });

  const doApply = (result, file, withOps = applyOps, mode = "auto") => {
    const ops = result.lineItems?.operations || [];
    setClaim((c) =>
      applyEstimateValuesToClaim(c, result.values || {}, {
        operations: ops,
        applyOperations: withOps && ops.length > 0,
        replaceOperations: true,
        importMeta: buildImportMeta(file, result, mode),
        manoperaTarife,
      })
    );
    onImported?.();
    const n = countExtractedFields(result.values);
    const opCount = countExtractedOperations(result.lineItems);
    showNotice?.(
      mode === "manual"
        ? "Sumele din deviz au fost completate manual și aplicate pe dosar."
        : `Import aplicat: ${n} totaluri Audatex` + (withOps && opCount ? ` + ${opCount} linii pe dosar` : "") + `.`,
      "success"
    );
  };

  const onPick = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file || readOnly) return;
    setBusy(true);
    setPreview(null);
    setLastError("");
    setCurrentFile(file);
    try {
      const result = await parseEstimateFile(file);
      const n = countExtractedFields(result.values);
      const ops = countExtractedOperations(result.lineItems);

      if (n === 0 && ops === 0) {
        const err =
          "Nu am putut extrage text din fișier (PDF scanat / imagine). Folosește completarea manuală mai jos sau scanarea OCR.";
        setLastError(err);
        showNotice?.(err, "error");
        setPreview({ ...result, fileName: file.name, empty: true });
        setShowManualFallback(true);
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
      setShowManualFallback(true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRunOcrFallback = async () => {
    if (!currentFile) {
      showNotice?.("Încarcă mai întâi un fișier deviz pentru scanare OCR.", "error");
      return;
    }
    setOcrBusy(true);
    try {
      const { extractTextWithTesseract } = await import("../../utils/aiDocumentExtractor");
      const text = await extractTextWithTesseract(currentFile, (progressMsg) => {
        setLastError(`OCR în curs: ${progressMsg}`);
      });
      if (!text || text.trim().length < 20) {
        throw new Error("Nu s-a putut detecta text prin OCR. Completează sumele manual mai jos.");
      }
      const result = parseEstimateText(text);
      const n = countExtractedFields(result.values);
      if (n === 0) {
        throw new Error("Textul extras prin OCR nu conține structură Audatex recunoscută. Folosește completarea manuală.");
      }
      setLastError("");
      setPreview({ ...result, fileName: currentFile.name, format: "OCR Tesseract", empty: false, applied: true });
      doApply({ ...result, format: "OCR Tesseract" }, currentFile, false);
    } catch (err) {
      const msg = err?.message || "Scanarea OCR a eșuat.";
      setLastError(msg);
      showNotice?.(msg, "error");
      setShowManualFallback(true);
    } finally {
      setOcrBusy(false);
    }
  };

  const handleManualChange = (key, val) => {
    setManualValues((prev) => {
      const next = { ...prev, [key]: val };
      const piese = Number(next.totalPieseAudatex) || 0;
      const tinichigerie = Number(next.manoperaTinichigerie) || 0;
      const vopsitorie = Number(next.manoperaVopsitorie) || 0;
      const materiale = Number(next.materialeVopsitorie) || 0;
      const sum = piese + tinichigerie + vopsitorie + materiale;
      if (sum > 0 && (!next.costReparatieFaraTva || key !== "costReparatieFaraTva")) {
        next.costReparatieFaraTva = String(Math.round(sum * 100) / 100);
        next.costReparatieCuTva = String(Math.round(sum * 1.19 * 100) / 100);
      }
      return next;
    });
  };

  const handleApplyManualFallback = () => {
    const values = {};
    Object.entries(manualValues).forEach(([k, v]) => {
      if (v !== "" && v != null) {
        values[k] = Number(v);
      }
    });

    const n = Object.keys(values).length;
    if (n === 0) {
      showNotice?.("Introdu cel puțin o valoare din deviz.", "error");
      return;
    }

    const mockResult = {
      values,
      lineItems: { operations: [] },
      format: "Completare manuală (fallback)",
      confidence: "100%",
    };

    setPreview({ ...mockResult, fileName: currentFile?.name || "Deviz manual", empty: false });
    doApply(mockResult, currentFile || { name: "Deviz manual" }, false, "manual");
    setShowManualFallback(false);
    setLastError("");
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
      className={`rounded-xl border-2 border-dashed border-indigo-200 dark:border-zinc-800 bg-indigo-50/50 dark:bg-zinc-900/40 ${
        compact ? "p-3" : "p-4"
      } space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
            <Sparkles size={14} className="text-[var(--app-accent)]" />
            Import deviz Audatex / DAT
          </div>
          {!compact && (
            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              PDF / XML / CSV / Excel — completează automat câmpurile financiare + operațiuni.
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
          <div className="flex items-center gap-1.5 flex-wrap">
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
            <button
              type="button"
              onClick={() => setShowManualFallback((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                showManualFallback
                  ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-white"
                  : "border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-[var(--app-accent)]"
              }`}
              title="Completare manuală deviz când PDF-ul este scanat sau neformatat"
            >
              <Edit3 size={13} />
              {showManualFallback ? "Închide manual" : "Completare manuală"}
            </button>
          </div>
        )}
      </div>

      {lastError && (
        <div className="space-y-2 rounded-lg border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/10 px-3 py-2.5 text-[11px] text-[var(--app-danger)]">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--app-danger)]" />
            <div className="flex-1">
              <p className="font-semibold">{lastError}</p>
              <p className="text-[10.5px] opacity-90 mt-0.5">
                Devizele scanate ca poză pot fi introduse manual cu salvare ghidată sau scanate prin OCR.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--app-danger)]/20">
            {currentFile && (
              <button
                type="button"
                onClick={handleRunOcrFallback}
                disabled={ocrBusy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--app-danger)] text-white font-bold text-[10.5px] hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {ocrBusy ? <Loader2 size={12} className="animate-spin" /> : <ScanText size={12} />}
                {ocrBusy ? "Scanare OCR…" : "Încearcă scanare OCR (Tesseract)"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowManualFallback(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--app-surface-2)] border border-[var(--app-border)] font-bold text-[10.5px] text-[var(--app-text)] hover:border-[var(--app-accent)] cursor-pointer"
            >
              <Edit3 size={12} />
              Completare manuală ghidată
            </button>
          </div>
        </div>
      )}

      {/* Formular de completare manuală deviz (Fallback) */}
      {showManualFallback && (
        <div className="rounded-xl border border-[var(--app-accent)]/40 bg-[var(--app-surface-2)] p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[var(--app-border-soft)] pb-2">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--app-text-strong)]">
              <Calculator size={14} className="text-[var(--app-accent)]" />
              Completare Ghidată Deviz (Fallback Manual)
            </div>
            <span className="text-[10px] text-[var(--app-muted)]">Introdu sumele exacte din deviz</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px]">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Piese Schimb (lei)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={manualValues.totalPieseAudatex}
                onChange={(e) => handleManualChange("totalPieseAudatex", e.target.value)}
                className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold focus:border-[var(--app-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Manoperă Tinichigerie (lei)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valoare lei"
                  value={manualValues.manoperaTinichigerie}
                  onChange={(e) => handleManualChange("manoperaTinichigerie", e.target.value)}
                  className="flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold focus:border-[var(--app-accent)] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ore"
                  title="Ore tinichigerie"
                  value={manualValues.oreTinichigerieAudatex}
                  onChange={(e) => handleManualChange("oreTinichigerieAudatex", e.target.value)}
                  className="w-16 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-1.5 font-mono text-[11px] text-center focus:border-[var(--app-accent)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Manoperă Vopsitorie (lei)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valoare lei"
                  value={manualValues.manoperaVopsitorie}
                  onChange={(e) => handleManualChange("manoperaVopsitorie", e.target.value)}
                  className="flex-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold focus:border-[var(--app-accent)] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ore"
                  title="Ore vopsitorie"
                  value={manualValues.oreVopsitorieAudatex}
                  onChange={(e) => handleManualChange("oreVopsitorieAudatex", e.target.value)}
                  className="w-16 rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-1.5 font-mono text-[11px] text-center focus:border-[var(--app-accent)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Materiale Vopsitorie (lei)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={manualValues.materialeVopsitorie}
                onChange={(e) => handleManualChange("materialeVopsitorie", e.target.value)}
                className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold focus:border-[var(--app-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Total Deviz Fără TVA (lei)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto-calculat"
                value={manualValues.costReparatieFaraTva}
                onChange={(e) => handleManualChange("costReparatieFaraTva", e.target.value)}
                className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold text-[var(--app-accent)] focus:border-[var(--app-accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[var(--app-muted)] mb-1">
                Total Deviz Cu TVA (lei)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Auto-calculat +19%"
                value={manualValues.costReparatieCuTva}
                onChange={(e) => handleManualChange("costReparatieCuTva", e.target.value)}
                className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 font-mono text-[12px] font-bold text-[var(--app-success)] focus:border-[var(--app-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--app-border-soft)]">
            <button
              type="button"
              onClick={() => setShowManualFallback(false)}
              className="px-3 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[11px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] cursor-pointer"
            >
              Renunță
            </button>
            <button
              type="button"
              onClick={handleApplyManualFallback}
              className="px-4 py-1.5 rounded-lg bg-[var(--app-accent)] text-white text-[11px] font-extrabold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              Salvează & Aplică Deviz
            </button>
          </div>
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
                className="text-[10px] font-semibold text-[var(--app-accent)] underline cursor-pointer"
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
