import React, { useState, useMemo, useEffect } from "react";
import {
  X, Bell, ChevronRight, CheckCircle2, Phone,
} from "lucide-react";
import { getStatusDefinition } from "../../constants/config";
import {
  buildAlertBuckets,
  normalizeAlertTab,
  filterAlertItems,
  getDaysInStage,
  getDaysSinceLastActivity,
  getDaysPastDeliveryDeadline,
} from "../../utils/alertUtils";
import { daysBetween, telLink } from "../../utils/dateUtils";
import { getDaysPaymentOverdue } from "../../utils/settlementUtils";
import { ALERT_GROUPS, getAlertGroup, countAlertsForGroup } from "../../constants/alertCategories";
import Pill from "../common/Pill";
import WhatsAppButton from "../common/WhatsAppButton";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";

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

function getAlertMetric(item) {
  const c = item?.claim;
  if (!c) return null;
  switch (item.type) {
    case "stagnate":
      return { value: getDaysInStage(c), unit: "zile", hint: "în etapă" };
    case "inactivitate":
      return { value: getDaysSinceLastActivity(c), unit: "zile", hint: "fără activitate" };
    case "livrare_piese":
      return { value: getDaysPastDeliveryDeadline(c), unit: "zile", hint: "peste termen" };
    case "neridicate":
      return {
        value: c.dataGataRidicare ? daysBetween(c.dataGataRidicare) : 0,
        unit: "zile",
        hint: "gata de ridicare",
      };
    case "masini_schimb":
      return { value: c.zile || 0, unit: "zile", hint: "la schimb" };
    case "restante":
      return { value: getDaysPaymentOverdue(c), unit: "zile", hint: "scadență" };
    default:
      return null;
  }
}

function severityClass(severity) {
  if (severity === "critical") return "is-critical";
  if (severity === "warning") return "is-warning";
  return "is-info";
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

  const activeCat = getAlertGroup(activeTab) || ALERT_GROUPS[1];
  const ActiveIcon = activeCat.icon;
  const list = useMemo(
    () => filterAlertItems(buckets.items, activeTab),
    [buckets.items, activeTab]
  );
  const totalAlertsCount = buckets.totalAlertsCount;

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
    onClose?.();
    onOpenClaim?.(c);
  };

  const renderCategoryButton = (cat, { compact = false } = {}) => {
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
        <span className="app-alerte-cat-icon" style={{ color: active ? "#fff" : cat.hex }}>
          <Icon size={compact ? 14 : 16} strokeWidth={2.25} />
        </span>
        <span className="app-alerte-cat-text">
          <span className="app-alerte-cat-label">{cat.label}</span>
          {!compact && empty && (
            <span className="app-alerte-cat-hint">0</span>
          )}
        </span>
        <span className={`app-alerte-cat-count ${cat.count > 0 ? "has-items" : ""}`}>
          {cat.count}
        </span>
      </button>
    );
  };

  return (
    <div
      className={modalOverlayClass(desktopUi)}
      {...modalOverlayProps(desktopUi, themeId)}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "app-alerte-panel w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden"
        )}
      >
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

        {/* Mobile: horizontal category scroller with full labels */}
        <div className="app-alerte-cats-mobile sm:hidden">
          {[...categoriesOrdered.withAlerts, ...categoriesOrdered.empty].map((cat) =>
            renderCategoryButton(cat, { compact: true })
          )}
        </div>

        <div className="app-alerte-body flex flex-1 min-h-0">
          {/* Desktop sidebar */}
          <aside className="app-alerte-sidebar hidden sm:flex">
            {categoriesOrdered.withAlerts.length > 0 && (
              <div className="app-alerte-sidebar-group">
                <p className="app-alerte-sidebar-heading">Necesită atenție</p>
                {categoriesOrdered.withAlerts.map((cat) => renderCategoryButton(cat))}
              </div>
            )}
            {categoriesOrdered.empty.length > 0 && (
              <div className="app-alerte-sidebar-group">
                <p className="app-alerte-sidebar-heading">Fără alerte</p>
                {categoriesOrdered.empty.map((cat) => renderCategoryButton(cat))}
              </div>
            )}
          </aside>

          <section className="app-alerte-main flex-1 min-w-0 flex flex-col min-h-0">
            <div className="app-alerte-section-head">
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
            </div>

            <div className="app-alerte-list flex-1 min-h-0 overflow-y-auto scrollbar-thin">
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
                    const st = getStatusDefinition(c.status);
                    const phone = c.telefonClient || "";
                    const showAck = [
                      "stagnate",
                      "inactivitate",
                      "accept_plata",
                      "neridicate",
                      "blocate",
                      "masini_schimb",
                      "livrare_piese",
                      "piese",
                      "restante",
                    ].includes(item.type);
                    const showOrderParts = item.type === "accept_plata";

                    return (
                      <li key={item.id}>
                        <article
                          className={`app-alerte-row ${severityClass(item.severity)}`}
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
                          {metric ? (
                            <div className="app-alerte-metric" title={metric.hint}>
                              <span className="app-alerte-metric-value">{metric.value}</span>
                              <span className="app-alerte-metric-unit">{metric.unit}</span>
                            </div>
                          ) : (
                            <div className="app-alerte-metric is-icon" style={{ color: activeCat.hex }}>
                              <ActiveIcon size={20} />
                            </div>
                          )}

                          <div className="app-alerte-row-body min-w-0">
                            <div className="app-alerte-row-top">
                              <span className="app-alerte-dosar">
                                {c.numarDosar || c.numarInmatriculare || "(fără nr.)"}
                              </span>
                              {c.tipAsigurare && (
                                <Pill tone={c.tipAsigurare === "CASCO" ? "amber" : "steel"}>
                                  {c.tipAsigurare}
                                </Pill>
                              )}
                              <span className="app-alerte-type-tag" style={{ background: `${activeCat.hex}18`, color: activeCat.hex }}>
                                {item.title}
                              </span>
                            </div>

                            <p className="app-alerte-identity">
                              {[c.client || "Client neintrodus", c.numarInmatriculare, c.marcaModel]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>

                            <p className="app-alerte-reason">{item.reason}</p>

                            <div className="app-alerte-row-meta">
                              <span className="app-alerte-status-chip">{st.label}</span>
                              {c.asigurator && (
                                <span className="app-alerte-insurer">{c.asigurator}</span>
                              )}
                            </div>
                          </div>

                          <div
                            className="app-alerte-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {phone && (item.type === "neridicate" || item.type === "stagnate") && (
                              <>
                                <WhatsAppButton phone={phone} claim={c} size={12} />
                                <a
                                  href={telLink(phone)}
                                  className="app-alerte-btn-ghost"
                                  title="Sună"
                                >
                                  <Phone size={14} />
                                </a>
                              </>
                            )}
                            {showOrderParts && (
                              <button
                                type="button"
                                className="app-alerte-btn-primary"
                                onClick={() => openClaim(c)}
                              >
                                Comandă piese
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

        <div className="app-alerte-footer">
          <button type="button" onClick={onClose} className="app-alerte-btn-close">
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
