import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  User,
  Phone,
  DollarSign,
  Calendar,
  Trash2,
  Edit3,
  X,
  LogOut,
  Loader2,
  Eye,
  FileCheck
} from "lucide-react";

// ---------------------------------------------------------------------------
// 1. Configurare Supabase Client
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Statusurile standard din fluxul de daune
const STATUSES = [
  "Intrare Service",
  "Așteptare Reconstatare",
  "Comandă Piese",
  "Tinichigerie",
  "Vopsitorie",
  "Montaj",
  "Gata de Livrare",
  "Facturat"
];

// ---------------------------------------------------------------------------
// 2. Utilitare & Mapare Date (camelCase <-> snake_case)
// ---------------------------------------------------------------------------
const toDb = (claim, userEmail) => ({
  license_plate: claim.licensePlate?.toUpperCase() || "",
  car_model: claim.carModel || "",
  vin: claim.vin?.toUpperCase() || "",
  client_name: claim.clientName || "",
  client_phone: claim.clientPhone || "",
  insurance_company: claim.insuranceCompany || "",
  claim_number: claim.claimNumber || "",
  status: claim.status || "Intrare Service",
  entry_date: claim.entryDate || new Date().toISOString().split("T")[0],
  estimated_completion: claim.estimatedCompletion || null,
  labor_cost: parseFloat(claim.laborCost) || 0,
  parts_cost_audatex: parseFloat(claim.partsCostAudatex) || 0,
  parts_cost_buy: parseFloat(claim.partsCostBuy) || 0,
  description: claim.description || "",
  replacement_car: claim.replacementCar || false,
  replacement_car_plate: claim.replacementCarPlate || "",
  created_by_email: claim.createdByEmail || userEmail || "",
  poze_urls: claim.pozeUrls || [],
  documente_urls: claim.documenteUrls || []
});

const fromDb = (dbClaim) => ({
  id: dbClaim.id,
  licensePlate: dbClaim.license_plate || "",
  carModel: dbClaim.car_model || "",
  vin: dbClaim.vin || "",
  clientName: dbClaim.client_name || "",
  clientPhone: dbClaim.client_phone || "",
  insuranceCompany: dbClaim.insurance_company || "",
  claimNumber: dbClaim.claim_number || "",
  status: dbClaim.status || "Intrare Service",
  entryDate: dbClaim.entry_date || "",
  estimatedCompletion: dbClaim.estimated_completion || "",
  laborCost: dbClaim.labor_cost || 0,
  partsCostAudatex: dbClaim.parts_cost_audatex || 0,
  partsCostBuy: dbClaim.parts_cost_buy || 0,
  description: dbClaim.description || "",
  replacementCar: dbClaim.replacement_car || false,
  replacementCarPlate: dbClaim.replacement_car_plate || "",
  createdByEmail: dbClaim.created_by_email || "",
  pozeUrls: dbClaim.poze_urls || [],
  documenteUrls: dbClaim.documente_urls || [],
  createdAt: dbClaim.created_at
});

const daysBetween = (startDate, endDate = new Date()) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ---------------------------------------------------------------------------
// 3. Generare PDF cu Suport UTF-8 (Diacritice)
// ---------------------------------------------------------------------------
async function loadRobotoFont(doc) {
  try {
    const response = await fetch("/fonts/Roboto-Regular.ttf");
    if (!response.ok) return;
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(",")[1];
        doc.addFileToVFS("Roboto-Regular.ttf", base64data);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Fontul UTF-8 nu a putut fi încărcat. Se folosește fontul implicit.", err);
  }
}

export async function generateProcesVerbal(claim) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await loadRobotoFont(doc);

  doc.setFontSize(16);
  doc.text("PROCES VERBAL DE RECEPȚIE ȘI PREDARE", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, 196, 28, { align: "right" });
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(12);
  doc.text("1. Informații Dosar & Vehicul", 14, 42);
  doc.setFontSize(10);
  doc.text(`Număr Înmatriculare: ${claim.licensePlate || "N/A"}`, 14, 50);
  doc.text(`Marcă / Model: ${claim.carModel || "N/A"}`, 14, 56);
  doc.text(`Serie Șasiu (VIN): ${claim.vin || "N/A"}`, 14, 62);
  doc.text(`Asigurător / Dosar: ${claim.insuranceCompany || "N/A"} / ${claim.claimNumber || "N/A"}`, 14, 68);

  doc.setFontSize(12);
  doc.text("2. Date Client", 14, 80);
  doc.setFontSize(10);
  doc.text(`Nume Client: ${claim.clientName || "N/A"}`, 14, 88);
  doc.text(`Telefon: ${claim.clientPhone || "N/A"}`, 14, 94);

  doc.setFontSize(12);
  doc.text("3. Observații / Avarii la Intrarea în Service", 14, 106);
  doc.setFontSize(10);
  const observatii = claim.description || "Fără observații speciale menționate.";
  const lines = doc.splitTextToSize(observatii, 180);
  doc.text(lines, 14, 114);

  const ySign = 230;
  doc.setFontSize(10);
  doc.text("Reprezentant Service (Recepție):", 14, ySign);
  doc.text("Client / Delegat:", 130, ySign);
  doc.setLineWidth(0.2);
  doc.line(14, ySign + 20, 80, ySign + 20);
  doc.line(130, ySign + 20, 196, ySign + 20);

  doc.save(`Proces_Verbal_${claim.licensePlate || "dosar"}.pdf`);
}

