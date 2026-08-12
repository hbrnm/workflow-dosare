import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, FileText, Layers, Sunrise, List, BarChart3, CalendarClock,
  Wallet, Plus, Download, X, CornerDownLeft, Camera, Sparkles,
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
  onOpenAiScan,
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
      { type: "action", id: "ai", label: "Scanează cu Agent AI", sub: "Extrage automat datele din devize Audatex/Eurotax/PV", icon: Sparkles, handler: onOpenAiScan },
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

  const rowIdle = "hover:bg-[var(--app-surface-2)] text-[var(--app-text)]";
  const rowSelected = "bg-[var(--app-surface-muted)] text-[var(--app-text-strong)]";
  const rowActionSelected = "bg-[var(--app-accent)] text-[var(--app-accent-text)]";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--app-surface)] rounded-xl shadow-2xl border border-[var(--app-border)] w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]">
          <Search size={18} className="text-[var(--app-muted)] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-[14px] font-medium text-[var(--app-text-strong)] placeholder-[var(--app-muted)] focus:outline-none"
            placeholder="Căutare inteligentă: dosar, client, nr. auto, VIN, tab-uri, acțiuni…"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => updateQuery("")}
              className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text)] mr-2"
              aria-label="Șterge căutarea"
            >
              <X size={15} />
            </button>
          ) : null}
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono app-kbd px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-10 text-center text-[12.5px] text-[var(--app-muted)]">
              Niciun rezultat găsit pentru „<span className="font-semibold text-[var(--app-text-strong)]">{query}</span>”.
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
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? rowSelected : rowIdle
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[var(--app-accent)]/20 text-[var(--app-accent)]"
                            : "bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                        }`}
                      >
                        <FileText size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{c.numarDosar || "Fără nr."}</span>
                          <span className={isSelected ? "text-[var(--app-muted)]" : "text-[var(--app-muted)]"}>
                            — {c.client || "Client nespecificat"}
                          </span>
                        </div>
                        <div className="text-[11px] truncate flex items-center gap-2 mt-0.5 text-[var(--app-muted)]">
                          <span className="font-mono font-semibold">{c.numarInmatriculare || "—"}</span>
                          <span>· {c.marcaModel || "—"}</span>
                          <span>· {c.asigurator}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded ${
                          isSelected
                            ? "bg-[var(--app-surface-2)] text-[var(--app-text)]"
                            : "bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                        }`}
                      >
                        {statusDef.num}. {statusDef.label}
                      </span>
                      {isSelected && <CornerDownLeft size={14} className="text-[var(--app-muted)]" />}
                    </div>
                  </div>
                );
              }

              if (item.type === "view") {
                const Icon = item.icon;
                return (
                  <div
                    key={`view-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? rowSelected : rowIdle
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[var(--app-accent)]/20 text-[var(--app-accent)]"
                            : "bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                        }`}
                      >
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{item.label}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? "bg-[var(--app-surface-2)] text-[var(--app-muted)]"
                                : "bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                            }`}
                          >
                            TAB
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--app-muted)]">{item.sub}</div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft size={14} className="text-[var(--app-muted)]" />}
                  </div>
                );
              }

              if (item.type === "action") {
                const Icon = item.icon;
                return (
                  <div
                    key={`action-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => executeItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${
                      isSelected ? rowActionSelected : rowIdle
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-black/15 text-[var(--app-accent-text)]"
                            : "bg-[var(--app-accent)]/15 text-[var(--app-accent)]"
                        }`}
                      >
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="font-bold">{item.label}</div>
                        <div className={`text-[11px] ${isSelected ? "text-[var(--app-accent-text)]/80" : "text-[var(--app-muted)]"}`}>
                          {item.sub}
                        </div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft size={14} className="text-[var(--app-accent-text)]/90" />}
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2 bg-[var(--app-surface-2)] border-t border-[var(--app-border)] flex items-center justify-between text-[11px] text-[var(--app-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono app-kbd px-1 rounded">↑</kbd>
              <kbd className="font-mono app-kbd px-1 rounded">↓</kbd> navighează
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono app-kbd px-1 rounded">↵</kbd> selectează
            </span>
          </div>
          <div>
            Apasă <kbd className="font-mono app-kbd px-1 rounded text-[var(--app-text-strong)] font-bold">Ctrl + K</kbd> oricând
          </div>
        </div>
      </div>
    </div>
  );
}
