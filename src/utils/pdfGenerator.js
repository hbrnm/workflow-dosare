async function createPdf(options = {}) {
  const { jsPDF } = await import("jspdf");
  return new jsPDF(options);
}

import { getStatusDefinition } from "../constants/config";
import { fmtDateTime, fmtDate } from "./dateUtils";
import { formatIstoricValoare, CAMP_LABELS } from "./claimUtils";
import { resolveCerereDespagubireParties } from "./cerereDespagubire";

function stripDiacritics(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâî]/g, (c) => ({ 'ă': 'a', 'â': 'a', 'î': 'i' }[c] || c))
    .replace(/[ĂÂÎ]/g, (c) => ({ 'Ă': 'A', 'Â': 'A', 'Î': 'I' }[c] || c))
    .replace(/[șş]/g, 's').replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't').replace(/[ȚȚ]/g, 'T');
}

const sd = (t) => stripDiacritics(t || "—");

export async function generateazaPDF(claim, istoric = [], branding = null) {
  const doc = await createPdf();
  const s = getStatusDefinition(claim.status);
  const atelier = branding?.atelierNume || "Dosare Daună";
  let y = 20;

  doc.setFontSize(16);
  doc.text(sd(atelier), 14, y); y += 8;
  doc.setFontSize(13);
  doc.text(sd("Proces-verbal / Fișă dosar"), 14, y); y += 10;
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Generat la ${fmtDateTime(new Date())}`, 14, y); y += 10;
  doc.setTextColor(0); doc.setFontSize(11);

  const linie = (label, val) => {
    doc.setFont(undefined, "bold");
    doc.text(`${sd(label)}:`, 14, y);
    doc.setFont(undefined, "normal");
    doc.text(sd(val), 70, y);
    y += 7;
  };

  linie("Nr. dosar", claim.numarDosar);
  linie("Tip asigurare", claim.tipAsigurare);
  linie("Asigurător", claim.asigurator);
  linie("Status", `${s.num}. ${sd(s.label)}`);
  y += 3;
  linie("Client", claim.client);
  linie("Telefon", claim.telefonClient);
  linie("Nr. înmatriculare", claim.numarInmatriculare);
  linie("VIN", claim.vin);
  linie("Marcă/Model", claim.marcaModel);
  y += 3;
  doc.setFont(undefined, "bold"); doc.text(sd("Ce este de reparat:"), 14, y); y += 6;
  doc.setFont(undefined, "normal");
  const descText = sd(claim.ceEsteDeReparat || "—");
  const desc = doc.splitTextToSize(descText, 180);
  doc.text(desc, 14, y); y += desc.length * 6 + 4;
  linie("Mașină la schimb", claim.masinaSchimb);
  linie("Zile chirie Audatex", claim.zileChirieAudatex);
  y += 3;
  linie("Valoare piese Audatex", `${claim.valoarePieseAudatex || 0} lei`);
  linie("Valoare achiziție piese", `${claim.valoareAchizitiePiese || 0} lei`);
  linie("Manoperă tinichigerie", `${(claim.manopera && claim.manopera.tinichigerie && claim.manopera.tinichigerie.facturat) || 0} lei`);
  linie("Manoperă vopsitorie", `${(claim.manopera && claim.manopera.vopsitorie && claim.manopera.vopsitorie.facturat) || 0} lei`);
  y += 6;
  doc.setDrawColor(180); doc.line(14, y, 90, y + 25); doc.line(120, y, 196, y + 25);
  doc.setFontSize(9); doc.text(sd("Semnătură client"), 14, y + 30); doc.text(sd("Semnătură service"), 120, y + 30);

  y += 44;
  if ((istoric || []).length > 0) {
    const ensureSpace = (needed = 20) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    ensureSpace(12);
    doc.setFontSize(12); doc.setFont(undefined, "bold"); doc.text(sd("Istoric modificări"), 14, y); y += 8;
    doc.setFont(undefined, "normal"); doc.setFontSize(10);
    for (const h of istoric) {
      ensureSpace(18);
      const when = fmtDateTime(h.created_at);
      doc.setFontSize(9); doc.setTextColor(110);
      doc.text(`${when} · ${sd(h.user_email || "necunoscut")}`, 14, y); y += 6;
      doc.setTextColor(0); doc.setFontSize(10);
      const mods = h.modificari || {};
      for (const [camp, diff] of Object.entries(mods)) {
        ensureSpace(10);
        const label = sd(CAMP_LABELS[camp] || camp);
        let oldVal = camp === "data_schimbare_status" ? fmtDateTime(diff.old) : formatIstoricValoare(camp, diff.old);
        let newVal = camp === "data_schimbare_status" ? fmtDateTime(diff.new) : formatIstoricValoare(camp, diff.new);
        const line = `${label}: ${sd(String(oldVal))} → ${sd(String(newVal))}`;
        const parts = doc.splitTextToSize(line, 180);
        doc.text(parts, 14, y);
        y += parts.length * 6;
      }
      y += 4;
    }
    doc.setTextColor(0);
  }

  doc.save(`dosar-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

export async function generateazaProcesVerbalMasinaSchimb(claim) {
  const doc = await createPdf();
  let y = 20;

  // Header Title
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text(sd("PROCES-VERBAL DE PREDARE / PRIMIRE AUTOVEHICUL LA SCHIMB"), 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Anexă la Dosarul de Daună Nr. ${sd(claim.numarDosar || "—")} · Data: ${fmtDate(new Date())}`, 14, y);
  y += 12;
  doc.setTextColor(0);

  // Subtitle / Intro
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("1. PĂRȚILE CONTRACTANTE"), 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  const p1 = `PREDĂTOR (Service): Unitatea reparatoare autorizată / Furnizor de mobilitate.`;
  const p2 = `PRIMITOR (Beneficiar): ${sd(claim.client || "—")}, tel: ${sd(claim.telefonClient || "—")}, proprietar / utilizator al autovehiculului avariat ${sd(claim.marcaModel || "")} (nr. înmatriculare: ${sd(claim.numarInmatriculare || "—")}, VIN: ${sd(claim.vin || "—")}).`;

  doc.text(doc.splitTextToSize(sd(p1), 180), 14, y); y += 8;
  doc.text(doc.splitTextToSize(sd(p2), 180), 14, y); y += 12;

  // Replacement Car Details Box
  doc.setFont(undefined, "bold");
  doc.text(sd("2. DATE AUTOVEHICUL OFERIT LA SCHIMB"), 14, y);
  y += 6;

  doc.setFillColor(248, 246, 240);
  doc.rect(14, y, 182, 34, "F");
  doc.setDrawColor(218, 212, 198);
  doc.rect(14, y, 182, 34, "S");

  let boxY = y + 7;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("Nr. Înmatriculare Auto la Schimb:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(sd(claim.masinaSchimb || "Nespecificat"), 85, boxY);
  boxY += 8;

  doc.setFont(undefined, "bold");
  doc.text(sd("Data Predării / Dării la Schimb:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(fmtDate(claim.dataDariiLaSchimb || claim.dataProgramare || new Date()), 85, boxY);
  boxY += 8;

  doc.setFont(undefined, "bold");
  doc.text(sd("Perioadă / Zile aprobate Audatex:"), 18, boxY);
  doc.setFont(undefined, "normal");
  doc.text(`${claim.zileChirieAudatex || 0} zile calendaristice`, 85, boxY);

  y += 42;

  // Terms & Conditions Clause
  doc.setFont(undefined, "bold");
  doc.text(sd("3. CLAUZE ȘI CONDIȚII DE UTILIZARE"), 14, y);
  y += 6;
  doc.setFont(undefined, "normal");
  doc.setFontSize(9.5);

  const clauze = [
    "1. Primitorul declară că a preluat autovehiculul la schimb în stare perfectă de funcționare și fără avarii estetice neconsemnate.",
    "2. Primitorul se obligă să utilizeze autovehiculul cu diligență, să respecte legislația rutieră și să nu înstrăineze ori subînchirieze mașina.",
    "3. Beneficiarul se obligă să restituie autovehiculul imediat după finalizarea lucrărilor de reparație la mașina avariată sau la expirarea perioadei aprobate.",
    "4. Orice daună, sancțiune contravențională (amendă rovinietă, parcare, viteză) survine în perioada utilizării cade în sarcina exclusivă a Primitorului.",
  ];

  for (const c of clauze) {
    const lines = doc.splitTextToSize(sd(c), 180);
    doc.text(lines, 14, y);
    y += lines.length * 5.5 + 2;
  }

  y += 10;

  // Signatures Area
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("PREDĂTOR (Service)"), 25, y);
  doc.text(sd("PRIMITOR (Client)"), 135, y);
  y += 5;

  doc.setDrawColor(180);
  doc.rect(14, y, 75, 25);
  doc.rect(120, y, 75, 25);
  y += 30;

  doc.setFontSize(8.5);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120);
  doc.text(sd("Nume/Semnătură & Ștampilă"), 25, y);
  doc.text(sd("Nume & Semnătură Beneficiar"), 135, y);

  doc.save(`proces-verbal-auto-schimb-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

export async function generateazaFisaIntrareService(claim) {
  const doc = await createPdf();
  let y = 20;

  // Header Title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(sd("FIȘĂ INTRARE SERVICE & ORDIN DE LUCRU"), 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Document intern de recepție atelier · Data: ${fmtDate(new Date())}`, 14, y);
  y += 12;
  doc.setTextColor(0);

  // General Claim Data Box
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("1. IDENTIFICARE DOSAR & CLIENT"), 14, y);
  y += 6;

  doc.setFillColor(248, 246, 240);
  doc.rect(14, y, 182, 38, "F");
  doc.setDrawColor(218, 212, 198);
  doc.rect(14, y, 182, 38, "S");

  let lineY = y + 7;
  const col1 = 18, col2 = 105;

  doc.setFont(undefined, "bold"); doc.text(sd("Nr. Dosar Daună:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.numarDosar || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Tip / Asigurător:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(`${sd(claim.tipAsigurare)} · ${sd(claim.asigurator || "—")}`, col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Client / Proprietar:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.client || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Telefon Client:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.telefonClient || "—"), col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Nr. Înmatriculare:"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.numarInmatriculare || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Marcă / Model:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.marcaModel || "—"), col2 + 35, lineY);
  lineY += 8;

  doc.setFont(undefined, "bold"); doc.text(sd("Serie Șasiu (VIN):"), col1, lineY);
  doc.setFont(undefined, "normal"); doc.text(sd(claim.vin || "—"), col1 + 35, lineY);
  doc.setFont(undefined, "bold"); doc.text(sd("Mașină adusă fizic:"), col2, lineY);
  doc.setFont(undefined, "normal"); doc.text(claim.adusaFizic ? "DA (în curte)" : "NU încă", col2 + 35, lineY);

  y += 46;

  // Work Description Section
  doc.setFont(undefined, "bold");
  doc.text(sd("2. CONSTATĂRI INIȚIALE & CE ESTE DE REPARAT"), 14, y);
  y += 6;

  doc.setFont(undefined, "normal");
  doc.setFontSize(9.5);
  const ceReparat = claim.ceEsteDeReparat || "Nu s-au detaliat încă elementele de reparat.";
  const linesRep = doc.splitTextToSize(sd(ceReparat), 180);

  doc.rect(14, y, 182, Math.max(22, linesRep.length * 6 + 6));
  doc.text(linesRep, 18, y + 7);
  y += Math.max(22, linesRep.length * 6 + 6) + 8;

  // Estimation & Labor Table
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("3. DEVIZ INIȚIAL / VALORI ÎNREGISTRATE"), 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFillColor(35, 40, 46);
  doc.setTextColor(255);
  doc.rect(14, y, 182, 7, "F");
  doc.text(sd("CATEGORIE REPARAȚIE"), 18, y + 5);
  doc.text(sd("VALOARE ESTIMATĂ / ALOCATĂ"), 100, y + 5);
  doc.text(sd("VALOARE FACTURATĂ"), 150, y + 5);
  y += 7;

  doc.setTextColor(0);
  const row = (cat, valAlocat, valFact) => {
    doc.rect(14, y, 182, 7);
    doc.text(sd(cat), 18, y + 5);
    doc.text(`${valAlocat || 0} lei`, 100, y + 5);
    doc.text(`${valFact || 0} lei`, 150, y + 5);
    y += 7;
  };

  row("Tinichigerie", claim.manopera?.tinichigerie?.alocat, claim.manopera?.tinichigerie?.facturat);
  row("Vopsitorie", claim.manopera?.vopsitorie?.alocat, claim.manopera?.vopsitorie?.facturat);
  row("Piese de schimb (Audatex vs Achiziție)", claim.valoarePieseAudatex, claim.valoareAchizitiePiese);

  y += 12;

  // Signatures Area
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("RECEPȚIE ATELIER / RECEPTIONER"), 25, y);
  doc.text(sd("PROPRIETAR / DELEGAT AUTO"), 135, y);
  y += 5;

  doc.setDrawColor(180);
  doc.rect(14, y, 75, 25);
  doc.rect(120, y, 75, 25);
  y += 30;

  doc.setFontSize(8.5);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120);
  doc.text(sd("Semnătură & Ștampilă Service"), 25, y);
  doc.text(sd("Semnătură Predare Auto în Service"), 135, y);

  doc.save(`fisa-intrare-service-${stripDiacritics(claim.numarDosar || "nou")}.pdf`);
}

