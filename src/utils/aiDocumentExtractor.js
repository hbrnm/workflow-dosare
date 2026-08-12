import { sanitizeClaim, emptyClaim } from "./claimModel";

/**
 * Prompt-ul de sistem structurat pentru Gemini AI pentru a analiza documente de daună auto
 * (Devize Audatex, Eurotax, Procese Verbale de Constatare, Cereri de despăgubire, Taloane etc.)
 */
const SYSTEM_PROMPT_ROMANIAN_CLAIMS = `Ești un asistent expert în procesarea și analiza documentelor de daună auto din România (devize Audatex, Eurotax, procese verbale de constatare daune, cereri de despăgubire, certificate de înmatriculare/taloane, facturi de piese).

Analizează documentul atașat (imagine sau PDF) și extrage toate datele disponibile în următorul format JSON strict. Dacă o informație nu este găsită în document, returnează null sau string gol.

Formatul JSON de returnat trebuie să aibă exact această structură:
{
  "numarDosar": string sau null (ex: "DOS-2024-001" sau număr dosar service),
  "nrDosarAsigurator": string sau null (ex: "DA-12345678"),
  "asigurator": string sau null (ex: "Omniasig", "Groupama", "Allianz", "Generali", "Asirom", "Grawe", "Axeria"),
  "tipAsigurare": string ("RCA" sau "CASCO"),
  "client": string sau null (Numele complet al proprietarului / păgubitului / asiguratului),
  "delegat": string sau null (Persoană delegată / împuternicită),
  "telefonClient": string sau null,
  "numarInmatriculare": string sau null (ex: "B 123 ABC" sau "CJ 01 XYZ"),
  "vin": string sau null (Serie șasiu 17 caractere),
  "marca": string sau null (ex: "Volkswagen", "BMW", "Audi", "Dacia", "Ford"),
  "model": string sau null (ex: "Passat", "X5", "Logan", "Focus"),
  "kilometraj": number sau null,
  "inspectorDauna": string sau null (Nume inspector daună),
  "ceEsteDeReparat": string sau null (Descriere generală a avariilor),
  "valoareDevizAudatex": number sau null (Valoarea totală deviz fără TVA sau cu TVA specificat),
  "valoarePieseAudatex": number sau null (Total piese din deviz),
  "manoperaTinichigerie": number sau null (Valoare manoperă tinichigerie),
  "manoperaVopsitorie": number sau null (Valoare manoperă vopsitorie),
  "materialeVopsitorie": number sau null (Valoare materiale vopsitorie),
  "valoareFransiza": number sau null,
  "sumaDecont": number sau null,
  "operatiuni": [
    {
      "piesa": string (Nume piesa / reper avariat),
      "inl": boolean (înlocuit),
      "rev": boolean (reparat / vopsit),
      "rep": boolean (reparat),
      "uni": boolean (uneori / demontat)
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
 * Apelează direct Google Gemini API cu cheia configurată de utilizator sau din Supabase
 */
export async function extractClaimDataWithGeminiDirect(file, apiKey, modelParam = "gemini-1.5-flash") {
  if (!apiKey) {
    throw new Error("Cheia API Google Gemini lipsește. Introduceți cheia în Setări sau folosiți Supabase Edge Function.");
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

  const modelEndpoints = [
    { version: "v1beta", name: "gemini-3.6-flash" },
    { version: "v1beta", name: "gemini-3.6-pro" },
    { version: "v1beta", name: modelParam || "gemini-1.5-flash" },
    { version: "v1beta", name: "gemini-1.5-flash" },
    { version: "v1", name: "gemini-1.5-flash" },
    { version: "v1beta", name: "gemini-1.5-pro" },
    { version: "v1", name: "gemini-1.5-pro" },
  ];

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: SYSTEM_PROMPT_ROMANIAN_CLAIMS,
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
    },
  };

  let lastError = null;
  for (const m of modelEndpoints) {
    const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent?key=${apiKey}`;
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
        const extractedRaw = JSON.parse(textResponse);
        return mapExtractedJsonToClaim(extractedRaw);
      }

      const errText = await resp.text();
      lastError = new Error(`Eroare Gemini API ${model} (${resp.status}): ${errText}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Procesarea cu Gemini API a eșuat pe toate modelele.");
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

/**
 * Mapează obiectul extras de AI la un obiect de tip Claim compatibil cu aplicația
 */
export function mapExtractedJsonToClaim(extracted) {
  if (!extracted || typeof extracted !== "object") {
    return { claimPartial: emptyClaim(), tipDocument: "Document Procesat", extractedRaw: {} };
  }

  const base = emptyClaim();

  const marca = (extracted.marca || "").trim();
  const model = (extracted.model || "").trim();
  const marcaModel = [marca, model].filter(Boolean).join(" ");

  const partial = {
    numarDosar: extracted.numarDosar || base.numarDosar,
    nrDosarAsigurator: extracted.nrDosarAsigurator || "",
    asigurator: extracted.asigurator || base.asigurator,
    tipAsigurare: extracted.tipAsigurare === "CASCO" ? "CASCO" : "RCA",
    client: extracted.client || "",
    delegat: extracted.delegat || "",
    telefonClient: extracted.telefonClient || "",
    numarInmatriculare: (extracted.numarInmatriculare || "").toUpperCase().replace(/[^A-Z0-9]/g, " "),
    vin: (extracted.vin || "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
    marca: marca,
    model: model,
    marcaModel: marcaModel,
    kilometraj: extracted.kilometraj ? Number(extracted.kilometraj) : null,
    inspectorDauna: extracted.inspectorDauna || "",
    ceEsteDeReparat: extracted.ceEsteDeReparat || "",
    valoareDevizAudatex: extracted.valoareDevizAudatex ? Number(extracted.valoareDevizAudatex) : 0,
    valoarePieseAudatex: extracted.valoarePieseAudatex ? Number(extracted.valoarePieseAudatex) : 0,
    sumaDecont: extracted.sumaDecont ? Number(extracted.sumaDecont) : 0,
    financiar: {
      ...base.financiar,
      valoareDevizAudatex: extracted.valoareDevizAudatex ? Number(extracted.valoareDevizAudatex) : 0,
      pieseFacturateFaraTva: extracted.valoarePieseAudatex ? Number(extracted.valoarePieseAudatex) : 0,
      valoareFransiza: extracted.valoareFransiza ? Number(extracted.valoareFransiza) : 0,
      manoperaTinichigerie: extracted.manoperaTinichigerie ? Number(extracted.manoperaTinichigerie) : 0,
      manoperaVopsitorie: extracted.manoperaVopsitorie ? Number(extracted.manoperaVopsitorie) : 0,
      materialeVopsitorie: extracted.materialeVopsitorie ? Number(extracted.materialeVopsitorie) : 0,
    },
    operatiuni: Array.isArray(extracted.operatiuni)
      ? extracted.operatiuni.map((op, i) => ({
          id: `ai_op_${Date.now()}_${i}`,
          piesa: op.piesa || "",
          inl: !!op.inl,
          rev: !!op.rev,
          rep: !!op.rep,
          uni: !!op.uni,
        }))
      : [],
  };

  return {
    claimPartial: sanitizeClaim(partial),
    tipDocument: extracted.tipDocumentIdentificat || "Document Procesat",
    extractedRaw: extracted,
  };
}
