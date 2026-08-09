import { useCallback, useEffect, useRef } from "react";
import { createBackStack } from "../utils/appHistory";

/**
 * Mobile back stack — exit only on Brief; otherwise return to previous screen.
 */
export function useMobileBackStack({
  enabled,
  setMobileTab,
  flags,
  api,
}) {
  const stackRef = useRef(null);
  if (!stackRef.current) stackRef.current = createBackStack();

  const apiRef = useRef(api);
  apiRef.current = api;

  const mobileTabRef = useRef("brief");

  const applyFrameRef = useRef(null);
  applyFrameRef.current = (frame) => {
    const a = apiRef.current;
    if (!frame || frame.t === "home") {
      a.closeClaim?.();
      a.closeField?.();
      a.closeAlerts?.();
      a.closeSettings?.();
      a.closeQuickCreate?.();
      a.closeQuickCapture?.();
      setMobileTab("brief");
      mobileTabRef.current = "brief";
      return;
    }
    if (frame.t === "tab") {
      a.closeClaim?.();
      a.closeField?.();
      a.closeAlerts?.();
      a.closeSettings?.();
      a.closeQuickCreate?.();
      a.closeQuickCapture?.();
      const tab = frame.tab || "brief";
      setMobileTab(tab);
      mobileTabRef.current = tab;
      return;
    }
    if (frame.t === "overlay") {
      if (frame.name !== "claim") a.closeClaim?.();
      if (frame.name !== "field") a.closeField?.();
      if (frame.name !== "alerte") a.closeAlerts?.();
      if (frame.name !== "setari") a.closeSettings?.();
      if (frame.name !== "quickCreate") a.closeQuickCreate?.();
      if (frame.name !== "quickCapture") a.closeQuickCapture?.();
      if (frame.tab) {
        setMobileTab(frame.tab);
        mobileTabRef.current = frame.tab;
      }
      if (frame.name === "alerte" && frame.alerteTab) a.openAlerts?.(frame.alerteTab);
      if (frame.name === "setari") a.openSettings?.();
      if (frame.name === "field" && frame.id) a.openField?.(frame.id);
      if (frame.name === "claim" && frame.claim) a.openClaim?.(frame.claim);
      if (frame.name === "quickCreate") a.openQuickCreate?.();
    }
  };

  // Mount mobile shell: Brief is the only frame so Back can exit
  useEffect(() => {
    if (!enabled) return undefined;
    stackRef.current.resetHome();
    setMobileTab("brief");
    mobileTabRef.current = "brief";

    const onPopState = () => {
      const next = stackRef.current.handlePopState();
      if (next == null) return; // Brief home → allow app exit
      applyFrameRef.current?.(next);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, setMobileTab]);

  // Forward navigation: push when overlays open
  useEffect(() => {
    if (!enabled) return;
    const stack = stackRef.current;
    const tab = mobileTabRef.current || "brief";

    if (flags.modalClaim) {
      stack.push({
        t: "overlay",
        name: "claim",
        id: flags.modalClaim.id,
        tab,
        claim: flags.modalClaim,
      });
      return;
    }
    if (flags.fieldClaimId) {
      stack.push({ t: "overlay", name: "field", id: flags.fieldClaimId, tab });
      return;
    }
    if (flags.alerteModalTab) {
      stack.push({
        t: "overlay",
        name: "alerte",
        alerteTab: flags.alerteModalTab,
        tab,
      });
      return;
    }
    if (flags.setariOpen) {
      stack.push({ t: "overlay", name: "setari", tab });
      return;
    }
    if (flags.quickCreateOpen) {
      stack.push({ t: "overlay", name: "quickCreate", tab });
      return;
    }
    if (flags.quickCaptureOpen) {
      stack.push({ t: "overlay", name: "quickCapture", tab });
    }
  }, [
    enabled,
    flags.modalClaim,
    flags.fieldClaimId,
    flags.alerteModalTab,
    flags.setariOpen,
    flags.quickCreateOpen,
    flags.quickCaptureOpen,
  ]);

  const goTab = useCallback((tab) => {
    mobileTabRef.current = tab;
    setMobileTab(tab);
    if (!enabled) return;
    if (tab === "brief") {
      // Collapse tab frame if present
      const top = stackRef.current.top();
      if (top.t === "tab") {
        stackRef.current.dismiss(() => true);
      }
      return;
    }
    stackRef.current.push({ t: "tab", tab });
  }, [enabled, setMobileTab]);

  const requestClose = useCallback((name) => {
    const a = apiRef.current;
    // Close UI immediately; sync History stack afterward
    if (name === "alerte") a.closeAlerts?.();
    else if (name === "setari") a.closeSettings?.();
    else if (name === "claim") a.closeClaim?.();
    else if (name === "field") a.closeField?.();
    else if (name === "quickCreate") a.closeQuickCreate?.();
    else if (name === "quickCapture") a.closeQuickCapture?.();

    stackRef.current.dismiss((f) => f.t === "overlay" && f.name === name);
  }, []);

  const openClaimFromAlerts = useCallback((claim) => {
    if (!claim?.id) return;
    // Keep Alerte open; field/claim stacks on top (z-index front). Closing
    // the dosar returns to the still-open Centru de Alerte.
    apiRef.current.openField?.(claim.id);
  }, []);

  /** After saving full claim modal → field sheet */
  const replaceClaimWithField = useCallback((claimId) => {
    if (!claimId) return;
    apiRef.current.closeClaim?.();
    stackRef.current.replaceTop({
      t: "overlay",
      name: "field",
      id: claimId,
      tab: mobileTabRef.current || "brief",
    });
    apiRef.current.openField?.(claimId);
  }, []);

  return {
    goTab,
    requestClose,
    openClaimFromAlerts,
    replaceClaimWithField,
  };
}
