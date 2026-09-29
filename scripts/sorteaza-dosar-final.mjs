#!/usr/bin/env node

/**
 * Script autonom de recunoaștere OCR, împerechere și repartizare automată
 * a documentelor (Talon, Buletin / CI, Cerere de Despăgubire) în dosarele locale.
 *
 * Utilizare:
 *   node scripts/sorteaza-dosar-final.mjs <folder_sursa> [folder_destinatie] [optiuni]
 *
 * Exemple:
 *   node scripts/sorteaza-dosar-final.mjs "C:\Fisiere_Noi"
 *   node scripts/sorteaza-dosar-final.mjs "C:\Inbox" "C:\DOSARE" --move
 *   node scripts/sorteaza-dosar-final.mjs "C:\Inbox" "C:\DOSARE" --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RO_COUNTIES = new Set([
  "AB", "AR", "AG", "BC", "BH", "BN", "BT", "BV", "BR", "BZ",
  "CS", "CL", "CJ", "CT", "CV", "DB", "DJ", "GL", "GR", "GJ",
  "HR", "HD", "IL", "IS", "IF", "MM", "MH", "MS", "NT", "OT",
  "PH", "SM", "SJ", "SB", "SV", "TR", "TM", "TL", "VS", "VL",
  "VN", "B"
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif", ".pdf"
]);

/**
 * Validează antetul binar al fișierului pentru a preveni erori Leptonica pe imagini corupte
 */
export function isValidImageFile(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    // WEBP: RIFF ... WEBP
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return true;
    // BMP: BM
    if (buf[0] === 0x42 && buf[1] === 0x4d) return true;
    // TIFF: II or MM
    if ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d)) return true;

    return false;
  } catch {
    return false;
  }
}


/**
 * Elimină diacriticele și normalizează spațiile
 */
export function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș|ş/gi, "s")
    .replace(/ț|ţ/gi, "t")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalizează numărul de înmatriculare în format standard: 'B 123 ABC'
 */
export function formatPlate(county, numbers, letters) {
  const c = county.toUpperCase().trim();
  const n = numbers.trim();
  const l = letters.toUpperCase().trim();
  return `${c} ${n} ${l}`;
}

/**
 * Extrage numărul de înmatriculare din text sau din numele fișierului
 */
export function extractPlate(text) {
  if (!text) return null;
  const clean = normalizeText(text).replace(/_/g, " ").toUpperCase();

  // Pattern standard: B 123 ABC sau CJ 01 XYZ sau B-123-ABC sau B123ABC
  const regex = /(?:^|[^A-Z0-9])(B|[A-Z]{2})\s*[- ]?\s*(\d{2,3})\s*[- ]?\s*([A-Z]{3})(?=[^A-Z0-9]|$)/gi;
  let match;
  while ((match = regex.exec(clean)) !== null) {
    const county = match[1].toUpperCase();
    if (RO_COUNTIES.has(county)) {
      return formatPlate(county, match[2], match[3]);
    }
  }

  return null;
}

/**
 * Extrage CNP din text (13 cifre consecutive)
 */
export function extractCnp(text) {
  if (!text) return null;
  const match = String(text).match(/\b([1-8]\d{12})\b/);
  return match ? match[1] : null;
}

/**
 * Clasifică documentul în funcție de conținut și nume fișier
 */
