import JSZip from "jszip";
import jsPDF from "jspdf";
import { fmtDate, todayISO } from "./dateUtils";
import { OMNIASIG_CERERE_PLATA, resolveCerereDespagubireParties } from "./cerereDespagubire";

const sanitize = (str) => String(str || "fara_nume").replace(/[^a-zA-Z0-9_\-\.]/g, "_");

/**
 * Generează un PDF A4 cu Centralizatorul de Decont & Date Bancare pentru Asigurător
 */
export function generateCentralizatorDecontPdf(claim, atelierBranding = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const atelierNume = atelierBranding?.nume || atelierBranding?.atelierNume || OMNIASIG_CERERE_PLATA.beneficiar || "SERVICE AUTO EXPERT";
  const atelierCui = atelierBranding?.cui || "RO12345678";
  const atelierIban = atelierBranding?.iban || OMNIASIG_CERERE_PLATA.cont || "RO56 MIRO 0000 1184 0304 0301";
  const atelierBanca = atelierBranding?.banca || OMNIASIG_CERERE_PLATA.banca || "PROCREDIT BANK";

  const nrInmat = String(claim?.numarInmatriculare || "—").toUpperCase();
  const vin = String(claim?.vin || "—").toUpperCase();
  const marcaModel = String(claim?.marcaModel || `${claim?.marca || ""} ${claim?.model || ""}`).trim() || "—";
  const clientNume = String(claim?.client || "—").trim();
  const nrDosarAsig = String(claim?.nrDosarAsigurator || claim?.numarDosar || "—").trim();
  const asigurator = String(claim?.asigurator || "Asigurare").trim();

  // Valori financiare
  const valPiese = Number(claim?.valoarePieseAudatex || claim?.financiar?.pieseFacturateFaraTva || 0);
  const manTinichigerie = Number(claim?.financiar?.manoperaTinichigerie || claim?.manopera?.tinichigerie?.facturat || 0);
  const manVopsitorie = Number(claim?.financiar?.manoperaVopsitorie || claim?.manopera?.vopsitorie?.facturat || 0);
  const matVopsitorie = Number(claim?.financiar?.materialeVopsitorie || 0);
  const suplimente = Number(claim?.financiar?.cheltuieliDiverse || 0);

  const totalNet = valPiese + manTinichigerie + manVopsitorie + matVopsitorie + suplimente;
  const tvaVal = Math.round(totalNet * 0.21 * 100) / 100;
  const totalBrut = Number(claim?.sumaDecont || totalNet + tvaVal);

  // 1. Antet
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(atelierNume, margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`C.U.I.: ${atelierCui} | Cont IBAN: ${atelierIban} (${atelierBanca})`, margin, y + 9);

  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Titlu
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("CENTRALIZATOR DECONT DAUNĂ AUTO", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Către Asigurător: ${asigurator} · Dosar Daună: ${nrDosarAsig} · Data: ${fmtDate(todayISO())}`, pageWidth / 2, y, { align: "center" });

  // 3. Date Identificare
  y += 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Autovehicul: ${nrInmat} (${marcaModel})`, margin + 4, y + 7);
  doc.text(`Serie Șasiu (VIN): ${vin}`, margin + 4, y + 14);
  doc.text(`Proprietar / Păgubit: ${clientNume}`, margin + 4, y + 21);

  doc.text(`Nr. Deviz Service: ${claim?.numarDosar || "—"}`, margin + 110, y + 7);
  doc.text(`Tip Asigurare: ${claim?.tipAsigurare || "CASCO"}`, margin + 110, y + 14);
  doc.text(`Termen Legal Plată: 10 zile`, margin + 110, y + 21);

  // 4. Tabel Desfășurat Financiari
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("SITUAȚIA VALORICĂ A LUCRĂRILOR EFECTUATE", margin, y);

  y += 4;
  const colX = [margin, margin + 95, margin + 140];
  const rowHeight = 7;

  // Header Tabel
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("CAPITOL / REPER DE REPARAȚIE", colX[0] + 3, y + 5);
  doc.text("VALOARE FĂRĂ TVA", colX[1] + 3, y + 5);
  doc.text("VALOARE CU TVA (21%)", colX[2] + 3, y + 5);

  y += rowHeight;

  const rows = [
    { label: "1. Total Piese de Schimb Înlocuite", net: valPiese },
    { label: "2. Manoperă Tinichigerie & Caroserie", net: manTinichigerie },
    { label: "3. Manoperă Vopsitorie & Pregătire", net: manVopsitorie },
    { label: "4. Materiale de Vopsitorie", net: matVopsitorie },
    { label: "5. Alte Cheltuieli / Suplimente", net: suplimente },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
    }
    const rTva = Math.round(r.net * 1.21 * 100) / 100;
    doc.text(r.label, colX[0] + 3, y + 5);
    doc.text(`${Math.round(r.net).toLocaleString("ro-RO")} lei`, colX[1] + 3, y + 5);
    doc.text(`${Math.round(rTva).toLocaleString("ro-RO")} lei`, colX[2] + 3, y + 5);
    y += rowHeight;
  });

  // Linia Totaluri
  y += 2;
  doc.setFillColor(224, 231, 255);
  doc.setDrawColor(99, 102, 241);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text("TOTAL DECONT SOLICITAT DE PLATĂ:", margin + 4, y + 6);
  doc.text(`TOTAL NETTO: ${Math.round(totalNet).toLocaleString("ro-RO")} lei  |  TVA 21%: ${Math.round(tvaVal).toLocaleString("ro-RO")} lei`, margin + 4, y + 11);

  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229);
  doc.text(`${Math.round(totalBrut).toLocaleString("ro-RO")} LEI`, pageWidth - margin - 6, y + 9, { align: "right" });

  // 5. Instrucțiuni de Virament
  y += 20;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("INSTRUCȚIUNI DE PLATĂ / VIRAMENT BANCAR", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Beneficiar: ${atelierNume}`, margin + 4, y + 12);
  doc.text(`Cont IBAN: ${atelierIban}`, margin + 4, y + 17);
  doc.text(`Banca: ${atelierBanca}  |  Explicație virament: Decont Dauna ${nrDosarAsig} / ${nrInmat}`, margin + 4, y + 22);

  // 6. Semnătură & Ștampilă
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("UNITATEA REPARATOARE (SERVICE):", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Reprezentant legal / Consilier Daune`, margin, y + 5);
  doc.text("✓ Document emis electronic conform legislației în vigoare", margin, y + 12);

  return doc.output("arraybuffer");
}

