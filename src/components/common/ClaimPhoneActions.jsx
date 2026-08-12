import React from "react";
import { Phone } from "lucide-react";
import { telLink } from "../../utils/dateUtils";
import WhatsAppButton from "./WhatsAppButton";

/**
 * Grup de acțiuni rapide pentru telefon (WhatsApp + Apel telefonic direct).
 *
 * @param {string} phone - Numărul de telefon al clientului
 * @param {object} claim - Obiectul dosar (claim)
 * @param {number} [waSize=11] - Dimensiune icon WhatsApp
 * @param {number} [phoneSize=13] - Dimensiune icon Phone
 * @param {string} [btnClassName="app-alerte-btn-ghost"] - Clasă CSS buton de apel
 * @param {boolean} [condition=true] - Condiție opțională suplimentară
 */
export default function ClaimPhoneActions({
  phone,
  claim,
  waSize = 11,
  phoneSize = 13,
  btnClassName = "app-alerte-btn-ghost",
  condition = true,
}) {
  if (!phone || !condition) return null;

  return (
    <>
      <WhatsAppButton phone={phone} claim={claim} size={waSize} />
      <a
        href={telLink(phone)}
        className={btnClassName}
        title="Sună"
        aria-label="Sună"
      >
        <Phone size={phoneSize} />
      </a>
    </>
  );
}
