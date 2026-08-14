import React, { useState } from "react";
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, X, Cpu, Zap, Globe } from "lucide-react";
import { extractClaimDataHybrid } from "../../utils/aiDocumentExtractor";
import { supabase } from "../../supabaseClient";

export default function AiDocumentUploadModal({ isOpen, onClose, onDataExtracted, initialClaimData }) {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [editableClaim, setEditableClaim] = useState(null);
  const [engine, setEngine] = useState("auto"); // "auto" | "local" | "gemini" | "openai"
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("gemini_api_key") || localStorage.getItem("openai_api_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setStepText("Analiză și extragere date din document...");

    const effectiveKey = (apiKey || "").trim();

    try {
      if (effectiveKey) {
        if (effectiveKey.startsWith("sk-")) {
          localStorage.setItem("openai_api_key", effectiveKey);
        } else {
          localStorage.setItem("gemini_api_key", effectiveKey);
        }
      }

      if (engine === "local") {
        setStepText("Procesare cu motorul local specializat Audatex / DAT...");
      } else if (engine === "openai" || effectiveKey.startsWith("sk-")) {
        setStepText("Procesare multimodală cu OpenAI GPT-4o...");
      } else {
        setStepText("Procesare inteligentă (Parser Local + Gemini AI)...");
      }

      const extractedData = await extractClaimDataHybrid(file, {
        apiKey: effectiveKey,
        engine,
        supabaseClient: supabase,
      });

      setStepText("Structurare și populare date dosar...");
      setResult(extractedData);
      setEditableClaim(extractedData.claimPartial);
    } catch (err) {
      console.error(err);
      setError(err.message || "Eroare la procesarea documentului.");
    } finally {
      setLoading(false);
      setStepText("");
    }
  };

  const handleConfirmApply = () => {
    if (editableClaim && onDataExtracted) {
      onDataExtracted(editableClaim, result?.tipDocument);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl text-slate-100 overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                Agent Extragere Date Documente
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">
                  Multi-Motor
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Încarcă un deviz Audatex/Eurotax, proces verbal sau talon pentru a completa automat dosarul
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Selector Motor Extragere */}
          {!result && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Selectează Motorul de Procesare:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setEngine("auto")}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all ${
                    engine === "auto"
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>Automat (Hibrid)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("local")}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all ${
                    engine === "local"
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-200 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Parser Audatex (Offline)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("gemini")}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all ${
                    engine === "gemini"
                      ? "bg-sky-600/20 border-sky-500 text-sky-200 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Google Gemini 2.0</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("openai")}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center justify-center gap-1 text-center transition-all ${
                    engine === "openai"
                      ? "bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>OpenAI GPT-4o</span>
                </button>
              </div>
            </div>
          )}

          {/* File Upload Zone */}
          {!result && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-500/10"
                  : file
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-700 hover:border-slate-600 bg-slate-950/40"
              }`}
            >
              <input
                type="file"
                id="ai-doc-upload"
                className="hidden"
                accept=".pdf,.xml,.xlsx,.csv,image/*"
                onChange={handleFileChange}
              />
              <label htmlFor="ai-doc-upload" className="cursor-pointer block">
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-300">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Click sau drag pentru a înlocui
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">
                        Trage fișierul aici sau <span className="text-indigo-400">răsfoiește</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Suportă PDF (Devize Audatex/DAT/Eurotax), XML, Excel sau imagini (taloane, PV-uri, facturi)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Configurare Cheie API (Dacă motorul selectat o cere sau pentru AI) */}
          {!result && engine !== "local" && (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <label htmlFor="api-key-input">
                  Cheie API ({engine === "openai" ? "OpenAI sk-..." : "Google Gemini AIzaSy..."}):
                </label>
                {engine === "gemini" || engine === "auto" ? (
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline text-[11px] font-normal"
                  >
                    Obține cheie gratuită Gemini &rarr;
                  </a>
                ) : (
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline text-[11px] font-normal"
                  >
                    Obține cheie OpenAI &rarr;
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="api-key-input"
                  type="password"
                  placeholder={
                    engine === "openai"
                      ? "sk-proj-... (salvată local)"
                      : "AIzaSy... (sau lăsați gol pentru Parserul Local)"
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                {apiKey ? (
                  <span className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Salvată
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* Progress / Loading State */}
          {loading && (
            <div className="p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="font-medium text-indigo-200">{stepText}</p>
              <p className="text-xs text-slate-400">Extragem automat vehiculul, piesele, manopera și valorile devizului...</p>
            </div>
          )}

          {/* Display Errors */}
          {error && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Procesarea a eșuat</p>
                <p className="text-xs opacity-90 mt-1">{error}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Sfat: Puteți comuta motorul pe <strong>„Parser Audatex (Offline)”</strong> pentru procesare instantă directă a PDF-urilor fără cheie API.
                </p>
              </div>
            </div>
          )}

          {/* Results Preview & Confirmation Screen */}
          {result && editableClaim && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-emerald-300 text-sm">
                      Date extrase cu succes!
                    </h4>
                    <p className="text-xs text-emerald-400/80">
                      Document identificat: <strong>{result.tipDocument}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResult(null);
                    setEditableClaim(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Rescanează alt fișier
                </button>
              </div>

              {/* Formular de revizuire date extrase */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Date Vehicul */}
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="font-medium text-slate-300 border-b border-slate-800 pb-2">
                    Date Identificare Vehicul & Client
                  </h5>
                  <div className="space-y-2">
                    <div>
                      <label className="text-slate-400 text-[11px]">Nr. Înmatriculare:</label>
                      <input
                        type="text"
                        value={editableClaim.numarInmatriculare || ""}
                        onChange={(e) =>
                          setEditableClaim({ ...editableClaim, numarInmatriculare: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[11px]">Serie Șasiu (VIN):</label>
                      <input
                        type="text"
                        value={editableClaim.vin || ""}
                        onChange={(e) =>
                          setEditableClaim({ ...editableClaim, vin: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px]">Marcă:</label>
                        <input
                          type="text"
                          value={editableClaim.marca || ""}
                          onChange={(e) =>
                            setEditableClaim({ ...editableClaim, marca: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px]">Model:</label>
                        <input
                          type="text"
                          value={editableClaim.model || ""}
                          onChange={(e) =>
                            setEditableClaim({ ...editableClaim, model: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-[11px]">Client / Proprietar:</label>
                      <input
                        type="text"
                        value={editableClaim.client || ""}
                        onChange={(e) =>
                          setEditableClaim({ ...editableClaim, client: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Dosar & Financiare */}
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="font-medium text-slate-300 border-b border-slate-800 pb-2">
                    Date Dosar & Valori Deviz
                  </h5>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px]">Nr. Dosar Service:</label>
                        <input
                          type="text"
                          value={editableClaim.numarDosar || ""}
                          onChange={(e) =>
                            setEditableClaim({ ...editableClaim, numarDosar: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px]">Asigurător:</label>
                        <input
                          type="text"
                          value={editableClaim.asigurator || ""}
                          onChange={(e) =>
                            setEditableClaim({ ...editableClaim, asigurator: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px]">Total Deviz fără TVA (RON):</label>
                        <input
                          type="number"
                          value={editableClaim.valoareDevizAudatex || ""}
                          onChange={(e) =>
                            setEditableClaim({
                              ...editableClaim,
                              valoareDevizAudatex: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px]">Total Piese fără TVA (RON):</label>
                        <input
                          type="number"
                          value={editableClaim.valoarePieseAudatex || ""}
                          onChange={(e) =>
                            setEditableClaim({
                              ...editableClaim,
                              valoarePieseAudatex: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-[11px]">Avarii / Descriere:</label>
                      <textarea
                        rows={2}
                        value={editableClaim.ceEsteDeReparat || ""}
                        onChange={(e) =>
                          setEditableClaim({ ...editableClaim, ceEsteDeReparat: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Linii de Operațiuni & Piese Extrase */}
              {Array.isArray(editableClaim.operatiuni) && editableClaim.operatiuni.length > 0 && (
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-medium text-slate-300 text-xs flex items-center justify-between">
                    <span>Operațiuni & Piese de Schimb ({editableClaim.operatiuni.length} identificate)</span>
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                    {editableClaim.operatiuni.map((op, idx) => (
                      <div
                        key={op.id || idx}
                        className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs"
                      >
                        <span className="text-slate-200">{op.piesa}</span>
                        <div className="flex gap-1.5">
                          {op.inl && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                              Înlocuire
                            </span>
                          )}
                          {op.rev && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                              Vopsitorie
                            </span>
                          )}
                          {op.rep && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                              Reparație
                            </span>
                          )}
                          {op.uni && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 text-[10px]">
                              Demontare
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Anulează
          </button>

          <div className="flex items-center gap-3">
            {!result ? (
              <button
                type="button"
                disabled={!file || loading}
                onClick={handleProcess}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {engine === "local" ? "Procesează cu Parserul Local" : "Analizează Documentul"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aplică Datele în Dosar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
