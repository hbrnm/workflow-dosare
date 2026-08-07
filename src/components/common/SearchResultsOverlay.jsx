import React, { useEffect, useMemo, useRef } from "react";
import { Search, X, ChevronRight, User, Car, Phone } from "lucide-react";
import { filterClaimsBySearch } from "../../utils/searchUtils";
import { getStatusDefinition, getStatusShortLabel } from "../../constants/config";
import { formatProgramareShort, telLink } from "../../utils/dateUtils";
import DosarNumber from "./DosarNumber";
import WhatsAppButton from "./WhatsAppButton";

/**
 * Popup global de rezultate căutare — apare pe orice view/tab când există query.
 */
export default function SearchResultsOverlay({
  query,
  claims,
  onSelect,
  onClear,
  onNotify,
}) {
  const q = (query || "").trim();
  const matches = useMemo(
    () => filterClaimsBySearch(claims, q, { limit: 40 }),
    [claims, q]
  );
  const panelRef = useRef(null);

  useEffect(() => {
    if (!q) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClear?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, onClear]);

  if (!q) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[8vh] sm:pt-[10vh] px-3 sm:px-4 bg-black/45 backdrop-blur-[2px]"
      onClick={() => onClear?.()}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Rezultate căutare"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[78vh] sm:max-h-[72vh] flex flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)] shrink-0">
          <Search size={16} className="text-[var(--app-accent)] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--app-muted)]">
              Căutare globală
            </p>
            <p className="text-[13px] font-extrabold text-[var(--app-text-strong)] truncate">
              „{q}” · {matches.length} {matches.length === 1 ? "dosar" : "dosare"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClear?.()}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text-strong)]"
            title="Închide (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
          {matches.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-1">
              <p className="text-[13px] font-extrabold text-[var(--app-text-strong)]">
                Niciun dosar găsit
              </p>
              <p className="text-[12px] text-[var(--app-muted)] font-semibold">
                Încearcă nr. auto, client, dosar, VIN sau asigurător.
              </p>
            </div>
          ) : (
            matches.map((c) => {
              const sDef = getStatusDefinition(c.status);
              const phone = c.telefonClient || "";
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect?.(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(c);
                    }
                  }}
                  className="w-full text-left rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 space-y-2 hover:border-[var(--app-accent)] hover:bg-[var(--app-surface-2)]/50 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-extrabold text-[14px] text-[var(--app-text-strong)] uppercase truncate">
                        {c.numarInmatriculare || "—"}
                      </span>
                      {c.blocat && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-[var(--app-danger)] text-white font-bold rounded shrink-0">
                          BLOCAT
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold bg-[var(--app-surface-2)] border border-[var(--app-border)] px-2 py-0.5 rounded text-[var(--app-muted)] shrink-0"
                      title={sDef.label}
                    >
                      {sDef.num}. {getStatusShortLabel(c.status)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[var(--app-muted)]">
                    <span className="truncate flex items-center gap-1.5 min-w-0">
                      <Car size={12} className="shrink-0 text-[var(--app-accent)]" />
                      <span className="truncate">{c.marcaModel || "—"}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === "programat" && c.dataProgramare && (
                        <span className="font-mono text-[11px] font-bold text-[var(--app-text-strong)]">
                          {formatProgramareShort(c.dataProgramare)}
                        </span>
                      )}
                      <DosarNumber
                        value={c.numarDosar}
                        onNotify={onNotify}
                        prefix="#"
                        empty="Fără nr."
                        className="font-mono text-[11px] font-bold text-[var(--app-muted)] hover:text-[var(--app-accent)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--app-border)] text-[11px]">
                    <span className="truncate flex items-center gap-1.5 text-[var(--app-muted)] min-w-0">
                      <User size={12} className="shrink-0" />
                      <span className="font-semibold text-[var(--app-text)] truncate">
                        {c.client || "Client neprecizat"}
                      </span>
                    </span>
                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a
                            href={telLink(phone)}
                            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)]"
                            title={`Sună ${phone}`}
                          >
                            <Phone size={12} />
                          </a>
                        </>
                      )}
                      <ChevronRight size={16} className="text-[var(--app-muted)]" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
