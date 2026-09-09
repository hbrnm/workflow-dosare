import { describe, it, expect } from "vitest";
import {
  INSURER_DEFAULT_EMAILS,
  getInsurerDefaultEmail,
  buildReconstatareEmailSubject,
  buildReconstatareEmailBody,
  formatEmailBodyToHtml,
  buildReconstatareWaMessage,
  buildReconstatareWaUrl,
  buildReconstatareMailtoUrl,
} from "../emailInspectorUtils";

describe("emailInspectorUtils", () => {
  it("resolves default insurer emails properly", () => {
    expect(getInsurerDefaultEmail("Omniasig VIG")).toBe("daune@omniasig.ro");
    expect(getInsurerDefaultEmail("Asirom VIG")).toBe("daune@asirom.ro");
    expect(getInsurerDefaultEmail("Groupama")).toBe("daune@groupama.ro");
    expect(getInsurerDefaultEmail("Allianz-Țiriac")).toBe("daune@allianztiriac.ro");
    expect(getInsurerDefaultEmail("")).toBe("");
    expect(getInsurerDefaultEmail(null)).toBe("");
  });

  it("builds the email subject formatted correctly", () => {
    const claim = {
      numarDosar: "DOS-2026-100",
      numarInmatriculare: "B123XYZ",
      marcaModel: "Dacia Duster",
    };
    const subject = buildReconstatareEmailSubject({
      claim,
      nrDosarAsigurator: "998877",
    });

    expect(subject).toBe(
      "Cerere Reconstatare Daune Ascunse - Dosar DOS-2026-100 (Dosar Asig: 998877) - Auto B123XYZ"
    );
  });

  it("builds a full email body containing claim details and parts formatted on separate lines", () => {
    const claim = {
      asigurator: "Omniasig VIG",
      numarDosar: "DOS-2026-100",
      numarInmatriculare: "B123XYZ",
      marcaModel: "Dacia Duster",
      vin: "VF1TESTVIN12345",
      client: "Ionescu Ion",
    };

    const repere = [
      {
        piesa: "ARMATURA BARA SPATE",
        operatiune: "INL (Inlocuire)",
        descriere: "Fisurat complet la interior",
      },
      {
        piesa: "SUPORT SENZOR PARCARE",
        operatiune: "INL (Inlocuire)",
        descriere: "Ureche de prindere rupta",
      },
    ];

    const branding = {
      atelierNume: "Auto Service Pro",
      adresa: "Bucuresti, Sector 1",
      telefon: "0711222333",
      email: "contact@servicepro.ro",
    };

    const body = buildReconstatareEmailBody({
      claim,
      inspectorDauna: "Popescu Mihai",
      nrDosarAsigurator: "998877",
      dataCerere: "2026-09-09",
      modDesfasurare: "Fizic la atelier",
      intervalOrar: "10:00 - 14:00",
      motivatie: "Daune ascunse identificate dupa dezechiparea barii spate.",
      repere,
      branding,
    });

    expect(body).toContain("In atentia: Popescu Mihai");
    expect(body).toContain("Numar Dosar Service: DOS-2026-100");
    expect(body).toContain("Numar Dosar Asigurator: 998877");
    expect(body).toContain("Autovehicul: Dacia Duster (B123XYZ)");
    expect(body).toContain("Serie Sasiu (VIN): VF1TESTVIN12345");
    expect(body).toContain("1. ARMATURA BARA SPATE [INL (Inlocuire)] - Fisurat complet la interior");
    expect(body).toContain("2. SUPORT SENZOR PARCARE [INL (Inlocuire)] - Ureche de prindere rupta");
    expect(body).toContain("Auto Service Pro");
    expect(body).toContain("0711222333");
    // Verifică că liniile sunt separate prin \n
    expect(body.split("\n").length).toBeGreaterThan(15);
  });

  it("formats email body to rich HTML with individual line elements", () => {
    const html = formatEmailBodyToHtml("Test Subject", "Linia 1\nLinia 2\n\nLinia 3");
    expect(html).toContain("Linia 1</div>");
    expect(html).toContain("Linia 2</div>");
    expect(html).toContain("<br/>");
    expect(html).toContain("Linia 3</div>");
  });

  it("builds a formatted multi-line WhatsApp message", () => {
    const claim = {
      numarDosar: "DOS-2026-100",
      numarInmatriculare: "B123XYZ",
      asigurator: "Omniasig VIG",
    };
    const wa = buildReconstatareWaMessage({
      claim,
      inspectorDauna: "Popescu Ion",
      nrDosarAsigurator: "998877",
      branding: { atelierNume: "Service Pro" },
      repereCount: 3,
    });

    expect(wa).toContain("Buna ziua!");
    expect(wa).toContain("DOS-2026-100 - B123XYZ");
    expect(wa).toContain("Popescu Ion");
    expect(wa).toContain("(3 repere noi)");
    expect(wa.split("\n").length).toBeGreaterThan(5);
  });

  it("builds valid WhatsApp URLs with or without phone number", () => {
    // Cu număr de telefon
    const urlWithPhone = buildReconstatareWaUrl({
      phone: "0722123456",
      message: "Salut!",
    });
    expect(urlWithPhone).toContain("https://api.whatsapp.com/send?");
    expect(urlWithPhone).toContain("phone=40722123456");
    expect(urlWithPhone).toContain("text=Salut!");

    // Fără număr de telefon (deschide contact picker WhatsApp)
    const urlWithoutPhone = buildReconstatareWaUrl({
      phone: "",
      message: "Salut fara numar!",
    });
    expect(urlWithoutPhone).toBe("https://api.whatsapp.com/send?text=Salut%20fara%20numar!");
  });

  it("builds a valid mailto URL with CRLF encoded linebreaks", () => {
    const url = buildReconstatareMailtoUrl({
      to: "daune@omniasig.ro",
      subject: "Cerere Reconstatare - Dosar 100",
      body: "Buna ziua,\nTest",
    });

    expect(url.startsWith("mailto:daune@omniasig.ro?")).toBe(true);
    expect(url).toContain("subject=Cerere%20Reconstatare%20-%20Dosar%20100");
    expect(url).toContain("body=Buna%20ziua%2C%0D%0ATest");
  });
});
