/**
 * Utilitar pentru audit financiar și decontare optimă deviz
 */
export function auditClaimFinancials(claim) {
  if (!claim) return null;

  const valDeviz = claim.valoareDevizAudatex || claim.financiar?.valoareDevizAudatex || 0;
  const pieseFacturate = claim.valoarePieseAudatex || claim.financiar?.pieseFacturateFaraTva || 0;
  const pieseAchizitie = claim.valoareAchizitiePiese || 0;
  const fransiza = claim.financiar?.valoareFransiza || 0;
  const sumaDecont = claim.sumaDecont || claim.financiar?.valoareAcceptPlata || 0;

  const marjaPieseValoare = pieseFacturate - pieseAchizitie;
  const marjaPieseProcent = pieseFacturate > 0 ? (marjaPieseValoare / pieseFacturate) * 100 : 0;

  const recomandari = [];
  const avertismente = [];

  if (pieseFacturate > 0 && pieseAchizitie === 0) {
    avertismente.push("Valoarea de achiziție a pieselor este 0 RON. Introduceți costul real de cumpărare a pieselor pentru a calcula marja reală.");
  } else if (marjaPieseProcent < 15 && pieseFacturate > 0) {
    avertismente.push(`Marjă scăzută la piese (${marjaPieseProcent.toFixed(1)}%). Recomandăm renegocierea discountului cu furnizorul.`);
  } else if (marjaPieseProcent >= 25) {
    recomandari.push(`Marjă excelentă obținută la piese (${marjaPieseProcent.toFixed(1)}%). Profit estimat piese: +${marjaPieseValoare.toFixed(2)} RON.`);
  }

  if (fransiza > 0) {
    recomandari.push(`Dosarul are franșiză de ${fransiza} RON. Asigurați-vă că este încasată direct de la client la predarea vehiculului.`);
  }

  if (sumaDecont > 0 && valDeviz > 0 && sumaDecont < valDeviz) {
    const diferenta = valDeviz - sumaDecont;
    avertismente.push(`Suma acceptată la decontare (${sumaDecont} RON) este mai mică decât devizul inițial (${valDeviz} RON) cu ${diferenta.toFixed(2)} RON. Trimiteți notificare de completare decont către asigurător.`);
  }

  return {
    valDeviz,
    pieseFacturate,
    pieseAchizitie,
    marjaPieseValoare,
    marjaPieseProcent: Math.round(marjaPieseProcent),
    recomandari,
    avertismente,
    score: avertismente.length === 0 ? "Optimizat" : "Atenție necesară",
  };
}
