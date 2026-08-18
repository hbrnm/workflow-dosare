export const NICKNAME_CHANGE_EVENT = "app:user_nickname_changed";

/** Extrage numele/porecla salvată sau fallback din email. */
export function getUserNickname(userEmail = "") {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("user_nickname");
      if (stored && stored.trim()) return stored.trim();
    }
  } catch {
    /* ignore */
  }
  if (!userEmail) return "Alex";
  const namePart = userEmail.split("@")[0] || "";
  const cleaned = namePart.replace(/[._\-\d]+/g, " ").trim();
  if (!cleaned) return "Alex";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Salvează porecla/numele utilizatorului și trimite eveniment de sincronizare. */
export function setUserNickname(nickname) {
  try {
    const val = String(nickname || "").trim();
    if (typeof localStorage !== "undefined") {
      if (val) {
        localStorage.setItem("user_nickname", val);
      } else {
        localStorage.removeItem("user_nickname");
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NICKNAME_CHANGE_EVENT, { detail: val }));
    }
  } catch {
    /* ignore */
  }
}

/** Generare mesaj dinamic în funcție de oră și statisticile curente ale dosarelor. */
export function getDynamicGreetingMessage(nickname = "Alex", claimStats = {}) {
  const hour = new Date().getHours();
  const name = nickname || "Alex";
  const {
    tot = 0,
    piese = 0,
    rep = 0,
    accept = 0,
    prog = 0,
  } = claimStats;

  if (hour >= 5 && hour < 12) {
    const morningPhrases = [
      `Buna dimineața, ${name}! ☀️ Spor la treabă cu dosarele de azi!`,
      `Buna dimineața, ${name}! ☕ Avem ${tot} dosare în lucru azi.`,
      `Neța, ${name}! 🚀 ${piese > 0 ? `${piese} dosare așteaptă piese.` : 'Toate piesele sunt organizate.'}`,
      `Buna dimineața, ${name}! 🚗 O zi excelentă în atelier!`,
    ];
    return morningPhrases[(tot + hour) % morningPhrases.length];
  } else if (hour >= 12 && hour < 18) {
    const afternoonPhrases = [
      `Salut, ${name}! 👋 ${piese > 0 ? `${piese} dosare sunt în etapa de piese.` : 'Activitatea e în plină desfășurare.'}`,
      `Spor în continuare, ${name}! 🛠️ ${rep > 0 ? `${rep} mașini sunt la reparație.` : 'Continuăm fluxul de lucru.'}`,
      `Salut, ${name}! 📊 Avem ${tot} dosare active în atelier.`,
      `Salutare, ${name}! ⚡ ${accept > 0 ? `${accept} dosare așteaptă acceptul de plată.` : 'Toate dosarele înaintează frumos.'}`,
    ];
    return afternoonPhrases[(tot + hour) % afternoonPhrases.length];
  } else if (hour >= 18 && hour < 22) {
    const eveningPhrases = [
      `Bună seara, ${name}! 🌙 O zi productivă în atelier!`,
      `Bună seara, ${name}! 🌆 Verifică acceptările de plată înainte de încheierea zilei.`,
      `Seară bună, ${name}! 📁 ${tot} dosare gestionate cu succes azi.`,
      `Bună seara, ${name}! ☕ Odihnă plăcută și spor pentru mâine!`,
    ];
    return eveningPhrases[(tot + hour) % eveningPhrases.length];
  } else {
    return `Spor la treabă nocturnă, ${name}! 🌙 Mulțumim pentru dăruire!`;
  }
}
