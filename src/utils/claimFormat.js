import { STATUSES } from "../constants/config";

export function normalizedText(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function formatIstoricValoare(camp, val) {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Da" : "Nu";
  if (camp === "status") {
    const def = STATUSES.find((s) => s.key === val);
    return def ? `${String(def.num).padStart(2, "0")}. ${def.label}` : String(val);
  }
  return String(val);
}

export const CAMP_LABELS = {
  numar_dosar: "Nr. dosar",
  tip_asigurare: "Tip asigurare",
  asigurator: "Asigurător",
  client: "Client",
  delegat: "Delegat",
  telefon_client: "Telefon",
  numar_inmatriculare: "Nr. auto",
  vin: "VIN",
  marca_model: "Marcă/Model",
  marca: "Marcă",
  model: "Model",
  kilometraj: "Kilometraj",
  damage_marks: "Marcaje avarii",
  tip_documente: "Tip documente",
  nr_dosar_asigurator: "Nr. dosar asigurător",
  inspector_dauna: "Inspector daună",
  tracking_token: "Token tracking",
  termen_plata: "Termen plată",
  suma_decont: "Sumă decont",
  mesaj_client: "Mesaj client (tracking)",
  devize: "Fișiere deviz",
  status: "Status",
  data_deschiderii: "Dată deschidere",
  data_schimbare_status: "Schimbare status",
  data_programare: "Programare",
  programare_status: "Status programare",
  data_comanda_piese: "Dată comandă piese",
  termen_livrare_piese: "Termen livrare piese",
  piese_sosite: "Piese sosite",
  adusa_fizic: "Adusă fizic",
  ce_este_de_reparat: "De reparat",
  masina_schimb: "Mașină schimb",
  valoare_piese_audatex: "Piese Audatex",
  valoare_achizitie_piese: "Achiziție piese",
  blocat: "Blocat",
  motiv_blocare: "Motiv blocare",
  gata_de_ridicare: "Gata de ridicare",
  data_gata_ridicare: "Dată gata ridicare",
  ridicata: "Ridicată",
  data_ridicare: "Dată ridicare",
  incasat: "Încasat",
  data_incasarii: "Dată încasare",
  alerte_ack: "Alerte confirmate",
  note: "Notițe",
  poze: "Poze",
  documente: "Documente",
  _creat: "Creare",
};
