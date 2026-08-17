import React from "react";
import { Plus, Mic, X } from "lucide-react";

/** Composer jos — pill Cursor: + | câmp | microfon. */
export default function MobileSearchBar({
  value,
  onChange,
  onAdd = null,
  inputRef = null,
  placeholder = "Plan, ask, build...",
}) {
  return (
    <div className="mobile-search-dock m-cursor-composer">
      {onAdd ? (
        <button
          type="button"
          className="m-cursor-composer-add"
          onClick={onAdd}
          aria-label="Dosar nou"
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>
      ) : null}
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
        aria-label="Căutare dosare"
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
      ) : (
        <button
          type="button"
          className="m-cursor-composer-mic"
          onClick={() => inputRef?.current?.focus?.()}
          aria-label="Căutare vocală"
        >
          <Mic size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
