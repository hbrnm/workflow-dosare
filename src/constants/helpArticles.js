/**
 * In-app help — short articles for first-week SaaS users.
 */
export const HELP_ARTICLES = [
  {
    id: "primul-dosar",
    title: "Creează primul dosar",
    summary: "De la nr. de înmatriculare la dosar vizibil în Brief.",
    body: [
      "Apasă Dosar nou (desktop în header, mobil deasupra căutării).",
      "Completează cel puțin numărul de înmatriculare. Poți adăuga client, telefon și asigurător.",
      "După salvare, dosarul apare în Brief și în Flux, la stadiul AIR (acord intrare în reparație).",
      "Deschide dosarul ca să adaugi poze, note sau să schimbi stadiul.",
    ],
  },
  {
    id: "programare",
    title: "Programează o mașină",
    summary: "Slot în calendar + status Programări.",
    body: [
      "Din Brief sau Flux, pe un dosar cu piese (sau din Programări), setează data și ora.",
      "Poți marca Sosite când piesele au ajuns — apoi programezi ușor în calendar.",
      "În Programări vezi capacitatea pe zi și sloturile libere.",
      "Dosarul trece automat în stadiul Programări când are dată/oră setată.",
    ],
  },
  {
    id: "alerte",
    title: "Înțelege alertele",
    summary: "Ce înseamnă întârzieri, blocaje și neridicate.",
    body: [
      "Butonul Alerte deschide centrul cu dosarele care cer reacție.",
      "Tipuri uzuale: întârzieri pe stadiu, dosare blocate, piese, gata neridicate, auto la schimb.",
      "Din listă poți deschide dosarul, suna sau scrie pe WhatsApp fără să pierzi contextul.",
      "Pe Brief, secțiunea de alerte / Atenție arată același tip de probleme, pe scurt.",
    ],
  },
];

export function getHelpArticle(id) {
  return HELP_ARTICLES.find((a) => a.id === id) || null;
}