/**
 * Cerere despăgubire tipizată Omniasig — completează din dosar:
 * nr. dosar, nr. înmatriculare, telefon;
 * Subsemnatul = delegat dacă ≠ client; reprezentant societate = client dacă e firmă.
 * Sume, date accident, bife plată: goale (de mână).
 */
export async function generateazaCerereDespagubireOmniasig(claim) {
  const doc = await createPdf();
  const parties = resolveCerereDespagubireParties(claim);
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  const write = (text, x, yy, opts = {}) => {
    doc.text(sd(text), x, yy, opts);
  };

  // Header Omniasig (compact)
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  doc.setTextColor(80);
  write("OMNIASIG Vienna Insurance Group", 14, y);
  y += 4;
  write("Str. Grigore Mora nr. 23, Sector 1, Bucuresti", 14, y);
  y += 4;
  write("Tel: +4021 405 7420 · office@omniasig.ro", 14, y);
  y += 8;
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  write("CERERE DESPAGUBIRE", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(sd("cu privire la dosarul nr: "), 14, y);
  doc.setFont(undefined, "bold");
  const dosarLabel = sd(claim.numarDosar || "…………………");
  doc.text(dosarLabel, 58, y);
  doc.setFont(undefined, "normal");
  y += 9;

  // Subsemnatul = delegat (dacă ≠ proprietar) sau client persoană.
  // „reprezentant al societății” = clientul când e firmă; altfel gol (de mână).
  doc.setFontSize(9.5);
  const sub = sd(parties.subsemnatul || "_______________________________");
  const societateBlank = parties.reprezentantSocietate
    ? sd(parties.reprezentantSocietate)
    : "_______________________________";
  const repLine = `Subsemnatul(a) ${sub}, reprezentant al societatii ${societateBlank}`;
  const repLines = doc.splitTextToSize(sd(repLine), 182);
  doc.text(repLines, 14, y);
  y += repLines.length * 5 + 5;

  write("CNP __ __ __ __ __ __ __ __ __ __ __ __ __ , domiciliat in ________________, str. __________________, nr____, ap____, sector___,", 14, y);
  y += 5;
  write(`tel. ${sd(claim.telefonClient || "_______________________")}`, 14, y);
  y += 7;

  const propLine = `proprietar al autovehiculului cu numarul ${sd(claim.numarInmatriculare || "____________________")}, va rog sa aprobati plata despagubirii in suma de ____________________`;
  const propLines = doc.splitTextToSize(sd(propLine), 182);
  doc.text(propLines, 14, y);
  y += propLines.length * 5 + 4;

  // Bifă tip plată — goale
  const checks = [
    "pentru reparatie efectuata in regie proprie, pe baza evaluarii OMNIASIG;",
    "avans – pe baza documentelor anexate",
    "dupa efectuarea reparatiilor – plata finala, pe baza urmatoarelor documente anexate:",
  ];
  for (const c of checks) {
    doc.rect(14, y - 2.5, 3.2, 3.2);
    write(c, 20, y);
    y += 5.5;
  }
  write("________________________________________________________________________________", 14, y);
  y += 5;
  write("________________________________________________________________________________", 14, y);
  y += 7;

  write("Suplimentar, mai anexez:", 14, y);
  y += 5;
  write("...............................................................................................................................................", 14, y);
  y += 5;
  write("...............................................................................................................................................", 14, y);
  y += 8;

  doc.setFont(undefined, "bold");
  write("Plata se va efectua in favoarea:", 14, y);
  y += 6;
  doc.setFont(undefined, "normal");
  doc.setFontSize(8.5);
  doc.rect(14, y, 182, 14);
  write("BENEFICIAR", 16, y + 5);
  write("BANCA & CONT / CASIERIE", 70, y + 5);
  write("SUMA", 160, y + 5);
  y += 18;

  doc.setFontSize(8);
  const declaratii = [
    "- Raspund de exactitatea, realitatea si corectitudinea actelor depuse, inteleg ca depunerea de documente false (facturi, devize, alte inscrisuri) indreptateste Asiguratorul sa refuze plata tuturor despagubirilor solicitate.",
    "- Declar pe propria raspundere ca nu mai posed alte polite de asigurare de acelasi tip si nu am solicitat sau primit despagubiri/compensatii banesti de la alt asigurator sau de la terte persoane - sofer vinovat RCA.",
    "- In cazul furtului total, daca autovehiculul va fi gasit, ma oblig sa restitui despagubirea primita sau, dupa caz, diferenta de despagubire daca autovehiculul a suferit avarii.",
    "- In cazul in care actele incheiate de organele de politie, de unitatile de pompieri sau alte organe competente sunt anulate, ma oblig sa restitui de indata intreaga despagubire primita.",
  ];
  for (const d of declaratii) {
    const lines = doc.splitTextToSize(sd(d), 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.6 + 1.5;
  }
  y += 3;

  doc.setFontSize(9);
  write("Suma de (in cifre) _________________ adica (in litere) _____________________________________________,", 14, y);
  y += 5;
  write("reprezinta despagubirea integrala pentru daunele suferite in accidentul de circulatie din data de _____________.", 14, y);
  y += 5;
  write("Prin primirea acestei sume declar ca sunt integral despagubit si ca nu mai am nici o pretentie de despagubire", 14, y);
  y += 5;
  write("de la OMNIASIG V.I.G. S.A., asiguratorul de raspundere civila __________________ si fata de (nume sofer vinovat)", 14, y);
  y += 5;
  write("____________________________ persoana vinovata de producerea accidentului din data de ______________", 14, y);
  y += 7;

  write("Obiectii:", 14, y);
  y += 5;
  write("........................................................................................................................................................................", 14, y);
  y += 5;
  write("........................................................................................................................................................................", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  write("DATA _________________", 14, y);
  write("SEMNATURA / STAMPILA _______________________________", 95, y);

  const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
  doc.save(`cerere-despagubire-omniasig-${token}.pdf`);
}

/**
 * Cerere despăgubire tipizată Asirom (după formularul public „Cerere de plată… asigurări generale”).
 * Auto: nr. dosar, tip poliță, bun avariat, asigurat, subsemnatul/delegat.
 * Sume, IBAN, CNP, bife plată: goale (de mână).
 */
export async function generateazaCerereDespagubireAsirom(claim) {
  const doc = await createPdf();
  const parties = resolveCerereDespagubireParties(claim);
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  const write = (text, x, yy, opts = {}) => {
    doc.text(sd(text), x, yy, opts);
  };

  const tip = String(claim.tipAsigurare || "").toUpperCase();
  const isRca = tip.includes("RCA");
  const isCasco = tip.includes("CASCO");
  const mark = (on) => (on ? "[X]" : "[ ]");

  doc.setFontSize(8);
  doc.setTextColor(80);
  write("ASIROM Vienna Insurance Group", 14, y);
  y += 4;
  write("www.asirom.ro · Call Center 021 9146", 14, y);
  y += 8;
  doc.setTextColor(0);

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  write("CERERE", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  write("de plata a drepturilor din asigurare la asigurarile generale", pageW / 2, y, { align: "center" });
  y += 9;

  // Tabel antet
  doc.setFont(undefined, "normal");
  doc.setFontSize(8.5);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 22, "F");
  doc.setDrawColor(180);
  doc.rect(14, y, 182, 22, "S");

  let rowY = y + 5;
  doc.setFont(undefined, "bold");
  write("Nr. dosar:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(claim.numarDosar || "……………", 36, rowY);

  doc.setFont(undefined, "bold");
  write("Polita tip:", 90, rowY);
  doc.setFont(undefined, "normal");
  write(`${mark(isRca)} RCA   ${mark(isCasco)} Casco   ${mark(!isRca && !isCasco)} Non Auto`, 110, rowY);
  rowY += 6;

  const bun = [claim.numarInmatriculare, claim.marcaModel].filter(Boolean).join(" · ") || "……………………";
  doc.setFont(undefined, "bold");
  write("Bunul avariat:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(bun, 42, rowY);
  rowY += 6;

  doc.setFont(undefined, "bold");
  write("Asigurat/Pagubit:", 16, rowY);
  doc.setFont(undefined, "normal");
  write(parties.proprietar || "……………………", 48, rowY);
  doc.setFont(undefined, "bold");
  write("Data eveniment:", 120, rowY);
  doc.setFont(undefined, "normal");
  write("____________", 152, rowY);

  y += 26;

  const calitate = parties.asCompanyOwner || parties.hasSeparateDelegat
    ? "Reprezentant al beneficiarului"
    : "Asigurat/Pagubit";
  const sub = parties.subsemnatul || "…………………………………………";
  const firmNote = parties.reprezentantSocietate
    ? ` (reprezentant al societatii ${parties.reprezentantSocietate})`
    : "";

  doc.setFontSize(9);
  const intro = `Subsemnatul(a) ${sub}${firmNote}, CNP ____________________, domiciliat in localitatea ____________________, adresa completa ______________________________________________, nr. telefon ${claim.telefonClient || "______________"}, email ____________________, cu actul de identitate seria ____, nr. ____________, in calitate de ${calitate}, solicit plata despagubirii in valoare de ____________________ (lei):`;
  const introLines = doc.splitTextToSize(sd(intro), 182);
  doc.text(introLines, 14, y);
  y += introLines.length * 4.2 + 4;

  doc.rect(14, y - 2.2, 3, 3);
  write("conform evaluare ASIROM (fara documente justificative);", 20, y);
  y += 5.5;
  doc.rect(14, y - 2.2, 3, 3);
  write("conform documente justificative anexate, astfel:", 20, y);
  y += 5.5;
  write("In original: .......................................................................................................................", 14, y);
  y += 5;
  write("In fotocopie: .....................................................................................................................", 14, y);
  y += 8;

  doc.setFont(undefined, "bold");
  write("Despagubirea cuvenita sunt de acord sa fie platita:", 14, y);
  y += 6;
  doc.setFont(undefined, "normal");
  doc.setFontSize(8.5);
  write("[ ] prin casieriile BCR, suma _____________ lei, beneficiar _________________________________", 14, y);
  y += 5;
  write("[ ] prin cont bancar, suma _____________ lei, IBAN _________________________________________", 14, y);
  y += 5;
  write("    banca _______________________________, titular _________________________________________", 14, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  write("Declar, pe propria raspundere, urmatoarele:", 14, y);
  y += 4.5;
  doc.setFont(undefined, "normal");
  const decls = [
    "Am avizat acest eveniment si la Asiguratorul: .............................., iar suma stabilita de acesta este ……….. / Nu am avizat si nu urmeaza sa mai avizez acest eveniment la alta societate de asigurare.",
    "Nu mai posed aceeasi forma de asigurare pentru bunul respectiv incheiata si la alta societate de asigurare.",
    "Ma oblig sa restitui de indata, partial sau total, societatii de asigurare suma de bani primita cu titlu de despagubire, in functie de o eventuala hotarare a instantei ori in cazul anularii actelor organelor competente.",
    "Declar ca, prin primirea sumei de mai sus sunt integral despagubit(a) de catre ASIROM pentru dauna mentionata anterior si nu voi mai avea nicio pretentie fata de ASIROM, asiguratorul de raspundere civila si persoana vinovata de producerea evenimentului.",
  ];
  for (const d of decls) {
    const lines = doc.splitTextToSize(sd(d), 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.5 + 1.2;
  }
  y += 3;

  doc.setFontSize(9);
  write("Doresc sa primesc informare dupa realizarea platii pe email: _______________________________", 14, y);
  y += 5;
  write("Observatii: ...........................................................................................................................", 14, y);
  y += 5;
  write("Localitate: _______________________________", 14, y);
  y += 10;

  doc.setFont(undefined, "bold");
  write("Asigurat / Pagubit / Reprezentant al beneficiarului", 14, y);
  write("Data completarii: __________", 130, y);
  y += 5;
  doc.setFont(undefined, "normal");
  write(`(nume/prenume in clar): ${sd(sub)}`, 14, y);
  y += 8;
  write("Semnatura (stampila daca este cazul): _______________________________", 14, y);

  // Pagina 2 — consimțământ GDPR (compact)
  doc.addPage();
  y = 16;
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  write("DECLARATIE SI CONSIMTAMANT PRIVIND PRELUCRAREA DATELOR CU CARACTER PERSONAL", pageW / 2, y, {
    align: "center",
  });
  y += 10;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const gdprIntro = `Subsemnatul(a) ${sub}, domiciliat(a) in ____________________ si cu CNP _______________, declar ca am citit si am inteles continutul Notei de informare cu privire la prelucrarea de catre ASIROM a datelor cu caracter personal (disponibila pe site-ul ASIROM) si ca imi exprim consimtamantul pentru urmatoarele:`;
  const gdprLines = doc.splitTextToSize(sd(gdprIntro), 182);
  doc.text(gdprLines, 14, y);
  y += gdprLines.length * 4.2 + 6;

  doc.setFontSize(8.5);
  write("[ ] Sunt de acord   [ ] Nu sunt de acord — utilizarea datelor mele pentru oferte / promotii ASIROM.", 14, y);
  y += 8;

  const gdprBody = [
    "Pentru derularea contractului de asigurare ASIROM are acordul meu expres sa contacteze medici / institutii medicale si sa obtina date privind starea mea de sanatate, in masura in care sunt necesare pentru solutionarea dosarului de dauna.",
    "Sunt de acord ca aceste date sa fie transmise catre ASIROM si reasiguratori / spitale / medici doar in scopul determinarii cuantumului despagubirii.",
    "Fara acces la datele necesare, ASIROM poate fi in imposibilitatea obiectiva de a solutiona pretentiile de despagubire.",
  ];
  for (const g of gdprBody) {
    const lines = doc.splitTextToSize(sd(g), 182);
    doc.text(lines, 14, y);
    y += lines.length * 3.6 + 2;
  }
  y += 6;
  write("[ ] Sunt de acord   [ ] Nu sunt de acord — prelucrare date privind sanatatea pentru dosarul de dauna.", 14, y);
  y += 14;

  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  write("Asigurat / Pagubit / Reprezentant al beneficiarului", 14, y);
  write("Data: __________", 130, y);
  y += 6;
  doc.setFont(undefined, "normal");
  write(`(nume/prenume, semnatura): ${sd(sub)} _______________________________`, 14, y);

  const token = stripDiacritics(claim.numarDosar || claim.numarInmatriculare || "nou").replace(/\s+/g, "-");
  doc.save(`cerere-despagubire-asirom-${token}.pdf`);
}