/**
 * Generează textul complet pentru e-mailul către inspector / lichidator
 */
export function buildInsurerEmailTemplate(claim, atelierBranding = {}) {
  const nrInmat = String(claim?.numarInmatriculare || "—").toUpperCase();
  const nrDosar = String(claim?.nrDosarAsigurator || claim?.numarDosar || "—");
  const asigurator = String(claim?.asigurator || "Asigurător");
  const clientNume = String(claim?.client || "Client");
  const totalDecont = Number(claim?.sumaDecont || claim?.valoareDevizAudatex || 0);
  const atelierNume = atelierBranding?.nume || OMNIASIG_CERERE_PLATA.beneficiar || "SERVICE AUTO";
  const iban = atelierBranding?.iban || OMNIASIG_CERERE_PLATA.cont;

  return `Către: Departamentul Daune - ${asigurator}
Subiect: Pachet Decont Final Daună [${nrInmat}] · Dosar: ${nrDosar} · ${clientNume}

Stimate domnule / Stimată doamnă Inspector,

Vă transmitem atașat pachetul complet de documente și fotografii pentru finalizarea dosarului de daună și emiterea acceptului de plată:

• Nr. Înmatriculare: ${nrInmat}
• Serie Șasiu (VIN): ${claim?.vin || "—"}
• Nr. Dosar Asigurător: ${nrDosar}
• Păgubit / Asigurat: ${clientNume}
• Valoare Totală Decont (cu TVA): ${Math.round(totalDecont).toLocaleString("ro-RO")} LEI

Documente incluse în arhiva atașată:
1. Centralizator Decont Lucrări & Cont Bancar IBAN
2. Cerere Oficială de Despăgubire
3. Deviz de Reparație Audatex / DAT
4. Proces-Verbal de Recepție & Predare
5. Fotografii conform standardelor (serie șasiu, avarii, piese înlocuite, final)

Date pentru efectuarea viramentului:
• Beneficiar: ${atelierNume}
• Cont IBAN: ${iban}
• Banca: ${atelierBranding?.banca || OMNIASIG_CERERE_PLATA.banca}
• Detalii plată: Decont dosar ${nrDosar} / ${nrInmat}

Vă rugăm să ne confirmați primirea documentației și emiterea acceptului de plată conform termenului legal.

Cu stimă,
Departamentul Daune · ${atelierNume}`;
}

/**
 * Generează arhiva ZIP completă pentru lichidator și declanșează descărcarea automată
 */
export async function generateSettlementPackageZip(claim, { atelierBranding = {} } = {}) {
  const zip = new JSZip();
  const nrInmat = sanitize(claim?.numarInmatriculare || "fara_nr");
  const asig = sanitize(claim?.asigurator || "Asigurare");
  const folderName = `Pachet_Decont_${nrInmat}_${asig}`;
  const root = zip.folder(folderName);

  // 1. Centralizator Decont PDF
  const centralizatorBytes = generateCentralizatorDecontPdf(claim, atelierBranding);
  root.file(`01_Centralizator_Decont_${nrInmat}.pdf`, centralizatorBytes);

  // 2. Poze organizate
  const poze = Array.isArray(claim?.poze) ? claim.poze : [];
  if (poze.length > 0) {
    const fotoFolder = root.folder("02_Foto_Dosar");
    for (let i = 0; i < poze.length; i++) {
      const p = poze[i];
      const url = p?.url || p?.dataUrl;
      if (!url) continue;

      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const bytes = await resp.arrayBuffer();
          const ext = url.includes(".png") ? "png" : "jpg";
          const cat = sanitize(p.categoria || p.categorie || "foto");
          fotoFolder.file(`Foto_${i + 1}_${cat}.${ext}`, bytes);
        }
      } catch (err) {
        console.warn(`Could not download image ${i + 1}:`, err);
      }
    }
  }

  // 3. Documente atașate (Devize, Facturi, PV-uri)
  const docs = Array.isArray(claim?.documente) ? claim.documente : [];
  if (docs.length > 0) {
    const docsFolder = root.folder("03_Documente_si_Devize");
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const url = d?.url || d?.dataUrl;
      if (!url) continue;

      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const bytes = await resp.arrayBuffer();
          const name = sanitize(d.nume || `doc_${i + 1}.pdf`);
          docsFolder.file(name, bytes);
        }
      } catch (err) {
        console.warn(`Could not download doc ${i + 1}:`, err);
      }
    }
  }

  // 4. Text E-mail în fișier .txt
  const emailText = buildInsurerEmailTemplate(claim, atelierBranding);
  root.file("00_Text_Email_Asigurator.txt", emailText);

  // Generare arhivă ZIP
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const fileName = `${folderName}.zip`;

  // Descărcare automată
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return {
    zipBlob,
    fileName,
    emailText,
    pozeCount: poze.length,
    docsCount: docs.length + 1,
  };
}
