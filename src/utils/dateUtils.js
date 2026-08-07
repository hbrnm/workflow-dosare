// ---------------------------------------------------------------------------
// Helpers pentru manipularea datelor calendaristice și contactelor
// ---------------------------------------------------------------------------

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
export const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const nowISO = () => new Date().toISOString();

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
  }
];

export function getWaTemplateLink(phone, templateKey, claim, brandName) {
  const tmpl = WA_TEMPLATES.find((t) => t.key === templateKey);
  const name = brandName || "service";
  const msg = tmpl && claim ? tmpl.text(claim, name) : "";
  return waLink(phone, msg);
}
