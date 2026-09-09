import { describe, it, expect, vi } from "vitest";
import { generateCerereReconstatarePdf } from "../generateCerereReconstatarePdf";

describe("generateCerereReconstatarePdf", () => {
  it("generates a valid PDF document and returns fileName", async () => {
    const claim = {
      id: "dosar-1",
      numarDosar: "DOS-2026-100",
      nrDosarAsigurator: "ASIG-9988",
      numarInmatriculare: "B123XYZ",
      marcaModel: "Dacia Duster",
      vin: "UU1HSDJ8372619",
      client: "Ionescu Vasile",
      telefonClient: "0722111222",
      asigurator: "Omniasig VIG",
      inspectorDauna: "Popescu Mihai",
    };

    const reconstatareData = {
      inspectorDauna: "Popescu Mihai",
      nrDosarAsigurator: "ASIG-9988",
      dataCerere: "2026-09-08",
      mod: "Fizic la atelier",
      dataOra: "09:00 - 12:00",
      motivatie: "Armatura bara spate deformata si senzori parcare fisurati.",
      repere: [
        {
          piesa: "ARMATURA BARA SPATE",
          operatiune: "INL (Inlocuire)",
          descriere: "Deformat complet la impact",
        },
        {
          piesa: "SUPORT SENZORI PARCARE",
          operatiune: "INL (Inlocuire)",
          descriere: "Urechi rupte",
        },
      ],
      pozeCount: 4,
    };

    const branding = {
      atelierNume: "Auto Wash Service",
      cui: "RO12345678",
      adresa: "Bucuresti, Sector 1",
      telefon: "0799888777",
    };

    const res = await generateCerereReconstatarePdf({
      claim,
      reconstatareData,
      atelierBranding: branding,
    });

    expect(res).toBeTruthy();
    expect(res.fileName).toContain("Cerere_Reconstatare_DOS-2026-100.pdf");
    expect(res.doc).toBeTruthy();
  });
});
