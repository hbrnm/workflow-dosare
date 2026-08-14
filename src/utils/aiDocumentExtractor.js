import { sanitizeClaim, emptyClaim, parseNumber } from "./claimModel";
import { emptyAudatexDevizTotals } from "../constants/audatexDevizFields";
import { INSURERS } from "../constants/config";

/**
 * Verifică dacă un string seamănă cu numele unui service / atelier auto (pentru a nu fi setat din greșeală la Asigurător)
 */
export function isRepairShopName(name) {
  if (!name || typeof name !== "string") return false;
  const t = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (
    /\b(srl|sa|s\.r\.l|service|auto|autoklass|caroserie|repar|atelier|garaj|motors|piese|trading|invest|group|holding)\b/i.test(t) &&
    !/\b(asigur|omniasig|allianz|groupama|generali|asirom|grawe|euroins|axeria|hellas|uniqa|garanta|city)\b/i.test(t)
  );
}

/**
 * Găsește denumirea canonică oficială a asigurătorului din România
 */
export function matchCanonicalInsurer(candidate, customList = []) {
  if (!candidate || typeof candidate !== "string") return "";
  const s = candidate.trim();
  if (!s) return "";
  const lower = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const fullList = [...(customList || []), ...INSURERS, "Fără asigurare", "Regie Proprie", "City Insurance", "DallBogg"];

  // Potrivire exactă
  const direct = fullList.find(
    (ins) => ins.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === lower
  );
  if (direct) return direct;

  // Tipare specifice asigurătorilor din România
  if (/omniasig/i.test(lower)) return "Omniasig VIG";
  if (/allianz/i.test(lower) || /tiriac/i.test(lower)) return "Allianz-Țiriac";
  if (/groupama/i.test(lower)) return "Groupama Asigurări";
  if (/generali/i.test(lower)) return "Generali România";
  if (/asirom/i.test(lower)) return "Asirom VIG";
  if (/grawe/i.test(lower)) return "Grawe România";
  if (/euroins/i.test(lower)) return "Euroins România";
  if (/axeria/i.test(lower)) return "Axeria IARD";
  if (/hellas/i.test(lower) || /hellawest/i.test(lower)) return "Hellas Direct";
  if (/uniqa/i.test(lower)) return "Uniqa Asigurări";
  if (/garanta/i.test(lower)) return "Garanta";
  if (/city\s*ins/i.test(lower)) return "City Insurance";
  if (/dall\s*bogg/i.test(lower)) return "DallBogg";
  if (/fara\s+asig/i.test(lower)) return "Fără asigurare";
  if (/regie\s+proprie/i.test(lower)) return "Regie Proprie";

  // Verificare includere parțială
  for (const item of fullList) {
    const itemNorm = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (itemNorm.length >= 4 && (lower.includes(itemNorm) || itemNorm.includes(lower))) {
      return item;
    }
  }

  // Dacă seamănă cu un service auto, nu este asigurător
  if (isRepairShopName(candidate)) {
    return "";
  }

  return s;
}

/**
 * Extrage metadate (număr înmatriculare, VIN, asigurător, dosar, client) din textul brut al documentului
 */
