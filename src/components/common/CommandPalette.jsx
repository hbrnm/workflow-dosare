import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, FileText, Layers, Sunrise, List, BarChart3, CalendarClock,
  Wallet, Plus, Download, X, CornerDownLeft, Camera, Sparkles,
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import { claimMatchesSearch } from "../../utils/searchUtils";

/**
 * Calculează un scor de relevanță pentru sortarea inteligentă a căutării
 */
function scoreClaimMatch(claim, rawQuery) {
  const query = String(rawQuery || "").trim().toLowerCase();
  if (!query) return 0;

  const cleanQuery = query.replace(/\s+/g, "");
  const plate = String(claim.numarInmatriculare || "").toLowerCase().replace(/\s+/g, "");
  const dosar = String(claim.numarDosar || "").toLowerCase();
  const dosarAsig = String(claim.nrDosarAsigurator || "").toLowerCase();
  const client = String(claim.client || "").toLowerCase();
  const model = String(claim.marcaModel || "").toLowerCase();
  const vin = String(claim.vin || "").toLowerCase();
  const asig = String(claim.asigurator || "").toLowerCase();

  let score = 0;

  // 1. Potrivire pe Număr Înmatriculare (prioritate maximă)
  if (plate === cleanQuery) score += 1000;
  else if (plate.startsWith(cleanQuery)) score += 800;
  else if (plate.includes(cleanQuery)) score += 600;

  // 2. Potrivire pe Număr Dosar (daună / asigurător)
  if (dosar === query || dosarAsig === query) score += 900;
  else if (dosar.startsWith(query) || dosarAsig.startsWith(query)) score += 750;
  else if (dosar.includes(query) || dosarAsig.includes(query)) score += 550;

  // 3. Potrivire pe Nume Client / Proprietar
  if (client.startsWith(query)) score += 500;
  else if (client.includes(query)) score += 400;

  // 4. Potrivire pe Marcă & Model / VIN
  if (model.startsWith(query)) score += 350;
  else if (model.includes(query)) score += 300;
  if (vin.includes(cleanQuery)) score += 350;

  // 5. Potrivire pe Asigurător
  if (asig.startsWith(query)) score += 250;
  else if (asig.includes(query)) score += 200;

  return score;
}

