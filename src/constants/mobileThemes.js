import {
  Camera, List, BarChart3, CalendarClock,
  Aperture, Newspaper, AlertTriangle, CalendarDays,
  Image, Files, Flame, CalendarRange,
  Code2, GitBranch, Inbox, Calendar,
  BookOpen, ClipboardList, Lightbulb, CalendarCheck,
  Palette
} from "lucide-react";

export const MOBILE_THEME_STORAGE_KEY = "workflow_dosare_mobile_theme";

/**
 * Visual themes for the mobile shell.
 * Names are original; aesthetics are loosely inspired by popular apps.
 */
export const MOBILE_THEMES = {
  atelier: {
    id: "atelier",
    label: "Atelier",
    blurb: "Stilul clasic Dosare — charcoal & amber",
    inspiredNote: "Original",
    navStyle: "dock", // dock | pill | underline
    headerStyle: "dark",
    fonts: {
      display: "'Space Grotesk', sans-serif",
      body: "'Inter', system-ui, sans-serif",
    },
    icons: {
      capture: Camera,
      brief: BarChart3,
      dosare: List,
      programari: CalendarClock,
      theme: Palette,
    },
    labels: {
      capture: "Foto & Doc",
      brief: "Brief Alerte",
      dosare: "Dosare",
      programari: "Programari",
    },
    vars: {
      "--m-bg": "#EFEAE1",
      "--m-surface": "#FFFFFF",
      "--m-surface-2": "#FAF8F5",
      "--m-text": "#23282E",
      "--m-muted": "#6B6558",
      "--m-border": "#DAD4C6",
      "--m-header": "#1C2127",
      "--m-header-text": "#FFFFFF",
      "--m-nav": "#1C2127",
      "--m-nav-text": "rgba(255,255,255,0.6)",
      "--m-nav-active": "#C98A2B",
      "--m-accent": "#C98A2B",
      "--m-accent-text": "#FFFFFF",
      "--m-danger": "#B23A2E",
      "--m-radius": "16px",
      "--m-radius-sm": "12px",
      "--m-shadow": "0 1px 2px rgba(0,0,0,0.06)",
    },
  },
  sport: {
    id: "sport",
    label: "Sport",
    blurb: "Energie sportivă — albastru & galben",
    inspiredNote: "Inspirat de magazine sportive",
    navStyle: "pill",
    headerStyle: "brand",
    fonts: {
      display: "'Outfit', 'Space Grotesk', sans-serif",
      body: "'Outfit', 'Inter', sans-serif",
    },
    icons: {
      capture: Aperture,
      brief: Flame,
      dosare: Newspaper,
      programari: CalendarDays,
      theme: Palette,
    },
    labels: {
      capture: "Cameră",
      brief: "Alerte",
      dosare: "Dosare",
      programari: "Agenda",
    },
    vars: {
      "--m-bg": "#D6EBFA",
      "--m-surface": "#FFFFFF",
      "--m-surface-2": "#EAF4FC",
      "--m-text": "#0B1F33",
      "--m-muted": "#3D5A73",
      "--m-border": "#9FC7E6",
      "--m-header": "#0072BC",
      "--m-header-text": "#FFFFFF",
      "--m-nav": "#005A96",
      "--m-nav-text": "rgba(255,255,255,0.75)",
      "--m-nav-active": "#FFED00",
      "--m-accent": "#0072BC",
      "--m-accent-text": "#FFFFFF",
      "--m-danger": "#E31C23",
      "--m-radius": "20px",
      "--m-radius-sm": "14px",
      "--m-shadow": "0 8px 24px rgba(0,114,188,0.18)",
    },
  },
  agora: {
    id: "agora",
    label: "Agora",
    blurb: "Feed cald, carduri moi, accent coral",
    inspiredNote: "Inspirat de comunități online",
    navStyle: "dock",
    headerStyle: "light",
    fonts: {
      display: "'Nunito', 'Space Grotesk', sans-serif",
      body: "'Nunito', 'Inter', sans-serif",
    },
    icons: {
      capture: Image,
      brief: AlertTriangle,
      dosare: Files,
      programari: CalendarRange,
      theme: Palette,
    },
    labels: {
      capture: "Media",
      brief: "Hot",
      dosare: "Liste",
      programari: "Plan",
    },
    vars: {
      "--m-bg": "#DAE0E6",
      "--m-surface": "#FFFFFF",
      "--m-surface-2": "#F6F7F8",
      "--m-text": "#1A1A1B",
      "--m-muted": "#7C7C7C",
      "--m-border": "#CCC",
      "--m-header": "#FFFFFF",
      "--m-header-text": "#1A1A1B",
      "--m-nav": "#1A1A1B",
      "--m-nav-text": "rgba(255,255,255,0.55)",
      "--m-nav-active": "#FF4500",
      "--m-accent": "#FF4500",
      "--m-accent-text": "#FFFFFF",
      "--m-danger": "#EA0027",
      "--m-radius": "12px",
      "--m-radius-sm": "8px",
      "--m-shadow": "0 1px 3px rgba(0,0,0,0.08)",
    },
  },
  forge: {
    id: "forge",
    label: "Forge",
    blurb: "Dark developer — verde & contrast",
    inspiredNote: "Inspirat de tool-uri de cod",
    navStyle: "underline",
    headerStyle: "dark",
    fonts: {
      display: "'IBM Plex Sans', 'Space Grotesk', sans-serif",
      body: "'IBM Plex Sans', 'Inter', sans-serif",
    },
    icons: {
      capture: Code2,
      brief: Inbox,
      dosare: GitBranch,
      programari: Calendar,
      theme: Palette,
    },
    labels: {
      capture: "Capture",
      brief: "Inbox",
      dosare: "Repos",
      programari: "Schedule",
    },
    vars: {
      "--m-bg": "#0D1117",
      "--m-surface": "#161B22",
      "--m-surface-2": "#21262D",
      "--m-text": "#E6EDF3",
      "--m-muted": "#8B949E",
      "--m-border": "#30363D",
      "--m-header": "#010409",
      "--m-header-text": "#E6EDF3",
      "--m-nav": "#010409",
      "--m-nav-text": "#8B949E",
      "--m-nav-active": "#3FB950",
      "--m-accent": "#238636",
      "--m-accent-text": "#FFFFFF",
      "--m-danger": "#F85149",
      "--m-radius": "8px",
      "--m-radius-sm": "6px",
      "--m-shadow": "0 0 0 1px rgba(48,54,61,0.8)",
    },
  },
  guide: {
    id: "guide",
    label: "Ghid",
    blurb: "Curat, prietenos, verde instructiv",
    inspiredNote: "Inspirat de ghiduri how-to",
    navStyle: "dock",
    headerStyle: "brand",
    fonts: {
      display: "'Source Sans 3', 'Space Grotesk', sans-serif",
      body: "'Source Sans 3', 'Inter', sans-serif",
    },
    icons: {
      capture: BookOpen,
      brief: Lightbulb,
      dosare: ClipboardList,
      programari: CalendarCheck,
      theme: Palette,
    },
    labels: {
      capture: "Pași foto",
      brief: "De făcut",
      dosare: "Dosare",
      programari: "Calendar",
    },
    vars: {
      "--m-bg": "#F4F7F0",
      "--m-surface": "#FFFFFF",
      "--m-surface-2": "#EEF5E6",
      "--m-text": "#2C2C2C",
      "--m-muted": "#5F6B5A",
      "--m-border": "#C5D4B5",
      "--m-header": "#6B8E23",
      "--m-header-text": "#FFFFFF",
      "--m-nav": "#4F6B1A",
      "--m-nav-text": "rgba(255,255,255,0.7)",
      "--m-nav-active": "#FFE566",
      "--m-accent": "#6B8E23",
      "--m-accent-text": "#FFFFFF",
      "--m-danger": "#C23B22",
      "--m-radius": "18px",
      "--m-radius-sm": "12px",
      "--m-shadow": "0 4px 14px rgba(107,142,35,0.12)",
    },
  },
};

export const MOBILE_THEME_LIST = Object.values(MOBILE_THEMES);

export function getMobileTheme(id) {
  return MOBILE_THEMES[id] || MOBILE_THEMES.atelier;
}

export function loadMobileThemeId() {
  try {
    const id = localStorage.getItem(MOBILE_THEME_STORAGE_KEY);
    return MOBILE_THEMES[id] ? id : "atelier";
  } catch {
    return "atelier";
  }
}

export function saveMobileThemeId(id) {
  try {
    localStorage.setItem(MOBILE_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
