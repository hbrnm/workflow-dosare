import { sanitizeClaim, emptyClaim, parseNumber } from "./claimModel";
import { emptyAudatexDevizTotals } from "../constants/audatexDevizFields";

/**
 * Prompt-ul de sistem structurat pentru Modele AI pentru a analiza documente de daună auto
 * (Devize Audatex, Eurotax, DAT, Procese Verbale de Constatare, Cereri de despăgubire, Facturi, Taloane etc.)
 */
export const SYSTEM_PROMPT_ROMANIAN_CLAIMS = `Ești un asistent expert în procesarea și analiza documentelor de daună auto din România (devize Audatex, Eurotax, DAT, procese verbale de constatare daune, cereri de despăgubire, certificate de înmatriculare/taloane, facturi de piese, chitanțe).

Analizează documentul atașat (text, imagine sau PDF) și extrage toate datele disponibile în următorul format JSON strict. Dacă o informație nu este găsită în document, returnează null sau string gol.

Formatul JSON de returnat trebuie să aibă exact această structură:
{
  "document_type": "repair_estimate" | "invoice" | "receipt" | "registration_certificate" | "damage_report" | "unknown",
  "document_metadata": {
    "document_number": string sau null (ex: număr dosar, număr deviz sau număr factură),
    "document_date": string sau null (format YYYY-MM-DD),
    "vendor_name": string sau null (nume service auto, asigurător sau emitent),
    "vendor_cui": string sau null (CUI / CIF firmă emitentă)
  },
  "financials": {
    "subtotal_amount": number sau null (total fără TVA),
    "vat_amount": number sau null (valoare TVA),
    "total_amount": number sau null (total cu TVA),
    "currency": "RON" | "EUR" | "USD"
  },
  "repair_details": {
    "vehicle_vin": string sau null (Serie șasiu 17 caractere),
    "license_plate": string sau null (ex: "B 123 ABC"),
    "vehicle_make": string sau null (ex: "Volkswagen", "BMW", "Audi", "Dacia", "Ford"),
    "vehicle_model": string sau null (ex: "Passat", "X5", "Logan", "Focus"),
    "mileage_km": number sau null (kilometraj),
    "labor_total": number sau null (total manoperă fără TVA),
    "parts_total": number sau null (total piese fără TVA),
    "paint_materials_total": number sau null (total materiale vopsitorie fără TVA),
    "additional_costs_total": number sau null (total costuri suplimentare / mărunțișuri),
    "claim_number_insurer": string sau null (număr dosar asigurător ex: "DA-12345678"),
    "insurance_company": string sau null (ex: "Omniasig", "Groupama", "Allianz", "Generali", "Asirom", "Grawe", "Axeria"),
    "insurance_type": "RCA" | "CASCO",
    "client_name": string sau null (numele asiguratului / păgubitului / proprietarului),
    "client_phone": string sau null (telefon contact),
    "delegate_name": string sau null (persoană delegată / împuternicită),
    "claim_inspector": string sau null (inspector de daună),
    "damage_summary": string sau null (descrierea avariilor)
  },
  "line_items": [
    {
      "description": string (denumire piesă / operațiune reparare),
      "quantity": number sau 1,
      "unit_price": number sau 0,
      "total_price": number sau 0,
      "inl": boolean (înlocuire piesă),
      "rev": boolean (revopsire),
      "rep": boolean (reparație tinichigerie),
      "uni": boolean (demontare / montare)
    }
  ],
  "tipDocumentIdentificat": string (ex: "Deviz Audatex", "Proces Verbal Constatare", "Certificat Înmatriculare", "Deviz Eurotax", "Factură Piese", "Necunoscut")
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
  const meta = extracted.document_metadata || {};
  const fin = extracted.financials || {};
  const rep = extracted.repair_details || {};
  const lineItems = Array.isArray(extracted.line_items) ? extracted.line_items : [];

  // 1. Câmpuri de identificare dosar & vehicul
  const numarDosar =
    extracted.numarDosar ||
    meta.document_number ||
    base.numarDosar;

  const nrDosarAsigurator =
    extracted.nrDosarAsigurator ||
    rep.claim_number_insurer ||
    "";

  const asigurator =
    extracted.asigurator ||
    rep.insurance_company ||
    meta.vendor_name ||
    base.asigurator;

  const tipAsigurare =
    extracted.tipAsigurare === "CASCO" || rep.insurance_type === "CASCO"
      ? "CASCO"
      : "RCA";

  const client =
    extracted.client ||
    rep.client_name ||
    meta.vendor_name ||
    "";

  const delegat =
    extracted.delegat ||
    rep.delegate_name ||
    "";

  const telefonClient =
    extracted.telefonClient ||
    rep.client_phone ||
    "";

  const rawPlate = extracted.numarInmatriculare || rep.license_plate || "";
  const numarInmatriculare = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, " ").trim();

  const rawVin = extracted.vin || rep.vehicle_vin || "";
  const vin = rawVin.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const marca = (extracted.marca || rep.vehicle_make || "").trim();
  const model = (extracted.model || rep.vehicle_model || "").trim();
  const marcaModel = extracted.marcaModel || [marca, model].filter(Boolean).join(" ");

  const kilometraj =
    extracted.kilometraj != null
      ? normalizeNumeric(extracted.kilometraj, null)
      : rep.mileage_km != null
      ? normalizeNumeric(rep.mileage_km, null)
      : null;

  const inspectorDauna =
    extracted.inspectorDauna ||
    rep.claim_inspector ||
    "";

  const ceEsteDeReparat =
    extracted.ceEsteDeReparat ||
    rep.damage_summary ||
    "";

  // 2. Câmpuri financiare & deviz Audatex
  const valoareDevizAudatex = normalizeNumeric(
    extracted.valoareDevizAudatex ||
    fin.subtotal_amount ||
    fin.total_amount ||
    0
  );

  const valoarePieseAudatex = normalizeNumeric(
    extracted.valoarePieseAudatex ||
    rep.parts_total ||
    0
  );

  const manoperaTinichigerie = normalizeNumeric(
    extracted.manoperaTinichigerie ||
    rep.labor_total ||
    0
  );

  const manoperaVopsitorie = normalizeNumeric(
    extracted.manoperaVopsitorie ||
    0
  );

  const materialeVopsitorie = normalizeNumeric(
    extracted.materialeVopsitorie ||
    rep.paint_materials_total ||
    0
  );

  const totalCosturiSuplimentare = normalizeNumeric(
    extracted.totalCosturiSuplimentare ||
    rep.additional_costs_total ||
    0
  );

  const costReparatieCuTva = normalizeNumeric(
    extracted.costReparatieCuTva ||
    fin.total_amount ||
    (valoareDevizAudatex > 0 ? Math.round(valoareDevizAudatex * 1.19 * 100) / 100 : 0)
  );

  const valoareFransiza = normalizeNumeric(
    extracted.valoareFransiza || 0
  );

  const sumaDecont = normalizeNumeric(
    extracted.sumaDecont ||
    fin.total_amount ||
    0
  );

  // 3. Populare structură financiară completă (inclusiv audatex UI fields)
  const audatexTotals = {
    ...emptyAudatexDevizTotals(),
    totalPiese: valoarePieseAudatex,
    totalManopera: manoperaTinichigerie + manoperaVopsitorie,
    totalCosturiSuplimentare: totalCosturiSuplimentare,
    totalVopsitorie: materialeVopsitorie,
    costReparatieFaraTva: valoareDevizAudatex,
    costReparatieCuTva: costReparatieCuTva,
  };

  // 4. Operațiuni & linii de deviz
  const operatiuniFromLineItems = lineItems.map((li, i) => ({
    id: `ai_item_${Date.now()}_${i}`,
    piesa: String(li.description || li.piesa || "").trim(),
    inl: Boolean(li.inl),
    rev: Boolean(li.rev),
    rep: Boolean(li.rep),
    uni: Boolean(li.uni),
  }));

  const operatiuniFromLegacy = Array.isArray(extracted.operatiuni)
    ? extracted.operatiuni.map((op, i) => ({
        id: `ai_op_${Date.now()}_${i}`,
        piesa: String(op.piesa || "").trim(),
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
    ceEsteDeReparat,
    valoareDevizAudatex,
    valoarePieseAudatex,
    sumaDecont,
    financiar: {
      ...base.financiar,
      valoareDevizAudatex,
      pieseFacturateFaraTva: valoarePieseAudatex,
      valoareFransiza,
      manoperaTinichigerie,
      manoperaVopsitorie,
      materialeVopsitorie,
      numarFactura: meta.document_number || extracted.numarFactura || "",
      dataFactura: meta.document_date || extracted.dataFactura || null,
      audatex: audatexTotals,
    },
    operatiuni,
  };

  const tipDoc =
    extracted.tipDocumentIdentificat ||
    (extracted.document_type === "repair_estimate"
      ? "Deviz Reparație"
      : extracted.document_type === "invoice"
      ? "Factură Fiscală"
      : extracted.document_type === "receipt"
      ? "Chitanță / Bon"
      : extracted.document_type === "registration_certificate"
      ? "Certificat Înmatriculare"
      : extracted.document_type === "damage_report"
      ? "Proces Verbal Constatare"
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
  const populated = applyEstimateValuesToClaim(base, parsed.values, {
    operations: parsed.operations || [],
    applyOperations: true,
    replaceOperations: true,
    importMeta: {
      fileName: file.name,
      importedAt: new Date().toISOString(),
      source: "local_audatex_engine",
    },
  });

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
      extractedPdfText = parsed?.rawPreview || "";
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
