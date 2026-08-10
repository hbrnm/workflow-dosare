async function createPdf(options = {}) {
  const { jsPDF } = await import("jspdf");
  return new jsPDF(options);
}

import { getStatusDefinition } from "../constants/config";
import { fmtDateTime, fmtDate } from "./dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "./claimUtils";
import { resolveCerereDespagubireParties } from "./cerereDespagubire";

function stripDiacritics(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâî]/g, (c) => ({ 'ă': 'a', 'â': 'a', 'î': 'i' }[c] || c))
    .replace(/[ĂÂÎ]/g, (c) => ({ 'Ă': 'A', 'Â': 'A', 'Î': 'I' }[c] || c))
    .replace(/[șş]/g, 's').replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't').replace(/[ȚȚ]/g, 'T');
}

const sd = (t) => stripDiacritics(t || "—");

export async function generateazaPDF(claim, istoric = [], branding = null) {
  const doc = await createPdf();
  const s = getStatusDefinition(claim.status);
  const atelier = branding?.atelierNume || "Dosare Daună";
  let y = 20;

  doc.setFontSize(16);
  doc.text(sd(atelier), 14, y); y += 8;
  doc.setFontSize(13);
  doc.text(sd("Proces-verbal / Fișă dosar"), 14, y); y += 10;
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Generat la ${fmtDateTime(new Date())}`, 14, y); y += 10;
  doc.setTextColor(0); doc.setFontSize(11);

  const linie = (label, val) => {
    doc.setFont(undefined, "bold");
    doc.text(`${sd(label)}:`, 14, y);
    doc.setFont(undefined, "normal");
    doc.text(sd(val), 70, y);
    y += 7;
  };

  linie("Nr. dosar", claim.numarDosar);
  linie("Tip asigurare", claim.tipAsigurare);
  linie("Asigurător", claim.asigurator);
  linie("Status", `${s.num}. ${sd(s.label)}`);
  y += 3;
  linie("Client", claim.client);
  linie("Telefon", claim.telefonClient);
  linie("Nr. înmatriculare", claim.numarInmatriculare);
  linie("VIN", claim.vin);
  linie("Marcă/Model", claim.marcaModel);
  y += 3;
  doc.setFont(undefined, "bold"); doc.text(sd("Ce este de reparat:"), 14, y); y += 6;
  doc.setFont(undefined, "normal");
  const descText = sd(claim.ceEsteDeReparat || "—");
  const desc = doc.splitTextToSize(descText, 180);
  doc.text(desc, 14, y); y += desc.length * 6 + 4;
  linie("Mașină la schimb", claim.masinaSchimb);
  linie("Zile chirie Audatex", claim.zileChirieAudatex);
  y += 3;
  linie("Valoare piese Audatex", `${claim.valoarePieseAudatex || 0} lei`);
  linie("Valoare achiziție piese", `${claim.valoareAchizitiePiese || 0} lei`);
  linie("Manoperă tinichigerie", `${(claim.manopera && claim.manopera.tinichigerie && claim.manopera.tinichigerie.facturat) || 0} lei`);
  linie("Manoperă vopsitorie", `${(claim.manopera && claim.manopera.vopsitorie && claim.manopera.vopsitorie.facturat) || 0} lei`);
  y += 6;
  doc.setDrawColor(180); doc.line(14, y, 90, y + 25); doc.line(120, y, 196, y + 25);
  doc.setFontSize(9); doc.text(sd("Semnătură client"), 14, y + 30); doc.text(sd("Semnătură service"), 120, y + 30);

  y += 44;
  if ((istoric || []).length > 0) {
    const ensureSpace = (needed = 20) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    ensureSpace(12);
    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.text(sd("Istoric modificări"), 14, y); y += 8;
    doc.setFont(undefined, "normal"); doc.setFontSize(10);
    for (const h of istoric) {
      ensureSpace(18);
      const when = fmtDateTime(h.created_at);
      doc.setFontSize(9); doc.setTextColor(110);
      doc.text(`${when} · ${sd(h.user_email || "necunoscut")}`, 14, y); y += 6;
      doc.setTextColor(0); doc.setFontSize(10);
      const mods = h.modificari || {};
      for (const [camp, diff] of Object.entries(mods)) {
        ensureSpace(10);
        const label = sd(CAMP_LABELS[camp] || camp);
        let oldVal = camp === "data_schimbare_status" ? fmtDateTime(diff.old) : formatIstoricValoare(camp, diff.old);
        let newVal = camp === "data_schimbare_status" ? fmtDateTime(diff.new) : formatIstoricValoare(camp, diff.new);
        const line = `${label}: ${sd(String(oldVal))} → ${sd(String(newVal))}`;
        const parts = doc.splitTextToSize(line, 180);
        doc.text(parts, 14, y);
        y += parts.length * 6;
      }
      y += 4;
    }
    doc.setTextColor(0);
  }

  doc.save(`dosar-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

export async function generateazaProcesVerbalMasinaSchimb(claim) {
  const doc = await createPdf();
  let y = 20;

  // Header Title
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text(sd("PROCES-VERBAL DE PREDARE / PRIMIRE AUTOVEHICUL LA SCHIMB"), 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Anexă la Dosarul de Daună Nr. ${sd(claim.numarDosar || "—")} · Data: ${fmtDate(new Date())}`, 14, y);
  y += 12;
  doc.setTextColor(0);

  // Subtitle / Intro
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("1. PĂRȚILE CONTRACTANTE"), 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  const p1 = `PREDĂTOR (Service): Unitatea reparatoare autorizată / Furnizor de mobilitate.`;
  const p2 = `PRIMITOR (Beneficiar): ${sd(claim.client || "—")}, tel: ${sd(claim.telefonClient || "—")}, proprietar / utilizator al autovehiculului avariat ${sd(claim.marcaModel || "")} (nr. înmatriculare: ${sd(claim.numarInmatriculare || "—")}, VIN: ${sd(claim.vin || "—")}).`;

  doc.text(doc.splitTextToSize(sd(p1), 180), 14, y); y += 8;
  doc.text(doc.splitTextToSize(sd(p2), 180), 14, y); y += 12;

  // Replacement Car Details Box
  doc.setFont(undefined, "bold");
  doc.text(sd("2. DATE AUTOVEHICUL OFERIT LA SCHIMB"), 14, y);
  y += 6;

  doc.setFillColor(248, 246, 240);
  doc.rect(14, y, 182, 34, "F");
  doc.setDrawColor(218, 212, 198);
  doc.rect(14, y, 182, 34, "S");

  let boxY = y + 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("Nr. Înmatriculare Auto la Schimb:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(sd(claim.masinaSchimb || "Nespecificat"), 85, boxY);
  boxY += 8;

  doc.setFont(undefined, "bold");
  doc.text(sd("Data Predării / Dării la Schimb:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(fmtDate(claim.dataDariiLaSchimb || claim.dataProgramare || new Date()), 85, boxY);
  boxY += 8;

  doc.setFont(undefined, "bold");
  doc.text(sd("Perioadă / Zile aprobate Audatex:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(`${claim.zileChirieAudatex || 0} zile calendaristice`, 85, boxY);

  y += 42;

  // Terms & Conditions Clause
  doc.setFont(undefined, "bold");
  doc.text(sd("3. CLAUZE ȘI CONDIȚII DE UTILIZARE"), 14, y);
  y += 6;
  doc.setFont(undefined, "normal");
  doc.setFontSize(9.5);

  const clauze = [
    "1. Primitorul declară că a preluat autovehiculul la schimb în stare perfectă de funcționare și fără avarii estetice neconsemnate.",
    "2. Primitorul se obligă să utilizeze autovehiculul cu diligență, să respecte legislația rutieră și să nu înstrăineze ori subînchirieze mașina.",
    "3. Beneficiarul se obligă să restituie autovehiculul imediat după finalizarea lucrărilor de reparație la mașina avariată sau la expirarea perioadei aprobate.",
    "4. Orice daună, sancțiune contravențională (amendă rovinietă, parcare, viteză) survine în perioada utilizării cade în sarcina exclusivă a Primitorului.",
  ];

  for (const c of clauze) {
    const lines = doc.splitTextToSize(sd(c), 180);
    doc.text(lines, 14, y);
    y += lines.length * 5.5 + 2;
  }

  y += 10;

  // Signatures Area
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("PREDĂTOR (Service)"), 25, y);
  doc.text(sd("PRIMITOR (Client)"), 135, y);
  y += 5;

  doc.setDrawColor(180);
  doc.rect(14, y, 75, 25);
  doc.rect(120, y, 75, 25);
  y += 30;

  doc.setFontSize(8.5);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120);
  doc.text(sd("Nume/Semnătură & Ștampilă"), 25, y);
  doc.text(sd("Nume & Semnătură Beneficiar"), 135, y);

  doc.save(`proces-verbal-auto-schimb-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

export async function generateazaFisaIntrareService(claim) {
  const doc = await createPdf();
  let y = 20;

  // Header Title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(sd("FIȘĂ INTRARE SERVICE & ORDIN DE LUCRU"), 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Document intern de recepție atelier · Data: ${fmtDate(new Date())}`, 14, y);
  y += 12;
  doc.setTextColor(0);

  // General Claim Data Box
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("1. IDENTIFICARE DOSAR & CLIENT"), 14, y);
  y += 6;

  doc.setFillColor(248, 246, 240);
  doc.rect(14, y, 182, 38, "F");
  doc.setDrawColor(218, 212, 198);
  doc.rect(14, y, 182, 38, "S");

  let lineY = y + 7;
  const col1 = 18, col2 = 105;

  doc.setFont(undefined, "bold"); doc.text(sd("Nr. Dosar Daună:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.numarDosar || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Tip / Asigurător:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(`${sd(claim.tipAsigurare)} · ${sd(claim.asigurator || "—")}`, col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Client / Proprietar:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.client || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Telefon Client:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.telefonClient || "—"), col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Nr. Înmatriculare:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.numarInmatriculare || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Marcă / Model:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.marcaModel || "—"), col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Serie Șasiu (VIN):"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.vin || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Mașină adusă fizic:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(claim.adusaFizic ? "DA (în curte)" : "NU încă", col2 + 35, lineY);

  y += 46;

  // Work Description Section
  doc.setFont(undefined, "bold");
  doc.text(sd("2. CONSTATĂRI INIȚIALE & CE ESTE DE REPARAT"), 14, y);
  y += 6;

  doc.setFont(undefined, "normal");
  doc.setFontSize(9.5);
  const ceReparat = claim.ceEsteDeReparat || "Nu s-au detaliat încă elementele de reparat.";
  const linesRep = doc.splitTextToSize(sd(ceReparat), 180);

  doc.rect(14, y, 182, Math.max(22, linesRep.length * 6 + 6));
  doc.text(linesRep, 18, y + 7);
  y += Math.max(22, linesRep.length * 6 + 6) + 8;

  // Estimation & Labor Table
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("3. DEVIZ INIȚIAL / VALORI ÎNREGISTRATE"), 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFillColor(35, 40, 46);
  doc.setTextColor(255);
  doc.rect(14, y, 182, 7, "F");
  doc.text(sd("CATEGORIE REPARAȚIE"), 18, y + 5);
  doc.text(sd("VALOARE ESTIMATĂ / ALOCATĂ"), 100, y + 5);
  doc.text(sd("VALOARE FACTURATĂ"), 150, y + 5);
  y += 7;

  doc.setTextColor(0);
  const row = (cat, valAlocat, valFact) => {
    doc.rect(14, y, 182, 7);
    doc.text(sd(cat), 18, y + 5);
    doc.text(`${valAlocat || 0} lei`, 100, y + 5);
    doc.text(`${valFact || 0} lei`, 150, y + 5);
    y += 7;
  };

  row("Tinichigerie", claim.manopera?.tinichigerie?.alocat, claim.manopera?.tinichigerie?.facturat);
  row("Vopsitorie", claim.manopera?.vopsitorie?.alocat, claim.manopera?.vopsitorie?.facturat);
  row("Piese de schimb (Audatex vs Achiziție)", claim.valoarePieseAudatex, claim.valoareAchizitiePiese);

  y += 12;

  // Signatures Area
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("RECEPȚIE ATELIER / RECEPTIONER"), 25, y);
  doc.text(sd("PROPRIETAR / DELEGAT AUTO"), 135, y);
  y += 5;

  doc.setDrawColor(180);
  doc.rect(14, y, 75, 25);
  doc.rect(120, y, 75, 25);
  y += 30;

  doc.setFontSize(8.5);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120);
  doc.text(sd("Semnătură & Ștampilă Service"), 25, y);
  doc.text(sd("Semnătură Predare Auto în Service"), 135, y);

  doc.save(`fisa-intrare-service-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

/**
 * Cerere despăgubire Omniasig — exact pe PDF-ul oficial tipizat
 * (`public/forms/Cerere-Despagubire-Omniasig.pdf`), cu valori completate
 * pe baseline-urile măsurate ale liniilor goale (underscore/puncte șterse
 * înainte, ca să nu se suprapună pe text).
 *
 * @param {object} claim
 * @param {{ atelierNume?: string, plata?: { beneficiar?: string, banca?: string, cont?: string } } | null} [options]
 */
export async function generateazaCerereDespagubireOmniasig(claim, options = null) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const parties = resolveCerereDespagubireParties(claim);
  const plata = options?.plata || {};
  const beneficiar = String(
    plata.beneficiar || options?.atelierNume || "SC AUTO WASH IMPEX SRL"
  ).trim();
  const banca = String(plata.banca || "PRO CREDIT BANK").trim();
  const cont = String(plata.cont || "RO56 MIRO 0000 1184 0304 0301").trim();

  const base = import.meta.env.BASE_URL || "/";
  const templateUrl = `${base}forms/Cerere-Despagubire-Omniasig.pdf`;
  const res = await fetch(templateUrl);
  if (!res.ok) {
    throw new Error(`Nu pot încărca formularul Omniasig (${res.status}).`);
  }
  const pdfDoc = await PDFDocument.load(await res.arrayBuffer());
  pdfDoc.registerFontkit(fontkit);

  // Liberation Serif ≈ Times New Roman — se aliniază pe tipizatul serif.
  let fontBold;
  try {
    const fontRes = await fetch(`${base}fonts/LiberationSerif-Bold.ttf`);
    if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
    fontBold = await pdfDoc.embedFont(await fontRes.arrayBuffer(), { subset: true });
  } catch {
    fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  }

  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();
  const ink = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);

  /**
   * Coordonate măsurate pe PDF-ul oficial (origine sus-stânga, y în jos).
   * baseline = origin.y din tipizat; wipe = bbox-ul underscore/punctelor.
   */
  const wipeBox = (x0, y0, x1, y1, padX = 0.25, padY = 0.25) => {
    const top = y0 - padY;
    const bottom = y1 + padY;
    page.drawRectangle({
      x: x0 - padX,
      y: height - bottom,
      width: x1 - x0 + padX * 2,
      height: bottom - top,
      color: white,
      borderWidth: 0,
    });
  };

  const fill = (text, x, baselineTop, opts = {}) => {
    const raw = sd(text);
    if (!raw || raw === "—") return;
    const size = opts.size || 9.5;
    const maxW = opts.maxW || 0;
    let content = raw;
    if (maxW > 0) {
      while (content.length > 3 && fontBold.widthOfTextAtSize(content, size) > maxW) {
        content = content.slice(0, -1);
      }
      if (content !== raw) content = `${content.slice(0, -1)}.`;
    }
    if (opts.wipe) {
      const [x0, y0, x1, y1] = opts.wipe;
      wipeBox(x0, y0, x1, y1, opts.padX, opts.padY);
    }
    page.drawText(content, {
      x,
      y: height - baselineTop,
      size,
      font: fontBold,
      color: ink,
    });
  };

  // Nr. dosar — pe puncte după „dosarul nr:” (baseline tipizat 70.32)
  fill(claim.numarDosar || "", 218.0, 70.32, {
    size: 10,
    maxW: 138,
    wipe: [216.7, 61.5, 360.0, 72.4],
  });

  // Subsemnatul(a) ________ (underscore 120.07–279.75, baseline 105.74)
  fill(parties.subsemnatul || "", 122.5, 105.74, {
    size: 9.5,
    maxW: 152,
    wipe: [120.1, 96.4, 279.5, 107.9],
  });

  // reprezentant al societății ________ (underscore 393.07–563.69)
  fill(parties.reprezentantSocietate || "", 395.5, 105.74, {
    size: 9,
    maxW: 162,
    wipe: [393.1, 96.4, 563.5, 107.9],
  });

  // tel. ________ (underscore 508.30–564.12, baseline 129.5)
  fill(claim.telefonClient || "", 511.0, 129.5, {
    size: 9,
    maxW: 50,
    wipe: [508.3, 120.2, 564.0, 131.6],
  });

  // nr. auto ________ (underscore 212.25–286.40, baseline 153.26)
  fill(claim.numarInmatriculare || "", 214.0, 153.26, {
    size: 10,
    maxW: 68,
    wipe: [212.3, 143.9, 286.2, 155.4],
  });

  // Suplimentar, mai anexez — pe liniile punctate (baseline 280.49 / 292.01)
  fill("FACTURA FISCALA NUMARUL _____", 36.0, 280.49, {
    size: 9.5,
    wipe: [36.0, 271.7, 568.0, 282.5],
  });
  fill("DEVIZ AUDATEX _____", 36.0, 292.01, {
    size: 9.5,
    wipe: [36.0, 283.2, 558.5, 294.1],
  });

  // Tabel plată — beneficiar + bancă pe rândul 0, IBAN pe rândul 1
  // Col BENEFICIAR 31.3–197.3 | BANCA 198.8–471.9 | SUMA 473.4–571.0
  // Fără wipe pe tabel (tăia liniile). Redesenez segmentele grilei ca în tipizat.
  const payPadX = 5.7;
  const beneficiarX = 31.3 + payPadX;
  const bancaX = 198.8 + payPadX;
  fill(beneficiar, beneficiarX, 343.2, {
    size: 8.5,
    maxW: 154,
  });
  fill(banca, bancaX, 343.2, {
    size: 8.5,
    maxW: 255,
  });
  fill(cont, bancaX, 354.8, {
    size: 8.5,
    maxW: 255,
  });

  // Segmente orizontale pe coloane (ca în PDF-ul oficial — nu continue prin dublura verticală)
  const hSegs = [
    [31.32, 197.33],
    [198.77, 471.94],
    [473.38, 570.96],
  ];
  const hRows = [333.77, 334.25, 345.77, 357.77, 369.77, 381.89, 382.85];
  for (const yTop of hRows) {
    for (const [x0, x1] of hSegs) {
      page.drawLine({
        start: { x: x0, y: height - yTop },
        end: { x: x1, y: height - yTop },
        thickness: 0.48,
        color: ink,
      });
    }
  }
  // Verticale duble pe zona de date
  const vPairs = [
    [29.88, 30.36],
    [30.84, 31.32],
    [197.33, 197.81],
    [198.29, 198.77],
    [471.94, 472.42],
    [472.9, 473.38],
    [570.96, 571.44],
    [571.92, 572.4],
  ];
  for (const [x0] of vPairs) {
    page.drawLine({
      start: { x: x0, y: height - 321.41 },
      end: { x: x0, y: height - 383.33 },
      thickness: 0.48,
      color: ink,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cerere-despagubire-omniasig-${token}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function generateazaCerereDespagubireAsirom(claim) {
  const doc = await createPdf();
  const parties = resolveCerereDespagubireParties(claim);
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  const write = (text, x, yy, opts = {}) => {
    doc.text(sd(text), x, yy, opts);
  };

  const tip = String(claim.tipAsigurare || "").toUpperCase();
  const isRca = tip.includes("RCA");
  const isCasco = tip.includes("CASCO");
  const mark = (on) => (on ? "[X]" : "[ ]");

  doc.setFontSize(8);
  doc.setTextColor(80);
  write("ASIROM Vienna Insurance Group", 14, y);
  y += 4;
  write("www.asirom.ro · Call Center 021 9146", 14, y);
  y += 8;
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  write("CERERE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  write("de plata a drepturilor din asigurare la asigurarile generale", pageW / 2, y, { align: "center" });
  y += 9;

  // Tabel antet
  doc.setFont(undefined, "normal");
  doc.setFontSize(8.5);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 22, "F");
  doc.setDrawColor(180);
  doc.rect(14, y, 182, 22, "S");

  let rowY = y + 5;
  doc.setFont(undefined, "bold");
  write("Nr. dosar:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(claim.numarDosar || "……………", 36, rowY);

  doc.setFont(undefined, "bold");
  write("Polita tip:", 90, rowY);
  doc.setFont(undefined, "normal");
  write(`${mark(isRca)} RCA   ${mark(isCasco)} Casco   ${mark(!isRca && !isCasco)} Non Auto`, 110, rowY);
  rowY += 6;

  const bun = [claim.numarInmatriculare, claim.marcaModel].filter(Boolean).join(" · ") || "……………………";
  doc.setFont(undefined, "bold");
  write("Bunul avariat:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(bun, 42, rowY);
  rowY += 6;

  doc.setFont(undefined, "bold");
  write("Asigurat/Pagubit:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(parties.proprietar || "……………………", 48, rowY);
  doc.setFont(undefined, "bold");
  write("Data eveniment:", 120, rowY);
  doc.setFont(undefined, "normal");
  write("____________", 152, rowY);

  y += 26;

  const calitate = parties.asCompanyOwner || parties.hasSeparateDelegat
    ? "Reprezentant al beneficiarului"
    : "Asigurat/Pagubit";
  const sub = parties.subsemnatul || "…………………………………………";
  const firmNote = parties.reprezentantSocietate
    ? ` (reprezentant al societatii ${parties.reprezentantSocietate})`
    : "";

  doc.setFontSize(9);
  const intro = `Subsemnatul(a) ${sub}${firmNote}, CNP ____________________, domiciliat in localitatea ____________________, adresa completa ______________________________________________, nr. telefon ${claim.telefonClient || "______________"}, email ____________________, cu actul de identitate seria ____, nr. ____________, in calitate de ${calitate}, solicit plata despagubirii in valoare de ____________________ (lei):`;
  const introLines = doc.splitTextToSize(sd(intro), 182);
  doc.text(introLines, 14, y);
  y += introLines.length * 4.2 + 4;

  doc.rect(14, y - 2.2, 3, 3);
  write("conform evaluare ASIROM (fara documente justificative);", 20, y);
  y += 5.5;
  doc.rect(14, y - 2.2, 3, 3);
  write("conform documente justificative anexate, astfel:", 20, y);
  y += 5.5;
  write("In original: .......................................................................................................................", 14, y);
  y += 5;
  write("In fotocopie: .....................................................................................................................", 14, y);
  y += 8;

  doc.setFont(undefined, "bold");
  write("Despagubirea cuvenita sunt de acord sa fie platita:", 14, y);
  y += 6;
  doc.setFont(undefined, "normal");
  doc.setFontSize(8.5);
  write("[ ] prin casieriile BCR, suma _____________ lei, beneficiar _________________________________", 14, y);
  y += 5;
  write("[ ] prin cont bancar, suma _____________ lei, IBAN _________________________________________", 14, y);
  y += 5;
  write("    banca _______________________________, titular _________________________________________", 14, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  write("Declar, pe propria raspundere, urmatoarele:", 14, y);
  y += 4.5;
  doc.setFont(undefined, "normal");
  const decls = [
    "Am avizat acest eveniment si la Asiguratorul: .............................., iar suma stabilita de acesta este ……….. / Nu am avizat si nu urmeaza sa mai avizez acest eveniment la alta societate de asigurare.",
    "Nu mai posed aceeasi forma de asigurare pentru bunul respectiv incheiata si la alta societate de asigurare.",
    "Ma oblig sa restitui de indata, partial sau total, societatii de asigurare suma de bani primita cu titlu de despagubire, in functie de o eventuala hotarare a instantei ori in cazul anularii actelor organelor competente.",
    "Declar ca, prin primirea sumei de mai sus sunt integral despagubit(a) de catre ASIROM pentru dauna mentionata anterior si nu voi mai avea nicio pretentie fata de ASIROM, asiguratorul de raspundere civila si persoana vinovata de producerea evenimentului.",
  ];
  for (const d of decls) {
    const lines = doc.splitTextToSize(sd(d), 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.5 + 1.2;
  }
  y += 3;

  doc.setFontSize(9);
  write("Doresc sa primesc informare dupa realizarea platii pe email: _______________________________", 14, y);
  y += 5;
  write("Observatii: ...........................................................................................................................", 14, y);
  y += 5;
  write("Localitate: _______________________________", 14, y);
  y += 10;

  doc.setFont(undefined, "bold");
  write("Asigurat / Pagubit / Reprezentant al beneficiarului", 14, y);
  write("Data completarii: __________", 130, y);
  y += 5;
  doc.setFont(undefined, "normal");
  write(`(nume/prenume in clar): ${sd(sub)}`, 14, y);
  y += 8;
  write("Semnatura (stampila daca este cazul): _______________________________", 14, y);

  // Pagina 2 — consimțământ GDPR (compact)
  doc.addPage();
  y = 16;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  write("DECLARATIE SI CONSIMTAMANT PRIVIND PRELUCRAREA DATELOR CU CARACTER PERSONAL", pageW / 2, y, {
    align: "center",
  });
  y += 10;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const gdprIntro = `Subsemnatul(a) ${sub}, domiciliat(a) in ____________________ si cu CNP _______________, declar ca am citit si am inteles continutul Notei de informare cu privire la prelucrarea de catre ASIROM a datelor cu caracter personal (disponibila pe site-ul ASIROM) si ca imi exprim consimtamantul pentru urmatoarele:`;
  const gdprLines = doc.splitTextToSize(sd(gdprIntro), 182);
  doc.text(gdprLines, 14, y);
  y += gdprLines.length * 4.2 + 6;

  doc.setFontSize(8.5);
  write("[ ] Sunt de acord   [ ] Nu sunt de acord — utilizarea datelor mele pentru oferte / promotii ASIROM.", 14, y);
  y += 8;

  const gdprBody = [
    "Pentru derularea contractului de asigurare ASIROM are acordul meu expres sa contacteze medici / institutii medicale si sa obtina date privind starea mea de sanatate, in masura in care sunt necesare pentru solutionarea dosarului de dauna.",
    "Sunt de acord ca aceste date sa fie transmise catre ASIROM si reasiguratori / spitale / medici doar in scopul determinarii cuantumului despagubirii.",
    "Fara acces la datele necesare, ASIROM poate fi in imposibilitatea obiectiva de a solutiona pretentiile de despagubire.",
  ];
  for (const g of gdprBody) {
    const lines = doc.splitTextToSize(sd(g), 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.6 + 2;
  }
  y += 6;
  write("[ ] Sunt de acord   [ ] Nu sunt de acord — prelucrare date privind sanatatea pentru dosarul de dauna.", 14, y);
  y += 14;

  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  write("Asigurat / Pagubit / Reprezentant al beneficiarului", 14, y);
  write("Data: __________", 130, y);
  y += 6;
  doc.setFont(undefined, "normal");
  write(`(nume/prenume, semnatura): ${sd(sub)} _______________________________`, 14, y);

  const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
  doc.save(`cerere-despagubire-asirom-${token}.pdf`);
}
