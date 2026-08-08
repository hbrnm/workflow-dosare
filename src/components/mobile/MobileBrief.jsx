import React, { useState, useMemo } from "react";
import {
  CheckCircle2, Phone, ExternalLink, Camera, AlertTriangle,
  List, Plus, ArrowRight, ChevronRight, FolderOpen, CalendarDays,
  Inbox, Crosshair, PackageCheck, Ban,
} from "lucide-react";
import { telLink, fmtDate } from "../../utils/dateUtils";
import { buildAlertBuckets, filterAlertItems, getLatestClaimNoteText } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import { softHaptic } from "../../utils/mobilePrefs";
import { ALERT_GROUPS, countAlertsForGroup } from "../../constants/alertCategories";
import { getStatusShortLabel } from "../../constants/config";

const FILTER_CHIPS = [
  { key: "toate", label: "Toate" },
  ...ALERT_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

const HUB_PILLS = FILTER_CHIPS;

const WORKING_STATUSES = new Set(["programat", "in_lucru"]);
const ATTENTION_TYPES = new Set(["blocate", "stagnate", "inactivitate"]);

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Bună dimineața";
  if (h < 18) return "Bună ziua";
  return "Bună seara";
}

export default function MobileBrief({
  claims,
  listClaims = null,
  onOpen,
  onNew,
  onGoTab,
  onOpenAlerts,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onPatchClaim,
  onNotify,
  homeStyle = "inbox",
  atelierNume = "Dosare Daună",
}) {
  const [activeAlertTab, setActiveAlertTab] = useState("toate");
  const [focus, setFocus] = useState("toate"); // toate | lucru | atentie | predare

  const sourceClaims = listClaims || claims;

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount, items } = buckets;

  const alertsList = useMemo(
    () => filterAlertItems(items, activeAlertTab),
    [items, activeAlertTab]
  );

  const chipCount = (key) =>
    key === "toate" ? totalAlertsCount : countAlertsForGroup(counts, key);

  const workingClaims = useMemo(
    () =>
      (claims || []).filter((c) => WORKING_STATUSES.has(c.status) && !c.blocat),
    [claims]
  );

  const allClaimsCount = (claims || []).length;

  const attentionCount =
    countAlertsForGroup(counts, "blocate") + countAlertsForGroup(counts, "intarzieri");
  const predareCount = countAlertsForGroup(counts, "predare");

  const focusBoard = useMemo(() => {
    if (focus === "lucru") {
      return {
        kind: "claims",
        emptyTitle: "Niciun dosar în lucru",
        emptyHint: "Mașinile programate sau în reparație apar aici.",
        rows: workingClaims,
      };
    }
    if (focus === "atentie") {
      return {
        kind: "alerts",
        emptyTitle: "Nimic care necesită atenție",
        emptyHint: "Blocate și întârzieri apar aici.",
        rows: items.filter((i) => ATTENTION_TYPES.has(i.type)),
      };
    }
    if (focus === "predare") {
      return {
        kind: "alerts",
        emptyTitle: "Nicio predare în așteptare",
        emptyHint: "Mașini neridicate și auto la schimb apar aici.",
        rows: filterAlertItems(items, "predare"),
      };
    }
    return {
      kind: "claims",
      emptyTitle: "Niciun dosar",
      emptyHint: "Creează un dosar nou sau verifică filtrele de căutare.",
      rows: sourceClaims,
    };
  }, [focus, workingClaims, items, sourceClaims]);

  const featured = alertsList[0] || items[0] || null;

  const ackAlert = async (e, claimId) => {
    e.stopPropagation();
    if (!onPatchClaim) return;
    const ok = await onPatchClaim(claimId, { alerteAck: true });
    onNotify?.(
      ok
        ? "Alertă ascunsă. Revine automat la următoarea schimbare de status."
        : "Eroare la marcarea alertei.",
      ok ? "success" : "error"
    );
  };

  const canAck = (type) =>
    [
      "blocate",
      "neridicate",
      "accept_plata",
      "masini_schimb",
      "piese",
      "livrare_piese",
      "stagnate",
      "inactivitate",
      "restante",
    ].includes(type);

  const go = (tab) => {
    softHaptic(8);
    onGoTab?.(tab);
  };

  const setBoardFocus = (next) => {
    softHaptic(8);
    setFocus(next);
  };

  const alertIconColor = (type) => {
    switch (type) {
      case "blocate": return "#B23A2E";
      case "piese": return "#3E6B45";
      case "livrare_piese": return "#D6473F";
      case "neridicate": return "#3E6B45";
      case "stagnate": return "#2C4160";
      case "accept_plata": return "#2C4160";
      case "masini_schimb": return "#C98A2B";
      case "inactivitate": return "#6B6558";
      default: return "#2C4160";
    }
  };

  const statusTiles = [
    {
      key: "toate",
      label: "Toate",
      count: allClaimsCount,
      Icon: Inbox,
      tone: "steel",
    },
    {
      key: "lucru",
      label: "În lucru",
      count: workingClaims.length,
      Icon: Crosshair,
      tone: "accent",
    },
    {
      key: "atentie",
      label: "Atenție",
      count: attentionCount,
      Icon: Ban,
      tone: "danger",
    },
    {
      key: "predare",
      label: "Predare",
      count: predareCount,
      Icon: PackageCheck,
      tone: "ok",
    },
  ];

  const openAlertsCenter = () => {
    softHaptic(8);
    onOpenAlerts?.("toate");
  };

  const shortcuts = [
    { id: "capture", label: "Foto & Doc", Icon: Camera, action: () => go("capture") },
    { id: "dosare", label: "Dosare", Icon: FolderOpen, action: () => go("dosare") },
    { id: "programari", label: "Programări", Icon: CalendarDays, action: () => go("programari") },
    { id: "new", label: "Dosar nou", Icon: Plus, action: () => (onNew ? onNew() : go("dosare")) },
  ];

  const renderAlertRow = (item, idx, total) => {
    const c = item.claim;
    const phone = c.telefonClient || "";
    const noteText = (item.noteSnippet || getLatestClaimNoteText(c) || "").trim();
    return (
      <div
        key={item.id}
        className={`m-brief-row ${idx < total - 1 ? "has-divider" : ""}`}
      >
        <button type="button" className="m-brief-row-main m-press" onClick={() => onOpen(c)}>
          <span className="m-brief-row-icon" style={{ background: alertIconColor(item.type) }}>
            <AlertTriangle size={14} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="m-brief-row-plate">
              <span className="m-plate">{c.numarInmatriculare || "—"}</span>
              <span className="m-dosar-num">{c.numarDosar || "fără nr."}</span>
            </span>
            <span className="m-brief-row-title m-vehicle-model">{item.title}</span>
            <span className="m-brief-row-reason">{item.reason}</span>
            {noteText ? <span className="m-brief-row-note">{noteText}</span> : null}
          </span>
          <ChevronRight size={16} className="m-brief-chevron shrink-0" />
        </button>
        {(phone || (onPatchClaim && canAck(item.type))) && (
          <div className="m-brief-row-actions">
            {phone ? (
              <>
                <WhatsAppButton phone={phone} claim={c} size={12} />
                <a href={telLink(phone)} className="m-call-btn flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold">
                  <Phone size={11} /> Apel
                </a>
              </>
            ) : null}
            {onPatchClaim && canAck(item.type) ? (
              <button type="button" onClick={(e) => ackAlert(e, c.id)} className="m-brief-ghost-btn">
                Rezolvat
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderClaimRow = (c, idx, total) => {
    const programareLabel = c.dataProgramare
      ? fmtDate(String(c.dataProgramare).slice(0, 10))
      : "";
    return (
      <button
        key={c.id}
        type="button"
        className={`m-brief-row-main m-press m-brief-claim-row ${idx < total - 1 ? "has-divider" : ""}`}
        onClick={() => onOpen(c)}
      >
        <span className="m-brief-row-icon is-work">
          <Crosshair size={14} />
        </span>
        <span className="m-brief-claim-identity">
          <span className="m-plate">{c.numarInmatriculare || "—"}</span>
          <span className="m-dosar-num">{c.numarDosar || "fără nr."}</span>
        </span>
        <span className="m-brief-claim-status" title={programareLabel || undefined}>
          <span className="m-brief-claim-status-label">{getStatusShortLabel(c.status)}</span>
          {programareLabel ? (
            <span className="m-brief-claim-date">{programareLabel}</span>
          ) : null}
        </span>
        <ChevronRight size={16} className="m-brief-chevron shrink-0" />
      </button>
    );
  };

  if (homeStyle === "inbox") {
    return (
      <div className="m-brief space-y-4 flex flex-col flex-1 min-h-0 pb-2">
        <header className="m-brief-hero">
          <div className="flex items-end justify-between gap-3">
            <h1 className="m-brief-title">Brief</h1>
            <button
              type="button"
              className="m-brief-count m-press"
              onClick={openAlertsCenter}
              aria-label={`${totalAlertsCount} alerte — deschide centrul de alerte`}
              title="Deschide alertele"
            >
              {totalAlertsCount} alerte
            </button>
          </div>
        </header>

        <section className="m-brief-tiles" aria-label="Stări operaționale">
          {statusTiles.map((tile) => {
            const active = focus === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                className={`m-brief-tile tone-${tile.tone} ${active ? "is-active" : ""}`}
                onClick={() => setBoardFocus(tile.key)}
              >
                <span className="m-brief-tile-icon">
                  <tile.Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="m-brief-tile-label">{tile.label}</span>
                <span className="m-brief-tile-count">{tile.count}</span>
              </button>
            );
          })}
        </section>

        <section className="m-brief-panel">
          <div className="m-brief-panel-label">Acces rapid</div>
          <div className="m-brief-shortcuts">
            {shortcuts.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`m-brief-shortcut m-press ${idx < shortcuts.length - 1 ? "has-divider" : ""}`}
                onClick={item.action}
              >
                <span className="m-brief-shortcut-icon">
                  <item.Icon size={15} />
                </span>
                <span className="m-brief-shortcut-label">{item.label}</span>
                <ChevronRight size={15} className="m-brief-chevron" />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2.5 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-brief-panel-label" style={{ margin: 0 }}>
              {focus === "lucru" ? "Dosare în lucru" : focus === "atentie" ? "Necesită atenție" : focus === "predare" ? "Predare" : "Toate dosarele"}
            </h2>
            {onNew ? (
              <button type="button" className="m-brief-ghost-btn" onClick={onNew}>
                + Dosar
              </button>
            ) : null}
          </div>

          <div className="m-brief-panel m-brief-list flex-1 overflow-hidden">
            {focusBoard.rows.length === 0 ? (
              <div className="m-brief-empty">
                <CheckCircle2 size={26} className="mx-auto m-brief-empty-icon" />
                <div className="font-bold text-[13px]">{focusBoard.emptyTitle}</div>
                <p className="text-[11.5px] m-muted">{focusBoard.emptyHint}</p>
              </div>
            ) : focusBoard.kind === "claims" ? (
              focusBoard.rows.map((c, idx) => renderClaimRow(c, idx, focusBoard.rows.length))
            ) : (
              focusBoard.rows.map((item, idx) => renderAlertRow(item, idx, focusBoard.rows.length))
            )}
          </div>
        </section>
      </div>
    );
  }

  if (homeStyle === "hub") {
    return (
      <div className="space-y-4 flex flex-col flex-1 min-h-0 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] m-muted">{atelierNume}</p>
          <h1 className="m-hub-greeting mt-1">{greetingForNow()}</h1>
        </div>

        {featured ? (
          <button
            type="button"
            className="m-hub-featured m-press w-full text-left space-y-2"
            onClick={() => onOpen(featured.claim)}
          >
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider opacity-70">
              Prioritate acum
            </div>
            <div className="font-extrabold text-[18px] leading-tight" style={{ fontFamily: "var(--m-font-display)" }}>
              {featured.claim.numarInmatriculare || featured.title}
            </div>
            <div className="text-[12.5px] font-semibold opacity-80 line-clamp-2">
              {featured.reason || featured.title}
            </div>
            <div className="pt-1 flex items-center gap-2">
              <span className="m-hub-cta inline-flex items-center gap-1.5">
                Deschide <ArrowRight size={14} />
              </span>
              <span className="text-[11px] font-bold opacity-70">
                {totalAlertsCount} alerte active
              </span>
            </div>
          </button>
        ) : (
          <div className="m-hub-featured space-y-2">
            <div className="font-extrabold text-[18px]" style={{ fontFamily: "var(--m-font-display)" }}>
              Totul e calm
            </div>
            <p className="text-[12.5px] font-semibold opacity-80">
              Nicio alertă urgentă. Poți fotografia sau crea un dosar nou.
            </p>
            <div className="flex gap-2 pt-1">
              <button type="button" className="m-hub-cta" onClick={() => go("capture")}>Fotografiază</button>
              {onNew && (
                <button type="button" className="m-hub-cta" style={{ background: "transparent", border: "1.5px solid #111", color: "#111" }} onClick={onNew}>
                  + Dosar
                </button>
              )}
            </div>
          </div>
        )}

        <div className="m-hub-grid">
          {[
            { id: "capture", label: "Foto & Doc", Icon: Camera, color: "var(--m-hub-c)", action: () => go("capture") },
            { id: "alerte", label: `Alerte (${totalAlertsCount})`, Icon: AlertTriangle, color: "var(--m-hub-b)", action: () => setActiveAlertTab("toate") },
            { id: "dosare", label: "Dosare", Icon: List, color: "var(--m-hub-d)", action: () => go("dosare") },
            { id: "new", label: "Dosar nou", Icon: Plus, color: "var(--m-accent)", action: () => (onNew ? onNew() : go("dosare")), iconColor: "#000" },
          ].map((tile) => (
            <button key={tile.id} type="button" className="m-hub-tile" onClick={tile.action}>
              <span className="m-hub-tile-icon" style={{ background: tile.color, color: tile.iconColor || "#fff" }}>
                <tile.Icon size={18} />
              </span>
              <span className="truncate">{tile.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="m-type-title">De urmărit</h2>
            <button type="button" className="text-[11px] font-bold m-accent-text" onClick={() => go("programari")}>
              Agenda →
            </button>
          </div>
          <div className="m-hub-pills">
            {HUB_PILLS.map((pill) => (
              <button
                key={pill.key}
                type="button"
                className={`m-hub-pill ${activeAlertTab === pill.key ? "is-active" : ""}`}
                onClick={() => { softHaptic(8); setActiveAlertTab(pill.key); }}
              >
                {pill.label}
                {chipCount(pill.key) > 0 ? ` · ${chipCount(pill.key)}` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
          {alertsList.length === 0 ? (
            <div className="m-hub-card text-center py-8 space-y-2">
              <CheckCircle2 size={28} className="mx-auto" style={{ color: "var(--m-accent)" }} />
              <div className="font-extrabold text-[13px]">Nicio alertă pe filtrul ăsta</div>
              <p className="text-[11.5px] m-muted font-semibold">Schimbă pastila sau treci la Foto.</p>
            </div>
          ) : (
            alertsList.map((item) => {
              const c = item.claim;
              const phone = c.telefonClient || "";
              return (
                <div key={item.id} className="m-hub-card space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="m-plate">
                      {c.numarInmatriculare || "—"}
                    </span>
                    <span className="m-vehicle-model truncate max-w-[55%]">
                      {item.title}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold m-muted flex justify-between gap-2">
                    <span className="m-vehicle-model truncate">{c.marcaModel || "Model neprecizat"}</span>
                    <span className="m-dosar-num shrink-0">{c.numarDosar || "—"}</span>
                  </div>
                  <div className="text-[11.5px] font-bold p-2 rounded-xl" style={{ background: "color-mix(in srgb, var(--m-danger) 16%, transparent)", color: "var(--m-danger)" }}>
                    {item.reason}
                  </div>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={12} />
                          <a
                            href={telLink(phone)}
                            className="m-call-btn flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold"
                          >
                            <Phone size={12} /> Apel
                          </a>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {onPatchClaim && canAck(item.type) && (
                        <button
                          type="button"
                          onClick={(e) => ackAlert(e, c.id)}
                          className="px-2.5 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ background: "var(--m-surface-2)", color: "var(--m-muted)" }}
                        >
                          Rezolvat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpen(c)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11.5px] font-extrabold"
                        style={{ background: "var(--m-accent)", color: "var(--m-accent-text)" }}
                      >
                        <span>Deschide</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Legacy list — keep for fallback
  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0 text-[#23282E] pb-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold pb-0.5">
        {FILTER_CHIPS.map((chip) => {
          const n = chipCount(chip.key);
          const active = activeAlertTab === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveAlertTab(chip.key)}
              className={`shrink-0 py-2 px-3 rounded-xl border text-center transition-all whitespace-nowrap ${
                active
                  ? "bg-[#2C4160] text-white border-[#2C4160] shadow-xs"
                  : "bg-white text-[#6B6558] border-[#DAD4C6]"
              }`}
            >
              {chip.label}
              {n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
        {alertsList.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#3E6B45] bg-green-50 border border-green-200 rounded-2xl font-bold space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-[#3E6B45]" />
            <div>Nicio alertă urgentă pentru acest filtru!</div>
          </div>
        ) : (
          alertsList.map((item) => {
            const c = item.claim;
            const phone = c.telefonClient || "";

            return (
              <div key={item.id} className="bg-white border border-[#DAD4C6] rounded-2xl p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="m-brief-row-plate">
                    <span className="m-plate">{c.numarInmatriculare || "—"}</span>
                    <span className="m-dosar-num">{c.numarDosar || "—"}</span>
                  </span>
                  <span className="text-[10px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#3B5166] truncate max-w-[40%]">
                    {item.title}
                  </span>
                </div>

                <div className="m-vehicle-model truncate">{c.marcaModel || "Model neprecizat"}</div>

                <div className="text-[11.5px] font-bold text-[#B23A2E] bg-red-50/60 border border-red-100 p-2 rounded-xl">
                  {item.reason}
                </div>

                <div className="pt-2 border-t border-[#EFEAE1] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <>
                        <WhatsAppButton phone={phone} claim={c} size={12} />
                        <a
                          href={telLink(phone)}
                          className="m-call-btn flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold"
                        >
                          <Phone size={12} /> Apel
                        </a>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {onPatchClaim && canAck(item.type) && (
                      <button
                        type="button"
                        onClick={(e) => ackAlert(e, c.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EFEAE1] text-[#3B5166] text-[11px] font-bold"
                      >
                        Rezolvat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#2C4160] text-white text-[11.5px] font-bold shadow-2xs"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
