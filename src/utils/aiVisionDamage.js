import { fileToBase64 } from "./aiDocumentExtractor";

const SYSTEM_PROMPT_DAMAGE_VISION = `Ești un inspector constatator de daune auto experimentat din România.
Analizează imaginea vehiculului avariat și identifică avariile vizibile.

Returnează un JSON strict cu următoarea structură:
{
  "ceEsteDeReparat": string (Descriere clară și concisă a avariilor vizibile, ex: "Bara față înfundată și zgâriată, far stânga spart, aripă stânga deformată"),
  "operatiuni": [
    {
      "piesa": string (Numele elementului caroseriei avariat),
      "inl": boolean (dacă piesa trebuie înlocuită),
      "rev": boolean (dacă piesa trebuie vopsită),
      "rep": boolean (dacă piesa poate fi reparată/tinichigerie),
      "uni": boolean (demontat/remontat)
    }
  ]
}`;

export async function analyzeVehicleDamagePhotos(file, apiKey = "") {
  const effectiveKey = apiKey || localStorage.getItem("gemini_api_key") || "";
  if (!effectiveKey) {
    throw new Error("Cheia API este necesară pentru analiza fotografiilor.");
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${effectiveKey}`;

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: SYSTEM_PROMPT_DAMAGE_VISION },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Eroare analiza foto (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Nu s-au putut detecta avarii în imagine.");
  }

  return JSON.parse(text);
}
