import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

export default function SettingsAiTab({
  geminiApiKeySetting = "",
  setGeminiApiKeySetting,
  onNotify,
}) {
  const handleSaveKey = () => {
    if (geminiApiKeySetting.trim()) {
      localStorage.setItem("gemini_api_key", geminiApiKeySetting.trim());
      if (onNotify) onNotify("Cheia API Gemini a fost salvată în browser!", "success");
    } else {
      localStorage.removeItem("gemini_api_key");
      if (onNotify) onNotify("Cheia API Gemini a fost ștearsă.", "info");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
          <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" /> Configurare Agent AI Multimodal
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
            Gemini 2.0 Flash
          </span>
        </div>

        <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
          Agentul AI analizează și extrage automat datele din devize Audatex/Eurotax, procese verbale de constatare, cereri de despăgubire și taloane auto.
        </p>

        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[12px] font-bold text-[var(--app-text-strong)] block mb-1">
              Cheie Google Gemini API (pentru apelare directă):
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] text-[var(--app-text-strong)] font-mono"
                value={geminiApiKeySetting}
                onChange={(e) => setGeminiApiKeySetting(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[12.5px] transition-colors"
              >
                Salvează
              </button>
            </div>
            <p className="text-[11px] text-[var(--app-muted)] mt-1">
              Cheia se salvează securizat local în browserul dumneavoastră. Sau puteți configura <code className="text-indigo-300">GEMINI_API_KEY</code> în Supabase Secrets pentru toți utilizatorii atelierului.
            </p>
          </div>

          <div className="p-3 bg-[var(--app-surface)] rounded-lg border border-[var(--app-border)] space-y-1.5 text-[12px]">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={15} /> Supabase Edge Function: analyze-document-ai
            </div>
            <p className="text-[11px] text-[var(--app-muted)]">
              Funcția backend este pregătită pentru a securiza apelurile API la nivel de atelier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
