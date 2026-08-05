import { INSURERS, STATUS_MIGRATION, STATUSES } from "../constants/config";
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
    numarInmatriculare: "", vin: "", marcaModel: "", status: status === "primit" ? "deschidere" : status,
    dataDeschiderii: todayISO(), dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(),
    termenAlertaZile: 3, dataProgramare: "", dataComandaPiese: null, note: [], documente: [],
    adusaFizic: false, ceEsteDeReparat: "",
    operatiuni: { inl: false, rev: false, rep: false, uni: false },
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    masinaSchimb: "", dataDariiLaSchimb: "", zileChirieAudatex: 0,
    valoarePieseAudatex: 0, valoareAchizitiePiese: 0,
    financiar: { tvaProc: 21, pieseFacturateFaraTva: 0, costManoperaInterna: 0, costuriExterne: 0, costMasinaSchimb: 0, numarFactura: "", dataFactura: null },
    blocat: false, motivBlocare: "",
    createdBy: null, createdByEmail: "", updatedByEmail: "",
    poze: [],
    gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null,
    incasat: false, dataIncasarii: null,
    alerteAck: false,
    pieseSosite: false,
  };
}

export function parseNumber(val, defaultVal = 0) {
  if (val === null || val === undefined || val === "") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  if (!str) return defaultVal;
  let normalized = str;
  if (str.includes(".") && str.includes(",")) {
    normalized = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    normalized = str.replace(",", ".");
  }
  const parsed = parseFloat(normalized.replace(/[^0-9.-]/g, ""));
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
    marcaModel: c.marcaModel || "",
    status: c.status || "primit",
    dataComandaPiese: c.dataComandaPiese || null,
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
      valoareAcceptPlata: parseNumber(c.financiar?.valoareAcceptPlata ?? c.valoareAcceptataReglata, 0),
      valoareFransiza: parseNumber(c.financiar?.valoareFransiza, 0),
      manoperaTinichigerie: parseNumber(c.financiar?.manoperaTinichigerie ?? c.manopera?.tinichigerie?.facturat, 0),
      manoperaVopsitorie: parseNumber(c.financiar?.manoperaVopsitorie ?? c.manopera?.vopsitorie?.facturat, 0),
      cheltuieliDiverse: parseNumber(c.financiar?.cheltuieliDiverse ?? c.financiar?.costuriExterne, 0),
      costMasinaSchimb: parseNumber(c.financiar?.costMasinaSchimb, 0),
      tvaProc: parseNumber(c.financiar?.tvaProc, 21),
      pieseFacturateFaraTva: parseNumber(c.financiar?.pieseFacturateFaraTva ?? c.valoarePieseAudatex, 0),
      numarFactura: c.financiar?.numarFactura || "",
      dataFactura: c.financiar?.dataFactura || null,
    },
    zileChirieAudatex: parseNumber(c.zileChirieAudatex, 0),
    termenAlertaZile: parseNumber(c.termenAlertaZile, 3),
    incasat: !!c.incasat,
    dataIncasarii: c.dataIncasarii || null,
    alerteAck: !!c.alerteAck,
    pieseSosite: !!c.pieseSosite,
    note: Array.isArray(c.note) ? c.note : [],
    documente: Array.isArray(c.documente) ? c.documente : [],
    poze: Array.isArray(c.poze) ? c.poze : [],
    manopera: {
      tinichigerie: { facturat: parseNumber(c.manopera?.tinichigerie?.facturat, 0), alocat: parseNumber(c.manopera?.tinichigerie?.alocat, 0), dataIntrareEtapa: c.manopera?.tinichigerie?.dataIntrareEtapa || null },
      vopsitorie: { facturat: parseNumber(c.manopera?.vopsitorie?.facturat, 0), alocat: parseNumber(c.manopera?.vopsitorie?.alocat, 0), dataIntrareEtapa: c.manopera?.vopsitorie?.dataIntrareEtapa || null },
    },
  };
}