export function classifyDocument(text, filename) {
  const normText = normalizeText(text).toLowerCase();
  const normFile = normalizeText(filename).toLowerCase();

  let isTalon = false;
  let isCi = false;
  let isCerere = false;

  // 1. Verificare Talon (Certificat de Înmatriculare)
  if (
    normFile.includes("talon") ||
    normFile.includes("certificat") ||
    normText.includes("certificat de inmatriculare") ||
    normText.includes("permis de circulation") ||
    normText.includes("fahrzeugschein") ||
    (normText.includes("romania") && normText.includes("comunitatea europeana") && normText.includes("serie")) ||
    (normText.includes("numar de identificare") && normText.includes("masa maxima"))
  ) {
    isTalon = true;
  }

  // 2. Verificare Buletin / Carte de Identitate
  if (
    normFile.includes("buletin") ||
    normFile.includes("carte_identitate") ||
    normFile.includes("ci_") ||
    normFile.includes("_ci.") ||
    normText.includes("carte de identitate") ||
    normText.includes("buletin de identitate") ||
    normText.includes("identity card") ||
    normText.includes("domiciliu") ||
    normText.includes("cetatenie romana") ||
    (normText.includes("cnp") && (normText.includes("seria") || normText.includes("spclep")))
  ) {
    isCi = true;
  }

  // 3. Verificare Cerere de Despăgubire
  if (
    normFile.includes("cerere") ||
    normFile.includes("despagubire") ||
    normText.includes("cerere de plata") ||
    normText.includes("cerere de despagubire") ||
    normText.includes("despagubirii") ||
    normText.includes("bunul avariat") ||
    (normText.includes("dosar") && normText.includes("asirom") && normText.includes("plata")) ||
    (normText.includes("omniasig") && normText.includes("despagubit"))
  ) {
    isCerere = true;
  }

  if (isTalon && !isCi && !isCerere) return "TALON";
  if (isCi && !isTalon && !isCerere) return "BULETIN";
  if (isCerere) return "CERERE_DESPAGUBIRE";

  // Determinare pe bază de scor dacă există ambiguitate
  if (isTalon) return "TALON";
  if (isCi) return "BULETIN";

  return "ALTE_DOCUMENTE";
}

/**
 * Caută un folder existent pentru numărul auto în folderul de bază (C:\DOSARE)
 */
export function findOrCreateCarFolder(destBaseDir, plate) {
  if (!fs.existsSync(destBaseDir)) {
    fs.mkdirSync(destBaseDir, { recursive: true });
  }

  const cleanTarget = plate.replace(/\s+/g, "").toUpperCase();
  const entries = fs.readdirSync(destBaseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const entryClean = entry.name.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (entryClean === cleanTarget || entryClean.includes(cleanTarget)) {
        return path.join(destBaseDir, entry.name);
      }
    }
  }

  // Dacă nu există, se creează folderul cu formatul standard: 'B 123 ABC'
  const newFolder = path.join(destBaseDir, plate);
  fs.mkdirSync(newFolder, { recursive: true });
  return newFolder;
}

/**
 * Găsește un nume de fișier disponibil pentru a nu suprascrie fișiere existente
 */
export function getSafeDestinationPath(targetDir, desiredFilename) {
  const ext = path.extname(desiredFilename);
  const base = path.basename(desiredFilename, ext);
  let finalPath = path.join(targetDir, desiredFilename);
  let counter = 1;

  while (fs.existsSync(finalPath)) {
    finalPath = path.join(targetDir, `${base}_${counter}${ext}`);
    counter++;
  }

  return finalPath;
}

/**
 * Motorul de împerechere a documentelor
 */
export function pairDocuments(analyzedFiles) {
  const groups = new Map(); // Plate -> { plate, talon: [], buletin: [], cerere: [], altele: [], cnpList: Set }
  const unassigned = [];

  // Pasul 1: Înregistrare dosare directe pe baza numărului de înmatriculare găsit
  for (const item of analyzedFiles) {
    if (item.plate) {
      if (!groups.has(item.plate)) {
        groups.set(item.plate, {
          plate: item.plate,
          talon: [],
          buletin: [],
          cerere: [],
          altele: [],
          cnpList: new Set(),
        });
      }
      const grp = groups.get(item.plate);
      if (item.cnp) grp.cnpList.add(item.cnp);

      if (item.type === "TALON") grp.talon.push(item);
      else if (item.type === "BULETIN") grp.buletin.push(item);
      else if (item.type === "CERERE_DESPAGUBIRE") grp.cerere.push(item);
      else grp.altele.push(item);
    } else {
      unassigned.push(item);
    }
  }

  // Pasul 2: Împerechere secundară pentru fișierele fără număr auto direct
  // (ex: buletin fără număr auto notat pe el, dar care are același CNP ca pe talon)
  const remainingUnassigned = [];
  for (const item of unassigned) {
    let matchedPlate = null;

    if (item.cnp) {
      for (const [plate, grp] of groups.entries()) {
        if (grp.cnpList.has(item.cnp)) {
          matchedPlate = plate;
          break;
        }
      }
    }

    if (matchedPlate) {
      const grp = groups.get(matchedPlate);
      item.plate = matchedPlate;
      item.matchedVia = "CNP";
      if (item.type === "BULETIN") grp.buletin.push(item);
      else if (item.type === "CERERE_DESPAGUBIRE") grp.cerere.push(item);
      else if (item.type === "TALON") grp.talon.push(item);
      else grp.altele.push(item);
    } else {
      remainingUnassigned.push(item);
    }
  }

  return {
    groups: Array.from(groups.values()),
    unassigned: remainingUnassigned,
  };
}

