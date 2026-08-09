import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronUp, Settings, LogOut } from "lucide-react";

/**
 * Compact popover: switch atelier (if multi) + Setări + logout.
 */
export default function AtelierSwitcher({
  memberships = [],
  activeId = null,
  userEmail = "",
  onSwitch,
  onOpenSettings,
  onLogout,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const multi = memberships.length > 1;
  const active = memberships.find((m) => m.id === activeId) || memberships[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const mark = active?.short || (userEmail ? userEmail.charAt(0).toUpperCase() : "U");

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-center p-2 rounded-lg app-nav-btn transition-all ${
          open ? "is-active" : ""
        }`}
        title={active ? `${active.nume}${userEmail ? ` — ${userEmail}` : ""}` : "Cont"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={active ? `Atelier ${active.nume}` : "Meniu cont"}
      >
        {active?.logoUrl ? (
          <img src={active.logoUrl} alt="" className="w-7 h-7 rounded-md object-contain bg-white" />
        ) : (
          <div className="w-7 h-7 rounded-md app-accent-bg font-bold text-[10px] flex items-center justify-center shrink-0">
            {mark}
          </div>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-50 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg p-1.5 min-w-[220px] ${
            compact ? "left-0 bottom-full mb-2" : "left-full bottom-0 ml-2"
          }`}
        >
          {active ? (
            <div className="px-2.5 py-2 border-b border-[var(--app-border)] mb-1">
              <div className="text-[11px] font-bold text-[var(--app-muted)] uppercase tracking-wide">
                Atelier
              </div>
              <div className="text-[13px] font-semibold text-[var(--app-text-strong)] truncate">
                {active.nume}
              </div>
              {active.slug ? (
                <div className="text-[10px] font-mono text-[var(--app-muted)] truncate">
                  ?atelier={active.slug}
                </div>
              ) : null}
            </div>
          ) : null}

          {multi ? (
            <div className="max-h-48 overflow-y-auto mb-1">
              {memberships.map((m) => {
                const isActive = m.id === activeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="menuitem"
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] ${
                      isActive
                        ? "bg-[var(--app-surface-muted)] text-[var(--app-text-strong)]"
                        : "hover:bg-[var(--app-surface-2)] text-[var(--app-text)]"
                    }`}
                    onClick={async () => {
                      if (!isActive) await onSwitch?.(m.id);
                      setOpen(false);
                    }}
                  >
                    <Building2 size={14} className="shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{m.nume}</span>
                    {isActive ? <Check size={14} className="text-[var(--app-accent)]" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              // Amână deschiderea ca pointerdown/click-ul din meniu să nu închidă modalul.
              window.setTimeout(() => onOpenSettings?.(), 0);
            }}
          >
            <Settings size={14} /> Setări
          </button>
          {onLogout ? (
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut size={14} /> Deconectare
            </button>
          ) : null}
          {multi ? (
            <div className="px-2.5 py-1 text-[10px] text-[var(--app-muted)] flex items-center gap-1">
              <ChevronUp size={10} /> Schimbă atelierul
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
