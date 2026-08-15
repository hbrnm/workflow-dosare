import React from "react";
import { Shield, User, Key, Plus, Trash2 } from "lucide-react";
import AppButton from "../../common/AppButton";
import { fmtDate } from "../../../utils/dateUtils";
import { ROLE_OPTIONS, ROLES, normalizeRole } from "../../../constants/roles";

export default function SettingsAccountTab({
  // Auth & Role
  userEmail = "",
  isAdmin = false,
  onSignOut,
  // Password
  myNewPassword = "",
  setMyNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  updatingPassword = false,
  handleChangePasswordSubmit,
  // Team
  usersList = [],
  newUserEmail = "",
  setNewUserEmail,
  newUserRole = "receptioner",
  setNewUserRole,
  newUserPassword = "",
  setNewUserPassword,
  creatingUser = false,
  handleAddUserSubmit,
  onToggleAdminRole,
  setPendingDeleteEmail,
  // Billing & Stripe
  billingView,
  tenancyReady = false,
  atelierId = null,
  stripeBusy = false,
  handleStripeCheckout,
  handleStripePortal,
  seatDraft,
  setSeatDraft,
  savingBilling = false,
  handleSaveSeats,
  onSaveBilling,
}) {
  return (
    <div className="space-y-4">
      {/* Billing + Stripe */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Shield size={16} className="text-[var(--app-accent)]" /> Plan atelier
        </h3>
        <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
          {tenancyReady
            ? "Abonament pe atelier. Checkout Stripe actualizează automat planul."
            : "Rulează migrarea 29 (+ 31) pentru multi-tenant și branding pe slug."}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Plan</div>
            <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">{billingView?.planMeta?.label}</div>
          </div>
          <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Locuri</div>
            <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">
              {billingView?.memberCount}/{billingView?.seatLimit}
            </div>
          </div>
          <div className="rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)] px-3 py-2 col-span-2">
            <div className="text-[10px] font-bold uppercase text-[var(--app-muted)]">Trial până la</div>
            <div className="text-[13px] font-semibold text-[var(--app-text-strong)]">
              {billingView?.trialEndsAt ? fmtDate(billingView.trialEndsAt) : "—"}
            </div>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {billingView?.needsUpgrade || !billingView?.hasStripeCustomer ? (
              <AppButton
                type="button"
                variant="primary"
                disabled={stripeBusy || !atelierId}
                onClick={handleStripeCheckout}
              >
                {stripeBusy ? "…" : "Activează abonament"}
              </AppButton>
            ) : null}
            {billingView?.hasStripeCustomer ? (
              <AppButton
                type="button"
                variant="secondary"
                disabled={stripeBusy || !atelierId}
                onClick={handleStripePortal}
              >
                Gestionează facturare
              </AppButton>
            ) : null}
          </div>
        ) : null}
        {isAdmin && onSaveBilling ? (
          <form onSubmit={handleSaveSeats} className="flex flex-wrap items-end gap-2 pt-1 border-t border-[var(--app-border)]">
            <label className="text-[11px] font-bold text-[var(--app-muted)]">
              Seat limit
              <input
                type="number"
                min={1}
                max={200}
                className="mt-1 block p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] w-24"
                value={seatDraft}
                onChange={(e) => setSeatDraft(e.target.value)}
              />
            </label>
            <AppButton type="submit" variant="secondary" disabled={savingBilling}>
              {savingBilling ? "…" : "Salvează locuri"}
            </AppButton>
          </form>
        ) : null}
      </div>

      {/* Informații Cont Curent */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-4">
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

        {/* Formular Schimbare Parolă Cont */}
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
                className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] focus:border-[var(--app-accent)]"
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
                className="w-full p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] focus:border-[var(--app-accent)]"
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

      {/* SECȚIUNE GESTIONARE UTILIZATORI (Disponibilă Exclusiv pentru Administratori) */}
      {isAdmin && (
        <div className="bg-[var(--app-surface-2)] border border-[var(--app-accent)]/40 rounded-xl p-4 space-y-4 shadow-sm">
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
          {!billingView?.canInvite ? (
            <div className="text-[12px] text-[var(--app-danger)] bg-[var(--app-danger)]/10 border border-[var(--app-danger)]/30 rounded-lg px-3 py-2">
              {billingView?.overSeatLimit
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
                className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] font-medium focus:border-[var(--app-accent)]"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />

              <select
                className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] font-bold text-[var(--app-text-strong)] focus:border-[var(--app-accent)]"
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
                className="p-2 border border-[var(--app-border)] rounded-lg text-[13px] bg-[var(--app-surface)] font-medium focus:border-[var(--app-accent)]"
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
                disabled={creatingUser || !billingView?.canInvite}
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
              <div className="divide-y divide-[var(--app-border-soft)] border border-[var(--app-border)] rounded-xl overflow-hidden bg-[var(--app-surface)]">
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
                                ? "bg-[var(--app-surface-muted)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                                : "bg-[var(--app-warning-muted)] text-[var(--app-warning)] border-[var(--app-accent)]/40 hover:bg-[var(--app-accent)]/15"
                            }`}
                            title={isUserAdmin ? "Retrogradează la Operator" : "Promovează în Administrator"}
                          >
                            <Key size={13} />
                            <span>{isUserAdmin ? "Devino Operator" : "Fă Administrator"}</span>
                          </button>
                        )}

                        {/* Ștergere utilizator */}
                        {setPendingDeleteEmail && (
                          <button
                            type="button"
                            disabled={isCurrent}
                            aria-label="Șterge utilizator"
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
  );
}