export function normalizedText(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function storagePath(claimId, file, folder = "poze") {
  const ext = file.name ? file.name.split(".").pop() : "bin";
  return `${claimId || "temp"}/${folder}/${uid()}.${ext}`;
}

/** TTL pentru URL-uri semnate Storage (24h). Se regenerează la deschiderea dosarului. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

/**
 * Regenerates signed URLs for storage items that have a path.
 * Always refreshes http(s) signed URLs (they expire). Keeps data: URLs as-is.
 */
export async function refreshStorageUrls(items = [], bucketName, supabaseClient) {
  if (!items || !items.length || !supabaseClient) return items || [];

  const result = items.map((item) => (item && typeof item === "object" ? { ...item } : item));
  const toSign = [];

  result.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const url = item.url ? String(item.url) : "";
    if (url.startsWith("data:")) return;
    if (!item.path) return;
    toSign.push({ index, path: item.path });
  });

  if (toSign.length === 0) return result;

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .createSignedUrls(
        toSign.map((t) => t.path),
        SIGNED_URL_TTL_SECONDS
      );

    if (!error && Array.isArray(data)) {
      data.forEach((signed, i) => {
        const target = toSign[i];
        if (!target) return;
        if (signed?.signedUrl) {
          result[target.index] = { ...result[target.index], url: signed.signedUrl };
        }
      });
      return result;
    }
  } catch (err) {
    console.warn("createSignedUrls batch failed, falling back", err);
  }

  // Fallback: one-by-one
  await Promise.all(
    toSign.map(async ({ index, path }) => {
      try {
        const { data: signed } = await supabaseClient.storage
          .from(bucketName)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) {
          result[index] = { ...result[index], url: signed.signedUrl };
        }
      } catch (err) {
        /* keep previous url */
      }
    })
  );

  return result;
}

/** Don't persist expired signed URLs — only path (+ metadata). data: URLs kept. */
export function stripEphemeralMediaUrls(items = []) {
  if (!Array.isArray(items)) return items || [];
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const url = item.url ? String(item.url) : "";
    if (url.startsWith("data:")) return item;
    if (!item.path) return item;
    const { url: _drop, ...rest } = item;
    return rest;
  });
}

export async function uploadStorageItem(supabaseClient, bucketName, claimId, file, folder) {
  const path = storagePath(claimId, file, folder);
  const { error } = await supabaseClient.storage.from(bucketName).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: signed, error: signedError } = await supabaseClient.storage
    .from(bucketName)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signedError) {
    await supabaseClient.storage.from(bucketName).remove([path]);
    throw signedError;
  }
  return { id: uid(), path, url: signed?.signedUrl || "", nume: file.name, incarcatLa: nowISO() };
}

export function toDb(c) {
  return {
    id: c.id,
    numar_dosar: c.numarDosar,
    tip_asigurare: c.tipAsigurare,
    asigurator: c.asigurator,
    client: c.client,
    delegat: c.delegat || "",
    telefon_client: c.telefonClient,
    numar_inmatriculare: c.numarInmatriculare,
    vin: c.vin,
    marca_model: c.marcaModel,
    status: c.status,
    data_deschiderii: c.dataDeschiderii,
    data_schimbare_status: c.dataSchimbareStatus,
    data_ultimei_actualizari: c.dataUltimeiActualizari,
    termen_alerta_zile: c.termenAlertaZile,
    data_programare: c.dataProgramare || null,
    data_comanda_piese: c.dataComandaPiese || null,
    note: c.note,
    documente: stripEphemeralMediaUrls(c.documente),
    poze: stripEphemeralMediaUrls(c.poze || []),
    adusa_fizic: c.adusaFizic,
    ce_este_de_reparat: c.ceEsteDeReparat,
    operatiuni: c.operatiuni || { inl: false, rev: false, rep: false, uni: false },
    manopera: c.manopera,
    masina_schimb: c.masinaSchimb,
    data_darii_la_schimb: c.dataDariiLaSchimb || null,
    zile_chirie_audatex: c.zileChirieAudatex,
    valoare_piese_audatex: c.financiar?.pieseFacturateFaraTva ?? c.valoarePieseAudatex,
    valoare_achizitie_piese: c.valoareAchizitiePiese,
    financiar: c.financiar,
    blocat: c.blocat,
    motiv_blocare: c.motivBlocare,
    created_by: c.createdBy,
    created_by_email: c.createdByEmail,
    updated_by_email: c.updatedByEmail,
    gata_de_ridicare: c.gataDeRidicare,
    data_gata_ridicare: c.dataGataRidicare || null,
    ridicata: c.ridicata,
    data_ridicare: c.dataRidicare || null,
    incasat: c.incasat || false,
    data_incasarii: c.dataIncasarii || null,
    alerte_ack: c.alerteAck || false,
    piese_sosite: !!c.pieseSosite,
  };
}

