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

/**
 * Cronologie zilnică pentru fluxul operațional din service (Program 08:00 - 17:00):
 * - 08:00 - 09:59: Programări / Intrări (programare_efectuata)
 * - 10:00 - 11:59: Acord reparație & Constatări (constatare_efectuata)
 * - 12:00 - 13:59: Comenzi piese (piese_comandate)
 * - 14:00 - 15:29: Reparații & Predări mașini (reparatie_in_curs)
 * - 15:30 - 17:00: Facturare & Accept plată (accept_plata)
 * - În afara programului (17:00 - 07:59): Sinteză zi / Atelier închis
 */
export function getDynamicGreetingObject(nickname = "Alex", claimStats = {}, cycleIndex = 0) {
  const now = new Date();
  const hour = now.getHours();
  const mins = now.getMinutes();
  const timeVal = hour + mins / 60;
  const name = nickname || "Alex";

  const {
    tot = 0,
    prog = 0,
    acord = 0,
    piese = 0,
    rep = 0,
    accept = 0,
  } = claimStats;

  const timelineMessages = [
    // 1. Programări (08:00 - 09:59)
    {
      id: "prog",
      timeWindow: "08:00 - 10:00",
      text: prog > 0
        ? `Bună dimineața, ${name}! Avem ${prog} ${prog === 1 ? "programare confirmată" : "programări confirmate"} astăzi.`
        : `Bună dimineața, ${name}! Nicio programare nouă în așteptare.`,
      targetStage: prog > 0 ? "programare_efectuata" : null,
      stageLabel: "Programări",
    },
    // 2. Constatări & Acord reparație (10:00 - 11:59)
    {
      id: "acord",
      timeWindow: "10:00 - 12:00",
      text: acord > 0
        ? `Salut, ${name}! Avem ${acord} ${acord === 1 ? "dosar în acord reparație" : "dosare în acord reparație"}.`
        : `Salut, ${name}! Toate acordurile de reparație sunt la zi.`,
      targetStage: acord > 0 ? "constatare_efectuata" : null,
      stageLabel: "Acord reparație",
    },
    // 3. Comenzi Piese (12:00 - 13:59)
    {
      id: "piese",
      timeWindow: "12:00 - 14:00",
      text: piese > 0
        ? `Salut, ${name}! Avem ${piese} ${piese === 1 ? "comandă de piese în așteptare" : "comenzi de piese în așteptare"}.`
        : `Salut, ${name}! Toate piesele comandate sunt recepționate.`,
      targetStage: piese > 0 ? "piese_comandate" : null,
      stageLabel: "Piese",
    },
    // 4. Reparații & Predări mașini (14:00 - 15:29)
    {
      id: "rep",
      timeWindow: "14:00 - 15:30",
      text: rep > 0
        ? `Spor la treabă, ${name}! Avem ${rep} ${rep === 1 ? "autovehicul în reparație" : "autovehicule în reparație"} de predat.`
        : `Spor la treabă, ${name}! Mașinile din reparație avansează conform planului.`,
      targetStage: rep > 0 ? "reparatie_in_curs" : null,
      stageLabel: "Reparație",
    },
    // 5. Facturare & Accept plată (15:30 - 17:00)
    {
      id: "accept",
      timeWindow: "15:30 - 17:00",
      text: accept > 0
        ? `Salutare, ${name}! Avem ${accept} ${accept === 1 ? "dosar gata de facturat" : "dosare gata de facturat"} cu accept plată.`
        : `Salutare, ${name}! Toate facturările și accepturile de plată sunt verificate.`,
      targetStage: accept > 0 ? "accept_plata" : null,
      stageLabel: "Accept plată",
    },
  ];

  // Determinăm indexul de bază conform orarului de lucru 08:00 - 17:00
  let baseIndex = 0;
  if (timeVal >= 8 && timeVal < 10) {
    baseIndex = 0; // Programări (08:00 - 10:00)
  } else if (timeVal >= 10 && timeVal < 12) {
    baseIndex = 1; // Acord reparație (10:00 - 12:00)
  } else if (timeVal >= 12 && timeVal < 14) {
    baseIndex = 2; // Piese (12:00 - 14:00)
  } else if (timeVal >= 14 && timeVal < 15.5) {
    baseIndex = 3; // Reparații & Predări (14:00 - 15:30)
  } else if (timeVal >= 15.5 && timeVal < 17) {
    baseIndex = 4; // Facturare & Accept plată (15:30 - 17:00)
  } else {
    // În afara orelor de program (după ora 17:00 sau înainte de 08:00)
    return {
      id: "night",
      timeWindow: "În afara programului",
      text: timeVal >= 17
        ? `Seară bună, ${name}! O zi productivă cu ${tot} dosare gestionate în atelier.`
        : `Bună dimineața, ${name}! Programul atelierului începe la ora 08:00 (${tot} dosare active).`,
      targetStage: null,
      stageLabel: null,
    };
  }

  const activeIndex = (baseIndex + (cycleIndex || 0)) % timelineMessages.length;
  return timelineMessages[activeIndex];
}

export function getDynamicGreetingMessage(nickname = "Alex", claimStats = {}) {
  return getDynamicGreetingObject(nickname, claimStats, 0).text;
}
