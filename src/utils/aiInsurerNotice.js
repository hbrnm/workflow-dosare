import { callGemini, geminiText } from "./aiGateway";

/**
 * Utilitar pentru redactarea adreselor oficiale și notificărilor către asigurători
 */

export async function generateInsurerOfficialNotice(claim, type = "supliment", apiKey = "") {
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

  const offlineFallback = () => `CĂTRE: ${asigurator.toUpperCase()}
DE LA: RECEPTIE SERVICE AUTO

Subiect: ${tipAdresaLabel} — Dosar ${nrDosar} (${plate})

Prin prezenta vă notificăm cu privire la dosarul de daună nr. ${nrDosar} privind autovehiculul ${plate} (VIN: ${vin}), având ca proprietar pe ${client}.

Conform constatării efectuate, suma totală calculată este de ${suma} RON. Vă rugăm să procesați de urgență această solicitare și să ne transmiteți documentele de aprobare conform termenelor legale în vigoare.

Cu stima,
Echipa Service Auto`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  };

  try {
    const text = geminiText(await callGemini(body, { apiKey })).trim();
    if (text) return text;
  } catch (err) {
    console.warn("AI indisponibil pentru adresa către asigurător, folosesc șablonul:", err?.message || err);
  }

  return offlineFallback();
}
