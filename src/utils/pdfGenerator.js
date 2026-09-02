async function createPdf(options = {}) {
  const { jsPDF } = await import("jspdf");
  return new jsPDF(options);
}

import { getStatusDefinition } from "../constants/config";
import { fmtDateTime, fmtDate, todayISO } from "./dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "./claimUtils";
import { resolveCerereDespagubireParties, isCompanyClientName, OMNIASIG_CERERE_PLATA } from "./cerereDespagubire";
import { ASIROM_LOGO_BASE64 } from "../assets/asiromLogoBase64";

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
  const atelier = branding?.atelierNume || "Atelier";
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
  const masinaSchimbText = claim.masinaSchimb 
    ? (claim.masinaSchimbModel || claim.masinaSchimbNumar ? `${claim.masinaSchimbModel || ""} ${claim.masinaSchimbNumar || ""}`.trim() : "Da") 
    : "Nu";
  linie("Mașină la schimb", masinaSchimbText);
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
  doc.text(sd(claim.masinaSchimbNumar || "...................."), 85, boxY);
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
  const partySize = 9.8; // Subsemnatul / reprezentant + valori complete (tel, nr. auto, anexe)
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
  const subLabel = "Subsemnatul(a)";
  const firmLabel = ", reprezentant al societatii";
  let cx = left;
  draw(subLabel, cx, y, partySize, font);
  cx += textW(subLabel, partySize, font) + 4;

  const afterSubMin = cx + 70;
  const firmLabelW = textW(firmLabel, partySize, font) + 4;
  const subVal = fit(parties.subsemnatul || "", partySize, 155, fontBold);
  if (subVal) {
    draw(subVal, cx, y, partySize, fontBold);
    cx += textW(subVal, partySize, fontBold) + 3;
  } else {
    dots(cx, y, 110);
    cx += 110;
  }
  cx = Math.max(cx, afterSubMin);

  draw(firmLabel, cx, y, partySize, font);
  cx += firmLabelW;
  const firmMaxW = Math.max(60, right - cx - 2);
  const firmVal = fit(parties.reprezentantSocietate || "", partySize, firmMaxW, fontBold);
  if (firmVal) draw(firmVal, cx, y, partySize, fontBold);
  else dots(cx, y, firmMaxW);

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
  const telVal = fit(claim.telefonClient || "", partySize, 80, fontBold);
  if (telVal) draw(telVal, cx, y, partySize, fontBold);
  else dots(cx, y, 80);

  y -= lineStep;
  draw("proprietar al autovehiculului cu numarul", left, y, bodySize, font);
  cx = left + textW("proprietar al autovehiculului cu numarul", bodySize, font) + 5;
  const plateVal = fit(claim.numarInmatriculare || "", partySize, right - cx - 2, fontBold);
  if (plateVal) draw(plateVal, cx, y, partySize, fontBold);
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
  draw("FACTURA FISCALA NUMARUL _____", left, y, partySize, fontBold);
  y -= annexStep;
  draw("DEVIZ AUDATEX _____", left, y, partySize, fontBold);
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

