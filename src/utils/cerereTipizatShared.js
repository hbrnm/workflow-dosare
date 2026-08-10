/**
 * Helpers comune pentru tipizate „Cerere despăgubire” (pdf-lib).
 */

import { resolveCerereDespagubireParties, CERERE_ATELIER_PLATA } from "./cerereDespagubire";

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

export const sd = (t) => stripDiacritics(t || "—");

export function resolvePlataOptions(options = null) {
  const plata = options?.plata || {};
  return {
    beneficiar: String(
      plata.beneficiar || options?.atelierNume || CERERE_ATELIER_PLATA.beneficiar
    ).trim(),
    banca: String(plata.banca || CERERE_ATELIER_PLATA.banca).trim(),
    cont: String(plata.cont || CERERE_ATELIER_PLATA.cont).trim(),
  };
}

export async function createTipizatDoc() {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
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

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const ink = rgb(0, 0, 0);
  const muted = rgb(0.18, 0.18, 0.18);
  const lineGray = rgb(0.35, 0.35, 0.35);
  const left = 34;
  const right = width - 34;
  const contentW = right - left;

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
  const checkbox = (x, yy, size = 9) => {
    page.drawRectangle({
      x,
      y: yy - 1.2,
      width: size,
      height: size,
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
    const pdfBytes = await pdfDoc.save();
    const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
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
    rgb,
    ink,
    muted,
    left,
    right,
    contentW,
    font,
    fontBold,
    textW,
    fit,
    draw,
    dots,
    checkbox,
    wrapLines,
    download,
    parties: null,
    claim: null,
  };
}

export function attachClaimContext(ctx, claim, options = null) {
  ctx.claim = claim;
  ctx.parties = resolveCerereDespagubireParties(claim);
  ctx.plata = resolvePlataOptions(options);
  return ctx;
}

/** Linie Subsemnatul + reprezentant (aceeași convenție ca Omniasig). */
export function drawPartiesLine(ctx, y, partySize = 9.8) {
  const { left, right, font, fontBold, draw, dots, textW, fit, parties } = ctx;
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

/** Tabel plată atelier (beneficiar / bancă / IBAN). */
export function drawPaymentTable(ctx, y, opts = {}) {
  const {
    left,
    right,
    contentW,
    page,
    ink,
    rgb,
    fontBold,
    draw,
    fit,
    plata,
  } = ctx;
  const labelSize = opts.labelSize || 10;
  draw(opts.label || "Plata se va efectua in favoarea:", left, y, labelSize, fontBold);
  y -= 8;

  const tableTop = y;
  const rowH = 17;
  const headerH = 15;
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

  const headerY = tableTop - 10.5;
  draw("BENEFICIAR", left + 8, headerY, 8.5, fontBold);
  draw("BANCA & CONT / CASIERIE", left + colBen + 8, headerY, 8.5, fontBold);
  draw("SUMA", left + colBen + colBanca + 18, headerY, 8.5, fontBold);

  const r1Y = tableTop - headerH - 11.5;
  draw(fit(plata.beneficiar, 9.5, colBen - 14, fontBold), left + 6, r1Y, 9.5, fontBold);
  draw(fit(plata.banca, 10, colBanca - 14, fontBold), left + colBen + 6, r1Y, 10, fontBold);
  draw(
    fit(plata.cont, 10, colBanca - 14, fontBold),
    left + colBen + 6,
    tableTop - headerH - rowH - 11.5,
    10,
    fontBold
  );

  return tableTop - tableH;
}
