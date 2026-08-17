import React from "react";
import { X } from "lucide-react";

/** Căutare dosar — pill jos, fără + / microfon. */
export default function MobileSearchBar({
  value,
  onChange,
  inputRef = null,
  placeholder = "căutare dosar",
}) {
  return (
    <div className="mobile-search-dock m-cursor-composer">
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mobile-search-input app-search m-cursor-composer-input"
        aria-label="Căutare dosar"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="m-cursor-composer-mic"
          aria-label="Șterge căutarea"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
