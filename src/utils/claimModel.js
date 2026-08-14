import { INSURERS, getStatusAlertDays } from "../constants/config";
import { emptyAudatexDevizTotals } from "../constants/audatexDevizFields";
import { uid, todayISO, nowISO } from "./dateUtils";

export function getMostFrequentInsurer(claims = [], fallback = INSURERS[0]) {
  if (!Array.isArray(claims) || claims.length === 0) return fallback || "Omniasig VIG";
  const counts = {};
  claims.forEach((c) => {
    if (c && c.asigurator) {
      const ins = String(c.asigurator).trim();
      if (ins) counts[ins] = (counts[ins] || 0) + 1;
    }
  });
  let maxCount = 0;
  let topInsurer = fallback || "Omniasig VIG";
  Object.entries(counts).forEach(([ins, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      topInsurer = ins;
    }
  });
  return topInsurer;
}

export function emptyClaim(status = "deschidere", defaultInsurer = "Omniasig VIG") {
  return {
    id: uid(),
    numarDosar: "", tipAsigurare: "RCA", asigurator: defaultInsurer || INSURERS[0] || "Omniasig VIG", client: "", delegat: "", telefonClient: "",
    numarInmatriculare: "", vin: "", marcaModel: "", marca: "", model: "", kilometraj: null,
    status: status === "primit" ? "deschidere" : status,
    dataDeschiderii: todayISO(), dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(),
    termenAlertaZile: getStatusAlertDays(status === "primit" ? "deschidere" : status), dataProgramare: "", dataComandaPiese: null, termenLivrarePiese: null, note: [], documente: [],
    adusaFizic: false, ceEsteDeReparat: "",
    operatiuni: { inl: false, rev: false, rep: false, uni: false },
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    masinaSchimb: "", dataDariiLaSchimb: "", zileChirieAudatex: 0,
    valoarePieseAudatex: 0, valoareAchizitiePiese: 0,
    financiar: { tvaProc: 21, pieseFacturateFaraTva: 0, costManoperaInterna: 0, costManoperaTinichigerieService: 0, costManoperaVopsitorieService: 0, oreLucrateTinichigerie: 0, oreLucrateVopsitorie: 0, costMaterialeVopsitorieService: 0, costConsumabileTinichigerieService: 0, costuriExterne: 0, costMasinaSchimb: 0, numarFactura: "", dataFactura: null, audatex: emptyAudatexDevizTotals() },
    blocat: false, motivBlocare: "",
    createdBy: null, createdByEmail: "", updatedByEmail: "",
    atelierId: null,
    poze: [],
    damageMarks: [],
    tipDocumente: [],
    nrDosarAsigurator: "",
    inspectorDauna: "",
    trackingToken: (crypto.randomUUID ? crypto.randomUUID() : uid()).replace(/-/g, ""),
    termenPlata: null,
    sumaDecont: 0,
    devize: [],
    mesajClient: "",
    gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null,
    incasat: false, dataIncasarii: null,
    alerteAck: false,
    pieseSosite: false,
    programareStatus: null,
  };
}

