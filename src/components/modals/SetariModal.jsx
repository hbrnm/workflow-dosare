import React, { useState, useMemo, useEffect } from "react";
import {
  X, Settings, User, Building, Database, Bell, Wrench, Download,
  CheckCircle2, Plus, Trash2, Key, Sliders, Shield, RefreshCw, Car, ChevronRight, Clock
} from "lucide-react";
import { INSURERS, STATUSES } from "../../constants/config";
import * as XLSX from "xlsx";
import { todayISO } from "../../utils/dateUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";

export default function SetariModal({
  claims = [],
  capacitateZilnica,
  pragRidicare,
  pragInactivitate = 7,
  termeneAlertaStatus = {},
  onSaveTermeneAlertaStatus,
  onSaveCapacitate,
  onSavePrag,
  onSavePragInactivitate,
  insurersList: initialInsurersList = INSURERS,
  onSaveInsurers,
  branding: brandingProp = null,
  onSaveBranding,
  onUploadBrandingLogo,
  onClose,
  onNotify,
  userEmail,
  onSignOut,
  isAdmin = false,
  usersList = [],
  onAddUser,
  onDeleteUser,
  onToggleAdminRole,
  onChangePassword,
  desktopUi = false,
}) {
  const [activeTab, setActiveTab] = useState("general"); // "general" | "asiguratori" | "notificari" | "profil" | "diagnoza"

  // Form states
  const [capacitate, setCapacitate] = useState(capacitateZilnica || 3);
  const [prag, setPrag] = useState(pragRidicare || 3);
  const [inactivitateDays, setInactivitateDays] = useState(pragInactivitate || 7);
  const [alertDaysByStatus, setAlertDaysByStatus] = useState(() => {
    const initial = {};
    STATUSES.forEach((s) => {
      initial[s.key] = termeneAlertaStatus[s.key] ?? s.alertDays ?? 3;
    });
    return initial;
  });
  const [tvaDefault, setTvaDefault] = useState(21);
  const [insurersList, setInsurersList] = useState(initialInsurersList);
  const [newInsurer, setNewInsurer] = useState("");
  const [saving, setSaving] = useState(false);
  const [atelierNume, setAtelierNume] = useState(brandingProp?.atelierNume || "Dosare Daună");
  const [atelierShort, setAtelierShort] = useState(brandingProp?.atelierShort || "WD");
  const [logoUrl, setLogoUrl] = useState(brandingProp?.logoUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (initialInsurersList && initialInsurersList.length > 0) {
      setInsurersList(initialInsurersList);
    }
  }, [initialInsurersList]);

  useEffect(() => {
    if (!brandingProp) return;
    setAtelierNume(brandingProp.atelierNume || "Dosare Daună");
    setAtelierShort(brandingProp.atelierShort || "WD");
    setLogoUrl(brandingProp.logoUrl || "");
  }, [brandingProp]);

  useEffect(() => {
    setAlertDaysByStatus((prev) => {
      const next = { ...prev };
      STATUSES.forEach((s) => {
        if (termeneAlertaStatus[s.key] != null) {
          next[s.key] = termeneAlertaStatus[s.key];
        } else if (next[s.key] == null) {
          next[s.key] = s.alertDays ?? 3;
        }
      });
      return next;
    });
  }, [termeneAlertaStatus]);

  // New user management states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("operator"); // "operator" | "admin"
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Password change states for current logged-in user
  const [myNewPassword, setMyNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Statistics
  const totalPoze = useMemo(() => claims.reduce((acc, c) => acc + (c.poze?.length || 0), 0), [claims]);
  const totalDocumente = useMemo(() => claims.reduce((acc, c) => acc + (c.documente?.length || 0), 0), [claims]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (capacitate !== capacitateZilnica) {
        await onSaveCapacitate(Number(capacitate));
      }
      if (prag !== pragRidicare) {
        await onSavePrag(Number(prag));
      }
      if (inactivitateDays !== pragInactivitate && onSavePragInactivitate) {
        await onSavePragInactivitate(Number(inactivitateDays));
      }
      if (onSaveTermeneAlertaStatus) {
        const overrides = {};
        STATUSES.forEach((s) => {
          const val = Number(alertDaysByStatus[s.key]);
          if (!Number.isNaN(val) && val > 0) {
            overrides[s.key] = val;
          }
        });
        await onSaveTermeneAlertaStatus(overrides);
      }
      if (onSaveInsurers) {
        await onSaveInsurers(insurersList);
      }
      if (onSaveBranding) {
        await onSaveBranding({
          atelierNume,
          atelierShort,
          logoUrl,
        });
      }
      onNotify("Setările și branding-ul au fost salvate cu succes!", "success");
      onClose();
    } catch (err) {
      onNotify("Eroare la salvarea setărilor: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUploadBrandingLogo) return;
    setUploadingLogo(true);
    try {
      const url = await onUploadBrandingLogo(file);
      setLogoUrl(url);
      onNotify("Logo încărcat. Apasă Salvează pentru a confirma.", "success");
    } catch (err) {
      onNotify(err.message || "Eroare la încărcarea logo-ului.", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddInsurer = async () => {
    const val = newInsurer.trim();
    if (!val) return;
    if (insurersList.includes(val)) {
      onNotify("Acest asigurător există deja în listă.", "error");
      return;
    }
    const nextList = [...insurersList, val].sort();
    setInsurersList(nextList);
    setNewInsurer("");
    if (onSaveInsurers) {
      await onSaveInsurers(nextList);
    }
    onNotify(`Asigurătorul „${val}" a fost adăugat.`, "success");
  };

  const handleRemoveInsurer = async (name) => {
    const nextList = insurersList.filter((i) => i !== name);
    setInsurersList(nextList);
    if (onSaveInsurers) {
      await onSaveInsurers(nextList);
    }
    onNotify(`Asigurătorul „${name}" a fost eliminat.`, "info");
  };

  const exportFullBackupJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(claims, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup-workflow-dosare-${todayISO()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify("Backup-ul JSON al dosarelor a fost descărcat.", "success");
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const email = newUserEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      onNotify("Introdu o adresă de e-mail validă.", "error");
      return;
    }
    if (!newUserPassword || newUserPassword.trim().length < 6) {
      onNotify("Setează o parolă inițială de cel puțin 6 caractere pentru utilizator.", "error");
      return;
    }
    setCreatingUser(true);
    try {
      if (onAddUser) {
        await onAddUser({ email, role: newUserRole, password: newUserPassword });
      }
      setNewUserEmail("");
      setNewUserPassword("");
      onNotify(`Utilizatorul „${email}" a fost adăugat cu succes în sistem și se poate conecta!`, "success");
    } catch (err) {
      onNotify("Eroare la adăugarea utilizatorului: " + err.message, "error");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!myNewPassword || myNewPassword.trim().length < 6) {
      onNotify("Noua parolă trebuie să aibă cel puțin 6 caractere.", "error");
      return;
    }
    if (myNewPassword !== confirmNewPassword) {
      onNotify("Parolele introduse nu coincid.", "error");
      return;
    }
    setUpdatingPassword(true);
    try {
      if (onChangePassword) {
        await onChangePassword(myNewPassword.trim());
      }
      setMyNewPassword("");
      setConfirmNewPassword("");
      onNotify("Parola ta a fost actualizată cu succes!", "success");
    } catch (err) {
      onNotify("Eroare la schimbarea parolei: " + err.message, "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div
      className={modalOverlayClass(desktopUi)}
      {...modalOverlayProps(desktopUi)}
    >
      <div className={modalPanelClass(desktopUi, "w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden bg-[var(--app-surface)]")}>

        {/* Header cu ecuson Utilizator */}
        <div className={modalHeaderClass(desktopUi, "flex items-center justify-between px-4 py-3")}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[14px] ${desktopUi ? "app-accent-bg" : "m-modal-header-icon rounded-xl bg-gradient-to-br from-[#C98A2B] to-[#A36C1D] text-white shadow-sm"}`}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-semibold text-[15.5px] tracking-wide app-display ${desktopUi ? "text-[var(--app-text)]" : "font-bold text-white"}`}>
                  Centrul de Administrare &amp; Setări
                </h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isAdmin ? (desktopUi ? "bg-[var(--app-accent)]/15 text-[var(--app-accent)] border border-[var(--app-accent)]/40" : "bg-[#C98A2B]/20 text-[#F3D9A8] border border-[#C98A2B]/50") : (desktopUi ? "bg-[var(--app-surface-2)] text-[var(--app-muted)] border border-[var(--app-border)]" : "bg-white/10 text-white/80 border border-white/20")}`}>
                  {isAdmin ? "★ Administrator" : "Operator"}
                </span>
              </div>
              <p className={`text-[11px] ${desktopUi ? "text-[var(--app-muted)]" : "text-white/60"}`}>Conectat ca: <span className={`font-semibold ${desktopUi ? "text-[var(--app-text)]" : "text-white"}`}>{userEmail || "Neautentificat"}</span></p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${desktopUi ? "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`m-settings-tabs flex border-b px-2 pt-2 gap-1 shrink-0 overflow-x-auto scrollbar-thin ${desktopUi ? "border-[var(--app-border)] bg-[var(--app-surface-2)]" : ""}`}>
          {[
            { id: "general", label: "Parametri Generali", icon: Wrench },
            { id: "asiguratori", label: "Asigurători", icon: Building, badge: insurersList.length },
            { id: "notificari", label: "Afișare & Alerte", icon: Bell },
            { id: "profil", label: "Profil Utilizator", icon: User },
            { id: "diagnoza", label: "Diagnoză & Backup", icon: Database },
          ].map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`m-settings-tab flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition-all whitespace-nowrap shrink-0 ${
                  active ? "is-active" : ""
                } ${desktopUi && active ? "border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-surface)] rounded-t-lg" : ""} ${desktopUi && !active ? "border-transparent text-[var(--app-muted)]" : ""}`}
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

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* TAB 1: PARAMETRI GENERALI & ATELIER */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Identitate atelier / white-label */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Building size={16} className="text-[#C98A2B]" /> Identitate atelier (white-label)
                </h3>
                <p className="text-[11.5px] text-[#8A8375]">
                  Numele, inițialele și logo-ul apar în header, login, PDF și mesaje WhatsApp.
                  {isAdmin ? "" : " Doar administratorul poate salva permanent în cloud."}
                </p>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1C2127] text-white">
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
                    <label className="text-[12px] font-bold text-[#23282E]">Nume atelier</label>
                    <input
                      type="text"
                      value={atelierNume}
                      onChange={(e) => setAtelierNume(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full p-2 border border-[#DAD4C6] rounded-lg text-[13px] font-semibold bg-white disabled:opacity-60"
                      placeholder="ex. AutoService Popescu"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-[#23282E]">Inițiale (max 4)</label>
                    <input
                      type="text"
                      value={atelierShort}
                      onChange={(e) => setAtelierShort(e.target.value.slice(0, 4).toUpperCase())}
                      disabled={!isAdmin}
                      maxLength={4}
                      className="w-full p-2 border border-[#DAD4C6] rounded-lg text-[13px] font-mono font-extrabold bg-white disabled:opacity-60 uppercase"
                      placeholder="WD"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[12px] font-bold text-[#23282E]">URL logo (public)</label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        disabled={!isAdmin}
                        className="flex-1 min-w-[180px] p-2 border border-[#DAD4C6] rounded-lg text-[12px] font-semibold bg-white disabled:opacity-60"
                        placeholder="https://… sau lasă gol pentru inițiale"
                      />
                      {isAdmin && onUploadBrandingLogo && (
                        <label className="px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#DAD4C6] text-[12px] font-bold cursor-pointer hover:bg-[#EFEAE1]">
                          {uploadingLogo ? "Se încarcă…" : "Încarcă fișier"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} disabled={uploadingLogo} />
                        </label>
                      )}
                      {logoUrl && isAdmin && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="px-3 py-2 rounded-lg border border-[#DAD4C6] text-[12px] font-bold text-[#B23A2E]"
                        >
                          Șterge logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Wrench size={16} className="text-[#C98A2B]" /> Configurare Capacitate Atelier &amp; Praguri Alerte
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prag mașini neridicate */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Prag alertă mașini neridicate (zile)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      După câte zile de la finalizarea reparației se declanșează alerta pentru mașinile neridicate.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={prag}
                        onChange={(e) => setPrag(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">zile de la finalizare</span>
                    </div>
                  </div>

                  {/* NOUL PRAG: Alertă dosare fără activitate (inactivitate) */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                      <Clock size={15} className="text-[#C98A2B]" /> Prag alertă dosare fără activitate (inactivitate)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Semnalează dosarele deschise în care NU a existat nicio modificare, schimbare de status sau notă nouă timp de X zile.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        className="p-2 border border-[#DAD4C6] rounded-lg font-bold text-[13.5px] bg-white focus:border-[#C98A2B]"
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
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Capacitate maximă programări pe zi
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Limita de dosare ce pot fi programate într-o singură zi în calendarul service-ului.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={capacitate}
                        onChange={(e) => setCapacitate(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">mașini / zi</span>
                    </div>
                  </div>

                  <div className="col-span-full bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-3">
                    <div>
                      <label className="block text-[12.5px] font-bold text-[#23282E] flex items-center gap-1.5">
                        <Bell size={15} className="text-[#C98A2B]" /> Praguri alertă per stadiu (zile)
                      </label>
                      <p className="text-[11px] text-[#8A8375] mt-1">
                        După câte zile în același stadiu se declanșează alerta pe card și în Brief.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {STATUSES.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 bg-white border border-[#DAD4C6] rounded-lg px-2.5 py-1.5">
                          <span className="text-[11px] font-bold text-[#23282E] truncate" title={s.label}>
                            {s.num}. {s.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="1"
                              max="90"
                              className="w-14 p-1 border border-[#DAD4C6] rounded-md font-bold text-[13px] bg-white text-center focus:border-[#C98A2B]"
                              value={alertDaysByStatus[s.key] ?? s.alertDays ?? 3}
                              onChange={(e) =>
                                setAlertDaysByStatus((prev) => ({
                                  ...prev,
                                  [s.key]: e.target.value === "" ? "" : Number(e.target.value),
                                }))
                              }
                            />
                            <span className="text-[10px] font-bold text-[#8A8375]">z</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TVA Implicit */}
                  <div className="bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[#23282E]">
                      Cotă TVA implicită (%)
                    </label>
                    <p className="text-[11px] text-[#8A8375]">
                      Procentul de TVA aplicat automat la calculul veniturilor financiare și facturilor dosarului.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-24 p-2 border border-[#DAD4C6] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[#C98A2B]"
                        value={tvaDefault}
                        onChange={(e) => setTvaDefault(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[#6B6558]">% TVA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded-lg text-[13px] shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Salvează Parametrii
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MANAGEMENT ASIGURĂTORI */}
          {activeTab === "asiguratori" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                  <h3 className="font-bold text-[14px] text-[#23282E] flex items-center gap-2">
                    <Building size={16} className="text-[#C98A2B]" /> Nomenclator Asigurători ({insurersList.length})
                  </h3>
                  <span className="text-[11px] text-[#8A8375] font-semibold">Lista societăților de asigurare</span>
                </div>

                {/* Adăugare Asigurător Nou (doar pentru Admins) */}
                {isAdmin ? (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-[#FAF8F5] focus:bg-white"
                      placeholder="Adaugă societate de asigurare nouă (ex: SIGNAL IDUNA)..."
                      value={newInsurer}
                      onChange={(e) => setNewInsurer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInsurer(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddInsurer}
                      className="flex items-center gap-1 px-4 py-2 bg-[#3B5166] text-white rounded-lg text-[12.5px] font-bold hover:bg-[#2C4160]"
                    >
                      <Plus size={15} /> Adaugă
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-[#8A8375] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#DAD4C6]">
                    🔒 Lista societăților de asigurare este gestionată de Administrator.
                  </p>
                )}

                {/* Grilă Asigurători */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {(Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS).map((ins) => (
                    <div key={ins} className="flex items-center justify-between bg-[#FAF8F5] border border-[#DAD4C6] rounded-lg px-3 py-2 text-[12.5px]">
                      <span className="font-semibold text-[#23282E] truncate">{ins}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInsurer(ins)}
                          className="text-[#8A8375] hover:text-[#B23A2E] p-1 transition-colors"
                          title="Șterge din listă"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICĂRI & PREFERINȚE VIZUALE */}
          {activeTab === "notificari" && (
            <div className="space-y-4">
              <p className="text-[12px] text-[var(--app-muted)] px-1">
                Notificările și alertele folosesc aceleași reguli ca în modul desktop.
              </p>
            </div>
          )}

          {/* TAB 4: PROFIL UTILIZATOR & SECURITATE & GESTIONARE ECHIPĂ */}
          {activeTab === "profil" && (
            <div className="space-y-4">
              {/* Informații Cont Curent */}
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User size={16} className="text-[#C98A2B]" /> Detalii Cont &amp; Securitate
                  </span>
                  <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${isAdmin ? "bg-[#C98A2B] text-white" : "bg-[#3B5166] text-white"}`}>
                    {isAdmin ? "Rol: ADMINISTRATOR (Acces Total)" : "Rol: OPERATOR (Dosare Proprii)"}
                  </span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#8A8375] font-bold uppercase block">Adresă de e-mail conectată</span>
                      <span className="font-mono font-bold text-[14px] text-[#23282E]">{userEmail || "—"}</span>
                      <span className="text-[11.5px] text-[#6B6558] block mt-0.5">
                        {isAdmin ? "🔑 Poți edita, modifica și șterge orice dosar din sistem." : "🔒 Poți edita și șterge doar dosarele create de tine."}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#3E6B45]/15 text-[#3E6B45] font-bold text-[11px] rounded-md">
                      ✓ Cont Activ
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#23282E]">Deconectare din cont</span>
                      <span className="text-[11px] text-[#8A8375] block">Închide sesiunea curentă în condiții de siguranță</span>
                    </div>
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="px-4 py-1.5 bg-[#B23A2E] text-white text-[12px] font-bold rounded-lg hover:bg-[#922D24] transition-colors"
                      >
                        Delogare
                      </button>
                    )}
                  </div>
                </div>

                {/* Formular Schimbare Parolă Cont (Disponibil pentru toți utilizatorii) */}
                <form onSubmit={handleChangePasswordSubmit} className="p-4 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl space-y-3 pt-3">
                  <div>
                    <h4 className="font-bold text-[13px] text-[#23282E] flex items-center gap-1.5">
                      <Key size={15} className="text-[#C98A2B]" /> Schimbă Parola Contului Tău
                    </h4>
                    <p className="text-[11px] text-[#8A8375]">
                      Setează o parolă nouă confidențială după conectarea inițială.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B6558] mb-1">Parolă Nouă</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Parola nouă (min. 6 caractere)..."
                        className="w-full p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white focus:border-[#C98A2B]"
                        value={myNewPassword}
                        onChange={(e) => setMyNewPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#6B6558] mb-1">Confirmare Parolă Nouă</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Reintroduceți parola nouă..."
                        className="w-full p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white focus:border-[#C98A2B]"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingPassword || !myNewPassword}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#3B5166] hover:bg-[#2C4160] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all disabled:opacity-50"
                    >
                      <Key size={14} /> {updatingPassword ? "Se actualizează..." : "Actualizează Parola"}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTIUNE GESTIONARE UTILIZATORI (Disponibilă Exclusiv pentru Administratori) */}
              {isAdmin && (
                <div className="bg-white border border-[#C98A2B]/40 rounded-xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#DAD4C6] pb-2">
                    <div>
                      <h3 className="font-extrabold text-[14.5px] text-[#23282E] flex items-center gap-2">
                        <Shield size={17} className="text-[#C98A2B]" /> Administrare Utilizatori &amp; Permisiuni Echipa ({usersList.length})
                      </h3>
                      <p className="text-[11px] text-[#6B6558]">
                        Adaugă membri noi, setează parola inițială, oferă drepturi de Administrator sau elimină conturi din organizație
                      </p>
                    </div>
                  </div>

                {/* Formular Adăugare Utilizator Nou */}
                <form onSubmit={handleAddUserSubmit} className="bg-[#FBF3E6] border border-[#C98A2B]/30 rounded-xl p-3.5 space-y-3">
                  <h4 className="font-bold text-[13px] text-[#7A5316] flex items-center gap-1.5">
                    <Plus size={15} /> Adaugă Utilizator Nou
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="E-mail utilizator (ex: coleg@service.ro)..."
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-medium focus:border-[#C98A2B]"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />

                    <select
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-bold text-[#23282E] focus:border-[#C98A2B]"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="operator">Operator (Doar dosare proprii)</option>
                      <option value="admin">★ Administrator (Acces total)</option>
                    </select>

                    <input
                      type="password"
                      placeholder="Parolă inițială (opțional)..."
                      className="p-2 border border-[#DAD4C6] rounded-lg text-[13px] bg-white font-medium focus:border-[#C98A2B]"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#C98A2B] hover:bg-[#B37A22] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={15} /> {creatingUser ? "Se adaugă..." : "Adaugă Utilizator"}
                    </button>
                  </div>
                </form>

                {/* Lista Utilizatori Existenți */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-[12.5px] text-[#23282E]">Membri Înregistrați ({usersList.length}):</h4>
                  {usersList.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-[#8A8375] bg-[#FAF8F5] rounded-xl border border-[#DAD4C6]">
                      Niciun utilizator suplimentar configurat încă.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EFEAE1] border border-[#DAD4C6] rounded-xl overflow-hidden bg-white">
                      {usersList.map((u) => {
                        const isCurrent = u.email?.toLowerCase() === userEmail?.toLowerCase();
                        const isUserAdmin = u.role === "admin";

                        return (
                          <div key={u.email} className="p-3 flex items-center justify-between gap-2 hover:bg-[#FCFAF5]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white ${isUserAdmin ? "bg-[#C98A2B]" : "bg-[#3B5166]"}`}>
                                {u.email ? u.email.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[13px] text-[#23282E]">{u.email}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[#EFEAE1] text-[#3B5166]">
                                      Tu (Cont Curent)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#8A8375] block">
                                  Rol: <strong className={isUserAdmin ? "text-[#C98A2B]" : "text-[#3B5166]"}>{isUserAdmin ? "Administrator (Editare toate dosarele)" : "Operator (Editează doar propriile dosare)"}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Schimbare rol Admin / Operator */}
                              {onToggleAdminRole && (
                                <button
                                  type="button"
                                  onClick={() => onToggleAdminRole(u.email)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border transition-colors ${
                                    isUserAdmin
                                      ? "bg-[#EEF1F3] text-[#3B5166] border-[#DAD4C6] hover:bg-gray-200"
                                      : "bg-[#FBF3E6] text-[#7A5316] border-[#C98A2B]/40 hover:bg-[#F3D9A8]"
                                  }`}
                                  title={isUserAdmin ? "Retrogradează la Operator" : "Promovează în Administrator"}
                                >
                                  <Key size={13} />
                                  <span>{isUserAdmin ? "Devino Operator" : "★ Fă Administrator"}</span>
                                </button>
                              )}

                              {/* Ștergere utilizator */}
                              {onDeleteUser && (
                                <button
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => onDeleteUser(u.email)}
                                  className="p-1.5 text-[#8A8375] hover:text-[#B23A2E] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  title={isCurrent ? "Nu te poți șterge pe tine însuți" : "Șterge utilizator"}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
              )}
            </div>
          )}

          {/* TAB 5: DIAGNOZĂ & BACKUP DATA */}
          {activeTab === "diagnoza" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DAD4C6] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[#23282E] border-b border-[#DAD4C6] pb-2 flex items-center gap-2">
                  <Database size={16} className="text-[#3B5166]" /> Diagnostic Sistem &amp; Stocare Cloud
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Total Dosare</span>
                    <span className="block font-extrabold text-[20px] text-[#23282E]">{claims.length}</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Fotografii Salvate</span>
                    <span className="block font-extrabold text-[20px] text-[#C98A2B]">{totalPoze}</span>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#DAD4C6] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[#8A8375]">Documente Atașate</span>
                    <span className="block font-extrabold text-[20px] text-[#3B5166]">{totalDocumente}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DAD4C6]">
                  <h4 className="font-bold text-[13px] text-[#23282E] mb-1">Export &amp; Salvgardare Date (Backup)</h4>
                  <p className="text-[11px] text-[#8A8375] mb-3">
                    Descarcă o copie de siguranță completă a tuturor dosarelor și istoricului din aplicație în format JSON.
                  </p>
                  <button
                    type="button"
                    onClick={exportFullBackupJSON}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#2C4160] text-white text-[12.5px] font-bold rounded-lg hover:bg-[#1E2D44] transition-colors"
                  >
                    <Download size={15} /> Descarcă Backup Complet (.json)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[#DAD4C6] shrink-0 text-[12px]">
          <span className="text-[#8A8375]">{atelierNume || "Workflow Dosare"} · setări v1.5</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#C7C0B0] font-semibold text-[#4A443A] hover:bg-[#EFEAE1]"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
