import React, { useMemo, useState } from "react";
import { X, Printer, Copy, Check, Calculator, Sparkles, FileText, Wrench } from "lucide-react";
import { generateQuickEstimate, buildNotaConstatareText } from "../../utils/quickEstimateGenerator";
import { modalOverlayClass, modalPanelClass } from "../common/modalShellClasses";

export default function QuickEstimateModal({
  isOpen,
  onClose,
  claim = {},
  tarifeAtelier = {},
  onApplyToFinancial = null,
  onNotify = null,
}) {
  const [copied, setCopied] = useState(false);

  const estimate = useMemo(() => {
    return generateQuickEstimate(claim, tarifeAtelier);
  }, [claim, tarifeAtelier]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    const text = buildNotaConstatareText(claim, estimate);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    onNotify?.("Nota de constatare a fost copiată în clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApply = () => {
    if (onApplyToFinancial) {
      onApplyToFinancial({
        valoareDevizAudatex: estimate.costTotalFaraTva,
        manoperaTinichigerie: estimate.totalManoperaTinichigerie,
        manoperaVopsitorie: estimate.totalManoperaVopsitorie,
        materialeVopsitorie: estimate.costMaterialeVopsea,
        oreLucrateTinichigerie: estimate.oreTinichigerie,
        oreLucrateVopsitorie: estimate.oreVopsitorie,
      });
      onNotify?.("Valorile din estimare au fost aplicate în secțiunea financiară a dosarului.", "success");
      onClose();
    }
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} max-w-2xl w-full p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="bg-[var(--app-surface-2)] border-b border-[var(--app-border)] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--app-accent)]/15 text-[var(--app-accent)]">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--app-text-strong)]">
                Notă de Constatare &amp; Deviz Estimativ Rapid
              </h2>
              <p className="text-[11px] text-[var(--app-muted)]">
                Calcul automatizat bazat pe repere avariate și tarife de atelier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--app-muted)] hover:text-[var(--app-text)] p-1.5 rounded-lg hover:bg-[var(--app-surface-muted)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-[var(--app-text)]">
          {/* Informații dosar & vehicul */}
          <div className="bg-[var(--app-surface-muted)] border border-[var(--app-border)] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--app-muted)] block">Dosar</span>
              <span className="font-semibold text-[var(--app-text-strong)]">{claim.numarDosar || "Fără număr"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--app-muted)] block">Nr. Înmatriculare</span>
              <span className="font-semibold text-[var(--app-text-strong)] font-mono">{claim.numarInmatriculare || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--app-muted)] block">Vehicul</span>
              <span className="font-semibold text-[var(--app-text-strong)]">{claim.marcaModel || [claim.marca, claim.model].filter(Boolean).join(" ") || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[var(--app-muted)] block">Asigurător</span>
              <span className="font-semibold text-[var(--app-text-strong)]">{claim.asigurator || "Regie proprie"}</span>
            </div>
          </div>

          {/* Tabel repere avariate */}
          <div className="border border-[var(--app-border)] rounded-xl overflow-hidden">
            <div className="bg-[var(--app-surface-2)] px-3 py-2 text-[11.5px] font-bold text-[var(--app-muted)] uppercase tracking-wide flex items-center justify-between border-b border-[var(--app-border)]">
              <span>Repere Avariate &amp; Lucrări Necesare ({estimate.elementeCount})</span>
              <span>Cost Estimat (fără TVA)</span>
            </div>
            <div className="divide-y divide-[var(--app-border-soft)] max-h-56 overflow-y-auto">
              {estimate.items.length > 0 ? (
                estimate.items.map((item, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between text-[12px] hover:bg-[var(--app-surface-2)]/50">
                    <div>
                      <span className="font-semibold text-[var(--app-text-strong)] block">{item.reper}</span>
                      <span className="text-[10.5px] text-[var(--app-muted)]">
                        Operațiuni: <strong className="text-[var(--app-accent)]">{item.operatiuni}</strong> (Tin: {item.oreTinichigerie}h / Vop: {item.oreVopsitorie}h)
                      </span>
                    </div>
                    <div className="font-mono font-bold text-[var(--app-text-strong)]">
                      {item.costEstimativFaraTva.toLocaleString("ro-RO")} RON
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-[12px] text-[var(--app-muted)] italic">
                  Nu au fost adăugate repere avariate pe acest dosar. Completează „Ce este de reparat”, operațiunile sau marcajele pe schemă.
                </div>
              )}
            </div>
          </div>

          {/* Sumar Financiar & Defalcare Ore */}
          <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2.5">
            <div className="text-[12px] font-bold uppercase text-[var(--app-muted)] tracking-wide flex items-center gap-1.5">
              <Wrench size={14} /> Totaluri Estimative &amp; Manoperă
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px]">
              <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                <span className="text-[10px] text-[var(--app-muted)] block">Tinichigerie ({estimate.oreTinichigerie} ore)</span>
                <span className="font-bold text-[var(--app-text-strong)]">{estimate.totalManoperaTinichigerie} RON</span>
              </div>
              <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                <span className="text-[10px] text-[var(--app-muted)] block">Vopsitorie ({estimate.oreVopsitorie} ore)</span>
                <span className="font-bold text-[var(--app-text-strong)]">{estimate.totalManoperaVopsitorie} RON</span>
              </div>
              <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                <span className="text-[10px] text-[var(--app-muted)] block">Materiale Vopsea</span>
                <span className="font-bold text-[var(--app-text-strong)]">{estimate.costMaterialeVopsea} RON</span>
              </div>
              <div className="bg-[var(--app-surface)] p-2 rounded-lg border border-[var(--app-border-soft)]">
                <span className="text-[10px] text-[var(--app-muted)] block">TVA ({estimate.tvaProc}%)</span>
                <span className="font-bold text-[var(--app-text-strong)]">{estimate.tvaValoare} RON</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--app-border-soft)] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[var(--app-muted)] block">Total General Deviz Estimativ</span>
                <span className="text-[18px] font-extrabold text-[var(--app-text-strong)]">
                  {estimate.costTotalCuTva.toLocaleString("ro-RO")} RON <span className="text-[11px] font-normal text-[var(--app-muted)]">(cu TVA)</span>
                </span>
              </div>
              <div className="text-right text-[11px] text-[var(--app-muted)]">
                Fără TVA: <strong className="text-[var(--app-text-strong)]">{estimate.costTotalFaraTva.toLocaleString("ro-RO")} RON</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[var(--app-surface-2)] border-t border-[var(--app-border)] px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Copiat!" : "Copiază text notă"}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimă</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onApplyToFinancial && (
              <button
                type="button"
                onClick={handleApply}
                disabled={estimate.elementeCount === 0}
                className="px-3 py-1.5 rounded-lg bg-[var(--app-accent)] text-white text-[12px] font-bold hover:bg-[var(--app-accent-hover)] flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Aplică în Financiar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--app-border)] text-[12px] font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors cursor-pointer"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
