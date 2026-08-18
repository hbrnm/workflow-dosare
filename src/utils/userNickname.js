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
 * Cronologie zilnică pentru fluxul operațional din service:
 * - 05:00 - 08:59: Programări / Intrări (programare_efectuata)
 * - 09:00 - 11:59: Acord reparație & Constatări (constatare_efectuata)
 * - 12:00 - 14:29: Comenzi piese (piese_comandate)
 * - 14:30 - 16:29: Reparații & Predări mașini gata (reparatie_in_curs)
 * - 16:30 - 19:59: Facturare & Accept plată (accept_plata)
 * - 20:00 - 04:59: Sinteză zi & pregătire mâine
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
    // 1. Programări (Prima oră a dimineții: 05:00 - 08:59)
    {
      id: "prog",
      timeWindow: "Dimineață",
      text: prog > 0
        ? `Bună dimineața, ${name}! Avem ${prog} ${prog === 1 ? "programare confirmată" : "programări confirmate"} astăzi.`
        : `Bună dimineața, ${name}! Nicio programare nouă în așteptare.`,
      targetStage: prog > 0 ? "programare_efectuata" : null,
      stageLabel: "Programări",
    },
    // 2. Constatări & Acord reparație (Ora 09:00 - 11:59)
    {
      id: "acord",
      timeWindow: "Ora 09:00",
      text: acord > 0
        ? `Salut, ${name}! Avem ${acord} ${acord === 1 ? "dosar în acord reparație" : "dosare în acord reparație"}.`
        : `Salut, ${name}! Toate acordurile de reparație sunt la zi.`,
      targetStage: acord > 0 ? "constatare_efectuata" : null,
      stageLabel: "Acord reparație",
    },
    // 3. Comenzi Piese (După-amiază: 12:00 - 14:29)
    {
      id: "piese",
      timeWindow: "După-amiază",
      text: piese > 0
        ? `Salut, ${name}! Avem ${piese} ${piese === 1 ? "comandă de piese în așteptare" : "comenzi de piese în așteptare"}.`
        : `Salut, ${name}! Toate piesele comandate sunt recepționate.`,
      targetStage: piese > 0 ? "piese_comandate" : null,
      stageLabel: "Piese",
    },
    // 4. Reparații & Predări mașini (Ora 15:00: 14:30 - 16:29)
    {
      id: "rep",
      timeWindow: "Predări",
      text: rep > 0
        ? `Spor la treabă, ${name}! Avem ${rep} ${rep === 1 ? "autovehicul în reparație" : "autovehicule în reparație"} de predat.`
        : `Spor la treabă, ${name}! Mașinile din reparație avansează conform planului.`,
      targetStage: rep > 0 ? "reparatie_in_curs" : null,
      stageLabel: "Reparație",
    },
    // 5. Facturare & Accept plată (Spre orele 16:30 - 19:59)
    {
      id: "accept",
      timeWindow: "Facturare",
      text: accept > 0
        ? `Salutare, ${name}! Avem ${accept} ${accept === 1 ? "dosar gata de facturat" : "dosare gata de facturat"} cu accept plată.`
        : `Salutare, ${name}! Toate facturările și accepturile de plată sunt verificate.`,
      targetStage: accept > 0 ? "accept_plata" : null,
      stageLabel: "Accept plată",
    },
  ];

  // Determinăm indexul de bază în funcție de ora curentă a zilei
  let baseIndex = 0;
  if (timeVal >= 5 && timeVal < 9) {
    baseIndex = 0; // Programări
  } else if (timeVal >= 9 && timeVal < 12) {
    baseIndex = 1; // Acord reparație
  } else if (timeVal >= 12 && timeVal < 14.5) {
    baseIndex = 2; // Piese
  } else if (timeVal >= 14.5 && timeVal < 16.5) {
    baseIndex = 3; // Reparații & Predări
  } else if (timeVal >= 16.5 && timeVal < 20) {
    baseIndex = 4; // Facturare & Accept plată
  } else {
    // În afara orelor de program (noaptea)
    return {
      id: "night",
      timeWindow: "Noapte",
      text: `Seară bună, ${name}! O zi productivă cu ${tot} dosare gestionate în atelier.`,
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
