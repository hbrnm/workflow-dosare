/**
 * Texte UI comune — aceleași cuvinte pe mobil și desktop.
 * Română cu diacritice; evită mixul „Foto & Doc” / „Foto si documente”.
 */

export const UI_COPY = {
  fotoSiDocumente: "Foto și documente",
  fotoSiDocumenteHint: "Adaugă foto și documente la dosar",
  cautareDosar: "Căutare dosar",
  cautareDosarHint: "Caută numărul auto sau deschide un dosar, apoi Foto.",
  cautareAlegeDinLista: "Alege un dosar din lista de deasupra căutării.",
  stergeCautarea: "Șterge căutarea",
  reparatie: "Reparație",
  atentie: "Atenție",
  acordReparatie: "Acord reparație",
  programari: "Programări",
  acceptPlata: "Accept plată",
  piese: "Piese",
  facturat: "Facturat",
};

export function statusFolderUpper(label) {
  return String(label || "").toLocaleUpperCase("ro-RO");
}