export async function generateazaCerereDespagubireAsirom(claim, branding = null) {
  const doc = await createPdf();
  const parties = resolveCerereDespagubireParties(claim);
  const contentW = 180;
  const margin = 15;

  const write = (text, x, yy, opts = {}) => {
    doc.text(sd(text), x, yy, opts);
  };

  const drawBox = (x, yy, w, h, fill = false) => {
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.35);
    if (fill) {
      doc.setFillColor(245, 247, 250);
      doc.rect(x, yy, w, h, "FD");
    } else {
      doc.rect(x, yy, w, h);
    }
  };

  const drawCheckbox = (x, yy, checked = false) => {
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.35);
    doc.rect(x, yy - 3.4, 3.8, 3.8);
    if (checked) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0);
      doc.text("X", x + 0.9, yy - 0.5);
    }
  };

  // Date atelier / branding
  const atelierNume = sd(branding?.nume || branding?.atelierNume || OMNIASIG_CERERE_PLATA.beneficiar, "AUTO WASH IMPEX SRL");
  const atelierIban = sd(branding?.iban || OMNIASIG_CERERE_PLATA.cont, "RO56MIRO0000118403040301");
  const atelierBanca = sd(branding?.banca || OMNIASIG_CERERE_PLATA.banca, "PROCREDIT BANK");
  const atelierEmail = sd(branding?.email || claim?.emailClient || "daune@serviceautocrangasi.ro");

  // Date dosar
  const nrDosar = sd(claim?.nrDosarAsigurator || claim?.numarDosar || "33211775");
  const tip = String(claim?.tipAsigurare || "").toUpperCase();
  const isRca = tip.includes("RCA") || (!tip.includes("CASCO") && !tip.includes("NON"));
  const isCasco = tip.includes("CASCO");
  const isNonAuto = tip.includes("NON");

  const bunAvariat = sd(claim?.numarInmatriculare || claim?.marcaModel || "B110THO");
  const asiguratPagubit = sd(parties.proprietar || claim?.client || "UNICREDIT LEASING CORPORATION IFN S.A");
  const dataEveniment = claim?.dataEveniment ? fmtDate(claim.dataEveniment) : fmtDate(claim?.dataDeschiderii || todayISO());

  // Sume
  const valoareSuma = claim?.valoareDevizAudatex || claim?.financiar?.valoareDevizAudatex || claim?.financiar?.audatex?.costReparatieFaraTva || claim?.sumaDecont || claim?.financiar?.costDeviz;
  const sumaText = valoareSuma ? `${Number(valoareSuma).toFixed(2)}` : "5142.43";

  // Declarant
  const subsemnatul = sd(parties.subsemnatul || parties.proprietar || claim?.client || "VANCICA RAZVAN PETRISOR");
  const cnpDisplay = claim?.cnp ? sd(claim.cnp) : "1991117282214";
  const domDisplay = (claim?.adresaClient || claim?.adresa || claim?.localitateClient)
    ? sd(claim?.adresaClient || claim?.adresa || claim?.localitateClient)
    : "HOTARU STR. MARINESCU FLORIAN , NR.6";
  const ciDisplaySeria = claim?.serieCI ? sd(claim.serieCI) : "SL";
  const ciDisplayNr = claim?.numarCI ? sd(claim.numarCI) : "112387";

  const isCompany = parties.asCompanyOwner || isCompanyClientName(parties.proprietar);
  const hasDelegat = parties.hasSeparateDelegat;

  let y = 12;

  // ==========================================
  // 1. HEADER (Titlu Stânga + Logo Asirom Dreapta)
  // ==========================================
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0);
  write("CERERE DE PLATĂ A DESPĂGUBIRII", margin, y + 6);

  try {
    doc.addImage(ASIROM_LOGO_BASE64, "JPEG", margin + 128, y - 2, 52, 14);
  } catch (e) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 85, 163);
    write("Asirom", margin + 135, y + 5);
    doc.setFontSize(6.5);
    doc.setTextColor(215, 15, 25);
    write("VIENNA INSURANCE GROUP", margin + 130, y + 10);
  }

  y += 14;

  // Linie dublă separator antet
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + contentW, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 1, margin + contentW, y + 1);
  y += 5;

  // ==========================================
  // 2. TABEL DAUNĂ (5 Rânduri conform șablonului oficial Asirom)
  // ==========================================
  const rowH = 6.0;
  const col1W = 45;

  // Rând 1: Nr. dosar
  drawBox(margin, y, contentW, rowH);
  doc.line(margin + col1W, y, margin + col1W, y + rowH);
  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  write("Nr. dosar de daună:", margin + 3, y + 4.2);
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  write(nrDosar, margin + col1W + 4, y + 4.2);
  y += rowH;

  // Rând 2: Tip poliță
  drawBox(margin, y, contentW, rowH);
  doc.line(margin + col1W, y, margin + col1W, y + rowH);
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  write("Tip poliță:", margin + 3, y + 4.2);

  doc.setFont("times", "bold");
  write("RCA", margin + col1W + 4, y + 4.2);
  drawCheckbox(margin + col1W + 22, y + 4.2, isRca);

  write("CASCO", margin + col1W + 36, y + 4.2);
  drawCheckbox(margin + col1W + 58, y + 4.2, isCasco);

  write("Non Auto", margin + col1W + 74, y + 4.2);
  drawCheckbox(margin + col1W + 98, y + 4.2, isNonAuto);
  y += rowH;

  // Rând 3: Bunul avariat
  drawBox(margin, y, contentW, rowH);
  doc.line(margin + col1W, y, margin + col1W, y + rowH);
  doc.setFont("times", "normal");
  write("Bunul avariat:", margin + 3, y + 4.2);
  doc.setFont("times", "bold");
  write(bunAvariat, margin + col1W + 4, y + 4.2);
  y += rowH;

  // Rând 4: Asigurat / Păgubit
  drawBox(margin, y, contentW, rowH);
  doc.line(margin + col1W, y, margin + col1W, y + rowH);
  doc.setFont("times", "normal");
  write("Asigurat/ Păgubit:", margin + 3, y + 4.2);
  doc.setFont("times", "bold");
  write(asiguratPagubit, margin + col1W + 4, y + 4.2);
  y += rowH;

  // Rând 5: Dată eveniment
  drawBox(margin, y, contentW, rowH);
  doc.line(margin + col1W, y, margin + col1W, y + rowH);
  doc.setFont("times", "normal");
  write("Dată eveniment:", margin + 3, y + 4.2);
  doc.setFont("times", "bold");
  write(dataEveniment, margin + col1W + 4, y + 4.2);
  y += rowH + 6;

  // ==========================================
  // 3. PARAGRAF DECLARANT
  // ==========================================
  doc.setFont("times", "normal");
  doc.setFontSize(9.0);
  doc.setTextColor(0);

  write(`Subsemnatul(a) ${subsemnatul}, CNP ${cnpDisplay}, domiciliat(ă) în:`, margin, y);
  y += 4.5;
  write(`${domDisplay}, cu actul de identitate seria: ${ciDisplaySeria} nr. ${ciDisplayNr}`, margin, y);
  y += 4.8;

  // Calitate bife
  write("în calitate de:", margin, y);
  drawCheckbox(margin + 24, y, !hasDelegat && !isCompany);
  write("asigurat,", margin + 29, y);

  drawCheckbox(margin + 48, y, !hasDelegat && !isCompany);
  write("păgubit,", margin + 53, y);

  drawCheckbox(margin + 72, y, hasDelegat || isCompany);
  write("reprezentant al beneficiarului, solicit plata despăgubirii", margin + 77, y);

  y += 4.8;
  write(`în valoare de:  ${sumaText}  (lei).`, margin, y);
  y += 5.2;

  drawCheckbox(margin, y, false);
  write("conform Evaluare Asirom, fără să fie necesară prezentarea unor documente justificative;", margin + 5, y);
  y += 4.8;

  drawCheckbox(margin, y, true);
  write("conform documentelor justificative anexate", margin + 5, y);
  y += 6.0;

  // ==========================================
  // 4. MODALITATE PLATĂ + TABEL 4 COLOANE (Suma | IBAN | Banca | Titular)
  // ==========================================
  doc.setFont("times", "normal");
  doc.setFontSize(9.0);
  write("Despăgubirea cuvenită sunt de acord să fie plătită:", margin, y);
  y += 4.6;

  drawCheckbox(margin, y, false);
  write("prin casieriile BCR", margin + 5, y);
  y += 4.6;

  drawCheckbox(margin, y, true);
  write("prin cont bancar, astfel:", margin + 5, y);
  y += 5.0;

  // TABEL PLATĂ 4 COLOANE (Suma | IBAN | Banca | Titular)
  const pTabH = 10.5;
  const pHeaderH = 4.8;
  const wSuma = 30;
  const wIban = 60;
  const wBanca = 35;
  const wTitular = contentW - wSuma - wIban - wBanca;

  drawBox(margin, y, contentW, pTabH);
  doc.line(margin, y + pHeaderH, margin + contentW, y + pHeaderH);

  doc.line(margin + wSuma, y, margin + wSuma, y + pTabH);
  doc.line(margin + wSuma + wIban, y, margin + wSuma + wIban, y + pTabH);
  doc.line(margin + wSuma + wIban + wBanca, y, margin + wSuma + wIban + wBanca, y + pTabH);

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  write("Suma", margin + 3, y + 3.4);
  write("IBAN", margin + wSuma + 3, y + 3.4);
  write("Banca", margin + wSuma + wIban + 3, y + 3.4);
  write("Titular", margin + wSuma + wIban + wBanca + 3, y + 3.4);

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  write(`${sumaText} lei`, margin + 3, y + pHeaderH + 3.8);
  doc.setFont("times", "bold");
  write(atelierIban, margin + wSuma + 3, y + pHeaderH + 3.8);
  doc.setFont("times", "normal");
  write(atelierBanca, margin + wSuma + wIban + 3, y + pHeaderH + 3.8);
  write(atelierNume, margin + wSuma + wIban + wBanca + 3, y + pHeaderH + 3.8);

  y += pTabH + 6.0;

  // ==========================================
  // 5. DECLARAȚII PE PROPRIA RĂSPUNDERE
  // ==========================================
  doc.setFont("times", "normal");
  doc.setFontSize(9.0);
  write("Declar, pe propria răspundere, următoarele:", margin, y);
  y += 4.5;

  drawCheckbox(margin, y, false);
  write("Am avizat acest eveniment și la Asigurătorul: ....................................... iar suma stabilită de acesta este: ....................", margin + 5, y);
  y += 4.5;

  drawCheckbox(margin, y, true);
  write("Nu am avizat și nu urmează să mai avizez acest eveniment la altă societate de asigurări.", margin + 5, y);
  y += 4.5;

  drawCheckbox(margin, y, true);
  write("Nu dețin aceeași formă de asigurare pentru bunul respectiv încheiată și la altă societate de asigurare.", margin + 5, y);
  y += 5.5;

  // ==========================================
  // 6. CLAUZE LEGALE
  // ==========================================
  doc.setFont("times", "normal");
  doc.setFontSize(8.2);
  const clauza1 = "Mă oblig să restitui de îndată, parțial sau total, societății de asigurare suma de bani primită cu titlu de despăgubire, în funcție de o eventuală hotărâre a instanței de judecată în ceea ce privește fapta, înfăptuitorul sau vinovăția, ori în cazul anulării actelor încheiate de organele de poliție, de unitățile de pompieri sau alte autorități competente să cerceteze evenimentul.";
  const c1Lines = doc.splitTextToSize(sd(clauza1), contentW);
  doc.text(c1Lines, margin, y);
  y += c1Lines.length * 3.6 + 2.0;

  const clauza2 = "Declar că prin primirea sumei de mai sus sunt integral despăgubit(ă) de către Asirom pentru dauna menționată anterior și nu voi mai avea nicio pretenție față de Asirom, asigurătorul de răspundere civilă și persoana vinovată de producerea evenimentului.";
  const c2Lines = doc.splitTextToSize(sd(clauza2), contentW);
  doc.text(c2Lines, margin, y);
  y += c2Lines.length * 3.6 + 3.0;

  // ==========================================
  // 7. EMAIL INFORMARE & OBSERVAȚII
  // ==========================================
  drawBox(margin, y, contentW, 6.2);
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  write("Doresc să primesc informare după realizarea plății la adresa de email:", margin + 3, y + 4.2);
  doc.setFont("times", "bold");
  write(atelierEmail, margin + 88, y + 4.2);
  y += 9.0;

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  write("Observații:  ........................................................................................................................................................................................", margin, y);
  y += 7.0;

  // ==========================================
  // 8. GDPR & MYASIROM NOTICE
  // ==========================================
  doc.setFont("times", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(50);
  const gdprText = "Prin semnarea acestui document am luat la cunoștiință și înțeleg conținutul „Informării privind prelucrarea datelor cu caracter personal” (nr. F226/ed3/09.2019) și mă oblig s-o transmit tuturor persoanelor ale căror date cu caracter personal le furnizez în procesul de instrumentare a dosarului de daune în vederea informării corecte a acestora.";
  const gdprLines = doc.splitTextToSize(sd(gdprText), contentW);
  doc.text(gdprLines, margin, y);
  y += gdprLines.length * 3.3 + 1.8;

  write("Îți poți administra portofoliul de asigurări Asirom și dosarele de daună online, pe www.myasirom.ro, din contul tău de client myAsirom", margin, y);
  y += 6.0;

  // ==========================================
  // 9. TABEL SEMNĂTURI JOS
  // ==========================================
  doc.setTextColor(0);
  doc.setFont("times", "normal");
  doc.setFontSize(8.8);

  write("Localitate / Dată:", margin, y);
  doc.setFont("times", "bold");
  write(`București / ${fmtDate(todayISO())}`, margin + 28, y);

  doc.setFont("times", "normal");
  write("Nume și prenume:", margin + 85, y);
  doc.setFont("times", "bold");
  write(subsemnatul, margin + 112, y);

  y += 9.0;
  doc.setFont("times", "italic");
  doc.setFontSize(8.0);
  write("Semnătura (și ștampila, dacă este cazul)", margin + 105, y);
  y += 5.0;

  // ==========================================
  // 10. FOOTER CORPORATE ASIROM
  // ==========================================
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentW, y);
  y += 3.5;

  doc.setFont("times", "bold");
  doc.setFontSize(7.0);
  doc.setTextColor(90);
  write("Societatea Asigurarea Românească ASIROM VIENNA INSURANCE GROUP S.A.", margin, y);
  write("Capital social subscris și vărsat: 292.484.901,30 lei.", margin + 115, y);
  y += 3.2;

  doc.setFont("times", "normal");
  doc.setFontSize(6.5);
  write("Bulevardul Carol I nr. 31-33, Sector 2, Cod 020912, București, România. Nr. de înregistrare la Reg. Com.: J1991000304405, CUI: 336290", margin, y);
  write("Societate autorizată de ASF. Nr. Înmatriculare Registrul Asigurătorilor: RA-023/2003", margin + 115, y);
  y += 3.0;

  write("EUID: ROONRC.J1991000304405 · Societate condusă printr-un sistem dualist", margin, y);
  write("Customer Care Asirom: 021 9146 · info@asirom.ro", margin + 115, y);
  y += 3.5;

  doc.setFontSize(7.0);
  write("Pagina - 1 -", (margin + contentW / 2) - 8, y);

  const pdfBytes = doc.output("arraybuffer");
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const token = stripDiacritics(claim?.numarDosar || claim?.numarInmatriculare || "nou").replace(/\s+/g, "_");
  const fileName = `Cerere_Despagubire_ASIROM_${token}.pdf`;

  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    pdfBytes,
    blob,
    fileName,
  };
}




