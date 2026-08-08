import {
  AlertOctagon, Clock, Boxes, PackageCheck, Wallet,
  Car, Truck, ShoppingCart,
} from "lucide-react";

/**
 * Tipuri fine (detecție / titlu pe card) — păstrate pentru motivul exact al alertei.
 */
export const ALERT_TYPE_META = {
  blocate: {
    key: "blocate",
    label: "Blocat",
    icon: AlertOctagon,
    hex: "#4A5568",
    badgeClass: "bg-[#4A5568] text-white",
    borderClass: "border-[#4A5568]",
  },
  stagnate: {
    key: "stagnate",
    label: "Întârziere etapă",
    icon: Clock,
    hex: "#B23A2E",
    badgeClass: "bg-[#B23A2E] text-white",
    borderClass: "border-[#B23A2E]",
  },
  inactivitate: {
    key: "inactivitate",
    label: "Fără activitate",
    icon: Clock,
    hex: "#7A5316",
    badgeClass: "bg-[#7A5316] text-white",
    borderClass: "border-[#7A5316]",
  },
  livrare_piese: {
    key: "livrare_piese",
    label: "Livrare piese",
    icon: Truck,
    hex: "#D6473F",
    badgeClass: "bg-[#D6473F] text-white",
    borderClass: "border-[#D6473F]",
  },
  piese: {
    key: "piese",
    label: "Piese neprogramate",
    icon: Boxes,
    hex: "#3E6B45",
    badgeClass: "bg-[#3E6B45] text-white",
    borderClass: "border-[#3E6B45]",
  },
  accept_plata: {
    key: "accept_plata",
    label: "Accept plată",
    icon: ShoppingCart,
    hex: "#2C4160",
    badgeClass: "bg-[#2C4160] text-white",
    borderClass: "border-[#2C4160]",
  },
  neridicate: {
    key: "neridicate",
    label: "Neridicate",
    icon: PackageCheck,
    hex: "#3E6B45",
    badgeClass: "bg-[#3E6B45] text-white",
    borderClass: "border-[#3E6B45]",
  },
  masini_schimb: {
    key: "masini_schimb",
    label: "Auto schimb",
    icon: Car,
    hex: "#C98A2B",
    badgeClass: "bg-[#C98A2B] text-white",
    borderClass: "border-[#C98A2B]",
  },
  restante: {
    key: "restante",
    label: "Plată restantă",
    icon: Wallet,
    hex: "#B23A2E",
    badgeClass: "bg-[#B23A2E] text-white",
    borderClass: "border-[#B23A2E]",
  },
};

/**
 * Grupuri UI — Brief, mobil, Centru Alerte.
 * 5 filtre scurte în loc de 9 denumiri lungi.
 */
export const ALERT_GROUPS = [
  {
    key: "blocate",
    label: "Blocate",
    hint: "Dosare blocate / litigiu",
    icon: AlertOctagon,
    hex: "#4A5568",
    types: ["blocate"],
    chipActive: "bg-[#4A5568] text-white border-[#4A5568] ring-[#4A5568]/40",
    chipIdle: "text-[#4A5568]",
  },
  {
    key: "intarzieri",
    label: "Întârzieri",
    hint: "Etapă depășită sau fără activitate",
    icon: Clock,
    hex: "#B23A2E",
    types: ["stagnate", "inactivitate"],
    chipActive: "bg-[#B23A2E] text-white border-[#B23A2E] ring-[#B23A2E]/40",
    chipIdle: "text-[#B23A2E]",
  },
  {
    key: "piese",
    label: "Piese",
    hint: "Livrare și neprogramate",
    icon: Boxes,
    hex: "#2C4160",
    types: ["livrare_piese", "piese"],
    chipActive: "bg-[#2C4160] text-white border-[#2C4160] ring-[#2C4160]/40",
    chipIdle: "text-[#2C4160]",
  },
  {
    key: "predare",
    label: "Predare",
    hint: "Neridicate și auto la schimb depășit",
    icon: PackageCheck,
    hex: "#3E6B45",
    types: ["neridicate", "masini_schimb"],
    chipActive: "bg-[#3E6B45] text-white border-[#3E6B45] ring-[#3E6B45]/40",
    chipIdle: "text-[#3E6B45]",
  },
  {
    key: "plati",
    label: "Plăți",
    hint: "Accept plată și scadențe decontare",
    icon: Wallet,
    hex: "#B23A2E",
    types: ["accept_plata", "restante"],
    chipActive: "bg-[#B23A2E] text-white border-[#B23A2E] ring-[#B23A2E]/40",
    chipIdle: "text-[#B23A2E]",
  },
];

/** @deprecated folosește ALERT_GROUPS — păstrat ca alias pentru importuri vechi */
export const ALERT_CATEGORIES = ALERT_GROUPS.map((g) => ({
  ...g,
  shortLabel: g.label,
  emoji: "",
  badgeClass: `bg-[${g.hex}] text-white`,
  borderClass: `border-[${g.hex}]`,
}));

const groupByKey = Object.fromEntries(ALERT_GROUPS.map((g) => [g.key, g]));

const typeToGroupKey = {};
ALERT_GROUPS.forEach((g) => {
  g.types.forEach((t) => {
    typeToGroupKey[t] = g.key;
  });
});

/** Tip vechi / alias → cheie grup UI */
export const ALERT_TAB_TO_GROUP = {
  toate: "toate",
  depasite: "intarzieri",
  stagnate: "intarzieri",
  inactivitate: "intarzieri",
  livrare_piese: "piese",
  accept_plata: "plati",
  piese: "piese",
  neridicate: "predare",
  masini_schimb: "predare",
  restante: "plati",
  plati: "plati",
  blocate: "blocate",
  intarzieri: "intarzieri",
  predare: "predare",
};

export function getAlertGroup(key) {
  return groupByKey[key] || null;
}

export function resolveAlertGroupKey(tab) {
  if (!tab || tab === "toate") return "toate";
  return ALERT_TAB_TO_GROUP[tab] || typeToGroupKey[tab] || tab;
}

export function getAlertTypesForTab(tab) {
  const groupKey = resolveAlertGroupKey(tab);
  if (groupKey === "toate") return null;
  const group = getAlertGroup(groupKey);
  return group ? group.types : [groupKey];
}

export function countAlertsForGroup(counts = {}, groupOrKey) {
  const group = typeof groupOrKey === "string" ? getAlertGroup(groupOrKey) : groupOrKey;
  if (!group) return 0;
  return group.types.reduce((sum, t) => sum + (counts[t] || 0), 0);
}

/** Meta pe tip fine — pentru badge / icon pe cardul individual */
export function getAlertCategory(key) {
  if (ALERT_TYPE_META[key]) return ALERT_TYPE_META[key];
  const group = getAlertGroup(key);
  if (group) {
    return {
      key: group.key,
      label: group.label,
      icon: group.icon,
      hex: group.hex,
      badgeClass: `text-white`,
      borderClass: `border-[${group.hex}]`,
    };
  }
  return ALERT_TYPE_META.stagnate;
}

export function getAlertStyle(key) {
  const c = getAlertCategory(key);
  return {
    badgeColor: c.badgeClass || "bg-[#B23A2E] text-white",
    borderColor: c.borderClass || "border-[#B23A2E]",
  };
}

export function getAlertIcon(key) {
  return getAlertCategory(key).icon;
}
