import React, { useState, useRef } from "react";
import {
  X,
  FileCheck,
  CheckCircle2,
  Car,
  Gauge,
  ShieldCheck,
  PenTool,
  Download,
  Loader2,
  Camera,
  Trash2,
  Plus,
  ImageIcon,
} from "lucide-react";
import CanvasSignaturePad from "../common/CanvasSignaturePad";
import CarDamageVisualSelector, { CAR_PANELS } from "../common/CarDamageVisualSelector";
import { generatePvReceptiePdf } from "../../utils/generatePvReceptiePdf";
import WhatsAppButton from "../common/WhatsAppButton";
import { uploadClaimPhoto } from "../../utils/claimMedia";
import { supabase } from "../../supabaseClient";
import LiveStreamCameraModal from "../common/LiveStreamCameraModal";
import ConfirmDialog from "../common/ConfirmDialog";

const OBIECTE_DEFAULT = [
  "Certificat Înmatriculare (Talon original)",
  "Cheie de contact + rezervă",
  "Trusă medicală & Triunghi reflectorizant",
  "Roată de rezervă / Kit pană",
  "Fără alte bunuri de valoare în autovehicul",
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
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [alteObservatii, setAlteObservatii] = useState("");
  const [receptionPhotos, setReceptionPhotos] = useState([]);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [showUnsignedConfirm, setShowUnsignedConfirm] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  if (!isOpen || !claim) return null;

  const toggleObiect = (item) => {
    setObiecteSelectate((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleAddPhotos = (files) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceptionPhotos((prev) => [
          ...prev,
          {
            id: `foto_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            file,
            dataUrl: e.target.result,
            name: file.name || `receptie_${Date.now()}.jpg`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (photoId) => {
    setReceptionPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleGenerateClick = () => {
    if (!signatureDataUrl) {
      setShowUnsignedConfirm(true);
      return;
    }
    handleGenerateAndSave();
  };

  const handleGenerateAndSave = async () => {
    setGenerating(true);
    try {
      // Lista numelor elementelor selectate pe schemă
      const elementeNume = selectedPanels.map((id) => {
        const found = CAR_PANELS.find((p) => p.id === id);
        return found ? found.name : id;
      });

      const receptieData = {
        kilometraj: km || claim.kilometraj,
        combustibil: COMBUSTIBIL_OPTIONS.find((c) => c.id === combustibil)?.label || combustibil,
        obiecte: obiecteSelectate,
        elementeAvariate: elementeNume,
        avariiPreexistente: elementeNume.length > 0 ? elementeNume.join(", ") : "Fără elemente avariate marcate pe schemă",
        observatii: alteObservatii.trim() || "Preluat în vederea efectuării reparațiilor.",
        pozeCount: receptionPhotos.length,
      };

      const result = await generatePvReceptiePdf({
        claim,
        receptieData,
        signatureDataUrl,
        atelierBranding,
      });

      setGeneratedPdf(result);

      // Încărcare fotografii de recepție în dosar
      const uploadedPoze = [];
      for (const p of receptionPhotos) {
        if (p.file) {
          try {
            const uploaded = await uploadClaimPhoto(claim.id, p.file, "receptie", supabase);
            if (uploaded) uploadedPoze.push(uploaded);
          } catch (err) {
            console.warn("Could not upload reception photo:", err);
            // Fallback la salvare locală
            uploadedPoze.push({
              id: p.id,
              nume: p.name,
              categoria: "receptie",
              dataUrl: p.dataUrl,
              data: new Date().toISOString(),
            });
          }
        }
      }

      // Actualizăm dosarul (adusaFizic = true, kilometraj, documente, poze)
      if (onPatchClaim) {
        const existingDocs = Array.isArray(claim.documente) ? claim.documente : [];
        const existingPoze = Array.isArray(claim.poze) ? claim.poze : [];

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
          poze: [...existingPoze, ...uploadedPoze],
        });
      }

      onNotify?.("Procesul-Verbal și fotografiile de recepție au fost salvate în dosar!", "success");
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl text-slate-100 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Recepție Auto &amp; Proces-Verbal
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
                  Documentul <strong>{generatedPdf.fileName}</strong> a fost semnat, iar {receptionPhotos.length} fotografii au fost atașate la dosar.
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
                    customText={`Bună ziua! Am preluat autovehiculul dvs. ${claim.numarInmatriculare} în service. Procesul verbal de predare-primire și fotografiile de intrare au fost înregistrate. Puteți urmări stadiul lucrărilor aici: `}
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

              {/* 2. Schema Grafică Interactivă de Avarii Vehicul */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Car size={14} className="text-rose-400" />
                  2. Schemă Grafică Avarii &amp; Caroserie
                </h4>
                <CarDamageVisualSelector
                  selectedPanels={selectedPanels}
                  onChange={setSelectedPanels}
                />
                <input
                  type="text"
                  placeholder="Alte mențiuni scrise sau detalii avarii..."
                  value={alteObservatii}
                  onChange={(e) => setAlteObservatii(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 mt-2"
                />
              </div>

              {/* 3. Fotografii Recepție (Cameră / Fișiere) */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                    <Camera size={14} className="text-sky-400" />
                    3. Fotografii de Recepție (Intrare Service)
                    {receptionPhotos.length > 0 && (
                      <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                        {receptionPhotos.length} poze
                      </span>
                    )}
                  </h4>

                  <div className="flex items-center gap-2">
                    {/* Buton Deschidere Cameră Live */}
                    <button
                      type="button"
                      onClick={() => setShowLiveCamera(true)}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Camera size={12} /> Fă Poză
                    </button>

                    {/* Buton Galerie / Fișiere */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddPhotos(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Din Galerie
                    </button>
                  </div>
                </div>

                {receptionPhotos.length === 0 ? (
                  <div className="py-4 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-[11px] flex flex-col items-center gap-1">
                    <ImageIcon size={18} className="opacity-40" />
                    <span>Fă fotografii cu mașina la primire (VIN, avarii, unghiuri generale).</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                    {receptionPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-square"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Șterge poza"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
                          title="Șterge poza"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Obiecte & Documente Preluate */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  4. Documente &amp; Obiecte Preluate în Custodie
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

              {/* 5. Pad de Semnătură Digitală Client */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <PenTool size={14} className="text-indigo-400" />
                  5. Semnătură Client pe Ecran
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
              onClick={handleGenerateClick}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
              <span>Generează &amp; Salvează PV</span>
            </button>
          )}
        </div>
      </div>

      {showUnsignedConfirm && (
        <ConfirmDialog
          open={showUnsignedConfirm}
          title="Generare PV fără Semnătură"
          message="Clientul nu a semnat pe ecran. Doriți să continuați generarea Procesului-Verbal de Recepție fără semnătură digitală?"
          confirmLabel="Continuă fără semnătură"
          cancelLabel="Înapoi la semnare"
          danger={false}
          onConfirm={() => {
            setShowUnsignedConfirm(false);
            handleGenerateAndSave();
          }}
          onCancel={() => setShowUnsignedConfirm(false)}
        />
      )}

      {showLiveCamera && (
        <LiveStreamCameraModal
          initialCategorie="receptie"
          onSavePhoto={(files) => handleAddPhotos(files)}
          onClose={() => setShowLiveCamera(false)}
        />
      )}
    </div>
  );
}
