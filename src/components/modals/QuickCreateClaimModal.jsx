import React, { useState, useCallback } from "react";
import {
  X,
  Plus,
  FileText,
  Phone,
  Car,
  Building2,
  Check,
  User,
  Sparkles,
  Tag,
  Gauge,
  Wrench,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { INSURERS } from "../../constants/config";
import { emptyClaim, getMostFrequentInsurer } from "../../utils/claimUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";
import AppButton from "../common/AppButton";
import { useModalEscape, overlayBackdropCloseProps } from "../../hooks/useModalEscape";
import AiDocumentUploadModal from "./AiDocumentUploadModal";

const fieldClass = (desktopUi) =>
  desktopUi
    ? "app-search w-full px-3 py-2 rounded-lg text-[13.5px]"
    : "app-mobile-input w-full px-3.5 py-2.5 rounded-xl text-[14.5px]";

const labelClass = (desktopUi) =>
  desktopUi
    ? "app-login-label mb-1 flex items-center gap-1.5 text-[11.5px]"
    : "app-mobile-label flex items-center gap-1.5 mb-1.5 text-[12px]";

export default function QuickCreateClaimModal({
  isOpen,
  onClose,
  onSave,
  onNotify,
  allClaims = [],
  themeId = "atelier",
  desktopUi = false,
  initialStatus = "deschidere",
  initialDataProgramare = null,
}) {
  const defaultInsurer = getMostFrequentInsurer(allClaims, INSURERS[0]);
  const [numarInmatriculare, setNumarInmatriculare] = useState("");
  const [numarDosar, setNumarDosar] = useState("");
  const [client, setClient] = useState("");
  const [telefon, setTelefon] = useState("");
  const [asigurator, setAsigurator] = useState(defaultInsurer);
  const [customAsigurator, setCustomAsigurator] = useState("");
  const [vin, setVin] = useState("");
  const [marcaModel, setMarcaModel] = useState("");
  const [kilometraj, setKilometraj] = useState("");
  const [operatiuni, setOperatiuni] = useState([]);
  const [ceEsteDeReparat, setCeEsteDeReparat] = useState("");
  const [importedData, setImportedData] = useState(null);
  const [importedDocType, setImportedDocType] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleClose = useCallback(() => onClose?.(), [onClose]);
  useModalEscape(handleClose, { enabled: isOpen });
  const backdropProps = overlayBackdropCloseProps(desktopUi && isOpen, handleClose);

  if (!isOpen) return null;

  const statusKey = initialStatus || "deschidere";
  const scheduleHint = initialDataProgramare
    ? String(initialDataProgramare).replace("T", " ").slice(0, 16)
    : null;

  const notify = (message, type = "error") => {
    if (onNotify) onNotify(message, type);
    else if (typeof window !== "undefined") window.alert(message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numarInmatriculare.trim()) {
      notify("Te rugăm să introduci numărul de înmatriculare.");
      return;
    }

    const selectedInsurer = asigurator === "ALTUL" ? customAsigurator.trim() : asigurator;

    setIsSaving(true);
    try {
      const baseClaim = emptyClaim(statusKey);

      const finalMarcaModel = (marcaModel || importedData?.marcaModel || "").trim().toUpperCase();
      let finalMarca = importedData?.marca || "";
      let finalModel = importedData?.model || "";
      if (finalMarcaModel && (!finalMarca || !finalModel)) {
        const parts = finalMarcaModel.split(/\s+/);
        if (!finalMarca) finalMarca = parts[0] || "";
        if (!finalModel && parts.length > 1) finalModel = parts.slice(1).join(" ");
      }

      const activeOps =
        operatiuni && operatiuni.length > 0
          ? operatiuni
          : Array.isArray(importedData?.operatiuni) && importedData.operatiuni.length > 0
            ? importedData.operatiuni
            : baseClaim.operatiuni || [];

      const finalCeEsteDeReparat = (
        ceEsteDeReparat ||
        (Array.isArray(activeOps) && activeOps.length > 0
          ? activeOps
              .map((o) => o.piesa)
              .filter(Boolean)
              .join(", ")
          : "") ||
        importedData?.ceEsteDeReparat ||
        ""
      ).trim();

      const claimPayload = {
        ...baseClaim,
        ...(importedData || {}),
        tipAsigurare: importedData?.tipAsigurare || "CASCO",
        numarInmatriculare: numarInmatriculare.trim().toUpperCase(),
        numarDosar: numarDosar.trim(),
        nrDosarAsigurator: numarDosar.trim() || importedData?.nrDosarAsigurator || "",
        client: client.trim().toUpperCase(),
        telefonClient: telefon.trim(),
        asigurator: selectedInsurer,
        vin: (vin || importedData?.vin || "").trim().toUpperCase(),
        marcaModel: finalMarcaModel,
        marca: finalMarca,
        model: finalModel,
        kilometraj:
          kilometraj !== "" && kilometraj != null
            ? Number(kilometraj)
            : importedData?.kilometraj != null
              ? Number(importedData.kilometraj)
              : null,
        operatiuni: activeOps,
        ceEsteDeReparat: finalCeEsteDeReparat,
        status: statusKey === "primit" ? "deschidere" : statusKey,
        ...(initialDataProgramare ? { dataProgramare: initialDataProgramare } : {}),
      };

      const result = await onSave(claimPayload);
      if (result && result.success === false) {
        return;
      }
      setNumarInmatriculare("");
      setNumarDosar("");
      setClient("");
      setTelefon("");
      setVin("");
      setMarcaModel("");
      setKilometraj("");
      setOperatiuni([]);
      setCeEsteDeReparat("");
      setImportedData(null);
      setImportedDocType("");
      onClose();
    } catch (err) {
      console.error("Error creating claim:", err);
      notify("Eroare la salvarea dosarului: " + (err?.message || "necunoscută"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiDataExtracted = (extractedClaim, docType) => {
    if (!extractedClaim) return;
    setImportedData(extractedClaim);
    const resolvedDoc = docType || extractedClaim.aiDocumentType || "Document";
    setImportedDocType(resolvedDoc);

    if (extractedClaim.numarInmatriculare) setNumarInmatriculare(extractedClaim.numarInmatriculare);
    if (extractedClaim.numarDosar) setNumarDosar(extractedClaim.numarDosar);
    if (extractedClaim.client) setClient(extractedClaim.client);
    if (extractedClaim.telefonClient) setTelefon(extractedClaim.telefonClient);
    if (extractedClaim.asigurator) setAsigurator(extractedClaim.asigurator);
    if (extractedClaim.vin) setVin(extractedClaim.vin);

    if (extractedClaim.marcaModel) {
      setMarcaModel(extractedClaim.marcaModel);
    } else if (extractedClaim.marca || extractedClaim.model) {
      setMarcaModel([extractedClaim.marca, extractedClaim.model].filter(Boolean).join(" "));
    }

    if (extractedClaim.kilometraj != null && extractedClaim.kilometraj !== "") {
      setKilometraj(String(extractedClaim.kilometraj));
    }

    if (Array.isArray(extractedClaim.operatiuni) && extractedClaim.operatiuni.length > 0) {
      setOperatiuni(extractedClaim.operatiuni);
    }

    if (extractedClaim.ceEsteDeReparat) {
      setCeEsteDeReparat(extractedClaim.ceEsteDeReparat);
    }

    notify(
      `Datele au fost preluate cu succes din ${resolvedDoc}!`,
      "success"
    );
  };

  const handleRemoveOperation = (index) => {
    const updated = operatiuni.filter((_, i) => i !== index);
    setOperatiuni(updated);
    setCeEsteDeReparat(updated.map((o) => o.piesa).filter(Boolean).join(", "));
  };

  const handleResetImport = () => {
    setImportedData(null);
    setImportedDocType("");
    setOperatiuni([]);
    setCeEsteDeReparat("");
  };

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi, themeId)}
      {...backdropProps}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          className={modalHeaderClass(
            desktopUi,
            "px-4 py-3 flex items-center justify-between shrink-0"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                desktopUi ? "app-accent-bg" : "m-modal-header-icon"
              }`}
            >
              <Plus size={20} />
            </div>
            <div className="min-w-0">
              <h2
                className={`font-semibold text-[16px] tracking-tight truncate app-display ${
                  desktopUi ? "text-[var(--app-text)]" : "font-extrabold text-white"
                }`}
              >
                Dosar Nou Rapid
              </h2>
              {scheduleHint ? (
                <p
                  className={`text-[11px] truncate ${
                    desktopUi ? "text-[var(--app-muted)]" : "text-white/70"
                  }`}
                >
                  Programare: {scheduleHint}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg shrink-0 ${
              desktopUi
                ? "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body cu Scroll */}
        <form onSubmit={handleSubmit} className="m-modal-body flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Buton declanșare Import Deviz Nativ */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="w-full py-2.5 px-3.5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-left">
              <FileText size={16} className="text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-300">
                  Importă Deviz Audatex / DAT / Contract
                </p>
                <p className="text-[10px] text-slate-400">
                  Încarcă PDF sau imagine pentru completare completă (serie șasiu, operațiuni etc.)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-indigo-400 group-hover:underline shrink-0">
              Încarcă →
            </span>
          </button>

          {/* Banner Confirmare Import Date dacă există */}
          {importedData && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-300">
                    Date importate din: {importedDocType || "Document"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetImport}
                  className="text-[10.5px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                >
                  Resetează import
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                {vin && (
                  <span className="bg-slate-800/90 text-slate-200 px-2 py-0.5 rounded font-mono border border-slate-700">
                    VIN: {vin}
                  </span>
                )}
                {marcaModel && (
                  <span className="bg-slate-800/90 text-slate-200 px-2 py-0.5 rounded border border-slate-700 font-medium">
                    {marcaModel}
                  </span>
                )}
                {kilometraj && (
                  <span className="bg-slate-800/90 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                    {kilometraj} km
                  </span>
                )}
                {operatiuni.length > 0 && (
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                    {operatiuni.length} operațiuni de executat
                  </span>
                )}
                {Number(importedData?.valoareDevizAudatex) > 0 && (
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold border border-blue-500/30">
                    Deviz: {importedData.valoareDevizAudatex} RON
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Grid Câmpuri Dosar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nr. Înmatriculare */}
            <div>
              <label className={labelClass(desktopUi)}>
                <Car size={13} className="text-[var(--app-accent)]" /> Nr. înmatriculare *
              </label>
              <input
                type="text"
                required
                autoFocus
                className={`${fieldClass(desktopUi)} font-mono font-extrabold tracking-wider uppercase`}
                placeholder="Ex: B 123 ABC"
                value={numarInmatriculare}
                onChange={(e) => setNumarInmatriculare(e.target.value)}
              />
            </div>

            {/* Nr. Dosar Daună */}
            <div>
              <label className={labelClass(desktopUi)}>
                <FileText size={13} className="text-[var(--app-muted)]" /> Nr. dosar daună
              </label>
              <input
                type="text"
                className={`${fieldClass(desktopUi)} font-mono font-bold uppercase`}
                placeholder="Ex: 10328323"
                value={numarDosar}
                onChange={(e) => setNumarDosar(e.target.value)}
              />
            </div>

            {/* Serie Șasiu (VIN) */}
            <div>
              <label className={labelClass(desktopUi)}>
                <Tag size={13} className="text-[var(--app-muted)]" /> Serie șasiu (VIN)
              </label>
              <input
                type="text"
                maxLength={17}
                className={`${fieldClass(desktopUi)} font-mono font-bold uppercase tracking-wider`}
                placeholder="17 caractere (ex: WBA...)"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
              />
            </div>

            {/* Marcă & Model */}
            <div>
              <label className={labelClass(desktopUi)}>
                <Car size={13} className="text-[var(--app-muted)]" /> Marcă &amp; Model
              </label>
              <input
                type="text"
                className={`${fieldClass(desktopUi)} font-semibold uppercase`}
                placeholder="Ex: BMW 3 (G20) sau VW GOLF"
                value={marcaModel}
                onChange={(e) => setMarcaModel(e.target.value.toUpperCase())}
              />
            </div>

            {/* Kilometraj */}
            <div>
              <label className={labelClass(desktopUi)}>
                <Gauge size={13} className="text-[var(--app-muted)]" /> Kilometraj (km)
              </label>
              <input
                type="number"
                className={`${fieldClass(desktopUi)} font-mono font-bold`}
                placeholder="Ex: 145000"
                value={kilometraj}
                onChange={(e) => setKilometraj(e.target.value)}
              />
            </div>

            {/* Asigurător */}
            <div>
              <label className={labelClass(desktopUi)}>
                <Building2 size={13} className="text-[var(--app-muted)]" /> Asigurător
              </label>
              <select
                className={`${fieldClass(desktopUi)} font-bold`}
                value={asigurator}
                onChange={(e) => setAsigurator(e.target.value)}
              >
                {INSURERS.map((ins) => (
                  <option key={ins} value={ins}>
                    {ins}
                  </option>
                ))}
                <option value="ALTUL">-- Alt asigurător --</option>
              </select>
            </div>
          </div>

          {/* Câmp personalizat dacă e selectat alt asigurător */}
          {asigurator === "ALTUL" && (
            <div>
              <input
                type="text"
                required
                className={`${fieldClass(desktopUi)} font-bold`}
                placeholder="Numele companiei de asigurare..."
                value={customAsigurator}
                onChange={(e) => setCustomAsigurator(e.target.value)}
              />
            </div>
          )}

          {/* Proprietar Auto & Telefon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass(desktopUi)}>
                <User size={13} className="text-[var(--app-muted)]" /> Proprietar auto
              </label>
              <input
                type="text"
                className={`${fieldClass(desktopUi)} font-semibold uppercase`}
                placeholder="Ex: Popescu Ion"
                value={client}
                onChange={(e) => setClient(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass(desktopUi)}>
                <Phone size={13} className="text-[var(--app-muted)]" /> Telefon client
              </label>
              <input
                type="tel"
                className={`${fieldClass(desktopUi)} font-bold font-mono`}
                placeholder="Ex: 0722 123 456"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
              />
            </div>
          </div>

          {/* Secțiune vizuală: Operațiuni de executat extrase */}
          {operatiuni.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--app-border)]/70">
              <div className="flex items-center justify-between">
                <label className={`${labelClass(desktopUi)} mb-0 font-bold`}>
                  <Wrench size={13} className="text-[var(--app-accent)]" />
                  Operațiuni de executat ({operatiuni.length})
                </label>
                <span className="text-[10.5px] text-[var(--app-muted)]">
                  Vor fi preluate automat în fișa dosarului
                </span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)]">
                {operatiuni.map((op, idx) => (
                  <div
                    key={op.id || idx}
                    className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] text-xs gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10.5px] font-mono text-[var(--app-muted)] shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-semibold text-[var(--app-text-strong)] truncate text-[11.5px]">
                        {op.piesa}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {op.inl && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-extrabold text-[9.5px]">
                          INL
                        </span>
                      )}
                      {op.rev && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-extrabold text-[9.5px]">
                          VOPS
                        </span>
                      )}
                      {op.rep && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-extrabold text-[9.5px]">
                          REP
                        </span>
                      )}
                      {op.uni && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 font-extrabold text-[9.5px]">
                          D/R
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveOperation(idx)}
                        className="p-1 text-[var(--app-muted)] hover:text-rose-500 rounded transition-colors ml-0.5 cursor-pointer"
                        title="Elimină operațiunea"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Butoane Acțiuni Modal */}
          <div className="pt-2 flex gap-2">
            {desktopUi ? (
              <>
                <AppButton variant="secondary" onClick={onClose} className="flex-1 app-btn-lg">
                  Anulează
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="flex-1 app-btn-lg"
                >
                  <Check size={16} />
                  <span>{isSaving ? "Se salvează..." : "Creează dosar"}</span>
                </AppButton>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="m-modal-btn-secondary flex-1 py-3 px-4 rounded-xl font-bold text-[13px]"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="m-modal-btn-primary flex-1 py-3 px-4 rounded-xl font-extrabold text-[13.5px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check size={18} />
                  <span>{isSaving ? "Se salvează..." : "Creează dosar"}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <AiDocumentUploadModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onDataExtracted={handleAiDataExtracted}
      />
    </div>
  );
}
