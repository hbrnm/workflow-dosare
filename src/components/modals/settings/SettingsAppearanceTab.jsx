import React from "react";
import { Sun, Moon, Clock } from "lucide-react";
import { saveThemePreference } from "../../../utils/themePrefs";

export default function SettingsAppearanceTab({
  themePref = "auto",
  setThemePref,
}) {
  const handleSelectTheme = (id) => {
    saveThemePreference(id);
    setThemePref(id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Sun size={16} className="text-[var(--app-accent)]" /> Aspect &amp; temă
        </h3>
        <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
          <strong className="text-[var(--app-text-strong)]">Automat</strong> — fundal alb între 07:00–19:00, negru noaptea.
          Poți forța manual tema deschisă sau întunecată.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: "auto", label: "Automat", hint: "Zi / noapte", Icon: Clock },
            { id: "light", label: "Deschis", hint: "Alb", Icon: Sun },
            { id: "dark", label: "Întunecat", hint: "Negru", Icon: Moon },
          ].map(({ id, label, hint, Icon }) => {
            const active = themePref === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectTheme(id)}
                className={`m-theme-choice flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  active ? "is-active" : ""
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                <span className="text-[12px] font-extrabold">{label}</span>
                <span className="text-[10px] font-semibold opacity-80">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] text-[var(--app-muted)] px-1">
        Notificările și alertele folosesc aceleași reguli ca în modul desktop.
      </p>
    </div>
  );
}
