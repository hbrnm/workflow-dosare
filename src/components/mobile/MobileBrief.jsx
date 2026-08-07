import React, { useState, useMemo } from "react";
import {
  CheckCircle2, Phone, ExternalLink, Camera, AlertTriangle,
  List, Plus, ArrowRight, ChevronRight, FolderOpen, CalendarDays
} from "lucide-react";
import { telLink } from "../../utils/dateUtils";
import { buildAlertBuckets, filterAlertItems, getLatestClaimNoteText } from "../../utils/alertUtils";
import WhatsAppButton from "../common/WhatsAppButton";
import { softHaptic } from "../../utils/mobilePrefs";
import { ALERT_GROUPS, countAlertsForGroup } from "../../constants/alertCategories";

const FILTER_CHIPS = [
  { key: "toate", label: "Toate" },
  ...ALERT_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

const HUB_PILLS = FILTER_CHIPS;

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Bună dimineața";
  if (h < 18) return "Bună ziua";
  return "Bună seara";
}

export default function MobileBrief({
  claims,
  onOpen,
  onNew,
  onGoTab,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onPatchClaim,
  onNotify,
  homeStyle = "list",
  atelierNume = "Dosare Daună",
}) {
  const [activeAlertTab, setActiveAlertTab] = useState("toate");

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

  const alertIconColor = (type) => {
    switch (type) {
      case "blocate": return "#F85149";
      case "piese": return "#F0883E";
      case "livrare_piese": return "#D6473F";
      case "neridicate": return "#3FB950";
      case "stagnate": return "#58A6FF";
      case "accept_plata": return "#A371F7";
      case "masini_schimb": return "#D29922";
      case "inactivitate": return "#8B949E";
      default: return "#58A6FF";
    }
  };

  if (homeStyle === "inbox") {
    const shortcuts = [
      { id: "capture", label: "Foto & Doc", Icon: Camera, color: "var(--m-hub-a)", action: () => go("capture") },
      { id: "dosare", label: "Dosare", Icon: FolderOpen, color: "var(--m-hub-b)", action: () => go("dosare") },
      { id: "programari", label: "Programări", Icon: CalendarDays, color: "var(--m-hub-c)", action: () => go("programari") },
      { id: "new", label: "Dosar nou", Icon: Plus, color: "var(--m-hub-d)", action: () => (onNew ? onNew() : go("dosare")) },
    ];

    return (
      <div className="m-inbox space-y-4 flex flex-col flex-1 min-h-0 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold m-muted">{atelierNume}</p>
            <h1 className="m-inbox-title mt-0.5">Brief</h1>
          </div>
          <span className="m-inbox-count">{totalAlertsCount} alerte</span>
        </div>

        <section className="m-inbox-card">
          <div className="m-inbox-section-label">Favorites</div>
          <div className="m-inbox-favs">
            {shortcuts.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`m-inbox-row m-press ${idx < shortcuts.length - 1 ? "has-divider" : ""}`}
                onClick={item.action}
              >
                <span className="m-inbox-icon" style={{ background: item.color }}>
                  <item.Icon size={16} />
                </span>
                <span className="m-inbox-row-label">{item.label}</span>
                <ChevronRight size={16} className="m-inbox-chevron" />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="m-inbox-section-label" style={{ margin: 0 }}>Inbox alerte</h2>
            {onNew && (
              <button type="button" className="m-inbox-ghost-btn" onClick={onNew}>
                + Dosar
              </button>
            )}
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

          <div className="m-inbox-card overflow-hidden">
            {alertsList.length === 0 ? (
              <div className="text-center py-8 px-4 space-y-2">
                <CheckCircle2 size={26} className="mx-auto" style={{ color: "var(--m-hub-a)" }} />
                <div className="font-bold text-[13px]">Inbox gol pe filtrul ăsta</div>
                <p className="text-[11.5px] m-muted">Schimbă filtrul sau treci la Foto.</p>
              </div>
            ) : (
              alertsList.map((item, idx) => {
                const c = item.claim;
                const phone = c.telefonClient || "";
                const noteText = (item.noteSnippet || getLatestClaimNoteText(c) || "").trim();
                return (
                  <div
                    key={item.id}
                    className={`m-inbox-alert ${idx < alertsList.length - 1 ? "has-divider" : ""}`}
                  >
                    <button type="button" className="m-inbox-alert-main m-press" onClick={() => onOpen(c)}>
                      <span className="m-inbox-icon" style={{ background: alertIconColor(item.type) }}>
                        <AlertTriangle size={14} />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="m-inbox-meta">
                          {c.numarInmatriculare || "—"} · {c.numarDosar || "fără nr."}
                        </span>
                        <span className="m-inbox-alert-title">{item.title}</span>
                        <span className="m-inbox-alert-reason">{item.reason}</span>
                        {noteText ? (
                          <span className="m-inbox-alert-note">{noteText}</span>
                        ) : null}
                      </span>
                      <ChevronRight size={16} className="m-inbox-chevron shrink-0" />
                    </button>
                    {phone && (
                      <div className="m-inbox-alert-actions">
                        <WhatsAppButton phone={phone} claim={c} size={12} />
                        <a href={telLink(phone)} className="m-call-btn flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold">
                          <Phone size={11} /> Apel
                        </a>
                        {onPatchClaim && canAck(item.type) && (
                          <button
                            type="button"
                            onClick={(e) => ackAlert(e, c.id)}
                            className="m-inbox-ghost-btn"
                          >
                            Rezolvat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
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
            <h2 className="m-display font-extrabold text-[15px]">De urmărit</h2>
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
                    <span className="font-mono font-extrabold text-[14px] uppercase">
                      {c.numarInmatriculare || "—"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[55%]" style={{ background: "var(--m-surface-2)", color: "var(--m-muted)" }}>
                      {item.title}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold m-muted flex justify-between gap-2">
                    <span className="truncate">{c.marcaModel || "Model neprecizat"}</span>
                    <span className="font-mono text-[11px] shrink-0">Dosar: {c.numarDosar || "—"}</span>
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
                  <span className="font-mono font-extrabold text-[14px] text-[#23282E] uppercase">
                    {c.numarInmatriculare || "—"}
                  </span>
                  <span className="text-[10px] font-bold bg-[#FAF8F5] border border-[#DAD4C6] px-2 py-0.5 rounded-md text-[#3B5166] truncate max-w-[55%]">
                    {item.title}
                  </span>
                </div>

                <div className="text-[12px] font-semibold text-[#6B6558] flex justify-between gap-2">
                  <span className="truncate">{c.marcaModel || "Model neprecizat"}</span>
                  <span className="font-mono text-[11px] shrink-0">Dosar: {c.numarDosar || "—"}</span>
                </div>

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
