const fs = require('fs');
let content = fs.readFileSync('src/utils/pdfGenerator.js', 'utf8');

const newFn = \
export async function generateazaContractInchiriere(claim) {
  const doc = await createPdf();
  let y = 20;

  const title = "CONTRACT DE ÎNCHIRIERE AUTOTURISM";
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(sd(title), 105, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(sd("Nr. ____ / ___________    Încheiat astăzi " + fmtDate(new Date()) + " la ____________ între :"), 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(sd("Art. 1 – PĂRȚILE CONTRACTANTE :"), 14, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const p1 = "1. S.C. AUTO WASH IMPEX. cu sediul în Bucuresti, str.Uverturii nr.151 sec.6, înmatriculată la Registrul Comerțului Bucuresti sub nr. J40 / 11131 / 2005, cod unic de înregistrare 17717698, cont bancar RO08 MIRO 0000 1184 0304 0001 deschis la PROCREDIT BANK, reprezentată legal de d.na Sorin Tudorov în calitate de administrator, denumită în continuare proprietar\\nși";
  const p2 = "2. a. .............................................................. cu sediul în ...................................., str. ...................................................... nr. ....., jud. ......................., înmatriculată la Registrul Comerțului ............................. sub nr. J......./............/........., cod unic de înregistrare ................................., cont bancar ........................................................................................................ deschis la .............................................................................., prin imputernicit ........................................................................................................ denumită în continuare chiriaș\\n2 b. " + sd(claim.client || "..............................................................") + ", CNP .............................................................. domiciliat în .............................................................. str. .................................................................................... nr. ......, jud. ......................., legitimat cu ...... seria ...... nr. ...................., eliberat de .............................................................. la data de ................................, telefon: " + sd(claim.telefonClient || "....................") + ", denumită în continuare chiriaș";
  
  const drawText = (text, spacing = 4, bold = false) => {
      if(bold) doc.setFont(undefined, "bold");
      else doc.setFont(undefined, "normal");
      
      const lines = doc.splitTextToSize(text, 180);
      if (y + lines.length * spacing > 280) {
          doc.addPage();
          y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * spacing + 1;
  }

  drawText(sd(p1));
  drawText(sd(p2));
  
  drawText(sd("s-a încheiat următorul contract de închiriere:"));
  y += 2;

  drawText(sd("Art. 2 – OBIECTUL CONTRACTULUI :"), 4, true);
  drawText(sd("Obiectul contractului îl constituie închirierea autoturismului marca " + sd(claim.masinaSchimbModel || "....................................................") + ", nr. Inmatriculare " + sd(claim.masinaSchimbNumar || "..............................................") + " (pentru clientul cu auto avariat marca " + sd(claim.marcaModel || ".....") + " nr. " + sd(claim.numarInmatriculare || ".....") + ")."), 4, false);
  y += 2;

  drawText(sd("Art. 3 - TERMENUL :"), 4, true);
  drawText(sd("Închirierea se face pe o perioada determinata/calculata, conform ore manopera deviz reparatie intocmit in baza nota constatare/reconstatatre eliberate de asigurator, dupa caz " + (claim.zileChirieAudatex || "............") + " zile, începând cu data de " + fmtDate(claim.dataDariiLaSchimb || claim.dataProgramare || new Date()) + ", ora ......"), 4, false);
  y += 2;

  drawText(sd("Art. 4 – CHIRIA/TARIFUL"), 4, true);
  drawText(sd("a. Chiria/tariful si numarul de zile se stabilesc in functie de termenul de executare al lucrarii (ore manopera deviz reparatie), tariful pe ziua de inchiriere este de 50 euro pe zi, tva inclus.\\nb. Neplata chiriei la termen, dă drept proprietarului să ceară plată de daune + penalitati aferente"), 4, false);
  y += 2;

  drawText(sd("Art. 5 – CONDIȚII GENERALE DE ÎNCHIRIERE :"), 4, true);
  const condGen = "a. Autoturismul întrunește toate condițiile tehnice de folosire, fiind în stare perfectă de funcționare și neavând defecte și lipsuri.\\nb. Perioada minimă de închiriere este de 24 ore, o zi indivizibilă.\\nc. Chiriașul are obligația ca pentru autoturismul pus la dispoziție de către proprietar să plătească o chirie echivalentă în lei la cursul de schimb al BNR din ziua efectuării plății.\\nd. În afara sumelor pe care le plătește proprietarului drept chirie, chiriașul este obligat să constituie un depozit în numerar și în echivalent, ca și garanție pentru bună utilizare pe durata derulării contractului, sumă ce va fi returnată chiriașului, dacă nu sunt constatate daune sau avarii la autoturism, în momentul predării acestuia către proprietar.\\ne. Chiriașul se obligă să folosească autoturismul închiriat cu diligența unui bun proprietar.\\nf. La orice lipsă a obiectelor de inventar menționate în procesul verbal de predare/ primire al autoturismului (care face parte integrantă din prezentul contract) societatea își rezervă dreptul de a le reține valoarea din garanția depusă.\\ng. Tariful de închiriere nu cuprinde combustibilul, taxele de trecere / parcare, garaj, transbordare pe timpul închirierii.";
  drawText(sd(condGen), 4, false);
  y += 2;

  drawText(sd("Art. 6 – LOCUL DE ÎNCHIRIERE ȘI UTILIZAREA AUTOTURISMULUI :"), 4, true);
  const locUt = "a. În cazul în care chiriașul dorește a închiria autoturismul dintr-un alt punct geografic decât cel al locației de închiriere, situat la mai mult de 30 km depărtare, acesta este obligat la plata unei taxe suplimentare chiriei, aceeași obligație subzistând și în condițiile în care restituirea autoturismului se realizează la mai mult de 30 km depărtare de locatie\\nb. Chiriașul este ținut a utiliza autoturismul pus la dispoziție de către proprietar exclusiv în scopul transportului de persoane, pentru uzul propriu al chiriașului, orice altă utilizare contrară atrăgând culpa chiriașului pentru eventualele daune sau avarii produse.\\nc. Proprietarul pe toată durata contractului își păstrează dreptul de proprietate deplină asupra autoturismului închiriat, care face obiectul prezentului contract de închiriere.\\nd. Chiriașul, pe întreaga durată a executării contractului, nu poate cere să i se restituie contravaloarea eventualelor îmbunătățiri sau reparații efectuate din inițiativa sa și pentru care a avut acceptul proprietarului.\\ne. Utilizarea autoturismul în afara granițelor României se poate face doar cu acordul expres și scris al proprietarului, care își rezervă dreptul de a modifica cuantumul chiriei, funcție de destinație, kilometri ce vor fi parcurși, fiind interzisă chiriașului parcurgerea unor rute aflate pe teritoriul Ucrainei și/sau Republicii Moldova, decât cu asumarea răspunderii proprii.\\nf. Toate documentele necesare utilizării autoturismului sunt înmânate chiriașului înainte de începerea perioadei de închiriere, odată cu predarea acestuia și trebuie restituite împreună cu autoturismul, în caz contrar chiriașul urmând a fi obligat la plata de penalități, în cuantum de 10 Euro / zi, până la restituirea lor.";
  drawText(sd(locUt), 4, false);
  y += 2;

  drawText(sd("Art. 7 – DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR :"), 4, true);
  const dreptObl1 = "Proprietarul are următoarele drepturi și obligații\\na. Să pună la dispoziția chiriașului, pentru efectuarea transportului arătat la art. 6, lit (b), pe întreaga durată a contractului, autoturismul stabilit și care să satisfacă cerințele standard pentru transporturile interne.\\nb. Să predea chiriașului autoturismul având rezervorul de carburant plin.\\nc. Să asigure RCA autoturismul pe toată durata contractului.";
  drawText(sd(dreptObl1), 4, false);
  
  const dreptObl2 = "Chiriașul are următoarele drepturi și obligații\\na. De a plăti contravaloarea chiriei autoturismului, odată cu preluarea acestuia, iar în caz de prelungire a duratei contractului cu acordul proprietarului, odată cu restituirea autoturismului.\\nb. De a exploata în condiții normale autoturismul, conform instrucțiunilor de folosire și întreținere elaborate de fabricant și specificate în manualul de utilizare.\\nc. De a achita amenzile emise de autorități pentru contravenții sau infracțiuni săvârșite pe perioada închirierii de către conducătorii autoturismului ce face obiectul prezentului contract.\\nd. De a returna autoturismul, la expirarea duratei contractului, cu rezervorul de carburant plin (în caz contrar fiind obligat la plata carburantului, în cuantum de 1 Euro / litru) precum și toate documentele autoturismului ce i-au fost puse la dispoziție odată cu acesta pe bază de proces verbal de predare primire.\\ne. De a fi în posesia unui permis de conducere național sau internațional valabil, cu o vechime de cel puțin 1 an, iar vârsta acestora trebuie să fie peste 20 de ani; în cazul în care autoturismul a fost condus de o altă persoană decât chiriașul, răspunderea pentru pagubele cauzate printr-un eveniment rutier revine chiriașului, în solidar cu persoana implicată în eveniment, proprietarul având posibilitatea de urmărire a oricăruia dintre cei 2, pentru recuperarea prejudiciilor.\\nf. Se obligă să plătească. În cazul întârzierii în returnarea autoturismului fata de cea stabilita, chiriașul va fi obligat la plata unor penalități, astfel :\\n- dacă întârzierea este de cel mult 1 zi față de ziua încetării contractului, nu se vor percepe penalități;\\n- începând cu ora a 2-a de întârziere și până la împlinirea celei de a 4-a inclusiv, se vor percepe penalități de 10% pentru fiecare zi, din cuantumul chiriei stabilite\\n- începând cu a 5-a zi de întârziere, chiriașul va fi obligat la plata chiriei / zi, în cuantumul stabilit prin prezentul contract, până în momentul, ziua returnării autoturismului.\\ng. Societatea își păstrează dreptul de a recupera de la chiriaș orice sumă de bani în conformitate cu legile românești privind despăgubirea, ca urmare a încălcării de către chiriaș a obligației de returnare a autoturismului.\\nTotodată, chiriașul este de acord că se face vinovat de abuz de încredere prevăzut de art. 213 c.p. în situația în care restituirea nu se face în termen de 24 ore de la expirarea termenului de restituire al autoturismului.\\nh. În cazul unor avarii aduse autoturismului, cu excepția celor provocate prin forță majoră, chiriașul răspunde în solidar cu asiguratorul proprietarului pentru toate cheltuielile aferente aducerii la starea inițială a autoturismului sau înlocuirii acestuia cu unul similar ca marcă, tip, an de fabricație, dotări și valoarea de piață.\\nÎn cazul în care asiguratorul proprietarului acoperă în totalitate aceste cheltuieli, chiriașul este exonerat de răspundere civilă, existând în sarcina sa răspunderea penală, în condițiile legii.\\nPentru ca pagubele produse în urma unui eveniment rutier sau furt să poată fi recuperate prin asiguratorul proprietarului, este obligatorie declararea acestora de către chiriaș / conducătorul autoturismului organelor de poliție din raza localității în care s-a produs evenimentul, urmând ca în caz contrar contravaloarea pagubelor să fie suportată integral de către chiriaș / conducătorul autoturismului.\\nÎn cazul în care autoturismul a fost condus sub influența băuturilor alcoolice și / sau a drogurilor ori altor substanțe stupefiante, răspunderea în recuperarea materială a pagubelor aparține în totalitate chiriașului / conducătorului autoturismului.\\ni. Chiriașul nu are dreptul să folosească autoturismul pentru transport de pasageri contra plată sau alte recompense, pentru curse automobilistice sau pentru remorcarea altor vehicule.";
  drawText(sd(dreptObl2), 4, false);
  y += 2;

  drawText(sd("Art. 8 – CESIUNEA ȘI DIVIZAREA CONTRACTULUI"), 4, true);
  const cesiunea = "a. Nici una din părțile prezentului contract nu va putea cesiona drepturile și obligațiile ce rezultă din acesta unei terțe persoane, fără acordul prealabil dat în scris, de către cealaltă parte.\\nb. Acordul scris se comunică cedentului în termen de 24 ore de la data când acesta a cerut cesionarului consimțământul.\\nc. În cazul în care cesionarul nu răspunde în termenul sus arătat, se consideră că acesta nu a consimțit la cesiunea contractului.\\nd. În cazul în care o clauză sau o parte a prezentului contract va fi declarată nulă ori va fi anulată, clauzele rămase valide își vor produce în continuare efectele, cu excepția cazurilor în care clauza sau partea declarată nulă sau care este anulată, conține o condiție esențială pentru prezentul contract.";
  drawText(sd(cesiunea), 4, false);
  y += 2;

  drawText(sd("Art. 9 – ÎNCETAREA CONTRACTULUI :"), 4, true);
  const incetarea = "9. A. - Prezentul contract încetează de plin drept, fără a fi necesară intervenția vreunei instanțe judecătorești, în cazul când oricare dintre părți :\\na. Nu-și execută o obligație considerată esențială pentru acest contract cum sunt :\\n- punerea la dispoziție a autoturismului;\\n- plata chiriei aferente folosirii acestuia.\\nb. Cesionează drepturile și obligațiile sale, prevăzute în prezentul contract, fără a avea acordul celeilalte părți.\\nc. Își încalcă oricare dintre obligațiile sale.\\n9. B. - Rezilierea contractului nu are nici un efect asupra obligațiilor deja scadente între părți.\\n9. C. - Prevederile prezentului articol nu înlătură răspunderea părții care, în mod culpabil, a cauzat încetarea contractului.";
  drawText(sd(incetarea), 4, false);
  y += 2;

  drawText(sd("Art. 10 – FORȚA MAJORĂ :"), 4, true);
  const fortaM = "a. Partea care invocă forța majoră este obligată să notifice celeilalte părți, în termen de 24 ore, producerea evenimentului și să ia toate măsurile posibile în vederea limitării consecințelor lui.\\nb. Dacă în termen de 24 ore de la producere, evenimentul respectiv nu încetează, părțile au dreptul să-și notifice încetarea de plin drept a prezentului contract, fără ca vreuna din ele să pretindă daune-interese.\\nc. Daune-interese vor fi cerute de către proprietar chiriașului în situația neîndeplinirii din culpa sa (chiriașului) a oricăreia din obligațiile ce-i revin potrivit contractului, după o prealabilă notificare scrisă din partea proprietarului.";
  drawText(sd(fortaM), 4, false);
  y += 2;

  drawText(sd("Art. 11 – NOTIFICĂRI, LITIGII, CLAUZE FINALE :"), 4, true);
  const notificari = "a. Orice notificare adresată de una din părți celeilalte, este valabil îndeplinită dacă va fi transmisă pe cale poștală prin scrisoare recomandată, prin telex, fax, telegramă, considerându-se primită de destinatar la data menționată pe înscrisul doveditor.\\nb. În cazul în care nu este posibilă rezolvarea litigiilor pe cale amiabilă, părțile se vor adresa instanței de la sediul proprietarului.\\nc. Modificarea prezentului contract se face numai prin act adițional încheiat între părțile contractante.\\nPrezentul contract are valoare de titlu executoriu acceptând în mod expres și irevocabil predarea bunului către societate fără somație, notificare prealabilă sau proces.\\nPrezentul contract de închiriere a fost încheiat în 2 (două) exemplare, astăzi ......................., câte unul pentru fiecare parte semnatară, ambele cu aceeași putere probantă.";
  drawText(sd(notificari), 4, false);

  y += 15;
  if (y > 250) {
      doc.addPage();
      y = 20;
  }
  doc.setFont(undefined, "bold");
  doc.text("PROPRIETAR,", 25, y);
  doc.text("CHIRIAS,", 135, y);
  y += 5;
  doc.setFont(undefined, "normal");
  doc.text("S.C. AUTO WASH IMPEX SRL", 25, y);
  doc.text("......................................................", 135, y);
  y += 5;
  doc.text("Director Sorin Tudorov", 25, y);

  doc.save("contract-inchiriere-" + stripDiacritics(claim.numarDosar || "nou") + ".pdf");
}
\;

const startIdx = content.indexOf('export async function generateazaContractInchiriere(claim)');
if (startIdx !== -1) {
  content = content.slice(0, startIdx) + newFn;
  fs.writeFileSync('src/utils/pdfGenerator.js', content, 'utf8');
}
