import React, { useState, useMemo } from "react";
import { Search, Plus, Filter, ChevronRight, User, Phone, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";
import { telLink } from "../../utils/dateUtils";

export default function MobileClaimsList({ claims, onOpen, onNew, canEditFn }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("toate"); // "toate" | "in_lucru" | "piese_comandate" | "gata_de_ridicare" | "facturat" | "blocate"

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (statusFilter === "in_lucru" && c.status !== "in_lucru") return false;
      if (statusFilter === "piese_comandate" && c.status !== "piese_comandate") return false;
      if (statusFilter === "gata_de_ridicare" && c.status !== "gata_de_ridicare") return false;
      if (statusFilter === "facturat" && c.status !== "facturat") return false;
      if (statusFilter === "blocate" && !c.blocat) return false;

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

  // Group claims by vehicle registration if multiple exist in the same status (Point 15)
  const groupedClaims = useMemo(() => {
    const map = new Map();
    filtered.forEach((c) => {
      const plate = (c.numarInmatriculare || "").trim().toUpperCase();
      const key = plate && plate.length > 2 ? `${plate}_${c.status}` : c.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return Array.from(map.values());
  }, [filtered]);

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

        {/* Filtre rapide pe statusuri (Punctul 18) */}
        <div className="flex gap-1 text-[10.5px] font-bold overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter("toate")}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap ${statusFilter === "toate" ? "bg-[#2C4160] text-white border-[#2C4160]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6]"}`}
          >
            Toate ({claims.length})
          </button>
          <button
            onClick={() => setStatusFilter("in_lucru")}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap ${statusFilter === "in_lucru" ? "bg-[#3B5166] text-white border-[#3B5166]" : "bg-[#FAF8F5] text-[#6B6558] border-[#DAD4C6]"}`}
          >
            În lucru
          </button>
          <button
            onClick={() => setStatusFilter("piese_comandate")}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap ${statusFilter === "piese_comandate" ? "bg-[#C98A2B] text-white border-[#C98A2B]" : "bg-amber-50 text-[#7A5316] border-amber-200"}`}
          >
            Piese Comandate
          </button>
          <button
            onClick={() => setStatusFilter("gata_de_ridicare")}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap ${statusFilter === "gata_de_ridicare" ? "bg-[#3E6B45] text-white border-[#3E6B45]" : "bg-emerald-50 text-[#3E6B45] border-emerald-200"}`}
          >
            Gata Ridicare
          </button>
          <button
            onClick={() => setStatusFilter("blocate")}
            className={`px-2.5 py-1 rounded-lg border whitespace-nowrap ${statusFilter === "blocate" ? "bg-[#B23A2E] text-white border-[#B23A2E]" : "bg-red-50 text-[#B23A2E] border-red-200"}`}
          >
            🛑 Blocate
          </button>
        </div>
      </div>

      {/* LISTĂ TACTILĂ DOSARE */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {groupedClaims.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#8A8375] italic bg-white border border-[#DAD4C6] rounded-2xl">
            Niciun dosar găsit pentru criteriul selectat.
          </div>
        ) : (
          groupedClaims.map((group) => {
            if (group.length === 1) {
              const c = group[0];
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

                  {c.status === "piese_comandate" && c.dataComandaPiese && (
                    <div className="text-[10.5px] font-bold text-[#7A5316] bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
                      <span>📦 Piese Comandate la:</span>
                      <span className="font-mono">{c.dataComandaPiese}</span>
                    </div>
                  )}

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
            }

            // Stacked interactive accordion group on Mobile
            return (
              <MobileStackedGroupCard
                key={group[0].id}
                group={group}
                onOpen={onOpen}
              />
            );
          })
        )}
      </div>

    </div>
  );
}

function MobileStackedGroupCard({ group, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const first = group[0];

  return (
    <div className="border-2 border-[#3B5166]/40 rounded-2xl p-2 bg-[#EEF1F3] space-y-2 shadow-xs transition-all">
      {/* Header Comasat Mobil */}
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#DAD4C6] cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono font-extrabold text-[14px] text-[#23282E] uppercase">
            🚗 {first.numarInmatriculare}
          </span>
          <span className="bg-[#3B5166] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            {group.length} dosare
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#3B5166] font-bold text-[12px]">
          <span>{expanded ? "Restrânge" : "Extinde"}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Când este restrâns: Rezumat pe mobil */}
      {!expanded && (
        <div 
          onClick={() => setExpanded(true)}
          className="bg-white/80 border border-dashed border-[#DAD4C6] p-2.5 rounded-xl text-[11.5px] text-[#3B5166] font-bold text-center flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Apasă pentru a deschide cele {group.length} dosare comasate</span>
          <ChevronDown size={14} />
        </div>
      )}

      {/* Când este extins: Lista dosarelor */}
      {expanded && (
        <div className="space-y-2 pt-1">
          {group.map((c) => {
            const sDef = getStatusDefinition(c.status);
            const phone = c.telefonClient || "";

            return (
              <div
                key={c.id}
                onClick={() => onOpen(c)}
                className="bg-white border border-[#DAD4C6] rounded-2xl p-3 shadow-2xs cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[13px] text-[#23282E] uppercase">
                      {c.numarInmatriculare || "—"}
                    </span>
                    {c.blocat && <span className="px-1.5 py-0.2 text-[9.5px] bg-[#B23A2E] text-white font-bold rounded">BLOCAT</span>}
                  </div>
                  <span className="text-[10.5px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded text-[#3B5166]">
                    {sDef.num}. {sDef.label}
                  </span>
                </div>

                {c.status === "piese_comandate" && c.dataComandaPiese && (
                  <div className="text-[10.5px] font-bold text-[#7A5316] bg-amber-50 p-1 rounded-lg border border-amber-200 flex items-center justify-between">
                    <span>📦 Piese Comandate la:</span>
                    <span className="font-mono">{c.dataComandaPiese}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#6B6558]">
                  <span>{c.marcaModel || "—"}</span>
                  <span className="font-mono text-[10.5px] text-[#8A8375]">Nr: {c.numarDosar || "—"}</span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#EFEAE1] text-[11px]">
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
          })}
        </div>
      )}
    </div>
  );
}
