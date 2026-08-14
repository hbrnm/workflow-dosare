import React, { useState } from "react";
import {
  X,
  FileCheck,
  CheckCircle2,
  Car,
  Gauge,
  Fuel,
  ShieldCheck,
  PenTool,
  Download,
  Share2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import CanvasSignaturePad from "../common/CanvasSignaturePad";
import { generatePvReceptiePdf } from "../../utils/generatePvReceptiePdf";
import WhatsAppButton from "../common/WhatsAppButton";
import { uid } from "../../utils/dateUtils";

const OBIECTE_DEFAULT = [
  "Certificat Înmatriculare (Talon original)",
  "Cheie de contact + rezervă",
  "Trusă medicală & Triunghi reflectorizant",
  "Roată de rezervă / Kit pană",
  "Fără alte bunuri de valoare în autovehicul",
];

const AVARII_DEFAULT = [
  "Zgârieturi bară față",
  "Zgârieturi bară spate",
  "Uși laterale cu micro-ciupituri",
  "Jante ușor atinse de bordură",
  "Parbriz cu ciupituri de criblură",
];

const COMBUSTIBIL_OPTIONS = [
  { id: "0/4", label: "Rezervă (0/4)" },
  { id: "1/4", label: "1/4 (25%)" },
  { id: "2/4", label: "1/2 (50%)" },
  { id: "3/4", label: "3/4 (75%)" },
  { id: "4/4", label: "Plin (4/4)" },
];

export default function ReceptieAutoModal({
  isOpen,
  onClose,
  claim,
  onPatchClaim,
  onNotify,
  atelierBranding = {},
}) {
  const [km, setKm] = useState(() => claim?.kilometraj || "");
  const [combustibil, setCombustibil] = useState("2/4");
  const [obiecteSelectate, setObiecteSelectate] = useState([
    "Certificat Înmatriculare (Talon original)",
    "Fără alte bunuri de valoare în autovehicul",
  ]);
  const [avariiSelectate, setAvariiSelectate] = useState([]);
  const [alteObservatii, setAlteObservatii] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  if (!isOpen || !claim) return null;

  const toggleObiect = (item) => {
    setObiecteSelectate((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAvarie = (item) => {
    setAvariiSelectate((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleGenerateAndSave = async () => {
    setGenerating(true);
    try {
      const receptieData = {
        kilometraj: km || claim.kilometraj,
        combustibil: COMBUSTIBIL_OPTIONS.find((c) => c.id === combustibil)?.label || combustibil,
        obiecte: obiecteSelectate,
        avariiPreexistente: [
          ...avariiSelectate,
          alteObservatii.trim() ? alteObservatii.trim() : null,
        ]
          .filter(Boolean)
          .join("; ") || "Fără avarii exterioare suplimentare declarate",
        observatii: alteObservatii.trim() || "Preluat în vederea efectuării reparațiilor.",
      };

      const result = await generatePvReceptiePdf({
        claim,
        receptieData,
        signatureDataUrl,
        atelierBranding,
      });

      setGeneratedPdf(result);

      // Actualizăm dosarul (adusaFizic = true, kilometraj, documente)
      if (onPatchClaim) {
        const existingDocs = Array.isArray(claim.documente) ? claim.documente : [];
        const newDocItem = {
          id: `pv_receptie_${Date.now()}`,
          nume: result.fileName,
          categorie: "receptie",
          dataUrl: result.dataUrl,
          adaugatLa: new Date().toISOString(),
        };

        await onPatchClaim(claim.id, {
          adusaFizic: true,
          kilometraj: Number(km) || claim.kilometraj,
          documente: [...existingDocs, newDocItem],
        });
      }

      onNotify?.("Procesul-Verbal de Recepție a fost generat și salvat în dosar!", "success");
    } catch (err) {
      console.error(err);
      onNotify?.(err.message || "Eroare la generarea Procesului-Verbal.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPdf) return;
    const a = document.createElement("a");
    a.href = generatedPdf.dataUrl;
    a.download = generatedPdf.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Recepție Auto &amp; Semnătură Digitală
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {claim.numarInmatriculare || "FĂRĂ NR."} · {claim.marcaModel || "Model"} · {claim.client || "Client"}
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

        {/* Corp Formular */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs scrollbar-thin">
          {generatedPdf ? (
            /* Ecran de Confirmare & Descărcare PV */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="font-bold text-base text-emerald-300">
                  Proces-Verbal Generat cu Succes!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Documentul <strong>{generatedPdf.fileName}</strong> a fost semnat și atașat la dosar.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Download size={14} /> Descarcă PDF
                </button>

                {claim.telefonClient && (
                  <WhatsAppButton
                    phone={claim.telefonClient}
                    claim={claim}
                    customText={`Bună ziua! Am preluat autovehiculul dvs. ${claim.numarInmatriculare} în service. Procesul verbal de predare-primire este înregistrat. Puteți urmări stadiul lucrărilor aici: `}
                    label="Trimite Confirmare WhatsApp"
                    size={14}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 1. Date Tehnice: KM & Combustibil */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Gauge size={14} className="text-indigo-400" />
                  1. Kilometraj &amp; Nivel Combustibil
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Kilometraj la Intrare:
                    </label>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                      <Gauge size={14} className="text-slate-500" />
                      <input
                        type="number"
                        placeholder="Ex: 145200"
                        value={km}
                        onChange={(e) => setKm(e.target.value)}
                        className="bg-transparent text-slate-100 text-xs font-mono font-bold w-full focus:outline-none"
                      />
                      <span className="text-slate-500 text-[10px]">km</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Nivel Combustibil în Rezervor:
                    </label>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1">
                      {COMBUSTIBIL_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCombustibil(opt.id)}
                          className={`flex-1 py-1 px-1 rounded text-[10.5px] font-bold transition-all text-center ${
                            combustibil === opt.id
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {opt.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Obiecte & Documente Preluate */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  2. Documente &amp; Obiecte Preluate în Custodie
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {OBIECTE_DEFAULT.map((item) => {
                    const isSelected = obiecteSelectate.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleObiect(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Avarii Preexistente / Zgârieturi */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Car size={14} className="text-amber-400" />
                  3. Avarii / Zgârieturi Preexistente (Opțional)
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {AVARII_DEFAULT.map((item) => {
                    const isSelected = avariiSelectate.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleAvarie(item)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "} {item}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Alte mențiuni sau avarii observate..."
                  value={alteObservatii}
                  onChange={(e) => setAlteObservatii(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 mt-1"
                />
              </div>

              {/* 4. Pad de Semnătură Digitală Client */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <PenTool size={14} className="text-indigo-400" />
                  4. Semnătură Client pe Ecran
                </h4>
                <p className="text-[10px] text-slate-400">
                  Clientul confirmă predarea autovehiculului și este de acord cu termenii de custodie &amp; GDPR.
                </p>
                <CanvasSignaturePad
                  onSignatureChange={setSignatureDataUrl}
                  strokeColor="#38BDF8"
                  lineWidth={2.5}
                  height={130}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            Închide
          </button>

          {!generatedPdf && (
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateAndSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
              <span>Generează &amp; Salvează PV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