export default function CommandPalette({
  isOpen,
  onClose,
  claims = [],
  initialQuery = "",
  onQueryChange = null,
  onOpenClaim,
  onSelectClaim,
  onSwitchView,
  onNavigate,
  onOpenNewClaim,
  onOpenSettings,
  onOpenAlerts,
  onOpenBlocked,
  onOpenQuickCapture,
  onOpenAiScan,
  onExportExcel,
  onExportPdf,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const wasOpenRef = useRef(false);

  const handleOpenTargetClaim = onOpenClaim || onSelectClaim;
  const handleSwitchTargetView = onSwitchView || onNavigate;

  // Prefill + focus când se deschide paleta
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initial = String(initialQuery || "");
      setQuery(initial);
      setSelectedIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 40);
      wasOpenRef.current = true;
      return () => window.clearTimeout(t);
    }
    if (!isOpen) {
      wasOpenRef.current = false;
    }
    return undefined;
  }, [isOpen, initialQuery]);

  const updateQuery = (next) => {
    setQuery(next);
    setSelectedIndex(0);
    if (typeof onQueryChange === "function") {
      onQueryChange(next);
    }
  };

  // Listener global Ctrl+K / Cmd+K
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

  // Elemente filtrate & sortate inteligent după relevanță
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Tab-uri Navigare
    const views = [
      { type: "view", id: "flux", label: "Flux Operațional", sub: "Tabloul pe 6 stadii de atelier", icon: Layers },
      { type: "view", id: "brief", label: "Brieful Zilei", sub: "Alerte, sosiri azi & puls atelier", icon: Sunrise },
      { type: "view", id: "list", label: "Tabel Dosare", sub: "Listă detaliată cu filtre & sortare", icon: List },
      { type: "view", id: "programator", label: "Calendar Service", sub: "Agendă programări săptămânală & lunară", icon: CalendarClock },
      { type: "view", id: "dashboard", label: "Statistici & Grafice", sub: "Indicatori cheie de performanță", icon: BarChart3 },
      { type: "view", id: "rapoarte", label: "Rapoarte Financiar", sub: "Marjă piese & venit manoperă", icon: Wallet },
    ];

    // Acțiuni rapide
    const actions = [
      { type: "action", id: "new", label: "Creează Dosar Nou", sub: "Adaugă un dosar de daună în sistem", icon: Plus, handler: onOpenNewClaim },
      { type: "action", id: "capture", label: "Poze & Documente Rapid", sub: "Captură foto, scan acte, cameră live", icon: Camera, handler: onOpenQuickCapture },
      { type: "action", id: "ai", label: "Importă Deviz (Audatex / DAT)", sub: "Extrage automat datele din devize", icon: FileText, handler: onOpenAiScan },
      { type: "action", id: "alerts", label: "Centru de Alerte", sub: "Deschide alertele active și acțiunile urgente", icon: Sparkles, handler: onOpenAlerts },
      { type: "action", id: "blocked", label: "Dosare Blocate", sub: "Vezi inventarul de dosare blocate", icon: FileText, handler: onOpenBlocked },
      { type: "action", id: "settings", label: "Setări Service", sub: "Configurează tarife, capacitate și date atelier", icon: FileText, handler: onOpenSettings },
      { type: "action", id: "excel", label: "Exportă Excel", sub: "Descarcă toate dosarele în format .xlsx", icon: Download, handler: onExportExcel },
      { type: "action", id: "pdf", label: "Exportă PDF", sub: "Descarcă toate dosarele în format .pdf", icon: FileText, handler: onExportPdf },
    ].filter((a) => typeof a.handler === "function");

    if (!q) {
      const recentClaims = claims.slice(0, 5).map((c) => ({ type: "claim", claim: c, score: 0 }));
      return [...recentClaims, ...views.slice(0, 4), ...actions];
    }

    // Filtrare & Sortare după relevanță
    const scoredClaims = claims
      .filter((c) => claimMatchesSearch(c, q))
      .map((c) => ({
        type: "claim",
        claim: c,
        score: scoreClaimMatch(c, q),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const matchedViews = views.filter(
      (v) => v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q)
    );

    const matchedActions = actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q)
    );

    return [...scoredClaims, ...matchedViews, ...matchedActions];
  }, [
    query,
    claims,
    onOpenNewClaim,
    onOpenQuickCapture,
    onOpenAiScan,
    onOpenAlerts,
    onOpenBlocked,
    onOpenSettings,
    onExportExcel,
    onExportPdf,
  ]);

  const executeItem = (item) => {
    if (!item) return;

    if (item.type === "claim" && item.claim) {
      if (typeof handleOpenTargetClaim === "function") {
        handleOpenTargetClaim(item.claim);
      }
    } else if (item.type === "view") {
      if (typeof handleSwitchTargetView === "function") {
        handleSwitchTargetView(item.id);
      }
    } else if (item.type === "action" && item.handler) {
      if (typeof item.handler === "function") {
        item.handler();
      }
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

  // Navigare tastatură
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
      if (typeof onClose === "function") onClose();
    }
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
              className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text)] mr-2 cursor-pointer"
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
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
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
                    onMouseDown={(e) => e.preventDefault()}
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
                          <span className="font-mono font-bold text-[13px]">{c.numarDosar || "Fără nr."}</span>
                          <span className="text-[var(--app-muted)] truncate">
                            — {c.client || "Client nespecificat"}
                          </span>
                        </div>
                        <div className="text-[11px] truncate flex items-center gap-2 mt-0.5 text-[var(--app-muted)]">
                          <span className="font-mono font-bold uppercase text-[var(--app-text-strong)]">{c.numarInmatriculare || "—"}</span>
                          <span>· {c.marcaModel || "—"}</span>
                          {c.asigurator && <span>· {c.asigurator}</span>}
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
                    onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
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
                            ? "bg-white/20 text-white"
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
                              isSelected ? "bg-white/20 text-white" : "bg-[var(--app-surface-muted)] text-[var(--app-muted)]"
                            }`}
                          >
                            ACȚIUNE
                          </span>
                        </div>
                        <div className={`text-[11px] ${isSelected ? "text-white/80" : "text-[var(--app-muted)]"}`}>
                          {item.sub}
                        </div>
                      </div>
                    </div>
                    {isSelected && <CornerDownLeft size={14} className="text-white" />}
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Footer / Shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] text-[11px] text-[var(--app-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono app-kbd px-1 rounded">↑</kbd>
              <kbd className="font-mono app-kbd px-1 rounded">↓</kbd>
              navighează
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono app-kbd px-1 rounded">↵</kbd>
              selectează
            </span>
          </div>
          <div className="text-[10.5px]">
            Apasă <kbd className="font-mono app-kbd px-1 rounded text-[var(--app-text-strong)] font-bold">Ctrl + K</kbd> oricând
          </div>
        </div>
      </div>
    </div>
  );
}
