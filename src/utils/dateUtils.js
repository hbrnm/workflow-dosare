// ---------------------------------------------------------------------------
// Helpers pentru manipularea datelor calendaristice și contactelor
// ---------------------------------------------------------------------------

export function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback to manual uuid generator
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const uid = generateUUID;
/** Formatează un obiect Date în format YYYY-MM-DD (componente locale). */
export function formatDateYMD(d) {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const todayISO = () => formatDateYMD(new Date());
export const nowISO = () => new Date().toISOString();

export function formatDateDMY(date = new Date(), sep = "/") {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}${sep}${month}${sep}${d.getFullYear()}`;
}

export function normalizedText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function daysBetween(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

/** Zi calendaristică locală YYYY-MM-DD — fără deplasări pe timezone. */
export function toLocalDateKey(iso) {
  if (!iso) return "";
  const raw = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Naive datetime (fără Z/offset): folosim ziua din string, nu UTC.
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) &&
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)
  ) {
    return raw.slice(0, 10);
  }
  return formatDateYMD(new Date(raw));
}

/** Oră locală HH:mm din ISO (gol dacă e doar dată). */
export function toLocalTimeHHMM(iso) {
  if (!iso) return "";
  const raw = String(iso);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) &&
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)
  ) {
    const t = raw.slice(11, 16);
    return /^\d{2}:\d{2}$/.test(t) ? t : "";
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Diferență în zile calendaristice locale între două YYYY-MM-DD. */
export function calendarDaysBetween(fromDay, toDay = todayISO()) {
  if (
    !fromDay ||
    !toDay ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fromDay) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toDay)
  ) {
    return 0;
  }
  const [y1, m1, d1] = fromDay.split("-").map(Number);
  const [y2, m2, d2] = toDay.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function isWeekendDay(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return false;
  const [y, m, d] = String(dayKey).split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** Business (Mon-Fri) day difference between two local day keys, inclusive start-exclusive end. */
export function businessDaysBetween(fromDay, toDay = todayISO()) {
  if (
    !fromDay ||
    !toDay ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fromDay) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(toDay)
  ) {
    return 0;
  }
  if (fromDay >= toDay) return 0;
  const [fy, fm, fd] = fromDay.split("-").map(Number);
  const [ty, tm, td] = toDay.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  let count = 0;
  for (let ts = start; ts < end; ts += 86400000) {
    const weekday = new Date(ts).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function businessDaysSince(iso, toDay = todayISO()) {
  const fromDay = toLocalDateKey(iso);
  if (!fromDay) return 0;
  return businessDaysBetween(fromDay, toDay);
}

export function formatDaysLabel(days) {
  if (!Number.isFinite(days) || days < 0) return "—";
  if (days === 0) return "azi";
  if (days === 1) return "1 zi";
  return `${days} zile`;
}

/**
 * Meta sincronizată: dată (+ oră) și zile calendaristice din același moment.
 * Folosit pe carduri Brief (stadii + Atenție).
 */
export function getSinceMeta(iso) {
  const dayKey = toLocalDateKey(iso);
  if (!dayKey) {
    return {
      dateLabel: "",
      timeLabel: "",
      dateTimeLabel: "",
      dateTimeShort: "",
      days: null,
      daysLabel: "",
      title: "",
    };
  }
  const dateLabel = fmtDate(dayKey);
  const timeLabel = toLocalTimeHHMM(iso);
  const days = calendarDaysBetween(dayKey);
  const daysLabel = formatDaysLabel(days);
  const shortDate = dateLabel.length >= 5 ? dateLabel.slice(0, 5) : dateLabel; // DD/MM
  const dateTimeShort = timeLabel ? `${shortDate} ${timeLabel}` : shortDate;
  const dateTimeLabel = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
  return {
    dateLabel,
    timeLabel,
    dateTimeLabel,
    dateTimeShort,
    days,
    daysLabel,
    title: `Din ${dateTimeLabel} · ${daysLabel}`,
  };
}

export function getMondayOfISOWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export function getDaysOfWeek(mondayDate = getMondayOfISOWeek()) {
  const list = [];
  const start = new Date(mondayDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateIso = `${year}-${month}-${day}`;
    const isToday = dateIso === todayISO();
    const labelShort = d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" });
    const label = d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
    list.push({ dateIso, isToday, labelShort, label });
  }
  return list;
}

// Format dată simplu: DD/MM/YYYY
export function fmtDate(iso) {
  if (!iso) return "—";
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Format dată + oră simplă 24h: DD/MM/YYYY, HH:mm
export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

/** Badge scurt pe carduri Programat: „15/08 09:00”. */
export function formatProgramareShort(iso) {
  if (!iso) return "";
  const raw = String(iso);
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const [, m, d] = day.split("-");
  const time = raw.slice(11, 16);
  return time && /^\d{2}:\d{2}$/.test(time) ? `${d}/${m} ${time}` : `${d}/${m}`;
}

/** Programare lizibilă pe listă Brief/Dosare: „15/08/2026” sau „15/08/2026 09:00”. */
export function formatProgramareDate(iso) {
  if (!iso) return "";
  const raw = String(iso);
  const day = raw.slice(0, 10);
  const dateLabel = fmtDate(day);
  if (!dateLabel || dateLabel === "—") return "";
  const time = raw.slice(11, 16);
  return time && /^\d{2}:\d{2}$/.test(time) ? `${dateLabel} ${time}` : dateLabel;
}

export function fmtProgramare(iso) {
  if (!iso) return "—";
  return fmtDateTime(iso);
}

// Linkuri rapide apel / WhatsApp
export function telLink(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}

export function waLink(phone, message) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `4${digits}`;
  else if (!digits.startsWith("40")) digits = `40${digits}`;
  const textParam = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${textParam}`;
}

