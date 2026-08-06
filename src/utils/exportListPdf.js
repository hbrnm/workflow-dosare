import { fmtDateTime } from "./dateUtils";
import { stripPdfText } from "./pdfText";

function drawTableHeader(doc, cols, colWidths, x0, y, rowH, fontSize) {
  doc.setFillColor(35, 40, 47);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  doc.setFont(undefined, "bold");

  let x = x0;
  cols.forEach((col, i) => {
    doc.rect(x, y - rowH + 1.5, colWidths[i], rowH, "F");
    const label = stripPdfText(col);
    const line = doc.splitTextToSize(label, colWidths[i] - 2)[0] || "";
    doc.text(line, x + 1.2, y - 1);
    x += colWidths[i];
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");
}

function drawTableRow(doc, cols, colWidths, row, x0, y, rowH, fontSize, alt) {
  if (alt) {
    doc.setFillColor(248, 248, 248);
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    doc.rect(x0, y - rowH + 1.5, totalW, rowH, "F");
  }

  doc.setFontSize(fontSize);
  let x = x0;
  cols.forEach((col, i) => {
    const val = stripPdfText(String(row[col] ?? "—"));
    const line = doc.splitTextToSize(val, colWidths[i] - 2)[0] || "—";
    doc.text(line, x + 1.2, y - 1);
    x += colWidths[i];
  });
}

/**
 * Export tabular rows to a landscape PDF.
 * @param {{ title?: string, subtitle?: string, rows: object[], columns?: string[], filename: string }} opts
 */
export async function downloadTablePdf({ title = "Lista dosare", subtitle = "", rows = [], columns = null, filename }) {
  if (!rows?.length || !filename) return false;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const cols = columns || Object.keys(rows[0]);
  const tableW = pageW - margin * 2;
  const colW = tableW / cols.length;
  const colWidths = cols.map(() => colW);
  const rowH = 6;
  const fontSize = cols.length > 9 ? 6.5 : cols.length > 7 ? 7 : 8;
  let y = margin + 4;

  const renderPageTitle = () => {
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(stripPdfText(title), margin, y);
    y += 5.5;
    const meta = subtitle || `Generat ${fmtDateTime(new Date())} · ${rows.length} inregistrari`;
    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(90);
    doc.text(stripPdfText(meta), margin, y);
    doc.setTextColor(0);
    y += 6;
  };

  renderPageTitle();
  drawTableHeader(doc, cols, colWidths, margin, y, rowH, fontSize);
  y += rowH + 1;

  rows.forEach((row, idx) => {
    if (y > pageH - margin - rowH) {
      doc.addPage();
      y = margin + 4;
      renderPageTitle();
      drawTableHeader(doc, cols, colWidths, margin, y, rowH, fontSize);
      y += rowH + 1;
    }
    drawTableRow(doc, cols, colWidths, row, margin, y, rowH, fontSize, idx % 2 === 1);
    y += rowH;
  });

  doc.save(filename);
  return true;
}

/**
 * PDF cu mai multe sectiuni (cate un tabel per modul export).
 * @param {{ sections: { title: string, rows: object[] }[], filename: string, documentTitle?: string }} opts
 */
export async function downloadMultiSectionPdf({ sections = [], filename, documentTitle = "Export Workflow Dosare" }) {
  const valid = sections.filter((s) => s.rows?.length);
  if (!valid.length || !filename) return false;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = margin + 4;
  let isFirstSection = true;

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin + 4;
    }
  };

  if (documentTitle) {
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(stripPdfText(documentTitle), margin, y);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(90);
    doc.text(stripPdfText(`Generat ${fmtDateTime(new Date())}`), margin, y);
    doc.setTextColor(0);
    y += 8;
  }

  valid.forEach((section, sectionIdx) => {
    const cols = Object.keys(section.rows[0]);
    const tableW = pageW - margin * 2;
    const colW = tableW / cols.length;
    const colWidths = cols.map(() => colW);
    const rowH = 6;
    const fontSize = cols.length > 9 ? 6.5 : cols.length > 7 ? 7 : 8;

    if (!isFirstSection) y += 4;
    isFirstSection = false;
    ensureSpace(rowH * 3 + 8);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(stripPdfText(section.title), margin, y);
    y += 5;

    drawTableHeader(doc, cols, colWidths, margin, y, rowH, fontSize);
    y += rowH + 1;

    section.rows.forEach((row, idx) => {
      if (y > pageH - margin - rowH) {
        doc.addPage();
        y = margin + 4;
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(stripPdfText(`${section.title} (continuare)`), margin, y);
        y += 5;
        drawTableHeader(doc, cols, colWidths, margin, y, rowH, fontSize);
        y += rowH + 1;
      }
      drawTableRow(doc, cols, colWidths, row, margin, y, rowH, fontSize, idx % 2 === 1);
      y += rowH;
    });

    if (sectionIdx < valid.length - 1) y += 2;
  });

  doc.save(filename);
  return true;
}
