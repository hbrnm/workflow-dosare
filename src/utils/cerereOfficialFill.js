/**
 * Tipizate curate Asirom / Groupama / Grawe — același nivel vizual ca Omniasig,
 * cu logica delegat / proprietar / plată atelier.
 */

import {
  resolveCerereDespagubireParties,
  CERERE_ATELIER_PLATA,
} from "./cerereDespagubire";

function stripDiacritics(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâî]/g, (c) => ({ ă: "a", â: "a", î: "i" }[c] || c))
    .replace(/[ĂÂÎ]/g, (c) => ({ Ă: "A", Â: "A", Î: "I" }[c] || c))
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T");
}

const sd = (t) => stripDiacritics(t || "—");

function resolvePlata(options = null) {
  const plata = options?.plata || {};
  return {
    beneficiar: String(
      plata.beneficiar || options?.atelierNume || CERERE_ATELIER_PLATA.beneficiar
    ).trim(),
    banca: String(plata.banca || CERERE_ATELIER_PLATA.banca).trim(),
    cont: String(plata.cont || CERERE_ATELIER_PLATA.cont).trim(),
  };
}

async function createDoc(logoFile) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const base = import.meta.env.BASE_URL || "/";
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const embedSerif = async (file, fallback) => {
    try {
      const fontRes = await fetch(`${base}fonts/${file}`);
      if (!fontRes.ok) throw new Error("font");
      return pdfDoc.embedFont(await fontRes.arrayBuffer(), { subset: true });
    } catch {
      return pdfDoc.embedFont(fallback);
    }
  };
  const font = await embedSerif("LiberationSerif-Regular.ttf", StandardFonts.TimesRoman);
  const fontBold = await embedSerif("LiberationSerif-Bold.ttf", StandardFonts.TimesRomanBold);

  let logo = null;
  if (logoFile) {
    try {
      const logoRes = await fetch(`${base}forms/${logoFile}`);
      if (logoRes.ok) logo = await pdfDoc.embedPng(await logoRes.arrayBuffer());
    } catch {
      logo = null;
    }
  }

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const ink = rgb(0, 0, 0);
  const muted = rgb(0.2, 0.2, 0.2);
  const lineGray = rgb(0.4, 0.4, 0.4);
  const left = 36;
  const right = width - 36;
  const contentW = right - left;
  const partySize = 9.8;
  const bodySize = 10.5;

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
    for (let px = x; px < x + w - 1; px += 3.4) {
      page.drawCircle({ x: px, y: y + 0.5, size: 0.55, color: lineGray });
    }
  };
  const checkbox = (x, y) => {
    page.drawRectangle({
      x,
      y: y - 1.2,
      width: 9,
      height: 9,
      borderColor: ink,
      borderWidth: 0.85,
    });
  };
  const wrapLines = (raw, size, maxW, f = font) => {
    const words = sd(raw).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) <= maxW) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const download = async (claim, prefix) => {
    const bytes = await pdfDoc.save();
    const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}-${token}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return {
    pdfDoc,
    page,
    width,
    height,
    left,
    right,
    contentW,
    ink,
    muted,
    rgb,
    font,
    fontBold,
    logo,
    partySize,
    bodySize,
    textW,
    fit,
    draw,
    dots,
    checkbox,
    wrapLines,
    download,
  };
}

function drawLogo(ctx, fallbackName, color) {
  const { logo, page, right, height, draw, fontBold, font, textW } = ctx;
  if (logo) {
    const logoW = Math.min(120, logo.width);
    const logoH = (logo.height / logo.width) * logoW;
    page.drawImage(logo, {
      x: right - logoW,
      y: height - 28 - logoH,
      width: logoW,
      height: logoH,
    });
  } else {
    draw(fallbackName, right - textW(fallbackName, 14, fontBold), height - 48, 14, fontBold, color);
  }
}

function drawParties(ctx, parties, y) {
  const { left, right, font, fontBold, draw, dots, textW, fit, partySize } = ctx;
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
  return y;
}

