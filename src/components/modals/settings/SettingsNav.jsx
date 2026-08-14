import React from "react";
import { X, Building, User, Wrench, Sparkles, Bell, Database, Scale } from "lucide-react";

export default function SettingsNav({
  desktopUi = false,
  settingsSection = "atelier",
  setSettingsSection,
  activeTab = "general",
  setActiveTab,
  insurersCount = 0,
  onClose,
}) {
  return (
    <div className="shrink-0 border-b border-[var(--app-border)] px-3 pt-2 space-y-2">
      <div className="flex items-center gap-1.5">
        {[
          { id: "atelier", label: "Atelier", icon: Building },
          { id: "cont", label: "Cont", icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSettingsSection(id);
              setActiveTab(id === "cont" ? "profil" : "general");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
              settingsSection === id
                ? "bg-[var(--app-surface-muted)] text-[var(--app-text-strong)]"
                : "text-[var(--app-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        {!desktopUi ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 p-2 rounded-full text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface-muted)]"
            aria-label="Închide setările"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {settingsSection === "atelier" ? (
        <div className="m-settings-tabs m-settings-tabs--pill flex overflow-x-auto scrollbar-thin pb-2">
          {[
            { id: "general", label: desktopUi ? "Parametri" : "Parametri", icon: Wrench },
            { id: "asiguratori", label: "Asigurători", icon: Building, badge: insurersCount },
            { id: "ai", label: "Agent AI", icon: Sparkles },
            { id: "notificari", label: desktopUi ? "Afișare" : "Afișare", icon: Bell },
            { id: "diagnoza", label: "Backup", icon: Database },
            { id: "date", label: "Date", icon: Scale },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`m-settings-tab flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold transition-all whitespace-nowrap shrink-0 border-0 ${
                  active ? "is-active" : ""
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
                {badge !== undefined && (
                  <span className={`m-settings-tab-badge px-1.5 py-0.5 text-[10px] font-black rounded-full ${active ? "is-active" : ""}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pb-2 text-[11px] text-[var(--app-muted)] px-1">
          Parolă, rol și membri echipă
        </div>
      )}
    </div>
  );
}
