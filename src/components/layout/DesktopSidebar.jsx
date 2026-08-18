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
      {/* Navigare principală — doar icoane */}
      <div className="flex-1 py-2.5 px-1.5 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none">
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
                  ? "bg-[var(--app-accent)] text-white font-bold shadow-md shadow-sky-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/10 hover:border hover:border-white/15 hover:backdrop-blur-md hover:shadow-sm"
              }`}
              title={label}
            >
              <span className="relative inline-flex">
                <Icon size={20} className="shrink-0" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--app-accent)] text-white text-[9px] font-bold leading-[15px] text-center shadow-xs">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Singurul buton la baza barei — Roată de Setări cu meniu unificat (Setări, Schimbă Atelier, Deconectare) */}
      <div className="p-1.5 shrink-0 border-t border-[var(--app-border)]">
        <AtelierSwitcher
          memberships={memberships}
          activeId={atelierId}
          userEmail={userEmail}
          trigger="gear"
          setariOpen={setariOpen}
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
