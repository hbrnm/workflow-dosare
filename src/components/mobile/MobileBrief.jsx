import React, { useState, useMemo } from "react";
import {
  CheckCircle2, Phone, ExternalLink
} from "lucide-react";
import { telLink } from "../../utils/dateUtils";
import { buildAlertBuckets, filterAlertItems } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";

const FILTER_CHIPS = [
  { key: "toate", label: "Toate", active: "bg-[#2C4160] text-white border-[#2C4160]", idle: "bg-white text-[#6B6558] border-[#DAD4C6]" },
  { key: "blocate", label: "🛑 Blocate", active: "bg-[#B23A2E] text-white border-[#B23A2E]", idle: "bg-red-50 text-[#B23A2E] border-red-200" },
  { key: "masini_schimb", label: "🚗 Auto Schimb", active: "bg-[#C98A2B] text-white border-[#C98A2B]", idle: "bg-amber-50 text-[#7A5316] border-amber-200" },
  { key: "stagnate", label: "⏳ Stagnate", active: "bg-[#3B5166] text-white border-[#3B5166]", idle: "bg-blue-50 text-[#3B5166] border-blue-200" },
  { key: "piese", label: "📦 Piese", active: "bg-[#7A5316] text-white border-[#7A5316]", idle: "bg-orange-50 text-[#7A5316] border-orange-200" },
  { key: "neridicate", label: "📞 Neridicate", active: "bg-[#3E6B45] text-white border-[#3E6B45]", idle: "bg-emerald-50 text-[#3E6B45] border-emerald-200" },
  { key: "accept_plata", label: "🛒 Accept", active: "bg-[#2C4160] text-white border-[#2C4160]", idle: "bg-slate-50 text-[#2C4160] border-slate-200" },
  { key: "inactivitate", label: "⏱️ Inactive", active: "bg-[#7A5316] text-white border-[#7A5316]", idle: "bg-yellow-50 text-[#7A5316] border-yellow-200" },
];

export default function MobileBrief({
  claims,
  onOpen,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onPatchClaim,
  onNotify,
}) {
  const [activeAlertTab, setActiveAlertTab] = useState("toate");

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount, items } = buckets;

  const alertsList = useMemo(
    () => filterAlertItems(items, activeAlertTab),
    [items, activeAlertTab]
  );

  const chipCount = (key) => (key === "toate" ? totalAlertsCount : counts[key] || 0);

  const ackAlert = async (e, claimId) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    const ok = await onPatchClaim(claimId, { alerteAck: true });
    onNotify?.(ok ? "Alerta marcată ca rezolvată." : "Eroare la marcarea alertei.", ok ? "success" : "error");
  };

  const canAck = (type) =>
    ["blocate", "neridicate", "accept_plata", "masini_schimb", "piese"].includes(type);

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActiveAlertTab(chip.key)}
            className={`w-full py-2 px-2 rounded-xl border text-center transition-all ${
              activeAlertTab === chip.key ? `${chip.active} shadow-xs` : chip.idle
            }`}
          >
            {chip.label} ({chipCount(chip.key)})
          </button>
        ))}
      </div>

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
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-extrabold text-[14px] text-[#23282E] uppercase">
                    {c.numarInmatriculare || "—"}
                  </span>
                  <span className="text-[10px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#3B5166] truncate max-w-[55%]">
                    {item.title}
                  </span>
                </div>

                <div className="text-[12px] font-semibold text-[#6B6558] flex justify-between gap-2">
                  <span className="truncate">{c.marcaModel || "Model neprecizat"}</span>
                  <span className="font-mono text-[11px] shrink-0">Dosar: {c.numarDosar || "—"}</span>
                </div>

                <div className="text-[11.5px] font-bold text-[#B23A2E] bg-red-50/60 border border-red-100 p-2 rounded-xl">
                  {item.reason}
                </div>

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

                  <div className="flex items-center gap-1.5 ml-auto">
                    {onPatchClaim && canAck(item.type) && (
                      <button
                        type="button"
                        onClick={(e) => ackAlert(e, c.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EFEAE1] text-[#3B5166] text-[11px] font-bold"
                      >
                        Rezolvat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#2C4160] text-white text-[11.5px] font-bold shadow-2xs"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
