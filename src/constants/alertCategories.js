import {
  AlertOctagon, Car, Clock, Boxes, PackageCheck, Truck, ShoppingCart, Wallet,
} from "lucide-react";

/**
 * Sursă unică pentru categoriile de alertă — Brief, AlerteModal, mobil.
 * Culori aliniate cu semantica atelier (amber / steel / danger / success).
 */
export const ALERT_CATEGORIES = [
  {
    key: "stagnate",
    label: "Termene Depășite",
    shortLabel: "Termene",
    emoji: "🚨",
    icon: Clock,
    hex: "#B23A2E",
    badgeClass: "bg-[#B23A2E] text-white",
    borderClass: "border-[#B23A2E]",
    chipActive: "bg-[#B23A2E] text-white border-[#B23A2E] ring-[#B23A2E]/40",
    chipIdle: "text-[#B23A2E]",
  },
  {
    key: "livrare_piese",
    label: "Termen Livrare",
    shortLabel: "Livrare",
    emoji: "🚚",
    icon: Truck,
    hex: "#D6473F",
    badgeClass: "bg-[#D6473F] text-white",
    borderClass: "border-[#D6473F]",
    chipActive: "bg-[#D6473F] text-white border-[#D6473F] ring-[#D6473F]/40",
    chipIdle: "text-[#D6473F]",
  },
  {
    key: "accept_plata",
    label: "Accept Fără Piese",
    shortLabel: "Accept",
    emoji: "🛒",
    icon: ShoppingCart,
    hex: "#2C4160",
    badgeClass: "bg-[#2C4160] text-white",
    borderClass: "border-[#2C4160]",
    chipActive: "bg-[#2C4160] text-white border-[#2C4160] ring-[#2C4160]/40",
    chipIdle: "text-[#2C4160]",
  },
  {
    key: "neridicate",
    label: "Mașini Neridicate",
    shortLabel: "Neridicate",
    emoji: "📦",
    icon: PackageCheck,
    hex: "#3E6B45",
    badgeClass: "bg-[#3E6B45] text-white",
    borderClass: "border-[#3E6B45]",
    chipActive: "bg-[#3E6B45] text-white border-[#3E6B45] ring-[#3E6B45]/40",
    chipIdle: "text-[#3E6B45]",
  },
  {
    key: "inactivitate",
    label: "Fără Activitate",
    shortLabel: "Inactiv",
    emoji: "⏱️",
    icon: Clock,
    hex: "#7A5316",
    badgeClass: "bg-[#7A5316] text-white",
    borderClass: "border-[#7A5316]",
    chipActive: "bg-[#7A5316] text-white border-[#7A5316] ring-[#7A5316]/40",
    chipIdle: "text-[#7A5316]",
  },
  {
    key: "blocate",
    label: "Dosare Blocate",
    shortLabel: "Blocate",
    emoji: "⚠️",
    icon: AlertOctagon,
    hex: "#4A5568",
    badgeClass: "bg-[#4A5568] text-white",
    borderClass: "border-[#4A5568]",
    chipActive: "bg-[#4A5568] text-white border-[#4A5568] ring-[#4A5568]/40",
    chipIdle: "text-[#4A5568]",
  },
  {
    key: "masini_schimb",
    label: "Auto Schimb",
    shortLabel: "Schimb",
    emoji: "🚗",
    icon: Car,
    hex: "#C98A2B",
    badgeClass: "bg-[#C98A2B] text-white",
    borderClass: "border-[#C98A2B]",
    chipActive: "bg-[#C98A2B] text-white border-[#C98A2B] ring-[#C98A2B]/40",
    chipIdle: "text-[#C98A2B]",
  },
  {
    key: "piese",
    label: "Piese Neprogramate",
    shortLabel: "Piese",
    emoji: "📦",
    icon: Boxes,
    hex: "#7A5316",
    badgeClass: "bg-[#7A5316] text-white",
    borderClass: "border-[#C98A2B]/60",
    chipActive: "bg-[#3E6B45] text-white border-[#3E6B45] ring-[#3E6B45]/40",
    chipIdle: "text-[#3E6B45]",
  },
  {
    key: "restante",
    label: "Plăți Restante",
    shortLabel: "Restante",
    emoji: "💳",
    icon: Wallet,
    hex: "#B23A2E",
    badgeClass: "bg-[#B23A2E] text-white",
    borderClass: "border-[#B23A2E]",
    chipActive: "bg-[#B23A2E] text-white border-[#B23A2E] ring-[#B23A2E]/40",
    chipIdle: "text-[#B23A2E]",
  },
];

const byKey = Object.fromEntries(ALERT_CATEGORIES.map((c) => [c.key, c]));

export function getAlertCategory(key) {
  return byKey[key] || ALERT_CATEGORIES[0];
}

export function getAlertStyle(key) {
  const c = getAlertCategory(key);
  return { badgeColor: c.badgeClass, borderColor: c.borderClass };
}

export function getAlertIcon(key) {
  return getAlertCategory(key).icon;
}
