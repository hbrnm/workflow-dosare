import { daysBetween, todayISO } from "../utils/dateUtils";

/** Sumă de încasat pe dosar. */
export function getSettlementAmount(claim) {
  if (!claim) return 0;
  const fromField = Number(claim.sumaDecont);
  if (!Number.isNaN(fromField) && fromField > 0) return fromField;
  return (
    Number(claim.financiar?.valoareAcceptPlata) ||
    Number(claim.valoareAcceptataReglata) ||
    Number(claim.financiar?.pieseFacturateFaraTva) ||
    0
  );
}

/** Data facturii (ISO date string YYYY-MM-DD). */
export function getInvoiceDate(claim) {
  const d = claim?.financiar?.dataFactura || claim?.dataFactura;
  return d ? String(d).slice(0, 10) : "";
}

/**
 * Termen plată efectiv:
 * 1) termenPlata setat
 * 2) altfel data facturii + 30 zile
 */
export function getEffectivePaymentDue(claim) {
  if (claim?.termenPlata) return String(claim.termenPlata).slice(0, 10);
  const inv = getInvoiceDate(claim);
  if (!inv) return "";
  const d = new Date(`${inv}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSettlementCandidate(claim) {
  if (!claim || claim.incasat) return false;
  if (claim.status === "facturat") return true;
  if (claim.financiar?.numarFactura) return true;
  if (getInvoiceDate(claim)) return true;
  if (Number(claim.sumaDecont) > 0) return true;
  return false;
}

export function isPaymentOverdue(claim) {
  if (claim?.alerteAck) return false;
  if (!isSettlementCandidate(claim)) return false;
  const due = getEffectivePaymentDue(claim);
  if (!due) return false;
  return due < todayISO();
}

export function getDaysPaymentOverdue(claim) {
  const due = getEffectivePaymentDue(claim);
  if (!due) return 0;
  return daysBetween(`${due}T12:00:00.000Z`);
}

export function groupRestanteByInsurer(claims = []) {
  const map = {};
  (claims || [])
    .filter((c) => isSettlementCandidate(c))
    .forEach((c) => {
      const key = c.asigurator?.trim() || "Neprecizat";
      if (!map[key]) map[key] = { name: key, value: 0, count: 0, overdueCount: 0 };
      map[key].value += getSettlementAmount(c);
      map[key].count += 1;
      if (isPaymentOverdue(c)) map[key].overdueCount += 1;
    });
  return Object.values(map).sort((a, b) => b.value - a.value);
}
