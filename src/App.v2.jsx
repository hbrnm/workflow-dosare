import React, { useCallback, useMemo, useState } from "react";
import {
  ClipboardList,
  PlusCircle,
  Users,
  LogOut,
  LayoutGrid,
  Bell,
  CalendarClock,
  BarChart3,
  Camera,
  PackageCheck,
} from "lucide-react";
import Login from "./components/auth/Login";
import { useAuth } from "./hooks/useAuth";
import { useClaims } from "./hooks/useClaims";
import { useSettings } from "./hooks/useSettings";
import { useAlerts } from "./hooks/useAlerts";
import {
  resolveUserRole,
  canCreateClaim,
  canManageUsers,
  canEditClaimFull,
  canChangeStatus,
  canEditWorkshop,
  ROLES,
} from "./constants/roles";
import ClaimsList from "./features/claims/ClaimsList";
import ClaimDetail from "./features/claims/ClaimDetail";
import ReceptionWizard from "./features/reception/ReceptionWizard";
import UsersAdmin from "./features/admin/UsersAdmin";
import FluxBoard from "./features/flux/FluxBoard";
import AlertsPanel from "./features/alerts/AlertsPanel";
import SchedulePanel from "./features/schedule/SchedulePanel";
import KpiDashboard from "./features/dashboard/KpiDashboard";
import QuickCapture from "./components/views/QuickCapture";
import PieseComandatePanel from "./components/views/PieseComandatePanel";
import TrackPage, { getTrackingTokenFromLocation } from "./features/tracking/TrackPage";
import "./styles/v2.css";

const TRACK_TOKEN = typeof window !== "undefined" ? getTrackingTokenFromLocation() : "";

/**
 * Workflow Daune 2.0 — Faza 1A + 1B + tracking client
 */
export default function App() {
  if (TRACK_TOKEN) {
    return <TrackPage token={TRACK_TOKEN} />;
  }

  return <AppAuthenticated />;
}

