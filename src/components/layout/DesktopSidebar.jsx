import React from "react";
import { Layers, CalendarClock, BarChart3, Settings } from "lucide-react";
import AtelierSwitcher from "../atelier/AtelierSwitcher";

export default function DesktopSidebar({
  branding,
  view,
  setView,
  setDosareSubView,
  userClaimsCount = 0,
  setariOpen = false,
  openSettings,
  memberships = [],
  atelierId = null,
  userEmail = "",
  switchAtelier,
  showNotice,
  handleLogout,
}) {
  return (
    <aside className="hidden md:flex flex-col app-sidebar w-14 shrink-0 z-30 overflow-hidden">
      {/* Top Organization / Atelier Switcher (1-click popover) */}
      <div className="h-14 flex items-center justify-center border-b border-[var(--app-border)] shrink-0 w-full p-1.5">
        <AtelierSwitcher
          memberships={memberships}
          activeId={atelierId}
          userEmail={userEmail}
          onSwitch={async (id) => {
            if (switchAtelier) {
              const ok = await switchAtelier(id);
              if (ok && showNotice) showNotice("Atelier schimbat.", "success");
            }
          }}
          onOpenSettings={openSettings}
          onLogout={handleLogout}
        />
      </div>

      {/* Navigare principală — doar icoane */}
      <div className="flex-1 py-3 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        {[
          { id: "dosare", label: "Dosare (Brief / Flux / Tabel)", icon: Layers, badge: userClaimsCount },
          { id: "programator", label: "Programări", icon: CalendarClock },
          { id: "dashboard", label: "Statistici", icon: BarChart3 },
        ].map(({ id, label, icon: Icon, badge }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center justify-center p-2.5 transition-all rounded-xl ${
                active 
                  ? "bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold shadow-sm" 
                  : "app-nav-btn hover:bg-[var(--app-surface-2)]"
              }`}
              title={label}
            >
              <span className="relative inline-flex">
                <Icon size={20} className="shrink-0" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--app-accent)] text-[var(--app-accent-text)] text-[9px] font-bold leading-[15px] text-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Setări (1 click) + profil / switcher atelier */}
      <div className="p-1.5 shrink-0 border-t border-[var(--app-border)] space-y-1">
        <button
          type="button"
          onClick={openSettings}
          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${
            setariOpen 
              ? "bg-[var(--app-accent)] text-[var(--app-accent-text)] font-bold shadow-sm" 
              : "app-nav-btn hover:bg-[var(--app-surface-2)]"
          }`}
          title="Setări"
          aria-label="Setări"
          aria-pressed={setariOpen}
        >
          <Settings size={20} className="shrink-0" />
        </button>
        <AtelierSwitcher
          memberships={memberships}
          activeId={atelierId}
          userEmail={userEmail}
          onSwitch={async (id) => {
            if (switchAtelier) {
              const ok = await switchAtelier(id);
              if (ok && showNotice) showNotice("Atelier schimbat.", "success");
            }
          }}
          onOpenSettings={openSettings}
          onLogout={handleLogout}
        />
      </div>
    </aside>
  );
}
