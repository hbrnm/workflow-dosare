import React, { useState, useMemo } from "react";
import {
  CalendarClock, PackageCheck, AlertOctagon, Phone, Car,
  Clock, CheckCircle2, ShieldAlert, BarChart3, Boxes, ExternalLink, ShoppingCart,
  ChevronRight, User, Truck
} from "lucide-react";
import { todayISO, telLink } from "../../utils/dateUtils";
import { buildAlertBuckets, filterAlertItems } from "../../utils/alertUtils";
import { STATUSES } from "../../constants/config";
import { getAlertStyle, getAlertIcon, ALERT_GROUPS, countAlertsForGroup } from "../../constants/alertCategories";
import WhatsAppButton from "../common/WhatsAppButton";
import Pill from "../common/Pill";
import { alertTabClass } from "../common/alertTabClasses";
import StageTabLabel from "../common/StageTabLabel";

const ALERT_TABS = [
  { key: "toate", label: "Toate" },
  ...ALERT_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

export default function BriefZilnic({
  claims,
  onOpen,
  pragRidicare,
  pragInactivitate = 7,
  alertBuckets = null,
  onSelectStatusFilter,
}) {
  const todayStr = todayISO();
  const [activeAlertTab, setActiveAlertTab] = useState("toate");

  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, []);

  const buckets = useMemo(
    () => alertBuckets || buildAlertBuckets(claims, { pragRidicare, pragInactivitate }),
    [alertBuckets, claims, pragRidicare, pragInactivitate]
  );

  const { counts, totalAlertsCount: totalActiuniUrgente } = buckets;

  // 1. Programări intrări astăzi
  const programariAzi = useMemo(() =>
    claims.filter((c) => c.dataProgramare && c.dataProgramare.slice(0, 10) === todayStr)
      .sort((a, b) => a.dataProgramare.localeCompare(b.dataProgramare)),
    [claims, todayStr]);

  // 2. Finalizate astăzi (gata de predat)
  const gataAzi = useMemo(() =>
    claims.filter((c) => c.gataDeRidicare && !c.ridicata && c.dataGataRidicare && c.dataGataRidicare.slice(0, 10) === todayStr),
    [claims, todayStr]);

  const alertsList = useMemo(() => {
    return filterAlertItems(buckets.items, activeAlertTab).map((item) => ({
      ...item,
      icon: getAlertIcon(item.type) || Clock,
      ...getAlertStyle(item.type),
    }));
  }, [buckets.items, activeAlertTab]);

  // Număr total dosare active
  const activeClaimsCount = useMemo(() =>
    claims.filter((c) => c.status !== "facturat").length,
    [claims]);

  // Număr dosare înregistrate pe fiecare etapă din workflow
  const statusStats = useMemo(() => {
    const counts = {};
    STATUSES.forEach((s) => (counts[s.key] = 0));
    claims.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });
    return counts;
  }, [claims]);

  return (
    <div className="space-y-4 flex flex-col flex-1 min-h-0 text-[var(--app-text)] pb-4">

      {/* 1. TOP HEADER & OPERATIONAL BRIEF BANNER */}
      <div className="app-brief-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="app-brief-icon-box w-10 h-10 rounded-lg flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-[16px] font-bold tracking-tight capitalize text-[var(--app-text-strong)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Centrul de Comandă &amp; Brief Atelier · {formattedTodayDate}
            </h1>
            <p className="text-[11.5px] text-[var(--app-muted)] font-medium flex items-center gap-1.5 mt-0.5">
              {totalActiuniUrgente > 0 ? (
                <span className="app-brief-status-alert flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[11px]">
                  <ShieldAlert size={12} /> {totalActiuniUrgente} alerte operative ce necesită reacție
                </span>
              ) : (
                <span className="app-brief-status-ok flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[11px]">
                  <CheckCircle2 size={12} /> Nicio alertă urgentă nesoluționată
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Badge sumar dosare active */}
        <div className="flex items-center gap-2 text-[11.5px]">
          <div className="app-brief-stat-badge px-3 py-1 rounded-lg flex items-center gap-2">
            <span className="text-[var(--app-muted)] font-semibold">Total Dosare Active:</span>
            <span className="font-bold font-mono text-[13px] text-[var(--app-text-strong)]">{activeClaimsCount}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTRUL DE TRIAJ ALERTE URGENTE (PRIORITATE MAXIMĂ) */}
      <div className="app-brief-panel rounded-xl p-3 space-y-2 shrink-0">
        <div className="app-brief-panel-header flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className={totalActiuniUrgente > 0 ? "text-[var(--app-danger)]" : "text-[var(--app-success)]"} />
            <h2 className="font-bold text-[14px] text-[var(--app-text-strong)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Centrul de Alerte Urgente &amp; Acțiuni Rapide
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${totalActiuniUrgente > 0 ? "bg-[var(--app-danger)] text-white" : "bg-[var(--app-success)] text-white"}`}>
              {totalActiuniUrgente}
            </span>
          </div>

          {/* Tab-uri de filtrare alerte */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {ALERT_TABS.map(({ key, label }) => {
              const n = key === "toate" ? totalActiuniUrgente : countAlertsForGroup(counts, key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveAlertTab(key)}
                  className={alertTabClass(key, activeAlertTab)}
                >
                  {label}
                  {n > 0 ? ` (${n})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grilă de carduri interactive de alerte cu acțiuni 1-click */}
        {alertsList.length === 0 ? (
          <div className="app-brief-empty py-3.5 px-4 text-center text-[12px] rounded-xl font-medium">
            ✨ Nicio alertă detectată pentru filtrul selectat. Toate dosarele sunt în parametrii optimi!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {alertsList.map((item) => {
              const c = item.claim;
              const IconComp = item.icon;
              const phone = c.telefonClient || "";

              return (
                <div
                  key={item.id}
                  className={`app-brief-alert-card p-3 rounded-xl transition-all flex flex-col justify-between space-y-2.5 ${item.borderColor}`}
                >
                  <div>
                    <div className="app-brief-panel-header flex items-start justify-between gap-2 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconComp size={15} className="shrink-0" />
                        <span className="font-mono font-extrabold text-[13px] uppercase truncate">
                          {c.numarInmatriculare || "—"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${item.badgeColor}`}>
                        {item.title}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-[11.5px]">
                      <div className="flex items-center justify-between text-[var(--app-muted)] font-medium">
                        <span className="truncate">{c.marcaModel || "Model nespecificat"}</span>
                        <span className="app-brief-meta-chip font-mono text-[10.5px] px-1.5 py-0.5 rounded">
                          Nr: {c.numarDosar || "—"}
                        </span>
                      </div>
                      <div className="app-brief-reason-box text-[11px] font-bold p-2 rounded-lg leading-tight">
                        {item.reason}
                      </div>
                    </div>
                  </div>

                  <div className="app-brief-panel-header pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phone && (
                        <>
                          <WhatsAppButton phone={phone} claim={c} size={11} />
                          <a
                            href={telLink(phone)}
                            className="app-brief-action-phone flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold transition-colors"
                            title={`Sune la ${phone}`}
                          >
                            <Phone size={11} /> Apel
                          </a>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="app-brief-action-open flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-colors ml-auto"
                    >
                      <span>Deschide</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECȚIUNEA OPERATIVĂ ZILNICĂ & SUMAR ATELIER */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* COLOANA 1: INTRĂRI PROGRAMATE ASTĂZI */}
        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[380px]">
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <CalendarClock size={16} className="text-[var(--app-accent)]" /> Intrări Programate Astăzi ({programariAzi.length})
            </h3>
            <span className="app-brief-meta-chip text-[10.5px] font-mono px-2 py-0.5 rounded">Agendă Zi</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {programariAzi.length === 0 ? (
              <div className="app-brief-empty text-center py-6 text-[11.5px] italic rounded-xl my-auto">
                Nicio mașină programată sau intrată astăzi.
              </div>
            ) : (
              programariAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="app-brief-list-item flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="app-brief-time-badge font-mono font-extrabold text-[11.5px] px-2 py-0.5 rounded-lg shrink-0">
                      {c.dataProgramare ? c.dataProgramare.slice(11, 16) : "08:00"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold uppercase text-[12px]">{c.numarInmatriculare}</span>
                        <span className="text-[var(--app-muted)] text-[10px]">·</span>
                        <span className="font-semibold text-[11px] text-[var(--app-muted)] truncate">{c.marcaModel || "—"}</span>
                      </div>
                      <div className="text-[10px] text-[var(--app-muted)] flex items-center gap-1 mt-0.5">
                        <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface-muted)] rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLOANA 2: FINALIZATE AZI / DE PREDAI */}
        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[380px]">
          <div className="app-brief-panel-header flex items-center justify-between pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <PackageCheck size={16} className="text-[var(--app-success)]" /> Finalizate Azi / Gata Predare ({gataAzi.length})
            </h3>
            <Pill tone="amber">GATA</Pill>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {gataAzi.length === 0 ? (
              <div className="app-brief-empty text-center py-6 text-[11.5px] italic rounded-xl my-auto">
                Nicio mașină finalizată astăzi.
              </div>
            ) : (
              gataAzi.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpen(c)}
                  className="app-brief-list-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold uppercase text-[12.5px]">{c.numarInmatriculare}</span>
                      <span className="text-[var(--app-muted)] text-[10px]">·</span>
                      <span className="font-semibold text-[11.5px] text-[var(--app-muted)] truncate">{c.marcaModel || "—"}</span>
                    </div>
                    <div className="text-[10.5px] text-[var(--app-muted)] flex items-center gap-1 mt-0.5">
                      <User size={10} /> <span className="truncate">{c.client || "Client neintrodus"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.telefonClient && <WhatsAppButton phone={c.telefonClient} claim={c} size={11} />}
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      className="p-1 text-[var(--app-muted)] hover:text-[var(--app-success)] hover:bg-[var(--app-surface-muted)] rounded transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLOANA 3: STATISTICI & PULSUL ATELIERULUI */}
        <div className="app-brief-panel rounded-xl p-3 flex flex-col min-h-[200px] max-h-[380px]">
          <div className="app-brief-panel-header pb-1.5 mb-2 shrink-0">
            <h3 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <BarChart3 size={16} className="text-[var(--app-accent)]" /> Pulsul Atelierului
            </h3>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-between">
            <h4 className="text-[10px] font-extrabold text-[var(--app-muted)] uppercase tracking-wider mb-1.5 shrink-0">
              Dosare Înregistrate pe Etape de Lucru
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {STATUSES.map((s) => {
                const count = statusStats[s.key] || 0;
                return (
                  <StageTabLabel
                    key={s.key}
                    as="button"
                    num={s.num}
                    label={s.label}
                    count={count}
                    onClick={() => onSelectStatusFilter?.(s.key)}
                  />
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
