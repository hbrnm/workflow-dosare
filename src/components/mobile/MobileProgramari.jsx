import React, { useState, useMemo } from "react";
import {
  CalendarClock, Clock, Car, User, Phone,
  Calendar, ChevronRight, Edit3, Save, Wrench, XCircle
} from "lucide-react";
import { telLink, todayISO } from "../../utils/dateUtils";
import { getStatusDefinition, isProgramatorClaim } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";

/**
 * Aceeași sursă de adevăr ca Programatorul desktop:
 * doar dosare cu dataProgramare + status în PROGRAMATOR_VISIBLE_STATUSES.
 * Status side-effects (programat / în lucru / anulare) vin din patchClaim.
 */
export default function MobileProgramari({ claims, onOpen, onPatch, canEditFn, onNotify }) {
  const todayStr = todayISO();
  const [filterMode, setFilterMode] = useState("viitoare"); // "azi" | "viitoare" | "toate"
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");

  const programari = useMemo(() => {
    return claims
      .filter(isProgramatorClaim)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims]);

  const countAzi = useMemo(
    () => programari.filter((c) => c.dataProgramare.slice(0, 10) === todayStr).length,
    [programari, todayStr]
  );
  const countViitoare = useMemo(
    () => programari.filter((c) => c.dataProgramare.slice(0, 10) >= todayStr).length,
    [programari, todayStr]
  );

  const filteredProgramari = useMemo(() => {
    if (filterMode === "azi") {
      return programari.filter((c) => c.dataProgramare.slice(0, 10) === todayStr);
    }
    if (filterMode === "viitoare") {
      return programari.filter((c) => c.dataProgramare.slice(0, 10) >= todayStr);
    }
    return programari;
  }, [programari, filterMode, todayStr]);

  const handleStartEdit = (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      if (onNotify) onNotify("Poți modifica doar programările de pe dosarele tale.", "error");
      return;
    }
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
      const fullIso = `${editDate}T${editTime || "09:00"}:00`;
      // Doar data — side-effect status (programat / păstrează în lucru) e în patchClaim
      const ok = await onPatch(claimId, { dataProgramare: fullIso });
      if (ok === false) return;
      setEditingClaimId(null);
      if (onNotify) onNotify(`Programare salvată: ${editDate} ${editTime || "09:00"}`, "success");
    } catch (err) {
      if (onNotify) onNotify("Eroare la salvare programare: " + err.message, "error");
    }
  };

  const handleMarkInLucru = async (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    const ok = await onPatch(claim.id, { status: "in_lucru", adusaFizic: true });
    if (ok !== false) onNotify?.('Dosar mutat în „În lucru".', "success");
  };

  const handleClearProgramare = async (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    if (!window.confirm("Anulezi programarea pentru acest dosar?")) return;
    const ok = await onPatch(claim.id, { dataProgramare: null });
    if (ok !== false) onNotify?.("Programare anulată.", "success");
  };

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      
      <div className="bg-[#1C2127] text-white p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[15px] tracking-tight flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <CalendarClock size={18} className="text-[#C98A2B]" />
            <span>Programări</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-[#C98A2B] text-white">
            {filteredProgramari.length}
          </span>
        </div>
        <p className="text-[11.5px] text-[#A69F91]">
          Programare → status automat. Reprogramarea nu coboară un dosar deja în lucru.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setFilterMode("azi")}
          className={`py-2 px-2 rounded-xl border text-center transition-all ${
            filterMode === "azi" ? "bg-[#2C4160] text-white border-[#2C4160] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"
          }`}
        >
          Azi ({countAzi})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("viitoare")}
          className={`py-2 px-2 rounded-xl border text-center transition-all ${
            filterMode === "viitoare" ? "bg-[#C98A2B] text-white border-[#C98A2B] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"
          }`}
        >
          Viitoare ({countViitoare})
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

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {filteredProgramari.length === 0 ? (
          <div className="p-6 text-center bg-white border border-dashed border-[#DAD4C6] rounded-2xl font-bold space-y-2">
            <Calendar size={24} className="mx-auto text-[#8A8375]" />
            <div className="text-[13px] text-[#23282E]">
              {filterMode === "azi"
                ? "Nicio programare azi"
                : filterMode === "viitoare"
                  ? "Nicio programare viitoare"
                  : "Nicio programare"}
            </div>
            <p className="text-[11.5px] text-[#8A8375] font-semibold">
              {filterMode === "azi"
                ? "Verifică „Viitoare” sau deschide un dosar ca să setezi data."
                : "Programezi din dosar — pe teren poți trece rapid în lucru."}
            </p>
            {filterMode === "azi" && countViitoare > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode("viitoare")}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#1C2127] text-white text-[12px] font-extrabold"
              >
                Vezi viitoare ({countViitoare})
              </button>
            )}
          </div>
        ) : (
          filteredProgramari.map((c) => {
            const isEditing = editingClaimId === c.id;
            const phone = c.telefonClient || "";
            const statusLabel = getStatusDefinition(c.status).label;
            const canEdit = !canEditFn || canEditFn(c);
            const showInLucru = canEdit && c.status === "programat";
            const showClear = canEdit && c.status === "programat";

            return (
              <div
                key={c.id}
                className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-2xs space-y-2.5 hover:border-[#C98A2B] transition-all"
              >
                <div className="flex items-center justify-between border-b border-[#EFEAE1] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[12px] bg-[#2C4160] text-white px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                      <Clock size={11} />
                      {c.dataProgramare.slice(11, 16) || "08:00"}
                    </span>
                    <span className="font-mono font-extrabold text-[13.5px] text-[#23282E] uppercase">
                      {c.numarInmatriculare || "—"}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-[#8A8375] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#DAD4C6] font-semibold">
                    {c.dataProgramare.slice(0, 10)}
                  </span>
                </div>

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
                  <div className="flex items-center justify-between gap-2 text-[#8A8375] text-[11px]">
                    <span className="truncate flex items-center gap-1">
                      <User size={12} className="shrink-0 text-[#8A8375]" />
                      {c.client || "Client neintrodus"}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-[#3B5166] bg-[#EEF1F3] px-1.5 py-0.5 rounded">
                      {statusLabel}
                    </span>
                  </div>
                </div>

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
                  <div className="pt-2 border-t border-[#EFEAE1] space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {phone && (
                          <>
                            <WhatsAppButton phone={phone} claim={c} size={11} />
                            <a
                              href={telLink(phone)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-[#EEF1F3] hover:bg-[#3B5166] text-[#3B5166] hover:text-white text-[10.5px] font-bold transition-colors"
                              title={`Sună la ${phone}`}
                            >
                              <Phone size={11} /> Apel
                            </a>
                          </>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#FAF8F5] border border-[#DAD4C6] hover:bg-gray-100 text-[#6B6558] text-[10.5px] font-bold transition-colors"
                          >
                            <Edit3 size={11} /> Data
                          </button>
                        )}
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

                    {(showInLucru || showClear) && (
                      <div className="flex items-center gap-1.5">
                        {showInLucru && (
                          <button
                            type="button"
                            onClick={() => handleMarkInLucru(c)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-[#C98A2B] text-white text-[11px] font-extrabold"
                          >
                            <Wrench size={12} /> În lucru
                          </button>
                        )}
                        {showClear && (
                          <button
                            type="button"
                            onClick={() => handleClearProgramare(c)}
                            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#DAD4C6] bg-[#FAF8F5] text-[#6B6558] text-[11px] font-bold"
                          >
                            <XCircle size={12} /> Anulează prog.
                          </button>
                        )}
                      </div>
                    )}
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