/**
 * Funcția principală de scanare și repartizare
 */
export async function runSortareDosarFinal(options = {}) {
  const sourceDir = path.resolve(options.sourceDir || ".");
  const destBaseDir = path.resolve(options.destDir || "C:\\DOSARE");
  const isMove = Boolean(options.move);
  const isDryRun = Boolean(options.dryRun);
  const ocrLang = options.ocrLang || "ron+eng";

  console.log("=========================================================");
  console.log("🚀 SORTARE & ÎMPERECHERE AUTOMATĂ DOSAR FINAL (LOCAL)");
  console.log("=========================================================");
  console.log(`📁 Folder Sursă:      ${sourceDir}`);
  console.log(`📂 Destinație Bază:   ${destBaseDir}`);
  console.log(`⚙️  Mod operare:       ${isDryRun ? "SIMULARE (dry-run)" : isMove ? "MUTARE (move)" : "COPIERE (safe copy)"}`);
  console.log(`🔍 Limbă OCR:         ${ocrLang}`);
  console.log("---------------------------------------------------------\n");

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Folderul sursă nu există: ${sourceDir}`);
  }

  // Scanare fișiere din folderul sursă
  const allEntries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const filesToProcess = allEntries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext);
    });

  if (filesToProcess.length === 0) {
    console.log("ℹ️  Nu au fost găsite imagini sau documente de procesat în folderul sursă.");
    return { groups: [], unassigned: [], processedCount: 0 };
  }

  console.log(`🔎 Găsit ${filesToProcess.length} fișiere. Se inițializează motorul OCR Tesseract...`);

  // Inițializare Tesseract Worker
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(ocrLang);

  const analyzedFiles = [];
  let count = 0;

  for (const filename of filesToProcess) {
    count++;
    const filePath = path.join(sourceDir, filename);
    process.stdout.write(`[${count}/${filesToProcess.length}] Analiză: ${filename}... `);

    try {
      // Extragere inițială din numele fișierului
      let plate = extractPlate(filename);
      let cnp = extractCnp(filename);
      let type = classifyDocument("", filename);
      let ocrText = "";

      // Execuție OCR doar pe imagini valide
      const ext = path.extname(filename).toLowerCase();
      if (ext !== ".pdf" && isValidImageFile(filePath)) {
        try {
          const ret = await worker.recognize(filePath);
          ocrText = ret?.data?.text || "";
        } catch (ocrErr) {
          // Fallback silențios pe metadatele din numele fișierului
        }
      }

      // Dacă nu s-a găsit număr în numele fișierului, căutăm în textul OCR
      if (!plate && ocrText) {
        plate = extractPlate(ocrText);
      }

      if (!cnp && ocrText) {
        cnp = extractCnp(ocrText);
      }

      if (type === "ALTE_DOCUMENTE" && ocrText) {
        type = classifyDocument(ocrText, filename);
      }

      analyzedFiles.push({
        filename,
        filePath,
        plate,
        cnp,
        type,
        ocrLength: ocrText.length,
      });

      console.log(`✅ [${type}] ${plate ? `Auto: ${plate}` : "Fără număr direct"} ${cnp ? `(CNP: ${cnp})` : ""}`);
    } catch (err) {
      console.log(`⚠️ Eroare OCR: ${err.message}`);
      analyzedFiles.push({
        filename,
        filePath,
        plate: extractPlate(filename),
        cnp: extractCnp(filename),
        type: classifyDocument("", filename),
        error: err.message,
      });
    }
  }

  await worker.terminate();

  console.log("\n🔗 Împerechere automată documente (Talon + Buletin + Cerere)...");
  const { groups, unassigned } = pairDocuments(analyzedFiles);

  console.log("\n=========================================================");
  console.log(`📊 REZULTATE ÎMPERECHERE (${groups.length} dosare identificate)`);
  console.log("=========================================================");

  const actionsLog = [];

  for (const grp of groups) {
    console.log(`\n🚗 DOSAR AUTO: ${grp.plate}`);
    console.log(`   - Talon:               ${grp.talon.length} fișier(e)`);
    console.log(`   - Buletin (CI):        ${grp.buletin.length} fișier(e)`);
    console.log(`   - Cerere Despăgubire:  ${grp.cerere.length} fișier(e)`);
    if (grp.altele.length > 0) {
      console.log(`   - Alte documente:      ${grp.altele.length} fișier(e)`);
    }

    const carFolder = findOrCreateCarFolder(destBaseDir, grp.plate);
    const targetSubfolder = path.join(carFolder, "05_Dosar_Final");

    if (!isDryRun && !fs.existsSync(targetSubfolder)) {
      fs.mkdirSync(targetSubfolder, { recursive: true });
    }

    const allGroupDocs = [
      ...grp.talon.map((d) => ({ ...d, docRole: "Talon" })),
      ...grp.buletin.map((d) => ({ ...d, docRole: "CI" })),
      ...grp.cerere.map((d) => ({ ...d, docRole: "Cerere_Despagubire" })),
      ...grp.altele.map((d) => ({ ...d, docRole: "Doc" })),
    ];

    const cleanPlateToken = grp.plate.replace(/\s+/g, "");

    for (const doc of allGroupDocs) {
      const ext = path.extname(doc.filename);
      const safePlate = cleanPlateToken;
      const desiredName = `${doc.docRole}_${safePlate}${ext}`;
      const destPath = getSafeDestinationPath(targetSubfolder, desiredName);

      if (isDryRun) {
        console.log(`   ➡️  [SIMULARE] ${doc.filename} -> ${destPath}`);
      } else {
        if (isMove) {
          fs.copyFileSync(doc.filePath, destPath);
          fs.unlinkSync(doc.filePath);
          console.log(`   ➡️  [MUTAT] ${doc.filename} -> ${path.basename(destPath)}`);
        } else {
          fs.copyFileSync(doc.filePath, destPath);
          console.log(`   ➡️  [COPIAT] ${doc.filename} -> ${path.basename(destPath)}`);
        }
      }

      actionsLog.push({
        plate: grp.plate,
        source: doc.filePath,
        destination: destPath,
        type: doc.type,
      });
    }
  }

  if (unassigned.length > 0) {
    console.log("\n⚠️ FIȘIERE NEÎMPERECHEATE (Rămase pentru verificare manuală):");
    for (const u of unassigned) {
      console.log(`   - ${u.filename} (Tip detectat: ${u.type || "Necunoscut"})`);
    }
  }

  console.log("\n=========================================================");
  console.log(`🎉 FINALIZAT CU SUCCES!`);
  console.log(`📁 Dosare organizate în: ${destBaseDir}\\[NR_AUTO]\\05_Dosar_Final\\`);
  console.log("=========================================================\n");

  return {
    groups,
    unassigned,
    processedCount: analyzedFiles.length,
    actionsLog,
  };
}

// Rulare directă din CLI
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Set(args.filter((a) => a.startsWith("--")));

  if (flags.has("--help") || flags.has("-h") || positional.length === 0) {
    console.log(`
Utilizare:
  node scripts/sorteaza-dosar-final.mjs <folder_sursa> [folder_destinatie] [optiuni]

Argumente:
  folder_sursa        Calea către folderul cu fotografii/documente amestecate (obligatoriu)
  folder_destinatie   Calea către baza de dosare locale (opțional, implicit C:\\DOSARE)

Opțiuni:
  --move              Mută fișierele în loc să le copieze (implicit copiază)
  --dry-run           Simulează operațiunea fără a copia sau muta vreun fișier
  --ocr-lang=<lang>   Limba Tesseract (implicit ron+eng)
  --help, -h          Afișează acest mesaj

Exemple:
  node scripts/sorteaza-dosar-final.mjs "C:\\PozeNoi"
  node scripts/sorteaza-dosar-final.mjs "C:\\PozeNoi" "C:\\DOSARE" --move
  node scripts/sorteaza-dosar-final.mjs "C:\\PozeNoi" "C:\\DOSARE" --dry-run
`);
    process.exit(0);
  }

  const sourceDir = positional[0];
  const destDir = positional[1] || "C:\\DOSARE";
  const move = flags.has("--move");
  const dryRun = flags.has("--dry-run");

  let ocrLang = "ron+eng";
  for (const f of flags) {
    if (f.startsWith("--ocr-lang=")) {
      ocrLang = f.split("=")[1];
    }
  }

  runSortareDosarFinal({ sourceDir, destDir, move, dryRun, ocrLang }).catch((err) => {
    console.error("❌ Eroare la execuție:", err);
    process.exit(1);
  });
}
