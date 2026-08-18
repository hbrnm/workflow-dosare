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

/** Generare obiect de mesaj dinamic (fără emoticoane) și etapa asociată pentru filtrare la click. */
export function getDynamicGreetingObject(nickname = "Alex", claimStats = {}) {
  const hour = new Date().getHours();
  const name = nickname || "Alex";
  const {
    tot = 0,
    piese = 0,
    rep = 0,
    accept = 0,
    prog = 0,
    acord = 0,
  } = claimStats;

  const stageOptions = [];

  if (piese > 0) {
    stageOptions.push({
      text: `Salut, ${name}! ${piese} ${piese === 1 ? "dosar este" : "dosare sunt"} în etapa de piese.`,
      targetStage: "piese_comandate",
      stageLabel: "Piese",
    });
  }

  if (rep > 0) {
    stageOptions.push({
      text: `Spor la treabă, ${name}! ${rep} ${rep === 1 ? "autovehicul este" : "autovehicule sunt"} în reparație.`,
      targetStage: "reparatie_in_curs",
      stageLabel: "Reparație",
    });
  }

  if (accept > 0) {
    stageOptions.push({
      text: `Salutare, ${name}! ${accept} ${accept === 1 ? "dosar așteaptă" : "dosare așteaptă"} acceptul de plată.`,
      targetStage: "accept_plata",
      stageLabel: "Accept plată",
    });
  }

  if (prog > 0) {
    stageOptions.push({
      text: `Atenție, ${name}! Avem ${prog} ${prog === 1 ? "programare confirmată" : "programări confirmate"}.`,
      targetStage: "programare_efectuata",
      stageLabel: "Programări",
    });
  }

  if (acord > 0) {
    stageOptions.push({
      text: `Salut, ${name}! ${acord} ${acord === 1 ? "dosar este" : "dosare sunt"} în acord reparație.`,
      targetStage: "constatare_efectuata",
      stageLabel: "Acord reparație",
    });
  }

  if (stageOptions.length > 0) {
    return stageOptions[(tot + hour) % stageOptions.length];
  }

  // Mesaje generale fără emoticoane
  if (hour >= 5 && hour < 12) {
    return {
      text: `Bună dimineața, ${name}! Spor la lucru cu cele ${tot} dosare din atelier.`,
      targetStage: null,
      stageLabel: null,
    };
  } else if (hour >= 12 && hour < 18) {
    return {
      text: `Salut, ${name}! Activitatea din atelier este în plină desfășurare (${tot} dosare).`,
      targetStage: null,
      stageLabel: null,
    };
  } else if (hour >= 18 && hour < 22) {
    return {
      text: `Bună seara, ${name}! O zi productivă în atelier (${tot} dosare gestionate).`,
      targetStage: null,
      stageLabel: null,
    };
  } else {
    return {
      text: `Spor la treabă nocturnă, ${name}! Mulțumim pentru implicare.`,
      targetStage: null,
      stageLabel: null,
    };
  }
}

export function getDynamicGreetingMessage(nickname = "Alex", claimStats = {}) {
  return getDynamicGreetingObject(nickname, claimStats).text;
}
