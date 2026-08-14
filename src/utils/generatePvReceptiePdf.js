import jsPDF from "jspdf";
import { fmtDate, todayISO } from "./dateUtils";

/**
 * Generează un Proces-Verbal de Predare-Primire Autovehicul oficial în format PDF (A4)
 */
export async function generatePvReceptiePdf({
  claim,
  receptieData = {},
  signatureDataUrl = null,
  atelierBranding = {},
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const sanitize = (val, fallback = "—") => String(val || "").trim() || fallback;

  const atelierNume = sanitize(atelierBranding?.nume || atelierBranding?.atelierNume, "SERVICE AUTO EXPERT");
  const atelierCui = sanitize(atelierBranding?.cui, "RO12345678");
  const atelierAdresa = sanitize(atelierBranding?.adresa, "București, România");
  const atelierTel = sanitize(atelierBranding?.telefon, "0700 000 000");

  const nrInmat = sanitize(claim?.numarInmatriculare, "FĂRĂ NR.").toUpperCase();
  const vin = sanitize(claim?.vin, "—").toUpperCase();
  const marcaModel = sanitize(claim?.marcaModel || `${claim?.marca || ""} ${claim?.model || ""}`, "—");
  const clientNume = sanitize(claim?.client, "Client Nespecificat");
  const clientTel = sanitize(claim?.telefonClient, "—");
  const nrDosar = sanitize(claim?.numarDosar || claim?.nrDosarAsigurator, "—");
  const asigurator = sanitize(claim?.asigurator, "Regie Proprie");

  const kmIntrare = sanitize(receptieData?.kilometraj || claim?.kilometraj, "—");
  const combustibil = sanitize(receptieData?.combustibil, "2/4 (50%)");
  const obiecte = Array.isArray(receptieData?.obiecte) && receptieData.obiecte.length > 0
    ? receptieData.obiecte.join(", ")
    : "Nu au fost declarate obiecte de valoare în autovehicul";
  const avariiPreexistente = sanitize(receptieData?.avariiPreexistente, "Fără avarii exterioare suplimentare declarate");
  const observatii = sanitize(receptieData?.observatii, "Autovehiculul a fost primit în vederea efectuării reparațiilor de caroserie/vopsitorie.");

  const dataReceptie = fmtDate(receptieData?.data || todayISO());

  // 1. Antet Service
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(atelierNume, margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`C.U.I.: ${atelierCui} | Adresă: ${atelierAdresa} | Tel: ${atelierTel}`, margin, y + 9);

  // Linia de separare antet
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Titlu Document
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("PROCES-VERBAL DE PREDARE - PRIMIRE AUTOVEHICUL", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Nr. înreg. intern: PV-${nrInmat.replace(/\s+/g, "")}-${new Date().getFullYear()} · Data: ${dataReceptie}`, pageWidth / 2, y, { align: "center" });

  // 3. Casete Date: Vehicul & Client
  y += 8;
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Caseta Stânga: Date Vehicul
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colWidth, 40, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("DATE AUTOVEHICUL", margin + 3, y + 5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Nr. Înmatriculare:`, margin + 3, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(nrInmat, margin + 34, y + 12);

  doc.setFont("helvetica", "normal");
  doc.text(`Serie Șasiu (VIN):`, margin + 3, y + 18);
  doc.setFont("helvetica", "bold");
  doc.text(vin, margin + 34, y + 18);

  doc.setFont("helvetica", "normal");
  doc.text(`Marcă / Model:`, margin + 3, y + 24);
  doc.text(marcaModel.slice(0, 28), margin + 34, y + 24);

  doc.text(`Kilometraj Intrare:`, margin + 3, y + 30);
  doc.setFont("helvetica", "bold");
  doc.text(`${kmIntrare} km`, margin + 34, y + 30);

  doc.setFont("helvetica", "normal");
  doc.text(`Nivel Combustibil:`, margin + 3, y + 36);
  doc.text(combustibil, margin + 34, y + 36);

  // Caseta Dreapta: Date Client & Dosar
  const rightX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, y, colWidth, 40, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("DATE CLIENT & ASIGURARE", rightX + 3, y + 5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Proprietar / Client:`, rightX + 3, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(clientNume.slice(0, 26), rightX + 32, y + 12);

  doc.setFont("helvetica", "normal");
  doc.text(`Telefon Contact:`, rightX + 3, y + 18);
  doc.text(clientTel, rightX + 32, y + 18);

  doc.text(`Dosar Daună / Nr.:`, rightX + 3, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(nrDosar, rightX + 32, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text(`Asigurător:`, rightX + 3, y + 30);
  doc.text(asigurator, rightX + 32, y + 30);

  doc.text(`Tip Asigurare:`, rightX + 3, y + 36);
  doc.text(sanitize(claim?.tipAsigurare, "CASCO"), rightX + 32, y + 36);

  const elementeAvariate = Array.isArray(receptieData?.elementeAvariate) && receptieData.elementeAvariate.length > 0
    ? receptieData.elementeAvariate.join(", ")
    : "Nu au fost identificate elemente de caroserie avariate pe schemă";

  const pozeCount = receptieData?.pozeCount || (Array.isArray(receptieData?.poze) ? receptieData.poze.length : 0);
  const pozeMention = pozeCount > 0
    ? `${pozeCount} fotografii de recepție efectuate și atașate în dosar`
    : "Fără fotografii de intrare";

  // 4. Stare la Preluare & Avarii Preexistente
  y += 45;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("CONSTATĂRI LA RECEPȚIE & ELEMENTE AVARIATE", margin + 3, y + 5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  doc.text("Elemente caroserie marcate pe schemă:", margin + 3, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(elementeAvariate, pageWidth - margin * 2 - 10), margin + 3, y + 17);

  doc.setFont("helvetica", "normal");
  doc.text("Documente & Obiecte preluate în custodie:", margin + 3, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(obiecte, pageWidth - margin * 2 - 10), margin + 3, y + 29);

  doc.setFont("helvetica", "normal");
  doc.text("Fotografii intrare & Observații:", margin + 3, y + 36);
  doc.text(`${pozeMention} · ${observatii.slice(0, 60)}`, margin + 3, y + 40);

  // 5. Clauze Legale, Acord Proba de Drum & GDPR
  y += 46;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TERMENI, CONDIȚII DE CUSTODIE ȘI ACORD PROBĂ DE DRUM", margin + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  const clauze = [
    "1. Clientul autorizează atelierul service să efectueze probe de drum necesare diagnosticării și verificării calității reparațiilor.",
    "2. Atelierul răspunde de integritatea autovehiculului pe durata staționării în incinta unității reparatoare, în limita stării consemnate la primire.",
    "3. Clientul confirmă că nu a lăsat în autovehicul sume de bani sau alte bunuri de valoare nedeclarate expres în prezentul proces-verbal.",
    "4. Datele cu caracter personal sunt prelucrate exclusiv în scopul executării contractului de reparație și relației cu asigurătorul (conform Regulamentului UE 2016/679 - GDPR).",
  ];
  let clauzeY = y + 9;
  clauzeleForEach: clauze.forEach((cl) => {
    doc.text(cl, margin + 3, clauzeY);
    clauzeY += 4.5;
  });

  // 6. Zona Semnături
  y += 35;
  const signBoxWidth = (pageWidth - margin * 2 - 10) / 2;

  // Semnătură Client
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, signBoxWidth, 34, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("AM PREDAT AUTOVEHICULUL (CLIENT):", margin + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Nume: ${clientNume}`, margin + 3, y + 10);

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, "PNG", margin + 5, y + 12, signBoxWidth - 10, 18);
    } catch (e) {
      console.warn("Could not embed client signature:", e);
      doc.text("(Semnat electronic de client)", margin + 5, y + 22);
    }
  } else {
    doc.text("(Semnătură olografă)", margin + 5, y + 25);
  }

  // Semnătură Service
  const signRightX = margin + signBoxWidth + 10;
  doc.roundedRect(signRightX, y, signBoxWidth, 34, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("AM PRELUAT AUTOVEHICULUL (SERVICE):", signRightX + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Reprezentant: ${atelierNume}`, signRightX + 3, y + 10);
  doc.text("Ștampilă & Semnătură recepționer:", signRightX + 3, y + 16);
  doc.text("✓ Verificat și conform la primire", signRightX + 3, y + 25);

  // Footer cu număr pagină și dată generare
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generat automat din sistemul Service Auto · ${new Date().toLocaleString("ro-RO")} · Pagina 1 / 1`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  const pdfBytes = doc.output("arraybuffer");
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const dataUrl = URL.createObjectURL(blob);
  const fileName = `PV_Receptie_${nrInmat.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;

  return {
    doc,
    pdfBytes,
    blob,
    dataUrl,
    fileName,
  };
}
