import React from "react";
import { Building, Wrench, Clock, Bell, CheckCircle2 } from "lucide-react";
import { STATUSES } from "../../../constants/config";
import { resolveRoleHourlyRate } from "../../../utils/manoperaCost";

export default function SettingsGeneralTab({
  isAdmin = false,
  handleSaveConfig,
  saving = false,
  // Branding
  atelierNume,
  setAtelierNume,
  atelierShort,
  setAtelierShort,
  logoUrl,
  setLogoUrl,
  uploadingLogo = false,
  handleLogoFile,
  onUploadBrandingLogo,
  // Capacity & Alerts
  prag,
  setPrag,
  inactivitateDays,
  setInactivitateDays,
  capacitate,
  setCapacitate,
  alertDaysByStatus,
  setAlertDaysByStatus,
  tvaDefault,
  setTvaDefault,
  // Manopera
  manoperaTarifeDraft,
  setManoperaTarifeDraft,
}) {
  return (
    <form onSubmit={handleSaveConfig} className="space-y-4">
      {/* Identitate atelier / white-label */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Building size={16} className="text-[var(--app-accent)]" /> Identitate atelier (white-label)
        </h3>
        <p className="text-[11.5px] text-[var(--app-muted)]">
          Numele, inițialele și logo-ul apar în header, login, PDF și mesaje WhatsApp.
          {isAdmin ? "" : " Doar administratorul poate salva permanent în cloud."}
        </p>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--app-surface)] text-white">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-contain bg-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-[13px] bg-[#21262d] border border-[#30363d] text-[#e6edf3]">
              {(atelierShort || "WD").slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-extrabold text-[14px] truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {atelierNume || "Dosare Daună"}
            </div>
            <div className="text-[11px] text-white/60">Previzualizare header</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">Nume atelier</label>
            <input
              type="text"
              value={atelierNume}
              onChange={(e) => setAtelierNume(e.target.value)}
              disabled={!isAdmin}
              title={!isAdmin ? "Doar administratorul poate modifica" : undefined}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] font-semibold bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="ex. AutoService Popescu"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">Inițiale (max 4)</label>
            <input
              type="text"
              value={atelierShort}
              onChange={(e) => setAtelierShort(e.target.value.slice(0, 4).toUpperCase())}
              disabled={!isAdmin}
              title={!isAdmin ? "Doar administratorul poate modifica" : undefined}
              maxLength={4}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] font-mono font-extrabold bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed uppercase"
              placeholder="WD"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[12px] font-bold text-[var(--app-text-strong)]">URL logo (public)</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!isAdmin}
                title={!isAdmin ? "Doar administratorul poate modifica" : undefined}
                className="flex-1 min-w-[180px] p-2 border border-[var(--app-border)] rounded-lg text-[12px] font-semibold bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="https://… sau lasă gol pentru inițiale"
              />
              {isAdmin && onUploadBrandingLogo && (
                <label className="px-3 py-2 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] text-[12px] font-bold cursor-pointer hover:bg-[var(--app-border-soft)]">
                  {uploadingLogo ? "Se încarcă…" : "Încarcă fișier"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploadingLogo} />
                </label>
              )}
              {logoUrl && isAdmin && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="px-3 py-2 rounded-lg border border-[var(--app-border)] text-[12px] font-bold text-[var(--app-danger)]"
                >
                  Șterge logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Wrench size={16} className="text-[var(--app-accent)]" /> Configurare Capacitate Atelier &amp; Praguri Alerte
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prag mașini neridicate */}
          <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2">
            <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)]">
              Prag alertă mașini neridicate (zile)
            </label>
            <p className="text-[11px] text-[var(--app-muted)]">
              După câte zile de la finalizarea reparației se declanșează alerta pentru mașinile neridicate.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="30"
                className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-[var(--app-surface)] text-center focus:border-[var(--app-accent)]"
                value={prag}
                onChange={(e) => setPrag(e.target.value)}
              />
              <span className="text-[12.5px] font-bold text-[var(--app-muted)]">zile de la finalizare</span>
            </div>
          </div>

          {/* Alertă dosare fără activitate (inactivitate) */}
          <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2">
            <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
              <Clock size={15} className="text-[var(--app-accent)]" /> Prag alertă dosare fără activitate (inactivitate)
            </label>
            <p className="text-[11px] text-[var(--app-muted)]">
              Semnalează dosarele deschise în care NU a existat nicio modificare, schimbare de status sau notă nouă timp de X zile.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <select
                className="p-2 border border-[var(--app-border)] rounded-lg font-bold text-[13.5px] bg-[var(--app-surface)] focus:border-[var(--app-accent)]"
                value={inactivitateDays}
                onChange={(e) => setInactivitateDays(Number(e.target.value))}
              >
                <option value={1}>1 zi fără activitate</option>
                <option value={2}>2 zile fără activitate</option>
                <option value={3}>3 zile fără activitate</option>
                <option value={5}>5 zile fără activitate</option>
                <option value={7}>7 zile fără activitate (implicit)</option>
                <option value={10}>10 zile fără activitate</option>
                <option value={14}>14 zile (2 săptămâni)</option>
                <option value={30}>30 zile (1 lună)</option>
              </select>
            </div>
          </div>

          {/* Capacitate zilnică programator */}
          <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2">
            <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)]">
              Capacitate maximă programări pe zi
            </label>
            <p className="text-[11px] text-[var(--app-muted)]">
              Limita de dosare ce pot fi programate într-o singură zi în calendarul service-ului.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="1"
                max="20"
                className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-[var(--app-surface)] text-center focus:border-[var(--app-accent)]"
                value={capacitate}
                onChange={(e) => setCapacitate(e.target.value)}
              />
              <span className="text-[12.5px] font-bold text-[var(--app-muted)]">mașini / zi</span>
            </div>
          </div>

          {/* Praguri alertă per stadiu */}
          <div className="col-span-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-3">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Bell size={15} className="text-[var(--app-accent)]" /> Praguri alertă per stadiu (zile)
              </label>
              <p className="text-[11px] text-[var(--app-muted)] mt-1">
                După câte zile în același stadiu se declanșează alerta pe card și în Brief.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STATUSES.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5">
                  <span className="text-[11px] font-bold text-[var(--app-text-strong)] truncate" title={s.label}>
                    {s.num}. {s.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="w-14 p-1 border border-[var(--app-border)] rounded-md font-bold text-[13px] bg-[var(--app-surface)] text-center focus:border-[var(--app-accent)]"
                      value={alertDaysByStatus[s.key] ?? s.alertDays ?? 3}
                      onChange={(e) =>
                        setAlertDaysByStatus((prev) => ({
                          ...prev,
                          [s.key]: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                    />
                    <span className="text-[10px] font-bold text-[var(--app-muted)]">z</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TVA Implicit */}
          <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2">
            <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)]">
              Cotă TVA implicită (%)
            </label>
            <p className="text-[11px] text-[var(--app-muted)]">
              Procentul de TVA aplicat automat la calculul veniturilor financiare și facturilor dosarului.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="0"
                max="100"
                className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-[var(--app-surface)] text-center focus:border-[var(--app-accent)]"
                value={tvaDefault}
                onChange={(e) => setTvaDefault(e.target.value)}
              />
              <span className="text-[12.5px] font-bold text-[var(--app-muted)]">% TVA</span>
            </div>
          </div>

          {/* Tarife manoperă — cost real din salariu */}
          <div className="col-span-full bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-3">
            <div>
              <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Wrench size={15} className="text-[var(--app-accent)]" /> Tarife manoperă internă
              </label>
              <p className="text-[11px] text-[var(--app-muted)] mt-1">
                Salariu lunar + ore productive → tarif orar pentru calcul automat al costului manoperei pe dosar.
                Exemplu: 8000 lei/lună, 160 ore, overhead 20% → ~60 lei/h.
              </p>
            </div>

            {(["tinichigerie", "vopsitorie"]).map((role) => {
              const roleLabel = role === "tinichigerie" ? "Tinichigerie" : "Vopsitorie";
              const cfg = manoperaTarifeDraft[role] || {};
              const computedRate = resolveRoleHourlyRate(cfg);
              const previewRate =
                cfg.tarifOrar != null && cfg.tarifOrar !== "" ? Number(cfg.tarifOrar) : computedRate;
              return (
                <div key={role} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg p-2.5">
                  <div className="sm:col-span-4 text-[11px] font-bold text-[var(--app-text-strong)] uppercase tracking-wide">
                    {roleLabel}
                    <span className="ml-2 text-[10px] font-mono text-[var(--app-accent)]">
                      {previewRate > 0 ? `${previewRate.toLocaleString("ro-RO")} lei/h` : "—"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--app-muted)] mb-0.5">Salariu lunar (lei)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-1.5 border border-[var(--app-border)] rounded-md font-mono text-[12px] bg-[var(--app-surface)]"
                      value={cfg.salariuLunar || ""}
                      onChange={(e) =>
                        setManoperaTarifeDraft((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], salariuLunar: Number(e.target.value) || 0, tarifOrar: null },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--app-muted)] mb-0.5">Ore/lună</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-1.5 border border-[var(--app-border)] rounded-md font-mono text-[12px] bg-[var(--app-surface)]"
                      value={cfg.oreProductiveLuna ?? 160}
                      onChange={(e) =>
                        setManoperaTarifeDraft((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], oreProductiveLuna: Math.max(1, Number(e.target.value) || 160), tarifOrar: null },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--app-muted)] mb-0.5">Overhead (%)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full p-1.5 border border-[var(--app-border)] rounded-md font-mono text-[12px] bg-[var(--app-surface)]"
                      value={cfg.overheadProc ?? 20}
                      onChange={(e) =>
                        setManoperaTarifeDraft((prev) => ({
                          ...prev,
                          [role]: { ...prev[role], overheadProc: Math.max(0, Number(e.target.value) || 0), tarifOrar: null },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--app-muted)] mb-0.5">Tarif manual (lei/h)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={computedRate > 0 ? String(computedRate) : "auto"}
                      className="w-full p-1.5 border border-[var(--app-border)] rounded-md font-mono text-[12px] bg-[var(--app-surface)]"
                      value={cfg.tarifOrar ?? ""}
                      onChange={(e) =>
                        setManoperaTarifeDraft((prev) => ({
                          ...prev,
                          [role]: {
                            ...prev[role],
                            tarifOrar: e.target.value === "" ? null : Number(e.target.value) || null,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}

            <label className="flex items-center gap-2 text-[11px] text-[var(--app-text-strong)] cursor-pointer">
              <input
                type="checkbox"
                checked={manoperaTarifeDraft.autoCalcFromOre !== false}
                onChange={(e) =>
                  setManoperaTarifeDraft((prev) => ({ ...prev, autoCalcFromOre: e.target.checked }))
                }
                className="rounded border-[var(--app-border)]"
              />
              Calculează automat costul manoperei când se schimbă orele pe dosar
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white font-bold rounded-lg text-[13px] shadow-sm transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={16} /> Salvează Parametrii
        </button>
      </div>
    </form>
  );
}
