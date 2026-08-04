import React, { useState, useMemo } from "react";
import {
  ShieldAlert, AlertOctagon, Car, Clock, Boxes, PackageCheck,
  Phone, ExternalLink, CalendarClock, User, CheckCircle2
} from "lucide-react";
import { daysBetween, telLink, todayISO } from "../../utils/dateUtils";
import { isReadyForPickupOverdue, isStageOverdue } from "../../utils/alertUtils";
import { getStatusDefinition } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";

export default function MobileBrief({ claims, onOpen, pragRidicare }) {
  const todayStr = todayISO();
  const [activeAlertTab, setActiveAlertTab] = useState("toate");

  // Alerte Blocate
  const blocate = useMemo(() => claims.filter((c) => c.blocat), [claims]);

  // Auto Schimb Depășite
  const masiniSchimbDepasite = useMemo(() =>
    claims.filter((c) => c.masinaSchimb && c.masinaSchimb.trim() && c.status !== "facturat")
      .map((c) => {
        const zile = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
        const depasit = c.zileChirieAudatex > 0 && zile > c.zileChirieAudatex;
        return { ...c, zile, depasit };
      })
      .filter((c) => c.depasit),
    [claims]);

  // Stagnate în etapă
  const restante = useMemo(() => claims.filter(isStageOverdue), [claims]);

  // Piese neprogramate
  const pieseSosite = useMemo(() => claims.filter((c) => (c.pieseSosite || c.status === "piese_sosite") && !c.dataProgramare), [claims]);

  // Neridicate
  const neridicate = useMemo(() => claims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)), [claims, pragRidicare]);

  const totalAlerte = blocate.length + masiniSchimbDepasite.length + restante.length + pieseSosite.length + neridicate.length;

  // Lista unificată de alerte
  const alertsList = useMemo(() => {
    const list = [];
    blocate.forEach((c) => list.push({ id: `b-${c.id}`, claim: c, type: "blocate", title: "🛑 Blocat", reason: c.motivBlocare || "Fără motiv" }));
    masiniSchimbDepasite.forEach((c) => list.push({ id: `s-${c.id}`, claim: c, type: "masini_schimb", title: "🚗 Auto Schimb", reason: `Auditex depășit cu ${c.zile - c.zileChirieAudatex}z` }));
    restante.forEach((c) => list.push({ id: `st-${c.id}`, claim: c, type: "stagnate", title: "⏳ Stagnat", reason: `${daysBetween(c.dataSchimbareStatus)}z în ${getStatusDefinition(c.status).label}` }));
    pieseSosite.forEach((c) => list.push({ id: `p-${c.id}`, claim: c, type: "piese", title: "📦 Piese Sosite", reason: "Fără programare stabilită" }));
    neridicate.forEach((c) => list.push({ id: `n-${c.id}`, claim: c, type: "neridicate", title: "📞 Neridicată", reason: `${daysBetween(c.dataGataRidicare)}z de la finalizare` }));

    if (activeAlertTab === "toate") return list;
    return list.filter((item) => item.type === activeAlertTab);
  }, [blocate, masiniSchimbDepasite, restante, pieseSosite, neridicate, activeAlertTab]);

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">

      {/* FILTRU TACTIL ALERTE - GRILĂ FĂRĂ DERULARE ORIZONTALĂ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
        <button
          onClick={() => setActiveAlertTab("toate")}
          className={`w-full py-2 px-2.5 rounded-xl border text-center transition-all ${activeAlertTab === "toate" ? "bg-[#2C4160] text-white border-[#2C4160] shadow-xs" : "bg-white text-[#6B6558] border-[#DAD4C6]"}`}
        >
          Toate ({totalAlerte})
        </button>
        <button
          onClick={() => setActiveAlertTab("blocate")}
          className={`w-full py-2 px-2.5 rounded-xl border text-center transition-all ${activeAlertTab === "blocate" ? "bg-[#B23A2E] text-white border-[#B23A2E] shadow-xs" : "bg-red-50 text-[#B23A2E] border-red-200"}`}
        >
          🛑 Blocate ({blocate.length})
        </button>
        <button
          onClick={() => setActiveAlertTab("masini_schimb")}
          className={`w-full py-2 px-2.5 rounded-xl border text-center transition-all ${activeAlertTab === "masini_schimb" ? "bg-[#C98A2B] text-white border-[#C98A2B] shadow-xs" : "bg-amber-50 text-[#7A5316] border-amber-200"}`}
        >
          🚗 Auto Schimb ({masiniSchimbDepasite.length})
        </button>
        <button
          onClick={() => setActiveAlertTab("stagnate")}
          className={`w-full py-2 px-2.5 rounded-xl border text-center transition-all ${activeAlertTab === "stagnate" ? "bg-[#3B5166] text-white border-[#3B5166] shadow-xs" : "bg-blue-50 text-[#3B5166] border-blue-200"}`}
        >
          ⏳ Stagnate ({restante.length})
        </button>
      </div>

      {/* LISTA CARDURI TACTILE ALERTE */}
      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {alertsList.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#3E6B45] bg-green-50 border border-green-200 rounded-2xl font-bold space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-[#3E6B45]" />
            <div>Nicio alertă urgentă pentru acest filtru!</div>
          </div>
        ) : (
          alertsList.map((item) => {
            const c = item.claim;
            const phone = c.telefonClient || "";

            return (
              <div key={item.id} className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-[14px] text-[#23282E] uppercase">
                    {c.numarInmatriculare || "—"}
                  </span>
                  <span className="text-[10px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#3B5166]">
                    {item.title}
                  </span>
                </div>

                <div className="text-[12px] font-semibold text-[#6B6558] flex justify-between">
                  <span>{c.marcaModel || "Model neprecizat"}</span>
                  <span className="font-mono text-[11px]">Dosar: {c.numarDosar || "—"}</span>
                </div>

                <div className="text-[11.5px] font-bold text-[#B23A2E] bg-red-50/60 border border-red-100 p-2 rounded-xl">
                  {item.reason}
                </div>

                {/* BARA DE ACȚIUNE TACTILĂ MOBILĂ */}
                <div className="pt-2 border-t border-[#EFEAE1] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <>
                        <WhatsAppButton phone={phone} claim={c} size={12} />
                        <a
                          href={telLink(phone)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EEF1F3] text-[#3B5166] text-[11.5px] font-bold"
                        >
                          <Phone size={12} /> Apel
                        </a>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => onOpen(c)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#2C4160] text-white text-[11.5px] font-bold ml-auto shadow-2xs"
                  >
                    <span>Deschide</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
