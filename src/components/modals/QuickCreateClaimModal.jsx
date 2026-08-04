import React, { useState } from "react";
import { X, Plus, ShieldCheck, FileText, Phone, Car, Building2, Check, User } from "lucide-react";
import { INSURERS } from "../../constants/config";
import { emptyClaim } from "../../utils/claimUtils";

export default function QuickCreateClaimModal({ isOpen, onClose, onSave }) {
  const [numarInmatriculare, setNumarInmatriculare] = useState("");
  const [numarDosar, setNumarDosar] = useState("");
  const [client, setClient] = useState("");
  const [telefon, setTelefon] = useState("");
  const [asigurator, setAsigurator] = useState(INSURERS[0] || "Omniasig VIG");
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
      await onSave({
        ...baseClaim,
        numarInmatriculare: numarInmatriculare.trim().toUpperCase(),
        numarDosar: numarDosar.trim(),
        client: client.trim().toUpperCase(),
        telefonClient: telefon.trim(),
        asigurator: selectedInsurer,
        status: "deschidere",
      });
      // Reset form
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
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#DAD4C6] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER MODAL */}
        <div className="bg-[#1C2127] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C98A2B] flex items-center justify-center font-extrabold text-white">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-[16px] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Dosar Nou Express
              </h2>
              <span className="text-[11px] text-[#A69F91] block">Creare rapidă în 4 câmpuri</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULAR EXPRSS */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[#23282E]">
          
          {/* 1. NUMĂR ÎNMATRICULARE */}
          <div>
            <label className="text-[12px] font-extrabold text-[#6B6558] flex items-center gap-1.5 uppercase mb-1">
              <Car size={15} className="text-[#C98A2B]" /> 1. Nr. Înmatriculare Auto *
            </label>
            <input
              type="text"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[15px] font-mono font-extrabold tracking-wider uppercase focus:bg-white focus:border-[#C98A2B] focus:outline-none transition-colors"
              placeholder="ex: B 123 ABC"
              value={numarInmatriculare}
              onChange={(e) => setNumarInmatriculare(e.target.value)}
            />
          </div>

          {/* 2. NUMĂR DOSAR DAUNĂ */}
          <div>
            <label className="text-[12px] font-extrabold text-[#6B6558] flex items-center gap-1.5 uppercase mb-1">
              <FileText size={15} className="text-[#3B5166]" /> 2. Nr. Dosar Daună
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[14px] font-mono font-bold focus:bg-white focus:border-[#3B5166] focus:outline-none transition-colors"
              placeholder="ex: 10328323"
              value={numarDosar}
              onChange={(e) => setNumarDosar(e.target.value)}
            />
          </div>

          {/* 3. PROPRIETAR AUTO / CLIENT */}
          <div>
            <label className="text-[12px] font-extrabold text-[#6B6558] flex items-center gap-1.5 uppercase mb-1">
              <User size={15} className="text-[#4A6FA5]" /> 3. Proprietar Auto
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[14px] font-semibold uppercase focus:bg-white focus:border-[#4A6FA5] focus:outline-none transition-colors"
              placeholder="ex: POPESCU ION"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>

          {/* 4. TELEFON CLIENT */}
          <div>
            <label className="text-[12px] font-extrabold text-[#6B6558] flex items-center gap-1.5 uppercase mb-1">
              <Phone size={15} className="text-[#3E6B45]" /> 4. Telefon Client
            </label>
            <input
              type="tel"
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[14px] font-bold focus:bg-white focus:border-[#3E6B45] focus:outline-none transition-colors"
              placeholder="ex: 0722123456"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
            />
          </div>

          {/* 5. ASIGURATOR */}
          <div>
            <label className="text-[12px] font-extrabold text-[#6B6558] flex items-center gap-1.5 uppercase mb-1">
              <Building2 size={15} className="text-[#6B6558]" /> 5. Asigurator
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-[13.5px] font-bold focus:bg-white focus:border-[#6B6558] focus:outline-none transition-colors"
              value={asigurator}
              onChange={(e) => setAsigurator(e.target.value)}
            >
              {INSURERS.map((ins) => (
                <option key={ins} value={ins}>
                  {ins}
                </option>
              ))}
              <option value="ALTUL">-- Alt Asigurator --</option>
            </select>

            {asigurator === "ALTUL" && (
              <input
                type="text"
                required
                className="w-full mt-2 px-3.5 py-2 bg-white border border-[#DAD4C6] rounded-xl text-[13px] font-bold"
                placeholder="Introdu numele asigurătorului..."
                value={customAsigurator}
                onChange={(e) => setCustomAsigurator(e.target.value)}
              />
            )}
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[#DAD4C6] text-[#6B6558] font-bold text-[13px] hover:bg-gray-100 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl bg-[#C98A2B] hover:bg-[#B37A22] text-white font-extrabold text-[13.5px] shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check size={18} />
              <span>{isSaving ? "Se salvează..." : "Creează Dosar"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
