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
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

/**
 * Rezolvă calea către un modul npm din proiect sau global
 */
function resolveProjectModule(moduleName) {
  // 1. Încearcă direct din directorul curent sau al scriptului
  try {
    const localReq = createRequire(path.join(process.cwd(), "package.json"));
    return localReq.resolve(moduleName);
  } catch {}

  try {
    const scriptReq = createRequire(import.meta.url);
    return scriptReq.resolve(moduleName);
  } catch {}

  // 2. Căutare în locațiile proiectului principal
  const projectDirs = [
    "c:/Users/pc1/Documents/workflow-dosare-main/package.json",
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"),
  ];
  for (const p of projectDirs) {
    if (fs.existsSync(p)) {
      try {
        const projReq = createRequire(p);
        return projReq.resolve(moduleName);
      } catch {}
    }
  }
  return null;
}

/**
 * Încarcă modulul Tesseract.js căutând în directorul curent sau în proiect
 */
export async function loadTesseractModule() {
  const modPath = resolveProjectModule("tesseract.js");
  if (modPath) {
    try {
      const mod = await import(pathToFileURL(modPath).href);
      return mod.default || mod;
    } catch {}
  }
  try {
    const mod = await import("tesseract.js");
    return mod.default || mod;
  } catch {
    throw new Error("Modulul 'tesseract.js' nu a fost găsit. Rulați din proiect sau asigurați-vă că este instalat.");
  }
}

/**
 * Încarcă modulul Sharp pentru rotire automată și optimizare imagini
 */
export async function loadSharpModule() {
  const modPath = resolveProjectModule("sharp");
  if (modPath) {
    try {
      const mod = await import(pathToFileURL(modPath).href);
      return mod.default || mod;
    } catch {}
  }
  try {
    const mod = await import("sharp");
    return mod.default || mod;
  } catch {
    return null;
  }
}


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
 * Extrage CNP din text (13 cifre consecutive, format valid S AA LL ZZ JJ NNN C)
 */
export function extractCnp(text) {
  if (!text) return null;
  // S (1-8), AA (00-99), LL (01-12), ZZ (01-31), JJ (01-52), NNN (001-999), C (0-9)
  const regex = /(?:^|[^a-zA-Z0-9])([1-8]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6})(?=[^a-zA-Z0-9]|$)/g;
  let match;
  while ((match = regex.exec(String(text))) !== null) {
    return match[1];
  }
  return null;
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
    (normText.includes("certificat") && normText.includes("inmatriculare")) ||
    normText.includes("permis de circulation") ||
    normText.includes("fahrzeugschein") ||
    normText.includes("anexa la certificat") ||
    normText.includes("inspectii tehnice periodice") ||
    normText.includes("inspectia tehnica periodica") ||
    (normText.includes("romania") && normText.includes("comunitatea europeana") && normText.includes("serie")) ||
    (normText.includes("numar de identificare") && normText.includes("masa maxima")) ||
    (normText.includes("srpciv") && (normText.includes("autoturism") || normText.includes("inmatriculare") || normText.includes("observatii")))
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
    normText.includes("cetatenie / nationality") ||
    normText.includes("loc nastere") ||
    (normText.includes("cnp") && (normText.includes("seria") || normText.includes("spclep") || normText.includes("rou") || normText.includes("sex") || normText.includes("jud")))
  ) {
    isCi = true;
  }

  // 3. Verificare Cerere de Despăgubire
  if (
    normFile.includes("cerere") ||
    normFile.includes("despagubire") ||
    normText.includes("cerere de plata") ||
    normText.includes("cerere de despagubire") ||
    normText.includes("cererea de despagubire") ||
    normText.includes("despagubirii") ||
    normText.includes("bunul avariat") ||
    (normText.includes("dosar") && (normText.includes("asirom") || normText.includes("omniasig") || normText.includes("allianz") || normText.includes("generali") || normText.includes("groupama")) && (normText.includes("plata") || normText.includes("dauna") || normText.includes("despagubit"))) ||
    (normText.includes("despagubit") && normText.includes("asigurator"))
  ) {
    isCerere = true;
  }

  // Dacă pe aceeași pagină sunt prezente atât Talon cât și CI / CNP
  // Notă: Talonul românesc nu conține niciodată CNP, așadar un CNP alături de date de talon
  // înseamnă că buletinul a fost așezat/fotografiat pe aceeași pagină cu talonul.
  const hasCnp = Boolean(extractCnp(text));
  if (isTalon && (isCi || hasCnp) && !isCerere) {
    return "TALON_SI_CI";
  }

  if (isCerere) return "CERERE_DESPAGUBIRE";
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
 * Rezolvă directorul destinație de bază, identificând dacă dosarele reale ale mașinilor
 * sunt pe Desktop (C:\Users\pc1\Desktop\DOSARE) sau în rădăcină (C:\DOSARE).
 */
export function resolveBaseDestinationDir(preferredDir) {
  const desktopDosare = "C:\\Users\\pc1\\Desktop\\DOSARE";
  const rootDosare = "C:\\DOSARE";

  const countCarFolders = (dir) => {
    try {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && /^[A-Z]{1,2}\s*\d{2,3}\s*[A-Z]{3}$/i.test(d.name)).length;
    } catch {
      return 0;
    }
  };

  const desktopCount = countCarFolders(desktopDosare);
  const rootCount = countCarFolders(rootDosare);

  if (preferredDir && preferredDir !== rootDosare && preferredDir !== desktopDosare) {
    return preferredDir;
  }

  if (desktopCount >= rootCount && desktopCount > 0) {
    return desktopDosare;
  }
  if (rootCount > 0) {
    return rootDosare;
  }
  return preferredDir || (fs.existsSync(desktopDosare) ? desktopDosare : rootDosare);
}

