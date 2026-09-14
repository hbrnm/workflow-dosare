import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  parseEstimateText,
  parseEstimateXml,
  parseEstimateSheetRows,
} from "./audatexParse";

let pdfWorkerReady = false;

async function ensurePdfWorker(pdfjs) {
  if (pdfWorkerReady || !pdfjs?.GlobalWorkerOptions) return;
  // Fallback to CDN to guarantee the worker loads even if Vite mangles the ?url import
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  pdfWorkerReady = true;
}

export async function extractPdfText(arrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  await ensurePdfWorker(pdfjs);
  let data;
  if (arrayBuffer instanceof Uint8Array && arrayBuffer.constructor.name === "Uint8Array") {
    data = arrayBuffer;
  } else if (arrayBuffer?.buffer) {
    data = new Uint8Array(arrayBuffer.buffer, arrayBuffer.byteOffset, arrayBuffer.byteLength);
  } else {
    data = new Uint8Array(arrayBuffer);
  }
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const linesMap = new Map();
    for (const it of content.items) {
      const str = it.str || "";
      if (!str.trim() && str !== " " && str !== "\u00a0") continue;
      const y = it.transform ? Math.round(it.transform[5]) : 0;
      const x = it.transform ? Math.round(it.transform[4]) : 0;
      let foundKey = null;
      for (const k of linesMap.keys()) {
        if (Math.abs(k - y) <= 3) {
          foundKey = k;
          break;
        }
      }
      const key = foundKey !== null ? foundKey : y;
      if (!linesMap.has(key)) linesMap.set(key, []);
      linesMap.get(key).push({ x, str });
    }
    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const rows = sortedY.map((y) => {
      const sortedX = linesMap.get(y).sort((a, b) => a.x - b.x);
      return sortedX.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
    }).filter(Boolean);
    pages.push(rows.join("\n"));
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
      throw new Error("PDF-ul nu conține text selectabil (scan?). Completează manual mai jos sau folosește OCR.");
    }
    const result = parseEstimateText(text);
    return { ...result, rawPreview: text.slice(0, 1500), fullText: text };
  }

  if (name.endsWith(".xml") || type.includes("xml")) {
    const text = await readAsText(file);
    const result = parseEstimateXml(text);
    return { ...result, rawPreview: text.slice(0, 1500), fullText: text };
  }

  if (name.endsWith(".csv") || type.includes("csv") || type.includes("text/plain") || name.endsWith(".txt")) {
    const text = await readAsText(file);
    const result = name.endsWith(".csv")
      ? parseEstimateSheetRows(text.split(/\r?\n/).map((l) => l.split(/[,;]/)))
      : parseEstimateText(text);
    return { ...result, rawPreview: text.slice(0, 1500), fullText: text };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("spreadsheet") || type.includes("excel")) {
    const XLSX = await import("xlsx");
    const buf = await readAsArrayBuffer(file);
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const result = parseEstimateSheetRows(rows);
    return { ...result, rawPreview: JSON.stringify(rows.slice(0, 20)), fullText: JSON.stringify(rows) };
  }

  throw new Error("Format fișier neacceptat. Încarcă un fișier PDF, XML, XLSX sau CSV.");
}
