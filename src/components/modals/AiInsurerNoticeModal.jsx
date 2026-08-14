import React, { useState, useEffect } from "react";
import { X, Copy, Check, FileText, Loader2, Sparkles } from "lucide-react";
import { generateInsurerOfficialNotice } from "../../utils/aiInsurerNotice";

export default function AiInsurerNoticeModal({ isOpen, onClose, claim, onNotify }) {
  const [type, setType] = useState("supliment");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && claim) {
      handleGenerate(type);
    }
  }, [isOpen, claim]);

  if (!isOpen || !claim) return null;

  const handleGenerate = async (selectedType) => {
    setType(selectedType);
    setLoading(true);
    try {
      const text = await generateInsurerOfficialNotice(claim, selectedType);
      setContent(text);
    } catch (err) {
      if (onNotify) onNotify("Eroare la generarea adresei oficiale", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (onNotify) onNotify("Textul adresei a fost copiat în clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--app-text)]">
                Redactare Adresă Oficială Asigurător
              </h3>
              <p className="text-xs text-[var(--app-muted)]">
                Dosar #{claim.numarDosar || "FĂRĂ"} · {claim.numarInmatriculare || "FĂRĂ NR."} ({claim.asigurator || "Asigurător"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Option Tabs */}
        <div className="grid grid-cols-3 p-3 gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] text-xs font-semibold">
          <button
            onClick={() => handleGenerate("supliment")}
            className={`py-2 px-3 rounded-lg transition-all border ${
              type === "supliment"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-transparent hover:text-[var(--app-text)]"
            }`}
          >
            Supliment / Reconstatare
          </button>
          <button
            onClick={() => handleGenerate("intarziere")}
            className={`py-2 px-3 rounded-lg transition-all border ${
              type === "intarziere"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-transparent hover:text-[var(--app-text)]"
            }`}
          >
            Somație Întârziere
          </button>
          <button
            onClick={() => handleGenerate("decontare")}
            className={`py-2 px-3 rounded-lg transition-all border ${
              type === "decontare"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-transparent hover:text-[var(--app-text)]"
            }`}
          >
            Decontare Directă
          </button>
        </div>

        {/* Notice Preview Body */}
        <div className="flex-1 p-5 overflow-y-auto bg-[var(--app-surface-2)]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-[var(--app-muted)] gap-3 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Se redactează adresa oficială...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-80 p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-none scrollbar-thin"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
          <span className="text-[11px] text-[var(--app-muted)]">
            Textul poate fi editat direct înainte de copiere.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[var(--app-muted)] hover:text-[var(--app-text)]"
            >
              Închide
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !content}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copiat!" : "Copiază Textul"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
