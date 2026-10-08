import React, { useState, useMemo, useEffect } from "react";
import {
  X, Bell, ChevronRight, CheckCircle2, Phone, CheckCheck, CheckSquare, Square, Loader2,
} from "lucide-react";
import { getStatusDefinition, getStatusShortLabel } from "../../constants/config";
import {
  buildAlertBuckets,
  normalizeAlertTab,
  filterAlertItems,
  getLatestClaimNoteText,
  getAlertMetric,
  alertSeverityClass,
} from "../../utils/alertUtils";
import { telLink } from "../../utils/dateUtils";
import { ALERT_GROUPS, getAlertGroup, countAlertsForGroup } from "../../constants/alertCategories";
import DosarNumber from "../common/DosarNumber";
import WhatsAppButton from "../common/WhatsAppButton";
import ClaimPhoneActions from "../common/ClaimPhoneActions";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";
import { useModalEscape, overlayBackdropCloseProps } from "../../hooks/useModalEscape";

function pickInitialTab(initialTab, counts) {
  const n = normalizeAlertTab(initialTab);
  if (n && n !== "toate" && countAlertsForGroup(counts, n) > 0) return n;
  if (n && n !== "toate") {
    const firstWithAlerts = ALERT_GROUPS.find((c) => countAlertsForGroup(counts, c) > 0);
    if (firstWithAlerts) return firstWithAlerts.key;
    return n;
  }
  const firstWithAlerts = ALERT_GROUPS.find((c) => countAlertsForGroup(counts, c) > 0);
  return firstWithAlerts?.key || "intarzieri";
}

