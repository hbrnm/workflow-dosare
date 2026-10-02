/**
 * Deschide dosarul creat/găsit automat din folderul local DOSARE.
 * `openNew(status, dataProgramare)` primește un STATUS, nu un dosar: pasarea dosarului ca status
 * ajungea afișat ca text în modalul de creare rapidă (React #31).
 * Dosarul trimis aici e deja salvat (sau există deja), deci se deschide ca dosar existent.
 */
export function openAutoClaim(claimDraft, { openExisting, openNew }) {
  if (claimDraft?.id) {
    openExisting(claimDraft);
    return "existing";
  }
  openNew(typeof claimDraft?.status === "string" ? claimDraft.status : undefined);
  return "new";
}