export async function generateazaContractInchiriere(claim) {
  const doc = await createPdf();
  let y = 20;

  const title = "CONTRACT DE ÎNCHIRIERE AUTOTURISM";
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(sd(title), 105, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(sd("Nr. ____ / ___________    Încheiat astăzi " + fmtDate(new Date()) + " la ____________"), 14, y);
  y += 10;

  doc.setFont(undefined, "bold");
  doc.text(sd("Art. 1 – PĂRȚILE CONTRACTANTE :"), 14, y);
  y += 6;

  doc.setFont(undefined, "normal");
  const p1 = "1. S.C. AUTO WASH IMPEX. cu sediul în Bucuresti, str.Uverturii nr.151 sec.6, înmatriculată la Registrul Comerțului Bucuresti sub nr. J40/11131/2005, CUI 17717698, cont RO08 MIRO 0000 1184 0304 0001 la PROCREDIT BANK, reprezentată de Sorin Tudorov (administrator), denumită PROPRIETAR";
  const p2 = "2. " + sd(claim.client || "..........................") + " cu sediul / domiciliat în ................................................, str. ..................................... nr. ......., jud. ................., CUI / CNP ......................................., legitimat cu ....... seria ....... nr. ...................., eliberat de .............................. la data de ...................., telefon: " + sd(claim.telefonClient || "....................") + ", denumit în continuare CHIRIAȘ.";
  
  const drawText = (text, spacing = 5) => {
      const lines = doc.splitTextToSize(text, 180);
      if (y + lines.length * spacing > 280) {
          doc.addPage();
          y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * spacing + 2;
  }

  drawText(sd(p1));
  drawText(sd(p2));
  y += 2;

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 2 – OBIECTUL CONTRACTULUI :"));
  doc.setFont(undefined, "normal");
  drawText(sd("Obiectul contractului îl constituie închirierea autoturismului la schimb având nr. înmatriculare " + sd(claim.masinaSchimbNumar || "....................") + " (pentru clientul cu auto avariat marca " + sd(claim.marcaModel || ".....") + " nr. " + sd(claim.numarInmatriculare || ".....") + ")."));

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 3 - TERMENUL :"));
  doc.setFont(undefined, "normal");
  drawText(sd("Închirierea se face pe o perioada determinata/calculata conform ore manopera deviz reparatie intocmit in baza nota constatare/reconstatare eliberate de asigurator, dupa caz: " + (claim.zileChirieAudatex || ".......") + " zile, începând cu data de " + fmtDate(claim.dataDariiLaSchimb || claim.dataProgramare || new Date()) + "."));

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 4 – CHIRIA/TARIFUL"));
  doc.setFont(undefined, "normal");
  drawText(sd("a. Chiria/tariful si numarul de zile se stabilesc in functie de termenul de executare al lucrarii (ore manopera deviz reparatie), tariful pe ziua de inchiriere este de 50 euro pe zi, tva inclus.\nb. Neplata chiriei la termen dă drept proprietarului să ceară plată de daune + penalitati aferente."));

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 5 – CONDIȚII GENERALE DE ÎNCHIRIERE :"));
  doc.setFont(undefined, "normal");
  const condGen = "a. Autoturismul întrunește toate condițiile tehnice de folosire, fiind în stare perfectă de funcționare și neavând defecte și lipsuri.\nb. Perioada minimă de închiriere este de 24 ore, o zi indivizibilă.\nc. Chiriașul are obligația ca pentru autoturismul pus la dispoziție să plătească o chirie echivalentă în lei la cursul BNR.\nd. Chiriașul este obligat să constituie un depozit ca garanție (dacă e cazul).\ne. Chiriașul se obligă să folosească autoturismul cu diligența unui bun proprietar.\nf. Lipsa obiectelor de inventar atrage reținerea contravalorii.\ng. Tariful nu cuprinde combustibilul, taxele de trecere/parcare, amenzile.";
  drawText(sd(condGen), 4.5);

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 6 – LOCUL DE ÎNCHIRIERE ȘI UTILIZAREA AUTOTURISMULUI :"));
  doc.setFont(undefined, "normal");
  const locUt = "a. Restituirea autoturismului în altă locație (>30 km) presupune taxe suplimentare.\nb. Utilizarea este exclusiv în scopul transportului de persoane.\nc. Proprietarul își păstrează dreptul de proprietate deplină.\nd. Chiriașul nu poate cere restituirea contravalorii îmbunătățirilor.\ne. Utilizarea în afara granițelor României se poate face doar cu acordul expres și scris al proprietarului.\nf. Documentele mașinii trebuie restituite împreună cu aceasta (penalitate 10 Euro/zi lipsă).";
  drawText(sd(locUt), 4.5);

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 7 – DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR :"));
  doc.setFont(undefined, "normal");
  const dreptObl = "Proprietarul:\na. Să pună la dispoziție autoturismul conform contractului.\nb. Să predea autoturismul cu rezervorul de carburant plin (dacă se aplică).\nc. Să asigure RCA pe toată durata.\n\nChiriașul:\na. De a plăti chiria (sau a o deconta prin asigurator).\nb. De a exploata normal autoturismul.\nc. De a achita amenzile pe perioada închirierii.\nd. De a returna autoturismul cu același nivel de carburant (altfel 1 Euro/litru).\ne. De a poseda permis valabil (>1 an). Dacă conduce altcineva, răspunde solidar.\nf. Întârzierile neanunțate la returnare atrag penalități: 10% pe zi (orele 2-4), chiria întreagă (din ziua 5). Nereturnarea în 24h poate fi considerată abuz de încredere (art 213 c.p.).\ng. Avariile din culpa chiriașului se suportă de acesta (în caz că nu le acoperă asigurarea). Conducerea sub influența alcoolului atrage răspunderea exclusivă a chiriașului.\nh. Interzis transportul contra cost sau remorcarea.";
  drawText(sd(dreptObl), 4.5);

  doc.setFont(undefined, "bold");
  drawText(sd("Art. 8, 9, 10, 11 – CESIUNEA, ÎNCETAREA, FORȚA MAJORĂ, LITIGII :"));
  doc.setFont(undefined, "normal");
  const finale = "Contractul nu poate fi cesionat fără acord scris. Încetează la expirarea termenului sau la neîndeplinirea obligațiilor. Forța majoră exonerează de răspundere conform legii. Litigiile se rezolvă amiabil sau la instanța proprietarului. Contractul are valoare de titlu executoriu.";
  drawText(sd(finale), 4.5);

  y += 10;
  if (y > 250) {
      doc.addPage();
      y = 20;
  }
  doc.setFont(undefined, "bold");
  doc.text("PROPRIETAR,", 25, y);
  doc.text("CHIRIAS,", 135, y);
  y += 5;
  doc.setFont(undefined, "normal");
  doc.text("S.C. AUTO WASH IMPEX SRL", 25, y);
  doc.text(sd(claim.client || ".........................."), 135, y);
  y += 5;
  doc.text("Director Sorin Tudorov", 25, y);

  doc.save("contract-inchiriere-" + stripDiacritics(claim.numarDosar || "nou") + ".pdf");
}
