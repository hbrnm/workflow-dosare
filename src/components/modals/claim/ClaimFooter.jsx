import React from "react";
import { Trash2, Save, Loader2 } from "lucide-react";

export default function ClaimFooter({
  readOnly = false,
  claimId = null,
  onDelete,
  requestClose,
  handleSave,
  savingLocal = false,
  unsavedPrompt = false,
  setUnsavedPrompt,
  discardAndClose,
  desktopUi = false,
}) {
  return (
    <>
      {/* Footer — pill actions */}
      <div className="m-claim-footer shrink-0">
        {readOnly ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onDelete) {
                onDelete(claimId);
              }
            }}
            className="m-claim-footer-btn flex items-center gap-1 text-[var(--app-danger)] text-[12px] font-bold hover:bg-[var(--app-danger)]/10 px-3 py-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} /> Șterge dosar
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="m-claim-footer-btn px-4 py-1.5 border border-[var(--app-border)] text-[12.5px] font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-2)] transition-colors cursor-pointer"
          >
            {readOnly ? "Închide" : "Anulează"}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleSave?.()}
              disabled={savingLocal}
              className="m-claim-footer-primary flex items-center gap-1.5 px-5 py-1.5 text-[12.5px] font-extrabold shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {savingLocal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingLocal ? "Se salvează…" : "Salvează modificările"}
            </button>
          )}
        </div>
      </div>

      {/* Unsaved changes dialog */}
      {unsavedPrompt && (
        <div
          className="absolute inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="claim-unsaved-title"
        >
          <div
            className={`w-full max-w-sm rounded-xl border p-4 shadow-xl ${
              desktopUi
                ? "bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]"
                : "bg-[var(--app-surface-muted)] border-white/15 text-white"
            }`}
          >
            <h3 id="claim-unsaved-title" className="text-[14px] font-bold tracking-tight">
              Modificări nesalvate
            </h3>
            <p className={`mt-1.5 text-[12.5px] leading-snug ${desktopUi ? "text-[var(--app-muted)]" : "text-white/70"}`}>
              Ai schimbări pe acest dosar. Salvează înainte de a închide, sau renunță la modificări.
            </p>
            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnsavedPrompt(false)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer ${
                  desktopUi
                    ? "border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                    : "border-white/20 hover:bg-white/10"
                }`}
              >
                Continuă editarea
              </button>
              <button
                type="button"
                onClick={discardAndClose}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-[var(--app-danger)]/40 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors cursor-pointer"
              >
                Renunță
              </button>
              <button
                type="button"
                onClick={() => handleSave?.()}
                className="m-claim-footer-primary flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-colors cursor-pointer"
              >
                <Save size={13} /> Salvează
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
