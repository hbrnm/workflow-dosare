/** Tarife manoperă atelier — salariu → tarif orar pentru calcul cost real pe dosar. */

export const MANOPERA_TARIFE_STORAGE_KEY = "workflow_dosare_manopera_tarife";

export const DEFAULT_ROLE_TARIF = {
  salariuLunar: 0,
  oreProductiveLuna: 160,
  overheadProc: 20,
  tarifOrar: null,
};

export const DEFAULT_MANOPERA_TARIFE = {
  tinichigerie: { ...DEFAULT_ROLE_TARIF },
  vopsitorie: { ...DEFAULT_ROLE_TARIF },
  autoCalcFromOre: true,
};

function normalizeRole(raw = {}, fallback = DEFAULT_ROLE_TARIF) {
  const salariuLunar = Number(raw.salariuLunar ?? raw.salariu_lunar ?? fallback.salariuLunar) || 0;
  const oreProductiveLuna = Math.max(1, Number(raw.oreProductiveLuna ?? raw.ore_productive_luna ?? fallback.oreProductiveLuna) || 160);
  const overheadProc = Math.max(0, Number(raw.overheadProc ?? raw.overhead_proc ?? fallback.overheadProc) || 0);
  const tarifRaw = raw.tarifOrar ?? raw.tarif_orar;
  const tarifOrar =
    tarifRaw != null && tarifRaw !== "" && Number.isFinite(Number(tarifRaw)) && Number(tarifRaw) > 0
      ? Math.round(Number(tarifRaw) * 100) / 100
      : null;

  return { salariuLunar, oreProductiveLuna, overheadProc, tarifOrar };
}

export function normalizeManoperaTarife(raw = {}) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MANOPERA_TARIFE, tinichigerie: { ...DEFAULT_ROLE_TARIF }, vopsitorie: { ...DEFAULT_ROLE_TARIF } };
  return {
    tinichigerie: normalizeRole(raw.tinichigerie, DEFAULT_ROLE_TARIF),
    vopsitorie: normalizeRole(raw.vopsitorie, DEFAULT_ROLE_TARIF),
    autoCalcFromOre: raw.autoCalcFromOre !== false && raw.auto_calc_from_ore !== false,
  };
}

export function loadCachedManoperaTarife() {
  try {
    const raw = JSON.parse(localStorage.getItem(MANOPERA_TARIFE_STORAGE_KEY) || "null");
    return raw ? normalizeManoperaTarife(raw) : normalizeManoperaTarife(DEFAULT_MANOPERA_TARIFE);
  } catch {
    return normalizeManoperaTarife(DEFAULT_MANOPERA_TARIFE);
  }
}

export function cacheManoperaTarife(tarife) {
  const next = normalizeManoperaTarife(tarife);
  try {
    localStorage.setItem(MANOPERA_TARIFE_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("Unable to persist manopera tarife to localStorage", err);
  }
  return next;
}
