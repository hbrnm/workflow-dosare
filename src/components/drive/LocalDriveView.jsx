import React, { useState, useEffect, useMemo, useRef } from "react";
import JSZip from "jszip";
import {
  HardDrive, Folder, File, Image, Film, FileText, CheckCircle2,
  AlertCircle, AlertTriangle, RefreshCw, ExternalLink, Sparkles, Plus, Copy,
  MessageCircle, Upload, ChevronRight, Download, RotateCw, RotateCcw, Maximize2,
  Search, X, ArrowUpRight, Check, Car, User, Phone, ShieldCheck,
  Code, FileSpreadsheet, FileCode2, WrapText, Loader2,
  Building2, Calendar, CreditCard, Receipt, Eye, LayoutGrid, List
} from "lucide-react";
import {
  getDriveCars,
  getDriveCarDetails,
  openCarInExplorer,
  openRootInExplorer,
  updateDriveCarStatus,
  organizeDriveFiles,
  uploadFilesToDrive,
  getDriveTemplates,
  attachDriveTemplate,
  getDriveFileUrl,
  createDriveCar,
  resetLocalDriveUrl,
} from "../../utils/localDriveService";
import { normalizePlate } from "../../utils/plateSchedule";
import { emptyClaim, generateTrackingToken } from "../../utils/claimModel";
import { generateUUID, todayISO, nowISO, uid } from "../../utils/dateUtils";
import { INSURERS } from "../../constants/config";
import { extractPdfText } from "../../utils/audatexImportFile";
import { extractEstimateMetadataFromText } from "../../utils/aiDocumentExtractor";
import ClaimPlate from "../common/ClaimPlate";
import AppButton from "../common/AppButton";

const CATEGORIES = [
  { key: "01_Acte_Client", label: "01 Acte Client", icon: "📑", desc: "Buletin, permis, talon, procuri, RCA" },
  { key: "02_Asigurator_si_Dauna", label: "02 Asigurator & Daună", icon: "📄", desc: "Calculații, devize, acorduri, note" },
  { key: "03_Foto_Dauna", label: "03 Foto Daună", icon: "📷", desc: "Fotografii și videoclipuri daune" },
  { key: "04_Reconstatare", label: "04 Reconstatare", icon: "🔧", desc: "Acte și poze reconstatare / demontare" },
  { key: "05_Dosar_Final", label: "05 Dosar Final", icon: "🏁", desc: "Facturi finale, chitanțe, procese-verbale" },
];

export function mapLocalStatusToOnline(localStatus) {
  if (!localStatus) return "deschidere";
  const s = String(localStatus).toLowerCase().trim();
  if (s.includes("piese")) return "piese_comandate";
  if (s.includes("programat")) return "programat";
  if (s.includes("lucru") || s.includes("reparatie") || s.includes("tinichigerie") || s.includes("vopsitorie")) return "in_lucru";
  if (s.includes("accept") || s.includes("plata")) return "accept_plata";
  if (s.includes("final") || s.includes("facturat") || s.includes("ridicat")) return "facturat";
  return "deschidere";
}

export function mapOnlineStatusToLocal(onlineStatus) {
  if (!onlineStatus) return "Constatare";
  switch (onlineStatus) {
    case "deschidere": return "Constatare";
    case "piese_comandate": return "Așteaptă piese";
    case "programat": return "Programat";
    case "in_lucru": return "În lucru";
    case "accept_plata": return "Accept plată";
    case "facturat": return "Finalizat";
    default: return "Constatare";
  }
}

function getXmlTag(str, tag) {
  if (!str) return "";
  const reg = new RegExp("<([a-zA-Z0-9_-]+:)?" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1?" + tag + ">", "i");
  const m = str.match(reg);
  return m ? m[2].trim() : "";
}

function getXmlTags(str, tag) {
  if (!str) return [];
  const reg = new RegExp("<([a-zA-Z0-9_-]+:)?" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1?" + tag + ">", "gi");
  const res = [];
  let m;
  while ((m = reg.exec(str)) !== null) {
    res.push(m[2].trim());
  }
  return res;
}

function parseEFacturaXml(raw) {
  if (!raw || !raw.includes("Invoice")) return null;
  try {
    const isUBL = raw.includes("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2") || raw.includes("efactura");
    if (!isUBL) return null;

    const supplierParty = getXmlTag(raw, "AccountingSupplierParty");
    const supplier = {
      name: getXmlTag(supplierParty, "RegistrationName") || getXmlTag(supplierParty, "Name"),
      cif: getXmlTag(supplierParty, "CompanyID") || getXmlTag(supplierParty, "ID"),
      regCom: getXmlTag(supplierParty, "CompanyID"),
      legalForm: getXmlTag(supplierParty, "CompanyLegalForm"),
      street: getXmlTag(supplierParty, "StreetName"),
      city: getXmlTag(supplierParty, "CityName"),
      subentity: getXmlTag(supplierParty, "CountrySubentity"),
      country: getXmlTag(supplierParty, "IdentificationCode"),
      email: getXmlTag(supplierParty, "ElectronicMail") || getXmlTag(supplierParty, "EndpointID"),
      contactName: getXmlTag(supplierParty, "Name"),
      phone: getXmlTag(supplierParty, "Telephone")
    };

    const customerParty = getXmlTag(raw, "AccountingCustomerParty");
    const customer = {
      name: getXmlTag(customerParty, "RegistrationName") || getXmlTag(customerParty, "Name"),
      cif: getXmlTag(customerParty, "CompanyID") || getXmlTag(customerParty, "ID"),
      regCom: getXmlTag(customerParty, "CompanyID"),
      street: getXmlTag(customerParty, "StreetName"),
      city: getXmlTag(customerParty, "CityName"),
      subentity: getXmlTag(customerParty, "CountrySubentity"),
      country: getXmlTag(customerParty, "IdentificationCode"),
      phone: getXmlTag(customerParty, "Telephone"),
      email: getXmlTag(customerParty, "ElectronicMail"),
      contactName: getXmlTag(customerParty, "Name")
    };

    const paymentMeans = getXmlTag(raw, "PaymentMeans");
    const bank = {
      iban: getXmlTag(paymentMeans, "ID"),
      bankName: getXmlTag(paymentMeans, "Name"),
      paymentCode: getXmlTag(paymentMeans, "PaymentMeansCode")
    };

    const legalTotal = getXmlTag(raw, "LegalMonetaryTotal");
    const taxTotal = getXmlTag(raw, "TaxTotal");
    const taxSubtotal = getXmlTag(taxTotal, "TaxSubtotal");

    const totals = {
      netAmount: getXmlTag(legalTotal, "LineExtensionAmount") || getXmlTag(legalTotal, "TaxExclusiveAmount"),
      vatAmount: getXmlTag(taxTotal, "TaxAmount"),
      vatPercent: getXmlTag(taxSubtotal, "Percent") || "19",
      grossAmount: getXmlTag(legalTotal, "TaxInclusiveAmount") || getXmlTag(legalTotal, "PayableAmount"),
      currency: getXmlTag(raw, "DocumentCurrencyCode") || "RON"
    };

    const notes = getXmlTags(raw, "Note").filter(Boolean);

    const lineBlocks = getXmlTags(raw, "InvoiceLine");
    const lines = lineBlocks.map((l) => {
      const item = getXmlTag(l, "Item");
      const price = getXmlTag(l, "Price");
      const unitCodeMatch = l.match(/unitCode="([^"]+)"/i);
      return {
        id: getXmlTag(l, "ID"),
        name: getXmlTag(item, "Name"),
        description: getXmlTag(item, "Description"),
        quantity: getXmlTag(l, "InvoicedQuantity") || "1",
        unitCode: unitCodeMatch ? unitCodeMatch[1] : "buc",
        price: getXmlTag(price, "PriceAmount"),
        netAmount: getXmlTag(l, "LineExtensionAmount"),
        vatPercent: getXmlTag(item, "Percent") || totals.vatPercent
      };
    });

    return {
      seriesNumber: getXmlTag(raw, "ID"),
      issueDate: getXmlTag(raw, "IssueDate"),
      dueDate: getXmlTag(raw, "DueDate"),
      typeCode: getXmlTag(raw, "InvoiceTypeCode"),
      notes,
      supplier,
      customer,
      bank,
      totals,
      lines
    };
  } catch {
    return null;
  }
}

function formatXml(sourceXml) {
  if (!sourceXml) return "";
  try {
    let formatted = "";
    let indent = 0;
    const tab = "  ";
    const xml = sourceXml.replace(/>\s*</g, "><");
    const tokens = xml.split(/(<[^>]+>)/g).filter((t) => t.trim().length > 0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith("</")) {
        indent = Math.max(0, indent - 1);
        formatted += tab.repeat(indent) + token + "\n";
      } else if (
        token.startsWith("<") &&
        !token.endsWith("/>") &&
        !token.startsWith("<?") &&
        !token.startsWith("<!")
      ) {
        if (
          i + 2 < tokens.length &&
          !tokens[i + 1].startsWith("<") &&
          tokens[i + 2].startsWith("</")
        ) {
          formatted += tab.repeat(indent) + token + tokens[i + 1] + tokens[i + 2] + "\n";
          i += 2;
        } else {
          formatted += tab.repeat(indent) + token + "\n";
          indent++;
        }
      } else {
        formatted += tab.repeat(indent) + token + "\n";
      }
    }
    return formatted.trim();
  } catch {
    return sourceXml;
  }
}