export default function AlerteModal({
  claims = [],
  alertBuckets = null,
  initialTab = "stagnate",
  pragRidicare = 3,
  pragInactivitate = 7,
  onClose,
  onOpenClaim,
  onPatchClaim,
  onPatchClaimsBulk,
  onNotify,
  themeId = "atelier",
  desktopUi = false,
}) {
  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const [activeTab, setActiveTab] = useState(() => pickInitialTab(initialTab, buckets.counts));

  useEffect(() => {
    setActiveTab(pickInitialTab(initialTab, buckets.counts));
    // Doar la deschiderea pe un alt tab din Brief / nav — nu reseta la refresh claims
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const categoriesOrdered = useMemo(() => {
    const withAlerts = [];
    const empty = [];
    ALERT_GROUPS.forEach((cat) => {
      const count = countAlertsForGroup(buckets.counts, cat);
      (count > 0 ? withAlerts : empty).push({ ...cat, count });
    });
    return { withAlerts, empty };
  }, [buckets.counts]);

  const mobileCats = useMemo(() => {
    // Pe mobil: prioritate la cele cu alerte; goalele rămân la final, mai discrete
    return [...categoriesOrdered.withAlerts, ...categoriesOrdered.empty];
  }, [categoriesOrdered]);

  useModalEscape(onClose);
  const backdropProps = overlayBackdropCloseProps(desktopUi, onClose);

  const activeCat = getAlertGroup(activeTab) || ALERT_GROUPS[1];
  const ActiveIcon = activeCat.icon;
  const list = useMemo(
    () => filterAlertItems(buckets.items, activeTab),
    [buckets.items, activeTab]
  );
  const totalAlertsCount = buckets.totalAlertsCount;

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const visibleClaimIds = useMemo(() => {
    return Array.from(new Set(list.map((item) => item.claim?.id).filter(Boolean)));
  }, [list]);

  const allAlertClaimIds = useMemo(() => {
    return Array.from(new Set(buckets.items.map((item) => item.claim?.id).filter(Boolean)));
  }, [buckets.items]);

  const isAllSelected = visibleClaimIds.length > 0 && visibleClaimIds.every((id) => selectedIds.has(id));
  const isSomeSelected = selectedIds.size > 0;

  const toggleSelect = (claimId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleClaimIds));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const ackMultipleClaims = async (claimIds, confirmMessage = null) => {
    if (!claimIds || claimIds.length === 0) return;
    if (confirmMessage && typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }
    setIsBulkProcessing(true);
    try {
      let ok = false;
      if (onPatchClaimsBulk) {
        ok = await onPatchClaimsBulk(claimIds, { alerteAck: true });
      } else if (onPatchClaim) {
        const results = await Promise.all(
          claimIds.map((id) => onPatchClaim(id, { alerteAck: true }))
        );
        ok = results.every(Boolean);
      }
      setSelectedIds(new Set());
      if (onNotify) {
        onNotify(
          ok
            ? `${claimIds.length} ${claimIds.length === 1 ? "alertă ștearsă/rezolvată" : "alerte șterse/rezolvate"}.`
            : "Eroare la ștergerea alertelor.",
          ok ? "success" : "error"
        );
      }
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const ackAlert = async (e, claimId) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    const ok = await onPatchClaim(claimId, { alerteAck: true });
    if (onNotify) {
      onNotify(
        ok
          ? "Alertă ascunsă. Revine automat la următoarea schimbare de status."
          : "Eroare la marcarea alertei.",
        ok ? "success" : "error"
      );
    }
  };

  const openClaim = (c) => {
    // Keep Centrul de Alerte open underneath; dosar stacks in front.
    onOpenClaim?.(c);
  };

  const renderSidebarCat = (cat) => {
    const active = activeTab === cat.key;
    const Icon = cat.icon;
    const empty = cat.count === 0;
    return (
      <button
        key={cat.key}
        type="button"
        onClick={() => setActiveTab(cat.key)}
        className={`app-alerte-cat ${active ? "is-active" : ""} ${empty ? "is-empty" : ""}`}
        style={active ? { "--alerte-cat-accent": cat.hex } : undefined}
        title={cat.label}
      >
        <span className="app-alerte-cat-icon" style={{ color: active ? "inherit" : cat.hex }}>
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <span className="app-alerte-cat-text">
          <span className="app-alerte-cat-label">{cat.label}</span>
          {empty && <span className="app-alerte-cat-hint">0</span>}
        </span>
        <span className={`app-alerte-cat-count ${cat.count > 0 ? "has-items" : ""}`}>
          {cat.count}
        </span>
      </button>
    );
  };

  const renderPillCat = (cat) => {
    const active = activeTab === cat.key;
    const Icon = cat.icon;
    const empty = cat.count === 0;
    return (
      <button
        key={cat.key}
        type="button"
        onClick={() => setActiveTab(cat.key)}
        className={`m-settings-tab app-alerte-pill-tab flex items-center gap-1.5 shrink-0 border-0 ${
          active ? "is-active" : ""
        } ${empty ? "is-empty" : ""}`}
        style={active ? { "--alerte-cat-accent": cat.hex } : undefined}
        title={cat.label}
      >
        <Icon size={14} strokeWidth={2.25} style={{ color: active ? "inherit" : cat.hex }} />
        <span>{cat.label}</span>
        <span className={`m-settings-tab-badge app-alerte-pill-badge ${active ? "is-active" : ""} ${cat.count > 0 ? "has-items" : ""}`}>
          {cat.count}
        </span>
      </button>
    );
  };

  return (
    <div
      className={modalOverlayClass(desktopUi)}
      {...modalOverlayProps(desktopUi, themeId)}
      {...backdropProps}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          // Fixed height on desktop — switching Blocate/Întârzieri/… only scrolls the list
          "app-alerte-panel app-fixed-shell-modal w-full max-w-5xl flex flex-col h-full sm:h-[92vh] sm:max-h-[92vh] max-h-[100dvh] overflow-hidden"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Desktop: classic header bar */}
        {desktopUi ? (
          <div className={modalHeaderClass(desktopUi, "app-alerte-header flex items-center justify-between gap-3 px-4 py-3")}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="app-alerte-header-icon shrink-0">
                <Bell size={18} />
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 className="app-alerte-title app-display">
                  Centrul de Alerte
                </h2>
                <span className={`app-alerte-total ${totalAlertsCount > 0 ? "has-alerts" : ""}`}>
                  {totalAlertsCount === 0
                    ? "0"
                    : `${totalAlertsCount} ${totalAlertsCount === 1 ? "alertă" : "alerte"}`}
                </span>
                {allAlertClaimIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      ackMultipleClaims(
                        allAlertClaimIds,
                        `Sigur dorești să ștergi / marchezi ca rezolvate TOATE cele ${allAlertClaimIds.length} alerte din atelier?`
                      )
                    }
                    disabled={isBulkProcessing}
                    className="app-alerte-btn-clear-all"
                    title="Șterge / marchează ca rezolvate toate alertele din atelier"
                  >
                    {isBulkProcessing ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCheck size={13} />
                    )}
                    <span>Șterge toate ({allAlertClaimIds.length})</span>
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="app-alerte-close shrink-0"
              aria-label="Închide"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          /* Mobile: floating title chip — no full-bleed header slab */
          <div className="app-alerte-mobile-chrome flex items-center justify-between gap-2">
            <div className="app-alerte-mobile-titlepill">
              <span className="app-alerte-mobile-bell" aria-hidden>
                <Bell size={15} />
              </span>
              <h2 className="app-alerte-mobile-heading">Alerte</h2>
              <span className={`app-alerte-total ${totalAlertsCount > 0 ? "has-alerts" : ""}`}>
                {totalAlertsCount === 0
                  ? "0"
                  : `${totalAlertsCount} ${totalAlertsCount === 1 ? "alertă" : "alerte"}`}
              </span>
            </div>
            {allAlertClaimIds.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  ackMultipleClaims(
                    allAlertClaimIds,
                    `Sigur dorești să ștergi / marchezi ca rezolvate TOATE cele ${allAlertClaimIds.length} alerte din atelier?`
                  )
                }
                disabled={isBulkProcessing}
                className="app-alerte-btn-clear-all text-xs"
                title="Șterge / marchează ca rezolvate toate alertele din atelier"
              >
                {isBulkProcessing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCheck size={12} />
                )}
                <span>Șterge tot ({allAlertClaimIds.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile: category pills in the shared settings pill track + close */}
        <div className="m-settings-tabs m-settings-tabs--pill app-alerte-pill-track flex shrink-0 overflow-x-auto scrollbar-thin sm:hidden">
          {mobileCats.map((cat) => renderPillCat(cat))}
          <button
            type="button"
            onClick={onClose}
            className="m-settings-close ml-auto shrink-0"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="app-alerte-body flex flex-1 min-h-0">
          {/* Desktop sidebar */}
          <aside className="app-alerte-sidebar hidden sm:flex">
            {categoriesOrdered.withAlerts.length > 0 && (
              <div className="app-alerte-sidebar-group">
                <p className="app-alerte-sidebar-heading">Necesită atenție</p>
                {categoriesOrdered.withAlerts.map((cat) => renderSidebarCat(cat))}
              </div>
            )}
            {categoriesOrdered.empty.length > 0 && (
              <div className="app-alerte-sidebar-group">
                <p className="app-alerte-sidebar-heading">Fără alerte</p>
                {categoriesOrdered.empty.map((cat) => renderSidebarCat(cat))}
              </div>
            )}
          </aside>

          <section className="app-alerte-main flex-1 min-w-0 flex flex-col min-h-0">
            <div className="app-alerte-section-head flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="app-alerte-section-icon" style={{ color: activeCat.hex }}>
                  <ActiveIcon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="app-alerte-section-title">{activeCat.label}</h3>
                  {list.length > 0 && (
                    <p className="app-alerte-section-meta">
                      {list.length} {list.length === 1 ? "dosar" : "dosare"}
                    </p>
                  )}
                </div>
              </div>

              {list.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="app-alerte-btn-select-all"
                    title={isAllSelected ? "Deselectează tot" : "Selectează toate din această categorie"}
                  >
                    {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    <span>{isAllSelected ? "Deselectează" : "Selectează tot"}</span>
                  </button>

                  {!isSomeSelected && visibleClaimIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        ackMultipleClaims(
                          visibleClaimIds,
                          `Sigur dorești să ștergi / marchezi ca rezolvate toate cele ${visibleClaimIds.length} alerte din „${activeCat.label}”?`
                        )
                      }
                      disabled={isBulkProcessing}
                      className="app-alerte-btn-cat-clear"
                      title={`Șterge toate cele ${visibleClaimIds.length} alerte din ${activeCat.label}`}
                    >
                      {isBulkProcessing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCheck size={13} />
                      )}
                      <span>Rezolvă categoria ({visibleClaimIds.length})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {isSomeSelected && (
              <div className="app-alerte-bulk-bar">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="app-alerte-bulk-count">
                    {selectedIds.size} {selectedIds.size === 1 ? "alertă selectată" : "alerte selectate"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      ackMultipleClaims(
                        Array.from(selectedIds),
                        selectedIds.size > 1
                          ? `Sigur dorești să ștergi / marchezi ca rezolvate cele ${selectedIds.size} alerte selectate?`
                          : null
                      )
                    }
                    disabled={isBulkProcessing}
                    className="app-alerte-btn-bulk-confirm"
                  >
                    {isBulkProcessing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCheck size={14} />
                    )}
                    <span>Șterge / Rezolvă ({selectedIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="app-alerte-btn-bulk-cancel"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            )}

            <div className="app-alerte-list app-fixed-shell-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
              {list.length === 0 ? (
                <div className="app-alerte-empty">
                  <CheckCircle2 size={28} className="text-[var(--app-success)]" />
                  <p>Nicio alertă</p>
                </div>
              ) : (
                <ul className="app-alerte-rows">
                  {list.map((item) => {
                    const c = item.claim;
                    const metric = getAlertMetric(item);
                    const stShort = getStatusShortLabel(c.status);
                    const stFull = getStatusDefinition(c.status).label;
                    const phone = c.telefonClient || "";
                    const showAck = [
                      "stagnate",
                      "inactivitate",
                      "accept_plata",
                      "neridicate",
                      "masini_schimb",
                      "livrare_piese",
                      "piese",
                      "restante",
                    ].includes(item.type);
                    const showFactureaza = item.type === "accept_plata";
                    const noteText =
                      item.noteSnippet || getLatestClaimNoteText(c);

                    return (
                      <li key={item.id}>
                        <article
                          className={`app-alerte-row ${alertSeverityClass(item.severity)} ${
                            selectedIds.has(c.id) ? "is-selected" : ""
                          }`}
                          onClick={() => openClaim(c)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openClaim(c);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <label
                            className="app-alerte-checkbox-wrapper"
                            onClick={(e) => e.stopPropagation()}
                            title={selectedIds.has(c.id) ? "Deselectează" : "Selectează"}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                              className="app-alerte-checkbox"
                              aria-label={`Selectează alerta pentru dosarul ${c.numarDosar || c.numarInmatriculare}`}
                            />
                          </label>

                          {metric ? (
                            <div className="app-alerte-metric" title={metric.hint}>
                              <span className="app-alerte-metric-value">{metric.value}</span>
                              <span className="app-alerte-metric-unit">{metric.unit}</span>
                            </div>
                          ) : (
                            <div className="app-alerte-metric is-icon" style={{ color: activeCat.hex }}>
                              <ActiveIcon size={18} />
                            </div>
                          )}

                          <div className="app-alerte-row-body min-w-0">
                            <div className="app-alerte-row-main">
                              <DosarNumber
                                value={c.numarDosar}
                                onNotify={onNotify}
                                empty="fără nr."
                                className="app-alerte-dosar hover:text-[var(--app-accent)]"
                              />
                              <span className="app-alerte-plate">
                                {c.numarInmatriculare || "—"}
                              </span>
                              <span className="app-alerte-status-chip" title={stFull}>
                                {stShort}
                              </span>
                            </div>
                            {noteText ? (
                              <p className="app-alerte-note" title={noteText}>
                                <span className="app-alerte-meta-label">Notă</span>
                                {noteText}
                              </p>
                            ) : null}
                          </div>

                          <div
                            className="app-alerte-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ClaimPhoneActions
                              phone={phone}
                              claim={c}
                              waSize={12}
                              phoneSize={14}
                              condition={item.type === "neridicate" || item.type === "stagnate"}
                            />
                            {showFactureaza && (
                              <button
                                type="button"
                                className="app-alerte-btn-primary"
                                onClick={() => openClaim(c)}
                              >
                                Deschide AP
                              </button>
                            )}
                            {showAck && (
                              <button
                                type="button"
                                className="app-alerte-btn-secondary"
                                onClick={(e) => ackAlert(e, c.id)}
                              >
                                Rezolvat
                              </button>
                            )}
                            <button
                              type="button"
                              className="app-alerte-btn-open"
                              onClick={() => openClaim(c)}
                              aria-label="Deschide dosarul"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {desktopUi ? (
          <div className="app-alerte-footer">
            <button type="button" onClick={onClose} className="app-alerte-btn-close">
              Închide
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
