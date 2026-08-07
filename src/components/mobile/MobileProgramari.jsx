import React, { useState, useMemo } from "react";
import {
  CalendarClock, Clock, Car, User, Phone,
  Calendar, ChevronRight, Edit3, Save, Wrench, XCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { telLink, todayISO } from "../../utils/dateUtils";
import { getStatusDefinition, isProgramatorClaim } from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import { groupClaimsByPlateAndSchedule } from "../../utils/plateSchedule";

/**
 * Aceeași sursă de adevăr ca Programatorul desktop:
 * doar dosare cu dataProgramare + status în PROGRAMATOR_VISIBLE_STATUSES.
 * Status side-effects (programat / în lucru / anulare) vin din patchClaim.
 */
export default function MobileProgramari({ claims, onOpen, onPatch, canEditFn, onNotify }) {
  const todayStr = todayISO();
  const [filterMode, setFilterMode] = useState("viitoare"); // "azi" | "viitoare" | "toate"
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("09:00");

  const programari = useMemo(() => {
    return claims
      .filter(isProgramatorClaim)
      .sort((a, b) => (a.dataProgramare || "").localeCompare(b.dataProgramare || ""));
  }, [claims]);

  const countAzi = useMemo(
    () => programari.filter((c) => c.dataProgramare.slice(0, 10) === todayStr).length,
    [programari, todayStr]
  );
  const countViitoare = useMemo(
    () => programari.filter((c) => c.dataProgramare.slice(0, 10) >= todayStr).length,
    [programari, todayStr]
  );

  const filteredProgramari = useMemo(() => {
    if (filterMode === "azi") {
      return programari.filter((c) => c.dataProgramare.slice(0, 10) === todayStr);
    }
    if (filterMode === "viitoare") {
      return programari.filter((c) => c.dataProgramare.slice(0, 10) >= todayStr);
    }
    return programari;
  }, [programari, filterMode, todayStr]);

  const groupedProgramari = useMemo(
    () => groupClaimsByPlateAndSchedule(filteredProgramari),
    [filteredProgramari]
  );

  const handleStartEdit = (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      if (onNotify) onNotify("Poți modifica doar programările de pe dosarele tale.", "error");
      return;
    }
    setEditingClaimId(claim.id);
    if (claim.dataProgramare) {
      setEditDate(claim.dataProgramare.slice(0, 10));
      setEditTime(claim.dataProgramare.slice(11, 16) || "09:00");
    } else {
      setEditDate(todayStr);
      setEditTime("09:00");
    }
  };

  const handleSaveProgramare = async (claimId) => {
    if (!editDate) {
      if (onNotify) onNotify("Selectează o dată validă pentru programare.", "error");
      return;
    }
    try {
      const fullIso = `${editDate}T${editTime || "09:00"}:00`;
      // Doar data — side-effect status (programat / păstrează în lucru) e în patchClaim
      const ok = await onPatch(claimId, { dataProgramare: fullIso });
      if (ok === false) return;
      setEditingClaimId(null);
      if (onNotify) onNotify(`Programare salvată: ${editDate} ${editTime || "09:00"}`, "success");
    } catch (err) {
      if (onNotify) onNotify("Eroare la salvare programare: " + err.message, "error");
    }
  };

  const handleMarkInLucru = async (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    const ok = await onPatch(claim.id, { status: "in_lucru", adusaFizic: true });
    if (ok !== false) onNotify?.('Dosar mutat în „În lucru".', "success");
  };

  const handleClearProgramare = async (claim) => {
    if (canEditFn && !canEditFn(claim)) {
      onNotify?.("Poți modifica doar dosarele tale.", "error");
      return;
    }
    if (!window.confirm("Anulezi programarea pentru acest dosar?")) return;
    const ok = await onPatch(claim.id, { dataProgramare: null });
    if (ok !== false) onNotify?.("Programare anulată.", "success");
  };

  return (
    <div className="m-ui space-y-3 flex flex-col flex-1 min-h-0 pb-4">
      <header className="m-ui-hero">
        <div className="flex items-end justify-between gap-3">
          <h1 className="m-ui-title">Programări</h1>
          <span className="m-ui-count">{filteredProgramari.length}</span>
        </div>
      </header>

      <div className="m-brief-tiles" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "0.45rem" }}>
        {[
          { key: "azi", label: "Azi", count: countAzi, tone: "accent" },
          { key: "viitoare", label: "Viitoare", count: countViitoare, tone: "steel" },
          { key: "toate", label: "Toate", count: programari.length, tone: "ok" },
        ].map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setFilterMode(tile.key)}
            className={`m-brief-tile tone-${tile.tone} ${filterMode === tile.key ? "is-active" : ""}`}
            style={{ minHeight: "4.25rem", padding: "0.6rem 0.65rem" }}
          >
            <span className="m-brief-tile-label">{tile.label}</span>
            <span className="m-brief-tile-count">{tile.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {filteredProgramari.length === 0 ? (
          <div className="m-ui-panel m-brief-empty">
            <Calendar size={24} className="mx-auto m-brief-empty-icon" />
            <div className="font-bold text-[13px]">
              {filterMode === "azi"
                ? "Nicio programare azi"
                : filterMode === "viitoare"
                  ? "Nicio programare viitoare"
                  : "Nicio programare"}
            </div>
            <p className="text-[11.5px] m-muted font-semibold">
              {filterMode === "azi"
                ? "Verifică „Viitoare” sau deschide un dosar ca să setezi data."
                : "Programezi din dosar — pe teren poți trece rapid în lucru."}
            </p>
            {filterMode === "azi" && countViitoare > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode("viitoare")}
                className="m-btn-primary inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-extrabold"
              >
                Vezi viitoare ({countViitoare})
              </button>
            )}
          </div>
        ) : (
          groupedProgramari.map((group) => {
            const c = group[0];
            const stacked = group.length > 1;
            const isEditing = group.some((g) => g.id === editingClaimId);
            const editingClaim = group.find((g) => g.id === editingClaimId) || c;
            const phone = c.telefonClient || "";
            const statusLabel = getStatusDefinition(c.status).label;
            const canEdit = !canEditFn || canEditFn(c);
            const showInLucru = canEdit && group.some((g) => g.status === "programat");
            const showClear = canEdit && group.some((g) => g.status === "programat");

            return (
              <MobileProgramareStackCard
                key={stacked ? `stack-${c.id}` : c.id}
                group={group}
                lead={c}
                stacked={stacked}
                isEditing={isEditing}
                editingClaim={editingClaim}
                phone={phone}
                statusLabel={statusLabel}
                canEdit={canEdit}
                showInLucru={showInLucru}
                showClear={showClear}
                editDate={editDate}
                editTime={editTime}
                setEditDate={setEditDate}
                setEditTime={setEditTime}
                setEditingClaimId={setEditingClaimId}
                onStartEdit={handleStartEdit}
                onSaveProgramare={handleSaveProgramare}
                onMarkInLucru={handleMarkInLucru}
                onClearProgramare={handleClearProgramare}
                onOpen={onOpen}
              />
            );
          })
        )}
      </div>

    </div>
  );
}

