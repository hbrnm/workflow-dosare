import React, { useState, useMemo } from "react";
import { Search, Plus, Filter, ChevronRight, User, Phone, X, ExternalLink } from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";
import { telLink } from "../../utils/dateUtils";

export default function MobileClaimsList({ claims, onOpen, onNew, canEditFn }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("toate"); // "toate" | "active" | "blocate" | "gata"

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter === "active" && c.status === "facturat") return false;
      if (statusFilter === "blocate" && !c.blocat) return false;
      if (statusFilter === "gata" && !c.gataDeRidicare) return false;

      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        (c.numarDosar || "").toLowerCase().includes(q) ||
        (c.client || "").toLowerCase().includes(q) ||
        (c.numarInmatriculare || "").toLowerCase().includes(q) ||
        (c.vin || "").toLowerCase().includes(q)
      );
    });
  }, [claims, query, statusFilter]);

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      
      {/* HEADER CĂUTARE & DOSAR NOU */}
      <div className="bg-white rounded-2xl border border-[#DAD4C6] p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[15px] text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Dosare Daună ({filtered.length})
          </h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C98A2B] text-white text-[12px] font-extrabold shadow-sm"
          >
            <Plus size={15} /> Dosar Nou
          </button>
        </div>

        {/* Căutare rapidă */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-[#8A8375]" />
          <input
            type="text"
            className="w-full pl-9 pr-8 py-2 border border-[#DAD4C6] rounded-xl text-[13px] font-bold bg-[#FAF8F5] focus:bg-white focus:outline-hidden"
            placeholder="Caută nr. auto, client sau nr. dosar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-[#8A8375]">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filtre rapide */}
        <div className="flex gap-1.5 text-[11px] font-bold overflow-x-auto pb-0.5">
          <button
            onClick={() => setStatusFilter("toate")}
            className={`px-3 py-1 rounded-lg border ${statusFilter === "toate" ? "bg-[#2C4160] text-white border-[#2C4160]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6]"}`}
          >
            Toate ({claims.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg border ${statusFilter === "active" ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6]"}`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("blocate")}
            className={`px-3 py-1 rounded-lg border ${statusFilter === "blocate" ? "bg-[#B23A2E] text-white border-[#B23A2E]" : "bg-red-50 text-[#B23A2E] border-red-200"}`}
          >
            🛑 Blocate
          </button>
          <button
            onClick={() => setStatusFilter("gata")}
            className={`px-3 py-1 rounded-lg border ${statusFilter === "gata" ? "bg-[#3E6B45] text-white border-[#3E6B45]" : "bg-emerald-50 text-[#3E6B45] border-emerald-200"}`}
          >
            ✨ Gata
          </button>
        </div>
      </div>

      {/* LISTĂ TACTILĂ DOSARE */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#8A8375] italic bg-white border border-[#DAD4C6] rounded-2xl">
            Niciun dosar găsit pentru criteriul selectat.
          </div>
        ) : (
          filtered.map((c) => {
            const sDef = getStatusDefinition(c.status);
            const phone = c.telefonClient || "";

            return (
              <div
                key={c.id}
                onClick={() => onOpen(c)}
                className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-2xs hover:border-[#2C4160] cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[14px] text-[#23282E] uppercase">
                      {c.numarInmatriculare || "—"}
                    </span>
                    {c.blocat && <span className="px-1.5 py-0.2 text-[9.5px] bg-[#B23A2E] text-white font-bold rounded">BLOCAT</span>}
                  </div>
                  <span className="text-[10.5px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded text-[#3B5166]">
                    {sDef.num}. {sDef.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[12px] font-semibold text-[#6B6558]">
                  <span>{c.marcaModel || "—"}</span>
                  <span className="font-mono text-[11px] text-[#8A8375]">Nr: {c.numarDosar || "—"}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EFEAE1] text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#8A8375]">
                    <User size={12} /> <span className="font-semibold text-[#23282E] truncate max-w-[140px]">{c.client || "Client neprecizat"}</span>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {phone && (
                      <>
                        <WhatsAppButton phone={phone} claim={c} size={11} />
                        <a href={telLink(phone)} className="p-1.5 rounded-lg bg-[#EEF1F3] text-[#3B5166]">
                          <Phone size={12} />
                        </a>
                      </>
                    )}
                    <ChevronRight size={16} className="text-[#8A8375]" />
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
