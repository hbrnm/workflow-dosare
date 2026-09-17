import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ListSkeleton from "../common/ListSkeleton";
import LoadError from "../common/LoadError";
import EmptyWorkspace from "../common/EmptyWorkspace";
import ErrorBoundary from "../common/ErrorBoundary";
import { lazyWithRetry } from "../../utils/lazyWithRetry";

import OnboardingChecklistBanner from "../common/OnboardingChecklistBanner";

const TablouPeFaze = lazyWithRetry(() => import("../views/FluxOperational"));
const BriefZilnic = lazyWithRetry(() => import("../views/BriefZilnic"));
const ClaimTable = lazyWithRetry(() => import("../views/ClaimTable"));
const Dashboard = lazyWithRetry(() => import("../views/Dashboard"));
const Programator = lazyWithRetry(() => import("../views/Programator"));
const Rapoarte = lazyWithRetry(() => import("../views/Rapoarte"));
const CentralizatorPiese = lazyWithRetry(() => import("../views/CentralizatorPiese"));
const LocalDriveView = lazyWithRetry(() => import("../drive/LocalDriveView"));

export default function AppViewRouter({
  view,
  setView,
  dosareSubView,
  setDosareSubView,
  loading = false,
  loadError = null,
  isOffline = false,
  loadAll,
  claims = [],
  userClaims = [],
  filteredClaims = [],
  stageClaims = [],
  highlightClaimIds,
  userCanCreate = false,
  isAdmin = false,
  myRoleLabel = "",
  openNew,
  openExisting,
  handleOpenClaim,
  duplicateClaim,
  handleDelete,
  handlePatchClaim,
  handleMoveToStatus,
  saveClaim,
  canEdit,
  pragRidicare,
  pragInactivitate,
  alertBuckets,
  showNotice,
  openBlockedClaims,
  setFilterStatus,
  onlyBlocked = false,
  setOnlyBlocked,
  openAlerts,
  capacitateZilnica,
  saveCapacitate,
  programatorFocusDate,
  density,
  activeClaimId,
  setIsAiModalOpenHeader,
  branding,
  memberCount = 1,
  removeDemoData,
  hasDemoData = false,
  openSettings,
}) {
  const isDosareView = view === "dosare" || view === "flux" || view === "brief" || view === "list";
  const realClaimsCount = userClaims.filter((c) => !c.isDemo).length;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-[var(--app-muted)] gap-2">
          <Loader2 className="animate-spin" size={18} /> Se încarcă vizualizarea...
        </div>
      }
    >
      <main
        className={`flex-1 min-h-0 p-2 sm:p-4 pb-20 md:pb-4 ${
          view === "flux" || view === "programator"
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto"
        }`}
      >
        <ErrorBoundary level="module" fallbackTitle="Modul indisponibil" onGoHome={() => setView("brief")}>
          {isDosareView || view === "dashboard" ? (
            <OnboardingChecklistBanner
              branding={branding}
              memberCount={memberCount}
              realClaimsCount={realClaimsCount}
              onOpenSettingsBranding={() => openSettings?.("branding")}
              onOpenSettingsUsers={() => openSettings?.("users")}
              onOpenNewClaim={userCanCreate ? openNew : null}
              onRemoveDemoData={removeDemoData}
              hasDemoData={hasDemoData}
            />
          ) : null}

          {loading ? (
            <ListSkeleton
              rows={dosareSubView === "list" ? 8 : dosareSubView === "brief" ? 6 : 4}
              variant={dosareSubView === "list" ? "table" : dosareSubView === "brief" ? "cards" : "kanban"}
            />
          ) : loadError || isOffline ? (
            <LoadError
              message={loadError?.message}
              offline={isOffline || loadError?.offline}
              onRetry={loadAll}
            />
          ) : isDosareView && userClaims.length === 0 ? (
            <EmptyWorkspace
              onNew={userCanCreate ? () => openNew() : null}
              ownershipHint={!isAdmin && claims.length > 0}
              roleLabel={myRoleLabel}
            />
          ) : isDosareView ? (
            dosareSubView === "brief" ? (
              <BriefZilnic
                claims={userClaims}
                onOpen={openExisting}
                onPatchClaim={handlePatchClaim}
                onMoveToStatus={handleMoveToStatus}
                onDuplicate={duplicateClaim}
                canEditFn={canEdit}
                pragRidicare={pragRidicare}
                pragInactivitate={pragInactivitate}
                alertBuckets={alertBuckets}
                onNotify={showNotice}
                onOpenBlocked={openBlockedClaims}
                onSelectStatusFilter={(statusKey) => {
                  setFilterStatus(statusKey);
                  setOnlyBlocked(false);
                  setDosareSubView("list");
                  setView("dosare");
                }}
              />
            ) : dosareSubView === "list" ? (
              <div className="space-y-3 flex flex-col flex-1 min-h-0">
                {onlyBlocked ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#4A5568]/30 bg-[var(--app-surface)] px-3 py-2.5 shrink-0">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--app-text-strong)]">
                        Filtru: doar dosare blocate
                      </p>
                      <p className="text-[11px] text-[var(--app-muted)]">
                        {filteredClaims.length} {filteredClaims.length === 1 ? "dosar" : "dosare"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnlyBlocked(false)}
                      className="shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"
                    >
                      Arată toate
                    </button>
                  </div>
                ) : null}
                <ClaimTable
                  claims={onlyBlocked ? filteredClaims : stageClaims}
                  onOpen={openExisting}
                  onOpenNew={openNew}
                  onImportClick={setIsAiModalOpenHeader ? () => setIsAiModalOpenHeader(true) : undefined}
                  onDelete={handleDelete}
                  canEditFn={canEdit}
                  highlightClaimIds={highlightClaimIds}
                  onNotify={showNotice}
                  onTogglePieseSosite={(claim, val) =>
                    handlePatchClaim(claim.id, { pieseSosite: val })
                  }
                  onScheduleFromPiese={async (claim, iso) => {
                    const ok = await handlePatchClaim(claim.id, { dataProgramare: iso });
                    if (ok !== false) {
                      showNotice(
                        `Programare salvată: ${String(iso).slice(0, 10)} ${
                          String(iso).slice(11, 16) || ""
                        }`.trim(),
                        "success"
                      );
                    }
                    return ok;
                  }}
                  onPatchPieseDates={(claim, patch) => handlePatchClaim(claim.id, patch)}
                  onMoveToStatus={handleMoveToStatus}
                  density={density}
                  activeClaimId={activeClaimId}
                />
              </div>
            ) : dosareSubView === "piese" ? (
              <CentralizatorPiese
                claims={claims}
                onOpenClaim={openExisting || handleOpenClaim}
                onPatchClaim={handlePatchClaim}
                canEditFn={canEdit}
                onNotify={showNotice}
              />
            ) : (
              <TablouPeFaze
                claims={onlyBlocked ? filteredClaims : stageClaims}
                onOpen={openExisting}
                onOpenClaim={handleOpenClaim}
                onMoveToStatus={handleMoveToStatus}
                activeClaimId={activeClaimId}
                onTogglePieseSosite={(claim, val) =>
                  handlePatchClaim(claim.id, { pieseSosite: val })
                }
                onScheduleFromPiese={async (claim, iso) => {
                  const ok = await handlePatchClaim(claim.id, { dataProgramare: iso });
                  if (ok !== false) {
                    showNotice(
                      `Programare salvată: ${String(iso).slice(0, 10)} ${
                        String(iso).slice(11, 16) || ""
                      }`.trim(),
                      "success"
                    );
                  }
                  return ok;
                }}
                onPatchPieseDates={(claim, patch) => handlePatchClaim(claim.id, patch)}
                onAddInStatus={openNew}
                onDuplicate={duplicateClaim}
                canEditFn={canEdit}
                pragRidicare={pragRidicare}
                pragInactivitate={pragInactivitate}
                onNotify={showNotice}
                highlightClaimIds={highlightClaimIds}
                density={density}
              />
            )
          ) : view === "dashboard" ? (
            <Dashboard
              claims={filteredClaims}
              totalClaimsCount={userClaims.length}
              onOpen={openExisting}
              pragRidicare={pragRidicare}
              onOpenRapoarte={() => setView("rapoarte")}
              onOpenAlerts={openAlerts}
              onOpenBlocked={openBlockedClaims}
              stageOverdueCount={alertBuckets.counts.stagnate}
            />
          ) : view === "drive" ? (
            <LocalDriveView
              claims={claims}
              onOpenClaim={openExisting || handleOpenClaim}
              onSaveClaim={saveClaim}
              showNotice={showNotice}
            />
          ) : view === "programator" ? (
            <Programator
              claims={claims}
              onOpen={openExisting}
              onPatch={(id, patch) => handlePatchClaim(id, patch)}
              canEditFn={canEdit}
              capacitate={capacitateZilnica}
              onSetCapacitate={saveCapacitate}
              onAddInStatus={openNew}
              initialDate={programatorFocusDate}
              onNotify={showNotice}
            />
          ) : (
            <Rapoarte
              claims={filteredClaims}
              totalClaimsCount={userClaims.length}
              onPatch={handlePatchClaim}
              canEditFn={canEdit}
            />
          )}
        </ErrorBoundary>
      </main>
    </Suspense>
  );
}
