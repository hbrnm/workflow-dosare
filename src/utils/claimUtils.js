import { INSURERS, STATUS_MIGRATION, STATUSES, getStatusAlertDays } from "../constants/config";
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
    financiar: { tvaProc: 21, pieseFacturateFaraTva: 0, costManoperaInterna: 0, costuriExterne: 0, costMasinaSchimb: 0, numarFactura: "", dataFactura: null, audatex: emptyAudatexDevizTotals() },
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
      costMasinaSchimb: parseNumber(c.financiar?.costMasinaSchimb, 0),
      tvaProc: parseNumber(c.financiar?.tvaProc, 21),
      pieseFacturateFaraTva: parseNumber(c.financiar?.pieseFacturateFaraTva ?? c.valoarePieseAudatex, 0),
      numarFactura: c.financiar?.numarFactura || "",
      dataFactura: c.financiar?.dataFactura || null,
      audatex: {
        ...emptyAudatexDevizTotals(),
        totalPiese: parseNumber(c.financiar?.audatex?.totalPiese ?? c.valoarePieseAudatex ?? c.financiar?.pieseFacturateFaraTva, 0),
        totalManopera: parseNumber(c.financiar?.audatex?.totalManopera ?? c.financiar?.manoperaTinichigerie ?? c.manopera?.tinichigerie?.facturat, 0),
        totalCosturiSuplimentare: parseNumber(c.financiar?.audatex?.totalCosturiSuplimentare ?? c.financiar?.cheltuieliDiverse ?? c.financiar?.costuriExterne, 0),
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

/** Stable key for media merge / dedupe (path preferred over id/url). */
export function mediaItemKey(item) {
  if (!item || typeof item !== "object") return "";
  if (item.path) return `path:${item.path}`;
  if (item.id != null && item.id !== "") return `id:${String(item.id)}`;
  if (item.url) return `url:${String(item.url)}`;
  return "";
}

/** Prepend additions; same-key items keep the addition (newer metadata). */
export function appendMediaItems(base = [], additions = []) {
  const baseList = Array.isArray(base) ? base : [];
  const addList = Array.isArray(additions) ? additions : [];
  if (!addList.length) return baseList.slice();
  const seen = new Set();
  const out = [];
  for (const item of addList) {
    const key = mediaItemKey(item);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(item);
  }
  for (const item of baseList) {
    const key = mediaItemKey(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(item);
  }
  return out;
}

export function removeMediaItems(base = [], toRemove = []) {
  const keys = new Set(
    (Array.isArray(toRemove) ? toRemove : []).map(mediaItemKey).filter(Boolean)
  );
  if (!keys.size) return Array.isArray(base) ? base.slice() : [];
  return (Array.isArray(base) ? base : []).filter((item) => {
    const key = mediaItemKey(item);
    return !key || !keys.has(key);
  });
}

/**
 * Prefer `primary` order/metadata; keep any `secondary` items not present in primary.
 * Used on full save so concurrent uploads are not clobbered.
 */
export function unionMediaLists(primary = [], secondary = []) {
  return appendMediaItems(secondary, primary);
}

const MEDIA_OP_KEYS = new Set([
  "appendPoze",
  "appendDocumente",
  "removePoze",
  "removeDocumente",
]);

export function stripMediaOps(patch = {}) {
  const next = { ...patch };
  for (const key of MEDIA_OP_KEYS) delete next[key];
  return next;
}

export function hasMediaOps(patch = {}) {
  return (
    (Array.isArray(patch.appendPoze) && patch.appendPoze.length > 0) ||
    (Array.isArray(patch.appendDocumente) && patch.appendDocumente.length > 0) ||
    (Array.isArray(patch.removePoze) && patch.removePoze.length > 0) ||
    (Array.isArray(patch.removeDocumente) && patch.removeDocumente.length > 0) ||
    patch.poze !== undefined ||
    patch.documente !== undefined
  );
}

/**
 * Apply append/remove (or full replace) media ops against the latest claim lists.
 * Prefer append/remove ops from concurrent UIs; full poze/documente is replace-only when ops absent.
 */
export function resolveMediaPatch(currentClaim = {}, patch = {}) {
  const next = {};
  let poze = Array.isArray(currentClaim.poze) ? currentClaim.poze : [];
  let documente = Array.isArray(currentClaim.documente) ? currentClaim.documente : [];
  let touchedPoze = false;
  let touchedDocs = false;

  const hasAppendPoze = Array.isArray(patch.appendPoze) && patch.appendPoze.length > 0;
  const hasRemovePoze = Array.isArray(patch.removePoze) && patch.removePoze.length > 0;
  const hasAppendDocs = Array.isArray(patch.appendDocumente) && patch.appendDocumente.length > 0;
  const hasRemoveDocs = Array.isArray(patch.removeDocumente) && patch.removeDocumente.length > 0;

  if (hasAppendPoze) {
    poze = appendMediaItems(poze, patch.appendPoze);
    touchedPoze = true;
  }
  if (hasRemovePoze) {
    poze = removeMediaItems(poze, patch.removePoze);
    touchedPoze = true;
  }
  if (patch.poze !== undefined && !hasAppendPoze && !hasRemovePoze) {
    poze = Array.isArray(patch.poze) ? patch.poze : [];
    touchedPoze = true;
  }

  if (hasAppendDocs) {
    documente = appendMediaItems(documente, patch.appendDocumente);
    touchedDocs = true;
  }
  if (hasRemoveDocs) {
    documente = removeMediaItems(documente, patch.removeDocumente);
    touchedDocs = true;
  }
  if (patch.documente !== undefined && !hasAppendDocs && !hasRemoveDocs) {
    documente = Array.isArray(patch.documente) ? patch.documente : [];
    touchedDocs = true;
  }

  if (touchedPoze) next.poze = poze;
  if (touchedDocs) next.documente = documente;
  return next;
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
  const row = {
    id: c.id,
    numar_dosar: c.numarDosar,
    tip_asigurare: c.tipAsigurare,
    asigurator: c.asigurator,
    client: c.client,
    delegat: c.delegat || "",
    telefon_client: c.telefonClient,
    numar_inmatriculare: c.numarInmatriculare,
    vin: c.vin,
    marca_model: c.marcaModel || [c.marca, c.model].filter(Boolean).join(" "),
    marca: c.marca || "",
    model: c.model || "",
    kilometraj: c.kilometraj == null || c.kilometraj === "" ? null : Number(c.kilometraj),
    damage_marks: Array.isArray(c.damageMarks) ? c.damageMarks : [],
    tip_documente: stripEphemeralMediaUrls(Array.isArray(c.tipDocumente) ? c.tipDocumente : []),
    nr_dosar_asigurator: c.nrDosarAsigurator || "",
    inspector_dauna: c.inspectorDauna || "",
    status: c.status,
    data_deschiderii: c.dataDeschiderii,
    data_schimbare_status: c.dataSchimbareStatus,
    data_ultimei_actualizari: c.dataUltimeiActualizari,
    termen_alerta_zile: c.termenAlertaZile,
    data_programare: c.dataProgramare || null,
    data_comanda_piese: c.dataComandaPiese || null,
    termen_livrare_piese: c.termenLivrarePiese || null,
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
      costMasinaSchimb: parseNumber(c.financiar?.costMasinaSchimb, 0),
      tvaProc: parseNumber(c.financiar?.tvaProc, 21),
      pieseFacturateFaraTva: parseNumber(c.financiar?.pieseFacturateFaraTva ?? c.valoarePieseAudatex, 0),
      numarFactura: c.financiar?.numarFactura || "",
      dataFactura: c.financiar?.dataFactura || null,
      audatex: {
        ...emptyAudatexDevizTotals(),
        totalPiese: parseNumber(c.financiar?.audatex?.totalPiese ?? c.valoarePieseAudatex ?? c.financiar?.pieseFacturateFaraTva, 0),
        totalManopera: parseNumber(c.financiar?.audatex?.totalManopera ?? c.financiar?.manoperaTinichigerie ?? c.manopera?.tinichigerie?.facturat, 0),
        totalCosturiSuplimentare: parseNumber(c.financiar?.audatex?.totalCosturiSuplimentare ?? c.financiar?.cheltuieliDiverse ?? c.financiar?.costuriExterne, 0),
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

  // Coloane opționale (migrări 22–29) — omit când goale, ca save-ul să meargă
  // și dacă migrarea nu e încă aplicată pe Supabase.
  if (c.atelierId) {
    row.atelier_id = c.atelierId;
  }
  if (c.programareStatus === "onorata" || c.programareStatus === "neonorata") {
    row.programare_status = c.programareStatus;
  }
  if (c.trackingToken) row.tracking_token = c.trackingToken;
  if (c.termenPlata) row.termen_plata = c.termenPlata;
  if (c.sumaDecont != null && c.sumaDecont !== "" && Number(c.sumaDecont) !== 0) {
    row.suma_decont = Number(c.sumaDecont);
  }
  const devize = stripEphemeralMediaUrls(Array.isArray(c.devize) ? c.devize : []);
  if (devize.length) row.devize = devize;
  if (c.mesajClient && String(c.mesajClient).trim()) {
    row.mesaj_client = String(c.mesajClient).trim();
  }

  return row;
}

/** Extrage numele coloanei din eroarea PostgREST „Could not find the 'X' column…”. */
export function parseMissingColumnError(message) {
  const m = String(message || "").match(/Could not find the '([^']+)' column/i);
  return m ? m[1] : null;
}

/**
 * Upsert / update cu retry: dacă lipsește o coloană din schema DB, o scoate din payload și reîncearcă.
 * Evită crash-ul pe create când migrările noi (ex. mesaj_client) nu sunt încă pe producție.
 */
export async function writeDosarWithSchemaCompat(supabaseClient, mode, payload, { id } = {}) {
  let body = { ...payload };
  for (let attempt = 0; attempt < 16; attempt++) {
    const query =
      mode === "update"
        ? supabaseClient.from("dosare").update(body).eq("id", id)
        : supabaseClient.from("dosare").upsert(body);
    const { error } = await query;
    if (!error) return { error: null, payload: body };
    const missing = parseMissingColumnError(error.message);
    if (!missing || !Object.prototype.hasOwnProperty.call(body, missing)) {
      return { error, payload: body };
    }
    const next = { ...body };
    delete next[missing];
    body = next;
  }
  return { error: { message: "Schema bazei de date e incompatibilă cu aplicația." }, payload: body };
}

/** Mapare câmp app → coloană DB pentru patch-uri parțiale. */
const PATCH_FIELD_MAP = {
  numarDosar: "numar_dosar",
  tipAsigurare: "tip_asigurare",
  asigurator: "asigurator",
  client: "client",
  delegat: "delegat",
  telefonClient: "telefon_client",
  numarInmatriculare: "numar_inmatriculare",
  vin: "vin",
  marca: "marca",
  model: "model",
  marcaModel: "marca_model",
  dataComandaPiese: "data_comanda_piese",
  termenLivrarePiese: "termen_livrare_piese",
  programareStatus: "programare_status",
  dataProgramare: "data_programare",
  pieseSosite: "piese_sosite",
  status: "status",
  dataSchimbareStatus: "data_schimbare_status",
  adusaFizic: "adusa_fizic",
  gataDeRidicare: "gata_de_ridicare",
  dataGataRidicare: "data_gata_ridicare",
  ridicata: "ridicata",
  dataRidicare: "data_ridicare",
  termenAlertaZile: "termen_alerta_zile",
  alerteAck: "alerte_ack",
  blocat: "blocat",
  motivBlocare: "motiv_blocare",
  damageMarks: "damage_marks",
  tipDocumente: "tip_documente",
  kilometraj: "kilometraj",
  marca: "marca",
  model: "model",
  nrDosarAsigurator: "nr_dosar_asigurator",
  inspectorDauna: "inspector_dauna",
  termenPlata: "termen_plata",
  sumaDecont: "suma_decont",
  incasat: "incasat",
  dataIncasarii: "data_incasarii",
  mesajClient: "mesaj_client",
  trackingToken: "tracking_token",
  devize: "devize",
  operatiuni: "operatiuni",
  ceEsteDeReparat: "ce_este_de_reparat",
  valoarePieseAudatex: "valoare_piese_audatex",
  valoareAchizitiePiese: "valoare_achizitie_piese",
  financiar: "financiar",
  manopera: "manopera",
  poze: "poze",
  documente: "documente",
  note: "note",
};

/** Construiește payload Supabase doar cu câmpurile modificate. */
export function toDbPatch(claim, patch, { updatedByEmail } = {}) {
  const merged = { ...claim, ...patch };
  const fullDb = toDb(merged);
  const db = {};

  for (const appKey of Object.keys(patch)) {
    const dbKey = PATCH_FIELD_MAP[appKey];
    if (!dbKey) continue;
    if (dbKey === "programare_status") {
      if (patch.programareStatus === null || patch.programareStatus === "") {
        db.programare_status = null;
      } else if (fullDb.programare_status) {
        db.programare_status = fullDb.programare_status;
      }
      continue;
    }
    if (dbKey in fullDb) db[dbKey] = fullDb[dbKey];
  }

  if (
    (patch.valoareDevizAudatex !== undefined || patch.dataAdusaFizic !== undefined) &&
    fullDb.financiar
  ) {
    db.financiar = fullDb.financiar;
  }

  db.data_ultimei_actualizari = nowISO();
  if (updatedByEmail) db.updated_by_email = updatedByEmail;

  return db;
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
    marca: row.marca || "",
    model: row.model || "",
    marcaModel: row.marca_model || [row.marca, row.model].filter(Boolean).join(" ") || "",
    kilometraj: row.kilometraj == null ? null : Number(row.kilometraj),
    damageMarks: Array.isArray(row.damage_marks) ? row.damage_marks : [],
    tipDocumente: Array.isArray(row.tip_documente) ? row.tip_documente : [],
    nrDosarAsigurator: row.nr_dosar_asigurator || "",
    inspectorDauna: row.inspector_dauna || "",
    trackingToken: row.tracking_token || "",
    termenPlata: row.termen_plata || null,
    sumaDecont: row.suma_decont == null ? 0 : Number(row.suma_decont),
    devize: Array.isArray(row.devize) ? row.devize : [],
    mesajClient: row.mesaj_client || "",
    status,
    dataDeschiderii: row.data_deschiderii || todayISO(),
    dataSchimbareStatus: row.data_schimbare_status || row.created_at || nowISO(),
    dataUltimeiActualizari: row.data_ultimei_actualizari || nowISO(),
    termenAlertaZile: row.termen_alerta_zile || getStatusAlertDays(status),
    dataProgramare: row.data_programare || "",
    dataComandaPiese: row.data_comanda_piese || null,
    termenLivrarePiese: row.termen_livrare_piese || null,
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
    valoareDevizAudatex: row.financiar?.valoareDevizAudatex ?? 0,
    dataAdusaFizic: row.financiar?.dataAdusaFizic || null,
    financiar: row.financiar || undefined,
    blocat: !!row.blocat,
    motivBlocare: row.motiv_blocare || "",
    createdBy: row.created_by,
    createdByEmail: row.created_by_email || "",
    updatedByEmail: row.updated_by_email || "",
    atelierId: row.atelier_id || null,
    gataDeRidicare: !!row.gata_de_ridicare,
    dataGataRidicare: row.data_gata_ridicare || null,
    ridicata: !!row.ridicata,
    dataRidicare: row.data_ridicare || null,
    incasat: !!row.incasat,
    dataIncasarii: row.data_incasarii || null,
    alerteAck: !!row.alerte_ack,
    pieseSosite: !!row.piese_sosite,
    programareStatus:
      row.programare_status === "onorata" || row.programare_status === "neonorata"
        ? row.programare_status
        : null,
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
  delegat: "Delegat",
  telefon_client: "Telefon",
  numar_inmatriculare: "Nr. auto",
  vin: "VIN",
  marca_model: "Marcă/Model",
  marca: "Marcă",
  model: "Model",
  kilometraj: "Kilometraj",
  damage_marks: "Marcaje avarii",
  tip_documente: "Tip documente",
  nr_dosar_asigurator: "Nr. dosar asigurător",
  inspector_dauna: "Inspector daună",
  tracking_token: "Token tracking",
  termen_plata: "Termen plată",
  suma_decont: "Sumă decont",
  mesaj_client: "Mesaj client (tracking)",
  devize: "Fișiere deviz",
  status: "Status",
  data_deschiderii: "Dată deschidere",
  data_schimbare_status: "Schimbare status",
  data_programare: "Programare",
  programare_status: "Status programare",
  data_comanda_piese: "Dată comandă piese",
  termen_livrare_piese: "Termen livrare piese",
  piese_sosite: "Piese sosite",
  adusa_fizic: "Adusă fizic",
  ce_este_de_reparat: "De reparat",
  masina_schimb: "Mașină schimb",
  valoare_piese_audatex: "Piese Audatex",
  valoare_achizitie_piese: "Achiziție piese",
  blocat: "Blocat",
  motiv_blocare: "Motiv blocare",
  gata_de_ridicare: "Gata de ridicare",
  data_gata_ridicare: "Dată gata ridicare",
  ridicata: "Ridicată",
  data_ridicare: "Dată ridicare",
  incasat: "Încasat",
  data_incasarii: "Dată încasare",
  alerte_ack: "Alerte confirmate",
  note: "Notițe",
  poze: "Poze",
  documente: "Documente",
  _creat: "Creare",
};
