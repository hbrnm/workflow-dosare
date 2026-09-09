import jsPDF from "jspdf";
import { fmtDate, todayISO } from "./dateUtils";

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
 * Generează PDF profesional pentru Cerere / Notă de Reconstatare Daune Auto
 * Adresată către Asigurător / Inspectorul de Daună
 */
export async function generateCerereReconstatarePdf({
  claim,
  reconstatareData = {},
  atelierBranding = {},
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const atelierNume = sd(atelierBranding?.nume || atelierBranding?.atelierNume, "SERVICE AUTO");
  const atelierCui = sd(atelierBranding?.cui, "");
  const atelierAdresa = sd(atelierBranding?.adresa, "");
  const atelierTel = sd(atelierBranding?.telefon, "");
  const atelierEmail = sd(atelierBranding?.email, "");

  const nrInmat = sd(claim?.numarInmatriculare, "FARA NR.").toUpperCase();
  const vin = sd(claim?.vin, "—").toUpperCase();
  const marcaModel = sd(claim?.marcaModel || `${claim?.marca || ""} ${claim?.model || ""}`, "—");
  const clientNume = sd(claim?.client, "Client Nespecificat");
  const clientTel = sd(claim?.telefonClient, "—");
  const nrDosarService = sd(claim?.numarDosar, "—");
  const nrDosarAsigurator = sd(claim?.nrDosarAsigurator || claim?.numarDosar, "—");
  const asigurator = sd(claim?.asigurator, "Societate de Asigurare");
  const inspectorDauna = sd(reconstatareData?.inspectorDauna || claim?.inspectorDauna, "Inspector Daune");
  const dataCerere = fmtDate(reconstatareData?.dataCerere || todayISO());

  // Antet Atelier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(24, 32, 47);
  doc.text(atelierNume.toUpperCase(), margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 115);
  const headerMeta = [
    atelierCui ? `CUI: ${atelierCui}` : null,
    atelierAdresa ? `Adresa: ${atelierAdresa}` : null,
    atelierTel ? `Tel: ${atelierTel}` : null,
    atelierEmail ? `Email: ${atelierEmail}` : null,
  ].filter(Boolean).join(" | ");
  if (headerMeta) {
    doc.text(headerMeta, margin, y);
    y += 4;
  }

  // Linie separator antet
  y += 2;
  doc.setDrawColor(210, 220, 230);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Destinatar Box
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(215, 228, 242);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 115);
  doc.text("CATRE:", margin + 4, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.text(`${asigurator.toUpperCase()} — DEPARTAMENTUL DAUNE AUTO`, margin + 20, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 75, 95);
  doc.text(`In atentia Dlui/Dnei: ${inspectorDauna}`, margin + 4, y + 11);
  doc.text(`Nr. Dosar Asigurator: ${nrDosarAsigurator}  |  Nr. Dosar Intern Service: ${nrDosarService}`, margin + 4, y + 16.5);
  y += 27;

  // Titlu Document
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(180, 40, 40);
  doc.text("CERERE & NOTA DE RECONSTATARE DAUNE", pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 110, 125);
  doc.text(`Aviz de reconstatare emis la data de ${dataCerere}`, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Caseta Date Autovehicul
  doc.setDrawColor(220, 226, 235);
  doc.setFillColor(252, 253, 255);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 115, 130);
  doc.text("VEHICUL / CLIENT:", margin + 3, y + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 30, 45);
  doc.text(marcaModel, margin + 3, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 50, 30);
  doc.text(nrInmat, margin + 70, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 85);
  doc.text(`Serie sasiu (VIN): ${vin}`, margin + 3, y + 15);
  doc.text(`Proprietar/Asigurat: ${clientNume} (${clientTel})`, margin + 70, y + 15);
  y += 23;

  // Text Introducere Oficial
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 50, 65);
  const motivatieGenerala = sd(
    reconstatareData?.motivatie ||
    "In urma demontarii reperelor avariate si a operatiunilor de curatare/degresare efectuate in atelier, au fost identificate daune si deformatii ascunse, direct relationate cu dinamica evenimentului asigurat, ce nu au putut fi consemnate in nota initiala de constatare.",
    ""
  );
  const splitMotiv = doc.splitTextToSize(motivatieGenerala, contentWidth);
  doc.text(splitMotiv, margin, y);
  y += splitMotiv.length * 4.2 + 4;

  // Tabel Repere Suplimentare de Reconstatat
  const repere = Array.isArray(reconstatareData?.repere) && reconstatareData.repere.length > 0
    ? reconstatareData.repere
    : [
        {
          piesa: "Elemente caroserie / structura interioara conform anexa foto",
          operatiune: "INL / REP",
          descriere: "Daune ascunse constatate dupa dezechiparea reperelor exterioare.",
        },
      ];

  // Header Tabel
  const colX = {
    nr: margin,
    piesa: margin + 8,
    op: margin + 95,
    desc: margin + 125,
  };
  const tableW = contentWidth;

  doc.setFillColor(35, 45, 60);
  doc.rect(margin, y, tableW, 6.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("NR.", colX.nr + 2, y + 4.5);
  doc.text("REPER / PIESA SOLICITATA", colX.piesa, y + 4.5);
  doc.text("SOLICITARE", colX.op, y + 4.5);
  doc.text("JUSTIFICARE TEHNICA / STARE", colX.desc, y + 4.5);
  y += 6.5;

  // Linii Tabel
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  repere.forEach((item, idx) => {
    const piesaText = sd(item.piesa || item.denumire || "Reper nespecificat");
    const opText = sd(item.operatiune || item.tip || "INL (Inlocuire)");
    const descText = sd(item.descriere || item.stare || "Urme deformare / rupere");

    const splitPiesa = doc.splitTextToSize(piesaText, 84);
    const splitDesc = doc.splitTextToSize(descText, contentWidth - 128);
    const rowHeight = Math.max(splitPiesa.length * 4, splitDesc.length * 4, 6.5) + 3;

    // Background zebra
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 253);
      doc.rect(margin, y, tableW, rowHeight, "F");
    }

    doc.setDrawColor(225, 230, 240);
    doc.rect(margin, y, tableW, rowHeight, "S");

    doc.setTextColor(60, 70, 85);
    doc.text(String(idx + 1), colX.nr + 2.5, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 35, 50);
    doc.text(splitPiesa, colX.piesa, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(170, 40, 40);
    doc.text(opText, colX.op, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 75, 90);
    doc.text(splitDesc, colX.desc, y + 4.5);

    y += rowHeight;

    // Paginare automată de siguranță dacă sunt foarte multe piese
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin + 10;
    }
  });

  y += 5;

  // Box Propunere Data / Mod de Desfășurare
  const modReconstatare = sd(reconstatareData?.mod || "Fizic la sediul atelierului / Electronic pe baza plansei foto");
  const dataOraPropusa = sd(reconstatareData?.dataOra || "La dispozitia inspectorului in intervalul orar 09:00 - 17:00");

  doc.setFillColor(254, 250, 242);
  doc.setDrawColor(240, 220, 185);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(160, 95, 20);
  doc.text("PROPUNERE DESFASURARE RECONSTATARE:", margin + 3, y + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 60, 40);
  doc.text(`Modalitate: ${modReconstatare}`, margin + 3, y + 9.5);
  doc.text(`Data / Interval orar propus: ${dataOraPropusa}`, margin + 3, y + 14);
  y += 24;

  // Mențiune atașament foto
  const pozeCount = Number(reconstatareData?.pozeCount || 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 115, 130);
  doc.text("DOCUMENTE & PLANSA FOTO ATASATE:", margin, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 105);
  doc.text(
    `- Dosarul contine ${pozeCount > 0 ? `${pozeCount} fotografii detaliate` : "fotografii detaliate"} cu piesele demontate, seriile/codurile pieselor si zonele de deformare ascunsa.`,
    margin + 2,
    y
  );
  y += 4;
  doc.text(
    "- Autovehiculul ramane dezechipat in atelier pentru inspectie fizica pana la emiterea notei suplimentare de constatare.",
    margin + 2,
    y
  );
  y += 12;

  // Semnături & Ștampile
  const sigY = Math.max(y, pageHeight - 32);
  const colWidth = (contentWidth - 10) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 40, 55);
  doc.text(`REPREZENTANT SERVICE (${atelierNume}):`, margin, sigY);
  doc.text("CONFIRMARE PRIMIRE ASIGURATOR:", margin + colWidth + 10, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.text("Semnatura / Stampila", margin, sigY + 5);
  doc.text("Nume Inspector / Semnatura / Data", margin + colWidth + 10, sigY + 5);

  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.4);
  doc.line(margin, sigY + 16, margin + colWidth, sigY + 16);
  doc.line(margin + colWidth + 10, sigY + 16, pageWidth - margin, sigY + 16);

  // Footer discret
  doc.setFontSize(7);
  doc.setTextColor(140, 150, 165);
  doc.text(
    `Document generat prin Workflow Daune Auto la ${fmtDate(new Date())}. Valabil fara stampila conform legii.`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  const cleanNr = (claim?.numarDosar || claim?.numarInmatriculare || "reconstatare").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Cerere_Reconstatare_${cleanNr}.pdf`;

  // Salvare & descărcare în browser
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    doc.save(fileName);
  }
  return {
    doc,
    fileName,
  };
}