// ---------------------------------------------------------------------------
// 4. Componenta Modal Dosar (Adăugare / Editare)
// ---------------------------------------------------------------------------
function ClaimModal({ claim, onClose, onSave, onDelete, userEmail, allClaims }) {
  const isEdit = Boolean(claim?.id);
  const readOnly = isEdit && claim.createdByEmail && claim.createdByEmail !== userEmail;

  const [formData, setFormData] = useState(
    claim || {
      licensePlate: "",
      carModel: "",
      vin: "",
      clientName: "",
      clientPhone: "",
      insuranceCompany: "",
      claimNumber: "",
      status: "Intrare Service",
      entryDate: new Date().toISOString().split("T")[0],
      estimatedCompletion: "",
      laborCost: 0,
      partsCostAudatex: 0,
      partsCostBuy: 0,
      description: "",
      replacementCar: false,
      replacementCarPlate: "",
      pozeUrls: [],
      documenteUrls: []
    }
  );

  const [uploading, setUploading] = useState(false);

  // Verificare istoricul vehiculului
  const previousVisits = useMemo(() => {
    if (!formData.licensePlate && !formData.vin) return [];
    return allClaims.filter(
      (c) =>
        c.id !== formData.id &&
        ((formData.licensePlate && c.licensePlate.toLowerCase() === formData.licensePlate.toLowerCase()) ||
          (formData.vin && c.vin.toLowerCase() === formData.vin.toLowerCase()))
    );
  }, [formData.licensePlate, formData.vin, formData.id, allClaims]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleFileUpload = async (e, bucket, field) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);

    try {
      const newUrls = [];
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${formData.licensePlate || "general"}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        newUrls.push(data.publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), ...newUrls]
      }));
    } catch (err) {
      alert("Eroare la încărcarea fișierului: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validare alertă Facturat fără sume
    if (formData.status === "Facturat" && Number(formData.laborCost) === 0 && Number(formData.partsCostAudatex) === 0) {
      if (!window.confirm("Atenție: Treci dosarul în statusul 'Facturat' cu valoare 0 pe manoperă și piese. Continui?")) {
        return;
      }
    }

    // Validare duplicat activ pe număr de înmatriculare
    if (!isEdit) {
      const activeDuplicate = allClaims.find(
        (c) =>
          c.licensePlate.toLowerCase() === formData.licensePlate.toLowerCase() &&
          c.status !== "Facturat"
      );
      if (activeDuplicate) {
        if (!window.confirm(`Există deja un dosar activ pentru ${formData.licensePlate.toUpperCase()} (Status: ${activeDuplicate.status}). Dorești să creezi altul?`)) {
          return;
        }
      }
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-[#F7F4EC] border-b border-[#DAD4C6] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wrench className="text-[#C98A2B]" size={20} />
            <h2 className="text-lg font-bold text-[#23282E]">
              {isEdit ? `Dosar: ${formData.licensePlate}` : "Dosar Daună Nou"}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#6B6558] hover:text-[#23282E]">
            <X size={20} />
          </button>
        </div>

        {/* Corp Formular */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#23282E]">
          {readOnly && (
            <div className="p-3 bg-[#C98A2B]/10 border border-[#C98A2B] text-[#C98A2B] rounded-lg">
              Atenție: Acest dosar a fost creat de <strong>{formData.createdByEmail}</strong>. Îl poți doar vizualiza.
            </div>
          )}

          {/* Alertă Istoric Vehicul */}
          {previousVisits.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
              <strong>Istoric identificat:</strong> Acest vehicul mai are {previousVisits.length} dosar(e) înregistrate în sistem.
            </div>
          )}

          {/* Secțiunea 1: Date Vehicul & Client */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Nr. Înmatriculare *</label>
              <input
                type="text"
                name="licensePlate"
                required
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166] uppercase"
                value={formData.licensePlate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Marcă / Model</label>
              <input
                type="text"
                name="carModel"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.carModel}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Serie Șasiu (VIN)</label>
              <input
                type="text"
                name="vin"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166] uppercase"
                value={formData.vin}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Nume Client</label>
              <input
                type="text"
                name="clientName"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.clientName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Telefon Client</label>
              <input
                type="text"
                name="clientPhone"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.clientPhone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Asigurător & Nr. Dosar</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="insuranceCompany"
                  placeholder="Asigurător"
                  disabled={readOnly}
                  className="w-1/2 p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                  value={formData.insuranceCompany}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="claimNumber"
                  placeholder="Nr. Dosar"
                  disabled={readOnly}
                  className="w-1/2 p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                  value={formData.claimNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <hr className="border-[#DAD4C6]" />

          {/* Secțiunea 2: Status & Estimări Financiar-Temporale */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Status Curent</label>
              <select
                name="status"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.status}
                onChange={handleChange}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Data Intrare</label>
              <input
                type="date"
                name="entryDate"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.entryDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Estimare Finalizare</label>
              <input
                type="date"
                name="estimatedCompletion"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.estimatedCompletion}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Manoperă (RON)</label>
              <input
                type="number"
                name="laborCost"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.laborCost}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Piese Audatex (RON)</label>
              <input
                type="number"
                name="partsCostAudatex"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.partsCostAudatex}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6558] mb-1">Piese Achiziție/Cost (RON)</label>
              <input
                type="number"
                name="partsCostBuy"
                disabled={readOnly}
                className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
                value={formData.partsCostBuy}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Mașină la Schimb */}
          <div className="flex items-center gap-4 bg-[#F7F4EC] p-3 rounded-lg">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                name="replacementCar"
                disabled={readOnly}
                checked={formData.replacementCar}
                onChange={handleChange}
                className="rounded border-[#DAD4C6] text-[#3B5166]"
              />
              Oferit Mașină la Schimb
            </label>
            {formData.replacementCar && (
              <input
                type="text"
                name="replacementCarPlate"
                placeholder="Nr. Înmatriculare Mașină Schimb"
                disabled={readOnly}
                className="p-1.5 border border-[#DAD4C6] rounded text-xs uppercase"
                value={formData.replacementCarPlate}
                onChange={handleChange}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B6558] mb-1">Observații / Avarii</label>
            <textarea
              name="description"
              rows={3}
              disabled={readOnly}
              className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Încărcare Fișiere */}
          {!readOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F7F4EC] p-4 rounded-lg">
              <div>
                <label className="block text-xs font-semibold text-[#6B6558] mb-1">Adaugă Poze Avarii</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "poze-dosare", "pozeUrls")}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B6558] mb-1">Adaugă Documente (PDF/Doc)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, "documente-dosare", "documenteUrls")}
                  className="text-xs"
                />
              </div>
              {uploading && <div className="col-span-2 text-xs text-[#C98A2B]">Se încarcă fișierele...</div>}
            </div>
          )}

          {/* Footer Butoane Acțiune */}
          <div className="pt-4 flex justify-between items-center border-t border-[#DAD4C6]">
            <div>
              {isEdit && !readOnly && (
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs flex items-center gap-1"
                >
                  <Trash2 size={14} /> Șterge Dosar
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => generateProcesVerbal(formData)}
                className="px-3 py-2 bg-gray-200 text-[#23282E] rounded hover:bg-gray-300 text-xs flex items-center gap-1"
              >
                <FileCheck size={14} /> Proces Verbal PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#DAD4C6] rounded text-xs hover:bg-gray-50"
              >
                Anulează
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B5166] text-white rounded text-xs hover:bg-[#2C3E4C] font-semibold"
                >
                  Salvează Modificările
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Componenta Autentificare (Login)
// ---------------------------------------------------------------------------
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email sau parolă incorectă."
          : authError.message
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] flex items-center justify-center p-4">
      <div className="bg-white border border-[#DAD4C6] p-6 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center gap-2 mb-6 text-[#23282E]">
          <Wrench className="text-[#C98A2B]" size={24} />
          <h1 className="text-xl font-bold">Gestiune Daune Service</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#6B6558] mb-1">Email Coleg</label>
            <input
              type="email"
              required
              className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coleg@service.ro"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B6558] mb-1">Parolă</label>
            <input
              type="password"
              required
              className="w-full p-2 border border-[#DAD4C6] rounded focus:ring-1 focus:ring-[#3B5166]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#3B5166] text-white rounded font-semibold hover:bg-[#2C3E4C] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Autentificare"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Componenta Principală Tablou de Comandă (App)
