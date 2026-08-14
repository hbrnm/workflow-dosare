import { normalizeManoperaTarife } from "../constants/manoperaTarife";

/** Tarif orar din salariu lunar + overhead (ex. chirie, utilități). */
export function hourlyRateFromSalary(salariuLunar, oreProductiveLuna, overheadProc = 0) {
  const salary = Number(salariuLunar) || 0;
  const hours = Math.max(1, Number(oreProductiveLuna) || 160);
  const overhead = Math.max(0, Number(overheadProc) || 0);
  if (salary <= 0) return 0;
  const cost = salary * (1 + overhead / 100);
  return Math.round((cost / hours) * 100) / 100;
}

export function resolveRoleHourlyRate(roleSettings = {}) {
  const manual = roleSettings.tarifOrar ?? roleSettings.tarif_orar;
  if (manual != null && manual !== "" && Number(manual) > 0) {
    return Math.round(Number(manual) * 100) / 100;
  }
  return hourlyRateFromSalary(
    roleSettings.salariuLunar ?? roleSettings.salariu_lunar,
    roleSettings.oreProductiveLuna ?? roleSettings.ore_productive_luna,
    roleSettings.overheadProc ?? roleSettings.overhead_proc
  );
}

export function laborCostFromHours(hours, hourlyRate) {
  const h = Math.max(0, Number(hours) || 0);
  const r = Math.max(0, Number(hourlyRate) || 0);
  return Math.round(h * r * 100) / 100;
}

export function computeServiceLaborCosts(oreTinichigerie, oreVopsitorie, tarifeRaw) {
  const tarife = normalizeManoperaTarife(tarifeRaw);
  const rateTin = resolveRoleHourlyRate(tarife.tinichigerie);
  const rateVops = resolveRoleHourlyRate(tarife.vopsitorie);
  const tinichigerie = laborCostFromHours(oreTinichigerie, rateTin);
  const vopsitorie = laborCostFromHours(oreVopsitorie, rateVops);
  return {
    tinichigerie,
    vopsitorie,
    total: Math.round((tinichigerie + vopsitorie) * 100) / 100,
    rateTinichigerie: rateTin,
    rateVopsitorie: rateVops,
  };
}

/** Aplică ore + costuri calculate pe obiect claim (immutabil). */
export function applyLaborCostsToClaim(claim, tarifeRaw, options = {}) {
  const financiar = { ...(claim?.financiar || {}) };
  const oreTin = options.oreTinichigerie ?? financiar.oreLucrateTinichigerie ?? 0;
  const oreVops = options.oreVopsitorie ?? financiar.oreLucrateVopsitorie ?? 0;
  const costs = computeServiceLaborCosts(oreTin, oreVops, tarifeRaw);

  if (options.setOre !== false) {
    financiar.oreLucrateTinichigerie = Math.round(Math.max(0, Number(oreTin) || 0) * 100) / 100;
    financiar.oreLucrateVopsitorie = Math.round(Math.max(0, Number(oreVops) || 0) * 100) / 100;
  }

  if (options.updateCosts !== false) {
    financiar.costManoperaTinichigerieService = costs.tinichigerie;
    financiar.costManoperaVopsitorieService = costs.vopsitorie;
  }

  return { ...claim, financiar };
}

/** True dacă există cel puțin un tarif orar (manual sau din salariu). */
export function hasConfiguredLaborRates(tarifeRaw) {
  const tarife = normalizeManoperaTarife(tarifeRaw);
  return resolveRoleHourlyRate(tarife.tinichigerie) > 0 || resolveRoleHourlyRate(tarife.vopsitorie) > 0;
}
