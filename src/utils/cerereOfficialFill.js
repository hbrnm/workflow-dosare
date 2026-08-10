/**
 * Completare tipizate oficiale PDF (overlay text pe template).
 * Aceeași convenție Omniasig: delegat / proprietar / plată atelier.
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

const sd = (t) => stripDiacritics(t || "");

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

async function loadTemplateDoc(templatePath) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const base = import.meta.env.BASE_URL || "/";
  const res = await fetch(`${base}${templatePath}`);
  if (!res.ok) throw new Error(`Nu pot încărca tipizatul (${res.status}).`);
  const pdfDoc = await PDFDocument.load(await res.arrayBuffer());
  pdfDoc.registerFontkit(fontkit);

  let fontBold;
  try {
    const fontRes = await fetch(`${base}fonts/LiberationSerif-Bold.ttf`);
    if (!fontRes.ok) throw new Error("font");
    fontBold = await pdfDoc.embedFont(await fontRes.arrayBuffer(), { subset: true });
  } catch {
    fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  }

  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();
  const ink = rgb(0, 0, 0);
  const white = rgb(1, 1, 1);

  /** Coordonate top-left (y în jos), ca măsurătorile pymupdf. */
  const wipe = (x0, y0, x1, y1, padX = 0.4, padY = 0.4) => {
    page.drawRectangle({
      x: x0 - padX,
      y: height - (y1 + padY),
      width: x1 - x0 + padX * 2,
      height: y1 - y0 + padY * 2,
      color: white,
      borderWidth: 0,
    });
  };

  const fill = (text, x, baselineTop, opts = {}) => {
    const raw = sd(text);
    if (!raw) return;
    const size = opts.size || 9.5;
    let content = raw;
    const maxW = opts.maxW || 0;
    if (maxW > 0) {
      while (content.length > 3 && fontBold.widthOfTextAtSize(content, size) > maxW) {
        content = content.slice(0, -1);
      }
      if (content !== raw) content = `${content.slice(0, -1)}.`;
    }
    if (opts.wipe) wipe(...opts.wipe, opts.padX, opts.padY);
    page.drawText(content, {
      x,
      y: height - baselineTop,
      size,
      font: fontBold,
      color: ink,
    });
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

  return { fill, wipe, download, height, fontBold };
}

/**
 * Asirom — tipizat oficial.
 * Asigurat/Pagubit = proprietar; Subsemnatul = delegat (logica Omniasig).
 */
export async function fillCerereAsiromOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const { fill, download } = await loadTemplateDoc("forms/Cerere-Despagubire-Asirom.pdf");

  // Nr. dosar — după label (baseline ~102)
  fill(claim.numarDosar || "", 128, 102.5, {
    size: 10,
    maxW: 200,
    wipe: [125, 94, 360, 106],
  });

  // Bunul avariat
  const bun = [claim.numarInmatriculare, claim.marcaModel].filter(Boolean).join(" / ");
  fill(bun, 145, 128.5, {
    size: 9.5,
    maxW: 280,
    wipe: [142, 120, 500, 133],
  });

  // Asigurat / Pagubit = proprietar
  fill(parties.proprietar || "", 165, 141.5, {
    size: 9.5,
    maxW: 320,
    wipe: [162, 133, 530, 146],
  });

  // Subsemnatul = delegat / persoană (șterge doar punctele, nu labelul)
  fill(parties.subsemnatul || "", 146, 178.8, {
    size: 9.5,
    maxW: 180,
    wipe: [143, 172, 330, 183.5],
    padY: 0.1,
  });

  // Anexe — pe liniile „In original / In fotocopie”
  fill("FACTURA FISCALA NUMARUL _____", 128, 298.2, {
    size: 9,
    wipe: [126, 291, 545, 301.5],
    padY: 0.1,
  });
  fill("DEVIZ AUDATEX _____", 134, 339.5, {
    size: 9,
    wipe: [132, 332, 545, 343],
    padY: 0.1,
  });

  // Cont bancar — rândul 1: IBAN + bancă/titular pe spațiul scurt
  fill(plata.cont, 205, 457.5, {
    size: 8,
    maxW: 180,
    wipe: [202, 450, 388, 461],
    padY: 0.1,
  });
  fill(`${plata.banca} / ${plata.beneficiar}`, 420, 457.5, {
    size: 7,
    maxW: 155,
    wipe: [417, 450, 578, 461],
    padY: 0.1,
  });

  await download(claim, "cerere-despagubire-asirom");
}

/**
 * Groupama — tipizat oficial Anexa 12A.
 * Asigurat/Pagubit = proprietar; reprezentat prin = delegat.
 */
