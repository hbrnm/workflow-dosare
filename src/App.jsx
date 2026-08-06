import React, { useCallback, useMemo, useState } from "react";
import { ClipboardList, PlusCircle, Users, LogOut } from "lucide-react";
import Login from "./components/auth/Login";
import { useAuth } from "./hooks/useAuth";
import { useClaims } from "./hooks/useClaims";
import { useSettings } from "./hooks/useSettings";
import { resolveUserRole, canCreateClaim, canManageUsers, ROLES } from "./constants/roles";
import ClaimsList from "./features/claims/ClaimsList";
import ClaimDetail from "./features/claims/ClaimDetail";
import ReceptionWizard from "./features/reception/ReceptionWizard";
import UsersAdmin from "./features/admin/UsersAdmin";
import "./styles/v2.css";

/**
 * Workflow Daune 2.0 — MVP Faza 1
 * Recepție, inspecție foto, diagramă avarii, documente, statusuri, roluri.
 * App.v1.jsx păstrează aplicația anterioară.
 */
export default function App() {
  const { session, authLoading, setSession, handleLogout } = useAuth();
  const [notice, setNotice] = useState(null);
  const [screen, setScreen] = useState("list"); // list | reception | detail | users
  const [activeId, setActiveId] = useState(null);
  const [usersSaving, setUsersSaving] = useState(false);

  const showNotice = useCallback((message, type = "success") => {
    setNotice({ message, type });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const { claims, loading, saveClaim, deleteClaim, loadAll } = useClaims(session, showNotice);
  const { adminEmails, usersList, saveUsersAndAdmins, customInsurers } = useSettings(
    session,
    showNotice
  );

  const email = session?.user?.email || "";
  const role = useMemo(
    () => resolveUserRole(email, { adminEmails, usersList }),
    [email, adminEmails, usersList]
  );

  const defaultInsurer = customInsurers?.[0];

  const activeClaim = useMemo(
    () => claims.find((c) => c.id === activeId) || null,
    [claims, activeId]
  );

  if (authLoading) {
    return (
      <div className="v2-root flex min-h-dvh items-center justify-center text-[var(--v2-muted)]">
        Se încarcă…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="v2-root">
        <Login onLoginSuccess={setSession} />
      </div>
    );
  }

  const openClaim = (id) => {
    setActiveId(id);
    setScreen("detail");
  };

  const handleCreated = async (claim) => {
    const result = await saveClaim(claim);
    if (result?.success) {
      setActiveId(claim.id);
      setScreen("detail");
    }
  };

  const handleSaveUsers = async ({ utilizatori, adminEmails: emails }) => {
    setUsersSaving(true);
    try {
      await saveUsersAndAdmins(utilizatori, emails);
      showNotice("Rolurile au fost salvate.", "success");
    } finally {
      setUsersSaving(false);
    }
  };

  return (
    <div className="v2-root flex min-h-dvh flex-col">
      {screen === "reception" ? (
        <ReceptionWizard
          defaultInsurer={defaultInsurer}
          onCancel={() => setScreen("list")}
          onCreated={handleCreated}
          showNotice={showNotice}
        />
      ) : screen === "detail" && activeClaim ? (
        <ClaimDetail
          claim={activeClaim}
          role={role}
          userId={session.user.id}
          userEmail={email}
          onBack={() => {
            setScreen("list");
            setActiveId(null);
            loadAll?.();
          }}
          onSave={async (c) => {
            const r = await saveClaim(c);
            if (r?.success) {
              setScreen("list");
              setActiveId(null);
            }
          }}
          onDelete={(id) => {
            deleteClaim(id, () => true);
            setScreen("list");
            setActiveId(null);
          }}
          showNotice={showNotice}
        />
      ) : screen === "users" && canManageUsers(role) ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <UsersAdmin
            usersList={usersList}
            adminEmails={adminEmails}
            onSave={handleSaveUsers}
            saving={usersSaving}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--v2-border)] px-4 py-2">
            <div>
              <div className="font-[family-name:var(--v2-font-display)] text-sm font-bold tracking-wide text-[var(--v2-accent)]">
                Workflow Daune 2.0
              </div>
              <div className="text-[10px] text-[var(--v2-muted)]">
                {ROLES[role]?.label || role} · {email}
              </div>
            </div>
            <button type="button" className="v2-btn-ghost !px-2" onClick={handleLogout} title="Ieșire">
              <LogOut size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ClaimsList
              claims={claims}
              loading={loading}
              role={role}
              onOpen={openClaim}
              onNewReception={() => setScreen("reception")}
            />
          </div>
        </div>
      )}

      {screen !== "reception" && screen !== "detail" && (
        <nav className="v2-nav flex shrink-0 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            className={screen === "list" ? "active" : ""}
            onClick={() => setScreen("list")}
          >
            <ClipboardList size={18} />
            Dosare
          </button>
          {canCreateClaim(role) && (
            <button type="button" onClick={() => setScreen("reception")}>
              <PlusCircle size={18} />
              Recepție
            </button>
          )}
          {canManageUsers(role) && (
            <button
              type="button"
              className={screen === "users" ? "active" : ""}
              onClick={() => setScreen("users")}
            >
              <Users size={18} />
              Echipă
            </button>
          )}
        </nav>
      )}

      {notice && (
        <div className={`v2-toast v2-toast-${notice.type === "error" ? "error" : "success"}`}>
          {notice.message}
        </div>
      )}
    </div>
  );
}