// ---------------------------------------------------------------------------
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Toate");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verificare Autentificare Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Incarcare Dosare din Supabase
  const fetchClaims = async () => {
    if (!session) return;
    const { data, error } = await supabase.from("dosare").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Eroare încărcare dosare:", error);
    } else {
      setClaims(data.map(fromDb));
    }
  };

  useEffect(() => {
    if (session) fetchClaims();
  }, [session]);

  const handleSaveClaim = async (formData) => {
    const dbPayload = toDb(formData, session.user.email);

    if (formData.id) {
      const { error } = await supabase.from("dosare").update(dbPayload).eq("id", formData.id);
      if (error) alert("Eroare la actualizare: " + error.message);
    } else {
      const { error } = await supabase.from("dosare").insert([dbPayload]);
      if (error) alert("Eroare la salvare: " + error.message);
    }

    setIsModalOpen(false);
    setSelectedClaim(null);
    fetchClaims();
  };

  const handleDeleteClaim = async (id) => {
    if (!window.confirm("Sigur dorești să ștergi acest dosar?")) return;
    const { error } = await supabase.from("dosare").delete().eq("id", id);
    if (error) alert("Eroare la ștergere: " + error.message);
    else {
      setIsModalOpen(false);
      setSelectedClaim(null);
      fetchClaims();
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch =
        claim.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
        claim.clientName.toLowerCase().includes(search.toLowerCase()) ||
        claim.carModel.toLowerCase().includes(search.toLowerCase()) ||
        claim.claimNumber.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "Toate" || claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, search, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex items-center justify-center text-[#3B5166]">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#23282E] flex flex-col font-sans">
      {/* Navbar Sus */}
      <header className="bg-white border-b border-[#DAD4C6] px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <Wrench className="text-[#C98A2B]" size={28} />
          <h1 className="text-xl font-bold tracking-tight">Gestiune Daune Service</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#6B6558]">Conectat ca: <strong>{session.user.email}</strong></span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 border border-[#DAD4C6] rounded hover:bg-gray-100 flex items-center gap-1.5"
          >
            <LogOut size={14} /> Deconectare
          </button>
        </div>
      </header>

      {/* Continut Principal */}
      <main className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Controale Căutare & Filtrare */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-[#DAD4C6] shadow-sm">
          <div className="flex flex-1 items-center gap-2 border border-[#DAD4C6] px-3 py-2 rounded bg-[#F7F4EC]">
            <Search size={16} className="text-[#6B6558]" />
            <input
              type="text"
              placeholder="Caută nr. auto, client, model sau dosar..."
              className="bg-transparent border-none outline-none text-xs w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#6B6558]" />
            <select
              className="p-2 border border-[#DAD4C6] rounded text-xs bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Toate">Toate Statusurile</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSelectedClaim(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#3B5166] text-white rounded text-xs hover:bg-[#2C3E4C] font-semibold flex items-center gap-1.5"
            >
              <Plus size={16} /> Dosar Nou
            </button>
          </div>
        </div>

        {/* Tabel / Lista Dosare */}
        <div className="bg-white border border-[#DAD4C6] rounded-xl shadow-sm overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F4EC] border-b border-[#DAD4C6] text-[#6B6558] font-semibold">
                <tr>
                  <th className="p-3">Nr. Auto / Model</th>
                  <th className="p-3">Client / Telefon</th>
                  <th className="p-3">Asigurător / Dosar</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Zile în Service</th>
                  <th className="p-3">Marjă Piese</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DAD4C6]">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#6B6558]">
                      Nu s-au găsit dosare corespunzătoare căutării.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => {
                    const days = daysBetween(claim.entryDate);
                    const isLate = days > 14 && claim.status !== "Facturat";
                    const marjaPiese = (claim.partsCostAudatex || 0) - (claim.partsCostBuy || 0);

                    return (
                      <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold">
                          <div className="text-[#23282E] uppercase">{claim.licensePlate}</div>
                          <div className="text-[10px] text-[#6B6558] font-normal">{claim.carModel}</div>
                        </td>
                        <td className="p-3">
                          <div>{claim.clientName || "-"}</div>
                          <div className="text-[10px] text-[#6B6558]">{claim.clientPhone}</div>
                        </td>
                        <td className="p-3">
                          <div>{claim.insuranceCompany || "-"}</div>
                          <div className="text-[10px] text-[#6B6558]">{claim.claimNumber}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#F7F4EC] border border-[#DAD4C6] text-[#3B5166]">
                            {claim.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1 font-medium ${isLate ? "text-red-600" : "text-[#23282E]"}`}>
                            <Clock size={12} /> {days} zile {isLate && <AlertTriangle size={12} />}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className={marjaPiese >= 0 ? "text-green-700" : "text-red-600"}>
                            {marjaPiese.toFixed(0)} RON
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded text-[#3B5166]"
                          >
                            <Edit3 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Dosar */}
      {isModalOpen && (
        <ClaimModal
          claim={selectedClaim}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedClaim(null);
          }}
          onSave={handleSaveClaim}
          onDelete={handleDeleteClaim}
          userEmail={session.user.email}
          allClaims={claims}
        />
      )}
    </div>
  );
}
