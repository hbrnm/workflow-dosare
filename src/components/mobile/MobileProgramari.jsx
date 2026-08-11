import React, { useState, useMemo } from "react";
import {
  CalendarClock, Clock, Phone,
  Calendar, ChevronRight, Edit3, Save, ChevronDown, ChevronUp,
} from "lucide-react";
import { telLink, todayISO } from "../../utils/dateUtils";
import {
  getStatusDefinition,
  getStatusShortLabel,
  isProgramatorClaim,
  getStageAccent,
} from "../../constants/config";
import WhatsAppButton from "../common/WhatsAppButton";
import DosarNumber from "../common/DosarNumber";
import { countUniqueVehicles, groupClaimsByPlateAndSchedule } from "../../utils/plateSchedule";

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
    () => countUniqueVehicles(programari.filter((c) => c.dataProgramare.slice(0, 10) === todayStr)),
    [programari, todayStr]
  );
  const countViitoare = useMemo(
    () => countUniqueVehicles(programari.filter((c) => c.dataProgramare.slice(0, 10) >= todayStr)),
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
    if (ok !== false) onNotify?.('Dosar mutat în „Reparație".', "success");
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
          <span className="m-ui-count">{countUniqueVehicles(filteredProgramari)}</span>
        </div>
      </header>

      <div className="m-brief-alert-stage-filters" role="toolbar" aria-label="Filtre programări">
        {[
          { key: "azi", label: "Azi", count: countAzi },
          { key: "viitoare", label: "Viitoare", count: countViitoare },
          { key: "toate", label: "Toate", count: countUniqueVehicles(programari) },
        ].map((chip) => {
          const active = filterMode === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilterMode(chip.key)}
              className={`m-brief-alert-stage-chip m-press ${active ? "is-active" : ""}`}
              aria-pressed={active}
            >
              <span>{chip.label}</span>
              <span className="m-brief-alert-stage-chip-count">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {filteredProgramari.length === 0 ? (
          <div className="m-brief-empty">
            <Calendar size={24} className="mx-auto m-brief-empty-icon" />
            <div className="font-bold text-[13px]">
              {filterMode === "azi"
                ? "Nicio programare azi"
                : filterMode === "viitoare"
                  ? "Nicio programare viitoare"
                  : "Nicio programare"}
            </div>
            <p className="text-[11.5px] m-muted">
              {filterMode === "azi"
                ? "Verifică „Viitoare” sau setează data din dosar."
                : "Programezi din dosar — pe teren poți trece rapid în reparație."}
            </p>
            {filterMode === "azi" && countViitoare > 0 ? (
              <button
                type="button"
                onClick={() => setFilterMode("viitoare")}
                className="m-brief-alert-stage-chip is-active m-press"
              >
                Vezi viitoare · {countViitoare}
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="app-alerte-rows m-brief-alerte-rows m-flow-list">
            {groupedProgramari.map((group) => {
              const c = group[0];
              const stacked = group.length > 1;
              const isEditing = group.some((g) => g.id === editingClaimId);
              const editingClaim = group.find((g) => g.id === editingClaimId) || c;
              const phone = c.telefonClient || "";
              const statusLabel = getStatusShortLabel(c.status);
              const canEdit = !canEditFn || canEditFn(c);
              const showInLucru = canEdit && group.some((g) => g.status === "programat");
              const showClear = canEdit && group.some((g) => g.status === "programat");

              return (
                <li key={stacked ? `stack-${c.id}` : c.id}>
                  <MobileProgramareStackCard
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
                </li>
              );
            })}
          </ul>
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

  const stageAccent = getStageAccent(c.status);
  const timeLabel = c.dataProgramare?.slice(11, 16) || "08:00";
  const dayLabel = c.dataProgramare?.slice(0, 10) || "";
  const subline = stacked
    ? group.map((g) => `#${g.numarDosar || "?"}`).join(" · ")
    : [c.client, c.marcaModel].filter(Boolean).join(" · ");

  return (
    <div className="m-flow-card-wrap">
      <article
        className={`app-alerte-row m-flow-card is-compact ${stageAccent.className}`}
        onClick={() => (stacked ? setExpanded((v) => !v) : onOpen(c))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (stacked) setExpanded((v) => !v);
            else onOpen(c);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="app-alerte-metric is-icon" title={`${dayLabel} ${timeLabel}`.trim()}>
          <Clock size={14} />
        </div>
        <div className="app-alerte-row-body min-w-0">
          <div className="app-alerte-row-main">
            {!stacked ? (
              <DosarNumber
                value={c.numarDosar}
                empty="fără nr."
                className="app-alerte-dosar"
              />
            ) : (
              <span className="m-brief-claim-chip">×{group.length}</span>
            )}
            <span className="app-alerte-plate font-mono font-bold">
              {c.numarInmatriculare || "—"}
            </span>
            <span className="app-alerte-status-chip" title={getStatusDefinition(c.status).label}>
              {statusLabel}
            </span>
            <span className="m-brief-alerte-since">
              {dayLabel} · {timeLabel}
            </span>
          </div>
          {subline ? (
            <p className="m-brief-alerte-why is-muted" title={subline}>
              {subline}
            </p>
          ) : null}
        </div>
        <div className="app-alerte-actions" onClick={(e) => e.stopPropagation()}>
          {phone ? (
            <>
              <WhatsAppButton phone={phone} claim={c} size={11} />
              <a href={telLink(phone)} className="app-alerte-btn-ghost" title="Sună" aria-label="Sună">
                <Phone size={13} />
              </a>
            </>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="app-alerte-btn-ghost"
              onClick={() => onStartEdit(c)}
              title="Modifică data"
              aria-label="Modifică data"
            >
              <Edit3 size={13} />
            </button>
          ) : null}
          {showInLucru ? (
            <button
              type="button"
              className="app-alerte-btn-primary"
              onClick={() => onMarkInLucru(c)}
            >
              Repar.
            </button>
          ) : null}
          {showClear ? (
            <button
              type="button"
              className="app-alerte-btn-secondary"
              onClick={() => onClearProgramare(c)}
              title="Anulează programarea"
            >
              Anulează
            </button>
          ) : null}
          <button
            type="button"
            className="app-alerte-btn-open"
            onClick={() => (stacked ? setExpanded((v) => !v) : onOpen(c))}
            aria-label={stacked ? (expanded ? "Restrânge" : "Extinde") : "Deschide dosarul"}
          >
            {stacked ? (expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : <ChevronRight size={16} />}
          </button>
        </div>
      </article>

      {stacked && expanded ? (
        <ul className="m-stack-flow-list">
          {group.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className={`app-alerte-row m-flow-card is-compact ${getStageAccent(g.status).className}`}
                onClick={() => onOpen(g)}
              >
                <div className="app-alerte-metric is-icon">
                  <CalendarClock size={14} />
                </div>
                <div className="app-alerte-row-body min-w-0">
                  <div className="app-alerte-row-main">
                    <DosarNumber value={g.numarDosar} empty="fără nr." className="app-alerte-dosar" />
                    <span className="app-alerte-status-chip">
                      {getStatusShortLabel(g.status)}
                    </span>
                  </div>
                  <p className="m-brief-alerte-why is-muted">
                    {g.client || "—"}
                  </p>
                </div>
                <div className="app-alerte-actions">
                  <span className="app-alerte-btn-open" aria-hidden>
                    <ChevronRight size={16} />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {isEditing ? (
        <div className="m-brief-schedule" onClick={(e) => e.stopPropagation()}>
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="m-brief-schedule-input"
          />
          <input
            type="time"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            className="m-brief-schedule-input"
          />
          <button
            type="button"
            className="m-brief-ghost-btn m-brief-action-primary"
            onClick={() => onSaveProgramare(editingClaim.id)}
          >
            <Save size={12} /> Salvează
          </button>
          <button
            type="button"
            className="m-brief-ghost-btn"
            onClick={() => setEditingClaimId(null)}
          >
            Anulează
          </button>
        </div>
      ) : null}
    </div>
  );
}
