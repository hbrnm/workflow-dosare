import React, { useState, useCallback } from "react";
import { X, Plus, FileText, Phone, Car, Building2, Check, User, Sparkles } from "lucide-react";
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
    ? "app-search w-full px-3 py-2.5 rounded-lg text-[14px]"
    : "app-mobile-input w-full px-3.5 py-3 rounded-xl text-[15px]";

const labelClass = (desktopUi) =>
  desktopUi
    ? "app-login-label mb-1"
    : "app-mobile-label flex items-center gap-1.5 mb-1.5";

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
      const result = await onSave({
        ...baseClaim,
        tipAsigurare: "CASCO",
        numarInmatriculare: numarInmatriculare.trim().toUpperCase(),
        numarDosar: numarDosar.trim(),
        client: client.trim().toUpperCase(),
        telefonClient: telefon.trim(),
        asigurator: selectedInsurer,
        status: statusKey === "primit" ? "deschidere" : statusKey,
        ...(initialDataProgramare ? { dataProgramare: initialDataProgramare } : {}),
      });
      if (result && result.success === false) {
        return;
      }
      setNumarInmatriculare("");
      setNumarDosar("");
      setClient("");
      setTelefon("");
      onClose();
    } catch (err) {
      console.error("Error creating claim:", err);
      notify("Eroare la salvarea dosarului: " + (err?.message || "necunoscută"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiDataExtracted = (extractedClaim) => {
    if (!extractedClaim) return;
    if (extractedClaim.numarInmatriculare) setNumarInmatriculare(extractedClaim.numarInmatriculare);
    if (extractedClaim.numarDosar) setNumarDosar(extractedClaim.numarDosar);
    if (extractedClaim.client) setClient(extractedClaim.client);
    if (extractedClaim.telefonClient) setTelefon(extractedClaim.telefonClient);
    if (extractedClaim.asigurator) setAsigurator(extractedClaim.asigurator);
    notify("Datele au fost preluate din document de către Agentul AI!", "success");
  };

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi, themeId)}
      {...backdropProps}
    >
      <div
        className={modalPanelClass(desktopUi, "w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150")}
        onMouseDown={(e) => e.stopPropagation()}
      >

        <div className={modalHeaderClass(desktopUi, "px-4 py-3.5 flex items-center justify-between shrink-0")}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${desktopUi ? "app-accent-bg" : "m-modal-header-icon"}`}>
              <Plus size={20} />
            </div>
            <div className="min-w-0">
              <h2 className={`font-semibold text-[16px] tracking-tight truncate app-display ${desktopUi ? "text-[var(--app-text)]" : "font-extrabold text-white"}`}>
                Dosar Nou Rapid
              </h2>
              {scheduleHint ? (
                <p className={`text-[11px] truncate ${desktopUi ? "text-[var(--app-muted)]" : "text-white/70"}`}>
                  Programare: {scheduleHint}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg shrink-0 ${desktopUi ? "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="m-modal-body flex-1 overflow-y-auto p-4 space-y-4">
          {/* Banner Agent AI */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="w-full py-2.5 px-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-left">
              <Sparkles size={16} className="text-indigo-400 animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-300">Scanează cu Agentul AI</p>
                <p className="text-[10px] text-slate-400">Încarcă deviz/PV pentru pre-completare</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-indigo-400 group-hover:underline">Extrage →</span>
          </button>

          <div>
            <label className={labelClass(desktopUi)}>
              <Car size={14} className="text-[var(--app-accent)]" /> Nr. înmatriculare *
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

          <div>
            <label className={labelClass(desktopUi)}>
              <FileText size={14} /> Nr. dosar daună
            </label>
            <input
              type="text"
              className={`${fieldClass(desktopUi)} font-mono font-bold`}
              placeholder="Ex: 10328323"
              value={numarDosar}
              onChange={(e) => setNumarDosar(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass(desktopUi)}>
              <User size={14} /> Proprietar auto
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
              <Phone size={14} /> Telefon client
            </label>
            <input
              type="tel"
              className={`${fieldClass(desktopUi)} font-bold`}
              placeholder="Ex: 0722 123 456"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass(desktopUi)}>
              <Building2 size={14} /> Asigurător
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

            {asigurator === "ALTUL" && (
              <input
                type="text"
                required
                className={`${fieldClass(desktopUi)} mt-2 font-bold`}
                placeholder="Numele asigurătorului..."
                value={customAsigurator}
                onChange={(e) => setCustomAsigurator(e.target.value)}
              />
            )}
          </div>

          <div className="pt-2 flex gap-2">
            {desktopUi ? (
              <>
                <AppButton variant="secondary" onClick={onClose} className="flex-1 app-btn-lg">
                  Anulează
                </AppButton>
                <AppButton type="submit" variant="primary" disabled={isSaving} className="flex-1 app-btn-lg">
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
                  className="m-modal-btn-primary flex-1 py-3 px-4 rounded-xl font-extrabold text-[13.5px] flex items-center justify-center gap-1.5 disabled:opacity-50"
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
