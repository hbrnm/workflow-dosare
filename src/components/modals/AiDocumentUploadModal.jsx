import React, { useState } from "react";
import { Sparkles, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, X } from "lucide-react";
import { extractClaimDataWithGeminiDirect, extractClaimDataWithSupabaseEdge } from "../../utils/aiDocumentExtractor";
import { supabase } from "../../supabaseClient";

export default function AiDocumentUploadModal({ isOpen, onClose, onDataExtracted, initialClaimData }) {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepText, setStepText] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [editableClaim, setEditableClaim] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");

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
    setStepText("Încărcare și pregătire document...");

    try {
      let extractedData;

      // Salvăm cheia API dacă a fost introdusă manual
      if (geminiApiKey.trim()) {
        localStorage.setItem("gemini_api_key", geminiApiKey.trim());
      }

      // 1. Încercăm Supabase Edge Function prima dată (dacă Supabase este configurat)
      if (supabase && !geminiApiKey.trim()) {
        setStepText("Agentul AI analizează documentul prin Supabase Edge Function...");
        try {
          extractedData = await extractClaimDataWithSupabaseEdge(file, supabase);
        } catch (edgeErr) {
          console.warn("Edge function fallback:", edgeErr);
          // Dacă edge function nu e deployată și avem cheie locală, încercăm direct
          if (geminiApiKey.trim()) {
            setStepText("Analiză directă cu Gemini API...");
            extractedData = await extractClaimDataWithGeminiDirect(file, geminiApiKey.trim());
          } else {
            throw new Error(
              "Nu s-a putut apela Supabase Edge Function. Introduceți o cheie API Gemini în câmpul de mai jos pentru apelare directă."
            );
          }
        }
      } else {
        // Apel direct Gemini API
        setStepText("Agentul AI (Gemini 2.0 Flash) analizează documentul...");
        extractedData = await extractClaimDataWithGeminiDirect(file, geminiApiKey.trim());
      }

      setStepText("Structurare și populare date dosar...");
      setResult(extractedData);
      setEditableClaim(extractedData.claimPartial);
    } catch (err) {
      console.error(err);
      setError(err.message || "Eroare la procesarea documentului cu AI.");
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
                Agent AI - Extragere Date Document
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-normal">
                  Multimodal
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
                accept=".pdf,image/*"
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
                        Suportă fișiere PDF (Devize, PV-uri) și imagini (JPG, PNG) de orice dimensiune
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Configurare Cheie API Opțională */}
          {!result && (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Cheie Google Gemini API (Opțional pentru apelare directă din browser):</span>
                {geminiApiKey ? (
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Salvată
                  </span>
                ) : null}
              </label>
              <input
                type="password"
                placeholder="AIzaSy... (se salvează local în browser)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Progress / Loading State */}
          {loading && (
            <div className="p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="font-medium text-indigo-200">{stepText}</p>
              <p className="text-xs text-slate-400">Agentul AI extrage vehiculul, avariile, piesele și valorile financiare...</p>
            </div>
          )}

          {/* Display Errors */}
          {error && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Procesarea a eșuat</p>
                <p className="text-xs opacity-90 mt-1">{error}</p>
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
                      Date extrase cu succes de Agentul AI!
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
                  <h5 className="font-semibold text-indigo-400 border-b border-slate-800 pb-2">
                    🚗 Date Vehicul
                  </h5>
                  <div>
                    <label className="text-slate-400 block mb-1">Nr. Înmatriculare</label>
                    <input
                      type="text"
                      value={editableClaim.numarInmatriculare || ""}
                      onChange={(e) => setEditableClaim({ ...editableClaim, numarInmatriculare: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">VIN (Serie Șasiu)</label>
                    <input
                      type="text"
                      value={editableClaim.vin || ""}
                      onChange={(e) => setEditableClaim({ ...editableClaim, vin: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Marcă</label>
                      <input
                        type="text"
                        value={editableClaim.marca || ""}
                        onChange={(e) => setEditableClaim({ ...editableClaim, marca: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Model</label>
                      <input
                        type="text"
                        value={editableClaim.model || ""}
                        onChange={(e) => setEditableClaim({ ...editableClaim, model: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Dosar & Asigurător */}
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="font-semibold text-indigo-400 border-b border-slate-800 pb-2">
                    📋 Date Dosar & Asigurător
                  </h5>
                  <div>
                    <label className="text-slate-400 block mb-1">Asigurător</label>
                    <input
                      type="text"
                      value={editableClaim.asigurator || ""}
                      onChange={(e) => setEditableClaim({ ...editableClaim, asigurator: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Nr. Dosar Asigurător</label>
                    <input
                      type="text"
                      value={editableClaim.nrDosarAsigurator || ""}
                      onChange={(e) => setEditableClaim({ ...editableClaim, nrDosarAsigurator: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Nume Client / Păgubit</label>
                    <input
                      type="text"
                      value={editableClaim.client || ""}
                      onChange={(e) => setEditableClaim({ ...editableClaim, client: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                    />
                  </div>
                </div>

                {/* Date Financiare */}
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-3 md:col-span-2">
                  <h5 className="font-semibold text-indigo-400 border-b border-slate-800 pb-2">
                    💰 Valori Financiare Deviz
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Total Deviz (RON)</label>
                      <input
                        type="number"
                        value={editableClaim.valoareDevizAudatex || 0}
                        onChange={(e) => setEditableClaim({ ...editableClaim, valoareDevizAudatex: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Total Piese (RON)</label>
                      <input
                        type="number"
                        value={editableClaim.valoarePieseAudatex || 0}
                        onChange={(e) => setEditableClaim({ ...editableClaim, valoarePieseAudatex: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Manoperă Tinichigerie</label>
                      <input
                        type="number"
                        value={editableClaim.financiar?.manoperaTinichigerie || 0}
                        onChange={(e) =>
                          setEditableClaim({
                            ...editableClaim,
                            financiar: { ...editableClaim.financiar, manoperaTinichigerie: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Manoperă Vopsitorie</label>
                      <input
                        type="number"
                        value={editableClaim.financiar?.manoperaVopsitorie || 0}
                        onChange={(e) =>
                          setEditableClaim({
                            ...editableClaim,
                            financiar: { ...editableClaim.financiar, manoperaVopsitorie: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Lista Operățiuni / Piese Detectate */}
                {editableClaim.operatiuni && editableClaim.operatiuni.length > 0 && (
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2 md:col-span-2">
                    <h5 className="font-semibold text-indigo-400 border-b border-slate-800 pb-2">
                      🛠️ Operățiuni & Piese Detectate ({editableClaim.operatiuni.length})
                    </h5>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                      {editableClaim.operatiuni.map((op, idx) => (
                        <div key={op.id || idx} className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded border border-slate-800 text-xs">
                          <span className="text-slate-200 font-medium">{op.piesa}</span>
                          <div className="flex gap-2 text-[11px]">
                            {op.inl && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Înlocuit</span>}
                            {op.rev && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Vopsit</span>}
                            {op.rep && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Reparat</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Anulează
          </button>

          {!result ? (
            <button
              onClick={handleProcess}
              disabled={!file || loading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesare AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analizează cu Agentul AI
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConfirmApply}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Aplică datele în Dosar
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
