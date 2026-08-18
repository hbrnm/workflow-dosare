import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, ChevronUp, Settings, LogOut } from "lucide-react";

/**
 * Compact popover: switch atelier (if multi) + Setări + logout.
 * Menu is portaled + fixed so the narrow desktop sidebar (overflow-hidden) cannot clip it.
 */
export default function AtelierSwitcher({
  memberships = [],
  activeId = null,
  userEmail = "",
  onSwitch,
  onOpenSettings,
  onLogout,
  compact = false,
  trigger = "avatar",
  setariOpen = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const multi = memberships.length > 1;
  const active = memberships.find((m) => m.id === activeId) || memberships[0];

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) {
      setMenuPos(null);
      return undefined;
    }
    const place = () => {
      const r = wrapRef.current.getBoundingClientRect();
      if (compact) {
        setMenuPos({
          left: Math.max(8, r.left),
          bottom: Math.max(8, window.innerHeight - r.top + 8),
        });
      } else {
        setMenuPos({
          left: Math.min(r.right + 8, window.innerWidth - 236),
          bottom: Math.max(8, window.innerHeight - r.bottom),
        });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, compact]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
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

  const openSettingsSafely = () => {
    setOpen(false);
    window.setTimeout(() => onOpenSettings?.(), 0);
  };

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[80] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl p-1.5 min-w-[220px] animate-in zoom-in-95 duration-100"
            style={{ left: menuPos.left, bottom: menuPos.bottom }}
          >
            {active || userEmail ? (
              <div className="px-2.5 py-2 border-b border-[var(--app-border)] mb-1">
                {active ? (
                  <div className="text-[13px] font-bold text-[var(--app-text-strong)] truncate">
                    {active.nume}
                  </div>
                ) : null}
                {userEmail ? (
                  <div className="text-[11px] text-[var(--app-muted)] truncate">
                    {userEmail}
                  </div>
                ) : null}
              </div>
            ) : null}

            {multi ? (
              <div className="mb-1 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--app-muted)] uppercase tracking-wide">
                  Ateliere Disponibile ({memberships.length})
                </div>
                <div className="max-h-44 overflow-y-auto space-y-0.5">
                  {memberships.map((m) => {
                    const isActive = m.id === activeId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="menuitem"
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[12px] transition-colors ${
                          isActive
                            ? "bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] font-bold"
                            : "hover:bg-[var(--app-surface-2)] text-[var(--app-text)] font-semibold"
                        }`}
                        onClick={async () => {
                          if (!isActive) await onSwitch?.(m.id);
                          setOpen(false);
                        }}
                      >
                        <Building2 size={14} className="shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1 truncate">{m.nume}</span>
                        {isActive ? <Check size={14} className="text-[var(--app-accent)]" /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="border-b border-[var(--app-border)] my-1" />
              </div>
            ) : null}

            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openSettingsSafely();
              }}
            >
              <Settings size={15} className="text-[var(--app-accent)] shrink-0" />
              <span>Setări &amp; Configurare</span>
            </button>

            {onLogout ? (
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] font-bold text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors mt-0.5"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={15} className="shrink-0" />
                <span>Deconectare</span>
              </button>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${
          open || setariOpen
            ? "bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold shadow-sm"
            : "app-nav-btn hover:bg-[var(--app-surface-2)]"
        }`}
        title={active ? `Setări, Atelier (${active.nume}) & Delogare` : "Setări & Cont"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Meniu setări și cont"
      >
        {trigger === "gear" ? (
          <Settings size={20} className="shrink-0" />
        ) : active?.logoUrl ? (
          <img src={active.logoUrl} alt="" className="w-7 h-7 rounded-md object-contain bg-[var(--app-surface)]" />
        ) : (
          <div className="w-7 h-7 rounded-md app-accent-bg font-bold text-[10px] flex items-center justify-center shrink-0">
            {mark}
          </div>
        )}
      </button>

      {menu}
    </div>
  );
}
