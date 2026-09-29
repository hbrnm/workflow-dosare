import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  extractPlate,
  extractCnp,
  classifyDocument,
  pairDocuments,
  findOrCreateCarFolder,
  getSafeDestinationPath,
  normalizeText,
} from "../../../scripts/sorteaza-dosar-final.mjs";

describe("sorteaza-dosar-final", () => {
  describe("extractPlate", () => {
    it("extrage corect numere de București și din provincie", () => {
      expect(extractPlate("Talon masina B 123 ABC inmatriculat")).toBe("B 123 ABC");
      expect(extractPlate("certificat_CJ01XYZ.jpg")).toBe("CJ 01 XYZ");
      expect(extractPlate("Auto seria IS-99-PRO pe strada")).toBe("IS 99 PRO");
      expect(extractPlate("B-175-VOI")).toBe("B 175 VOI");
    });

    it("ignoră secvențe care nu conțin județe valide din România", () => {
      expect(extractPlate("XX 123 ABC")).toBe(null);
      expect(extractPlate("Doar un text oarecare")).toBe(null);
    });
  });

  describe("extractCnp", () => {
    it("extrage CNP valid de 13 cifre", () => {
      expect(extractCnp("Subsemnatul avand CNP 1850214123456 domiciliat in")).toBe("1850214123456");
      expect(extractCnp("CNP: 2900517055069")).toBe("2900517055069");
      expect(extractCnp("fara cnp aici 12345")).toBe(null);
    });
  });

  describe("classifyDocument", () => {
    it("identifică corect talonul / certificatul de înmatriculare", () => {
      expect(classifyDocument("ROMANIA CERTIFICAT DE INMATRICULARE COMUNITATEA EUROPEANA", "scan1.jpg")).toBe("TALON");
      expect(classifyDocument("", "talon_B123ABC.jpg")).toBe("TALON");
    });

    it("identifică corect buletinul / cartea de identitate", () => {
      expect(classifyDocument("ROMANIA CARTE DE IDENTITATE CNP 1850214123456 DOMICILIU", "doc.jpg")).toBe("BULETIN");
      expect(classifyDocument("", "buletin_popescu.jpg")).toBe("BULETIN");
    });

    it("identifică corect cererea de despăgubire", () => {
      expect(classifyDocument("CERERE DE PLATA A DESPAGUBIRII ASIROM BUNUL AVARIAT", "cerere.pdf")).toBe("CERERE_DESPAGUBIRE");
      expect(classifyDocument("", "cerere_despagubire_omniasig.jpg")).toBe("CERERE_DESPAGUBIRE");
    });
  });

  describe("pairDocuments", () => {
    it("împerechează talonul, cererea și buletinul cu număr direct", () => {
      const files = [
        { filename: "talon.jpg", plate: "B 123 ABC", type: "TALON", cnp: "1850214123456" },
        { filename: "cerere.jpg", plate: "B 123 ABC", type: "CERERE_DESPAGUBIRE" },
        { filename: "ci.jpg", plate: "B 123 ABC", type: "BULETIN", cnp: "1850214123456" },
      ];

      const { groups, unassigned } = pairDocuments(files);
      expect(groups).toHaveLength(1);
      expect(groups[0].plate).toBe("B 123 ABC");
      expect(groups[0].talon).toHaveLength(1);
      expect(groups[0].cerere).toHaveLength(1);
      expect(groups[0].buletin).toHaveLength(1);
      expect(unassigned).toHaveLength(0);
    });

    it("împerechează buletinul FĂRĂ număr auto notat pe el, prin corelare CNP cu talonul", () => {
      const files = [
        { filename: "talon.jpg", plate: "B 123 ABC", type: "TALON", cnp: "1850214123456" },
        { filename: "cerere.jpg", plate: "B 123 ABC", type: "CERERE_DESPAGUBIRE" },
        // Buletinul nu are numărul auto pe el, dar are același CNP!
        { filename: "ci_anonim.jpg", plate: null, type: "BULETIN", cnp: "1850214123456" },
      ];

      const { groups, unassigned } = pairDocuments(files);
      expect(groups).toHaveLength(1);
      expect(groups[0].plate).toBe("B 123 ABC");
      expect(groups[0].buletin).toHaveLength(1);
      expect(groups[0].buletin[0].filename).toBe("ci_anonim.jpg");
      expect(groups[0].buletin[0].matchedVia).toBe("CNP");
      expect(unassigned).toHaveLength(0);
    });

    it("lasă în unassigned fișierele complet necorelate", () => {
      const files = [
        { filename: "peisaj.jpg", plate: null, type: "ALTE_DOCUMENTE", cnp: null },
      ];

      const { groups, unassigned } = pairDocuments(files);
      expect(groups).toHaveLength(0);
      expect(unassigned).toHaveLength(1);
      expect(unassigned[0].filename).toBe("peisaj.jpg");
    });
  });

  describe("findOrCreateCarFolder & getSafeDestinationPath", () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dosare-test-"));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("găsește folderul existent chiar dacă are alt format (spații / cratimă)", () => {
      const existing = path.join(tempDir, "B-123-ABC");
      fs.mkdirSync(existing);

      const found = findOrCreateCarFolder(tempDir, "B 123 ABC");
      expect(found).toBe(existing);
    });

    it("creează folder nou dacă nu există deja", () => {
      const target = findOrCreateCarFolder(tempDir, "CJ 99 WWW");
      expect(fs.existsSync(target)).toBe(true);
      expect(path.basename(target)).toBe("CJ 99 WWW");
    });

    it("evită suprascrierea fișierelor existente adăugând sufix numeric", () => {
      const destFile = path.join(tempDir, "Talon_B123ABC.jpg");
      fs.writeFileSync(destFile, "dummy");

      const safePath = getSafeDestinationPath(tempDir, "Talon_B123ABC.jpg");
      expect(path.basename(safePath)).toBe("Talon_B123ABC_1.jpg");
    });
  });

  describe("Cazuri specifice: TALON + CI pe aceeași pagină și dosare doar cu cerere", () => {
    it("clasifică drept TALON_SI_CI când ambele documente sau talon + CNP sunt prezente", () => {
      const ocrCombined = `
        ROMANIA CERTIFICAT DE INMATRICULARE
        A B-304-KAS
        CARTE DE IDENTITATE
        CNP 1880401295595
      `;
      expect(classifyDocument(ocrCombined, "WhatsApp_Image.jpeg")).toBe("TALON_SI_CI");
    });

    it("clasifică drept TALON_SI_CI dacă este talon și conține CNP personal chiar dacă buletinul are text redus", () => {
      const ocrTalonCuCnp = `
        ANEXA LA CERTIFICATUL DE INMATRICULARE B-304-KAS
        INSPECTII TEHNICE PERIODICE
        NEGOITA IONUT CIPRIAN
        1880401295595
      `;
      expect(classifyDocument(ocrTalonCuCnp, "scan.jpeg")).toBe("TALON_SI_CI");
    });

    it("ignoră numere de înregistrare comercială (ex: J1991000304405) pentru a nu le confunda cu CNP", () => {
      expect(extractCnp("ASIROM VIG SA J1991000304405 CUI 123456")).toBe(null);
    });

    it("împerechează și gestionează corect un dosar care are DOAR cerere de despăgubire (fără CI și talon)", () => {
      const files = [
        { filename: "cerere_B304KAS.jpeg", plate: "B 304 KAS", type: "CERERE_DESPAGUBIRE" },
      ];

      const { groups, unassigned } = pairDocuments(files);
      expect(groups).toHaveLength(1);
      expect(groups[0].plate).toBe("B 304 KAS");
      expect(groups[0].cerere).toHaveLength(1);
      expect(groups[0].talon).toHaveLength(0);
      expect(groups[0].buletin).toHaveLength(0);
      expect(groups[0].talonSiCi).toHaveLength(0);
      expect(unassigned).toHaveLength(0);
    });

    it("împerechează corect un fișier TALON_SI_CI cu o cerere de despăgubire", () => {
      const files = [
        { filename: "cerere.jpeg", plate: "B 304 KAS", type: "CERERE_DESPAGUBIRE" },
        { filename: "talon_si_ci.jpeg", plate: "B 304 KAS", type: "TALON_SI_CI", cnp: "1880401295595" },
      ];

      const { groups, unassigned } = pairDocuments(files);
      expect(groups).toHaveLength(1);
      expect(groups[0].plate).toBe("B 304 KAS");
      expect(groups[0].cerere).toHaveLength(1);
      expect(groups[0].talonSiCi).toHaveLength(1);
      expect(unassigned).toHaveLength(0);
    });
  });
});

