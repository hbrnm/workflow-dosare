/**
 * Utilitar pentru generarea automată a mesajelor politicoase de WhatsApp / SMS pentru clienți
 */

export async function generateClientMessage(claim, intent = "update_status", apiKey = "") {
  const effectiveKey = apiKey || localStorage.getItem("gemini_api_key") || "";
  
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

  if (!effectiveKey) {
    // Fallback inteligent dacă cheia API nu este disponibilă
    if (intent === "piese_sosite") {
      return `Bună ziua! Vă informăm că piesele pentru vehiculul ${plate} au sosit la atelierul nostru. Vă rugăm să ne contactați pentru confirmarea programării la reparație. O zi excelentă!`;
    }
    if (intent === "gata_predare") {
      return `Bună ziua! Mașina dumneavoastră (${plate}) este gata de ridicare din service. Vă așteptăm la recepție! O zi frumoasă!`;
    }
    return `Bună ziua! Vă transmitem o actualizare privind dosarul vehiculului ${plate}: stadiul curent este "${status}". Pentru detalii suplimentare, rămânem la dispoziția dumneavoastră.`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${effectiveKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 250 },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error("Eroare API la generarea mesajului");

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Bună ziua! Vă informăm că dosarul pentru vehiculul ${plate} este în stadiul: ${status}.`;
  } catch (err) {
    console.warn("Fallback la generare mesaj:", err);
    return `Bună ziua! Vă informăm că dosarul pentru vehiculul ${plate} este în stadiul: ${status}.`;
  }
}
