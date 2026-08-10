import * as XLSX from "xlsx";
import {
  parseEstimateText,
  parseEstimateXml,
  parseEstimateSheetRows,
} from "./audatexParse";

async function extractPdfText(arrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  // Vite: bundle worker next to the module
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Group by approximate Y so recapitulation labels stay on their own lines
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

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nu pot citi fișierul."));
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nu pot citi fișierul."));
    reader.readAsText(file);
  });
}

/**
 * Parse an uploaded Audatex/DAT estimate file.
 * @param {File} file
 * @returns {Promise<{ values: object, confidence: string, sourceHints: string[], format: string, rawPreview?: string }>}
 */
export async function parseEstimateFile(file) {
  if (!file) throw new Error("Selectează un fișier.");
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (name.endsWith(".pdf") || type === "application/pdf") {
    const buf = await readAsArrayBuffer(file);
    const text = await extractPdfText(buf);
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

  // Fallback: try as text
  const text = await readAsText(file);
  const result = parseEstimateText(text);
  return { ...result, rawPreview: text.slice(0, 1500) };
}
