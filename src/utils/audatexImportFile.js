import * as XLSX from "xlsx";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  parseEstimateText,
  parseEstimateXml,
  parseEstimateSheetRows,
} from "./audatexParse";

let pdfWorkerReady = false;

async function ensurePdfWorker(pdfjs) {
  if (pdfWorkerReady || !pdfjs?.GlobalWorkerOptions) return;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  pdfWorkerReady = true;
}

async function extractPdfText(arrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  await ensurePdfWorker(pdfjs);
  const data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const rows = [];
    let currentY = null;
    let buf = [];
    for (const it of content.items) {
      const str = it.str || "";
      if (!str.trim()) {
        if (str === " " || str === "\u00a0") buf.push(" ");
        continue;
      }
      const y = it.transform ? Math.round(it.transform[5]) : 0;
      if (currentY == null || Math.abs(y - currentY) <= 2) {
        buf.push(str);
        currentY = y;
      } else {
        rows.push(buf.join("").replace(/\s+/g, " ").trim());
        buf = [str];
        currentY = y;
      }
    }
    if (buf.length) rows.push(buf.join("").replace(/\s+/g, " ").trim());
    pages.push(rows.filter(Boolean).join("\n"));
  }
  return pages.join("\n");
}

async function readAsArrayBuffer(file) {
  if (typeof file?.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nu pot citi fișierul."));
    reader.readAsArrayBuffer(file);
  });
}

async function readAsText(file) {
  if (typeof file?.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nu pot citi fișierul."));
    reader.readAsText(file);
  });
}

/**
 * Parse an uploaded Audatex/DAT estimate file.
 */
export async function parseEstimateFile(file) {
  if (!file) throw new Error("Selectează un fișier.");
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (name.endsWith(".pdf") || type === "application/pdf") {
    const buf = await readAsArrayBuffer(file);
    let text = "";
    try {
      text = await extractPdfText(buf);
    } catch (err) {
      const msg = err?.message || String(err);
      if (/worker|fake worker/i.test(msg)) {
        throw new Error("Nu pot citi PDF-ul (worker). Reîncarcă pagina și încearcă din nou.");
      }
      throw new Error(`Nu pot citi PDF-ul: ${msg}`);
    }
    if (!text || text.replace(/\s/g, "").length < 80) {
      throw new Error("PDF-ul nu conține text selectabil (scan?). Exportă din Audatex ca PDF nativ.");
    }
    const result = parseEstimateText(text);
    return { ...result, rawPreview: text.slice(0, 1500) };
  }

  if (name.endsWith(".xml") || type.includes("xml")) {
    const text = await readAsText(file);
    const result = parseEstimateXml(text);
    return { ...result, rawPreview: text.slice(0, 1500) };
  }

  if (name.endsWith(".csv") || type.includes("csv") || type.includes("text/plain") || name.endsWith(".txt")) {
    const text = await readAsText(file);
    const result = name.endsWith(".csv")
      ? parseEstimateSheetRows(text.split(/\r?\n/).map((l) => l.split(/[,;]/)))
      : parseEstimateText(text);
    return { ...result, rawPreview: text.slice(0, 1500) };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("spreadsheet") || type.includes("excel")) {
    const buf = await readAsArrayBuffer(file);
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const result = parseEstimateSheetRows(rows);
    return { ...result, rawPreview: rows.slice(0, 40).map((r) => r.join(" | ")).join("\n") };
  }

  const text = await readAsText(file);
  const result = parseEstimateText(text);
  return { ...result, rawPreview: text.slice(0, 1500) };
}
