import React from "react";
import { X } from "lucide-react";
import { UI_COPY } from "../../constants/uiCopy";

/** Căutare dosar — pill jos, fără + / microfon. Enter deschide primul rezultat. */
export default function MobileSearchBar({
  value,
  onChange,
  onSubmit = null,
  inputRef = null,
  placeholder = UI_COPY.cautareDosar,
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
        aria-label={UI_COPY.cautareDosar}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="m-cursor-composer-mic"
          aria-label={UI_COPY.stergeCautarea}
        >
          <X size={16} />
        </button>
      ) : null}
    </form>
  );
}