function AppAuthenticated() {
  const { session, authLoading, setSession, handleLogout } = useAuth();
  const [notice, setNotice] = useState(null);
  const [screen, setScreen] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const [usersSaving, setUsersSaving] = useState(false);

  const showNotice = useCallback((message, type = "success") => {
    setNotice({ message, type });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const { claims, loading, saveClaim, deleteClaim, loadAll, patchClaim, moveToStatus } = useClaims(
    session,
    showNotice
  );
  const {
    adminEmails,
    usersList,
    saveUsersAndAdmins,
    customInsurers,
    capacitateZilnica,
    saveCapacitate,
    pragRidicare,
    pragInactivitate,
  } = useSettings(session, showNotice);

  const alerts = useAlerts(claims, pragRidicare, pragInactivitate);

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

  const canEditFn = useCallback(
    (claim) =>
      canEditClaimFull(role, claim, session?.user?.id, email) ||
      canEditWorkshop(role) ||
      canChangeStatus(role),
    [role, session?.user?.id, email]
  );

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

  const fullBleed = screen === "reception" || screen === "detail";

  const navItems = [
    { key: "list", label: "Dosare", icon: ClipboardList },
    { key: "capture", label: "Capture", icon: Camera },
    { key: "flux", label: "Flux", icon: LayoutGrid },
    { key: "piese", label: "Piese", icon: PackageCheck },
    { key: "alerts", label: "Alerte", icon: Bell, badge: alerts.totalAlertsCount },
    { key: "schedule", label: "Programări", icon: CalendarClock },
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  ];
  if (canCreateClaim(role)) {
    navItems.splice(1, 0, { key: "reception", label: "Recepție", icon: PlusCircle });
  }
  if (canManageUsers(role)) {
    navItems.push({ key: "users", label: "Echipă", icon: Users });
  }

  return (
    <div className="v2-root flex min-h-dvh flex-col md:flex-row">
      {/* Desktop sidebar */}
      {!fullBleed && (
        <aside className="v2-sidebar hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-[var(--v2-border)]">
          <div className="border-b border-[var(--v2-border)] px-4 py-4">
            <div className="font-[family-name:var(--v2-font-display)] text-sm font-bold tracking-wide text-[var(--v2-accent)]">
              Workflow Daune 2.0
            </div>
            <div className="mt-1 truncate text-[10px] text-[var(--v2-muted)]">
              {ROLES[role]?.label || role}
            </div>
            <div className="truncate text-[10px] text-[var(--v2-muted)]">{email}</div>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    screen === item.key
                      ? "bg-[var(--v2-surface-2)] text-[var(--v2-accent)]"
                      : "text-[var(--v2-muted)] hover:bg-[var(--v2-surface)] hover:text-[var(--v2-text)]"
                  }`}
                  onClick={() => setScreen(item.key)}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="rounded-full bg-[var(--v2-danger)] px-1.5 text-[10px] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            className="m-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--v2-muted)] hover:bg-[var(--v2-surface)]"
            onClick={handleLogout}
          >
            <LogOut size={16} /> Ieșire
          </button>
        </aside>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        {!fullBleed && (
          <div className="flex items-center justify-between gap-2 border-b border-[var(--v2-border)] px-4 py-2 md:hidden">
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
        )}

        <main className="min-h-0 flex-1">
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
          ) : screen === "capture" ? (
            <QuickCapture
              claims={claims}
              role={role}
              canEditFn={canEditFn}
              onPatch={(id, patch) =>
                patchClaim(id, patch, { canEditFn, skipOwnershipCheck: true })
              }
              onNotify={showNotice}
              onOpenClaim={openClaim}
            />
          ) : screen === "flux" ? (
            <FluxBoard
              claims={claims}
              role={role}
              onOpen={openClaim}
              onMoveStatus={(claim, newStatus) => moveToStatus(claim, newStatus, canEditFn)}
            />
          ) : screen === "piese" ? (
            <PieseComandatePanel
              claims={claims}
              onOpenClaim={openClaim}
              onPatchClaim={(id, patch) => patchClaim(id, patch, { canEditFn, skipOwnershipCheck: true })}
              canEditFn={canEditFn}
              pragRidicare={pragRidicare}
              onNotify={showNotice}
            />
          ) : screen === "alerts" ? (
            <AlertsPanel buckets={alerts} onOpen={openClaim} />
          ) : screen === "schedule" ? (
            <SchedulePanel
              claims={claims}
              onOpen={openClaim}
              onPatch={(id, patch) => patchClaim(id, patch, { canEditFn, skipOwnershipCheck: true })}
              canEditFn={canEditFn}
              capacitate={capacitateZilnica}
              onSetCapacitate={saveCapacitate}
            />
          ) : screen === "dashboard" ? (
            <div className="flex h-full min-h-0 flex-col">
              <KpiDashboard claims={claims} onOpen={openClaim} />
            </div>
          ) : screen === "users" && canManageUsers(role) ? (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <UsersAdmin
                usersList={usersList}
                adminEmails={adminEmails}
                onSave={handleSaveUsers}
                saving={usersSaving}
              />
            </div>
          ) : (
            <ClaimsList
              claims={claims}
              loading={loading}
              role={role}
              onOpen={openClaim}
              onNewReception={() => setScreen("reception")}
            />
          )}
        </main>

        {/* Mobile bottom nav */}
        {!fullBleed && (
          <nav className="v2-nav flex shrink-0 overflow-x-auto scrollbar-none pb-[env(safe-area-inset-bottom)] md:hidden">
            {navItems
              .filter((i) =>
                ["list", "capture", "reception", "flux", "alerts"].includes(i.key)
              )
              .slice(0, 5)
              .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={screen === item.key ? "active" : ""}
                  onClick={() => setScreen(item.key)}
                >
                  <span className="relative">
                    <Icon size={18} />
                    {item.badge > 0 && (
                      <span className="absolute -right-2 -top-1 rounded-full bg-[var(--v2-danger)] px-1 text-[8px] text-white">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {notice && (
        <div className={`v2-toast v2-toast-${notice.type === "error" ? "error" : "success"}`}>
          {notice.message}
        </div>
      )}
    </div>
  );
}
