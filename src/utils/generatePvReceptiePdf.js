import jsPDF from "jspdf";
import { fmtDate, todayISO } from "./dateUtils";

/**
 * Curăță diacriticele pentru fonturile standard jsPDF (evită spațiile goale și caracterele lipsă)
 */
function stripDiacritics(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/[î]/g, "i")
    .replace(/[Î]/g, "I")
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}

const sd = (val, fallback = "—") => stripDiacritics(String(val || "").trim() || fallback);

/**
 * Generează un Proces-Verbal de Predare-Primire Autovehicul oficial în format PDF (A4)
 * Aranjat curat, cu margini aliniate și fără caractere corupte.
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

  const atelierNume = sd(atelierBranding?.nume || atelierBranding?.atelierNume, "SERVICE AUTO EXPERT");
  const atelierCui = sd(atelierBranding?.cui, "RO12345678");
  const atelierAdresa = sd(atelierBranding?.adresa, "Bucuresti, Romania");
  const atelierTel = sd(atelierBranding?.telefon, "0700 000 000");

  const nrInmat = sd(claim?.numarInmatriculare, "FARA NR.").toUpperCase();
  const vin = sd(claim?.vin, "—").toUpperCase();
  const marcaModel = sd(claim?.marcaModel || `${claim?.marca || ""} ${claim?.model || ""}`, "—");
  const clientNume = sd(claim?.client, "Client Nespecificat");
  const clientTel = sd(claim?.telefonClient, "—");
  const nrDosar = sd(claim?.numarDosar || claim?.nrDosarAsigurator, "—");
  const asigurator = sd(claim?.asigurator, "Regie Proprie");
  const tipAsigurare = sd(claim?.tipAsigurare, "CASCO");

  const kmIntrare = sd(receptieData?.kilometraj || claim?.kilometraj, "—");
  const combustibil = sd(receptieData?.combustibil, "2/4 (50%)");
  const obiecte = Array.isArray(receptieData?.obiecte) && receptieData.obiecte.length > 0
    ? receptieData.obiecte.map((o) => stripDiacritics(o)).join(", ")
    : "Nu au fost declarate obiecte de valoare in autovehicul";

  const elementeAvariate = Array.isArray(receptieData?.elementeAvariate) && receptieData.elementeAvariate.length > 0
    ? receptieData.elementeAvariate.map((e) => stripDiacritics(e)).join(", ")
    : "Nu au fost identificate elemente de caroserie avariate pe schema";

  const observatii = sd(receptieData?.observatii, "Autovehicul preluat in vederea efectuarii reparatiilor.");
  const pozeCount = receptieData?.pozeCount || (Array.isArray(receptieData?.poze) ? receptieData.poze.length : 0);
  const pozeMention = pozeCount > 0
    ? `${pozeCount} fotografii de receptie efectuate si atasate la dosar`
    : "Fara fotografii de receptie";

  const dataReceptie = fmtDate(receptieData?.data || todayISO());

  // 1. Antet Service
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(atelierNume, margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`C.U.I.: ${atelierCui} | Adresa: ${atelierAdresa} | Tel: ${atelierTel}`, margin, y + 9);

  // Linia de separare antet
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Titlu Document
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("PROCES-VERBAL DE PREDARE - PRIMIRE AUTOVEHICUL", pageWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Nr. inreg. intern: PV-${nrInmat.replace(/\s+/g, "")}-${new Date().getFullYear()} · Data: ${dataReceptie}`, pageWidth / 2, y, { align: "center" });

  // 3. Casete Date: Vehicul (Stânga) & Client / Asigurare (Dreapta)
  y += 8;
  const colWidth = (pageWidth - margin * 2 - 6) / 2;
  const boxHeight = 42;

  // --- Caseta Stânga: Date Vehicul ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("DATE AUTOVEHICUL", margin + 4, y + 6);

  doc.setFontSize(8.5);
  const rowLeftY = [y + 13, y + 19, y + 25, y + 31, y + 37];

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Nr. Inmatriculare:", margin + 4, rowLeftY[0]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(nrInmat, margin + 34, rowLeftY[0]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Serie Sasiu (VIN):", margin + 4, rowLeftY[1]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(vin, margin + 34, rowLeftY[1]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Marca / Model:", margin + 4, rowLeftY[2]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(marcaModel.slice(0, 24), margin + 34, rowLeftY[2]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Kilometraj Intrare:", margin + 4, rowLeftY[3]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${kmIntrare} km`, margin + 34, rowLeftY[3]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Nivel Combustibil:", margin + 4, rowLeftY[4]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(combustibil, margin + 34, rowLeftY[4]);

  // --- Caseta Dreapta: Date Client & Asigurare ---
  const rightX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, y, colWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("DATE CLIENT & ASIGURARE", rightX + 4, y + 6);

  doc.setFontSize(8.5);
  const rowRightY = [y + 13, y + 19, y + 25, y + 31, y + 37];

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Proprietar / Client:", rightX + 4, rowRightY[0]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(clientNume.slice(0, 24), rightX + 36, rowRightY[0]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Telefon Contact:", rightX + 4, rowRightY[1]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(clientTel, rightX + 36, rowRightY[1]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Dosar Dauna / Nr.:", rightX + 4, rowRightY[2]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(nrDosar, rightX + 36, rowRightY[2]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Asigurator:", rightX + 4, rowRightY[3]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(asigurator, rightX + 36, rowRightY[3]);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Tip Asigurare:", rightX + 4, rowRightY[4]);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(tipAsigurare, rightX + 36, rowRightY[4]);

  // 4. Caseta Mare: Constatări la Recepție & Elemente Avariate
  y += boxHeight + 5;
  const constBoxHeight = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, constBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("CONSTATARI LA RECEPTIE & ELEMENTE AVARIATE", margin + 4, y + 6);

  doc.setFontSize(8.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Elemente caroserie marcate pe schema:", margin + 4, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const elementeLines = doc.splitTextToSize(elementeAvariate, pageWidth - margin * 2 - 10);
  doc.text(elementeLines.slice(0, 2), margin + 4, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Documente & Obiecte preluate in custodie:", margin + 4, y + 26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const obiecteLines = doc.splitTextToSize(obiecte, pageWidth - margin * 2 - 10);
  doc.text(obiecteLines.slice(0, 2), margin + 4, y + 31);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Fotografii intrare & Observatii:", margin + 4, y + 37);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${pozeMention} · ${observatii.slice(0, 70)}`, margin + 4, y + 41);

  // 5. Caseta Termeni & Condiții de Custodie (Legal & GDPR)
  y += constBoxHeight + 5;
  const termeniHeight = 30;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, termeniHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("TERMENI, CONDITII DE CUSTODIE SI ACORD PROBA DE DRUM", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  const clauze = [
    "1. Clientul autorizeaza atelierul service sa efectueze probe de drum necesare diagnosticarii si verificarii calitatii reparatiilor.",
    "2. Atelierul raspunde de integritatea autovehiculului pe durata stationarii in unitate, in limita starii consemnate la primire.",
    "3. Clientul confirma ca nu a lasat in autovehicul sume de bani sau alte bunuri de valoare nedeclarate expres in prezentul proces-verbal.",
    "4. Datele cu caracter personal sunt prelucrate conform Regulamentului UE 2016/679 (GDPR) in scopul reparatiei si decontului cu asiguratorul.",
  ];
  let clauzeY = y + 9.5;
  clauze.forEach((cl) => {
    doc.text(cl, margin + 4, clauzeY);
    clauzeY += 4.5;
  });

  // 6. Zona Semnături
  y += termeniHeight + 5;
  const signBoxWidth = (pageWidth - margin * 2 - 10) / 2;
  const signBoxHeight = 36;

  // Semnătură Client (Stânga)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, signBoxWidth, signBoxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("AM PREDAT AUTOVEHICULUL (CLIENT):", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nume: ${clientNume}`, margin + 4, y + 11);

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, "PNG", margin + 6, y + 13, signBoxWidth - 12, 19);
    } catch (e) {
      console.warn("Could not embed client signature:", e);
      doc.text("(Semnat electronic de client)", margin + 6, y + 24);
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("(Semnatura olografa)", margin + 6, y + 25);
  }

  // Semnătură Service (Dreapta)
  const signRightX = margin + signBoxWidth + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(signRightX, y, signBoxWidth, signBoxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("AM PRELUAT AUTOVEHICULUL (SERVICE):", signRightX + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Reprezentant: ${atelierNume}`, signRightX + 4, y + 11);
  doc.text("Stampila & Semnatura receptioner:", signRightX + 4, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("✓ Verificat si conform la primire", signRightX + 4, y + 28);

  // Footer cu număr pagină și dată generare
  doc.setFont("helvetica", "normal");
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
