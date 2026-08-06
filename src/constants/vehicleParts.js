/** Zone pe diagrama interactivă a vehiculului (vedere de sus). */

export const DAMAGE_SEVERITY = [
  { key: "usoara", label: "Ușoară", color: "#C98A2B" },
  { key: "medie", label: "Medie", color: "#B85C38" },
  { key: "grava", label: "Gravă", color: "#B23A2E" },
];

export const VEHICLE_PARTS = [
  { id: "capot", label: "Capotă", x: 38, y: 8, w: 24, h: 14 },
  { id: "parbriz", label: "Parbriz", x: 38, y: 22, w: 24, h: 8 },
  { id: "plafon", label: "Plafon", x: 38, y: 30, w: 24, h: 18 },
  { id: "luneta", label: "Lunetă", x: 38, y: 48, w: 24, h: 8 },
  { id: "hayon", label: "Hayon / Portbagaj", x: 38, y: 56, w: 24, h: 12 },
  { id: "bara_fata", label: "Bară față", x: 38, y: 2, w: 24, h: 6 },
  { id: "bara_spate", label: "Bară spate", x: 38, y: 68, w: 24, h: 6 },
  { id: "ariapa_fata_st", label: "Aripa față stânga", x: 18, y: 10, w: 18, h: 14 },
  { id: "ariapa_fata_dr", label: "Aripa față dreapta", x: 64, y: 10, w: 18, h: 14 },
  { id: "usa_fata_st", label: "Ușă față stânga", x: 18, y: 26, w: 18, h: 14 },
  { id: "usa_fata_dr", label: "Ușă față dreapta", x: 64, y: 26, w: 18, h: 14 },
  { id: "usa_spate_st", label: "Ușă spate stânga", x: 18, y: 40, w: 18, h: 14 },
  { id: "usa_spate_dr", label: "Ușă spate dreapta", x: 64, y: 40, w: 18, h: 14 },
  { id: "ariapa_spate_st", label: "Aripa spate stânga", x: 18, y: 54, w: 18, h: 14 },
  { id: "ariapa_spate_dr", label: "Aripa spate dreapta", x: 64, y: 54, w: 18, h: 14 },
  { id: "roata_fata_st", label: "Roată față stânga", x: 12, y: 16, w: 8, h: 8 },
  { id: "roata_fata_dr", label: "Roată față dreapta", x: 80, y: 16, w: 8, h: 8 },
  { id: "roata_spate_st", label: "Roată spate stânga", x: 12, y: 56, w: 8, h: 8 },
  { id: "roata_spate_dr", label: "Roată spate dreapta", x: 80, y: 56, w: 8, h: 8 },
  { id: "oglinda_st", label: "Oglindă stânga", x: 14, y: 24, w: 6, h: 5 },
  { id: "oglinda_dr", label: "Oglindă dreapta", x: 80, y: 24, w: 6, h: 5 },
];

export const OFFICIAL_DOC_TYPES = [
  { key: "pv_constatare", label: "Proces Verbal de Constatare" },
  { key: "nota_constatare", label: "Notă de Constatare" },
  { key: "nota_reconstatare", label: "Notă de Reconstatare" },
  { key: "talon", label: "Talon vehicul" },
  { key: "buletin", label: "CI / Buletin" },
  { key: "permis", label: "Permis de conducere" },
  { key: "polita", label: "Poliță asigurare" },
  { key: "factura", label: "Factură" },
  { key: "altele", label: "Alte documente" },
];

export const PHOTO_CATEGORIES_V2 = [
  { key: "receptie", label: "Recepție / Avarii" },
  { key: "documente_client", label: "Documente client" },
  { key: "reparatie", label: "În timpul reparației" },
  { key: "predare", label: "Predare" },
  { key: "generale", label: "Generale" },
];

export function severityColor(severity) {
  return DAMAGE_SEVERITY.find((s) => s.key === severity)?.color || DAMAGE_SEVERITY[0].color;
}

export function partLabel(partId) {
  return VEHICLE_PARTS.find((p) => p.id === partId)?.label || partId;
}
