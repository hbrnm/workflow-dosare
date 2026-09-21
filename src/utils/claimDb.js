import { STATUS_MIGRATION, STATUSES, getStatusAlertDays } from "../constants/config";
import { emptyAudatexDevizTotals } from "../constants/audatexDevizFields";
import { todayISO, nowISO, generateUUID } from "./dateUtils";
import { emptyClaim, sanitizeClaim, parseNumber } from "./claimModel";
import { stripEphemeralMediaUrls } from "./claimMedia";

export function isValidUUID(str) {
  return (
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
  );
}

export function toDb(c) {
  const claimId = c?.id ? String(c.id).trim() : generateUUID();
  const row = {
    id: claimId,
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
      masinaSchimbModel: c.masinaSchimbModel,
      masinaSchimbNumar: c.masinaSchimbNumar,
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

/** Extrage numele coloanei din eroarea PostgREST „Could not find the 'X' column…". */
export function parseMissingColumnError(message) {
  const m = String(message || "").match(/Could not find the '([^']+)' column/i);
  return m ? m[1] : null;
}

export async function writeDosarWithSchemaCompat(supabaseClient, mode, payload, { id } = {}) {
  let body = { ...payload };
  for (let attempt = 0; attempt < 16; attempt++) {
    const query =
      mode === "update"
        ? supabaseClient.from("dosare").update(body).eq("id", id)
        : supabaseClient.from("dosare").upsert(body);
    const { error } = await query;
    if (!error) return { error: null, payload: body };

    // 1. Missing column in DB schema -> strip column and retry
    const missing = parseMissingColumnError(error.message);
    if (missing && Object.prototype.hasOwnProperty.call(body, missing)) {
      const next = { ...body };
      delete next[missing];
      body = next;
      continue;
    }

    // 2. Not-null constraint violation on atelier_id -> fetch available atelier and retry
    if (
      error.message &&
      (error.message.includes('null value in column "atelier_id"') ||
        (error.message.includes("atelier_id") && error.message.includes("not-null")))
    ) {
      try {
        const { data: atRows } = await supabaseClient
          .from("ateliere")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1);
        if (atRows?.[0]?.id) {
          body.atelier_id = atRows[0].id;
          continue;
        }
      } catch {
        /* ignore */
      }
    }

    // 3. Foreign key violation on atelier_id -> remove atelier_id if invalid and retry
    if (error.message && error.message.includes("dosare_atelier_id_fkey") && body.atelier_id) {
      const next = { ...body };
      delete next.atelier_id;
      body = next;
      continue;
    }

    // 4. RLS policy violation on insert -> try healing created_by / atelier_id from current session
    if (
      mode !== "update" &&
      attempt <= 1 &&
      error.message &&
      error.message.includes("row-level security")
    ) {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const curUid = authData?.user?.id;
        if (curUid) {
          body.created_by = curUid;
          // Rezolvă întotdeauna atelier_id din membership — cel existent poate fi invalid pentru userul curent
          const { data: mRows } = await supabaseClient
            .from("atelier_membri")
            .select("atelier_id")
            .eq("user_id", curUid)
            .limit(1);
          if (mRows?.[0]?.atelier_id) {
            body.atelier_id = mRows[0].atelier_id;
          } else if (!body.atelier_id) {
            const { data: atRows } = await supabaseClient
              .from("ateliere")
              .select("id")
              .order("created_at", { ascending: true })
              .limit(1);
            if (atRows?.[0]?.id) {
              body.atelier_id = atRows[0].id;
            }
          }
          continue;
        }
      } catch {
        /* ignore */
      }
    }

    console.error("writeDosarWithSchemaCompat failed", { mode, attempt, payload: body, error });
    return { error, payload: body };
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
    masinaSchimbModel: row.financiar?.masinaSchimbModel || "",
    masinaSchimbNumar: row.financiar?.masinaSchimbNumar || "",
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
