import React, { useState, useMemo, useEffect, useCallback } from "react";
import { INSURERS, STATUSES } from "../../constants/config";
import { todayISO } from "../../utils/dateUtils";
import {
  modalOverlayClass,
  modalOverlayProps,
  modalPanelClass,
} from "../common/modalShellClasses";
import {
  loadThemePreference,
  THEME_PREF_EVENT,
} from "../../utils/themePrefs";
import ConfirmDialog from "../common/ConfirmDialog";
import AppButton from "../common/AppButton";
import { normalizeBilling } from "../../constants/billing";
import { supabase } from "../../supabaseClient";
import { downloadAtelierGdprExport, wipeAtelierDosare } from "../../utils/gdprExport";
import { useModalEscape, overlayBackdropCloseProps } from "../../hooks/useModalEscape";
import { normalizeManoperaTarife, DEFAULT_MANOPERA_TARIFE } from "../../constants/manoperaTarife";

// Sub-components
import SettingsHeader from "./settings/SettingsHeader";
import SettingsNav from "./settings/SettingsNav";
import SettingsGeneralTab from "./settings/SettingsGeneralTab";
import SettingsInsurersTab from "./settings/SettingsInsurersTab";
import SettingsAiTab from "./settings/SettingsAiTab";
import SettingsAppearanceTab from "./settings/SettingsAppearanceTab";
import SettingsBackupTab from "./settings/SettingsBackupTab";
import SettingsGdprTab from "./settings/SettingsGdprTab";
import SettingsAccountTab from "./settings/SettingsAccountTab";

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
  manoperaTarife: manoperaTarifeProp = null,
  onSaveManoperaTarife = null,
  tenancyReady = false,
  atelierId = null,
  atelierSlug = null,
  onStripeCheckout = null,
  onStripePortal = null,
  onDataChanged = null,
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
  const [seatDraft, setSeatDraft] = useState(billingView.seatLimit);
  const [savingBilling, setSavingBilling] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);

  useEffect(() => {
    setSeatDraft(billingView.seatLimit);
  }, [billingView.seatLimit]);

  const [settingsSection, setSettingsSection] = useState("atelier"); // "atelier" | "cont"
  const [activeTab, setActiveTab] = useState("general"); // "general" | "asiguratori" | "notificari" | "profil" | "diagnoza" | "date" | "ai"
  const [pendingDeleteEmail, setPendingDeleteEmail] = useState(null);
  const [geminiApiKeySetting, setGeminiApiKeySetting] = useState(() => localStorage.getItem("gemini_api_key") || "");

  const clearPendingDelete = useCallback(() => setPendingDeleteEmail(null), []);
  const ignoreSettingsEscape = useCallback(() => Boolean(pendingDeleteEmail), [pendingDeleteEmail]);
  useModalEscape(onClose, {
    ignore: ignoreSettingsEscape,
    onIgnored: clearPendingDelete,
  });
  const backdropProps = overlayBackdropCloseProps(desktopUi, onClose);
  const [gdprExporting, setGdprExporting] = useState(false);
  const [wipeSlugConfirm, setWipeSlugConfirm] = useState("");
  const [wipeBusy, setWipeBusy] = useState(false);

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
  const [manoperaTarifeDraft, setManoperaTarifeDraft] = useState(() =>
    normalizeManoperaTarife(manoperaTarifeProp || DEFAULT_MANOPERA_TARIFE)
  );
  const [insurersList, setInsurersList] = useState(initialInsurersList);
  const [newInsurer, setNewInsurer] = useState("");
  const [saving, setSaving] = useState(false);
  const [atelierNume, setAtelierNume] = useState(brandingProp?.atelierNume || "Dosare Daună");
  const [atelierShort, setAtelierShort] = useState(brandingProp?.atelierShort || "WD");
  const [logoUrl, setLogoUrl] = useState(brandingProp?.logoUrl || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [themePref, setThemePref] = useState(() => loadThemePreference());
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("receptioner");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [myNewPassword, setMyNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (manoperaTarifeProp) {
      setManoperaTarifeDraft(normalizeManoperaTarife(manoperaTarifeProp));
    }
  }, [manoperaTarifeProp]);

  useEffect(() => {
    if (initialInsurersList && initialInsurersList.length > 0) {
      setInsurersList(initialInsurersList);
    }
  }, [initialInsurersList]);

  const brandingNume = brandingProp?.atelierNume;
  const brandingShort = brandingProp?.atelierShort;
  const brandingLogo = brandingProp?.logoUrl;
  useEffect(() => {
    if (brandingNume == null && brandingShort == null && brandingLogo == null) return;
    setAtelierNume(brandingNume || "Dosare Daună");
    setAtelierShort(brandingShort || "WD");
    setLogoUrl(brandingLogo || "");
  }, [brandingNume, brandingShort, brandingLogo]);

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

  // Statistics
  const totalPoze = useMemo(() => claims.reduce((acc, c) => acc + (c.poze?.length || 0), 0), [claims]);
  const totalDocumente = useMemo(() => claims.reduce((acc, c) => acc + (c.documente?.length || 0), 0), [claims]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      onNotify("Doar administratorul poate salva setările atelierului.", "error");
      return;
    }
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
      if (onSaveManoperaTarife) {
        await onSaveManoperaTarife(manoperaTarifeDraft);
      }
      if (onSaveBranding) {
        const ok = await onSaveBranding({
          atelierNume,
          atelierShort,
          logoUrl,
        });
        if (ok === false) {
          onNotify(
            "Branding-ul nu s-a putut salva. Verifică rolul de admin, migrarea 37 sau edge function update-atelier-settings.",
            "error"
          );
          return;
        }
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
    if (!isAdmin) {
      onNotify("Doar administratorul poate descărca backup-ul.", "error");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(claims, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup-workflow-dosare-${todayISO()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify("Backup-ul JSON al dosarelor a fost descărcat.", "success");
  };

  const handleGdprExport = async () => {
    if (!isAdmin) {
      onNotify("Doar administratorul poate exporta datele GDPR.", "error");
      return;
    }
    if (!atelierId) {
      onNotify("Selectează un atelier activ, apoi reîncearcă.", "warning");
      return;
    }
    setGdprExporting(true);
    try {
      const { filename, summary } = await downloadAtelierGdprExport(supabase, atelierId, {
        slug: atelierSlug || brandingProp?.atelierShort,
      });
      onNotify(
        `Export GDPR descărcat (${filename}): ${summary.dosare} dosare, ${summary.membri} membri, ${summary.arhiva} arhivate.`,
        "success"
      );
    } catch (err) {
      onNotify(err?.message || "Export GDPR eșuat. Rulează migrarea 34 în Supabase.", "error");
    } finally {
      setGdprExporting(false);
    }
  };

  const handleWipeAtelier = async () => {
    if (!isAdmin || !atelierId) return;
    setWipeBusy(true);
    try {
      const result = await wipeAtelierDosare(supabase, atelierId, wipeSlugConfirm);
      setWipeSlugConfirm("");
      onNotify(
        `Date șterse: ${result?.dosare_sterse ?? 0} dosare (arhivate + fișiere Storage curățate).`,
        "success"
      );
      if (typeof onDataChanged === "function") await onDataChanged();
    } catch (err) {
      onNotify(err?.message || "Ștergerea a eșuat. Rulează migrarea 34.", "error");
    } finally {
      setWipeBusy(false);
    }
  };

  const handleSaveSeats = async (e) => {
    e.preventDefault();
    if (!onSaveBilling || !isAdmin) return;
    setSavingBilling(true);
    try {
      const ok = await onSaveBilling({
        plan: billingView.plan === "past_due" ? "trial" : billingView.plan,
        seatLimit: Number(seatDraft) || 10,
        trialEndsAt: billingView.trialEndsAt,
      });
      if (ok !== false) onNotify("Limita de locuri actualizată.", "success");
    } finally {
      setSavingBilling(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!onStripeCheckout || !atelierId) {
      onNotify("Configurează Stripe (create-checkout-session) sau rulează migrarea 29.", "warning");
      return;
    }
    setStripeBusy(true);
    try {
      await onStripeCheckout(atelierId);
    } catch (err) {
      onNotify(err?.message || "Nu am putut deschide Checkout.", "error");
    } finally {
      setStripeBusy(false);
    }
  };

  const handleStripePortal = async () => {
    if (!onStripePortal || !atelierId) return;
    setStripeBusy(true);
    try {
      await onStripePortal(atelierId);
    } catch (err) {
      onNotify(err?.message || "Nu am putut deschide portalul de facturare.", "error");
    } finally {
      setStripeBusy(false);
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
      {...backdropProps}
    >
      <div
        className={modalPanelClass(
          desktopUi,
          "app-fixed-shell-modal w-full max-w-4xl flex flex-col h-full sm:h-[92vh] sm:max-h-[92vh] overflow-hidden bg-[var(--app-surface)]"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header — doar desktop */}
        <SettingsHeader
          desktopUi={desktopUi}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onClose={onClose}
        />

        {/* Atelier vs Cont navigation */}
        <SettingsNav
          desktopUi={desktopUi}
          settingsSection={settingsSection}
          setSettingsSection={setSettingsSection}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          insurersCount={insurersList.length}
          onClose={onClose}
        />

        {/* Content Body */}
        <div className="app-fixed-shell-body flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-5 space-y-4">
          {/* TAB 1: PARAMETRI GENERALI & ATELIER */}
          {activeTab === "general" && (
            <SettingsGeneralTab
              isAdmin={isAdmin}
              handleSaveConfig={handleSaveConfig}
              saving={saving}
              atelierNume={atelierNume}
              setAtelierNume={setAtelierNume}
              atelierShort={atelierShort}
              setAtelierShort={setAtelierShort}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              uploadingLogo={uploadingLogo}
              handleLogoFile={handleLogoFile}
              onUploadBrandingLogo={onUploadBrandingLogo}
              prag={prag}
              setPrag={setPrag}
              inactivitateDays={inactivitateDays}
              setInactivitateDays={setInactivitateDays}
              capacitate={capacitate}
              setCapacitate={setCapacitate}
              alertDaysByStatus={alertDaysByStatus}
              setAlertDaysByStatus={setAlertDaysByStatus}
              tvaDefault={tvaDefault}
              setTvaDefault={setTvaDefault}
              manoperaTarifeDraft={manoperaTarifeDraft}
              setManoperaTarifeDraft={setManoperaTarifeDraft}
            />
          )}

          {/* TAB 2: MANAGEMENT ASIGURĂTORI */}
          {activeTab === "asiguratori" && (
            <SettingsInsurersTab
              isAdmin={isAdmin}
              insurersList={insurersList}
              newInsurer={newInsurer}
              setNewInsurer={setNewInsurer}
              handleAddInsurer={handleAddInsurer}
              handleRemoveInsurer={handleRemoveInsurer}
            />
          )}

          {/* TAB 3: AGENT AI */}
          {activeTab === "ai" && (
            <SettingsAiTab
              geminiApiKeySetting={geminiApiKeySetting}
              setGeminiApiKeySetting={setGeminiApiKeySetting}
              onNotify={onNotify}
            />
          )}

          {/* TAB 4: NOTIFICĂRI & PREFERINȚE VIZUALE */}
          {activeTab === "notificari" && (
            <SettingsAppearanceTab
              themePref={themePref}
              setThemePref={setThemePref}
            />
          )}

          {/* TAB 5: PROFIL UTILIZATOR & SECURITATE & GESTIONARE ECHIPĂ */}
          {activeTab === "profil" && (
            <SettingsAccountTab
              userEmail={userEmail}
              isAdmin={isAdmin}
              onSignOut={onSignOut}
              myNewPassword={myNewPassword}
              setMyNewPassword={setMyNewPassword}
              confirmNewPassword={confirmNewPassword}
              setConfirmNewPassword={setConfirmNewPassword}
              updatingPassword={updatingPassword}
              handleChangePasswordSubmit={handleChangePasswordSubmit}
              usersList={usersList}
              newUserEmail={newUserEmail}
              setNewUserEmail={setNewUserEmail}
              newUserRole={newUserRole}
              setNewUserRole={setNewUserRole}
              newUserPassword={newUserPassword}
              setNewUserPassword={setNewUserPassword}
              creatingUser={creatingUser}
              handleAddUserSubmit={handleAddUserSubmit}
              onToggleAdminRole={onToggleAdminRole}
              setPendingDeleteEmail={setPendingDeleteEmail}
              billingView={billingView}
              tenancyReady={tenancyReady}
              atelierId={atelierId}
              stripeBusy={stripeBusy}
              handleStripeCheckout={handleStripeCheckout}
              handleStripePortal={handleStripePortal}
              seatDraft={seatDraft}
              setSeatDraft={setSeatDraft}
              savingBilling={savingBilling}
              handleSaveSeats={handleSaveSeats}
              onSaveBilling={onSaveBilling}
            />
          )}

          {/* TAB 6: DIAGNOZĂ & BACKUP DATA */}
          {activeTab === "diagnoza" && (
            <SettingsBackupTab
              isAdmin={isAdmin}
              claims={claims}
              totalPoze={totalPoze}
              totalDocumente={totalDocumente}
              exportFullBackupJSON={exportFullBackupJSON}
            />
          )}

          {/* TAB 7: DATE & CONFIDENȚIALITATE */}
          {activeTab === "date" && (
            <SettingsGdprTab
              isAdmin={isAdmin}
              atelierId={atelierId}
              atelierSlug={atelierSlug}
              gdprExporting={gdprExporting}
              handleGdprExport={handleGdprExport}
              wipeSlugConfirm={wipeSlugConfirm}
              setWipeSlugConfirm={setWipeSlugConfirm}
              wipeBusy={wipeBusy}
              handleWipeAtelier={handleWipeAtelier}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--app-surface-2)] border-t border-[var(--app-border)] shrink-0 text-[12px]">
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