export function parseNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === "") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  if (!str) return defaultVal;

  // Clean currency symbols, units, spaces (e.g. "1 250,50 RON" -> "1250,50")
  const cleaned = str.replace(/[^\d.,-]/g, "");
  if (!cleaned) return defaultVal;

  const dotIdx = cleaned.lastIndexOf(".");
  const commaIdx = cleaned.lastIndexOf(",");

  let normalized = cleaned;

  if (dotIdx !== -1 && commaIdx !== -1) {
    if (dotIdx > commaIdx) {
      // US format: "1,250.50" -> "1250.50"
      normalized = cleaned.replace(/,/g, "");
    } else {
      // European / RO format: "1.250,50" -> "1250.50"
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (commaIdx !== -1) {
    // Only comma present
    const afterComma = cleaned.slice(commaIdx + 1);
    if (afterComma.length === 3 && cleaned.length > 4) {
      // Thousands comma: "85,000" -> "85000"
      normalized = cleaned.replace(/,/g, "");
    } else {
      // Decimal comma: "1250,50" -> "1250.50"
      normalized = cleaned.replace(/,/g, ".");
    }
  } else if (dotIdx !== -1) {
    // Only dot present
    const afterDot = cleaned.slice(dotIdx + 1);
    if (afterDot.length === 3 && cleaned.length > 4) {
      // Thousands dot: "85.200" -> "85200"
      normalized = cleaned.replace(/\./g, "");
    }
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? defaultVal : parsed;
}

export function sanitizeClaim(c) {
  const base = emptyClaim();
  if (!c) return base;
  return {
    ...base,
    ...c,
    numarDosar: c.numarDosar || "",
    tipAsigurare: c.tipAsigurare || "CASCO",
    asigurator: c.asigurator || "",
    client: c.client || "",
    delegat: c.delegat || "",
    telefonClient: c.telefonClient || "",
    numarInmatriculare: c.numarInmatriculare || "",
    vin: c.vin || "",
    marca: c.marca || "",
    model: c.model || "",
    marcaModel: c.marcaModel || [c.marca, c.model].filter(Boolean).join(" ") || "",
    kilometraj: c.kilometraj == null || c.kilometraj === "" ? null : parseNumber(c.kilometraj, null),
    damageMarks: Array.isArray(c.damageMarks) ? c.damageMarks : [],
    tipDocumente: Array.isArray(c.tipDocumente) ? c.tipDocumente : [],
    nrDosarAsigurator: c.nrDosarAsigurator || "",
    inspectorDauna: c.inspectorDauna || "",
    trackingToken: c.trackingToken || (crypto.randomUUID ? crypto.randomUUID() : uid()).replace(/-/g, ""),
    termenPlata: c.termenPlata || null,
    sumaDecont: parseNumber(c.sumaDecont, 0),
    devize: Array.isArray(c.devize) ? c.devize : [],
    mesajClient: c.mesajClient || "",
    status: c.status || "primit",
    dataComandaPiese: c.dataComandaPiese || null,
    termenLivrarePiese: c.termenLivrarePiese || null,
    ceEsteDeReparat: c.ceEsteDeReparat || "",
    operatiuni: Array.isArray(c.operatiuni) && c.operatiuni.length > 0
      ? c.operatiuni.map((op, idx) => ({
          id: op.id || uid() + "_" + idx,
          piesa: op.piesa || "",
          inl: !!op.inl,
          rev: !!op.rev,
          rep: !!op.rep,
          uni: !!op.uni,
        }))
      : c.operatiuni && typeof c.operatiuni === "object"
      ? [
          {
            id: uid(),
            piesa: c.ceEsteDeReparat || "",
            inl: !!c.operatiuni.inl,
            rev: !!c.operatiuni.rev,
            rep: !!c.operatiuni.rep,
            uni: !!c.operatiuni.uni,
          },
        ]
      : [
          { id: uid(), piesa: c.ceEsteDeReparat || "", inl: false, rev: false, rep: false, uni: false },
        ],
    masinaSchimb: c.masinaSchimb || "",
    dataDariiLaSchimb: c.dataDariiLaSchimb || "",
    motivBlocare: c.motivBlocare || "",
    adusaFizic: !!c.adusaFizic,
    gataDeRidicare: !!c.gataDeRidicare,
    dataGataRidicare: c.dataGataRidicare || null,
    ridicata: !!c.ridicata,
    dataRidicare: c.dataRidicare || null,
    valoareDevizAudatex: parseNumber(c.valoareDevizAudatex, 0),
    valoarePieseAudatex: parseNumber(c.valoarePieseAudatex, 0),
    valoareAchizitiePiese: parseNumber(c.valoareAchizitiePiese, 0),
    valoareAcceptataReglata: parseNumber(c.valoareAcceptataReglata ?? c.financiar?.valoareAcceptPlata, 0),
    financiar: {
      ...(c.financiar || {}),
      valoareDevizAudatex: parseNumber(c.valoareDevizAudatex ?? c.financiar?.valoareDevizAudatex, 0),
      ...(c.dataAdusaFizic ? { dataAdusaFizic: c.dataAdusaFizic } : {}),
      valoareAcceptPlata: parseNumber(c.financiar?.valoareAcceptPlata ?? c.valoareAcceptataReglata, 0),
      valoareFransiza: parseNumber(c.financiar?.valoareFransiza, 0),
      manoperaTinichigerie: parseNumber(c.financiar?.manoperaTinichigerie ?? c.manopera?.tinichigerie?.facturat, 0),
      manoperaVopsitorie: parseNumber(c.financiar?.manoperaVopsitorie ?? c.manopera?.vopsitorie?.facturat, 0),
      materialeVopsitorie: parseNumber(c.financiar?.materialeVopsitorie, 0),
      cheltuieliDiverse: parseNumber(c.financiar?.cheltuieliDiverse ?? c.financiar?.costuriExterne, 0),
      costManoperaTinichigerieService: parseNumber(c.financiar?.costManoperaTinichigerieService, 0),
      costManoperaVopsitorieService: parseNumber(c.financiar?.costManoperaVopsitorieService, 0),
      oreLucrateTinichigerie: parseNumber(c.financiar?.oreLucrateTinichigerie, 0),
      oreLucrateVopsitorie: parseNumber(c.financiar?.oreLucrateVopsitorie, 0),
      costMaterialeVopsitorieService: parseNumber(c.financiar?.costMaterialeVopsitorieService, 0),
      costConsumabileTinichigerieService: parseNumber(c.financiar?.costConsumabileTinichigerieService, 0),
      costMasinaSchimb: parseNumber(c.financiar?.costMasinaSchimb, 0),
      tvaProc: parseNumber(c.financiar?.tvaProc, 21),
      pieseFacturateFaraTva: parseNumber(c.financiar?.pieseFacturateFaraTva ?? c.valoarePieseAudatex, 0),
      numarFactura: c.financiar?.numarFactura || "",
      dataFactura: c.financiar?.dataFactura || null,
      audatex: {
        ...emptyAudatexDevizTotals(),
        totalPiese: parseNumber(c.financiar?.audatex?.totalPiese ?? c.valoarePieseAudatex ?? c.financiar?.pieseFacturateFaraTva, 0),
        totalManopera: parseNumber(c.financiar?.audatex?.totalManopera ?? c.financiar?.manoperaTinichigerie ?? c.manopera?.tinichigerie?.facturat, 0),
        totalCosturiSuplimentare: parseNumber(c.financiar?.audatex?.totalCosturiSuplimentare, 0),
        totalVopsitorie: parseNumber(
          c.financiar?.audatex?.totalVopsitorie ??
            (parseNumber(c.financiar?.manoperaVopsitorie, 0) + parseNumber(c.financiar?.materialeVopsitorie, 0)),
          0
        ),
        costReparatieFaraTva: parseNumber(c.financiar?.audatex?.costReparatieFaraTva ?? c.valoareDevizAudatex ?? c.financiar?.valoareDevizAudatex, 0),
        costReparatieCuTva: parseNumber(c.financiar?.audatex?.costReparatieCuTva, 0),
        manoperaVopsitorie: parseNumber(c.financiar?.audatex?.manoperaVopsitorie ?? c.financiar?.manoperaVopsitorie ?? c.manopera?.vopsitorie?.facturat, 0),
        materialeVopsitorie: parseNumber(c.financiar?.audatex?.materialeVopsitorie ?? c.financiar?.materialeVopsitorie, 0),
      },
      ...(c.financiar?.audatexImport ? { audatexImport: c.financiar.audatexImport } : {}),
    },
    zileChirieAudatex: parseNumber(c.zileChirieAudatex, 0),
    termenAlertaZile: parseNumber(c.termenAlertaZile, 3),
    incasat: !!c.incasat,
    dataIncasarii: c.dataIncasarii || null,
    alerteAck: !!c.alerteAck,
    pieseSosite: !!c.pieseSosite,
    programareStatus:
      c.programareStatus === "onorata" || c.programareStatus === "neonorata"
        ? c.programareStatus
        : null,
    note: Array.isArray(c.note) ? c.note : [],
    documente: Array.isArray(c.documente) ? c.documente : [],
    poze: Array.isArray(c.poze) ? c.poze : [],
    manopera: {
      tinichigerie: { facturat: parseNumber(c.manopera?.tinichigerie?.facturat, 0), alocat: parseNumber(c.manopera?.tinichigerie?.alocat, 0), dataIntrareEtapa: c.manopera?.tinichigerie?.dataIntrareEtapa || null },
      vopsitorie: { facturat: parseNumber(c.manopera?.vopsitorie?.facturat, 0), alocat: parseNumber(c.manopera?.vopsitorie?.alocat, 0), dataIntrareEtapa: c.manopera?.vopsitorie?.dataIntrareEtapa || null },
    },
  };
}
