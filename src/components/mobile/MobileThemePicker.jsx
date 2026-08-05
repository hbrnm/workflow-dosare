import React from "react";
import { Check } from "lucide-react";
import { MOBILE_THEME_LIST } from "../../constants/mobileThemes";

/**
 * Inline theme chooser — used from Setări (Afișare & Alerte).
 */
export default function MobileThemePicker({ currentId, onSelect }) {
  return (
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
              <div className="min-w-0 text-left">
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
  );
}
