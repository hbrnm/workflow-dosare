import { STATUS_MIGRATION, STATUSES } from "../constants/config";
import { todayISO, nowISO, fmtDate, fmtDateTime, uid } from "./dateUtils";

export function emptyClaim(status = "primit") {
  return {
    id: uid(),
    numarDosar: "", tipAsigurare: "CASCO", asigurator: "", client: "", telefonClient: "",
    numarInmatriculare: "", vin: "", marcaModel: "", status,
    dataDeschiderii: todayISO(), dataSchimbareStatus: nowISO(), dataUltimeiActualizari: nowISO(),
    termenAlertaZile: 3, dataProgramare: "", note: [], documente: [],
    adusaFizic: false, ceEsteDeReparat: "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null },
    },
    masinaSchimb: "", dataDariiLaSchimb: "", zileChirieAudatex: 0,
    valoarePieseAudatex: 0, valoareAchizitiePiese: 0,
    blocat: false, motivBlocare: "",
    createdBy: null, createdByEmail: "", updatedByEmail: "",
    poze: [],
    gataDeRidicare: false, dataGataRidicare: null, ridicata: false, dataRidicare: null,
    incasat: false, dataIncasarii: null,
  };
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
    telefonClient: c.telefonClient || "",
    numarInmatriculare: c.numarInmatriculare || "",
    vin: c.vin || "",
    marcaModel: c.marcaModel || "",
    status: c.status || "primit",
    ceEsteDeReparat: c.ceEsteDeReparat || "",
    masinaSchimb: c.masinaSchimb || "",
    motivBlocare: c.motivBlocare || "",
    note: Array.isArray(c.note) ? c.note : [],
    documente: Array.isArray(c.documente) ? c.documente : [],
    poze: Array.isArray(c.poze) ? c.poze : [],
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(c.manopera?.tinichigerie || {}) },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(c.manopera?.vopsitorie || {}) },
    },
  };
}

export function toDb(c) {
  return {
    id: c.id,
    numar_dosar: c.numarDosar,
    tip_asigurare: c.tipAsigurare,
    asigurator: c.asigurator,
    client: c.client,
    telefon_client: c.telefonClient,
    numar_inmatriculare: c.numarInmatriculare,
    vin: c.vin,
    marca_model: c.marcaModel,
    status: c.status,
    data_deschiderii: c.dataDeschiderii || null,
    data_schimbare_status: c.dataSchimbareStatus,
    data_ultimei_actualizari: c.dataUltimeiActualizari,
    termen_alerta_zile: c.termenAlertaZile,
    data_programare: c.dataProgramare || null,
    note: c.note,
    documente: (c.documente || []).map(({ url, ...document }) => document),
    adusa_fizic: c.adusaFizic,
    ce_este_de_reparat: c.ceEsteDeReparat,
    manopera: c.manopera,
    masina_schimb: c.masinaSchimb,
    data_darii_la_schimb: c.dataDariiLaSchimb || null,
    zile_chirie_audatex: c.zileChirieAudatex,
    valoare_piese_audatex: c.valoarePieseAudatex,
    valoare_achizitie_piese: c.valoareAchizitiePiese,
    blocat: c.blocat,
    motiv_blocare: c.motivBlocare,
    created_by: c.createdBy || null,
    created_by_email: c.createdByEmail || null,
    updated_by_email: c.updatedByEmail || null,
    poze: (c.poze || []).map(({ url, ...photo }) => photo),
    gata_de_ridicare: c.gataDeRidicare,
    data_gata_ridicare: c.dataGataRidicare || null,
    ridicata: c.ridicata,
    data_ridicare: c.dataRidicare || null,
    incasat: c.incasat,
    data_incasarii: c.dataIncasarii || null,
  };
}

