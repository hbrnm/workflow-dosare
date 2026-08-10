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
 * Cerere despăgubire Omniasig — tipizat curat (layout tip oficial):
 * header cu adresă + logo Omniasig / Vienna Insurance Group, corp tipizat
 * cu linii punctate, tabel plată și footer actualizat.
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
  const banca = String(plata.banca || "PROCREDIT BANK").trim();
  const cont = String(plata.cont || "RO56 MIRO 0000 1184 0304 0301").trim();

  const base = import.meta.env.BASE_URL || "/";
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const embedSerif = async (file, fallback) => {
    try {
      const fontRes = await fetch(`${base}fonts/${file}`);
      if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
      return pdfDoc.embedFont(await fontRes.arrayBuffer(), { subset: true });
    } catch {
      return pdfDoc.embedFont(fallback);
    }
  };
  const font = await embedSerif("LiberationSerif-Regular.ttf", StandardFonts.TimesRoman);
  const fontBold = await embedSerif("LiberationSerif-Bold.ttf", StandardFonts.TimesRomanBold);

  let logo = null;
  try {
    const logoRes = await fetch(`${base}forms/omniasig-logo.png`);
    if (logoRes.ok) logo = await pdfDoc.embedPng(await logoRes.arrayBuffer());
  } catch {
    logo = null;
  }

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const ink = rgb(0, 0, 0);
  const muted = rgb(0.18, 0.18, 0.18);
  const lineGray = rgb(0.35, 0.35, 0.35);
  const left = 34;
  const right = width - 34;
  const contentW = right - left;

  // Scale tipografic + spațiere: umple pagina până deasupra footerului
  const bodySize = 11.5;
  const optSize = 11;
  const legalSize = 8.8;
  const settleSize = 10.5;
  const titleSize = 17;
  const lineStep = 18;
  const optStep = 17;
  const legalStep = 11.5;
  const annexStep = 16;

  const textW = (t, size, f = font) => f.widthOfTextAtSize(t, size);
  const fit = (raw, size, maxW, f = fontBold) => {
    let content = sd(raw);
    if (!content || content === "—") return "";
    if (maxW <= 0) return content;
    while (content.length > 3 && f.widthOfTextAtSize(content, size) > maxW) {
      content = content.slice(0, -1);
    }
    if (content !== sd(raw)) content = `${content.slice(0, -1)}.`;
    return content;
  };
  const draw = (t, x, y, size, f = font, color = ink) => {
    const content = typeof t === "string" ? t : sd(t);
    if (!content) return;
    page.drawText(content, { x, y, size, font: f, color });
  };
  const dots = (x, y, w) => {
    const step = 3.4;
    for (let px = x; px < x + w - 1; px += step) {
      page.drawCircle({ x: px, y: y + 0.5, size: 0.55, color: lineGray });
    }
  };
  const drawRich = (parts, x, y, size) => {
    let px = x;
    for (const [t, bold] of parts) {
      const f = bold ? fontBold : font;
      draw(sd(t), px, y, size, f);
      px += textW(sd(t), size, f);
    }
    return px;
  };
  const wrapLines = (raw, size, maxW, f = font) => {
    const words = sd(raw).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) <= maxW) {
        cur = next;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const footTop = 78;
  const signBand = 30;
  const contentBottom = footTop + signBand;

  // —— Header: adresă stânga + logo dreapta ——
  draw("Aleea Alexandru nr. 51, Sector 1, 011822, Bucuresti, Romania.", left, height - 40, 8.5, font, muted);

  if (logo) {
    const logoW = 128;
    const logoH = (logo.height / logo.width) * logoW;
    page.drawImage(logo, {
      x: right - logoW,
      y: height - 26 - logoH,
      width: logoW,
      height: logoH,
    });
  } else {
    draw("OMNIASIG", right - 102, height - 46, 15, fontBold, rgb(0, 0.525, 0.255));
    draw("VIENNA INSURANCE GROUP", right - 102, height - 57, 6.5, font, rgb(0.55, 0.05, 0.08));
  }

  // —— Titlu ——
  let y = height - 92;
  const title = "CERERE DESPAGUBIRE";
  draw(title, (width - textW(title, titleSize, fontBold)) / 2, y, titleSize, fontBold);
  const tw = textW(title, titleSize, fontBold);
  page.drawLine({
    start: { x: (width - tw) / 2, y: y - 2.5 },
    end: { x: (width + tw) / 2, y: y - 2.5 },
    thickness: 1,
    color: ink,
  });

  y -= 22;
  const dosarLabel = "cu privire la dosarul nr: ";
  const dosarX = (width - textW(dosarLabel, 11.5, font) - 160) / 2;
  draw(dosarLabel, dosarX, y, 11.5, font);
  const dosarValX = dosarX + textW(dosarLabel, 11.5, font);
  const dosarVal = fit(claim.numarDosar || "", 11.5, 156, fontBold);
  if (dosarVal) draw(dosarVal, dosarValX + 2, y, 11.5, fontBold);
  else dots(dosarValX, y, 160);

  // —— Corp: Subsemnatul + reprezentant pe o singură linie (text puțin mai mic) ——
  y -= 26;
  const partySize = 9.8;
  const subLabel = "Subsemnatul(a)";
  const firmLabel = ", reprezentant al societatii";
  let cx = left;
  draw(subLabel, cx, y, partySize, font);
  cx += textW(subLabel, partySize, font) + 4;

  const firmLabelW = textW(firmLabel, partySize, font) + 4;
  const valuesBudget = Math.max(120, right - cx - firmLabelW);
  // ~45% pentru nume, restul pentru societate
  const subFieldW = Math.min(150, Math.floor(valuesBudget * 0.42));
  const firmFieldW = valuesBudget - subFieldW;

  const subVal = fit(parties.subsemnatul || "", partySize, subFieldW - 3, fontBold);
  if (subVal) draw(subVal, cx, y, partySize, fontBold);
  else dots(cx, y, subFieldW);
  cx += subFieldW;

  draw(firmLabel, cx, y, partySize, font);
  cx += firmLabelW;
  const firmVal = fit(parties.reprezentantSocietate || "", partySize, firmFieldW - 2, fontBold);
  if (firmVal) draw(firmVal, cx, y, partySize, fontBold);
  else dots(cx, y, Math.max(40, right - cx));

  y -= lineStep;
  draw("CUI/CNP", left, y, bodySize, font);
  cx = left + textW("CUI/CNP", bodySize, font) + 5;
  dots(cx, y, 82);
  cx += 86;
  draw(", domiciliat in", cx, y, bodySize, font);
  cx += textW(", domiciliat in", bodySize, font) + 5;
  dots(cx, y, 72);
  cx += 76;
  draw(", str.", cx, y, bodySize, font);
  cx += textW(", str.", bodySize, font) + 5;
  dots(cx, y, 86);
  cx += 90;
  draw(", nr.", cx, y, bodySize, font);
  cx += textW(", nr.", bodySize, font) + 5;
  dots(cx, y, 30);
  cx += 34;
  draw(", ap.", cx, y, bodySize, font);
  cx += textW(", ap.", bodySize, font) + 5;
  dots(cx, y, Math.max(24, right - cx));

  y -= lineStep;
  draw("sector", left, y, bodySize, font);
  cx = left + textW("sector", bodySize, font) + 5;
  dots(cx, y, 40);
  cx += 44;
  draw(", tel.", cx, y, bodySize, font);
  cx += textW(", tel.", bodySize, font) + 5;
  const telVal = fit(claim.telefonClient || "", bodySize, 80, fontBold);
  if (telVal) draw(telVal, cx, y, bodySize, fontBold);
  else dots(cx, y, 80);

  y -= lineStep;
  draw("proprietar al autovehiculului cu numarul", left, y, bodySize, font);
  cx = left + textW("proprietar al autovehiculului cu numarul", bodySize, font) + 5;
  const plateVal = fit(claim.numarInmatriculare || "", bodySize, right - cx - 2, fontBold);
  if (plateVal) draw(plateVal, cx, y, bodySize, fontBold);
  else dots(cx, y, Math.max(60, right - cx));

  y -= lineStep;
  draw("va rog sa aprobati plata despagubirii in suma de", left, y, bodySize, font);
  cx = left + textW("va rog sa aprobati plata despagubirii in suma de", bodySize, font) + 5;
  dots(cx, y, 150);
  draw("lei, dupa cum urmeaza:", cx + 158, y, bodySize, font);

  // —— Opțiuni plată (checkbox) ——
  const checkbox = (x, yy, checked = false) => {
    page.drawRectangle({
      x,
      y: yy - 1.2,
      width: 9.5,
      height: 9.5,
      borderColor: ink,
      borderWidth: 0.85,
    });
    if (checked) {
      page.drawLine({ start: { x: x + 1.8, y: yy + 2.8 }, end: { x: x + 4, y: yy }, thickness: 1.1, color: ink });
      page.drawLine({ start: { x: x + 4, y: yy }, end: { x: x + 7.5, y: yy + 5.5 }, thickness: 1.1, color: ink });
    }
  };

  y -= 22;
  checkbox(left, y);
  drawRich(
    [
      ["pentru reparatie efectuata in ", false],
      ["regie proprie", true],
      [", pe baza evaluarii OMNIASIG;", false],
    ],
    left + 14,
    y,
    optSize
  );

  y -= optStep;
  checkbox(left, y);
  drawRich(
    [
      ["avans", true],
      [" – pe baza documentelor anexate;", false],
    ],
    left + 14,
    y,
    optSize
  );

  y -= optStep;
  checkbox(left, y);
  drawRich(
    [
      ["dupa efectuarea reparatiilor – ", false],
      ["plata finala", true],
      [", pe baza urmatoarelor documente anexate:", false],
    ],
    left + 14,
    y,
    optSize
  );

  // linii documente (după plata finală) + suplimentar
  y -= annexStep;
  draw("FACTURA FISCALA NUMARUL _____", left, y, bodySize, fontBold);
  y -= annexStep;
  draw("DEVIZ AUDATEX _____", left, y, bodySize, fontBold);
  y -= annexStep;
  dots(left, y, contentW);

  y -= 18;
  draw("Suplimentar, mai anexez:", left, y, bodySize, fontBold);
  y -= annexStep;
  dots(left, y, contentW);
  y -= annexStep;
  dots(left, y, contentW);
  y -= annexStep;
  dots(left, y, contentW);

  // —— Tabel plată ——
  y -= 16;
  draw("Plata se va efectua in favoarea:", left, y, bodySize, fontBold);
  y -= 8;

  const tableTop = y;
  const rowH = 18;
  const headerH = 16;
  const rows = 3;
  const colBen = 158;
  const colSuma = 74;
  const colBanca = contentW - colBen - colSuma;
  const tableH = headerH + rows * rowH;

  page.drawRectangle({
    x: left,
    y: tableTop - tableH,
    width: contentW,
    height: tableH,
    borderColor: ink,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: left,
    y: tableTop - headerH,
    width: contentW,
    height: headerH,
    color: rgb(0.93, 0.93, 0.93),
    borderColor: ink,
    borderWidth: 1,
  });
  page.drawLine({
    start: { x: left + colBen, y: tableTop },
    end: { x: left + colBen, y: tableTop - tableH },
    thickness: 0.8,
    color: ink,
  });
  page.drawLine({
    start: { x: left + colBen + colBanca, y: tableTop },
    end: { x: left + colBen + colBanca, y: tableTop - tableH },
    thickness: 0.8,
    color: ink,
  });
  for (let i = 1; i <= rows; i += 1) {
    const ly = tableTop - headerH - i * rowH;
    page.drawLine({
      start: { x: left, y: ly },
      end: { x: right, y: ly },
      thickness: 0.7,
      color: ink,
    });
  }

  const headerY = tableTop - 11;
  draw("BENEFICIAR", left + 8, headerY, 9, fontBold);
  draw("BANCA & CONT / CASIERIE", left + colBen + 8, headerY, 9, fontBold);
  draw("SUMA", left + colBen + colBanca + 18, headerY, 9, fontBold);

  const r1Y = tableTop - headerH - 12;
  draw(fit(beneficiar, 9.5, colBen - 14, fontBold), left + 6, r1Y, 9.5, fontBold);
  draw(fit(banca, 10, colBanca - 14, fontBold), left + colBen + 6, r1Y, 10, fontBold);
  const r2Y = tableTop - headerH - rowH - 12;
  draw(fit(cont, 10, colBanca - 14, fontBold), left + colBen + 6, r2Y, 10, fontBold);

  y = tableTop - tableH - 16;

  // —— Declarații legale (text tipizat oficial) ——
  const decls = [
    "- Raspund de exactitatea, realitatea si corectitudinea actelor depuse. Inteleg ca depunerea de documente false (facturi, devize, alte inscrisuri) indreptateste Asiguratorul sa refuze plata tuturor despagubirilor solicitate.",
    "- Declar pe propria raspundere ca nu mai posed alte polite de asigurare de acelasi tip si nu am solicitat sau primit despagubiri/compensatii banesti de la alt asigurator sau de la terte persoane - sofer vinovat RCA.",
    "- In cazul furtului total, daca autovehiculul va fi gasit, ma oblig sa restitui despagubirea primita sau, dupa caz, diferenta de despagubire daca autovehiculul a suferit avarii. Pentru a conserva dreptul la regres, ma oblig a nu elibera la Politie sau alte organe de cercetare, declaratie de renuntare la pretentii, motivul fiind ca am fost despagubit de OMNIASIG V.I.G. S.A.",
    "- In cazul in care actele incheiate de organele de politie, unitatile de pompieri sau alte organe competente sa cerceteze accidentele de autovehicule, sunt anulate, ma oblig sa restitui de indata intreaga despagubire primita.",
  ];
  for (const d of decls) {
    const lines = wrapLines(d, legalSize, contentW, font);
    for (const line of lines) {
      draw(line, left, y, legalSize, font, muted);
      y -= legalStep;
    }
    y -= 3;
  }

  y -= 4;
  draw("Suma de (in cifre)", left, y, settleSize, font);
  dots(left + textW("Suma de (in cifre)", settleSize, font) + 5, y, 95);
  draw("adica (in litere)", left + 210, y, settleSize, font);
  dots(
    left + 210 + textW("adica (in litere)", settleSize, font) + 5,
    y,
    right - (left + 210 + textW("adica (in litere)", settleSize, font) + 5)
  );

  y -= 15;
  draw("reprezinta despagubirea integrala pentru daunele suferite in accidentul de circulatie din data de", left, y, settleSize, font);
  cx = left + textW("reprezinta despagubirea integrala pentru daunele suferite in accidentul de circulatie din data de", settleSize, font) + 5;
  dots(cx, y, Math.max(48, right - cx));

  y -= 15;
  draw("Prin primirea acestei sume declar ca sunt integral despagubit si ca nu mai am nici o pretentie de despagubire", left, y, settleSize, font);
  y -= 14;
  draw("de la OMNIASIG V.I.G. S.A., asiguratorul de raspundere civila", left, y, settleSize, font);
  cx = left + textW("de la OMNIASIG V.I.G. S.A., asiguratorul de raspundere civila", settleSize, font) + 5;
  dots(cx, y, 72);
  cx += 76;
  draw("si fata de (nume sofer vinovat)", cx, y, settleSize, font);
  y -= 14;
  dots(left, y, 210);
  draw("persoana vinovata de producerea accidentului din data de", left + 218, y, settleSize, font);
  dots(
    left + 218 + textW("persoana vinovata de producerea accidentului din data de", settleSize, font) + 5,
    y,
    Math.max(40, right - (left + 218 + textW("persoana vinovata de producerea accidentului din data de", settleSize, font) + 5))
  );

  y -= 18;
  draw("Obiectii:", left, y, bodySize, fontBold);

  // Umple până deasupra benzii de semnătură cu linii de obiețiuni
  const obiectiiLines = [];
  let oy = y - 15;
  while (oy > contentBottom + 18) {
    obiectiiLines.push(oy);
    oy -= 15;
  }
  // minim 3 linii
  while (obiectiiLines.length < 3) {
    const last = obiectiiLines[obiectiiLines.length - 1] || y - 15;
    obiectiiLines.push(last - 15);
  }
  for (const ly of obiectiiLines) {
    if (ly > contentBottom + 12) dots(left, ly, contentW);
  }

  // Semnătură lipită deasupra footerului
  const signY = contentBottom;
  draw("DATA", left, signY, 11, fontBold);
  dots(left + 36, signY, 110);
  draw("SEMNATURA / STAMPILA", left + 260, signY, 11, fontBold);
  dots(left + 260 + textW("SEMNATURA / STAMPILA", 11, fontBold) + 6, signY, 110);

  // —— Footer (date identificare actuale Omniasig) ——
  page.drawLine({
    start: { x: left, y: footTop },
    end: { x: right, y: footTop },
    thickness: 1.6,
    color: ink,
  });

  let fy = footTop - 12;
  draw("Tel: (+40) 21 405 7420", left, fy, 7.2, font, muted);
  draw("Cod Unic Inregistrare: 14360018", left + 286, fy, 7.2, font, muted);
  fy -= 9;
  draw("Fax: (+40) 21 311 4490", left, fy, 7.2, font, muted);
  draw("Nr. ordine in Registrul Comertului: J40/10454/2001", left + 286, fy, 7.2, font, muted);
  fy -= 9;
  draw("Email: office@omniasig.ro", left, fy, 7.2, font, muted);
  draw("Capital social: 506.352.385 lei", left + 286, fy, 7.2, font, muted);
  fy -= 11;
  const legal1 =
    "Autorizata de Autoritatea de Supraveghere Financiara - R.A. - 047/10.04.2003; Societate administrata in sistem dualist; www.omniasig.ro";
  for (const line of wrapLines(legal1, 6.5, contentW, font)) {
    draw(line, left, fy, 6.5, font, muted);
    fy -= 8;
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
