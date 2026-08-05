import React from "react";
import { X, Check } from "lucide-react";
import { MOBILE_THEME_LIST } from "../../constants/mobileThemes";

export default function MobileThemePicker({ open, currentId, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Închide"
        onClick={onClose}
      />
      <div
        className="relative m-surface border-t p-4 pb-8 space-y-3 max-h-[78vh] overflow-y-auto"
        style={{
          background: "var(--m-surface)",
          color: "var(--m-text)",
          borderColor: "var(--m-border)",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="m-display font-extrabold text-[16px]">Temă mobilă</h2>
            <p className="text-[11.5px] m-muted mt-0.5">
              Alege un stil vizual — layout, culori și icoane diferite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl"
            style={{ background: "var(--m-surface-2)", color: "var(--m-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {MOBILE_THEME_LIST.map((theme) => {
            const selected = theme.id === currentId;
            const swatches = [
              theme.vars["--m-header"],
              theme.vars["--m-accent"],
              theme.vars["--m-bg"],
              theme.vars["--m-surface"],
            ];
            return (
              <button
                key={theme.id}
                type="button"
                className={`m-theme-chip ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect(theme.id)}
                style={{
                  background: theme.vars["--m-surface"],
                  color: theme.vars["--m-text"],
                  borderColor: selected ? theme.vars["--m-accent"] : theme.vars["--m-border"],
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-[14px]" style={{ fontFamily: theme.fonts.display }}>
                      {theme.label}
                    </div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: theme.vars["--m-muted"] }}>
                      {theme.blurb}
                    </div>
                    <div className="text-[10px] mt-1 opacity-70" style={{ color: theme.vars["--m-muted"] }}>
                      {theme.inspiredNote}
                    </div>
                  </div>
                  {selected && (
                    <span
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: theme.vars["--m-accent"], color: theme.vars["--m-accent-text"] }}
                    >
                      <Check size={14} />
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  {swatches.map((c, i) => (
                    <span
                      key={i}
                      className="h-3 flex-1 rounded-full border"
                      style={{ background: c, borderColor: theme.vars["--m-border"] }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