export function extractEstimateMetadataFromText(text) {
  const raw = String(text || "");
  const meta = {
    numarDosar: "",
    nrDosarAsigurator: "",
    asigurator: "",
    tipAsigurare: "RCA",
    numarInmatriculare: "",
    vin: "",
    marca: "",
    model: "",
    marcaModel: "",
    kilometraj: null,
    client: "",
    delegat: "",
    telefonClient: "",
    inspectorDauna: "",
  };

  // 1. Număr Înmatriculare (ex: B 123 ABC, CJ 01 XYZ)
  const plateMatch = raw.match(/\b([A-Z]{1,2})\s*[- ]?\s*(\d{2,3})\s*[- ]?\s*([A-Z]{3})\b/i);
  if (plateMatch) {
    meta.numarInmatriculare = `${plateMatch[1].toUpperCase()} ${plateMatch[2]} ${plateMatch[3].toUpperCase()}`;
  }

  // 2. VIN (Serie Șasiu 17 caractere)
  const vinMatch = raw.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinMatch) {
    meta.vin = vinMatch[1].toUpperCase();
  }

  // 3. Dosar daună asigurător / deviz
  const dosarMatch = raw.match(/(?:NR\.?\s*DOSAR|DOSAR\s*DAUN[AĂ]|NR\.?\s*DAUN[AĂ]|CLAIM\s*NO|DOSAR\s*NR\.?|NR\.?\s*DEVIZ)\s*[:=\s\-]+\s*([A-Z0-9\-_/]+)/i);
  if (dosarMatch) {
    meta.nrDosarAsigurator = dosarMatch[1].trim();
    meta.numarDosar = dosarMatch[1].trim();
  }

  // 4. Asigurător
  const matchedInsurer = matchCanonicalInsurer(raw);
  if (matchedInsurer) {
    meta.asigurator = matchedInsurer;
  }

  // 5. Tip Asigurare
  if (/\bCASCO\b/i.test(raw)) {
    meta.tipAsigurare = "CASCO";
  } else if (/\bRCA\b/i.test(raw)) {
    meta.tipAsigurare = "RCA";
  }

  // 6. Kilometraj
  const kmMatch = raw.match(/(?:KM|KILOMETRAJ|RULAJ|ODOMETER)\s*[:=\s\-]+\s*(\d{1,3}(?:[.\s]\d{3})*|\d+)/i);
  if (kmMatch) {
    meta.kilometraj = parseNumber(kmMatch[1], null);
  }

  // 7. Client / Proprietar (multi-pattern resilient search)
  const clientPatterns = [
    /(?:PROPRIETAR\s*(?:\/\s*ASIGURAT|\/\s*P[AĂ]GUBIT)?|NUME\s+PROPRIETAR|NUME\s+ASIGURAT|ASIGURAT|P[AĂ]GUBIT|CLIENT|BENEFICIAR|DETINATOR|UTILIZATOR|NUME\s*[\/&]\s*PRENUME|NUME\s*[\/&]\s*DENUMIRE)\s*[:=\s\-]+\s*([A-ZĂÂÎȘȚa-zăâîșț\s.\-]{3,60})(?=\r?\n|$|\s{2,}|C\.?N\.?P|CUI|CIF|TEL|ADRES|STR)/i,
    /(?:PROPRIETAR|ASIGURAT|P[AĂ]GUBIT)\s*\r?\n\s*([A-ZĂÂÎȘȚa-zăâîșț\s.\-]{3,50})(?=\r?\n|$|\s{2,}|TEL|ADRES)/i,
    /(?:NUME|DENUMIRE)\s*[:=\s\-]+\s*([A-ZĂÂÎȘȚa-zăâîșț\s.\-]{3,50})(?=\r?\n|$|\s{2,}|C\.?N\.?P|CUI|TEL|ADRES)/i,
  ];
  for (const pat of clientPatterns) {
    const m = raw.match(pat);
    if (m && m[1]) {
      const cl = m[1].replace(/^(?:DOMNUL|DOAMNA|SRL|SA|PFA)\s+/i, "").trim();
      if (cl.length >= 3 && !isRepairShopName(cl) && !/\b(AUDATEX|DAT|CALCUL|REPARATIE|DEVIZ|SISTEM|CONSTATARE|PRET|LEI|RON)\b/i.test(cl)) {
        meta.client = cl;
        break;
      }
    }
  }

  // 8. Telefon client
  const telMatch = raw.match(/(?:TEL(?:EFON)?|MOBIL|CONTACT)\s*[:=\s\-]+\s*((?:(?:\+40|0040|0)\s*[1-9]\d{1,2}(?:[\s.-]?\d{2,3}){2,3}))/i);
  if (telMatch) {
    meta.telefonClient = telMatch[1].replace(/[^\d+]/g, "").trim();
  }

  // 9. Inspector Daună
  const inspMatch = raw.match(/(?:INSPECTOR(?:\s+DAUN[AĂ])?|CONSTATARE\s+EFECTUAT[AĂ]\s+DE|EVALUATOR)\s*[:=\s\-]+\s*([A-ZĂÂÎȘȚa-zăâîșț\s.\-]{4,40})/i);
  if (inspMatch) {
    meta.inspectorDauna = inspMatch[1].trim();
  }

  // 10. Marcă & Model Vehicul (ex: MERCEDES-BENZ GLE COUPE(C292) / 350 D 4MATIC)
  const carLineMatch = raw.match(/(?:VEHICUL|AUTOVEHICUL|TIP\s+AUTO|MARCA\/TIP)\s*[:=\s\-]+\s*([A-Z0-9\-_/\s.()]+)(?=\r?\n|$|\s{2,}|SERIE|VIN)/i);
  if (carLineMatch && carLineMatch[1].trim().length >= 4) {
    const fullCar = carLineMatch[1].trim();
    meta.marcaModel = fullCar;
    const p = fullCar.split(/\s+/);
    meta.marca = p[0] || "";
    meta.model = p.slice(1).join(" ") || "";
  }

  return meta;
}

/**
 * Prompt-ul de sistem structurat pentru Modele AI pentru a analiza documente de daună auto
 * (Certificat Înmatriculare/Talon, Carte Identitate/CI, Proces-Verbal Constatare Daună, Devize de Reparație, Polițe RCA/CASCO)
 */
