/** Validări de domeniu pentru datele dosarului (pure, fără efecte). */

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
// Format RO: B 123 ABC / B 12 ABC / CJ 12 ABC / CJ 123 ABC
const RO_PLATE_RE = /^(B|[A-Z]{2}) ?\d{2,3} ?[A-Z]{3}$/;
const MAX_AMOUNT = 10_000_000;

export function normalizeVin(vin) {
  return String(vin || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidVin(vin) {
  return VIN_RE.test(normalizeVin(vin));
}

export function isValidRoPlate(plate) {
  return RO_PLATE_RE.test(String(plate || "").toUpperCase().trim());
}

export function isValidAmount(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT;
}

/**
 * Returnează erori (blocante) și avertismente (de confirmat).
 * VIN invalid e doar avertisment: vehiculele vechi/străine pot avea serii non-standard.
 */
export function validateClaimInput({ vin, numarInmatriculare, sumaDecont } = {}) {
  const errors = {};
  const warnings = {};
  if (vin && !isValidVin(vin)) {
    warnings.vin = "Seria de șasiu nu are formatul standard (17 caractere, fără I/O/Q).";
  }
  if (numarInmatriculare && !isValidRoPlate(numarInmatriculare)) {
    warnings.plate = "Numărul de înmatriculare nu respectă formatul românesc.";
  }
  if (sumaDecont !== undefined && sumaDecont !== null && sumaDecont !== "" && !isValidAmount(sumaDecont)) {
    errors.sumaDecont = "Suma este în afara intervalului permis (0 – 10.000.000).";
  }
  return { errors, warnings };
}
