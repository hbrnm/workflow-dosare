import { uid } from "./dateUtils";
import { operationsSummary } from "./estimateUtils";
import { applyLaborCostsToClaim } from "./manoperaCost";
import { normalizeAudatexImportValues } from "./audatexTypes";

/**
 * Apply parsed values onto a claim form object (immutable).
 * Syncs financiar.* and manopera.*.facturat/alocat.
 * Optionally replaces/merges operațiuni from extracted line items.
 */
export function applyEstimateValuesToClaim(claim, values = {}, options = {}) {
  const next = { ...(claim || {}) };
  const financiar = { ...(next.financiar || {}) };
  const manopera = {
    tinichigerie: { ...(next.manopera?.tinichigerie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }) },
    vopsitorie: { ...(next.manopera?.vopsitorie || { facturat: 0, alocat: 0, dataIntrareEtapa: null }) },
  };

  const normalized = normalizeAudatexImportValues(values);
  const audatex = { ...(financiar.audatex || {}) };
  const has = (keys) => keys.some((k) => values[k] != null && values[k] !== "");

  if (has(["totalPieseAudatex", "valoarePieseAudatex"])) {
    next.valoarePieseAudatex = normalized.totalPiese;
    financiar.pieseFacturateFaraTva = normalized.totalPiese;
    audatex.totalPiese = normalized.totalPiese;
  }
  if (has(["totalManoperaAudatex", "manoperaTinichigerie"])) {
    financiar.manoperaTinichigerie = normalized.totalManopera;
    manopera.tinichigerie.facturat = normalized.totalManopera;
    audatex.totalManopera = normalized.totalManopera;
  }
  if (has(["totalCosturiSuplimentareAudatex", "cheltuieliDiverse"])) {
    audatex.totalCosturiSuplimentare = normalized.totalCosturiSuplimentare;
  }
  if (has(["totalVopsitorieAudatex"])) {
    audatex.totalVopsitorie = normalized.totalVopsitorie;
  }
  if (has(["manoperaVopsitorie"])) {
    financiar.manoperaVopsitorie = normalized.manoperaVopsitorie;
    manopera.vopsitorie.facturat = normalized.manoperaVopsitorie;
    audatex.manoperaVopsitorie = normalized.manoperaVopsitorie;
  }
  if (has(["materialeVopsitorie"])) {
    financiar.materialeVopsitorie = normalized.materialeVopsitorie;
    audatex.materialeVopsitorie = normalized.materialeVopsitorie;
  }
  if (
    has(["totalVopsitorieAudatex"]) ||
    (has(["manoperaVopsitorie"]) && has(["materialeVopsitorie"]))
  ) {
    audatex.totalVopsitorie = normalized.totalVopsitorie;
  }
  if (has(["costReparatieFaraTva", "valoareDevizAudatex"])) {
    next.valoareDevizAudatex = normalized.costReparatieFaraTva;
    financiar.valoareDevizAudatex = normalized.costReparatieFaraTva;
    audatex.costReparatieFaraTva = normalized.costReparatieFaraTva;
  }
  if (has(["costReparatieCuTva"])) {
    audatex.costReparatieCuTva = normalized.costReparatieCuTva;
  }

  financiar.audatex = audatex;

  if (normalized.zileChirieAudatex != null && values.zileChirieAudatex != null) {
    next.zileChirieAudatex = normalized.zileChirieAudatex;
  }

  if (values.oreTinichigerieAudatex != null) {
    financiar.oreLucrateTinichigerie = Math.round(Number(values.oreTinichigerieAudatex) * 100) / 100;
  }
  if (values.oreVopsitorieAudatex != null) {
    financiar.oreLucrateVopsitorie = Math.round(Number(values.oreVopsitorieAudatex) * 100) / 100;
  }

  if (options.importMeta) {
    financiar.audatexImport = options.importMeta;
  }

  next.financiar = financiar;
  next.manopera = manopera;

  const ops = options.operations;
  const applyOps = options.applyOperations !== false && Array.isArray(ops) && ops.length > 0;
  if (applyOps) {
    const incoming = ops.map((op) => ({
      id: op.id || uid(),
      piesa: String(op.piesa || "").toUpperCase(),
      inl: !!op.inl,
      rev: !!op.rev,
      rep: !!op.rep,
      uni: !!op.uni,
    }));
    if (options.replaceOperations !== false) {
      next.operatiuni = incoming;
    } else {
      const existing = Array.isArray(next.operatiuni) ? next.operatiuni : [];
      next.operatiuni = [...existing, ...incoming];
    }
    next.ceEsteDeReparat = operationsSummary(next.operatiuni);
  }

  if (options.manoperaTarife && (values.oreTinichigerieAudatex != null || values.oreVopsitorieAudatex != null)) {
    return applyLaborCostsToClaim(next, options.manoperaTarife, {
      oreTinichigerie: financiar.oreLucrateTinichigerie,
      oreVopsitorie: financiar.oreLucrateVopsitorie,
      setOre: false,
    });
  }

  return next;
}