export const SYSTEM_PROMPT_ROMANIAN_CLAIMS = `You are an advanced Document Intelligence Engine designed for an Auto Repair Shop Management System (Service Auto România).
The primary task is to process incoming scanned images, smartphone photos, and digital PDFs of auto claims documents (Certificat de Înmatriculare/Talon, Carte de Identitate/CI, Proces-Verbal de Constatare Daună, Devize de Reparație Audatex/Eurotax/DAT, Facturi Service, Polițe RCA/CASCO).

Return STRICTLY VALID JSON with no Markdown wrappers outside the JSON block.

CRITICAL INSTRUCTIONS:
1. Document Type Classification: Identify one of "TALON" | "CI" | "PV_DAUNA" | "DEVIZ" | "POLITA" | "UNKNOWN".
2. Insurer vs. Repair Shop: "insurance_company" MUST be the Romanian insurance company (e.g., "Omniasig VIG", "Allianz-Țiriac", "Groupama Asigurări", "Generali România", "Asirom VIG", "Grawe România", "Axeria IARD", "Hellas Direct", "Uniqa Asigurări", "Garanta"). DO NOT put the auto repair shop / service name (e.g. "AUTOKLASS", "SERVICE AUTO SRL") in "insurance_company"!
3. TALON (Certificat de Înmatriculare): Extract VIN (Field E, 17 chars), License Plate (Field A), Owner Name (Field C.1.1/C.1.2), Brand/Model (Field D.1/D.3), First Registration Date (Field B), Engine Code/Power (Field P.1/P.2).
4. CI (Carte de Identitate): Extract CNP (13 digits), Full Name, Address/Domiciliu, ID Series & Number.
5. PV_DAUNA / DEVIZ: Extract Claim Number, Insurer, Insured Person / Client, Damaged Parts / Operations (with INL / REV / REP / D_R flags), Labor Totals, Parts Totals, Paint Material Totals, Subtotal (Netto), Total (Brutto).

JSON Output Structure:
{
  "status": "SUCCESS",
  "document_type": "TALON" | "CI" | "PV_DAUNA" | "DEVIZ" | "POLITA" | "UNKNOWN",
  "confidence_score": 0.95,
  "data": {
    "numarDosar": string sau null (număr dosar service / deviz),
    "claim_number": string sau null (număr dosar daună asigurător),
    "insurance_company": string sau null (Societate de asigurare),
    "insurance_type": "RCA" | "CASCO",
    "client_name": string sau null (Nume asigurat / păgubit / proprietar),
    "client_phone": string sau null (Telefon contact),
    "cnp": string sau null (CNP 13 cifre),
    "address": string sau null (Domiciliu / Adresă),
    "id_series_number": string sau null (Serie și număr CI),
    "delegate_name": string sau null (Persoană delegată / împuternicită),
    "license_plate": string sau null (Număr înmatriculare ex: B 123 ABC),
    "vehicle_vin": string sau null (Serie șasiu 17 caractere),
    "vehicle_make": string sau null (Marca ex: Volkswagen, BMW, Audi, Dacia, Ford),
    "vehicle_model": string sau null (Model ex: Passat, X5, Logan, Focus),
    "mileage_km": number sau null (Kilometraj),
    "first_registration_date": string sau null (Data primei înmatriculări YYYY-MM-DD),
    "engine_power": string sau null (Capacitate cilindrică / Putere kW),
    "claim_inspector": string sau null (Inspector daună),
    "damage_summary": string sau null (Descrierea avariilor),
    "vendor_name": string sau null (Nume service auto / unitate reparatoare),
    "vendor_cui": string sau null (CUI / CIF service auto),
    "parts_total": number sau null (Total piese de schimb fără TVA),
    "labor_total": number sau null (Total manoperă tinichigerie/mecanică fără TVA),
    "labor_paint_total": number sau null (Total manoperă vopsitorie fără TVA),
    "paint_materials_total": number sau null (Total materiale vopsitorie fără TVA),
    "additional_costs_total": number sau null (Total costuri suplimentare / mărunțișuri),
    "subtotal_amount": number sau null (Cost reparație fără TVA / Netto),
    "vat_amount": number sau null (Valoare TVA),
    "total_amount": number sau null (Cost reparație cu TVA / Brut),
    "deductible_amount": number sau null (Valoare franșiză),
    "line_items": [
      {
        "description": string (Denumire piesă / reper / operațiune),
        "quantity": number sau 1,
        "unit_price": number sau 0,
        "total_price": number sau 0,
        "inl": boolean (Înlocuire piesă),
        "rev": boolean (Revopsire),
        "rep": boolean (Reparație tinichigerie),
        "uni": boolean (Demontare / Remontare D/R)
      }
    ]
  },
  "extraction_flags": [
    // Array of warning strings: "LOW_RESOLUTION", "HANDWRITTEN_TEXT_DETECTED", "UNCERTAIN_VIN_DIGIT"
  ]
}`;

/**
 * Convertește un File în base64 (fără header-ul data:...)
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = typeof result === "string" ? result.split(",")[1] || result : "";
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizează o valoare numerică (string sau număr, ex: "1.250,50 RON" -> 1250.5)
 */