function drawPaymentTable(ctx, plata, y) {
  const { left, right, contentW, page, ink, rgb, fontBold, draw, fit } = ctx;
  draw("Plata se va efectua in favoarea:", left, y, 10.5, fontBold);
  y -= 8;
  const tableTop = y;
  const rowH = 17;
  const headerH = 15;
  const rows = 3;
  const colBen = 158;
  const colSuma = 72;
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
  draw("BENEFICIAR", left + 8, tableTop - 10.5, 8.5, fontBold);
  draw("BANCA & CONT / CASIERIE", left + colBen + 8, tableTop - 10.5, 8.5, fontBold);
  draw("SUMA", left + colBen + colBanca + 16, tableTop - 10.5, 8.5, fontBold);
  draw(fit(plata.beneficiar, 9.5, colBen - 14, fontBold), left + 6, tableTop - headerH - 11.5, 9.5, fontBold);
  draw(fit(plata.banca, 10, colBanca - 14, fontBold), left + colBen + 6, tableTop - headerH - 11.5, 10, fontBold);
  draw(
    fit(plata.cont, 10, colBanca - 14, fontBold),
    left + colBen + 6,
    tableTop - headerH - rowH - 11.5,
    10,
    fontBold
  );
  return tableTop - tableH;
}

function drawSignature(ctx, y, footTop) {
  const { left, fontBold, draw, dots, textW } = ctx;
  const signY = Math.max(footTop + 28, y - 18);
  draw("DATA", left, signY, 10.5, fontBold);
  dots(left + 34, signY, 100);
  draw("SEMNATURA / STAMPILA", left + 260, signY, 10.5, fontBold);
  dots(left + 260 + textW("SEMNATURA / STAMPILA", 10.5, fontBold) + 6, signY, 100);
  return signY;
}

