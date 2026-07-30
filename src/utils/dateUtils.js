// ---------------------------------------------------------------------------
// Helpers pentru manipularea datelor calendaristice și contactelor
// ---------------------------------------------------------------------------

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
export const todayISO = () => new Date().toISOString().slice(0, 10);
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
    const dateIso = d.toISOString().slice(0, 10);
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
    text: (c) => `Buna ziua! Masina dvs. ${c.numarInmatriculare || ""} (dosar ${c.numarDosar || ""}) este gata de ridicare. Va asteptam la service!`
  },
  {
    key: "piese",
    label: "🛠️ Piese Sosite / Programare",
    text: (c) => `Buna ziua! Piesele pentru dosarul dvs. ${c.numarDosar || ""} (${c.numarInmatriculare || ""}) au sosit. Va asteptam la service.`
  },
  {
    key: "acte",
    label: "📋 Solicitare Acte / Talon",
    text: (c) => `Buna ziua! Referitor la dosarul de dauna ${c.numarDosar || ""} (${c.numarInmatriculare || ""}), va rugam sa ne trimiteti o copie dupa talon / buletin.`
  },
  {
    key: "auto_schimb",
    label: "🚗 Returnare Auto la Schimb",
    text: (c) => `Buna ziua! Va rugam sa returnati autovehiculul la schimb oferit pentru dosarul ${c.numarDosar || ""} (${c.numarInmatriculare || ""}).`
  }
];

export function getWaTemplateLink(phone, templateKey, claim) {
  const tmpl = WA_TEMPLATES.find((t) => t.key === templateKey);
  const msg = tmpl && claim ? tmpl.text(claim) : "";
  return waLink(phone, msg);
}