export function normalizeNumeric(val, defaultVal = 0) {
  return parseNumber(val, defaultVal);
}

/**
 * Mapează obiectul extras de AI la un obiect de tip Claim compatibil 100% cu formularul aplicației
 */
export function mapExtractedJsonToClaim(extracted) {
  if (!extracted || typeof extracted !== "object") {
    return { claimPartial: emptyClaim(), tipDocument: "Document Procesat", extractedRaw: {} };
  }

  const base = emptyClaim();
  // Suport atât pentru schema unificată { status, document_type, data: {...} } cât și pentru formate plate
  const d = extracted.data && typeof extracted.data === "object" ? extracted.data : extracted;
  const meta = extracted.document_metadata || d.document_metadata || {};
  const fin = extracted.financials || d.financials || {};
  const rep = extracted.repair_details || d.repair_details || {};
  const rawLineItems = Array.isArray(d.line_items) ? d.line_items : (Array.isArray(d.damaged_parts) ? d.damaged_parts : (Array.isArray(extracted.line_items) ? extracted.line_items : []));

  // 1. Câmpuri de identificare dosar & vehicul
  const numarDosar =
    d.numarDosar ||
    extracted.numarDosar ||
    meta.document_number ||
    base.numarDosar;

  const nrDosarAsigurator =
    d.claim_number ||
    d.nrDosarAsigurator ||
    extracted.nrDosarAsigurator ||
    rep.claim_number_insurer ||
    "";

  // Identificare asigurător canonic (excludem unitatea reparatoare din câmpul de asigurător)
  const candidateInsurer = d.insurance_company || d.asigurator || extracted.asigurator || rep.insurance_company || "";
  const matchedInsurer = matchCanonicalInsurer(candidateInsurer);
  const fallbackInsurer = matchCanonicalInsurer(d.vendor_name || meta.vendor_name) || "";
  const asigurator =
    matchedInsurer ||
    fallbackInsurer ||
    (candidateInsurer && !isRepairShopName(candidateInsurer) ? candidateInsurer : base.asigurator);

  const tipAsigurare =
    d.insurance_type === "CASCO" || extracted.tipAsigurare === "CASCO" || rep.insurance_type === "CASCO"
      ? "CASCO"
      : "RCA";

  let client = (d.client_name || d.owner_name || d.full_name || d.client || extracted.client || rep.client_name || "").trim();
  if (isRepairShopName(client)) {
    client = "";
  }

  const delegat =
    d.delegate_name ||
    d.delegat ||
    extracted.delegat ||
    rep.delegate_name ||
    "";

  const telefonClient =
    d.client_phone ||
    d.telefonClient ||
    extracted.telefonClient ||
    rep.client_phone ||
    "";

  const rawPlate = d.license_plate || d.numarInmatriculare || extracted.numarInmatriculare || rep.license_plate || "";
  const numarInmatriculare = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, " ").trim();

  const rawVin = d.vehicle_vin || d.vin || extracted.vin || rep.vehicle_vin || "";
  const vin = rawVin.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Brand / Model
  let marca = (d.vehicle_make || d.marca || extracted.marca || rep.vehicle_make || "").trim();
  let model = (d.vehicle_model || d.model || extracted.model || rep.vehicle_model || "").trim();
  if (!marca && !model && (d.brand_model || d.marcaModel)) {
    const parts = String(d.brand_model || d.marcaModel).trim().split(/\s+/);
    marca = parts[0] || "";
    model = parts.slice(1).join(" ") || "";
  }
  const marcaModel = d.marcaModel || [marca, model].filter(Boolean).join(" ");

  const kilometraj =
    d.mileage_km != null
      ? normalizeNumeric(d.mileage_km, null)
      : extracted.kilometraj != null
      ? normalizeNumeric(extracted.kilometraj, null)
      : rep.mileage_km != null
      ? normalizeNumeric(rep.mileage_km, null)
      : null;

  const inspectorDauna =
    d.claim_inspector ||
    d.inspectorDauna ||
    extracted.inspectorDauna ||
    rep.claim_inspector ||
    "";

  const ceEsteDeReparat =
    d.damage_summary ||
    d.ceEsteDeReparat ||
    extracted.ceEsteDeReparat ||
    rep.damage_summary ||
    "";

  // 2. Câmpuri financiare & deviz Audatex / DAT
  const valoarePieseAudatex = normalizeNumeric(
    d.parts_total ||
    extracted.valoarePieseAudatex ||
    rep.parts_total ||
    fin.parts_total ||
    0
  );

  const manoperaTinichigerie = normalizeNumeric(
    d.labor_total ||
    extracted.manoperaTinichigerie ||
    rep.labor_body_total ||
    rep.labor_total ||
    fin.labor_total ||
    0
  );

  const manoperaVopsitorie = normalizeNumeric(
    d.labor_paint_total ||
    extracted.manoperaVopsitorie ||
    rep.labor_paint_total ||
    0
  );

  const materialeVopsitorie = normalizeNumeric(
    d.paint_materials_total ||
    extracted.materialeVopsitorie ||
    rep.paint_materials_total ||
    0
  );

  const totalCosturiSuplimentare = normalizeNumeric(
    d.additional_costs_total ||
    extracted.totalCosturiSuplimentare ||
    rep.additional_costs_total ||
    0
  );

  const totalVopsitorie = (manoperaVopsitorie + materialeVopsitorie) > 0
    ? (manoperaVopsitorie + materialeVopsitorie)
    : materialeVopsitorie;

  const sumComponents = valoarePieseAudatex + manoperaTinichigerie + manoperaVopsitorie + materialeVopsitorie + totalCosturiSuplimentare;

  const valoareDevizAudatex = normalizeNumeric(
    d.subtotal_amount ||
    d.total_cost_net ||
    extracted.valoareDevizAudatex ||
    fin.subtotal_amount ||
    (sumComponents > 0 ? sumComponents : 0) ||
    fin.total_amount ||
    0
  );

  const costReparatieCuTva = normalizeNumeric(
    d.total_amount ||
    d.total_cost_gross ||
    extracted.costReparatieCuTva ||
    fin.total_amount ||
    (valoareDevizAudatex > 0 ? Math.round(valoareDevizAudatex * 1.21 * 100) / 100 : 0)
  );

  const valoareFransiza = normalizeNumeric(
    d.deductible_amount ||
    extracted.valoareFransiza || 0
  );

  const sumaDecont = normalizeNumeric(
    d.total_amount ||
    d.total_cost_gross ||
    extracted.sumaDecont ||
    costReparatieCuTva ||
    valoareDevizAudatex ||
    0
  );

  // 3. Populare structură financiară completă (inclusiv audatex UI fields)
  const audatexTotals = {
    ...emptyAudatexDevizTotals(),
    totalPiese: valoarePieseAudatex,
    totalManopera: manoperaTinichigerie + manoperaVopsitorie,
    totalCosturiSuplimentare: totalCosturiSuplimentare,
    totalVopsitorie: totalVopsitorie,
    costReparatieFaraTva: valoareDevizAudatex,
    costReparatieCuTva: costReparatieCuTva,
    manoperaVopsitorie: manoperaVopsitorie,
    materialeVopsitorie: materialeVopsitorie,
  };

  // 4. Operațiuni & linii de deviz
  const operatiuniFromLineItems = rawLineItems.map((li, i) => {
    const desc = typeof li === "string" ? li : (li.description || li.piesa || li.name || "");
    return {
      id: `ai_item_${Date.now()}_${i}`,
      piesa: String(desc).trim(),
      inl: Boolean(li.inl ?? (li.type === "INL" || li.type === "REPLACE")),
      rev: Boolean(li.rev ?? (li.type === "REV" || li.type === "PAINT")),
      rep: Boolean(li.rep ?? (li.type === "REP" || li.type === "REPAIR")),
      uni: Boolean(li.uni ?? (li.type === "D/R" || li.type === "UNI")),
    };
  });

  const operatiuniFromLegacy = Array.isArray(extracted.operatiuni || d.operatiuni)
    ? (extracted.operatiuni || d.operatiuni).map((op, i) => ({
        id: `ai_op_${Date.now()}_${i}`,
        piesa: String(op.piesa || op.description || "").trim(),
        inl: Boolean(op.inl),
        rev: Boolean(op.rev),
        rep: Boolean(op.rep),
        uni: Boolean(op.uni),
      }))
    : [];

  const operatiuni = operatiuniFromLineItems.length > 0 ? operatiuniFromLineItems : operatiuniFromLegacy;

  // 5. Asamblare obiect parțial compatibil
  const partial = {
    ...base,
    numarDosar,
    nrDosarAsigurator,
    asigurator,
    tipAsigurare,
    client,
    delegat,
    telefonClient,
    numarInmatriculare,
    vin,
    marca,
    model,
    marcaModel,
    kilometraj,
    inspectorDauna,
    ceEsteDeReparat: ceEsteDeReparat || (operatiuni.length > 0 ? operatiuni.map((o) => o.piesa).filter(Boolean).join(", ") : ""),
    valoareDevizAudatex,
    valoarePieseAudatex,
    sumaDecont,
    manopera: {
      tinichigerie: { facturat: manoperaTinichigerie, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: manoperaVopsitorie, alocat: 0, dataIntrareEtapa: null },
    },
    financiar: {
      ...base.financiar,
      tvaProc: 21,
      valoareDevizAudatex,
      pieseFacturateFaraTva: valoarePieseAudatex,
      valoareFransiza,
      manoperaTinichigerie,
      manoperaVopsitorie,
      materialeVopsitorie,
      cheltuieliDiverse: totalCosturiSuplimentare,
      costuriExterne: totalCosturiSuplimentare,
      numarFactura: meta.document_number || d.numarFactura || extracted.numarFactura || "",
      dataFactura: meta.document_date || d.dataFactura || extracted.dataFactura || null,
      audatex: audatexTotals,
    },
    operatiuni,
  };

  const docType = extracted.document_type || d.document_type;
  const tipDoc =
    extracted.tipDocumentIdentificat ||
    (docType === "TALON"
      ? "Certificat Înmatriculare (Talon)"
      : docType === "CI"
      ? "Carte de Identitate (CI)"
      : docType === "PV_DAUNA"
      ? "Proces Verbal Constatare Daună"
      : docType === "DEVIZ" || docType === "repair_estimate"
      ? "Deviz de Reparație"
      : docType === "POLITA"
      ? "Poliță RCA / CASCO"
      : docType === "invoice"
      ? "Factură Fiscală"
      : docType === "receipt"
      ? "Chitanță / Bon"
      : "Document Procesat");

  return {
    claimPartial: sanitizeClaim(partial),
    tipDocument: tipDoc,
    extractedRaw: extracted,
  };
}