export function fromDb(row) {
  if (!row) return emptyClaim();
  const rawStatus = row.status;
  const migratedStatus = STATUS_MIGRATION[rawStatus] || rawStatus;
  const status = STATUSES.some((s) => s.key === migratedStatus) ? migratedStatus : "deschidere";

  return sanitizeClaim({
    id: row.id,
    numarDosar: row.numar_dosar || "",
    tipAsigurare: row.tip_asigurare || "CASCO",
    asigurator: row.asigurator || "",
    client: row.client || "",
    delegat: row.delegat || "",
    telefonClient: row.telefon_client || "",
    numarInmatriculare: row.numar_inmatriculare || "",
    vin: row.vin || "",
    marcaModel: row.marca_model || "",
    status,
    dataDeschiderii: row.data_deschiderii || todayISO(),
    dataSchimbareStatus: row.data_schimbare_status || row.created_at || nowISO(),
    dataUltimeiActualizari: row.data_ultimei_actualizari || nowISO(),
    termenAlertaZile: row.termen_alerta_zile || 3,
    dataProgramare: row.data_programare || "",
    dataComandaPiese: row.data_comanda_piese || null,
    note: row.note || [],
    documente: row.documente || [],
    poze: row.poze || [],
    adusaFizic: !!row.adusa_fizic,
    ceEsteDeReparat: row.ce_este_de_reparat || "",
    operatiuni: row.operatiuni || { inl: false, rev: false, rep: false, uni: false },
    manopera: row.manopera || {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    masinaSchimb: row.masina_schimb || "",
    dataDariiLaSchimb: row.data_darii_la_schimb || "",
    zileChirieAudatex: row.zile_chirie_audatex || 0,
    valoarePieseAudatex: row.valoare_piese_audatex || 0,
    valoareAchizitiePiese: row.valoare_achizitie_piese || 0,
    financiar: row.financiar || undefined,
    blocat: !!row.blocat,
    motivBlocare: row.motiv_blocare || "",
    createdBy: row.created_by,
    createdByEmail: row.created_by_email || "",
    updatedByEmail: row.updated_by_email || "",
    gataDeRidicare: !!row.gata_de_ridicare,
    dataGataRidicare: row.data_gata_ridicare || null,
    ridicata: !!row.ridicata,
    dataRidicare: row.data_ridicare || null,
    incasat: !!row.incasat,
    dataIncasarii: row.data_incasarii || null,
    alerteAck: !!row.alerte_ack,
    pieseSosite: !!row.piese_sosite,
  });
}

export function formatIstoricValoare(camp, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Da" : "Nu";
  if (camp === "status") {
    const def = STATUSES.find((s) => s.key === val);
    return def ? `${String(def.num).padStart(2, "0")}. ${def.label}` : String(val);
  }
  return String(val);
}

export const CAMP_LABELS = {
  numar_dosar: "Nr. dosar",
  tip_asigurare: "Tip asigurare",
  asigurator: "Asigurător",
  client: "Client",
  telefon_client: "Telefon",
  numar_inmatriculare: "Nr. auto",
  vin: "VIN",
  marca_model: "Marcă/Model",
  status: "Status",
  data_programare: "Data programare",
  adusa_fizic: "Adusă fizic",
  ce_este_de_reparat: "De reparat",
  masina_schimb: "Mașină schimb",
  valoare_piese_audatex: "Piese Audatex",
  valoare_achizitie_piese: "Achiziție piese",
  blocat: "Blocat",
  motiv_blocare: "Motiv blocare",
  gata_de_ridicare: "Gata de ridicare",
  ridicata: "Ridicată",
  incasat: "Încasat",
};
