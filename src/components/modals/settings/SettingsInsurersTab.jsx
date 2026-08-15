import React from "react";
import { Building, Plus, Trash2 } from "lucide-react";
import { INSURERS } from "../../../constants/config";

export default function SettingsInsurersTab({
  isAdmin = false,
  insurersList = [],
  newInsurer = "",
  setNewInsurer,
  handleAddInsurer,
  handleRemoveInsurer,
}) {
  const list = Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS;

  return (
    <div className="space-y-4">
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
          <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] flex items-center gap-2">
            <Building size={16} className="text-[var(--app-accent)]" /> Nomenclator Asigurători ({list.length})
          </h3>
          <span className="text-[11px] text-[var(--app-muted)] font-semibold">Lista societăților de asigurare</span>
        </div>

        {/* Adăugare Asigurător Nou (doar pentru Admins) */}
        {isAdmin ? (
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface-2)] focus:bg-[var(--app-surface)]"
              placeholder="Adaugă societate de asigurare nouă (ex: SIGNAL IDUNA)..."
              value={newInsurer}
              onChange={(e) => setNewInsurer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddInsurer();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddInsurer}
              className="flex items-center gap-1 px-4 py-2 bg-[var(--app-muted)] text-white rounded-lg text-[12.5px] font-bold hover:bg-[var(--app-text)]"
            >
              <Plus size={15} /> Adaugă
            </button>
          </div>
        ) : (
          <p className="text-[11.5px] text-[var(--app-muted)] bg-[var(--app-surface-2)] p-2.5 rounded-lg border border-[var(--app-border)]">
            Lista societăților de asigurare este gestionată de Administrator.
          </p>
        )}

        {/* Grilă Asigurători */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
          {list.map((ins) => (
            <div
              key={ins}
              className="flex items-center justify-between bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[12.5px]"
            >
              <span className="font-semibold text-[var(--app-text-strong)] truncate">{ins}</span>
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Șterge din listă"
                  onClick={() => handleRemoveInsurer(ins)}
                  className="text-[var(--app-muted)] hover:text-[var(--app-danger)] p-1 transition-colors"
                  title="Șterge din listă"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