/**
 * Motor 1: Parser Local Specializat Audatex / DAT / Eurotax (0 cost, 0 API Key, 100% offline)
 */
export async function extractClaimDataWithLocalAudatexEngine(file) {
  const { parseEstimateFile } = await import("./audatexImportFile");
  const { applyEstimateValuesToClaim } = await import("./audatexApply");

  const parsed = await parseEstimateFile(file);
  if (!parsed || !parsed.values) {
    throw new Error("Nu s-au putut extrage date din fișier cu parserul local.");
  }

  const base = emptyClaim();
  const rawText = parsed.fullText || parsed.rawPreview || "";
  const meta = extractEstimateMetadataFromText(rawText);

  const rawOps = parsed.operations || parsed.lineItems?.operations || [];
  const operations = rawOps.map((op, idx) => ({
    id: op.id || `local_op_${Date.now()}_${idx}`,
    piesa: String(op.piesa || op.name || "").trim(),
    inl: Boolean(op.inl),
    rev: Boolean(op.rev),
    rep: Boolean(op.rep),
    uni: Boolean(op.uni),
  })).filter((op) => op.piesa && op.piesa.length >= 2);

  const populated = applyEstimateValuesToClaim(base, parsed.values, {
    operations,
    applyOperations: true,
    replaceOperations: true,
    importMeta: {
      fileName: file.name,
      importedAt: new Date().toISOString(),
      source: "local_audatex_engine",
    },
  });

  if (meta.numarInmatriculare) populated.numarInmatriculare = meta.numarInmatriculare;
  if (meta.vin) populated.vin = meta.vin;
  if (meta.numarDosar) populated.numarDosar = meta.numarDosar;
  if (meta.nrDosarAsigurator) populated.nrDosarAsigurator = meta.nrDosarAsigurator;
  if (meta.asigurator) populated.asigurator = meta.asigurator;
  if (meta.tipAsigurare) populated.tipAsigurare = meta.tipAsigurare;
  if (meta.client) populated.client = meta.client;
  if (meta.telefonClient) populated.telefonClient = meta.telefonClient;
  if (meta.kilometraj != null) populated.kilometraj = meta.kilometraj;
  if (meta.inspectorDauna) populated.inspectorDauna = meta.inspectorDauna;
  if (meta.marca) populated.marca = meta.marca;
  if (meta.model) populated.model = meta.model;
  if (meta.marcaModel) populated.marcaModel = meta.marcaModel;

  if (operations.length > 0) {
    populated.operatiuni = operations;
    populated.ceEsteDeReparat = operations.map((o) => o.piesa).filter(Boolean).join(", ");
  }

  // Financiare Audatex exacte
  const valoarePiese = parseNumber(parsed.values.valoarePieseAudatex, 0);
  const manTinichigerie = parseNumber(parsed.values.manoperaTinichigerie, 0);
  const manVopsitorie = parseNumber(parsed.values.manoperaVopsitorie, 0);
  const matVopsitorie = parseNumber(parsed.values.materialeVopsitorie, 0);
  const totVopsitorie = parseNumber(parsed.values.totalVopsitorieAudatex, manVopsitorie + matVopsitorie);
  const suplimente = parseNumber(parsed.values.cheltuieliDiverse, 0);
  const totalNetto = parseNumber(parsed.values.valoareDevizAudatex, valoarePiese + manTinichigerie + totVopsitorie + suplimente);
  const totalBrutto = parseNumber(parsed.values.costReparatieCuTva, totalNetto > 0 ? Math.round(totalNetto * 1.21 * 100) / 100 : 0);

  populated.valoareDevizAudatex = totalNetto;
  populated.valoarePieseAudatex = valoarePiese;
  populated.sumaDecont = totalBrutto;

  populated.manopera = {
    tinichigerie: { facturat: manTinichigerie, alocat: 0, dataIntrareEtapa: null },
    vopsitorie: { facturat: manVopsitorie > 0 ? manVopsitorie : totVopsitorie, alocat: 0, dataIntrareEtapa: null },
  };

  populated.financiar = {
    ...base.financiar,
    ...(populated.financiar || {}),
    tvaProc: 21,
    valoareDevizAudatex: totalNetto,
    pieseFacturateFaraTva: valoarePiese,
    manoperaTinichigerie: manTinichigerie,
    manoperaVopsitorie: manVopsitorie > 0 ? manVopsitorie : totVopsitorie,
    materialeVopsitorie: matVopsitorie,
    cheltuieliDiverse: suplimente,
    costuriExterne: suplimente,
    audatex: {
      ...emptyAudatexDevizTotals(),
      totalPiese: valoarePiese,
      totalManopera: manTinichigerie, // Tinichigerie, astfel încât Piese + Tinichigerie + Vopsitorie = Netto
      totalCosturiSuplimentare: suplimente,
      totalVopsitorie: totVopsitorie,
      costReparatieFaraTva: totalNetto,
      costReparatieCuTva: totalBrutto,
      manoperaVopsitorie: manVopsitorie,
      materialeVopsitorie: matVopsitorie,
    },
  };

  return {
    claimPartial: sanitizeClaim(populated),
    tipDocument: "Deviz Audatex / DAT (Parser Specializat)",
    extractedRaw: parsed,
  };
}

