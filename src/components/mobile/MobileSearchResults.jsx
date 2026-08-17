import React from "react";
import { getStatusShortLabel } from "../../constants/config";

/** Rezultate compacte deasupra barei de cautare — nu overlay full-screen. */
export default function MobileSearchResults({ query, matches, onSelect }) {
  const q = (query || "").trim();
  if (!q) return null;

  return (
    <div className="m-search-hits" role="listbox" aria-label="Rezultate căutare">
      {matches.length === 0 ? (
        <p className="m-search-hits-empty">Niciun dosar pentru „{q}”</p>
      ) : (
        matches.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            className="m-search-hit"
            onClick={() => onSelect?.(c)}
          >
            <span className="m-plate">{c.numarInmatriculare || "—"}</span>
            <span className="m-search-hit-meta">
              <span className="m-search-hit-client">{c.client || "Client neprecizat"}</span>
              <span className="m-search-hit-status">{getStatusShortLabel(c.status)}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
