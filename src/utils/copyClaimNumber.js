/** Copiază numărul de dosar în clipboard + notificare. */
export async function copyClaimNumber(numarDosar, onNotify) {
  const value = String(numarDosar || "").trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    onNotify?.(`Nr. dosar copiat: ${value}`, "success");
    return true;
  } catch {
    onNotify?.("Nu am putut copia în clipboard.", "error");
    return false;
  }
}
