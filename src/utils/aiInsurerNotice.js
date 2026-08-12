/**
 * Utilitar pentru redactarea adreselor oficiale și notificărilor către asigurători
 */

export async function generateInsurerOfficialNotice(claim, type = "supliment", apiKey = "") {
  const effectiveKey = apiKey || localStorage.getItem("gemini_api_key") || "";

  const asigurator = claim.asigurator || "Societatea de Asigurare";
  const nrDosar = claim.nrDosarAsigurator || claim.numarDosar || "Nespecificat";
  const plate = claim.numarInmatriculare || "vehicul";
  const vin = claim.vin || "—";
  const client = claim.client || "Asigurat/Păgubit";
  const suma = claim.valoareDevizAudatex || claim.financiar?.valoareDevizAudatex || 0;

  let tipAdresaLabel = "Solicitare Supliment Daună / Reconstatare";
  if (type === "intarziere") tipAdresaLabel = "Notificare de Întârziere Acord de Plată (Somație)";
  if (type === "decontare") tipAdresaLabel = "Solicitare Decontare Directă & Achitare Factură";

  const prompt = `Ești juristul / responsabilul juridic al unui service auto autorizat din România.
Redactează o adresă oficială scurtă, extrem de fermă și legală către compania de asigurări ${asigurator}.

Tip adresă: ${tipAdresaLabel}

Date dosar:
- Asigurător: ${asigurator}
- Nr. Dosar Asigurător / Service: ${nrDosar}
- Vehicul avariat: ${plate} (VIN: ${vin})
- Client / Beneficiar: ${client}
- Valoare Deviz: ${suma} RON

Cerințe:
1. Păstrează tonul profesional, legal, ferm.
2. Încheie cu formule standard de adresare oficială ("Cu respect, Conducerea Service-ului Auto").
3. Generează direct textul adresei oficiale.`;

  if (!effectiveKey) {
    return `CĂTRE: ${asigurator.toUpperCase()}
DE LA: RECEPTIE SERVICE AUTO

Subiect: ${tipAdresaLabel} — Dosar ${nrDosar} (${plate})

Prin prezenta vă notificăm cu privire la dosarul de daună nr. ${nrDosar} privind autovehiculul ${plate} (VIN: ${vin}), având ca proprietar pe ${client}.

Conform constatării efectuate, suma totală calculată este de ${suma} RON. Vă rugăm să procesați de urgență această solicitare și să ne transmiteți documentele de aprobare conform termenelor legale în vigoare.

Cu stima,
Echipa Service Auto`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${effectiveKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error("Eroare API adresa asigurator");

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  } catch (err) {
    console.warn("Fallback adresa asigurator:", err);
    return `CĂTRE: ${asigurator}\nSubiect: ${tipAdresaLabel} - Dosar ${nrDosar} (${plate})\n\nVă rugăm să procesați dosarul de daună în valoare de ${suma} RON.`;
  }
}
