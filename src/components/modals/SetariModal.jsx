import React, { useState, useMemo, useEffect } from "react";
import {
  X, Settings, User, Building, Database, Bell, Wrench, Download,
  CheckCircle2, Plus, Trash2, Key, Sliders, Shield, RefreshCw, Car, ChevronRight, Clock,
  Sun, Moon,
} from "lucide-react";
import { INSURERS, STATUSES } from "../../constants/config";
import { ROLE_OPTIONS, ROLES, normalizeRole } from "../../constants/roles";
import * as XLSX from "xlsx";
import { todayISO } from "../../utils/dateUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
  modalHeaderClass,
} from "../common/modalShellClasses";
import {
  loadThemePreference,
  saveThemePreference,
  THEME_PREF_EVENT,
} from "../../utils/themePrefs";
import ConfirmDialog from "../common/ConfirmDialog";
import AppButton from "../common/AppButton";
import { BILLING_PLANS, normalizeBilling } from "../../constants/billing";
import { fmtDate } from "../../utils/dateUtils";

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
  billing = null,
  onSaveBilling = null,
  tenancyReady = false,
}) {
  const billingView = useMemo(
    () =>
      billing ||
      normalizeBilling({
        memberCount: usersList.length,
        seatLimit: 10,
        plan: "trial",
      }),
    [billing, usersList.length]
  );
  const [planDraft, setPlanDraft] = useState(billingView.plan === "past_due" ? "trial" : billingView.plan);
  const [seatDraft, setSeatDraft] = useState(billingView.seatLimit);
  const [savingBilling, setSavingBilling] = useState(false);

  useEffect(() => {
    setPlanDraft(billingView.plan === "past_due" ? "trial" : billingView.plan);
    setSeatDraft(billingView.seatLimit);
  }, [billingView.plan, billingView.seatLimit]);
  const [settingsSection, setSettingsSection] = useState("atelier"); // "atelier" | "cont"
  const [activeTab, setActiveTab] = useState("general"); // "general" | "asiguratori" | "notificari" | "profil" | "diagnoza"
  const [pendingDeleteEmail, setPendingDeleteEmail] = useState(null);

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
  const [themePref, setThemePref] = useState(() => loadThemePreference());

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
    const onThemeChange = () => setThemePref(loadThemePreference());
    window.addEventListener(THEME_PREF_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_PREF_EVENT, onThemeChange);
  }, []);

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
  const [newUserRole, setNewUserRole] = useState("receptioner");
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

  const handleSaveBilling = async (e) => {
    e.preventDefault();
    if (!onSaveBilling || !isAdmin) return;
    setSavingBilling(true);
    try {
      const ok = await onSaveBilling({
        plan: planDraft,
        seatLimit: Number(seatDraft) || 10,
        trialEndsAt: billingView.trialEndsAt,
      });
      if (ok !== false) onNotify("Plan atelier actualizat.", "success");
    } finally {
      setSavingBilling(false);
    }
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
    if (!billingView.canInvite) {
      onNotify(
        billingView.overSeatLimit
          ? `Limita de locuri (${billingView.seatLimit}) e atinsă. Mărește seat limit sau scoate un membru.`
          : "Planul curent nu permite invitații noi.",
        "error"
      );
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
      <div
        className={modalPanelClass(
          desktopUi,
          // Fixed height — Parametri/Asigurători/… tabs don't resize the shell
          "app-fixed-shell-modal w-full max-w-4xl flex flex-col h-full sm:h-[92vh] sm:max-h-[92vh] overflow-hidden bg-[var(--app-surface)]"
        )}
      >

        {/* Header — doar desktop; pe mobil rămâne bara de taburi rotunjită */}
        {desktopUi ? (
          <div className={modalHeaderClass(desktopUi, "flex items-center justify-between px-4 py-3")}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[14px] app-accent-bg">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[15.5px] tracking-wide app-display text-[var(--app-text)]">
                    Centrul de Administrare &amp; Setări
                  </h2>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isAdmin ? "bg-[var(--app-accent)]/15 text-[var(--app-accent)] border border-[var(--app-accent)]/40" : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border border-[var(--app-border)]"}`}>
                    {isAdmin ? "Administrator" : "Operator"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--app-muted)]">Conectat ca: <span className="font-semibold text-[var(--app-text)]">{userEmail || "Neautentificat"}</span></p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]">
              <X size={20} />
            </button>
          </div>
        ) : null}

        {/* Atelier vs Cont — then atelier subtabs */}
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
            <button
              type="button"
              onClick={onClose}
              className="ml-auto shrink-0 p-2 rounded-full text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface-muted)]"
              aria-label="Închide setările"
            >
              <X size={18} />
            </button>
          </div>

          {settingsSection === "atelier" ? (
            <div className="m-settings-tabs m-settings-tabs--pill flex overflow-x-auto scrollbar-thin pb-2">
              {[
                { id: "general", label: desktopUi ? "Parametri" : "Parametri", icon: Wrench },
                { id: "asiguratori", label: "Asigurători", icon: Building, badge: insurersList.length },
                { id: "notificari", label: desktopUi ? "Afișare" : "Afișare", icon: Bell },
                { id: "diagnoza", label: "Backup", icon: Database },
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

        {/* Content Body — sole scroll region across settings tabs */}
        <div className="app-fixed-shell-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-5 space-y-4">

          {/* TAB 1: PARAMETRI GENERALI & ATELIER */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Identitate atelier / white-label */}
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-4">
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
                      className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] font-semibold bg-white disabled:opacity-60"
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
                      maxLength={4}
                      className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] font-mono font-extrabold bg-white disabled:opacity-60 uppercase"
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
                        className="flex-1 min-w-[180px] p-2 border border-[var(--app-border)] rounded-lg text-[12px] font-semibold bg-white disabled:opacity-60"
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

              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-4">
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
                        className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[var(--app-accent)]"
                        value={prag}
                        onChange={(e) => setPrag(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[var(--app-muted)]">zile de la finalizare</span>
                    </div>
                  </div>

                  {/* NOUL PRAG: Alertă dosare fără activitate (inactivitate) */}
                  <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-3.5 space-y-2">
                    <label className="block text-[12.5px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                      <Clock size={15} className="text-[var(--app-accent)]" /> Prag alertă dosare fără activitate (inactivitate)
                    </label>
                    <p className="text-[11px] text-[var(--app-muted)]">
                      Semnalează dosarele deschise în care NU a existat nicio modificare, schimbare de status sau notă nouă timp de X zile.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        className="p-2 border border-[var(--app-border)] rounded-lg font-bold text-[13.5px] bg-white focus:border-[var(--app-accent)]"
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
                        className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[var(--app-accent)]"
                        value={capacitate}
                        onChange={(e) => setCapacitate(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[var(--app-muted)]">mașini / zi</span>
                    </div>
                  </div>

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
                        <div key={s.key} className="flex items-center justify-between gap-2 bg-white border border-[var(--app-border)] rounded-lg px-2.5 py-1.5">
                          <span className="text-[11px] font-bold text-[var(--app-text-strong)] truncate" title={s.label}>
                            {s.num}. {s.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="1"
                              max="90"
                              className="w-14 p-1 border border-[var(--app-border)] rounded-md font-bold text-[13px] bg-white text-center focus:border-[var(--app-accent)]"
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
                        className="w-24 p-2 border border-[var(--app-border)] rounded-lg font-bold text-[15px] bg-white text-center focus:border-[var(--app-accent)]"
                        value={tvaDefault}
                        onChange={(e) => setTvaDefault(e.target.value)}
                      />
                      <span className="text-[12.5px] font-bold text-[var(--app-muted)]">% TVA</span>
                    </div>
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
          )}

          {/* TAB 2: MANAGEMENT ASIGURĂTORI */}
          {activeTab === "asiguratori" && (
            <div className="space-y-4">
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
                  <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] flex items-center gap-2">
                    <Building size={16} className="text-[var(--app-accent)]" /> Nomenclator Asigurători ({insurersList.length})
                  </h3>
                  <span className="text-[11px] text-[var(--app-muted)] font-semibold">Lista societăților de asigurare</span>
                </div>

                {/* Adăugare Asigurător Nou (doar pentru Admins) */}
                {isAdmin ? (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface-2)] focus:bg-white"
                      placeholder="Adaugă societate de asigurare nouă (ex: SIGNAL IDUNA)..."
                      value={newInsurer}
                      onChange={(e) => setNewInsurer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInsurer(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddInsurer}
                      className="flex items-center gap-1 px-4 py-2 bg-[var(--app-muted)] text-white rounded-lg text-[12.5px] font-bold hover:bg-[var(--app-text)]"
                    >
                      <Plus size={15} /> Adaugă
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-[var(--app-muted)] bg-[var(--app-surface-2)] p-2.5 rounded-lg border border-[var(--app-border)]">
                    Lista societăților de asigurare este gestionată de Administrator.
                  </p>
                )}

                {/* Grilă Asigurători */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  {(Array.isArray(insurersList) && insurersList.length > 0 ? insurersList : INSURERS).map((ins) => (
                    <div key={ins} className="flex items-center justify-between bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-lg px-3 py-2 text-[12.5px]">
                      <span className="font-semibold text-[var(--app-text-strong)] truncate">{ins}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInsurer(ins)}
                          className="text-[var(--app-muted)] hover:text-[var(--app-danger)] p-1 transition-colors"
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
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3">
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
                        onClick={() => {
                          saveThemePreference(id);
                          setThemePref(id);
                        }}
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
          )}

          {/* TAB 4: PROFIL UTILIZATOR & SECURITATE & GESTIONARE ECHIPĂ */}
          {activeTab === "profil" && (
            <div className="space-y-4">
              {/* Billing stub */}
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
                  <Shield size={16} className="text-[var(--app-accent)]" /> Plan atelier
                </h3>
                <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
                  Stub billing — fără Stripe încă. {tenancyReady ? "Multi-tenant activ (migrare 29)." : "Rulează migrarea 29 pentru izolare pe atelier."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Plan</div>
                    <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">{billingView.planMeta.label}</div>
                  </div>
                  <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2">
                    <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Locuri</div>
                    <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">
                      {billingView.memberCount}/{billingView.seatLimit}
                    </div>
                  </div>
                  <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2 col-span-2">
                    <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Trial până la</div>
                    <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">
                      {billingView.trialEndsAt ? fmtDate(billingView.trialEndsAt) : "—"}
                    </div>
                  </div>
                </div>
                {isAdmin && onSaveBilling ? (
                  <form onSubmit={handleSaveBilling} className="flex flex-wrap items-end gap-2 pt-1">
                    <label className="text-[11px] font-bold text-[var(--app-muted)]">
                      Plan
                      <select
                        className="mt-1 block p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white min-w-[140px]"
                        value={planDraft}
                        onChange={(e) => setPlanDraft(e.target.value)}
                      >
                        {Object.values(BILLING_PLANS).map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-bold text-[var(--app-muted)]">
                      Seat limit
                      <input
                        type="number"
                        min={1}
                        max={200}
                        className="mt-1 block p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white w-24"
                        value={seatDraft}
                        onChange={(e) => setSeatDraft(e.target.value)}
                      />
                    </label>
                    <AppButton type="submit" variant="secondary" disabled={savingBilling}>
                      {savingBilling ? "…" : "Salvează plan"}
                    </AppButton>
                  </form>
                ) : null}
              </div>

              {/* Informații Cont Curent */}
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User size={16} className="text-[var(--app-accent)]" /> Detalii Cont &amp; Securitate
                  </span>
                  <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${isAdmin ? "bg-[var(--app-accent)] text-white" : "bg-[var(--app-muted)] text-white"}`}>
                    {isAdmin ? "Rol: ADMINISTRATOR (Acces Total)" : "Rol: OPERATOR (Dosare Proprii)"}
                  </span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[var(--app-muted)] font-bold uppercase block">Adresă de e-mail conectată</span>
                      <span className="font-mono font-bold text-[14px] text-[var(--app-text-strong)]">{userEmail || "—"}</span>
                      <span className="text-[11.5px] text-[var(--app-muted)] block mt-0.5">
                        {isAdmin ? "Poți edita, modifica și șterge orice dosar din sistem." : "Poți edita și șterge doar dosarele create de tine."}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[var(--app-success)]/15 text-[var(--app-success)] font-bold text-[11px] rounded-md">
                      ✓ Cont Activ
                    </span>
                  </div>

                  <div className="p-3.5 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[var(--app-text-strong)]">Deconectare din cont</span>
                      <span className="text-[11px] text-[var(--app-muted)] block">Închide sesiunea curentă în condiții de siguranță</span>
                    </div>
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="px-4 py-1.5 bg-[var(--app-danger)] text-white text-[12px] font-bold rounded-lg hover:bg-[#922D24] transition-colors"
                      >
                        Delogare
                      </button>
                    )}
                  </div>
                </div>

                {/* Formular Schimbare Parolă Cont (Disponibil pentru toți utilizatorii) */}
                <form onSubmit={handleChangePasswordSubmit} className="p-4 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl space-y-3 pt-3">
                  <div>
                    <h4 className="font-bold text-[13px] text-[var(--app-text-strong)] flex items-center gap-1.5">
                      <Key size={15} className="text-[var(--app-accent)]" /> Schimbă Parola Contului Tău
                    </h4>
                    <p className="text-[11px] text-[var(--app-muted)]">
                      Setează o parolă nouă confidențială după conectarea inițială.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1">Parolă Nouă</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Parola nouă (min. 6 caractere)..."
                        className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white focus:border-[var(--app-accent)]"
                        value={myNewPassword}
                        onChange={(e) => setMyNewPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--app-muted)] mb-1">Confirmare Parolă Nouă</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Reintroduceți parola nouă..."
                        className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white focus:border-[var(--app-accent)]"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingPassword || !myNewPassword}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-muted)] hover:bg-[var(--app-text)] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all disabled:opacity-50"
                    >
                      <Key size={14} /> {updatingPassword ? "Se actualizează..." : "Actualizează Parola"}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTIUNE GESTIONARE UTILIZATORI (Disponibilă Exclusiv pentru Administratori) */}
              {isAdmin && (
                <div className="bg-white border border-[var(--app-accent)]/40 rounded-xl p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2">
                    <div>
                      <h3 className="font-extrabold text-[14.5px] text-[var(--app-text-strong)] flex items-center gap-2">
                        <Shield size={17} className="text-[var(--app-accent)]" /> Administrare Utilizatori &amp; Permisiuni Echipa ({usersList.length})
                      </h3>
                      <p className="text-[11px] text-[var(--app-muted)]">
                        Invită colegi cu rol clar. Trimite-le emailul + parola inițială; pot reseta parola din „Am uitat parola” la login.
                      </p>
                    </div>
                  </div>

                {/* Formular Adăugare Utilizator Nou */}
                {!billingView.canInvite ? (
                  <div className="text-[12px] text-[var(--app-danger)] bg-[var(--app-danger)]/10 border border-[var(--app-danger)]/30 rounded-lg px-3 py-2">
                    {billingView.overSeatLimit
                      ? `Nu mai poți invita — ${billingView.memberCount}/${billingView.seatLimit} locuri ocupate.`
                      : "Planul curent blochează invitațiile noi."}
                  </div>
                ) : null}

                <form onSubmit={handleAddUserSubmit} className="bg-[var(--app-warning-muted)] border border-[var(--app-accent)]/30 rounded-xl p-3.5 space-y-3">
                  <h4 className="font-bold text-[13px] text-[var(--app-warning)] flex items-center gap-1.5">
                    <Plus size={15} /> Invită utilizator
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="E-mail (ex: coleg@service.ro)"
                      className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white font-medium focus:border-[var(--app-accent)]"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />

                    <select
                      className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white font-bold text-[var(--app-text-strong)] focus:border-[var(--app-accent)]"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      title={ROLES[normalizeRole(newUserRole)]?.description}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="password"
                      required
                      placeholder="Parolă inițială (min. 6)"
                      className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-white font-medium focus:border-[var(--app-accent)]"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>

                  <p className="text-[11px] text-[var(--app-muted)] leading-relaxed">
                    {ROLES[normalizeRole(newUserRole)]?.description || ""}
                    {" "}Partajează datele de login pe un canal sigur.
                  </p>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingUser || !billingView.canInvite}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white font-bold rounded-lg text-[12.5px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={15} /> {creatingUser ? "Se invită..." : "Creează invitație"}
                    </button>
                  </div>
                </form>

                {/* Lista Utilizatori Existenți */}
                <div className="space-y-2 pt-1">
                  <h4 className="font-bold text-[12.5px] text-[var(--app-text-strong)]">Membri Înregistrați ({usersList.length}):</h4>
                  {usersList.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-[var(--app-muted)] bg-[var(--app-surface-2)] rounded-xl border border-[var(--app-border)]">
                      Niciun utilizator suplimentar configurat încă.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--app-border-soft)] border border-[var(--app-border)] rounded-xl overflow-hidden bg-white">
                      {usersList.map((u) => {
                        const isCurrent = u.email?.toLowerCase() === userEmail?.toLowerCase();
                        const isUserAdmin = u.role === "admin";

                        return (
                          <div key={u.email} className="p-3 flex items-center justify-between gap-2 hover:bg-[var(--app-surface-2)]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] text-white ${isUserAdmin ? "bg-[var(--app-accent)]" : "bg-[var(--app-muted)]"}`}>
                                {u.email ? u.email.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[13px] text-[var(--app-text-strong)]">{u.email}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[var(--app-border-soft)] text-[var(--app-muted)]">
                                      Tu (Cont Curent)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[var(--app-muted)] block">
                                  Rol: <strong className={isUserAdmin ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]"}>{isUserAdmin ? "Administrator (Editare toate dosarele)" : "Operator (Editează doar propriile dosare)"}</strong>
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
                                      ? "bg-[var(--app-surface-muted)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-gray-200"
                                      : "bg-[var(--app-warning-muted)] text-[var(--app-warning)] border-[var(--app-accent)]/40 hover:bg-[#F3D9A8]"
                                  }`}
                                  title={isUserAdmin ? "Retrogradează la Operator" : "Promovează în Administrator"}
                                >
                                  <Key size={13} />
                                  <span>{isUserAdmin ? "Devino Operator" : "Fă Administrator"}</span>
                                </button>
                              )}

                              {/* Ștergere utilizator */}
                              {onDeleteUser && (
                                <button
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => setPendingDeleteEmail(u.email)}
                                  className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-danger)] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
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
              <div className="bg-white border border-[var(--app-border)] rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
                  <Database size={16} className="text-[var(--app-muted)]" /> Diagnostic Sistem &amp; Stocare Cloud
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Total Dosare</span>
                    <span className="block font-extrabold text-[20px] text-[var(--app-text-strong)]">{claims.length}</span>
                  </div>

                  <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Fotografii Salvate</span>
                    <span className="block font-extrabold text-[20px] text-[var(--app-accent)]">{totalPoze}</span>
                  </div>

                  <div className="p-3 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Documente Atașate</span>
                    <span className="block font-extrabold text-[20px] text-[var(--app-muted)]">{totalDocumente}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--app-border)]">
                  <h4 className="font-bold text-[13px] text-[var(--app-text-strong)] mb-1">Export &amp; Salvgardare Date (Backup)</h4>
                  <p className="text-[11px] text-[var(--app-muted)] mb-3">
                    Descarcă o copie de siguranță completă a tuturor dosarelor și istoricului din aplicație în format JSON.
                  </p>
                  <button
                    type="button"
                    onClick={exportFullBackupJSON}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-text)] text-white text-[12.5px] font-bold rounded-lg hover:bg-[#1E2D44] transition-colors"
                  >
                    <Download size={15} /> Descarcă Backup Complet (.json)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-[var(--app-border)] shrink-0 text-[12px]">
          <span className="text-[var(--app-muted)]">{atelierNume || "Workflow Dosare"} · setări</span>
          <AppButton variant="secondary" onClick={onClose}>
            Închide
          </AppButton>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteEmail)}
        desktopUi={desktopUi}
        title="Șterge utilizatorul?"
        message={`„${pendingDeleteEmail}" va fi scos din echipă. Contul Auth poate rămâne — nu se poate reconecta în app fără a fi reinvitat.`}
        confirmLabel="Șterge"
        danger
        onCancel={() => setPendingDeleteEmail(null)}
        onConfirm={async () => {
          const email = pendingDeleteEmail;
          setPendingDeleteEmail(null);
          if (email && onDeleteUser) await onDeleteUser(email);
        }}
      />
    </div>
  );
}
