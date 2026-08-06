import React, { useState } from "react";
import { X, Plus, FileText, Phone, Car, Building2, Check, User } from "lucide-react";
import { INSURERS } from "../../constants/config";
import { emptyClaim, getMostFrequentInsurer } from "../../utils/claimUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";

const fieldClass = (desktopUi) =>
  desktopUi
    ? "app-search w-full px-3 py-2.5 rounded-lg text-[14px]"
    : "app-mobile-input w-full px-3.5 py-3 rounded-xl text-[15px]";

const labelClass = (desktopUi) =>
  desktopUi
    ? "app-login-label mb-1"
    : "app-mobile-label flex items-center gap-1.5 mb-1.5";

export default function QuickCreateClaimModal({ isOpen, onClose, onSave, allClaims = [], themeId = "atelier", desktopUi = false }) {
  const defaultInsurer = getMostFrequentInsurer(allClaims, INSURERS[0]);
  const [numarInmatriculare, setNumarInmatriculare] = useState("");
  const [numarDosar, setNumarDosar] = useState("");
  const [client, setClient] = useState("");
  const [telefon, setTelefon] = useState("");
  const [asigurator, setAsigurator] = useState(defaultInsurer);
  const [customAsigurator, setCustomAsigurator] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numarInmatriculare.trim()) {
      alert("Te rugăm să introduci numărul de înmatriculare.");
      return;
    }

    const selectedInsurer = asigurator === "ALTUL" ? customAsigurator.trim() : asigurator;

    setIsSaving(true);
    try {
      const baseClaim = emptyClaim("deschidere");
      const result = await onSave({
        ...baseClaim,
        tipAsigurare: "CASCO",
        numarInmatriculare: numarInmatriculare.trim().toUpperCase(),
        numarDosar: numarDosar.trim(),
        client: client.trim().toUpperCase(),
        telefonClient: telefon.trim(),
        asigurator: selectedInsurer,
        status: "deschidere",
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
      alert("Eroare la salvarea dosarului: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={modalOverlayClass(desktopUi, { dense: true })}
      {...modalOverlayProps(desktopUi, themeId)}
    >
      <div className={modalPanelClass(desktopUi, "w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150")}>

        <div className={modalHeaderClass(desktopUi, "px-4 py-3.5 flex items-center justify-between shrink-0")}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${desktopUi ? "app-accent-bg" : "m-modal-header-icon"}`}>
              <Plus size={20} />
            </div>
            <h2 className={`font-semibold text-[16px] tracking-tight truncate app-display ${desktopUi ? "text-[var(--app-text)]" : "font-extrabold text-white"}`}>
              Dosar Nou Rapid
            </h2>
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
          <div>
            <label className={labelClass(desktopUi)}>
              <Car size={14} className="text-[var(--app-accent)]" /> Nr. înmatriculare *
            </label>
            <input
              type="text"
              required
              autoFocus
              className={`${fieldClass(desktopUi)} font-mono font-extrabold tracking-wider uppercase`}
              placeholder="ex: B 123 ABC"
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
              placeholder="ex: 10328323"
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
              placeholder="ex: POPESCU ION"
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
              placeholder="ex: 0722123456"
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
          </div>
        </form>
      </div>
    </div>
  );
}
