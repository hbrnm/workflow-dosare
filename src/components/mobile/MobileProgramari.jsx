import React, { useState, useMemo } from "react";
import {
  CalendarClock, Clock, Car, User, Phone, CheckCircle2,
  Calendar, ChevronRight, Edit3, Save, X, Sparkles
} from "lucide-react";
import { fmtDate, daysBetween, telLink, todayISO } from "../../utils/dateUtils";
import { getStatusDefinition } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";

export default function MobileProgramari({ claims, onOpen, onPatch, canEditFn, onNotify }) {
  const todayStr = todayISO();
  const [filterMode, setFilterMode] = useState("azi"); // "azi" | "viitoare" | "toate"
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");

  // Filtrare dosare care au dată de programare sau sunt în stare de programare
  const programari = useMemo(() => {
    const list = claims.filter((c) => c.dataProgramare || c.status === "programat");

    return list.sort((a, b) => {
      if (!a.dataProgramare) return 1;
      if (!b.dataProgramare) return -1;
      return new Date(a.dataProgramare) - new Date(b.dataProgramare);
    });
  }, [claims]);

  // Lista filtrată pe baza tab-ului selectat
  const filteredProgramari = useMemo(() => {
    if (filterMode === "azi") {
      return programari.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr);
    }
    if (filterMode === "viitoare") {
      return programari.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) >= todayStr);
    }
    return programari;
  }, [programari, filterMode, todayStr]);

  const handleStartEdit = (claim) => {
    setEditingClaimId(claim.id);
    if (claim.dataProgramare) {
      setEditDate(claim.dataProgramare.slice(0, 10));
      setEditTime(claim.dataProgramare.slice(11, 16) || "09:00");
    } else {
      setEditDate(todayStr);
      setEditTime("09:00");
    }
  };

  const handleSaveProgramare = async (claimId) => {
    if (!editDate) {
      if (onNotify) onNotify("Selectează o dată validă pentru programare.", "error");
      return;
    }
    try {
      const fullIso = `${editDate}T${editTime}:00`;
      await onPatch(claimId, { dataProgramare: fullIso, status: "programat" }, { canEditFn });
      setEditingClaimId(null);
      if (onNotify) onNotify(`📅 Programare salvată cu succes pentru ${editDate} ${editTime}!`, "success");
    } catch (err) {
      if (onNotify) onNotify("Eroare la salvare programare: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      
      {/* BANNER HEADER PROGRAMĂRI MOBIL */}
      <div className="bg-[#1C2127] text-white p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[15px] tracking-tight flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <CalendarClock size={18} className="text-[#C98A2B]" />
            <span>Agenda Programări Mobil</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[#C98A2B] text-white">
            {filteredProgramari.length} Intrări
          </span>
        </div>
        <p className="text-[11.5px] text-[#A69F91]">
          Planificarea intrărilor în service și gestiunea rapidă a programărilor de pe mobil.
        </p>
      </div>

      {/* TABS DE FILTRARE ADAPTATE MOBIL */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setFilterMode("azi")}
          className={`py-2 px-2 rounded-xl border text-center transition-all ${
            filterMode === "azi" ? "bg-[#2C4160] text-white border-[#2C4160] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"
          }`}
        >
          Azi ({programari.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("viitoare")}
          className={`py-2 px-2 rounded-xl border text-center transition-all ${
            filterMode === "viitoare" ? "bg-[#C98A2B] text-white border-[#C98A2B] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"
          }`}
        >
          Viitoare ({programari.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) >= todayStr).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("toate")}
          className={`py-2 px-2 rounded-xl border text-center transition-all ${
            filterMode === "toate" ? "bg-[#3B5166] text-white border-[#3B5166] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"
          }`}
        >
          Toate ({programari.length})
        </button>
      </div>

      {/* LISTĂ CARDURI PROGRAMĂRI */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {filteredProgramari.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#8A8375] bg-white border border-dashed border-[#DAD4C6] rounded-2xl font-bold space-y-1">
            <Calendar size={24} className="mx-auto text-[#8A8375]" />
            <div>Nicio programare găsită pentru această filtrare.</div>
          </div>
        ) : (
          filteredProgramari.map((c) => {
            const isEditing = editingClaimId === c.id;
            const phone = c.telefonClient || "";

            return (
              <div
                key={c.id}
                className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-2xs space-y-2.5 hover:border-[#C98A2B] transition-all"
              >
                {/* Antet Card: Oră & Număr Inmatriculare */}
                <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[12px] bg-[#2C4160] text-white px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                      <Clock size={11} />
                      {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                    </span>
                    <span className="font-mono font-extrabold text-[13.5px] text-[#23282E] uppercase">
                      {c.numarInmatriculare || "—"}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-[#8A8375] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#DAD4C6] font-semibold">
                    {c.dataProgramare ? c.dataProgramare.slice(0, 10) : "Fără dată"}
                  </span>
                </div>

                {/* Detalii vehicul & client */}
                <div className="space-y-1 text-[11.5px]">
                  <div className="flex items-center justify-between text-[#6B6558] font-semibold">
                    <span className="truncate flex items-center gap-1">
                      <Car size={13} className="text-[#C98A2B] shrink-0" />
                      {c.marcaModel || "Model nespecificat"}
                    </span>
                    <span className="text-[10px] text-[#8A8375] font-mono">
                      Nr: {c.numarDosar || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[#8A8375] text-[11px]">
                    <User size={12} className="shrink-0 text-[#8A8375]" />
                    <span className="truncate">{c.client || "Client neintrodus"}</span>
                  </div>
                </div>

                {/* Editare rapidă dată programare de pe mobil */}
                {isEditing ? (
                  <div className="bg-[#FAF8F5] border border-[#C98A2B]/60 p-2.5 rounded-xl space-y-2 animate-in fade-in duration-150">
                    <div className="text-[10.5px] font-bold text-[#7A5316] flex items-center gap-1">
                      <Edit3 size={12} /> Modifică Data &amp; Ora Programării:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-white border border-[#DAD4C6] rounded-lg p-1.5 text-[12px] font-bold text-[#23282E]"
                      />
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="bg-white border border-[#DAD4C6] rounded-lg p-1.5 text-[12px] font-bold text-[#23282E]"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingClaimId(null)}
                        className="px-2.5 py-1 rounded-lg border border-[#DAD4C6] text-[11px] font-bold text-[#6B6558] hover:bg-gray-100"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveProgramare(c.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#C98A2B] text-white text-[11px] font-extrabold hover:bg-[#B37A22] shadow-xs"
                      >
                        <Save size={12} /> Salvează
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Acțiuni tactile de pe mobil */
                  <div className="pt-2 border-t border-[#EFEAE1] flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a
                            href={telLink(phone)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#EEF1F3] hover:bg-[#3B5166] text-[#3B5166] hover:text-white text-[10.5px] font-bold transition-colors"
                            title={`Sune la ${phone}`}
                          >
                            <Phone size={11} /> Apel
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(c)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-gray-100 text-[#6B6558] text-[10.5px] font-bold transition-colors"
                      >
                        <Edit3 size={11} /> Data
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#2C4160] text-white hover:bg-[#1E2D44] text-[11px] font-bold transition-colors shadow-2xs"
                    >
                      <span>Deschide</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
