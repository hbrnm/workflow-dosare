import React from "react";
import { Sparkles, Plus, Trash2, Layers } from "lucide-react";
import { fmtDateTime } from "../../../utils/dateUtils";
import ClaimTimeline from "../../common/ClaimTimeline";

export default function ClaimHistoryTab({
  form,
  isNew = false,
  istoric = [],
  loadingIstoric = false,
  noteText = "",
  setNoteText,
  slashIndex = 0,
  setSlashIndex,
  noteInputRef,
  filteredSlashCommands = [],
  applySlashCommand,
  addNote,
  handleNoteKeyDown,
  removeNote,
}) {
  const notesList = Array.isArray(form.note) ? form.note : [];

  return (
    <div className="space-y-3">
      {/* Note Interne Echipă */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-1.5">
          <h3 className="font-bold text-[12px] text-[var(--app-text-strong)] flex items-center gap-1.5">
            <Sparkles size={14} className="text-[var(--app-accent)]" /> Notițe interne echipă ({notesList.length})
          </h3>
        </div>

        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={noteInputRef}
              className="flex-1 p-2 border border-[var(--app-border)] rounded-lg text-[12px] bg-[var(--app-surface-2)] focus:bg-[var(--app-surface)] focus:border-[var(--app-accent)]"
              placeholder="Adaugă o notă internă... (tastează / pentru comenzi rapide)"
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value);
                setSlashIndex?.(0);
              }}
              onKeyDown={handleNoteKeyDown}
            />
            <button
              type="button"
              onClick={() => addNote()}
              className="px-3 py-1.5 bg-[var(--app-muted)] hover:bg-[var(--app-text)] text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus size={15} /> Adaugă
            </button>
          </div>

          {/* Autocomplete popup for slash commands */}
          {filteredSlashCommands.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 w-full max-w-sm bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg shadow-lg py-1 z-30">
              {filteredSlashCommands.map((cmd, idx) => {
                const Icon = cmd.Icon;
                const isSelected = idx === slashIndex;
                return (
                  <button
                    key={cmd.cmd}
                    type="button"
                    onClick={() => applySlashCommand(cmd.prefix)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11.5px] cursor-pointer transition-colors ${
                      isSelected ? "bg-[var(--app-surface-2)] font-bold text-[var(--app-text-strong)]" : "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)]"
                    }`}
                  >
                    {Icon && <Icon size={13} className="shrink-0" />}
                    <span className="font-mono font-bold text-[var(--app-accent)]">{cmd.cmd}</span>
                    <span className="truncate">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-0.5 max-h-56 overflow-y-auto pr-1">
          {notesList.map((n) => {
            const isAlert = n.text?.includes("[ALERTĂ]");
            const isParts = n.text?.includes("[PIESE]");
            const isCar = n.text?.includes("[AUTO SCHIMB]");
            const isCall = n.text?.includes("[APEL CLIENT]");

            return (
              <div
                key={n.id}
                className={`p-2 rounded-lg border transition-all ${
                  isAlert ? "bg-red-50/70 border-red-200 text-[#8C2E2E]"
                  : isParts ? "bg-amber-50/70 border-amber-200 text-[var(--app-warning)]"
                  : isCar ? "bg-blue-50/70 border-blue-200 text-[var(--app-text)]"
                  : isCall ? "bg-emerald-50/70 border-emerald-200 text-[var(--app-success)]"
                  : "bg-[var(--app-surface-2)] border-[var(--app-border)] text-[var(--app-text-strong)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--app-muted)] border-b border-black/5 pb-1 mb-1">
                  <span className="truncate min-w-0">
                    {fmtDateTime(n.data)}
                    {n.author ? (
                      <span className="ml-1.5 font-sans font-semibold text-[var(--app-text)]">
                        · {n.author}
                      </span>
                    ) : null}
                  </span>
                  <button type="button" onClick={() => removeNote(n.id)} className="text-[var(--app-danger)] hover:opacity-80 p-0.5 shrink-0 cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-[12px] whitespace-pre-wrap font-medium leading-relaxed">
                  {n.text}
                </div>
              </div>
            );
          })}

          {notesList.length === 0 && (
            <div className="text-[12.5px] text-[var(--app-muted)] italic p-6 text-center border border-dashed border-[var(--app-border)] rounded-xl bg-[var(--app-surface-2)]">
              Nicio notă înregistrată.
            </div>
          )}
        </div>
      </div>

      {/* Stepper Statusuri & Istoric Timeline */}
      {!isNew && (
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3 space-y-2 shadow-2xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] border-b border-[var(--app-border)]/60 pb-1 flex items-center gap-1.5">
            <Layers size={13} className="text-[var(--app-muted)]" /> Etape Flux &amp; Jurnal de Activități
          </div>
          <div className="pt-1">
            <ClaimTimeline
              currentStatus={form.status}
              dataSchimbareStatus={form.dataSchimbareStatus}
              istoric={istoric}
              loading={loadingIstoric}
            />
          </div>
        </div>
      )}
    </div>
  );
}
