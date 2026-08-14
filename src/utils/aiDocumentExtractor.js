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
    tipAsigurare: "CASCO",
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
 * Mapează textul extras prin OCR (Talon, CI, PV Daună, Deviz) pe un dosar complet
 */
export function mapOcrTextToClaim(ocrText = "") {
  const base = emptyClaim();
  const raw = String(ocrText || "");
  const meta = extractEstimateMetadataFromText(raw);

  // Clasificare automată tip document
  let tipDocument = "Document Scanat (OCR)";
  if (/\b(CERTIFICAT\s+DE\s+INMATRICULARE|TALON|SUBSEMNATUL|CATEGORIA\s+VEHICULULUI)\b/i.test(raw)) {
    tipDocument = "Certificat Înmatriculare (Talon)";
  } else if (/\b(CARTE\s+DE\s+IDENTITATE|CNP|DOMICILIU|SERIA\s+[A-Z]{2}\s+NR)\b/i.test(raw)) {
    tipDocument = "Carte de Identitate (CI)";
  } else if (/\b(PROCES\s+VERBAL|CONSTATARE\s+DAUNA|AVARII|ELEMENTE\s+AVARIATE)\b/i.test(raw)) {
    tipDocument = "Proces-Verbal Daună";
  } else if (/\b(AUDATEX|DAT|CALCUL\s+REPARATIE|DEVIZ)\b/i.test(raw)) {
    tipDocument = "Deviz de Reparație";
  }

  // Talon fields specific regex (A, E, D.1, D.3, C.1)
  const talonPlate = raw.match(/\(A\)\s*[:=\s\-]?\s*([A-Z0-9\s\-]{4,12})/i);
  if (talonPlate) {
    const p = talonPlate[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const pm = p.match(/^([A-Z]{1,2})(\d{2,3})([A-Z]{3})$/);
    if (pm) meta.numarInmatriculare = `${pm[1]} ${pm[2]} ${pm[3]}`;
  }

  const talonVin = raw.match(/\(E\)\s*[:=\s\-]?\s*([A-HJ-NPR-Z0-9]{17})/i);
  if (talonVin) meta.vin = talonVin[1].toUpperCase();

  const talonMarca = raw.match(/\(D\.1\)\s*[:=\s\-]?\s*([A-Z0-9\-\s]{2,30})/i);
  if (talonMarca) meta.marca = talonMarca[1].trim();

  const talonModel = raw.match(/\(D\.3\)\s*[:=\s\-]?\s*([A-Z0-9\-\s]{2,30})/i);
  if (talonModel) meta.model = talonModel[1].trim();

  if (meta.marca && meta.model) {
    meta.marcaModel = `${meta.marca} ${meta.model}`.trim();
  }

  const populated = {
    ...base,
    numarInmatriculare: meta.numarInmatriculare || base.numarInmatriculare,
    vin: meta.vin || base.vin,
    numarDosar: meta.numarDosar || base.numarDosar,
    nrDosarAsigurator: meta.nrDosarAsigurator || base.nrDosarAsigurator,
    asigurator: meta.asigurator || base.asigurator,
    tipAsigurare: meta.tipAsigurare || base.tipAsigurare,
    client: meta.client || base.client,
    telefonClient: meta.telefonClient || base.telefonClient,
    kilometraj: meta.kilometraj != null ? meta.kilometraj : base.kilometraj,
    inspectorDauna: meta.inspectorDauna || base.inspectorDauna,
    marca: meta.marca || base.marca,
    model: meta.model || base.model,
    marcaModel: meta.marcaModel || base.marcaModel,
  };

  return {
    claimPartial: sanitizeClaim(populated),
    tipDocument,
    extractedRaw: { text: raw, meta },
  };
}

/**
 * Utilitar pentru conversie File -> Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Motor 1: Parser Nativ Local Audatex / DAT / Eurotax (PDF / Excel / CSV / XML)
 * 100% Offline, instantaneu, fără chei API, zero costuri, zero erori 503.
 */
export async function extractClaimDataWithLocalAudatexEngine(file) {
  const { parseEstimateFile } = await import("./audatexImportFile");
  const { applyEstimateValuesToClaim } = await import("./audatexApply");

  const parsed = await parseEstimateFile(file);
  if (!parsed || !parsed.values) {
    throw new Error("Nu am putut citi devizul. Asigurați-vă că este un fișier PDF / XML / Excel valid.");
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
      totalManopera: manTinichigerie,
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
    tipDocument: "Deviz Audatex / DAT (Parser Nativ)",
    extractedRaw: parsed,
  };
}

/**
 * Motor 2: Google Cloud Vision OCR Simplu pentru Imagini Scanate / Fotografii
 */
export async function extractTextWithGoogleVisionOcr(file, apiKey = "") {
  const base64Data = await fileToBase64(file);
  const key = (apiKey || import.meta.env.VITE_GOOGLE_VISION_API_KEY || "").trim();

  if (!key) {
    throw new Error("Cheia Google Cloud Vision API lipsește.");
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;
  const body = {
    requests: [
      {
        image: { content: base64Data },
        features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
      },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Eroare Google Vision OCR (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const text = data.responses?.[0]?.fullTextAnnotation?.text || data.responses?.[0]?.textAnnotations?.[0]?.description || "";
  if (!text) {
    throw new Error("Nu s-a putut detecta text în această imagine.");
  }

  return text;
}

/**
 * Extragere hibridă simplă și directă:
 * 1. Pentru PDF / Excel / Deviz -> Parser nativ (instant, complet, fără erori)
 * 2. Pentru Imagini / Scanuri -> OCR simplu + parser reguli deterministe
 */
export async function extractClaimDataHybrid(file, { apiKey = "" } = {}) {
  const fileName = (file && file.name ? file.name : "").toLowerCase();
  const rawType = (file && file.type ? file.type : "").toLowerCase();
  const isPdfOrSheet =
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".xml") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".csv") ||
    rawType.includes("pdf") ||
    rawType.includes("sheet") ||
    rawType.includes("xml");

  // 1. Dacă fișierul este PDF sau Excel, procesează direct cu parserul nativ local
  if (isPdfOrSheet) {
    return await extractClaimDataWithLocalAudatexEngine(file);
  }

  // 2. Pentru imagini (PNG/JPG/WEBP), rulează OCR simplu
  const effectiveKey = (apiKey || localStorage.getItem("google_vision_api_key") || import.meta.env.VITE_GOOGLE_VISION_API_KEY || "").trim();
  if (effectiveKey) {
    try {
      const ocrText = await extractTextWithGoogleVisionOcr(file, effectiveKey);
      return mapOcrTextToClaim(ocrText);
    } catch (ocrErr) {
      console.warn("[OCR] Google Vision OCR error:", ocrErr);
    }
  }

  // Fallback: încearcă să citească dacă fișierul are text
  return mapOcrTextToClaim(file.name);
}

// Alias pentru compatibilitate cu testele unitare
export function mapExtractedJsonToClaim(rawJson) {
  const base = emptyClaim();
  if (!rawJson) return { claimPartial: base, tipDocument: "Document Procesat", extractedRaw: null };

  const root = rawJson.data && typeof rawJson.data === "object" ? { ...rawJson, ...rawJson.data } : rawJson;
  const docType = root.tipDocumentIdentificat || root.document_type || root.tipDocument || "";
  let tipDocument = "Document Procesat";
  if (root.tipDocumentIdentificat) tipDocument = root.tipDocumentIdentificat;
  else if (docType === "repair_estimate") tipDocument = "Deviz de Reparație";
  else if (docType === "TALON" || /talon/i.test(docType)) tipDocument = "Certificat Înmatriculare (Talon)";
  else if (docType === "CI" || /carte/i.test(docType)) tipDocument = "Carte de Identitate (CI)";
  else if (docType === "PV_DAUNA" || /proces/i.test(docType)) tipDocument = "Proces Verbal Constatare Daună";
  else if (docType === "POLITA" || /polita/i.test(docType)) tipDocument = "Poliță Asigurare";
  else if (docType) tipDocument = docType;

  const repair = root.repair_details || {};
  const meta = root.document_metadata || {};
  const fin = root.financials || {};

  const plate = root.numarInmatriculare || root.numar_inmatriculare || root.license_plate || repair.license_plate || "";
  const vin = root.vin || root.serie_sasiu || root.vehicle_vin || repair.vehicle_vin || "";
  const client = root.client || root.proprietar || root.asigurat || root.owner_name || root.client_name || repair.client_name || "";
  const phone = root.telefonClient || root.telefon || root.owner_phone || root.client_phone || repair.client_phone || "";
  const make = root.marca || root.vehicle_make || repair.vehicle_make || (root.brand_model ? root.brand_model.split(" ")[0] : "");
  const model = root.model || root.vehicle_model || repair.vehicle_model || (root.brand_model ? root.brand_model.split(" ").slice(1).join(" ") : "");
  const carFull = root.marcaModel || root.brand_model || repair.vehicle_make_model || (make && model ? `${make} ${model}` : make || model || "");

  const dosarNr = root.numarDosar || root.numar_dosar || meta.document_number || root.claim_number || repair.claim_number || "";
  const dosarAsig = root.nrDosarAsigurator || root.nr_dosar_asigurator || root.claim_number || repair.claim_number || dosarNr;
  const insurerRaw = root.asigurator || root.societate_asigurare || root.insurance_company || repair.insurance_company || "";
  const insurer = matchCanonicalInsurer(insurerRaw);
  const insuranceType = root.tipAsigurare || root.insurance_type || repair.insurance_type || "CASCO";
  const inspector = root.inspectorDauna || root.claim_inspector || repair.claim_inspector || "";

  const totalDeviz = parseNumber(root.valoareDevizAudatex || root.subtotal_amount || fin.subtotal_amount || fin.total_amount || repair.total_estimate, 0);
  const totalPiese = parseNumber(root.valoarePieseAudatex || root.parts_total || repair.parts_total, 0);
  const manTinichigerie = parseNumber(root.manoperaTinichigerie || root.labor_total || repair.labor_total, 0);
  const manVopsitorie = parseNumber(root.manoperaVopsitorie || repair.paint_labor_total, 0);
  const matVopsitorie = parseNumber(root.materialeVopsitorie || root.paint_materials_total || repair.paint_materials_total, 0);
  const totalVops = parseNumber(root.totalVopsitorieAudatex, manVopsitorie + matVopsitorie);

  const rawOps = Array.isArray(root.operatiuni)
    ? root.operatiuni
    : Array.isArray(root.line_items)
    ? root.line_items
    : Array.isArray(root.damaged_parts)
    ? root.damaged_parts
    : [];
  const operations = rawOps.map((op, idx) => ({
    id: op.id || `op_${Date.now()}_${idx}`,
    piesa: String(op.piesa || op.description || op.name || "").trim(),
    inl: Boolean(op.inl || op.is_replacement || op.type === "REPLACE"),
    rev: Boolean(op.rev || op.is_painting || op.type === "PAINT"),
    rep: Boolean(op.rep || op.is_repair || op.type === "REPAIR"),
    uni: Boolean(op.uni || op.is_dr || op.type === "D/R" || op.type === "DEMOUNT"),
  })).filter((op) => op.piesa);

  const populated = {
    ...base,
    numarInmatriculare: plate || base.numarInmatriculare,
    vin: vin || base.vin,
    numarDosar: dosarNr || base.numarDosar,
    nrDosarAsigurator: dosarAsig || base.nrDosarAsigurator,
    asigurator: insurer || base.asigurator,
    tipAsigurare: insuranceType,
    client: client || base.client,
    telefonClient: phone || base.telefonClient,
    inspectorDauna: inspector || base.inspectorDauna,
    marca: make || base.marca,
    model: model || base.model,
    marcaModel: carFull || base.marcaModel,
    kilometraj: parseNumber(root.kilometraj || repair.mileage_km, base.kilometraj),
    ceEsteDeReparat: root.ceEsteDeReparat || root.damage_summary || repair.damage_summary || operations.map((o) => o.piesa).join(", "),
    valoareDevizAudatex: totalDeviz,
    valoarePieseAudatex: totalPiese,
    operatiuni: operations.length ? operations : base.operatiuni,
    manopera: {
      tinichigerie: { facturat: manTinichigerie, alocat: 0, dataIntrareEtapa: null },
      vopsitorie: { facturat: manVopsitorie > 0 ? manVopsitorie : totalVops, alocat: 0, dataIntrareEtapa: null },
    },
    financiar: {
      ...base.financiar,
      valoareDevizAudatex: totalDeviz,
      pieseFacturateFaraTva: totalPiese,
      manoperaTinichigerie: manTinichigerie,
      manoperaVopsitorie: manVopsitorie > 0 ? manVopsitorie : totalVops,
      materialeVopsitorie: matVopsitorie,
      audatex: {
        ...emptyAudatexDevizTotals(),
        totalPiese: totalPiese,
        totalManopera: manTinichigerie,
        totalVopsitorie: totalVops,
        costReparatieFaraTva: totalDeviz,
        costReparatieCuTva: parseNumber(fin.total_amount, totalDeviz > 0 ? Math.round(totalDeviz * 1.21 * 100) / 100 : 0),
      },
    },
  };

  return {
    claimPartial: sanitizeClaim(populated),
    tipDocument,
    extractedRaw: root,
  };
}

export function normalizeNumeric(val, fallback = 0) {
  return parseNumber(val, fallback);
}
