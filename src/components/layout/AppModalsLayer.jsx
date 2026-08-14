import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "../common/ErrorBoundary";
import SetariModal from "../modals/SetariModal";
import { lazyWithRetry } from "../../utils/lazyWithRetry";

const ClaimModal = lazyWithRetry(() => import("../modals/ClaimModal"));
const QuickCreateClaimModal = lazyWithRetry(() => import("../modals/QuickCreateClaimModal"));
const AiDocumentUploadModal = lazyWithRetry(() => import("../modals/AiDocumentUploadModal"));
const AlerteModal = lazyWithRetry(() => import("../modals/AlerteModal"));
const QuickCapture = lazyWithRetry(() => import("../views/QuickCapture"));

export default function AppModalsLayer({
  // Alerte
  alerteModalTab,
  userClaims = [],
  alertBuckets,
  pragRidicare,
  pragInactivitate,
  requestCloseAlerts,
  handleOpenClaim,
  handlePatchClaim,
  showNotice,
  // Setari
  setariOpen = false,
  requestCloseSettings,
  claims = [],
  capacitateZilnica,
  saveCapacitate,
  savePragRidicare,
  savePragInactivitate,
  termeneAlertaStatus,
  saveTermeneAlertaStatus,
  customInsurers = [],
  saveInsurers,
  branding,
  saveBranding,
  uploadBrandingLogo,
  myEmail = "",
  handleLogout,
  isAdmin = false,
  usersList = [],
  handleAddUser,
  handleDeleteUser,
  handleToggleAdminRole,
  handleChangePassword,
  effectiveBilling,
  saveBilling,
  manoperaTarife,
  saveManoperaTarife,
  tenancyReady = false,
  atelierId = null,
  atelier,
  startStripeCheckout,
  startStripePortal,
  loadAll,
  // QuickCreate
  quickCreateOpen = false,
  requestCloseQuickCreate,
  handleSave,
  quickCreateDefaults,
  // ClaimModal
  modalClaim,
  activeModalClaim,
  requestCloseClaimModal,
  handleDelete,
  canEdit,
  openExisting,
  // QuickCapture
  quickCaptureOpen = false,
  closeQuickCapture,
  // AI Modal
  isAiModalOpenHeader = false,
  setIsAiModalOpenHeader,
  openNew,
}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 text-white">
          <Loader2 className="animate-spin" size={20} />
        </div>
      }
    >
      {alerteModalTab && (
        <AlerteModal
          claims={userClaims}
          alertBuckets={alertBuckets}
          initialTab={alerteModalTab}
          pragRidicare={pragRidicare}
          pragInactivitate={pragInactivitate}
          onClose={requestCloseAlerts}
          onOpenClaim={handleOpenClaim}
          onPatchClaim={handlePatchClaim}
          onNotify={showNotice}
          desktopUi
        />
      )}

      {setariOpen && (
        <ErrorBoundary onReset={requestCloseSettings}>
          <SetariModal
            claims={claims}
            capacitateZilnica={capacitateZilnica}
            pragRidicare={pragRidicare}
            pragInactivitate={pragInactivitate}
            termeneAlertaStatus={termeneAlertaStatus}
            onSaveTermeneAlertaStatus={saveTermeneAlertaStatus}
            insurersList={customInsurers}
            onSaveInsurers={saveInsurers}
            onSaveCapacitate={saveCapacitate}
            onSavePrag={savePragRidicare}
            onSavePragInactivitate={savePragInactivitate}
            branding={branding}
            onSaveBranding={saveBranding}
            onUploadBrandingLogo={uploadBrandingLogo}
            onClose={requestCloseSettings}
            onNotify={showNotice}
            userEmail={myEmail}
            onSignOut={handleLogout}
            isAdmin={isAdmin}
            usersList={usersList}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onToggleAdminRole={handleToggleAdminRole}
            onChangePassword={handleChangePassword}
            billing={effectiveBilling}
            onSaveBilling={saveBilling}
            manoperaTarife={manoperaTarife}
            onSaveManoperaTarife={saveManoperaTarife}
            tenancyReady={tenancyReady}
            atelierId={atelierId}
            atelierSlug={atelier?.slug || null}
            onStripeCheckout={startStripeCheckout}
            onStripePortal={startStripePortal}
            onDataChanged={loadAll}
            desktopUi
          />
        </ErrorBoundary>
      )}

      {quickCreateOpen && (
        <QuickCreateClaimModal
          isOpen={quickCreateOpen}
          onClose={requestCloseQuickCreate}
          onSave={handleSave}
          onNotify={showNotice}
          allClaims={claims}
          initialStatus={quickCreateDefaults?.status}
          initialDataProgramare={quickCreateDefaults?.dataProgramare}
          desktopUi
        />
      )}

      {modalClaim && (
        <ErrorBoundary
          key={activeModalClaim?.id || "new-claim"}
          onReset={requestCloseClaimModal}
        >
          <ClaimModal
            claim={activeModalClaim}
            onClose={requestCloseClaimModal}
            onSave={handleSave}
            onPatch={handlePatchClaim}
            onDelete={handleDelete}
            readOnly={
              Array.isArray(claims) &&
              claims.some((c) => c && c.id === activeModalClaim?.id) &&
              !canEdit(activeModalClaim)
            }
            allClaims={claims}
            insurersList={customInsurers}
            onJumpTo={openExisting}
            onNotify={showNotice}
            desktopUi
            userEmail={myEmail}
            manoperaTarife={manoperaTarife}
          />
        </ErrorBoundary>
      )}

      {quickCaptureOpen && (
        <QuickCapture
          claims={claims}
          onClose={closeQuickCapture}
          onPatch={handlePatchClaim}
          canEditFn={canEdit}
          onNotify={showNotice}
        />
      )}

      {isAiModalOpenHeader && (
        <AiDocumentUploadModal
          isOpen={isAiModalOpenHeader}
          onClose={() => setIsAiModalOpenHeader(false)}
          onDataExtracted={(extractedClaimPartial, tipDocument) => {
            if (!extractedClaimPartial) return;
            openExisting(extractedClaimPartial);
            showNotice(
              `Date extrase cu succes din ${tipDocument || "document"}!`,
              "success"
            );
          }}
        />
      )}
    </Suspense>
  );
}