/** ASIROM — tipizat curat, structura oficială. */
export async function fillCerereAsiromOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const ctx = await createDoc("asirom-logo.png");
  const {
    page, width, height, left, right, contentW, ink, muted, rgb,
    font, fontBold, partySize, bodySize, textW, fit, draw, dots, checkbox, wrapLines, download,
  } = ctx;

  drawLogo(ctx, "ASIROM", rgb(0, 0.22, 0.45));
  draw("www.asirom.ro  ·  Call Center 021 9146", left, height - 42, 8, font, muted);

  const title = "CERERE DE PLATA A DESPAGUBIRII";
  draw(title, (width - textW(title, 14, fontBold)) / 2, height - 78, 14, fontBold);

  // Antet
  let y = height - 96;
  page.drawRectangle({
    x: left,
    y: y - 56,
    width: contentW,
    height: 56,
    color: rgb(0.96, 0.96, 0.97),
    borderColor: ink,
    borderWidth: 0.9,
  });
  let rowY = y - 14;
  draw("Nr. dosar:", left + 8, rowY, 9.5, fontBold);
  draw(fit(claim.numarDosar || "", partySize, 120, fontBold) || "…………", left + 62, rowY, partySize, fontBold);

  const tip = String(claim.tipAsigurare || "").toUpperCase();
  const isRca = tip.includes("RCA");
  const isCasco = tip.includes("CASCO");
  draw("Polita tip:", left + 220, rowY, 9.5, fontBold);
  checkbox(left + 275, rowY);
  if (isRca) draw("X", left + 277, rowY, 8, fontBold);
  draw("RCA", left + 288, rowY, 9, font);
  checkbox(left + 325, rowY);
  if (isCasco) draw("X", left + 327, rowY, 8, fontBold);
  draw("Casco", left + 338, rowY, 9, font);
  checkbox(left + 385, rowY);
  if (!isRca && !isCasco) draw("X", left + 387, rowY, 8, fontBold);
  draw("Non Auto", left + 398, rowY, 9, font);

  rowY -= 16;
  const bun = [claim.numarInmatriculare, claim.marcaModel].filter(Boolean).join(" · ");
  draw("Bunul avariat:", left + 8, rowY, 9.5, fontBold);
  draw(fit(bun, partySize, 220, fontBold) || "……………………", left + 82, rowY, partySize, fontBold);
  draw("Data eveniment:", left + 330, rowY, 9.5, fontBold);
  dots(left + 412, rowY, 90);

  rowY -= 16;
  draw("Asigurat / Pagubit:", left + 8, rowY, 9.5, fontBold);
  draw(fit(parties.proprietar || "", partySize, 300, fontBold) || "……………………", left + 105, rowY, partySize, fontBold);

  y = y - 72;
  y = drawParties(ctx, parties, y);

  y -= 18;
  draw("solicit plata despagubirii in valoare de", left, y, bodySize, font);
  dots(left + textW("solicit plata despagubirii in valoare de", bodySize, font) + 4, y, 90);
  draw("(lei):", left + textW("solicit plata despagubirii in valoare de", bodySize, font) + 100, y, bodySize, font);

  y -= 18;
  checkbox(left, y);
  draw("conform Evaluare ASIROM, fara documente justificative;", left + 14, y, 9.8, font);
  y -= 15;
  checkbox(left, y);
  draw("conform documente justificative anexate:", left + 14, y, 9.8, font);

  y -= 16;
  draw("In original:", left, y, 9.8, font);
  draw("FACTURA FISCALA NUMARUL _____", left + 62, y, partySize, fontBold);
  y -= 15;
  draw("In fotocopie:", left, y, 9.8, font);
  draw("DEVIZ AUDATEX _____", left + 68, y, partySize, fontBold);

  y -= 20;
  draw("Despagubirea cuvenita sunt de acord sa fie platita:", left, y, 10.5, fontBold);
  y -= 16;
  checkbox(left, y);
  draw("prin casieriile BCR", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("prin casieriile ASIROM", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("prin cont bancar (detalii mai jos)", left + 14, y, 9.8, font);

  y -= 18;
  y = drawPaymentTable(ctx, plata, y) - 14;

  draw("Declar, pe propria raspundere, urmatoarele:", left, y, 10, fontBold);
  y -= 13;
  const decls = [
    "Nu am avizat si nu urmeaza sa mai avizez acest eveniment la alta societate de asigurare.",
    "Nu mai posed aceeasi forma de asigurare pentru bunul respectiv incheiata si la alta societate de asigurare.",
    "Ma oblig sa restitui de indata, partial sau total, societatii de asigurare suma de bani primita cu titlu de despagubire, in functie de o eventuala hotarare a instantei ori in cazul anularii actelor organelor competente.",
    "Declar ca, prin primirea sumei de mai sus sunt integral despagubit(a) de catre ASIROM pentru dauna mentionata anterior si nu voi mai avea nicio pretentie fata de ASIROM.",
  ];
  for (const d of decls) {
    for (const line of wrapLines(d, 8.2, contentW, font)) {
      draw(line, left, y, 8.2, font, muted);
      y -= 10;
    }
    y -= 2;
  }

  y -= 4;
  draw("Observatii:", left, y, 9.5, fontBold);
  y -= 13;
  dots(left, y, contentW);
  y -= 13;
  dots(left, y, contentW);

  const footTop = 68;
  drawSignature(ctx, y, footTop);
  page.drawLine({ start: { x: left, y: footTop }, end: { x: right, y: footTop }, thickness: 1.4, color: ink });
  draw("ASIROM Vienna Insurance Group S.A.  ·  Call Center 021 9146  ·  www.asirom.ro", left, footTop - 14, 7, font, muted);
  draw("F046-06 / editia 3 / 04.2015", left, footTop - 26, 6.5, font, muted);

  await download(claim, "cerere-despagubire-asirom");
}

/** GROUPAMA — tipizat curat, Anexa 12A. */
export async function fillCerereGroupamaOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const ctx = await createDoc("groupama-logo.png");
  const {
    page, width, height, left, right, contentW, ink, muted, rgb,
    font, fontBold, partySize, bodySize, textW, fit, draw, dots, checkbox, wrapLines, download,
  } = ctx;

  draw("Asiguram tot ce conteaza pentru tine.", left, height - 36, 8, font, muted);
  drawLogo(ctx, "GROUPAMA", rgb(0, 0.48, 0.22));
  draw("Anexa 12A", right - textW("Anexa 12A", 8, font), height - 52, 8, font, muted);

  const title = "DECLARATIE DE ACCEPTARE A DESPAGUBIRII";
  draw(title, (width - textW(title, 12, fontBold)) / 2, height - 78, 12, fontBold);
  let y = height - 96;
  draw("LA DOSARUL DE DAUNA Nr.", (width - textW("LA DOSARUL DE DAUNA Nr. ", 11, font) - 140) / 2, y, 11, font);
  const dx = (width - textW("LA DOSARUL DE DAUNA Nr. ", 11, font) - 140) / 2 + textW("LA DOSARUL DE DAUNA Nr. ", 11, font);
  draw(fit(claim.numarDosar || "", 11, 138, fontBold) || "………………", dx, y, 11, fontBold);

  y -= 24;
  y = drawParties(ctx, parties, y);

  y -= 16;
  draw("nr. auto", left, y, bodySize, font);
  let cx = left + textW("nr. auto", bodySize, font) + 5;
  draw(fit(claim.numarInmatriculare || "", partySize, 90, fontBold) || "…………", cx, y, partySize, fontBold);
  cx += 100;
  draw(", tel.", cx, y, bodySize, font);
  cx += textW(", tel.", bodySize, font) + 5;
  draw(fit(claim.telefonClient || "", partySize, 90, fontBold) || "…………", cx, y, partySize, fontBold);

  y -= 18;
  draw("va rog sa aprobati plata despagubirii prezentului dosar de dauna astfel:", left, y, bodySize, font);
  y -= 16;
  checkbox(left, y);
  draw("avans, pe baza proformei anexate;", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("partiala, pe baza documentelor anexate;", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("finala, pe baza documentelor de reparatie anexate;", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("regie proprie pe baza devizului estimativ intocmit de Groupama Asigurari S.A.", left + 14, y, 9.8, font);

  y -= 18;
  draw("Pentru solutionarea dosarului de dauna anexez:", left, y, 10, fontBold);
  y -= 15;
  draw("FACTURA FISCALA NUMARUL _____", left, y, partySize, fontBold);
  y -= 14;
  draw("DEVIZ AUDATEX _____", left, y, partySize, fontBold);
  y -= 14;
  dots(left, y, contentW);

  y -= 18;
  draw("Solicit ca plata despagubirii sa se efectueze prin virament:", left, y, 10.5, fontBold);
  y -= 16;
  y = drawPaymentTable(ctx, plata, y) - 14;

  const decls = [
    "Declar ca pentru pagubele consemnate in prezentul dosar de dauna nu am primit si nici nu voi solicita alte despagubiri, nici de la alte persoane, nici de la alte societati de asigurare.",
    "In cazul anularii ulterioare a actelor incheiate de autoritatile competente, ma oblig sa restitui suma primita cu titlu de despagubire.",
    "Raspund pentru exactitatea, realitatea si corectitudinea actelor depuse la dosarul de dauna.",
    "Dupa plata despagubirii, ma oblig sa conserv dreptul la regres si sa-l transfer catre Groupama Asigurari S.A.",
  ];
  for (const d of decls) {
    for (const line of wrapLines(`- ${d}`, 8.2, contentW, font)) {
      draw(line, left, y, 8.2, font, muted);
      y -= 10;
    }
    y -= 2;
  }

  y -= 4;
  draw("Obiectii:", left, y, 9.5, fontBold);
  y -= 13;
  dots(left, y, contentW);
  y -= 13;
  dots(left, y, contentW);

  const footTop = 72;
  drawSignature(ctx, y, footTop);
  page.drawLine({ start: { x: left, y: footTop }, end: { x: right, y: footTop }, thickness: 1.4, color: ink });
  draw("Groupama Asigurari S.A.  ·  AloGroupama 0374 110 110  ·  www.groupama.ro", left, footTop - 14, 7, font, muted);
  draw("Sediu: Str. Mihai Eminescu nr. 45, sector 1, Bucuresti  ·  CUI 6291812", left, footTop - 26, 6.5, font, muted);

  await download(claim, "cerere-despagubire-groupama");
}

/** GRAWE — tipizat curat. */
export async function fillCerereGraweOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const ctx = await createDoc("grawe-logo.png");
  const {
    page, width, height, left, right, contentW, ink, muted, rgb,
    font, fontBold, partySize, bodySize, textW, fit, draw, dots, checkbox, wrapLines, download,
  } = ctx;

  drawLogo(ctx, "GRAWE", rgb(0.05, 0.45, 0.2));
  draw("www.grawe.ro", left, height - 42, 8, font, muted);

  const title = "CERERE DE DESPAGUBIRE";
  draw(title, (width - textW(title, 15, fontBold)) / 2, height - 80, 15, fontBold);
  page.drawLine({
    start: { x: (width - textW(title, 15, fontBold)) / 2, y: height - 83 },
    end: { x: (width + textW(title, 15, fontBold)) / 2, y: height - 83 },
    thickness: 0.9,
    color: ink,
  });

  let y = height - 104;
  draw("LA DOSARUL DE DAUNA Nr.", left, y, 11, font);
  draw(
    fit(claim.numarDosar || "", 11, 220, fontBold) || "…………………………",
    left + textW("LA DOSARUL DE DAUNA Nr. ", 11, font),
    y,
    11,
    fontBold
  );

  y -= 22;
  y = drawParties(ctx, parties, y);

  y -= 16;
  const marca = String(claim.marca || "").trim();
  const model = String(claim.model || "").trim();
  let marcaVal = marca;
  let tipVal = model;
  if (!marcaVal && claim.marcaModel) {
    const parts = String(claim.marcaModel).trim().split(/\s+/);
    marcaVal = parts[0] || "";
    tipVal = parts.slice(1).join(" ") || "";
  }
  draw("proprietar al autovehiculului marca", left, y, bodySize, font);
  let cx = left + textW("proprietar al autovehiculului marca", bodySize, font) + 5;
  draw(fit(marcaVal, partySize, 70, fontBold) || "………", cx, y, partySize, fontBold);
  cx += 78;
  draw("tipul", cx, y, bodySize, font);
  cx += textW("tipul", bodySize, font) + 5;
  draw(fit(tipVal, partySize, 90, fontBold) || "………", cx, y, partySize, fontBold);
  cx += 100;
  draw("nr.", cx, y, bodySize, font);
  cx += textW("nr.", bodySize, font) + 5;
  draw(fit(claim.numarInmatriculare || "", partySize, 80, fontBold) || "………", cx, y, partySize, fontBold);

  y -= 15;
  draw("serie sasiu", left, y, bodySize, font);
  cx = left + textW("serie sasiu", bodySize, font) + 5;
  draw(fit(claim.vin || "", partySize, 220, fontBold) || "……………………", cx, y, partySize, fontBold);
  cx += 230;
  draw("tel.", cx, y, bodySize, font);
  cx += textW("tel.", bodySize, font) + 5;
  draw(fit(claim.telefonClient || "", partySize, 90, fontBold) || "…………", cx, y, partySize, fontBold);

  y -= 18;
  draw("va rog sa aprobati plata despagubirii prezentului dosar de dauna, astfel:", left, y, bodySize, font);
  y -= 16;
  checkbox(left, y);
  draw("avans, pe baza proformei anexate", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("partial, pe baza documentelor anexate", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("final, pe baza documentelor anexate", left + 14, y, 9.8, font);
  y -= 14;
  checkbox(left, y);
  draw("regie proprie pe baza devizului estimativ intocmit de reprezentantul Grawe Romania", left + 14, y, 9.8, font);

  y -= 18;
  draw("Pentru solutionarea dosarului de dauna anexez urmatoarele documente:", left, y, 10, fontBold);
  y -= 15;
  draw("FACTURA FISCALA NUMARUL _____", left, y, partySize, fontBold);
  y -= 14;
  draw("DEVIZ AUDATEX _____", left, y, partySize, fontBold);
  y -= 14;
  dots(left, y, contentW);

  y -= 18;
  draw("Solicit ca plata despagubirii sa se efectueze in contul:", left, y, 10.5, fontBold);
  y -= 16;
  y = drawPaymentTable(ctx, plata, y) - 14;

  const decls = [
    "Raspund de exactitatea, realitatea si corectitudinea actelor depuse.",
    "In cazul furtului: daca bunurile asigurate vor fi gasite, ma oblig sa restitui despagubirea primita sau, dupa caz, diferenta de despagubire.",
    "Prin plata despagubirii declar ca nu mai am alte pretentii fata de Grawe Romania Asigurare S.A. la acest dosar de dauna.",
    "Ma oblig sa restitui despagubirea primita, in cazul in care actele incheiate de organele competente sunt anulate.",
    "DECLAR PE PROPRIE RASPUNDERE CA NU MAI POSED ACEEASI FORMA DE ASIGURARE PENTRU ACEST AUTOVEHICUL INCHEIATA SI LA ALTE SOCIETATI DE ASIGURARE.",
  ];
  for (const d of decls) {
    for (const line of wrapLines(`- ${d}`, 8.1, contentW, font)) {
      draw(line, left, y, 8.1, font, muted);
      y -= 9.8;
    }
    y -= 1.5;
  }

  const footTop = 70;
  drawSignature(ctx, y, footTop);
  page.drawLine({ start: { x: left, y: footTop }, end: { x: right, y: footTop }, thickness: 1.4, color: ink });
  draw("Grawe Romania Asigurare S.A.  ·  www.grawe.ro", left, footTop - 14, 7, font, muted);
  draw("Societate administrata in sistem dualist  ·  Autorizata de ASF", left, footTop - 26, 6.5, font, muted);

  await download(claim, "cerere-despagubire-grawe");
}