// Șabloane pre-definite mesaje WhatsApp pentru recepție
export const WA_TEMPLATES = [
  {
    key: "gata",
    label: "📦 Mașină Gata de Ridicare",
    text: (c, brandName = "service") =>
      `Buna ziua! Masina dvs. ${c.numarInmatriculare || ""} (dosar ${c.numarDosar || ""}) este gata de ridicare. Va asteptam la ${brandName}!`
  },
  {
    key: "piese",
    label: "🛠️ Piese Sosite / Programare",
    text: (c, brandName = "service") =>
      `Buna ziua! Piesele pentru dosarul dvs. ${c.numarDosar || ""} (${c.numarInmatriculare || ""}) au sosit. Va asteptam la ${brandName}.`
  },
  {
    key: "acte",
    label: "📋 Solicitare Acte / Împuterniciri",
    text: (c) => {
      const ref = [c.numarDosar, c.numarInmatriculare].filter(Boolean).join(" / ") || "—";
      return (
        `Buna ziua! Referitor la dosarul de dauna ${ref}, va anuntam ca am primit aprobarea de reparatie ` +
        `si va rugam conform solicitarii asiguratorului sa ne transmiteti in vederea completarii dosarului ` +
        `imputernicire leasing + imputernicire utilizator. Va multumesc! Alex, Auto Wash.`
      );
    },
  },
  {
    key: "auto_schimb",
    label: "🚗 Returnare Auto la Schimb",
    text: (c, brandName = "service") =>
      `Buna ziua! Va rugam sa returnati autovehiculul la schimb oferit pentru dosarul ${c.numarDosar || ""} (${c.numarInmatriculare || ""}). Va asteptam la ${brandName}.`
  },
  {
    key: "tracking",
    label: "📱 Link Urmărire Reparație Client",
    text: (c, brandName = "service") => {
      const token = c.trackingToken || "";
      const base = typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}${window.location.pathname || ""}`
        : "https://app.workflow-daune.ro";
      const trackingUrl = token ? `${base}?track=${token}` : "";
      return `Buna ziua! Puteti urmari stadiul reparatiei autovehiculului dvs. ${c.marcaModel ? `${c.marcaModel} ` : ""}(${c.numarInmatriculare || ""}) in timp real aici: ${trackingUrl} — Echipa ${brandName}.`;
    }
  }
];


export function getWaTemplateLink(phone, templateKey, claim, brandName) {
  const tmpl = WA_TEMPLATES.find((t) => t.key === templateKey);
  const name = brandName || "service";
  const msg = tmpl && claim ? tmpl.text(claim, name) : "";
  return waLink(phone, msg);
}