/**
 * Motorul de împerechere a documentelor
 */
export function pairDocuments(analyzedFiles) {
  const groups = new Map(); // Plate -> { plate, talon: [], buletin: [], cerere: [], talonSiCi: [], altele: [], cnpList: Set }
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
          talonSiCi: [],
          altele: [],
          cnpList: new Set(),
        });
      }
      const grp = groups.get(item.plate);
      if (item.cnp) grp.cnpList.add(item.cnp);

      if (item.type === "TALON_SI_CI") grp.talonSiCi.push(item);
      else if (item.type === "TALON") grp.talon.push(item);
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
      if (item.type === "TALON_SI_CI") grp.talonSiCi.push(item);
      else if (item.type === "BULETIN") grp.buletin.push(item);
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
  const destBaseDir = path.resolve(resolveBaseDestinationDir(options.destDir || "C:\\DOSARE"));
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

  console.log(`🔎 Găsit ${filesToProcess.length} fișiere. Se inițializează motorul OCR Tesseract și Sharp...`);

  // Inițializare Tesseract Worker & Sharp
  const tesseract = await loadTesseractModule();
  const createWorker = tesseract.createWorker || tesseract.default?.createWorker;
  const worker = await createWorker(ocrLang);
  const sharpModule = await loadSharpModule();
  console.log(`🖼️  Modul rotire automată: ${sharpModule ? "Sharp activat (multi-orientare 0°, 90°, 270°)" : "Inactiv (fallback 0°)"}`);

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

      // Execuție OCR multi-orientare doar pe imagini valide
      const ext = path.extname(filename).toLowerCase();
      if (ext !== ".pdf" && isValidImageFile(filePath)) {
        const orientations = [0, 90, 270];
        let bestText = "";
        let bestPlate = null;
        let bestCnp = null;
        let bestType = "ALTE_DOCUMENTE";

        for (const rot of orientations) {
          if (rot !== 0 && !sharpModule) break;
          try {
            const imgInput = rot === 0 ? filePath : await sharpModule(filePath).rotate(rot).toBuffer();
            const ret = await worker.recognize(imgInput);
            const currentText = ret?.data?.text || "";
            const currentPlate = extractPlate(currentText) || extractPlate(filename);
            const currentCnp = extractCnp(currentText) || extractCnp(filename);
            const currentType = classifyDocument(currentText, filename);

            if (currentPlate || currentType !== "ALTE_DOCUMENTE") {
              bestText = currentText;
              bestPlate = currentPlate;
              bestCnp = currentCnp;
              bestType = currentType;
              // Dacă am detectat număr auto și tipul specific de document, orientarea este optimă
              if (bestPlate && bestType !== "ALTE_DOCUMENTE") {
                break;
              }
            } else if (!bestText || currentText.length > bestText.length) {
              bestText = currentText;
              bestPlate = currentPlate;
              bestCnp = currentCnp;
              bestType = currentType;
            }
          } catch {
            // continuă cu următoarea rotație
          }
        }

        ocrText = bestText;
        if (bestPlate) plate = bestPlate;
        if (bestCnp) cnp = bestCnp;
        if (bestType !== "ALTE_DOCUMENTE") type = bestType;
      }

      // Fallback dacă nu a fost clasificat
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
    if (grp.talonSiCi.length > 0) {
      console.log(`   - Talon + Buletin (pe aceeași pagină): ${grp.talonSiCi.length} fișier(e)`);
    }
    if (grp.talon.length > 0) {
      console.log(`   - Talon separat:                      ${grp.talon.length} fișier(e)`);
    }
    if (grp.buletin.length > 0) {
      console.log(`   - Buletin (CI) separat:               ${grp.buletin.length} fișier(e)`);
    }
    console.log(`   - Cerere Despăgubire:                 ${grp.cerere.length} fișier(e)`);
    if (grp.altele.length > 0) {
      console.log(`   - Alte documente:                     ${grp.altele.length} fișier(e)`);
    }

    const carFolder = findOrCreateCarFolder(destBaseDir, grp.plate);
    const targetSubfolder = path.join(carFolder, "05_Dosar_Final");

    if (!isDryRun && !fs.existsSync(targetSubfolder)) {
      fs.mkdirSync(targetSubfolder, { recursive: true });
    }

    const allGroupDocs = [];
    if (grp.talonSiCi && grp.talonSiCi.length > 0) {
      for (const d of grp.talonSiCi) {
        allGroupDocs.push({ ...d, docRole: "Talon_si_CI" });
      }
    }
    for (const d of grp.talon) {
      allGroupDocs.push({ ...d, docRole: "Talon" });
    }
    for (const d of grp.buletin) {
      allGroupDocs.push({ ...d, docRole: "CI" });
    }
    for (const d of grp.cerere) {
      allGroupDocs.push({ ...d, docRole: "Cerere_Despagubire" });
    }
    for (const d of grp.altele) {
      allGroupDocs.push({ ...d, docRole: "Doc" });
    }

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