async function parseDocxFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Structura DOCX este invalidă (lipsește document.xml)");
  const xmlString = await docFile.async("string");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const body = xmlDoc.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("Lipsește corpul documentului Word");

  const elements = [];
  const children = body.childNodes;

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeName === "w:p") {
      const textNodes = node.getElementsByTagName("w:t");
      let pText = "";
      for (let t = 0; t < textNodes.length; t++) {
        pText += textNodes[t].textContent || "";
      }
      pText = pText.trim();

      if (pText) {
        const bTag = node.getElementsByTagName("w:b");
        const isBold = bTag && bTag.length > 0;
        const pStyle = node.getElementsByTagName("w:pStyle")[0];
        const styleVal = pStyle ? pStyle.getAttribute("w:val") || "" : "";
        const isHeading =
          styleVal.toLowerCase().includes("heading") ||
          styleVal.toLowerCase().includes("titlu") ||
          isBold;

        elements.push({
          type: "p",
          text: pText,
          isHeading,
          isBold,
        });
      }
    } else if (node.nodeName === "w:tbl") {
      const rows = [];
      const trNodes = node.getElementsByTagName("w:tr");
      for (let r = 0; r < trNodes.length; r++) {
        const rowCells = [];
        const tcNodes = trNodes[r].getElementsByTagName("w:tc");
        for (let c = 0; c < tcNodes.length; c++) {
          const cTextNodes = tcNodes[c].getElementsByTagName("w:t");
          let cellText = "";
          for (let ct = 0; ct < cTextNodes.length; ct++) {
            cellText += cTextNodes[ct].textContent || "";
          }
          rowCells.push(cellText.trim());
        }
        if (rowCells.some((text) => text.length > 0)) {
          rows.push(rowCells);
        }
      }
      if (rows.length > 0) {
        elements.push({ type: "tbl", rows });
      }
    }
  }
  return elements;
}