function MobileProgramareStackCard({
  group,
  lead: c,
  stacked,
  isEditing,
  editingClaim,
  phone,
  statusLabel,
  canEdit,
  showInLucru,
  showClear,
  editDate,
  editTime,
  setEditDate,
  setEditTime,
  setEditingClaimId,
  onStartEdit,
  onSaveProgramare,
  onMarkInLucru,
  onClearProgramare,
  onOpen,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
              <div className="m-ui-panel m-ui-panel-pad space-y-2.5">
                <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="m-ui-chip is-time">
                      <Clock size={11} />
                      {c.dataProgramare.slice(11, 16) || "08:00"}
                    </span>
                    <span className="m-plate">
                      {c.numarInmatriculare || "—"}
                    </span>
                    {stacked && (
                      <span className="m-ui-chip is-accent">×{group.length}</span>
                    )}
                  </div>
                  <span className="m-ui-chip">
                    {c.dataProgramare.slice(0, 10)}
                  </span>
                </div>

                <div className="space-y-1 text-[11.5px]">
                  <div className="flex items-center justify-between m-muted font-semibold">
                    <span className="truncate flex items-center gap-1 m-vehicle-model">
                      <Car size={13} className="text-[var(--app-accent)] shrink-0" />
                      {c.marcaModel || "Model nespecificat"}
                    </span>
                    {!stacked && (
                      <span className="m-dosar-num">
                        {c.numarDosar || "—"}
                      </span>
                    )}
                  </div>
                  {stacked ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 m-muted text-[11px] font-semibold py-0.5"
                    >
                      <span className="truncate font-mono">
                        {group.map((g) => `#${g.numarDosar || "?"}`).join(" · ")}
                      </span>
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold">
                        {expanded ? "Restrânge" : "Extinde"}
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2 m-muted text-[11px]">
                      <span className="truncate flex items-center gap-1">
                        <User size={12} className="shrink-0" />
                        {c.client || "Client neintrodus"}
                      </span>
                      <span className="m-ui-chip">{statusLabel}</span>
                    </div>
                  )}
                </div>

                {stacked && expanded && (
                  <div className="space-y-1.5 border-t border-[var(--app-border)] pt-2">
                    {group.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onOpen(g)}
                        className="m-ui-select-row"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-[12px] text-[var(--app-text-strong)]">
                            #{g.numarDosar || "—"}
                          </div>
                          <div className="text-[10.5px] m-muted truncate">
                            {g.client || "—"} · {getStatusDefinition(g.status).label}
                          </div>
                        </div>
                        <ChevronRight size={14} className="m-brief-chevron shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {isEditing ? (
                  <div className="bg-[var(--app-surface-2)] border border-[var(--app-accent)]/50 p-2.5 rounded-xl space-y-2">
                    <div className="text-[10.5px] font-bold text-[var(--app-accent)] flex items-center gap-1">
                      <Edit3 size={12} /> Modifică Data &amp; Ora{stacked ? " (toate dosarele pe mașină)" : ""}:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg p-1.5 text-[12px] font-bold text-[var(--app-text)]"
                      />
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg p-1.5 text-[12px] font-bold text-[var(--app-text)]"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingClaimId(null)}
                        className="m-brief-ghost-btn px-2.5 py-1"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        onClick={() => onSaveProgramare(editingClaim.id)}
                        className="m-btn-primary flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-extrabold"
                      >
                        <Save size={12} /> Salvează
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[var(--app-border)] space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {phone && (
                          <>
                            <WhatsAppButton phone={phone} claim={c} size={11} />
                            <a
                              href={telLink(phone)}
                              className="m-call-btn flex items-center gap-1 px-2 py-1 text-[10.5px] font-bold"
                              title={`Sună la ${phone}`}
                            >
                              <Phone size={11} /> Apel
                            </a>
                          </>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onStartEdit(c)}
                            className="m-brief-ghost-btn flex items-center gap-1"
                          >
                            <Edit3 size={11} /> Data
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => (stacked ? setExpanded(true) : onOpen(c))}
                        className="m-btn-primary flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      >
                        <span>{stacked ? "Dosare" : "Deschide"}</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {(showInLucru || showClear) && (
                      <div className="flex items-center gap-1.5">
                        {showInLucru && (
                          <button
                            type="button"
                            onClick={() => onMarkInLucru(c)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[11px] font-extrabold"
                          >
                            <Wrench size={12} /> În lucru
                          </button>
                        )}
                        {showClear && (
                          <button
                            type="button"
                            onClick={() => onClearProgramare(c)}
                            className="m-brief-ghost-btn flex items-center justify-center gap-1 px-2.5 py-1.5"
                          >
                            <XCircle size={12} /> Anulează prog.
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
  );
}
