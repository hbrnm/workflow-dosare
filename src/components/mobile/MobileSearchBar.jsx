import React from "react";
import { Search, X } from "lucide-react";

/** Căutare floating jos — pill semitransparent, fără meniu de tab-uri. */
export default function MobileSearchBar({ value, onChange, placeholder = "Caută nr. auto, client, dosar…" }) {
  return (
    <div className="mobile-search-dock">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--app-muted)] pointer-events-none" />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mobile-search-input app-search w-full pl-11 pr-10 py-3.5 rounded-full text-[16px] font-medium"
          aria-label="Căutare dosare"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[var(--app-muted)] hover:bg-[var(--app-surface-muted)]"
            aria-label="Șterge căutarea"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