function LocalDocumentPreviewer({ file, fileUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [invoiceData, setInvoiceData] = useState(null);
  const [viewMode, setViewMode] = useState("formatted"); // "formatted" | "xml"
  const [docxElements, setDocxElements] = useState([]);
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fileName = file?.name || "";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const fileSizeMb = file?.size ? (file.size / (1024 * 1024)).toFixed(2) : "0";

  useEffect(() => {
    setError(null);
    setTextContent("");
    setInvoiceData(null);
    setViewMode("formatted");
    setDocxElements([]);
    setSearchQuery("");

    if (!fileUrl) return;
    if (ext === "pdf") return;

    if (["xml", "stc", "txt", "csv", "json", "log", "ini"].includes(ext)) {
      setLoading(true);
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((raw) => {
          if (ext === "xml") {
            const parsedInv = parseEFacturaXml(raw);
            if (parsedInv) {
              setInvoiceData(parsedInv);
              setViewMode("formatted");
            } else {
              setViewMode("xml");
            }
            setTextContent(formatXml(raw));
          } else {
            setTextContent(raw);
          }
        })
        .catch((err) => setError(`Eroare citire fișier: ${err.message}`))
        .finally(() => setLoading(false));
    } else if (ext === "docx") {
      setLoading(true);
      parseDocxFromUrl(fileUrl)
        .then((elements) => setDocxElements(elements))
        .catch((err) => setError(`Eroare Word: ${err.message}`))
        .finally(() => setLoading(false));
    }
  }, [fileUrl, ext]);

  const handleCopy = () => {
    let copyText = "";
    if (textContent) {
      copyText = textContent;
    } else if (docxElements.length > 0) {
      copyText = docxElements
        .map((el) => {
          if (el.type === "p") return el.text;
          if (el.type === "tbl") return el.rows.map((r) => r.join("\t")).join("\n");
          return "";
        })
        .join("\n\n");
    }
    if (copyText) {
      navigator.clipboard?.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. PDF Inline Preview
  if (ext === "pdf") {
    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/60 text-xs shrink-0">
          <div className="flex items-center gap-2 font-medium text-[var(--app-text-strong)] truncate">
            <FileText size={15} className="text-red-500 shrink-0" />
            <span className="truncate font-mono text-[11px]">{fileName}</span>
            <span className="text-[10px] text-[var(--app-muted)] shrink-0 font-normal">
              ({fileSizeMb} MB)
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
              title="Deschide în tab nou"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Deschide</span>
            </a>
            <a
              href={fileUrl}
              download={fileName}
              className="p-1.5 rounded-lg hover:bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors inline-flex items-center gap-1 font-medium text-[11px]"
              title="Descarcă PDF"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Descarcă</span>
            </a>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative bg-neutral-900/5">
          <iframe
            title={fileName}
            src={`${fileUrl}#view=FitH`}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  // 2. XML, STC (Audatex), TXT, CSV, JSON Code/Text/Invoice Preview
  if (["xml", "stc", "txt", "csv", "json", "log", "ini"].includes(ext)) {
    const isEFactura = ext === "xml" && !!invoiceData;
    const lines = textContent ? textContent.split("\n") : [];
    const filteredLines = searchQuery
      ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
      : lines;

    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/60 text-xs shrink-0">
          <div className="flex items-center gap-2 font-medium text-[var(--app-text-strong)] truncate">
            {isEFactura ? (
              <Receipt size={15} className="text-emerald-500 shrink-0" />
            ) : ext === "xml" ? (
              <FileCode2 size={15} className="text-amber-500 shrink-0" />
            ) : ext === "stc" ? (
              <Code size={15} className="text-emerald-500 shrink-0" />
            ) : ext === "csv" ? (
              <FileSpreadsheet size={15} className="text-green-500 shrink-0" />
            ) : (
              <FileText size={15} className="text-blue-500 shrink-0" />
            )}
            <span className="truncate font-mono text-[11px]">{fileName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[var(--app-muted)] shrink-0 uppercase font-mono font-bold">
              {isEFactura ? "e-Factura ANAF" : ext === "stc" ? "Audatex STC" : ext === "xml" ? "XML" : ext}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle for e-Factura */}
            {isEFactura && (
              <div className="inline-flex p-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode("formatted")}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    viewMode === "formatted"
                      ? "bg-[var(--app-accent)] text-[var(--app-accent-text)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  Factură
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("xml")}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    viewMode === "xml"
                      ? "bg-[var(--app-accent)] text-[var(--app-accent-text)]"
                      : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                >
                  Cod XML
                </button>
              </div>
            )}

            {viewMode === "xml" && (
              <>
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2 text-[var(--app-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Caută în fișier..."
                    className="w-24 sm:w-32 pl-6 pr-2 py-1 text-[11px] bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg focus:outline-none focus:border-[var(--app-accent)] text-[var(--app-text)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setWrapLines(!wrapLines)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-[11px] ${
                    wrapLines
                      ? "bg-[var(--app-accent)]/15 border-[var(--app-accent)]/40 text-[var(--app-accent-text)]"
                      : "bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                  }`}
                  title="Comută Wrap Text"
                >
                  <WrapText size={13} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !textContent}
              className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
              title="Copiază conținutul"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-500 hidden sm:inline">Copiat!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="hidden sm:inline">Copiază</span>
                </>
              )}
            </button>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors inline-flex items-center gap-1 text-[11px]"
              title="Deschide separat"
            >
              <ExternalLink size={13} />
            </a>
            <a
              href={fileUrl}
              download={fileName}
              className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors inline-flex items-center gap-1 text-[11px]"
              title="Descarcă"
            >
              <Download size={13} />
            </a>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative overflow-auto bg-neutral-100 dark:bg-neutral-900/40 p-3 sm:p-6 flex justify-center">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--app-muted)] text-xs gap-2">
              <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
              <span>Se citește {fileName}...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <div className="font-semibold text-[var(--app-text-strong)] mb-1">Eroare încărcare</div>
              <div className="text-[var(--app-muted)] max-w-sm">{error}</div>
            </div>
          ) : isEFactura && viewMode === "formatted" && invoiceData ? (
            /* ========================================================================= */
            /* FACTURA VIZUALĂ CURATĂ ȘI LIZIBILĂ PENTRU ORICINE (UBL RO e-Factura ANAF) */
            /* ========================================================================= */
            <div className="w-full max-w-3xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl shadow-md border border-neutral-200 dark:border-neutral-700 p-6 sm:p-8 space-y-6 self-start">
              {/* Header Factură */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-200 dark:border-neutral-700 pb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Receipt size={13} /> e-Factura ANAF (UBL 2.1)
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    FACTURĂ FISCALĂ
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <span>Serie / Număr: <strong className="font-mono text-neutral-900 dark:text-white">{invoiceData.seriesNumber || "—"}</strong></span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-700/40 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700 text-xs space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">Data emiterii:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">{invoiceData.issueDate || "—"}</span>
                  </div>
                  {invoiceData.dueDate && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-neutral-500 dark:text-neutral-400">Data scadenței:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">{invoiceData.dueDate}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-neutral-500 dark:text-neutral-400">Monedă:</span>
                    <span className="font-bold text-neutral-900 dark:text-white font-mono">{invoiceData.totals?.currency || "RON"}</span>
                  </div>
                </div>
              </div>

              {/* Furnizor & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Furnizor */}
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-700/20 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                    <Building2 size={13} className="text-[var(--app-accent)]" /> Furnizor (Emitent)
                  </div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">
                    {invoiceData.supplier?.name || "—"}
                  </div>
                  <div className="space-y-1 text-neutral-600 dark:text-neutral-300">
                    <div><strong>CIF / CUI:</strong> <span className="font-mono">{invoiceData.supplier?.cif || "—"}</span></div>
                    {invoiceData.supplier?.regCom && <div><strong>Reg. Com:</strong> {invoiceData.supplier.regCom}</div>}
                    {invoiceData.supplier?.address && <div><strong>Adresă:</strong> {invoiceData.supplier.address}</div>}
                    {invoiceData.supplier?.email && <div><strong>Email:</strong> {invoiceData.supplier.email}</div>}
                    {invoiceData.supplier?.contactName && <div><strong>Pers. contact:</strong> {invoiceData.supplier.contactName}</div>}
                  </div>
                </div>

                {/* Client / Beneficiar */}
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-700/20 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                    <Building2 size={13} className="text-blue-500" /> Client (Beneficiar)
                  </div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white">
                    {invoiceData.customer?.name || "—"}
                  </div>
                  <div className="space-y-1 text-neutral-600 dark:text-neutral-300">
                    <div><strong>CIF / CUI:</strong> <span className="font-mono">{invoiceData.customer?.cif || "—"}</span></div>
                    {invoiceData.customer?.address && <div><strong>Adresă:</strong> {invoiceData.customer.address}</div>}
                    {invoiceData.customer?.phone && <div><strong>Telefon:</strong> {invoiceData.customer.phone}</div>}
                    {invoiceData.customer?.email && <div><strong>Email:</strong> {invoiceData.customer.email}</div>}
                  </div>
                </div>
              </div>

              {/* Informații bancare */}
              {invoiceData.bank?.iban && (
                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-700/20 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-neutral-500" />
                    <span><strong>Cont IBAN:</strong> <span className="font-mono font-bold text-neutral-900 dark:text-white">{invoiceData.bank.iban}</span></span>
                  </div>
                  {invoiceData.bank.bankName && (
                    <span className="text-neutral-500 dark:text-neutral-400">Bancă: <strong>{invoiceData.bank.bankName}</strong></span>
                  )}
                </div>
              )}

              {/* Tabel Linii Factură */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700 text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-700/60 font-bold text-neutral-700 dark:text-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Nr.</th>
                      <th className="py-2.5 px-3 text-left">Denumire Produse / Servicii</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Preț Unitar</th>
                      <th className="py-2.5 px-3 text-right">Valoare Net</th>
                      <th className="py-2.5 px-3 text-right">TVA (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                    {invoiceData.lines?.map((line, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-700/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-neutral-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">{line.name || "Articol"}</div>
                          {line.description && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{line.description}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {line.quantity} {line.unitCode !== "H87" ? line.unitCode : "buc"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                          {line.price ? Number(line.price).toLocaleString("ro-RO", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-neutral-900 dark:text-white">
                          {line.netAmount ? Number(line.netAmount).toLocaleString("ro-RO", { minimumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                          {line.vatPercent || "19"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaluri & Notițe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Note / Mențiuni legale */}
                <div className="space-y-2">
                  {invoiceData.notes?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <div className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[10px] mb-1">
                        Mențiuni Factură:
                      </div>
                      <div className="space-y-1">
                        {invoiceData.notes.map((note, nIdx) => (
                          <p key={nIdx} className="leading-relaxed">{note}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Caseta de Totaluri */}
                <div className="bg-neutral-50 dark:bg-neutral-700/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                    <span>Valoare Netă:</span>
                    <span className="font-mono font-semibold">
                      {invoiceData.totals?.netAmount ? Number(invoiceData.totals.netAmount).toLocaleString("ro-RO", { minimumFractionDigits: 2 }) : "—"} {invoiceData.totals?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600 dark:text-neutral-300">
                    <span>TVA ({invoiceData.totals?.vatPercent}%):</span>
                    <span className="font-mono font-semibold">
                      {invoiceData.totals?.vatAmount ? Number(invoiceData.totals.vatAmount).toLocaleString("ro-RO", { minimumFractionDigits: 2 }) : "—"} {invoiceData.totals?.currency}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 dark:border-neutral-600 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">TOTAL DE PLATĂ:</span>
                    <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                      {invoiceData.totals?.grossAmount ? Number(invoiceData.totals.grossAmount).toLocaleString("ro-RO", { minimumFractionDigits: 2 }) : "—"} {invoiceData.totals?.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Vizualizator text / cod XML / STC */
            <div className="w-full bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] p-3">
              <pre
                className={`text-[12px] font-mono leading-relaxed text-[var(--app-text)] selection:bg-[var(--app-accent)]/30 ${
                  wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
                }`}
              >
                {filteredLines.map((line, idx) => (
                  <div key={idx} className="flex hover:bg-[var(--app-surface-2)]/60 rounded px-1">
                    <span className="w-10 select-none text-[10px] text-[var(--app-muted)]/60 text-right pr-3 font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-mono">{line || " "}</span>
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Word DOCX Preview
  if (ext === "docx") {
    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]/60 text-xs shrink-0">
          <div className="flex items-center gap-2 font-medium text-[var(--app-text-strong)] truncate">
            <FileText size={15} className="text-blue-600 shrink-0" />
            <span className="truncate font-mono text-[11px]">{fileName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0 uppercase font-mono font-bold">
              DOCX
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || docxElements.length === 0}
              className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
              title="Copiază textul din Word"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span className="text-emerald-500 hidden sm:inline">Copiat!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="hidden sm:inline">Copiază Text</span>
                </>
              )}
            </button>
            <a
              href={fileUrl}
              download={fileName}
              className="p-1.5 rounded-lg bg-[var(--app-surface)] border border-[var(--app-border)] hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-text-strong)] transition-colors inline-flex items-center gap-1 text-[11px]"
              title="Descarcă Word DOCX"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Descarcă</span>
            </a>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 bg-neutral-100 dark:bg-neutral-900/60 flex justify-center">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--app-muted)] text-xs gap-2">
              <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
              <span>Se decodează documentul Word...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <div className="font-semibold text-[var(--app-text-strong)] mb-1">Eroare Word</div>
              <div className="text-[var(--app-muted)] max-w-sm mb-3">{error}</div>
              <a
                href={fileUrl}
                download={fileName}
                className="px-3 py-1.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] font-semibold"
              >
                Descarcă Fișierul Direct
              </a>
            </div>
          ) : docxElements.length === 0 ? (
            <div className="text-xs text-[var(--app-muted)] text-center py-10">
              Documentul nu conține text citibil.
            </div>
          ) : (
            <div className="w-full max-w-3xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-6 sm:p-10 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 min-h-full space-y-3">
              {docxElements.map((el, idx) => {
                if (el.type === "p") {
                  if (el.isHeading) {
                    return (
                      <h3
                        key={idx}
                        className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white pt-2 pb-1 border-b border-neutral-100 dark:border-neutral-700"
                      >
                        {el.text}
                      </h3>
                    );
                  }
                  return (
                    <p
                      key={idx}
                      className={`text-xs sm:text-sm leading-relaxed ${
                        el.isBold
                          ? "font-semibold text-[var(--app-text-strong)]"
                          : "text-[var(--app-text)]"
                      }`}
                    >
                      {el.text}
                    </p>
                  );
                }
                if (el.type === "tbl") {
                  return (
                    <div
                      key={idx}
                      className="my-4 overflow-x-auto rounded-lg border border-neutral-300 dark:border-neutral-700"
                    >
                      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700 text-xs">
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                          {el.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                rIdx === 0
                                  ? "bg-neutral-100 dark:bg-neutral-700/50 font-bold"
                                  : "hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
                              }
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="p-2 border-r border-neutral-200 dark:border-neutral-700 last:border-r-0 align-top"
                                >
                                  {cell || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Legacy DOC / Generic Document Fallback
  return (
    <div className="text-center p-8 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-sm max-w-md">
      <FileText size={48} className="mx-auto text-[var(--app-accent)] opacity-80 mb-3" />
      <h4 className="font-bold text-sm text-[var(--app-text-strong)] mb-1">{fileName}</h4>
      <p className="text-xs text-[var(--app-muted)] mb-4">
        Format document {ext.toUpperCase()} • Dimensiune: {fileSizeMb} MB
      </p>
      <div className="flex gap-2 justify-center">
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-[var(--app-accent)] text-[var(--app-accent-text)] text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
        >
          <ExternalLink size={13} />
          <span>Deschide în aplicație</span>
        </a>
        <a
          href={fileUrl}
          download={fileName}
          className="px-3 py-1.5 rounded-lg bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-xs font-semibold text-[var(--app-text)] border border-[var(--app-border)] transition-colors inline-flex items-center gap-1.5"
        >
          <Download size={13} />
          <span>Descarcă</span>
        </a>
      </div>
    </div>
  );
}

export default function LocalDriveView({
  claims = [],
  onOpenClaim,
  onSaveClaim,
  showNotice,
}) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarName, setSelectedCarName] = useState(null);
  const [carDetails, setCarDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("03_Foto_Dauna");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filesViewMode, setFilesViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [inspectorTab, setInspectorTab] = useState("parts");
  const [imgRotation, setImgRotation] = useState(0);

  // Inspector form states
  const [piese, setPiese] = useState("");
  const [pieseSosite, setPieseSosite] = useState(false);
  const [numarDosar, setNumarDosar] = useState("");
  const [vin, setVin] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [carStatus, setCarStatus] = useState("Constatare");

  // Modal states: Create Car
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVin, setNewVin] = useState("");
  const [newDosar, setNewDosar] = useState("");

  // Modal states: Preluare Online
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isExtractingOnlineData, setIsExtractingOnlineData] = useState(false);
  const [isSubmittingSync, setIsSubmittingSync] = useState(false);
  const [syncPlate, setSyncPlate] = useState("");
  const [syncDosar, setSyncDosar] = useState("");
  const [syncAsigurator, setSyncAsigurator] = useState("Omniasig VIG");
  const [syncTipAsigurare, setSyncTipAsigurare] = useState("RCA");
  const [syncClient, setSyncClient] = useState("");
  const [syncPhone, setSyncPhone] = useState("");
  const [syncVin, setSyncVin] = useState("");
  const [syncMarcaModel, setSyncMarcaModel] = useState("");
  const [syncStatus, setSyncStatus] = useState("deschidere");
  const [syncPiese, setSyncPiese] = useState("");
  const [syncPieseSosite, setSyncPieseSosite] = useState(false);
  const [syncNotes, setSyncNotes] = useState("");
  const [syncPhotoCount, setSyncPhotoCount] = useState(0);
  const [syncDocCount, setSyncDocCount] = useState(0);

  // Templates modal
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [attachingTemplate, setAttachingTemplate] = useState(false);

  // File Upload input ref
  const fileInputRef = useRef(null);

  // Load cars list from hard drive
  const [loadError, setLoadError] = useState(null);

  const loadCars = async (keepSelection = true) => {
    try {
      setLoading(true);
      setLoadError(null);
      const list = await getDriveCars();
      setCars(list || []);
      if (!keepSelection || !selectedCarName) {
        if (list && list.length > 0) {
          setSelectedCarName(list[0].name);
        }
      }
    } catch (err) {
      setLoadError(err.message || "Conexiunea la hard drive a eșuat");
      showNotice?.(`Eroare încărcare dosare hard drive: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCars(false);
  }, []);

  // Load selected car details
  useEffect(() => {
    if (!selectedCarName) {
      setCarDetails(null);
      return;
    }
    let isCurrent = true;
    setLoadingDetails(true);
    getDriveCarDetails(selectedCarName)
      .then((data) => {
        if (!isCurrent) return;
        setCarDetails(data);
        // Pre-fill inspector fields
        setPiese(data.piese || "");
        setPieseSosite(!!data.pieseSosite);
        setNumarDosar(data.numarDosar || "");
        setVin(data.vin || "");
        setClientName(data.clientName || "");
        setClientPhone(data.clientPhone || "");
        setNotes(data.notes || "");
        setCarStatus(data.status || "Constatare");

        // Pick initial preview file
        const catFiles = data.categories?.[selectedCategory] || [];
        if (catFiles.length > 0) {
          setSelectedFile(catFiles[0]);
        } else {
          let found = null;
          for (const c of CATEGORIES) {
            const files = data.categories?.[c.key] || [];
            if (files.length > 0) {
              setSelectedCategory(c.key);
              found = files[0];
              break;
            }
          }
          setSelectedFile(found);
        }
        setImgRotation(0);
      })
      .catch((err) => {
        if (!isCurrent) return;
        showNotice?.(`Nu am putut încărca detaliile mașinii: ${err.message}`, "error");
      })
      .finally(() => {
        if (isCurrent) setLoadingDetails(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedCarName]);

  // When category changes, auto-select first file
  const handleSelectCategory = (catKey) => {
    setSelectedCategory(catKey);
    const files = carDetails?.categories?.[catKey] || [];
    if (files.length > 0) {
      setSelectedFile(files[0]);
    } else {
      setSelectedFile(null);
    }
    setImgRotation(0);
  };

  // Filter cars by search and stage
  const filteredCars = useMemo(() => {
    return cars.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.clientName && c.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.vin && c.vin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.numarDosar && c.numarDosar.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStage = stageFilter === "all" || c.status === stageFilter;
      return matchSearch && matchStage;
    });
  }, [cars, searchQuery, stageFilter]);

  // Check if active car is already synced in online claims
  const findMatchingOnlineClaim = (carName, details = null) => {
    if (!carName || !Array.isArray(claims)) return null;
    const cleanDrivePlate = String(carName).replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // 1. Try matching by exact or alphanumeric plate
    let match = claims.find((c) => {
      const cleanClaimPlate = String(c.numarInmatriculare || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (!cleanClaimPlate || !cleanDrivePlate) return false;
      return cleanClaimPlate === cleanDrivePlate || cleanDrivePlate.startsWith(cleanClaimPlate) || cleanClaimPlate.startsWith(cleanDrivePlate);
    });
    if (match) return match;

    // 2. Try matching by numarDosar if available
    const dDosar = details?.numarDosar || (carName === selectedCarName ? numarDosar : null);
    if (dDosar && String(dDosar).trim().length > 3) {
      const cleanDosar = String(dDosar).trim().toLowerCase();
      match = claims.find(
        (c) =>
          String(c.numarDosar || "").trim().toLowerCase() === cleanDosar ||
          String(c.nrDosarAsigurator || "").trim().toLowerCase() === cleanDosar
      );
      if (match) return match;
    }

    // 3. Try matching by VIN if available
    const dVin = details?.vin || (carName === selectedCarName ? vin : null);
    if (dVin && String(dVin).trim().length >= 6) {
      const cleanVin = String(dVin).trim().toUpperCase();
      match = claims.find((c) => String(c.vin || "").trim().toUpperCase() === cleanVin);
      if (match) return match;
    }

    return null;
  };

  const matchingOnlineClaim = useMemo(() => {
    return findMatchingOnlineClaim(selectedCarName, carDetails);
  }, [selectedCarName, carDetails, claims, numarDosar, vin]);

  // Open the complete dossier details (ClaimModal) for any car folder
  const handleOpenFullClaim = async (carName = selectedCarName, details = carDetails) => {
    if (!carName) return;

    // 1. If matching online claim exists, open it directly!
    const match = findMatchingOnlineClaim(carName, details);
    if (match) {
      onOpenClaim?.(match);
      return;
    }

    // 2. Local-only dossier: fetch full details if not loaded
    let effectiveDetails = details;
    if (!effectiveDetails || effectiveDetails.name !== carName) {
      try {
        effectiveDetails = await getDriveCarDetails(carName);
      } catch {
        effectiveDetails = cars.find((c) => c.name === carName) || {};
      }
    }

    const photoFiles = effectiveDetails?.categories?.["03_Foto_Dauna"] || [];
    const clientFiles = effectiveDetails?.categories?.["01_Acte_Client"] || [];
    const insurerFiles = effectiveDetails?.categories?.["02_Asigurator_si_Dauna"] || [];
    const reconstatareFiles = effectiveDetails?.categories?.["04_Reconstatare"] || [];
    const finalFiles = effectiveDetails?.categories?.["05_Dosar_Final"] || [];

    const drivePhotos = photoFiles.map((f) => ({
      id: uid(),
      name: f.name,
      url: getDriveFileUrl(carName, "03_Foto_Dauna", f.name),
      size: f.size,
      uploadedAt: f.mtime || nowISO(),
      isLocalDrive: true,
    }));

    const driveDocs = [
      ...clientFiles.map((f) => ({
        id: uid(),
        name: f.name,
        url: getDriveFileUrl(carName, "01_Acte_Client", f.name),
        categorie: "01_Acte_Client",
        uploadedAt: f.mtime || nowISO(),
        isLocalDrive: true,
      })),
      ...insurerFiles.map((f) => ({
        id: uid(),
        name: f.name,
        url: getDriveFileUrl(carName, "02_Asigurator_si_Dauna", f.name),
        categorie: "02_Asigurator_si_Dauna",
        uploadedAt: f.mtime || nowISO(),
        isLocalDrive: true,
      })),
      ...reconstatareFiles.map((f) => ({
        id: uid(),
        name: f.name,
        url: getDriveFileUrl(carName, "04_Reconstatare", f.name),
        categorie: "04_Reconstatare",
        uploadedAt: f.mtime || nowISO(),
        isLocalDrive: true,
      })),
      ...finalFiles.map((f) => ({
        id: uid(),
        name: f.name,
        url: getDriveFileUrl(carName, "05_Dosar_Final", f.name),
        categorie: "05_Dosar_Final",
        uploadedAt: f.mtime || nowISO(),
        isLocalDrive: true,
      })),
    ];

    const localClaim = {
      ...emptyClaim(mapLocalStatusToOnline(effectiveDetails?.status || carStatus)),
      id: uid(),
      numarInmatriculare: carName,
      numarDosar: effectiveDetails?.numarDosar || numarDosar || "",
      nrDosarAsigurator: effectiveDetails?.numarDosar || numarDosar || "",
      vin: effectiveDetails?.vin || vin || "",
      client: (effectiveDetails?.clientName || clientName || "").toUpperCase(),
      telefonClient: effectiveDetails?.clientPhone || clientPhone || "",
      asigurator: effectiveDetails?.asigurator || "Omniasig VIG",
      tipAsigurare: effectiveDetails?.tipAsigurare || "RCA",
      marcaModel: effectiveDetails?.marcaModel || "",
      ceEsteDeReparat: effectiveDetails?.piese || piese || "",
      pieseSosite: !!(effectiveDetails?.pieseSosite !== undefined ? effectiveDetails?.pieseSosite : pieseSosite),
      observatii: effectiveDetails?.notes || notes || "",
      poze: drivePhotos,
      documente: driveDocs,
      isLocalDrive: true,
    };

    onOpenClaim?.(localClaim);
  };

  // Save inspector metadata changes
  const handleSaveInspector = async () => {
    if (!selectedCarName) return;
    try {
      const patch = {
        piese,
        pieseSosite,
        numarDosar,
        vin,
        clientName,
        clientPhone,
        notes,
        status: carStatus,
      };
      await updateDriveCarStatus(selectedCarName, patch);

      // If online claim exists, sync to it as well!
      let _onlineSaveOk = true;
      let _onlineSaveErrMsg = null;
      if (matchingOnlineClaim && onSaveClaim) {
        const saveRes = await onSaveClaim({
          ...matchingOnlineClaim,
          status: mapLocalStatusToOnline(carStatus),
          numarDosar: numarDosar || matchingOnlineClaim.numarDosar,
          nrDosarAsigurator: numarDosar || matchingOnlineClaim.nrDosarAsigurator || matchingOnlineClaim.numarDosar,
          vin: vin || matchingOnlineClaim.vin,
          client: clientName ? clientName.toUpperCase() : matchingOnlineClaim.client,
          telefonClient: clientPhone || matchingOnlineClaim.telefonClient,
          observatii: notes || matchingOnlineClaim.observatii,
          ceEsteDeReparat: piese || matchingOnlineClaim.ceEsteDeReparat,
          pieseSosite: !!pieseSosite,
        });
        if (!saveRes || saveRes.success === false) {
          _onlineSaveOk = false;
          _onlineSaveErrMsg = saveRes?.error?.message || "Eroare necunoscută";
          console.error("onSaveClaim failed when saving inspector changes", saveRes);
          showNotice?.("Eroare la salvarea dosarului online — verifică Console pentru detalii.", "error");
        }
      }

      if (_onlineSaveOk) {
        showNotice?.("Modificările au fost salvate pe Hard Drive și online!", "success");
      } else {
        showNotice?.(`Modificările au fost salvate pe Hard Drive, dar nu am putut salva online: ${_onlineSaveErrMsg}`, "error");
      }
      loadCars(true);
    } catch (err) {
      showNotice?.(`Eroare salvare: ${err.message}`, "error");
    }
  };

  // Open the intelligent Preluare Online Modal with full auto-extraction
  const handleOpenSyncModal = async () => {
    if (!selectedCarName) return;
    setIsExtractingOnlineData(true);
    try {
      const cleanPlate = normalizePlate(selectedCarName);
      const d = carDetails || {};

      let dosar = d.numarDosar || numarDosar || "";
      let asig = d.asigurator || "";
      let tipAsig = d.tipAsigurare || "RCA";
      let cl = d.clientName || clientName || "";
      let tel = d.clientPhone || clientPhone || "";
      let v = d.vin || vin || "";
      let mm = d.marcaModel || "";
      let pieseTxt = d.piese || piese || "";
      let pieseSos = Boolean(d.pieseSosite || pieseSosite);
      let localSt = d.status || carStatus || "Constatare";

      // Scan local PDFs in 01_Acte_Client or 02_Asigurator_si_Dauna for deep metadata extraction
      const candidatePdfs = [];
      ["02_Asigurator_si_Dauna", "01_Acte_Client"].forEach((cat) => {
        (d.categories?.[cat] || []).forEach((f) => {
          if (f.name.toLowerCase().endsWith(".pdf")) {
            candidatePdfs.push({ cat, name: f.name });
          }
        });
      });

      for (const pdf of candidatePdfs.slice(0, 2)) {
        try {
          const fileUrl = getDriveFileUrl(selectedCarName, pdf.cat, pdf.name);
          const resp = await fetch(fileUrl);
          if (resp.ok) {
            const ab = await resp.arrayBuffer();
            const pdfText = await extractPdfText(ab);
            if (pdfText) {
              const meta = extractEstimateMetadataFromText(pdfText);
              if (!dosar && meta.numarDosar) dosar = meta.numarDosar;
              if (!asig && meta.asigurator) asig = meta.asigurator;
              if (!cl && meta.client) cl = meta.client;
              if (!tel && meta.telefonClient) tel = meta.telefonClient;
              if (!v && meta.vin) v = meta.vin;
              if (!mm && meta.marcaModel) mm = meta.marcaModel;
              if (meta.tipAsigurare) tipAsig = meta.tipAsigurare;
            }
          }
        } catch (e) {
          console.warn("Scanare document PDF eșuată pentru", pdf.name, e);
        }
      }

      const photoCount = d.categories?.["03_Foto_Dauna"]?.length || 0;
      let docCount = 0;
      ["01_Acte_Client", "02_Asigurator_si_Dauna", "04_Reconstatare", "05_Dosar_Final"].forEach((cat) => {
        docCount += (d.categories?.[cat] || []).length;
      });

      setSyncPlate(cleanPlate);
      setSyncDosar(dosar);
      setSyncAsigurator(asig || "Omniasig VIG");
      setSyncTipAsigurare(tipAsig || "RCA");
      setSyncClient(cl);
      setSyncPhone(tel);
      setSyncVin(v);
      setSyncMarcaModel(mm);
      setSyncStatus(mapLocalStatusToOnline(localSt));
      setSyncPiese(pieseTxt);
      setSyncPieseSosite(pieseSos);
      setSyncNotes(notes || d.notes || "Preluat din dosarul fizic de pe calculator.");
      setSyncPhotoCount(photoCount);
      setSyncDocCount(docCount);

      setIsSyncModalOpen(true);
    } catch (err) {
      showNotice?.(`Eroare pregătire preluare: ${err.message}`, "error");
    } finally {
      setIsExtractingOnlineData(false);
    }
  };

  // Confirm and persist the full dossier into Online Workflow Daune
  const handleConfirmSyncToOnline = async (e) => {
    e.preventDefault();
    if (!selectedCarName || !onSaveClaim) return;
    setIsSubmittingSync(true);
    try {
      const cleanPlate = normalizePlate(syncPlate || selectedCarName);
      const targetStatus = syncStatus || "deschidere";

      // Map local photos for online claim.poze
      const localPhotos = (carDetails?.categories?.["03_Foto_Dauna"] || []).map((f) => ({
        id: generateUUID(),
        name: f.name,
        url: getDriveFileUrl(selectedCarName, "03_Foto_Dauna", f.name),
        size: f.size,
        date: nowISO(),
        category: "dauna",
        isImage: true,
        source: "local_drive",
      }));

      // Map local documents for online claim.documente
      const localDocs = [];
      ["01_Acte_Client", "02_Asigurator_si_Dauna", "04_Reconstatare", "05_Dosar_Final"].forEach((cat) => {
        (carDetails?.categories?.[cat] || []).forEach((f) => {
          localDocs.push({
            id: generateUUID(),
            name: f.name,
            url: getDriveFileUrl(selectedCarName, cat, f.name),
            size: f.size,
            date: nowISO(),
            category: cat === "01_Acte_Client" ? "acte" : cat === "02_Asigurator_si_Dauna" ? "dauna" : "altele",
            source: "local_drive",
          });
        });
      });

      // Parse parts into structured operations
      const operations = syncPiese
        ? syncPiese
            .split(/[,;\n]+/)
            .map((p, idx) => ({
              id: `${generateUUID()}_${idx}`,
              piesa: p.trim(),
              inl: true,
              statusPiesa: syncPieseSosite ? "sosit" : "necomandat",
            }))
            .filter((o) => o.piesa.length > 0)
        : [];

      let finalMarca = "";
      let finalModel = "";
      if (syncMarcaModel) {
        const parts = syncMarcaModel.trim().split(/\s+/);
        finalMarca = parts[0] || "";
        finalModel = parts.slice(1).join(" ") || "";
      }

      const base = emptyClaim(targetStatus, syncAsigurator || "Omniasig VIG");

      const fullClaim = {
        ...base,
        id: generateUUID(),
        numarInmatriculare: cleanPlate,
        numarDosar: (syncDosar || "").trim(),
        nrDosarAsigurator: (syncDosar || "").trim(),
        asigurator: syncAsigurator || base.asigurator || "Omniasig VIG",
        tipAsigurare: syncTipAsigurare || "RCA",
        client: (syncClient || "").trim().toUpperCase(),
        telefonClient: (syncPhone || "").trim(),
        vin: (syncVin || "").trim().toUpperCase(),
        marcaModel: (syncMarcaModel || "").trim().toUpperCase(),
        marca: finalMarca.toUpperCase(),
        model: finalModel.toUpperCase(),
        ceEsteDeReparat: (syncPiese || "").trim(),
        pieseSosite: Boolean(syncPieseSosite),
        operatiuni: operations.length > 0 ? operations : base.operatiuni,
        status: targetStatus,
        dataDeschiderii: todayISO(),
        dataSchimbareStatus: nowISO(),
        dataUltimeiActualizari: nowISO(),
        poze: localPhotos,
        documente: localDocs,
        note: syncNotes ? [{ id: generateUUID(), text: syncNotes.trim(), date: nowISO() }] : [],
        trackingToken: generateTrackingToken(),
      };

      const saveRes = await onSaveClaim(fullClaim);
      if (saveRes && saveRes.success === false) {
        throw new Error(saveRes.error?.message || "Eroare la salvarea în baza de date.");
      }

      // Also sync back to status.json on the hard drive
      await updateDriveCarStatus(selectedCarName, {
        status: mapOnlineStatusToLocal(targetStatus),
        numarDosar: syncDosar,
        asigurator: syncAsigurator,
        tipAsigurare: syncTipAsigurare,
        clientName: syncClient,
        clientPhone: syncPhone,
        vin: syncVin,
        marcaModel: syncMarcaModel,
        piese: syncPiese,
        pieseSosite: syncPieseSosite,
        notes: syncNotes,
        isOnlineSynced: true,
      }).catch(() => {});

      showNotice?.(`Dosarul ${cleanPlate} a fost preluat cu succes în Workflow Daune cu toate datele!`, "success");
      setIsSyncModalOpen(false);

      // Automatically open the dossier so the user sees it immediately
      onOpenClaim?.(fullClaim);
    } catch (err) {
      showNotice?.(`Eroare la preluarea online: ${err.message}`, "error");
    } finally {
      setIsSubmittingSync(false);
    }
  };

  // Open Templates Modal
  const handleOpenTemplates = async () => {
    try {
      const list = await getDriveTemplates();
      setTemplates(list);
      setIsTemplatesOpen(true);
    } catch (err) {
      showNotice?.(`Eroare șabloane: ${err.message}`, "error");
    }
  };

  // Attach Template
  const handleAttachTemplate = async (template) => {
    if (!selectedCarName) return;
    try {
      setAttachingTemplate(true);
      await attachDriveTemplate(selectedCarName, template.path, selectedCategory);
      showNotice?.(`Șablonul "${template.name}" a fost adăugat în folderul dosarului!`, "success");
      setIsTemplatesOpen(false);
      const refreshed = await getDriveCarDetails(selectedCarName);
      setCarDetails(refreshed);
    } catch (err) {
      showNotice?.(`Eroare atașare: ${err.message}`, "error");
    } finally {
      setAttachingTemplate(false);
    }
  };

  // Handle File Upload from disk/camera
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedCarName) return;
    try {
      showNotice?.(`Se încarcă ${files.length} fișier(e) în folderul de pe calculator...`, "info");
      await uploadFilesToDrive(selectedCarName, selectedCategory, files);
      showNotice?.("Fișiere încărcate cu succes direct pe Hard Drive!", "success");
      const refreshed = await getDriveCarDetails(selectedCarName);
      setCarDetails(refreshed);
    } catch (err) {
      showNotice?.(`Eroare upload: ${err.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  // Handle Create New Car Dossier on Hard Drive
  const handleCreateNewCar = async (e) => {
    e.preventDefault();
    const plate = normalizePlate(newPlate);
    if (!plate) return;

    try {
      await createDriveCar({
        plate,
        clientName: newClient,
        clientPhone: newPhone,
        vin: newVin,
        numarDosar: newDosar,
        status: "Constatare",
      });

      if (onSaveClaim) {
        const base = emptyClaim("deschidere");
        const saveRes = await onSaveClaim({
          ...base,
          id: generateUUID(),
          numarInmatriculare: plate,
          status: "deschidere",
          client: newClient.toUpperCase(),
          telefonClient: newPhone,
          vin: newVin.toUpperCase(),
          numarDosar: newDosar,
          nrDosarAsigurator: newDosar,
          dataDeschiderii: todayISO(),
          dataSchimbareStatus: nowISO(),
          dataUltimeiActualizari: nowISO(),
          note: [{ id: generateUUID(), text: "Creat pe Hard Drive DOSARE.", date: nowISO() }],
        });
        if (!saveRes || saveRes.success === false) {
          console.error("onSaveClaim failed when creating new drive dossier", saveRes);
          showNotice?.("Eroare la crearea dosarului online — verifică Console pentru detalii.", "error");
          showNotice?.(`Dosarul ${plate} a fost creat pe Hard Drive, dar nu a fost salvat online: ${saveRes?.error?.message || "Eroare necunoscută"}`, "error");
        } else {
          showNotice?.(`Dosarul ${plate} a fost creat pe Hard Drive și salvat online!`, "success");
        }
      } else {
        showNotice?.(`Dosarul ${plate} a fost creat pe Hard Drive.`, "success");
      }

      setIsNewCarModalOpen(false);
      setNewPlate("");
      setNewClient("");
      setNewPhone("");
      setNewVin("");
      setNewDosar("");
      await loadCars(true);
      setSelectedCarName(plate);
    } catch (err) {
      showNotice?.(`Eroare: ${err.message}`, "error");
    }
  };

  const activeCategoryFiles = carDetails?.categories?.[selectedCategory] || [];
  const imageFiles = useMemo(() => activeCategoryFiles.filter((f) => f.isImage), [activeCategoryFiles]);
  const otherFiles = useMemo(() => activeCategoryFiles.filter((f) => !f.isImage), [activeCategoryFiles]);

  return (
    <div className="flex flex-col h-full bg-[var(--app-surface)] text-[var(--app-text)] font-sans overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-xs transition-colors">
      {/* TOP HEADER: BREADCRUMBS & ACTIONS */}
      <header className="h-13 bg-[var(--app-surface)] border-b border-[var(--app-border)] px-3.5 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Fluid Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--app-surface-2)] text-[var(--app-text)] border border-[var(--app-border)] shrink-0">
            <HardDrive size={14} className="text-amber-500" />
            <span className="font-mono">C:\DOSARE</span>
          </span>
          <ChevronRight size={13} className="text-[var(--app-muted)] shrink-0" />
          {selectedCarName ? (
            <ClaimPlate value={selectedCarName} className="text-xs shrink-0" />
          ) : (
            <span className="text-xs text-[var(--app-muted)] italic shrink-0">Niciun dosar</span>
          )}
          <ChevronRight size={13} className="text-[var(--app-muted)] shrink-0 hidden sm:inline" />
          <span className="text-xs font-medium text-[var(--app-muted)] hidden sm:inline truncate">
            {CATEGORIES.find((c) => c.key === selectedCategory)?.label || selectedCategory}
          </span>
        </div>

        {/* Right: Quick Chips & Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {numarDosar && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(numarDosar);
                showNotice?.("Număr dosar copiat!", "success");
              }}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border)] px-2.5 py-1 rounded-md text-[var(--app-text)] cursor-pointer transition-colors"
              title="Copiază Număr Dosar"
            >
              <Copy size={11} className="text-[var(--app-muted)]" />
              <span className="text-[var(--app-muted)] font-semibold">DOSAR:</span>
              <span className="font-bold">{numarDosar}</span>
            </button>
          )}

          {vin && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(vin);
                showNotice?.("VIN copiat!", "success");
              }}
              className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border)] px-2.5 py-1 rounded-md text-[var(--app-text)] cursor-pointer transition-colors"
              title="Copiază Serie Șasiu"
            >
              <Copy size={11} className="text-[var(--app-muted)]" />
              <span className="text-[var(--app-muted)] font-semibold">VIN:</span>
              <span className="font-bold">{vin.slice(0, 10)}…</span>
            </button>
          )}

          {selectedCarName && (
            <AppButton
              variant="secondary"
              onClick={() => openCarInExplorer(selectedCarName)}
              title="Deschide dosarul fizic în Windows Explorer"
              className="text-xs"
            >
              <ExternalLink size={13} className="text-[var(--app-muted)]" />
              <span className="hidden md:inline">Explorer</span>
            </AppButton>
          )}

          <AppButton
            variant="secondary"
            onClick={async () => {
              const res = await organizeDriveFiles();
              showNotice?.(`Organizare completă: ${res.movedCount || 0} fișiere sortate automat.`, "success");
              loadCars(true);
            }}
            title="Curăță și sortează automat fișierele pe cele 5 categorii standard"
            className="text-xs"
          >
            <Sparkles size={13} className="text-[var(--app-muted)]" />
            <span className="hidden lg:inline">Sortează</span>
          </AppButton>

          <AppButton
            variant="secondary"
            onClick={handleOpenTemplates}
            title="Atașează Cereri Despăgubire RCA / CASCO sau Declarații"
            className="text-xs"
          >
            <FileText size={13} className="text-[var(--app-muted)]" />
            <span className="hidden lg:inline">Șabloane</span>
          </AppButton>

          <AppButton
            variant="primary"
            onClick={() => setIsNewCarModalOpen(true)}
            className="text-xs"
          >
            <Plus size={14} />
            <span>Dosar Nou pe PC</span>
          </AppButton>
        </div>
      </header>

      {/* 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex min-h-0 divide-x divide-[var(--app-border)]">
        {/* PANE 1: LISTA DOSARE HARD DRIVE */}
        <aside className="w-72 lg:w-80 flex flex-col bg-[var(--app-surface-2)]/30 shrink-0 select-none">
          <div className="p-3 space-y-2.5 border-b border-[var(--app-border)]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută mașină, dosar, VIN..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              {[
                { key: "all", label: "Toate" },
                { key: "Constatare", label: "Constatare" },
                { key: "Așteaptă piese", label: "Piese" },
                { key: "În lucru", label: "În lucru" },
                { key: "Finalizat", label: "Finalizat" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStageFilter(st.key)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold transition-all cursor-pointer ${
                    stageFilter === st.key
                      ? "bg-[var(--app-surface)] text-[var(--app-text-strong)] border border-[var(--app-border)] shadow-xs ring-1 ring-[var(--app-accent)]/30"
                      : "bg-transparent text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--app-muted)]">
                <RefreshCw className="animate-spin inline mr-1.5" size={14} /> Se citesc dosarele de pe hard drive...
              </div>
            ) : loadError ? (
              <div className="m-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5">
                <AlertTriangle className="mx-auto text-amber-500" size={24} />
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                  Conexiune Hard Drive indisponibilă
                </p>
                <div className="text-[11px] text-[var(--app-text)] text-left space-y-2 bg-[var(--app-surface)] p-2.5 rounded-lg border border-[var(--app-border)]">
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">1. Aplicația locală rulează pe PC?</span>
                    <p className="text-[10.5px] text-[var(--app-muted)] mt-0.5 leading-relaxed">
                      Serverul DOSARE trebuie să ruleze pe calculator la <b>http://localhost:3000</b>. Dacă este oprit, deschide <code>C:\Users\pc1\Desktop\DOSARE</code> și rulează <b>Porneste_Aplicatie.bat</b> (sau <i>Activeaza_Pornire_Automata_Windows.bat</i> pentru pornire permanentă).
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">2. Permisiune Chrome acordată?</span>
                    <p className="text-[10.5px] text-[var(--app-muted)] mt-0.5 leading-relaxed">
                      Dacă ai activat deja <b>"Apps on device"</b> în Chrome (așa cum se vede în setări), apasă butonul de reîncercare de mai jos.
                    </p>
                  </div>
                  {loadError && (
                    <div className="text-[10px] font-mono text-[var(--app-muted)] break-all border-t border-[var(--app-border-soft)] pt-1.5">
                      Stare: {loadError}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <AppButton
                    variant="primary"
                    onClick={() => loadCars(false)}
                    className="w-full text-xs"
                  >
                    <RefreshCw size={13} /> Reîncearcă conexiunea
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    onClick={() => {
                      resetLocalDriveUrl();
                      loadCars(false);
                    }}
                    className="w-full text-xs text-[var(--app-muted)]"
                  >
                    <RotateCcw size={12} /> Resetează adresa la localhost:3000
                  </AppButton>
                </div>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--app-muted)]">
                Niciun dosar găsit.
              </div>
            ) : (
              filteredCars.map((car) => {
                const isSelected = selectedCarName === car.name;
                const isOnlineSynced = Boolean(findMatchingOnlineClaim(car.name));

                return (
                  <div
                    key={car.name}
                    onClick={() => setSelectedCarName(car.name)}
                    onDoubleClick={() => handleOpenFullClaim(car.name)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border group ${
                      isSelected
                        ? "bg-[var(--app-surface)] border-[var(--app-accent)] shadow-xs ring-1 ring-[var(--app-accent)]/25"
                        : "bg-[var(--app-surface)]/60 hover:bg-[var(--app-surface)] border-[var(--app-border-soft)] hover:border-[var(--app-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Folder size={15} className="text-[var(--app-accent)] shrink-0" />
                        <ClaimPlate value={car.name} className="text-xs" />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCarName(car.name);
                            handleOpenFullClaim(car.name);
                          }}
                          className="p-1 rounded hover:bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:text-[var(--app-accent)] transition-colors opacity-70 hover:opacity-100"
                          title="Deschide dosarul complet (dublu-click)"
                        >
                          <ExternalLink size={12} />
                        </button>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded-full font-semibold border ${
                            car.status === "Constatare"
                              ? "bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-[var(--app-accent)]/25"
                              : car.status === "În lucru"
                              ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25"
                              : car.status === "Finalizat"
                              ? "bg-[var(--app-success)]/10 text-[var(--app-success)] border-[var(--app-success)]/25"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {car.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--app-muted)] mt-2 pt-1.5 border-t border-[var(--app-border-soft)]">
                      <span className="truncate max-w-[160px] font-medium">
                        {car.clientName || car.numarDosar || "Fără detalii client"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--app-surface-2)] border border-[var(--app-border-soft)]" title="Fișiere / Poze">
                          📸 {car.stats?.totalPhotos || 0}
                        </span>
                        {isOnlineSynced ? (
                          <span title="Sincronizat în Workflow Daune" className="inline-flex items-center text-[10px] font-semibold text-[var(--app-success)] gap-0.5">
                            <CheckCircle2 size={11} /> Sincronizat
                          </span>
                        ) : (
                          <span title="Doar pe Hard Drive local" className="text-[10px] font-medium text-[var(--app-muted)]">
                            Local
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[var(--app-border)] bg-[var(--app-surface)] flex items-center justify-between text-[11px] text-[var(--app-muted)]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[var(--app-success)]"></span> Hard Drive Conectat
            </span>
            <button
              type="button"
              onClick={openRootInExplorer}
              className="text-[var(--app-accent)] hover:underline font-mono cursor-pointer"
            >
              C:\DOSARE
            </button>
          </div>
        </aside>

        {/* PANE 2: STRUCTURĂ CATEGORII & FIȘIERE */}
        <main className="w-80 lg:w-96 flex flex-col bg-[var(--app-surface)] shrink-0 min-h-0 border-r border-[var(--app-border)] select-none">
          <div className="p-3.5 border-b border-[var(--app-border)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              {selectedCarName ? (
                <ClaimPlate value={selectedCarName} className="text-sm shadow-2xs" />
              ) : (
                <h2 className="text-sm font-bold text-[var(--app-text-strong)]">Niciun dosar selectat</h2>
              )}
              <span className="text-xs text-[var(--app-muted)] truncate block mt-0.5">
                {clientName ? `${clientName} • ` : ""}{clientPhone || numarDosar || "Dosar local"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {clientPhone && (
                <a
                  href={`https://wa.me/4${clientPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-[var(--app-surface-2)] text-[var(--app-text)] hover:bg-[var(--app-border-soft)] border border-[var(--app-border)] transition-colors"
                  title="Trimite WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              )}
              <AppButton
                variant="primary"
                onClick={() => handleOpenFullClaim(selectedCarName, carDetails)}
                title="Deschide dosarul complet în fereastra principală (date complete, foto, acte, financiar)"
                className="text-xs font-bold"
              >
                <ExternalLink size={13} />
                Detalii Complete
              </AppButton>
              {!matchingOnlineClaim && (
                <AppButton
                  variant="outline"
                  disabled={isExtractingOnlineData}
                  onClick={handleOpenSyncModal}
                  title="Preia acest dosar cu toate datele pe Workflow Daune Online"
                  className="text-xs"
                >
                  {isExtractingOnlineData ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Scanare...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Preia Online
                    </>
                  )}
                </AppButton>
              )}
            </div>
          </div>

          <div className="p-2.5 border-b border-[var(--app-border)] space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-muted)] px-1">
              Structură Standard Dosar
            </span>
            <div className="grid grid-cols-1 gap-1">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                const count = carDetails?.categories?.[cat.key]?.length || 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleSelectCategory(cat.key)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer border ${
                      isActive
                        ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-bold shadow-2xs"
                        : "bg-[var(--app-surface-2)]/50 hover:bg-[var(--app-surface-2)] text-[var(--app-text)] border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive
                          ? "bg-[var(--app-accent)] text-[var(--app-accent-text)]"
                          : count > 0
                          ? "bg-[var(--app-surface-2)] text-[var(--app-text)] border border-[var(--app-border-soft)]"
                          : "bg-transparent text-[var(--app-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
            <div className="flex items-center justify-between text-xs text-[var(--app-muted)] px-1 pb-1">
              <span className="font-semibold">Fișiere în folder ({activeCategoryFiles.length})</span>
              {imageFiles.length > 0 && (
                <div className="flex items-center gap-0.5 bg-[var(--app-surface-2)] p-0.5 rounded-lg border border-[var(--app-border)]">
                  <button
                    type="button"
                    onClick={() => setFilesViewMode("grid")}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      filesViewMode === "grid"
                        ? "bg-[var(--app-surface)] text-[var(--app-accent)] shadow-2xs font-bold"
                        : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    }`}
                    title="Miniaturi foto (grilă)"
                    aria-label="Vizualizare miniaturi foto"
                  >
                    <LayoutGrid size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilesViewMode("list")}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      filesViewMode === "list"
                        ? "bg-[var(--app-surface)] text-[var(--app-accent)] shadow-2xs font-bold"
                        : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    }`}
                    title="Listă fișiere"
                    aria-label="Vizualizare listă fișiere"
                  >
                    <List size={12} />
                  </button>
                </div>
              )}
            </div>

            {loadingDetails ? (
              <div className="p-4 text-center text-xs text-[var(--app-muted)]">
                <RefreshCw className="animate-spin inline mr-1" size={13} /> Se încarcă fișierele...
              </div>
            ) : activeCategoryFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]/30">
                Niciun fișier în acest folder.
                <div className="text-[11px] text-[var(--app-muted)] mt-1">
                  Încarcă fișiere sau atașează din șabloane.
                </div>
              </div>
            ) : filesViewMode === "grid" && imageFiles.length > 0 ? (
              <div className="space-y-2.5">
                {/* Grilă miniaturi pentru fotografii */}
                <div className="grid grid-cols-3 gap-2">
                  {imageFiles.map((f) => {
                    const isSelected = selectedFile?.name === f.name;
                    const fileUrl = getDriveFileUrl(selectedCarName, selectedCategory, f.name);
                    return (
                      <div
                        key={f.name}
                        onClick={() => {
                          setSelectedFile(f);
                          setImgRotation(0);
                        }}
                        title={`${f.name} • ${(f.size / (1024 * 1024)).toFixed(1)}MB`}
                        className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-all ${
                          isSelected
                            ? "ring-2 ring-[var(--app-accent)] border-[var(--app-accent)] shadow-md scale-[0.98]"
                            : "border-[var(--app-border)] hover:border-[var(--app-accent)]/60 bg-[var(--app-surface-2)]/60 hover:bg-[var(--app-surface-2)]"
                        }`}
                      >
                        <img
                          src={fileUrl}
                          alt={f.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-1.5 pointer-events-none">
                          <span className="text-[10px] font-mono text-white/95 truncate max-w-[65%] font-medium">
                            {(f.size / (1024 * 1024)).toFixed(1)}M
                          </span>
                          <a
                            href={fileUrl}
                            download={f.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded bg-black/60 hover:bg-black/90 text-white transition-colors pointer-events-auto"
                            title="Descarcă fotografia"
                          >
                            <Download size={11} />
                          </a>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] flex items-center justify-center shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Alte fișiere non-imagine din folder */}
                {otherFiles.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-[var(--app-border-soft)]">
                    <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase tracking-wider px-1">
                      Documente ({otherFiles.length})
                    </div>
                    {otherFiles.map((f) => {
                      const isSelected = selectedFile?.name === f.name;
                      return (
                        <div
                          key={f.name}
                          onClick={() => {
                            setSelectedFile(f);
                            setImgRotation(0);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                            isSelected
                              ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-semibold shadow-2xs"
                              : "bg-[var(--app-surface-2)]/40 hover:bg-[var(--app-surface-2)] border-transparent text-[var(--app-text)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {f.isVideo ? (
                              <Film size={15} className={isSelected ? "text-[var(--app-accent)] shrink-0" : "text-[var(--app-muted)] shrink-0"} />
                            ) : f.name?.toLowerCase().endsWith(".pdf") ? (
                              <FileText size={15} className={isSelected ? "text-red-500 shrink-0" : "text-red-400/80 shrink-0"} />
                            ) : f.name?.toLowerCase().endsWith(".xml") ? (
                              <FileCode2 size={15} className={isSelected ? "text-amber-500 shrink-0" : "text-amber-400/80 shrink-0"} />
                            ) : f.name?.toLowerCase().endsWith(".stc") ? (
                              <Code size={15} className={isSelected ? "text-emerald-500 shrink-0" : "text-emerald-400/80 shrink-0"} />
                            ) : (f.name?.toLowerCase().endsWith(".doc") || f.name?.toLowerCase().endsWith(".docx")) ? (
                              <FileText size={15} className={isSelected ? "text-blue-500 shrink-0" : "text-blue-400/80 shrink-0"} />
                            ) : (
                              <FileText size={15} className={isSelected ? "text-[var(--app-accent)] shrink-0" : "text-[var(--app-muted)] shrink-0"} />
                            )}
                            <span className="truncate font-mono text-[11px]">{f.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--app-muted)]">
                            <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                            <a
                              href={getDriveFileUrl(selectedCarName, selectedCategory, f.name)}
                              download={f.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] transition-colors"
                              title="Descarcă"
                            >
                              <Download size={12} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              activeCategoryFiles.map((f) => {
                const isSelected = selectedFile?.name === f.name;
                return (
                  <div
                    key={f.name}
                    onClick={() => {
                      setSelectedFile(f);
                      setImgRotation(0);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                      isSelected
                        ? "bg-[var(--app-accent)]/10 border-[var(--app-accent)] text-[var(--app-text-strong)] font-semibold shadow-2xs"
                        : "bg-[var(--app-surface-2)]/40 hover:bg-[var(--app-surface-2)] border-transparent text-[var(--app-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {f.isImage ? (
                        <img
                          src={getDriveFileUrl(selectedCarName, selectedCategory, f.name)}
                          alt=""
                          loading="lazy"
                          className="w-6 h-6 rounded-md object-cover shrink-0 border border-[var(--app-border)]"
                        />
                      ) : f.isVideo ? (
                        <Film size={15} className={isSelected ? "text-[var(--app-accent)] shrink-0" : "text-[var(--app-muted)] shrink-0"} />
                      ) : f.name?.toLowerCase().endsWith(".pdf") ? (
                        <FileText size={15} className={isSelected ? "text-red-500 shrink-0" : "text-red-400/80 shrink-0"} />
                      ) : f.name?.toLowerCase().endsWith(".xml") ? (
                        <FileCode2 size={15} className={isSelected ? "text-amber-500 shrink-0" : "text-amber-400/80 shrink-0"} />
                      ) : f.name?.toLowerCase().endsWith(".stc") ? (
                        <Code size={15} className={isSelected ? "text-emerald-500 shrink-0" : "text-emerald-400/80 shrink-0"} />
                      ) : (f.name?.toLowerCase().endsWith(".doc") || f.name?.toLowerCase().endsWith(".docx")) ? (
                        <FileText size={15} className={isSelected ? "text-blue-500 shrink-0" : "text-blue-400/80 shrink-0"} />
                      ) : (
                        <FileText size={15} className={isSelected ? "text-[var(--app-accent)] shrink-0" : "text-[var(--app-muted)] shrink-0"} />
                      )}
                      <span className="truncate font-mono text-[11px]">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[var(--app-muted)]">
                      <span>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <a
                        href={getDriveFileUrl(selectedCarName, selectedCategory, f.name)}
                        download={f.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-[var(--app-surface-muted)] text-[var(--app-text)] transition-colors"
                        title="Descarcă"
                      >
                        <Download size={12} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] border border-dashed border-[var(--app-border)] hover:border-[var(--app-accent)] transition-all cursor-pointer shadow-2xs"
            >
              <Upload size={14} className="text-[var(--app-accent)]" /> <span>Încarcă Fișiere pe Hard Drive</span>
            </button>
          </div>
        </main>

        {/* PANE 3: PREVIEW MARE & INSPECTOR METADATE */}
        <section className="flex-1 flex flex-col min-h-0 bg-[var(--app-surface-2)]/30 overflow-hidden">
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-4 overflow-hidden">
            {!selectedFile ? (
              <div className="text-center text-[var(--app-muted)] max-w-sm">
                <Image size={40} className="mx-auto mb-2.5 opacity-30" />
                <p className="text-xs font-medium">Selectează o fotografie sau document pentru previzualizare instantanee.</p>
              </div>
            ) : selectedFile.isImage ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                  alt={selectedFile.name}
                  style={{ transform: `rotate(${imgRotation}deg)` }}
                  className="max-h-[50vh] sm:max-h-[58vh] max-w-full object-contain rounded-xl shadow-md transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--app-surface)]/90 backdrop-blur border border-[var(--app-border)] p-1 rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setImgRotation((r) => (r + 90) % 360)}
                    className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] rounded cursor-pointer transition-colors"
                    title="Rotește 90°"
                  >
                    <RotateCw size={14} />
                  </button>
                  <a
                    href={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)] rounded transition-colors"
                    title="Deschide în tab nou"
                  >
                    <Maximize2 size={14} />
                  </a>
                </div>
              </div>
            ) : selectedFile.isVideo ? (
              <video
                controls
                src={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
                className="max-h-[55vh] max-w-full rounded-xl shadow-md"
              />
            ) : (
              <LocalDocumentPreviewer
                file={selectedFile}
                fileUrl={getDriveFileUrl(selectedCarName, selectedCategory, selectedFile.name)}
              />
            )}
          </div>

          {/* Bottom Inspector Strip */}
          <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3 shrink-0">
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <div className="app-segment-track inline-flex p-0.5 border border-[var(--app-border)]">
                {[
                  { id: "parts", label: "📦 Piese" },
                  { id: "client", label: "👤 Client & Dosar" },
                  { id: "notes", label: "📝 Observații" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      inspectorTab === tab.id
                        ? "app-segment-active font-bold"
                        : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <AppButton
                  variant="secondary"
                  onClick={() => handleOpenFullClaim(selectedCarName, carDetails)}
                  className="text-xs font-bold"
                  title="Deschide dosarul complet în fereastra principală (toate taburile, devize, costuri, istoric)"
                >
                  <ExternalLink size={13} /> <span>Dosar Complet</span>
                </AppButton>
                <AppButton
                  variant="primary"
                  onClick={handleSaveInspector}
                  className="text-xs font-bold"
                >
                  <CheckCircle2 size={13} /> <span>Salvează pe PC &amp; Online</span>
                </AppButton>
              </div>
            </div>

            {/* Inspector Tab Content */}
            <div className="min-h-[46px]">
              {inspectorTab === "parts" && (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={piese}
                    onChange={(e) => setPiese(e.target.value)}
                    placeholder="Piese comandate (ex: Far stg LED, Bară față)..."
                    className="flex-1 text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[var(--app-text)] font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pieseSosite}
                      onChange={(e) => setPieseSosite(e.target.checked)}
                      className="rounded border-[var(--app-border)] accent-[var(--app-accent)] cursor-pointer"
                    />
                    Au sosit piesele?
                  </label>
                </div>
              )}

              {inspectorTab === "client" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={numarDosar}
                    onChange={(e) => setNumarDosar(e.target.value)}
                    placeholder="Nr. Dosar Daună..."
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="Serie Șasiu (VIN)..."
                    className="text-xs font-mono bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nume Client..."
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Telefon Client..."
                    className="text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              )}

              {inspectorTab === "notes" && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observații service, accept plată, detalii client..."
                  rows={2}
                  className="w-full text-xs bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-1.5 text-[var(--app-text)] placeholder-[var(--app-muted)] resize-none focus:outline-none focus:border-[var(--app-accent)]"
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* MODAL: PRELUARE DOSAR ÎN WORKFLOW ONLINE */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--app-accent)]" /> Preluare Dosar în Workflow Daune Online
              </h3>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Informații despre fișierele preluate */}
            <div className="mx-4 mt-4 p-3 rounded-xl bg-[var(--app-surface-2)] border border-[var(--app-border)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <ClaimPlate value={syncPlate} className="text-sm shadow-2xs shrink-0" />
                <span className="text-[var(--app-muted)] truncate">• Folder local pe PC</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-[var(--app-text)] shrink-0">
                <span className="bg-[var(--app-surface)] text-[var(--app-text)] px-2.5 py-0.5 rounded-md border border-[var(--app-border)]">
                  📸 {syncPhotoCount} poze
                </span>
                <span className="bg-[var(--app-surface)] text-[var(--app-text)] px-2.5 py-0.5 rounded-md border border-[var(--app-border)]">
                  📄 {syncDocCount} acte
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSyncToOnline} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Număr Înmatriculare *
                  </label>
                  <input
                    type="text"
                    required
                    value={syncPlate}
                    onChange={(e) => setSyncPlate(e.target.value.toUpperCase())}
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 font-mono font-bold text-[var(--app-text-strong)] uppercase tracking-wider focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Nr. Dosar Daună
                  </label>
                  <input
                    type="text"
                    value={syncDosar}
                    onChange={(e) => setSyncDosar(e.target.value)}
                    placeholder="ex: 60339613 sau DA-10293/2026"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Asigurător
                  </label>
                  <select
                    value={syncAsigurator}
                    onChange={(e) => setSyncAsigurator(e.target.value)}
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  >
                    {INSURERS.map((ins) => (
                      <option key={ins} value={ins}>
                        {ins}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Tip Asigurare
                  </label>
                  <select
                    value={syncTipAsigurare}
                    onChange={(e) => setSyncTipAsigurare(e.target.value)}
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  >
                    <option value="RCA">RCA (Păgubit)</option>
                    <option value="CASCO">CASCO (Proprie)</option>
                    <option value="Regie Proprie">Regie Proprie</option>
                    <option value="Fără asigurare">Fără asigurare</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Client / Proprietar
                  </label>
                  <input
                    type="text"
                    value={syncClient}
                    onChange={(e) => setSyncClient(e.target.value)}
                    placeholder="Nume client sau denumire firmă..."
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Telefon Client
                  </label>
                  <input
                    type="tel"
                    value={syncPhone}
                    onChange={(e) => setSyncPhone(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Serie Șasiu (VIN)
                  </label>
                  <input
                    type="text"
                    value={syncVin}
                    onChange={(e) => setSyncVin(e.target.value.toUpperCase())}
                    placeholder="17 caractere"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 font-mono text-[var(--app-text)] uppercase focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Marcă &amp; Model
                  </label>
                  <input
                    type="text"
                    value={syncMarcaModel}
                    onChange={(e) => setSyncMarcaModel(e.target.value)}
                    placeholder="ex: SEAT ATECA, VW GOLF..."
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Stadiu Inițial în Workflow
                  </label>
                  <select
                    value={syncStatus}
                    onChange={(e) => setSyncStatus(e.target.value)}
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  >
                    <option value="deschidere">1. Acord reparație (AIR)</option>
                    <option value="piese_comandate">2. Piese comandate</option>
                    <option value="programat">3. Programat în atelier</option>
                    <option value="in_lucru">4. Reparație (În lucru)</option>
                    <option value="accept_plata">5. Accept plată</option>
                    <option value="facturat">6. Facturat / Finalizat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                    Piese necesare / Comandate
                  </label>
                  <input
                    type="text"
                    value={syncPiese}
                    onChange={(e) => setSyncPiese(e.target.value)}
                    placeholder="ex: Bară față, Far stânga LED..."
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--app-text-strong)] font-semibold mb-1">
                  Observații / Notițe inițiale
                </label>
                <textarea
                  value={syncNotes}
                  onChange={(e) => setSyncNotes(e.target.value)}
                  rows={2}
                  placeholder="Observații service, detalii daună..."
                  className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 text-[var(--app-text)] resize-none focus:outline-none focus:border-[var(--app-accent)]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--app-border)]">
                <span className="text-[11px] text-[var(--app-muted)] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Sincronizează datele fizice și online fără duplicate.
                </span>

                <div className="flex gap-2">
                  <AppButton
                    variant="ghost"
                    onClick={() => setIsSyncModalOpen(false)}
                    disabled={isSubmittingSync}
                  >
                    Anulează
                  </AppButton>
                  <AppButton
                    variant="primary"
                    type="submit"
                    disabled={isSubmittingSync}
                  >
                    {isSubmittingSync ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Salvare...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={14} /> Confirmă &amp; Deschide Online
                      </>
                    )}
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADAUGĂ DOSAR NOU PE HARD DRIVE */}
      {isNewCarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <Plus size={16} className="text-[var(--app-accent)]" /> Adaugă Dosar Nou pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCarModalOpen(false)}
                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewCar} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--app-text-strong)] font-semibold mb-1">Număr Înmatriculare *</label>
                <input
                  type="text"
                  required
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="ex: B 104 TNY sau OT 51 SKY"
                  className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2.5 font-mono font-bold text-[var(--app-text-strong)] uppercase tracking-wider focus:outline-none focus:border-[var(--app-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Nr. Dosar Daună</label>
                  <input
                    type="text"
                    value={newDosar}
                    onChange={(e) => setNewDosar(e.target.value)}
                    placeholder="DA 10293/2026"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Serie Șasiu (VIN)</label>
                  <input
                    type="text"
                    value={newVin}
                    onChange={(e) => setNewVin(e.target.value.toUpperCase())}
                    placeholder="17 caractere"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 font-mono text-[var(--app-text)] uppercase focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Client</label>
                  <input
                    type="text"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    placeholder="Nume client"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--app-muted)] mb-1 font-medium">Telefon</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg p-2 text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-[var(--app-border)]">
                <AppButton
                  variant="ghost"
                  onClick={() => setIsNewCarModalOpen(false)}
                >
                  Anulează
                </AppButton>
                <AppButton
                  variant="primary"
                  type="submit"
                >
                  Creează Dosar Fizic &amp; Online
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ȘABLOANE ACTE */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--app-text-strong)] flex items-center gap-2">
                <FileText size={16} className="text-purple-500" /> Șabloane Oficiale pe Calculator
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplatesOpen(false)}
                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 max-h-[60vh] overflow-y-auto space-y-1.5 text-xs">
              {templates.length === 0 ? (
                <p className="text-center text-[var(--app-muted)] p-6">Nu au fost găsite șabloane pe calculator.</p>
              ) : (
                templates.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-muted)] border border-[var(--app-border-soft)] transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">{tmpl.category}</span>
                      <strong className="text-[var(--app-text-strong)] text-xs truncate block">{tmpl.name}</strong>
                    </div>
                    <AppButton
                      variant="secondary"
                      disabled={attachingTemplate}
                      onClick={() => handleAttachTemplate(tmpl)}
                      className="text-[11px]"
                    >
                      Atașează în Dosar
                    </AppButton>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}