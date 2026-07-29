import { jsPDF } from 'jspdf';
import fs from 'fs';

function stripDiacritics(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[ăâî]/g, (c) => ({'ă':'a','â':'a','î':'i'}[c] || c))
    .replace(/[ĂÂÎ]/g, (c) => ({'Ă':'A','Â':'A','Î':'I'}[c] || c))
    .replace(/[șş]/g, 's').replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't').replace(/[ȚŢ]/g, 'T');
}

function generatePdfFile(claim, filename = 'dosar-test.pdf') {
  console.log('generatePdfFile start');
  const doc = new jsPDF();
  let y = 20;

  const sd = (t) => stripDiacritics(t || "—");

  doc.setFontSize(16);
  doc.text(sd("Proces verbal / Fisa dosar"), 14, y); y += 10;
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(`Generat la ${new Date().toLocaleString('ro-RO')}`, 14, y); y += 10;
  doc.setTextColor(0); doc.setFontSize(11);

  const linie = (label, val) => { doc.setFont(undefined, 'bold'); doc.text(`${sd(label)}:`, 14, y); doc.setFont(undefined, 'normal'); doc.text(sd(val), 70, y); y += 7; };

  linie('Nr. dosar', claim.numarDosar);
  linie('Tip asigurare', claim.tipAsigurare);
  linie('Asigurator', claim.asigurator);
  linie('Status', claim.statusLabel || claim.status);
  y += 3;
  linie('Client', claim.client);
  linie('Telefon', claim.telefonClient);
  linie('Nr. inmatriculare', claim.numarInmatriculare);
  linie('VIN', claim.vin);
  linie('Marca/Model', claim.marcaModel);
  y += 3;
  doc.setFont(undefined, 'bold'); doc.text(sd('Ce este de reparat:'), 14, y); y += 6;
  doc.setFont(undefined, 'normal');
  const descText = sd(claim.ceEsteDeReparat || '—');
  const desc = doc.splitTextToSize(descText, 180);
  doc.text(desc, 14, y); y += desc.length * 6 + 4;
  linie('Masina la schimb', claim.masinaSchimb);
  linie('Zile chirie Audatex', claim.zileChirieAudatex);
  y += 3;
  linie('Valoare piese Audatex', `${claim.valoarePieseAudatex || 0} lei`);
  linie('Valoare achizitie piese', `${claim.valoareAchizitiePiese || 0} lei`);
  linie('Valoare facturata (fara TVA)', `${claim.valoareFacturataFaraTVA || 0} lei`);
  linie('Valoare facturata (cu TVA)', `${claim.valoareFacturataCuTVA || 0} lei`);
  y += 6;
  doc.setDrawColor(180); doc.line(14, y, 90, y + 25); doc.line(120, y, 196, y + 25);
  doc.setFontSize(9); doc.text(sd('Semnatura client'), 14, y + 30); doc.text(sd('Semnatura service'), 120, y + 30);

  try {
    const arrayBuf = doc.output && doc.output('arraybuffer');
    if (!arrayBuf) throw new Error('jsPDF.output returned empty');
    fs.writeFileSync(filename, Buffer.from(arrayBuf));
    console.log('PDF generat:', filename);
  } catch (err) {
    console.error('Eroare generare PDF:', err && err.stack ? err.stack : err);
    throw err;
  }
}

const demoClaim = {
  numarDosar: '123456',
  tipAsigurare: 'CASCO',
  asigurator: 'Omniasig VIG',
  status: '3. Reconstatare',
  statusLabel: '3. Reconstatare',
  client: 'laudat alex',
  telefonClient: '0758232393',
  numarInmatriculare: 'TR06FTP',
  vin: '—',
  marcaModel: '—',
  ceEsteDeReparat: 'bara fata',
  masinaSchimb: '—',
  zileChirieAudatex: '—',
  valoarePieseAudatex: 0,
  valoareAchizitiePiese: 0,
  manopera: { tinichigerie: { facturat: 0 }, vopsitorie: { facturat: 0 } },
  valoareFacturataFaraTVA: 0,
  valoareFacturataCuTVA: 0,
};

generatePdfFile(demoClaim, 'dosar-test.pdf');
