import React, { useState, useMemo } from "react";
import { Plus, ChevronRight, User, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { getStatusDefinition, isPieseComandateStatus, getStatusShortLabel } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import { telLink, formatProgramareShort } from "../../utils/dateUtils";
import MobilePieseSositeRow from "./MobilePieseSositeRow";
import { isSearchHighlighted } from "../../utils/searchUtils";

export default function MobileClaimsList({
  claims,
  allClaimsCount,
  searchQuery = "",
  onOpen,
  onNew,
  onPatch,
  canEditFn,
  onNotify,
  highlightClaimIds = null,
}) {
  const [statusFilter, setStatusFilter] = useState("toate");

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      const key = getStatusDefinition(c.status).key;
      if (statusFilter === "deschidere" && key !== "deschidere") return false;
      if (statusFilter === "in_lucru" && key !== "in_lucru") return false;
      if (statusFilter === "programat" && key !== "programat") return false;
      if (statusFilter === "accept_plata" && key !== "accept_plata") return false;
      if (statusFilter === "piese_comandate" && !isPieseComandateStatus(c.status)) return false;
      if (statusFilter === "piese_sosite" && !(c.pieseSosite && !c.dataProgramare)) return false;
      if (statusFilter === "facturat" && key !== "facturat") return false;
      if (statusFilter === "blocate" && !c.blocat) return false;
      return true;
    });
  }, [claims, statusFilter]);

  const pieseSositeCount = useMemo(
    () => claims.filter((c) => c.pieseSosite && !c.dataProgramare).length,
    [claims]
  );

  const handleTogglePieseSosite = async (claim, val) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    const ok = await onPatch?.(claim.id, { pieseSosite: val });
    if (ok === false) return;
    onNotify?.(
      val
        ? "Piese marcate ca sosite — apasă Programare ca să alegi data."
        : "Bifa „Piese sosite” a fost stearsă.",
      val ? "success" : "info"
    );
  };

  const handleScheduleFromPiese = async (claim, iso) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return false;
    }
    const ok = await onPatch?.(claim.id, { dataProgramare: iso });
    if (ok === false) return false;
    onNotify?.(
      `Programare salvată: ${String(iso).slice(0, 10)} ${String(iso).slice(11, 16) || ""}`.trim(),
      "success"
    );
    return true;
  };
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
    <div className="m-ui space-y-3 flex flex-col flex-1 min-h-0 pb-4">
      <header className="m-ui-hero">
        <div className="flex items-end justify-between gap-3">
          <h1 className="m-ui-title">Dosare</h1>
          <div className="flex items-center gap-2">
            <span className="m-ui-count">{filtered.length}</span>
            <button
              type="button"
              onClick={onNew}
              className="m-fab-plus m-press"
              aria-label="Dosar nou"
              title="Dosar nou"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {[
            { id: "toate", label: `Toate (${allClaimsCount ?? claims.length})` },
            { id: "deschidere", label: "AIR" },
            { id: "piese_comandate", label: "Piese" },
            { id: "piese_sosite", label: `Piese sosite (${pieseSositeCount})` },
            { id: "programat", label: "Programări" },
            { id: "in_lucru", label: "Reparație" },
            { id: "accept_plata", label: "AP" },
            { id: "facturat", label: "Facturat" },
            { id: "blocate", label: "Blocate" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`m-filter-pill px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${
                statusFilter === id ? "is-active" : ""
              }`}
            >
              {label}
            </button>
          ))}
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {groupedClaims.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] space-y-3">
            <p className="m-type-body text-[var(--app-text-strong)]">
              {searchQuery.trim() || statusFilter !== "toate"
                ? "Niciun dosar pentru filtrele alese"
                : "Niciun dosar încă"}
            </p>
            <p className="m-type-body m-muted">
              {searchQuery.trim() || statusFilter !== "toate"
                ? "Șterge căutarea (bară jos) sau schimbă filtrul de status."
                : "Creează un dosar nou ca să poți fotografia pe teren."}
            </p>
            {onNew && (!searchQuery.trim() && statusFilter === "toate") && (
              <button
                type="button"
                onClick={onNew}
                className="m-fab-plus m-press mx-auto"
                aria-label="Dosar nou"
                title="Dosar nou"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            )}
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
                  id={`mobile-claim-${c.id}`}
                  onClick={() => onOpen(c)}
                  className={`m-claim-card p-3.5 cursor-pointer transition-all space-y-2 active:scale-[0.99] ${isSearchHighlighted(c.id, highlightClaimIds) ? "is-search-highlight" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="m-plate">
                        {c.numarInmatriculare || "—"}
                      </span>
                      {c.blocat && <span className="m-ui-chip is-danger">BLOCAT</span>}
                    </div>
                    <span className="m-ui-chip">
                      {sDef.num}. {getStatusShortLabel(c.status) || sDef.label}
                    </span>
                  </div>

                  {isPieseComandateStatus(c.status) && (
                    <MobilePieseSositeRow
                      claim={c}
                      canEdit={!canEditFn || canEditFn(c)}
                      onToggle={handleTogglePieseSosite}
                      onSchedule={handleScheduleFromPiese}
                    />
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="m-vehicle-model truncate">{c.marcaModel || "—"}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === "programat" && c.dataProgramare && (
                        <span className="m-type-body font-mono text-[var(--app-text-strong)]">
                          {formatProgramareShort(c.dataProgramare)}
                        </span>
                      )}
                      <DosarNumber
                        value={c.numarDosar}
                        onNotify={onNotify}
                        prefix=""
                        className="m-dosar-num hover:text-[var(--app-accent)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--app-border)]">
                    <div className="flex items-center gap-1.5 m-muted min-w-0">
                      <User size={14} className="shrink-0" />
                      <span className="m-type-body text-[var(--app-text)] truncate max-w-[140px]">{c.client || "Client neprecizat"}</span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a href={telLink(phone)} className="m-call-btn p-1.5">
                            <Phone size={12} />
                          </a>
                        </>
                      )}
                      <ChevronRight size={16} className="m-brief-chevron" />
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
                onNotify={onNotify}
                canEditFn={canEditFn}
                onTogglePieseSosite={handleTogglePieseSosite}
                onScheduleFromPiese={handleScheduleFromPiese}
              />
            );
          })
        )}
      </div>

    </div>
  );
}

function MobileStackedGroupCard({ group, onOpen, onNotify, canEditFn, onTogglePieseSosite, onScheduleFromPiese }) {
  const [expanded, setExpanded] = useState(false);
  const first = group[0];
  const plate = first.numarInmatriculare || "—";
  const subline = [first.client, first.marcaModel].filter(Boolean).join(" · ") || `${group.length} dosare pe același vehicul`;

  return (
    <div className="m-stack-group rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="m-stack-head w-full flex items-center gap-3 p-3.5 text-left cursor-pointer select-none active:bg-[var(--app-surface-2)] transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="m-plate tracking-wide">
              {plate}
            </span>
            <span className="m-stack-badge m-type-body px-2 py-0.5 rounded-full">
              ×{group.length}
            </span>
          </div>
          {!expanded && (
            <p className="m-vehicle-model mt-1 leading-snug truncate">{subline}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1 m-type-body text-[var(--app-muted)]">
          <span>{expanded ? "Restrânge" : "Extinde"}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="m-stack-items border-t border-[var(--app-border)] p-2 space-y-2 bg-[var(--app-surface-2)]/40">
          {group.map((c) => {
            const sDef = getStatusDefinition(c.status);
            const phone = c.telefonClient || "";

            return (
              <div
                key={c.id}
                onClick={() => onOpen(c)}
                className="m-stack-item rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 cursor-pointer space-y-2 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <DosarNumber
                      value={c.numarDosar}
                      onNotify={onNotify}
                      empty="Fără nr."
                      prefix=""
                      className="m-dosar-num uppercase truncate hover:text-[var(--app-accent)]"
                    />
                    {c.blocat && (
                      <span className="m-ui-chip is-danger shrink-0">
                        BLOCAT
                      </span>
                    )}
                  </div>
                  <span className="m-ui-chip shrink-0" title={sDef.label}>
                    {sDef.num}. {getStatusShortLabel(c.status)}
                  </span>
                </div>

                {isPieseComandateStatus(c.status) && (
                  <MobilePieseSositeRow
                    claim={c}
                    canEdit={!canEditFn || canEditFn(c)}
                    onToggle={onTogglePieseSosite}
                    onSchedule={onScheduleFromPiese}
                    compact
                  />
                )}

                <div className="flex items-center justify-between m-type-body text-[var(--app-muted)]">
                  <span className="m-vehicle-model truncate">{c.marcaModel || c.client || "—"}</span>
                  {c.status === "programat" && c.dataProgramare && (
                    <span className="m-type-body font-mono text-[var(--app-text-strong)] shrink-0">
                      {formatProgramareShort(c.dataProgramare)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[var(--app-border)]">
                  <div className="flex items-center gap-1.5 text-[var(--app-muted)] min-w-0">
                    <User size={14} className="shrink-0" />
                    <span className="m-type-body text-[var(--app-text)] truncate max-w-[140px]">
                      {c.client || "Client neprecizat"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {phone && (
                      <>
                        <WhatsAppButton phone={phone} claim={c} size={11} />
                        <a href={telLink(phone)} className="m-call-btn p-1.5 rounded-lg">
                          <Phone size={12} />
                        </a>
                      </>
                    )}
                    <ChevronRight size={16} className="text-[var(--app-muted)]" />
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
