import React from "react";
import { X } from "lucide-react";

/** Cautare dosar — pill jos, fara + / microfon. Enter deschide primul rezultat. */
export default function MobileSearchBar({
  value,
  onChange,
  onSubmit = null,
  inputRef = null,
  placeholder = "cautare dosar",
}) {
  return (
    <form
      className="mobile-search-dock m-cursor-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
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
        aria-label="Cautare dosar"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="m-cursor-composer-mic"
          aria-label="Sterge cautarea"
        >
          <X size={16} />
        </button>
      ) : null}
    </form>
  );
}