export async function fillCerereGroupamaOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const { fill, wipe, download } = await loadTemplateDoc(
    "forms/Cerere-Despagubire-Groupama.pdf"
  );

  // Nr. dosar — după "Nr."
  fill(claim.numarDosar || "", 342, 102, {
    size: 11,
    maxW: 160,
    wipe: [339, 93, 510, 107],
  });

  // Asiguratul / Pagubitul (nume) — celulă între label și „proprietar”
  fill(parties.proprietar || "", 150, 129, {
    size: 9,
    maxW: 265,
    wipe: [148, 120, 420, 133],
    padY: 0.2,
  });

  // nr. de înmatriculare
  fill(claim.numarInmatriculare || "", 118, 143, {
    size: 9.5,
    maxW: 170,
    wipe: [115, 135, 295, 147],
    padY: 0.2,
  });

  // reprezentat prin = delegat / subsemnatul
  fill(parties.subsemnatul || "", 358, 143, {
    size: 9,
    maxW: 185,
    wipe: [355, 135, 550, 147],
    padY: 0.2,
  });

  // Anexe
  fill("FACTURA FISCALA NUMARUL _____", 46, 238, {
    size: 9.5,
    wipe: [44, 230, 550, 243],
    padY: 0.15,
  });
  fill("DEVIZ AUDATEX _____", 46, 252, {
    size: 9.5,
    wipe: [44, 244, 550, 257],
    padY: 0.15,
  });

  // IBAN pe primul virament — text continuu peste casete
  wipe(155, 328, 500, 345, 0.2, 0.2);
  fill(plata.cont, 158, 341, { size: 9, maxW: 330 });

  // banca + titular + beneficiar (rând 1)
  fill(plata.banca, 102, 355, {
    size: 9,
    maxW: 140,
    wipe: [100, 347, 248, 358],
    padY: 0.15,
  });
  fill(plata.beneficiar, 295, 355, {
    size: 8.5,
    maxW: 200,
    wipe: [292, 347, 530, 358],
    padY: 0.15,
  });
  fill(plata.beneficiar, 98, 369, {
    size: 9,
    maxW: 140,
    wipe: [96, 361, 244, 373],
    padY: 0.15,
  });

  await download(claim, "cerere-despagubire-groupama");
}

/**
 * Grawe — tipizat oficial.
 * Asiguratul/pagubitul = proprietar; semnatar (delegat) lângă SEMNATURA;
 * plată atelier pe banca/IBAN/titular.
 */
export async function fillCerereGraweOfficial(claim, options = null) {
  const parties = resolveCerereDespagubireParties(claim);
  const plata = resolvePlata(options);
  const { fill, download } = await loadTemplateDoc("forms/Cerere-Despagubire-Grawe.pdf");

  const marca = String(claim.marca || "").trim();
  const model = String(claim.model || "").trim();
  let marcaVal = marca;
  let tipVal = model;
  if (!marcaVal && claim.marcaModel) {
    const parts = String(claim.marcaModel).trim().split(/\s+/);
    marcaVal = parts[0] || "";
    tipVal = parts.slice(1).join(" ") || "";
  }

  // Dosar nr — pe underscore
  fill(claim.numarDosar || "", 190, 120, {
    size: 10.5,
    maxW: 145,
    wipe: [186, 113, 340, 123.5],
    padY: 0.1,
  });

  // Asiguratul/pagubitul = proprietar
  fill(parties.proprietar || "", 155, 149.5, {
    size: 9.5,
    maxW: 150,
    wipe: [150, 142, 310, 153],
    padY: 0.1,
  });

  // marca / tip / nr
  fill(marcaVal, 220, 165.5, {
    size: 9,
    maxW: 70,
    wipe: [217, 158, 292, 169],
    padY: 0.1,
  });
  fill(tipVal, 325, 165.5, {
    size: 9,
    maxW: 70,
    wipe: [322, 158, 400, 169],
    padY: 0.1,
  });
  fill(claim.numarInmatriculare || "", 490, 165.5, {
    size: 9.5,
    maxW: 70,
    wipe: [487, 158, 560, 169],
    padY: 0.1,
  });

  // VIN
  fill(claim.vin || "", 125, 181.5, {
    size: 9,
    maxW: 195,
    wipe: [119, 174, 300, 185],
    padY: 0.1,
  });

  // Anexe
  fill("FACTURA FISCALA NUMARUL _____", 60, 326, {
    size: 9.5,
    wipe: [58, 319, 485, 330],
    padY: 0.1,
  });
  fill("DEVIZ AUDATEX _____", 60, 346, {
    size: 9.5,
    wipe: [58, 339, 485, 350],
    padY: 0.1,
  });

  // Banca / IBAN / titular — wipe doar underscore-urile
  fill(plata.banca, 370, 400.5, {
    size: 9,
    maxW: 165,
    wipe: [367, 393, 540, 403.5],
    padY: 0.1,
  });
  fill(plata.cont, 82, 420.5, {
    size: 9.5,
    maxW: 165,
    wipe: [80, 413, 252, 423.5],
    padY: 0.1,
  });
  fill(plata.beneficiar, 372, 420.5, {
    size: 8.5,
    maxW: 165,
    wipe: [369, 413, 540, 423.5],
    padY: 0.1,
  });

  // Semnătură — numele subsemnatului (delegat), fără a șterge labelul
  fill(parties.subsemnatul || "", 383, 776.5, {
    size: 9,
    maxW: 160,
    wipe: [381, 768, 530, 779],
    padY: 0.1,
  });

  await download(claim, "cerere-despagubire-grawe");
}
