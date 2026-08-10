import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, FileText, Layers, Sunrise, List, BarChart3, CalendarClock,
  Wallet, Plus, Download, X, CornerDownLeft, Camera
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { claimMatchesSearch } from "../../utils/searchUtils";

export default function CommandPalette({
  isOpen,
  onClose,
  claims = [],
  initialQuery = "",
  onQueryChange = null,
  onOpenClaim,
  onSwitchView,
  onOpenNewClaim,
  onOpenQuickCapture,
  onExportExcel,
  onExportPdf,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Prefill + focus only when palette opens (not on every parent search sync)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setQuery(String(initialQuery || ""));
      setSelectedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      wasOpenRef.current = true;
      return () => window.clearTimeout(t);
    }
    if (!isOpen) wasOpenRef.current = false;
    return undefined;
  }, [isOpen, initialQuery]);

  const updateQuery = (next) => {
    setQuery(next);
    setSelectedIndex(0);
    if (typeof onQueryChange === "function") onQueryChange(next);
  };

  // Global Ctrl+K / Cmd+K listener when palette is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered items (Claims, Views, Actions)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Views List
    const views = [
      { type: "view", id: "flux", label: "Flux Operațional", sub: "Tabloul pe 4 faze", icon: Layers },
      { type: "view", id: "brief", label: "Brieful dimineții", sub: "Dosare de livrat & sunat azi", icon: Sunrise },
      { type: "view", id: "list", label: "Tabel Dosare", sub: "Listă detaliată cu sortare", icon: List },
      { type: "view", id: "programator", label: "Calendar Service", sub: "Agendă săptămânală & lunară", icon: CalendarClock },
      { type: "view", id: "dashboard", label: "Statistici & Grafice", sub: "Indicatori cheie de performanță", icon: BarChart3 },
      { type: "view", id: "rapoarte", label: "Rapoarte Financiar", sub: "Marjă piese & venit manoperă", icon: Wallet },
    ];

    // Actions List
    const actions = [
      { type: "action", id: "new", label: "Creează Dosar Nou", sub: "Adaugă un dosar de daună în sistem", icon: Plus, handler: onOpenNewClaim },
      { type: "action", id: "capture", label: "Poze & Documente Rapid", sub: "Captură foto, scan acte cu auto-crop, cameră live", icon: Camera, handler: onOpenQuickCapture },
      { type: "action", id: "excel", label: "Exportă Excel", sub: "Descarcă toate dosarele în format .xlsx", icon: Download, handler: onExportExcel },
      { type: "action", id: "pdf", label: "Exportă PDF", sub: "Descarcă toate dosarele în format .pdf", icon: FileText, handler: onExportPdf },
    ];

    if (!q) {
      // Default view when query is empty: show recent claims + quick views + actions
      const recentClaims = claims.slice(0, 5).map((c) => ({ type: "claim", claim: c }));
      return [...recentClaims, ...views.slice(0, 4), ...actions];
    }

    // Filter Claims — same matcher as header / overlay / list filters
    const matchedClaims = claims
      .filter((c) => claimMatchesSearch(c, q))
      .slice(0, 8)
      .map((c) => ({ type: "claim", claim: c }));

    // Filter Views
    const matchedViews = views.filter(
      (v) => v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q)
    );

    // Filter Actions
    const matchedActions = actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)
    );

    return [...matchedClaims, ...matchedViews, ...matchedActions];
  }, [query, claims, onOpenNewClaim, onOpenQuickCapture, onExportExcel, onExportPdf]);

  // Keyboard navigation within list
  const handleKeyDownList = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeItem(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const executeItem = (item) => {
    if (item.type === "claim") {
      onOpenClaim(item.claim);
    } else if (item.type === "view") {
      onSwitchView(item.id);
    } else if (item.type === "action" && item.handler) {
      item.handler();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-[#DAD4C6] w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#DAD4C6] bg-[#FAF8F5]">
          <Search size={18} className="text-[#3B5166] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-[14px] font-medium text-[#23282E] placeholder-[#8A8375] focus:outline-none"
            placeholder="Căutare inteligentă: dosar, client, nr. auto, VIN, tab-uri, acțiuni…"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => updateQuery("")}
              className="p-1 text-[#8A8375] hover:text-[#23282E] mr-2"
            >
              <X size={15} />
            </button>
          ) : null}
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#8A8375] bg-[#EFEAE1] px-1.5 py-0.5 rounded border border-[#DAD4C6]">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-10 text-center text-[12.5px] text-[#8A8375]">
              Niciun rezultat găsit pentru „<span className="font-semibold text-[#23282E]">{query}</span>”.
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.type === "claim") {
                const c = item.claim;
                const statusDef = getStatusDefinition(c.status);

                return (
                  <div
                    key={`claim-${c.id}`}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? "bg-[#3B5166] text-white shadow-xs" : "hover:bg-[#FCFAF5] text-[#23282E]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-white/20 text-white" : "bg-[#EFEAE1] text-[#3B5166]"
                        }`}
                      >
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{c.numarDosar || "Fără nr."}</span>
                          <span className={isSelected ? "text-white/80" : "text-[#6B6558]"}>
                            — {c.client || "Client nespecificat"}
                          </span>
                        </div>
                        <div className={`text-[11px] truncate flex items-center gap-2 mt-0.5 ${isSelected ? "text-white/70" : "text-[#8A8375]"}`}>
                          <span className="font-mono font-semibold">{c.numarInmatriculare || "—"}</span>
                          <span>· {c.marcaModel || "—"}</span>
                          <span>· {c.asigurator}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : "bg-[#F5F2EA] text-[#6B6558]"}`}>
                        {statusDef.num}. {statusDef.label}
                      </span>
                      {isSelected && <CornerDownLeft size={14} className="text-white/90" />}
                    </div>
                  </div>
                );
              }

              if (item.type === "view") {
                const Icon = item.icon;
                return (
                  <div
                    key={`view-${item.id}`}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? "bg-[#3B5166] text-white shadow-xs" : "hover:bg-[#FCFAF5] text-[#23282E]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-[#F5F2EA] text-[#3B5166]"}`}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{item.label}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-[#EFEAE1] text-[#6B6558]"}`}>
                            TAB
                          </span>
                        </div>
                        <div className={`text-[11px] ${isSelected ? "text-white/70" : "text-[#8A8375]"}`}>{item.sub}</div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft size={14} className="text-white/90" />}
                  </div>
                );
              }

              if (item.type === "action") {
                const Icon = item.icon;
                return (
                  <div
                    key={`action-${item.id}`}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? "bg-[#C98A2B] text-white shadow-xs" : "hover:bg-[#FBF3E6] text-[#23282E]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-[#FBF3E6] text-[#C98A2B]"}`}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="font-bold">{item.label}</div>
                        <div className={`text-[11px] ${isSelected ? "text-white/80" : "text-[#8A8375]"}`}>{item.sub}</div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft size={14} className="text-white/90" />}
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2 bg-[#FAF8F5] border-t border-[#DAD4C6] flex items-center justify-between text-[11px] text-[#8A8375]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-[#DAD4C6] px-1 rounded">↑</kbd><kbd className="font-mono bg-white border border-[#DAD4C6] px-1 rounded">↓</kbd> navighează</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-[#DAD4C6] px-1 rounded">↵</kbd> selectează</span>
          </div>
          <div>
            Apasa <kbd className="font-mono bg-white border border-[#DAD4C6] px-1 rounded text-[#23282E] font-bold">Ctrl + K</kbd> oricând
          </div>
        </div>
      </div>
    </div>
  );
}
