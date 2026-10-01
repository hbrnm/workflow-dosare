import { callGemini, geminiText } from "./aiGateway";

/**
 * Utilitar pentru generarea automată a mesajelor politicoase de WhatsApp / SMS pentru clienți
 */

export async function generateClientMessage(claim, intent = "update_status", apiKey = "") {
  const clientName = claim.client || "Client";
  const plate = claim.numarInmatriculare || "vehiculul dumneavoastră";
  const marcaModel = claim.marcaModel || claim.marca || "mașină";
  const status = claim.status || "în lucru";
  const dataProg = claim.dataProgramare ? claim.dataProgramare.slice(0, 10) : "";
  const pieseSosite = claim.pieseSosite;

  // Prompt contextual
  const prompt = `Ești recepționerul unui service auto de elită din România.
Compune un mesaj scurt, extrem de politicos, clar și profesionist pentru WhatsApp/SMS către client.

Detalii client & dosar:
- Nume Client: ${clientName}
- Vehicul / Plăcuță: ${plate} (${marcaModel})
- Status curent dosar: ${status}
- Data programării atelier: ${dataProg || "Nespecificată"}
- Piesele au sosit: ${pieseSosite ? "DA" : "Încă în procesare"}
- Scenariu solicitat: ${intent} (opțiuni: 'piese_sosite', 'programare', 'gata_predare', 'update_status')

Reguli:
1. Folosește formule de politețe ("Bună ziua, stimate domnule/doamnă...", "Cu stima, echipa noastră").
2. Menționează numărul de înmatriculare ${plate}.
3. Nu adăuga hashtags sau caractere ciudate. Păstrează textul gata de trimis direct pe WhatsApp.
4. Răspunde DOAR cu textul mesajului compus.`;

  const offlineFallback = () => {
    if (intent === "piese_sosite") {
      return `Bună ziua! Vă informăm că piesele pentru vehiculul ${plate} au sosit la atelierul nostru. Vă rugăm să ne contactați pentru confirmarea programării la reparație. O zi excelentă!`;
    }
    if (intent === "gata_predare") {
      return `Bună ziua! Mașina dumneavoastră (${plate}) este gata de ridicare din service. Vă așteptăm la recepție! O zi frumoasă!`;
    }
    return `Bună ziua! Vă transmitem o actualizare privind dosarul vehiculului ${plate}: stadiul curent este "${status}". Pentru detalii suplimentare, rămânem la dispoziția dumneavoastră.`;
  };

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 250 },
  };

  try {
    const text = geminiText(await callGemini(body, { apiKey })).trim();
    if (text) return text;
  } catch (err) {
    console.warn("AI indisponibil pentru mesajul către client, folosesc șablonul:", err?.message || err);
  }

  return offlineFallback();
}
