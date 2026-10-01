import { fileToBase64 } from "./aiDocumentExtractor";
import { callGemini } from "./aiGateway";

/**
 * Pregătește un sumar dinamic al dosarelor pentru contextul Supervizorului de Atelier
 */
export function buildClaimsContextSummary(claims = []) {
  if (!Array.isArray(claims) || claims.length === 0) {
    return "Nu există dosare înregistrate în acest atelier.";
  }

  const activeClaims = claims.filter((c) => c && !c.arhivat);

  const summaryLines = activeClaims.slice(0, 50).map((c) => {
    const plate = c.numarInmatriculare || "FĂRĂ_NR";
    const dosar = c.numarDosar ? `#${c.numarDosar}` : "";
    const client = c.client || "Client necunoscut";
    const status = c.status || "deschidere";
    const asigurator = c.asigurator || "Necompletat";
    const deviz = c.valoareDevizAudatex || c.financiar?.valoareDevizAudatex || 0;
    const pieseSosite = c.pieseSosite ? "Piese sosite: DA" : "Piese sosite: NU";
    const blocat = c.blocat ? `BLOCAT (${c.motivBlocare || "fără motiv"})` : "Activ";
    const dataProg = c.dataProgramare ? `Programat: ${c.dataProgramare.slice(0, 10)}` : "";

    return `- [${plate}] ${dosar} | Status: ${status} | Asigurător: ${asigurator} | Client: ${client} | Deviz: ${deviz} RON | ${pieseSosite} | ${blocat} ${dataProg}`.trim();
  });

  return `
Total dosare active în atelier: ${activeClaims.length}
Lista dosarelor recente (max 50):
${summaryLines.join("\n")}
`;
}

/**
 * Promptul de sistem pentru Supervizorul Atelierului
 */
const SYSTEM_PROMPT_SUPERVIZOR = `Ești "Supervizor Atelier", un asistent virtual inteligent și experimentat pentru service-uri auto și gestionarea dosarelor de daună (RCA/CASCO) din România.

Răspunzi scurt, direct, profesionist și amabil la întrebările recepționerilor, mecanicilor sau managerilor de atelier.
Folosești contextul dosarelor oferit mai jos pentru a oferi răspunsuri exacte, statistici, recomandări sau sumare de dosar.

Reguli de răspuns:
1. Răspunde întotdeauna în limba română.
2. Fii concis (sub 3-4 paragrafe), structurat cu bullet points dacă este cazul.
3. Dacă utilizatorul întreabă despre un dosar specific (ex: număr înmatriculare sau număr dosar), caută-l în listă și oferă un rezumat clar.
4. Dacă informația nu există în context, precizează asta respectuos.
`;

/**
 * Apelează Gemini (proxy server-side, cu fallback pe cheia utilizatorului) cu fallback pe mai multe modele.
 */
export async function callGeminiApiWithFallback(effectiveKey, body) {
  return callGemini(body, { apiKey: effectiveKey });
}

/**
 * Apelează Gemini API pentru Supervizor Atelier
 */
export async function askSupervizorAtelier(userQuery, claims = [], apiKey = "") {
  const claimsContext = buildClaimsContextSummary(claims);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_PROMPT_SUPERVIZOR}\n\nCONTEXT DOSARE ATELIER:\n${claimsContext}\n\nÎNTREBARE UTILIZATOR:\n${userQuery}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  };

  const data = await callGemini(body, { apiKey });
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!answer) {
    throw new Error("Nu s-a primit un răspuns valid de la Supervizor.");
  }

  return answer;
}