/**
 * Motor 2: Google Gemini 2.0 Flash / 1.5 Flash (Direct REST API)
 */
export async function extractClaimDataWithGeminiDirect(file, apiKey, modelParam = "gemini-2.0-flash") {
  if (!apiKey) {
    throw new Error("Cheia API Google Gemini lipsește. Introduceți cheia în căsuța dedicată.");
  }

  const fileName = (file && file.name ? file.name : "").toLowerCase();
  const rawType = (file && file.type ? file.type : "").toLowerCase();
  const isPdf = fileName.endsWith(".pdf") || rawType.includes("pdf");

  // Pentru PDF-uri, încercăm mai întâi să extragem textul nativ direct
  let extractedPdfText = "";
  if (isPdf) {
    try {
      const { parseEstimateFile } = await import("./audatexImportFile");
      const parsed = await parseEstimateFile(file);
      extractedPdfText = parsed?.fullText || parsed?.rawPreview || "";
    } catch {
      // Fallback la date binare base64 dacă PDF-ul este scanat
    }
  }

  let bodyParts = [];
  if (extractedPdfText && extractedPdfText.length > 80) {
    // Trimitere text nativ extras (100% fiabil, nu depinde de randarea vizuală a PDF-ului)
    bodyParts = [
      { text: `${SYSTEM_PROMPT_ROMANIAN_CLAIMS}\n\nConținut text extras din documentul PDF (${file.name}):\n\n${extractedPdfText}` }
    ];
  } else {
    // Trimitere binară multimodală (pentru imagini sau PDF-uri scanate)
    const base64Data = await fileToBase64(file);
    let mimeType = "application/pdf";
    if (rawType && rawType.includes("/")) {
      mimeType = rawType;
    } else if (fileName.endsWith(".png")) {
      mimeType = "image/png";
    } else if (fileName.endsWith(".webp")) {
      mimeType = "image/webp";
    } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    }

    bodyParts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      {
        text: SYSTEM_PROMPT_ROMANIAN_CLAIMS,
      },
    ];
  }

  const modelEndpoints = [
    { version: "v1beta", name: modelParam || "gemini-2.0-flash" },
    { version: "v1beta", name: "gemini-2.0-flash" },
    { version: "v1beta", name: "gemini-1.5-flash" },
    { version: "v1beta", name: "gemini-1.5-flash-8b" },
    { version: "v1beta", name: "gemini-2.5-flash" },
  ];

  const body = {
    contents: [{ parts: bodyParts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  let lastError = null;
  const tried = new Set();

  for (const m of modelEndpoints) {
    const key = `${m.version}/${m.name}`;
    if (tried.has(key)) continue;
    tried.add(key);

    const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent?key=${apiKey.trim()}`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        const data = await resp.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          throw new Error("Nu s-a extras niciun text în răspunsul Gemini.");
        }

        let extractedRaw;
        try {
          const cleanedText = textResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          extractedRaw = JSON.parse(cleanedText);
        } catch (jsonParseErr) {
          const start = textResponse.indexOf("{");
          const end = textResponse.lastIndexOf("}");
          if (start !== -1 && end !== -1 && end > start) {
            extractedRaw = JSON.parse(textResponse.slice(start, end + 1));
          } else {
            throw jsonParseErr;
          }
        }

        return mapExtractedJsonToClaim(extractedRaw);
      }

      const errText = await resp.text();
      lastError = new Error(`Eroare Gemini API (${m.name}, status ${resp.status}): ${errText}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Procesarea cu Gemini API a eșuat pe toate modelele.");
}

/**
 * Motor 3: OpenAI GPT-4o / GPT-4o-mini (cu cheie OpenAI sk-...)
 */
export async function extractClaimDataWithOpenAIDirect(file, apiKey, modelParam = "gpt-4o-mini") {
  if (!apiKey) {
    throw new Error("Cheia API OpenAI lipsește. Introduceți cheia sk-... în formular.");
  }

  const fileName = (file && file.name ? file.name : "").toLowerCase();
  const isPdf = fileName.endsWith(".pdf") || file.type?.includes("pdf");
  let contentPayload;

  if (isPdf) {
    let pdfText = "";
    try {
      const { parseEstimateFile } = await import("./audatexImportFile");
      const parsed = await parseEstimateFile(file);
      pdfText = parsed?.rawPreview || "";
    } catch {
      // ignore
    }

    if (pdfText && pdfText.length > 50) {
      contentPayload = [
        { type: "text", text: `${SYSTEM_PROMPT_ROMANIAN_CLAIMS}\n\nConținut text extras din PDF:\n${pdfText}` }
      ];
    } else {
      const base64Data = await fileToBase64(file);
      contentPayload = [
        { type: "text", text: SYSTEM_PROMPT_ROMANIAN_CLAIMS },
        { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64Data}` } }
      ];
    }
  } else {
    const base64Data = await fileToBase64(file);
    const mime = file.type || "image/jpeg";
    contentPayload = [
      { type: "text", text: SYSTEM_PROMPT_ROMANIAN_CLAIMS },
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64Data}` } }
    ];
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: modelParam || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_ROMANIAN_CLAIMS },
        { role: "user", content: contentPayload },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Eroare OpenAI API (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const textOutput = data.choices?.[0]?.message?.content;
  if (!textOutput) throw new Error("Răspuns vid de la OpenAI.");

  const extractedRaw = JSON.parse(textOutput);
  return mapExtractedJsonToClaim(extractedRaw);
}

/**
 * Pipeline Hibrid Inteligent: Încearcă automat cel mai bun motor disponibil
 */
export async function extractClaimDataHybrid(file, { apiKey = "", engine = "auto", supabaseClient = null } = {}) {
  const fileName = (file && file.name ? file.name : "").toLowerCase();
  const isPdfOrSheet =
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".xml") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".csv");

  // 1. Dacă motorul ales este Local Audatex sau dacă suntem pe Auto și nu există cheie API introdusă
  if (engine === "local" || (engine === "auto" && isPdfOrSheet && !apiKey.trim())) {
    try {
      return await extractClaimDataWithLocalAudatexEngine(file);
    } catch (localErr) {
      if (engine === "local") throw localErr;
      // Dacă a eșuat pe auto, continuă spre celelalte motoare
    }
  }

  // 2. Dacă motorul este OpenAI sau cheia începe cu 'sk-'
  if (engine === "openai" || apiKey.trim().startsWith("sk-")) {
    return await extractClaimDataWithOpenAIDirect(file, apiKey.trim());
  }

  // 3. Dacă avem cheie Gemini introdusă
  if (apiKey.trim()) {
    return await extractClaimDataWithGeminiDirect(file, apiKey.trim());
  }

  // 4. Dacă avem Supabase Edge Function
  if (supabaseClient) {
    try {
      return await extractClaimDataWithSupabaseEdge(file, supabaseClient);
    } catch (edgeErr) {
      // Încercare finală cu motorul local dacă fișierul este PDF
      if (isPdfOrSheet) {
        return await extractClaimDataWithLocalAudatexEngine(file);
      }
      throw edgeErr;
    }
  }

  // 5. Fallback final: Motor local dacă e PDF
  if (isPdfOrSheet) {
    return await extractClaimDataWithLocalAudatexEngine(file);
  }

  throw new Error(
    "Selectați un motor AI sau introduceți o cheie API (Google Gemini sau OpenAI) pentru a analiza imaginea."
  );
}

/**
 * Apelează Supabase Edge Function `analyze-document-ai`
 */
export async function extractClaimDataWithSupabaseEdge(file, supabaseClient) {
  if (!supabaseClient) {
    throw new Error("Clientul Supabase nu este inițializat.");
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

  const { data, error } = await supabaseClient.functions.invoke("analyze-document-ai", {
    body: {
      fileBase64: base64Data,
      mimeType,
      fileName: file.name,
    },
  });

  if (error) {
    throw new Error(`Eroare Supabase Edge Function: ${error.message || JSON.stringify(error)}`);
  }

  if (!data || !data.extracted) {
    throw new Error(data?.error || "Edge Function-ul nu a furnizat date extrase.");
  }

  return mapExtractedJsonToClaim(data.extracted);
}