export function fromDb(r) {
  const migratedStatus = STATUS_MIGRATION[r.status] || r.status || "primit";
  return {
    id: r.id,
    numarDosar: r.numar_dosar || "",
    tipAsigurare: r.tip_asigurare || "CASCO",
    asigurator: r.asigurator || "",
    client: r.client || "",
    telefonClient: r.telefon_client || "",
    numarInmatriculare: r.numar_inmatriculare || "",
    vin: r.vin || "",
    marcaModel: r.marca_model || "",
    status: migratedStatus,
    dataDeschiderii: r.data_deschiderii || todayISO(),
    dataSchimbareStatus: r.data_schimbare_status || nowISO(),
    dataUltimeiActualizari: r.data_ultimei_actualizari || nowISO(),
    termenAlertaZile: r.termen_alerta_zile ?? 3,
    dataProgramare: r.data_programare ? String(r.data_programare).slice(0, 16) : "",
    note: r.note || [],
    documente: r.documente || [],
    adusaFizic: !!r.adusa_fizic,
    ceEsteDeReparat: r.ce_este_de_reparat || "",
    manopera: {
      tinichigerie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.tinichigerie || {}) },
      vopsitorie: { facturat: 0, alocat: 0, dataIntrareEtapa: null, ...(r.manopera?.vopsitorie || {}) },
    },
    masinaSchimb: r.masina_schimb || "",
    dataDariiLaSchimb: r.data_darii_la_schimb || "",
    zileChirieAudatex: r.zile_chirie_audatex ?? 0,
    valoarePieseAudatex: r.valoare_piese_audatex ?? 0,
    valoareAchizitiePiese: r.valoare_achizitie_piese ?? 0,
    blocat: !!r.blocat,
    motivBlocare: r.motiv_blocare || "",
    createdByEmail: r.created_by_email || "",
    updatedByEmail: r.updated_by_email || "",
    createdBy: r.created_by || null,
    poze: r.poze || [],
    gataDeRidicare: !!r.gata_de_ridicare,
    dataGataRidicare: r.data_gata_ridicare || null,
    ridicata: !!r.ridicata,
    dataRidicare: r.data_ridicare || null,
    incasat: !!r.incasat,
    dataIncasarii: r.data_incasarii || null,
  };
}

export function normalizedText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function storagePath(claimId, file, directory = "") {
  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex > -1 ? file.name.slice(dotIndex) : "";
  const prefix = directory ? `${claimId}/${directory}` : claimId;
  return `${prefix}/${uid()}${extension}`;
}

export async function refreshStorageUrls(items, bucket, supabaseInstance) {
  if (!supabaseInstance) return items || [];
  return Promise.all((items || []).map(async (item) => {
    if (!item?.path) return item;

    const { data, error } = await supabaseInstance.storage
      .from(bucket)
      .createSignedUrl(item.path, 60 * 60);

    if (error) {
      console.error(`Nu s-a putut genera URL-ul temporar pentru ${item.path}:`, error);
      return { ...item, url: "" };
    }

    return { ...item, url: data?.signedUrl || "" };
  }));
}

export const CAMP_LABELS = {
  numar_dosar: "Nr. dosar", tip_asigurare: "Tip asigurare", asigurator: "Asigurător",
  client: "Client", telefon_client: "Telefon client", numar_inmatriculare: "Nr. înmatriculare",
  vin: "VIN", marca_model: "Marcă/Model", status: "Status", data_deschiderii: "Data deschiderii",
  data_schimbare_status: "Data schimbării statusului", termen_alerta_zile: "Termen alertă (zile)",
  data_programare: "Programare service", note: "Note", documente: "Documente",
  adusa_fizic: "Adusă fizic", ce_este_de_reparat: "Ce e de reparat", manopera: "Manoperă",
  masina_schimb: "Mașină la schimb", data_darii_la_schimb: "Data dării la schimb",
  zile_chirie_audatex: "Zile chirie Audatex", valoare_piese_audatex: "Valoare piese Audatex",
  valoare_achizitie_piese: "Valoare achiziție piese", blocat: "Dosar blocat", motiv_blocare: "Motiv blocare",
  poze: "Poze", _creat: "Dosar creat",
};

export const COMPLEX_FIELDS = new Set(["note", "documente", "manopera", "poze"]);

export function formatIstoricValoare(camp, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (camp === "status") { const s = STATUSES.find((x) => x.key === val); return s ? s.label : val; }
  if (camp === "data_programare" || camp === "data_darii_la_schimb" || camp === "data_schimbare_status" || camp === "data_ultimei_actualizari") return fmtDateTime(val);
  if (camp === "data_deschiderii" || camp === "data_ridicare" || camp === "data_gata_ridicare") return fmtDate(val);
  if (typeof val === "boolean") return val ? "da" : "nu";
  if (COMPLEX_FIELDS.has(camp)) return "actualizat(ă)";
  return String(val);
}
