import React, { useState } from "react";
import {
  X,
  Package,
  Download,
  Copy,
  Check,
  FileText,
  Image,
  FolderArchive,
  Loader2,
  Mail,
  Building2,
  ShieldAlert,
} from "lucide-react";
import {
  generateSettlementPackageZip,
  buildInsurerEmailTemplate,
} from "../../utils/exportSettlementZip";

export default function SettlementPackageModal({
  isOpen,
  onClose,
  claim,
  onNotify,
  atelierBranding = {},
  onPatchClaim = null,
  onMoveToStatus = null,
}) {
  const [downloading, setDownloading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [advanceToAccept, setAdvanceToAccept] = useState(() => claim?.status === "in_lucru");

  if (!isOpen || !claim) return null;

  const totalSum = Number(claim.sumaDecont || claim.valoareDevizAudatex || 0);
  const valPiese = Number(claim.valoarePieseAudatex || claim.financiar?.pieseFacturateFaraTva || 0);
  const manTotal = Number(
    (claim.manopera?.tinichigerie?.facturat || 0) + (claim.manopera?.vopsitorie?.facturat || 0)
  );
  const pozeCount = Array.isArray(claim.poze) ? claim.poze.length : 0;
  const docsCount = Array.isArray(claim.documente) ? claim.documente.length : 0;

  const emailText = buildInsurerEmailTemplate(claim, atelierBranding);

  const handleDownloadZip = async () => {
    setDownloading(true);
    setProgressMsg("Pregătire pachet decont...");
    try {
      await generateSettlementPackageZip(claim, {
        atelierBranding,
        onProgress: (p) => setProgressMsg(p.message || `Descărcare ${p.current}/${p.total}...`),
      });
      onNotify?.("Arhiva Pachet Decont ZIP a fost descărcată cu succes!", "success");

      // Înregistrează trimiterea decontului și opțional avansează în Accept plată
      if (onPatchClaim) {
        const patch = {
          dataTrimiteriiDecont: new Date().toISOString(),
        };
        if (advanceToAccept && claim.status !== "accept_plata" && claim.status !== "facturat") {
          patch.status = "accept_plata";
        }
        await onPatchClaim(claim.id, patch);
      } else if (advanceToAccept && onMoveToStatus && claim.status !== "accept_plata" && claim.status !== "facturat") {
        onMoveToStatus(claim, "accept_plata");
      }
    } catch (err) {
      console.error(err);
      onNotify?.(err.message || "Eroare la generarea arhivei de decont.", "error");
    } finally {
      setDownloading(false);
      setProgressMsg("");
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailText);
    setCopiedEmail(true);
    onNotify?.("Textul e-mailului a fost copiat în clipboard!", "info");
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <FolderArchive size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Pachet Decont Asigurător
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">
                  1-Click ZIP
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {claim.numarInmatriculare || "FĂRĂ NR."} · {claim.asigurator || "Asigurător"} · Dosar: {claim.nrDosarAsigurator || claim.numarDosar || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corp Conținut */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs scrollbar-thin">
          {/* 1. Sumar Financiar Decont */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10.5px] text-slate-400 font-medium block">Total Decont cu TVA</span>
              <span className="font-mono font-bold text-sm text-indigo-300 mt-1 block">
                {Math.round(totalSum).toLocaleString("ro-RO")} lei
              </span>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10.5px] text-slate-400 font-medium block">Valoare Piese fără TVA</span>
              <span className="font-mono font-bold text-sm text-slate-200 mt-1 block">
                {Math.round(valPiese).toLocaleString("ro-RO")} lei
              </span>
            </div>
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="text-[10.5px] text-slate-400 font-medium block">Manoperă Totală</span>
              <span className="font-mono font-bold text-sm text-slate-200 mt-1 block">
                {Math.round(manTotal).toLocaleString("ro-RO")} lei
              </span>
            </div>
          </div>

          {/* 2. Structura Fișierelor din Arhivă */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <Package size={14} className="text-emerald-400" />
              Conținut Arhivă ZIP Generată Automat
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-indigo-400" />
                  <span>01_Centralizator_Decont.pdf</span>
                </span>
                <span className="text-emerald-400 font-semibold text-[10px]">Generat PDF ✓</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="flex items-center gap-2">
                  <Image size={13} className="text-amber-400" />
                  <span>02_Foto_Dosar/</span>
                </span>
                <span className="font-mono text-slate-400 text-[10px]">{pozeCount} fotografii incluse</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="flex items-center gap-2">
                  <FileText size={13} className="text-sky-400" />
                  <span>03_Documente_si_Devize/</span>
                </span>
                <span className="font-mono text-slate-400 text-[10px]">{docsCount} documente atașate</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="flex items-center gap-2">
                  <Mail size={13} className="text-purple-400" />
                  <span>00_Text_Email_Asigurator.txt</span>
                </span>
                <span className="text-purple-400 font-semibold text-[10px]">Șablon E-mail ✓</span>
              </div>
            </div>
          </div>

          {/* 3. Previzualizare Text E-mail Asigurător */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                <Mail size={14} className="text-indigo-400" />
                Text E-mail Pre-redactat pentru Lichidator
              </h4>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                {copiedEmail ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedEmail ? "Copiat!" : "Copiază Text"}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={emailText}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-[11px] text-slate-300 font-mono resize-none focus:outline-none scrollbar-thin"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
            >
              Închide
            </button>
            {claim?.status === "in_lucru" && (
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px] select-none">
                <input
                  type="checkbox"
                  checked={advanceToAccept}
                  onChange={(e) => setAdvanceToAccept(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Avansează dosarul în „Accept plată”</span>
              </label>
            )}
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadZip}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-75 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {downloading ? <Loader2 size={14} className="animate-spin text-indigo-200" /> : <Download size={14} />}
            <span>{downloading ? (progressMsg || "Se descarcă pachetul...") : "Descarcă Pachetul ZIP (1-Click)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
