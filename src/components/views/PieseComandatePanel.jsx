import React, { useMemo, useState } from "react";
import { PackageCheck, Clock, Search, Filter } from "lucide-react";
import { isPieseComandateStatus, getPhaseColors } from "../../constants/config";
import { PhaseCardRedesign } from "./FluxOperational";

export default function PieseComandatePanel({
  claims,
  onOpenClaim,
  onPatchClaim,
  onNotify,
  canEditFn,
  pragRidicare,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const relevantClaims = useMemo(() => {
    let filtered = claims.filter((c) => isPieseComandateStatus(c.status));
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => 
        c.numarDosar?.toLowerCase().includes(lower) ||
        c.numarInmatriculare?.toLowerCase().includes(lower) ||
        c.marcaModel?.toLowerCase().includes(lower) ||
        c.client?.toLowerCase().includes(lower) ||
        c.asigurator?.toLowerCase().includes(lower)
      );
    }
    
    return filtered;
  }, [claims, searchTerm]);

  const pieseInAsteptare = useMemo(() => {
    return relevantClaims.filter(c => !c.pieseSosite);
  }, [relevantClaims]);

  const pieseSosite = useMemo(() => {
    return relevantClaims.filter(c => c.pieseSosite);
  }, [relevantClaims]);

  const handleTogglePieseSosite = async (claim, val) => {
    if (onPatchClaim) {
      await onPatchClaim(claim.id, { pieseSosite: val });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--app-bg)]">
      <div className="bg-[var(--app-surface)] border-b border-[var(--app-border)] p-4 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-[var(--app-text-strong)] flex items-center gap-2">
            <PackageCheck className="text-[var(--app-accent)]" /> 
            Logistică Piese
          </h2>
          <p className="text-[12px] text-[var(--app-muted)]">
            Urmărirea stadiului pieselor pentru dosarele aflate în recepție.
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-[var(--app-muted)]" />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]"
            placeholder="Caută dosar, auto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 p-4 overflow-x-auto min-h-0">
        <div className="flex gap-4 h-full min-w-[700px]">
          {/* Coloana Piese În Așteptare */}
          <div className="flex-1 flex flex-col bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden">
            <div className="p-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                În Așteptare
              </h3>
              <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full text-[11px]">
                {pieseInAsteptare.length}
              </span>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {pieseInAsteptare.length > 0 ? (
                pieseInAsteptare.map(c => (
                  <PhaseCardRedesign 
                    key={c.id} 
                    claim={c} 
                    onOpen={onOpenClaim} 
                    onTogglePieseSosite={handleTogglePieseSosite}
                    canEdit={canEditFn?.(c)}
                    pragRidicare={pragRidicare}
                    onNotify={onNotify}
                    hideStatusSelect
                  />
                ))
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-[var(--app-muted)] text-sm border-2 border-dashed border-[var(--app-border-soft)] rounded-lg">
                  Niciun dosar în așteptare.
                </div>
              )}
            </div>
          </div>

          {/* Coloana Piese Sosite */}
          <div className="flex-1 flex flex-col bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden">
            <div className="p-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-2">
                <PackageCheck size={16} className="text-emerald-500" />
                Sosite
              </h3>
              <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full text-[11px]">
                {pieseSosite.length}
              </span>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {pieseSosite.length > 0 ? (
                pieseSosite.map(c => (
                  <PhaseCardRedesign 
                    key={c.id} 
                    claim={c} 
                    onOpen={onOpenClaim} 
                    onTogglePieseSosite={handleTogglePieseSosite}
                    canEdit={canEditFn?.(c)}
                    pragRidicare={pragRidicare}
                    onNotify={onNotify}
                    hideStatusSelect
                  />
                ))
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-[var(--app-muted)] text-sm border-2 border-dashed border-[var(--app-border-soft)] rounded-lg">
                  Niciun dosar cu piese sosite.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
