import { useState, useCallback } from "react";
import { emptyClaim } from "../utils/claimUtils";

export function useClaimModal(showNotice) {
  const [modalClaim, setModalClaim] = useState(null);
  const [setariOpen, setSetariOpen] = useState(false);
  const [alerteModalTab, setAlerteModalTab] = useState(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  const openNew = useCallback((type = "primit") => {
    setModalClaim(emptyClaim(type));
  }, []);

  const openExisting = useCallback((claim) => {
    setModalClaim(claim);
  }, []);

  const duplicateClaim = useCallback((source) => {
    const dup = {
      ...emptyClaim("primit"),
      numarInmatriculare: source.numarInmatriculare,
      vin: source.vin,
      marcaModel: source.marcaModel,
      client: source.client,
      telefonClient: source.telefonClient,
      tipAsigurare: source.tipAsigurare,
      asigurator: source.asigurator,
    };
    showNotice("Date duplicate — completează numărul de dosar nou și verifică restul.");
    setModalClaim(dup);
  }, [showNotice]);

  const closeClaimModal = useCallback(() => setModalClaim(null), []);
  const openSettings = useCallback(() => setSetariOpen(true), []);
  const closeSettings = useCallback(() => setSetariOpen(false), []);
  const openAlerts = useCallback((tab) => setAlerteModalTab(tab), []);
  const closeAlerts = useCallback(() => setAlerteModalTab(null), []);
  const openQuickCapture = useCallback(() => setQuickCaptureOpen(true), []);
  const closeQuickCapture = useCallback(() => setQuickCaptureOpen(false), []);

  return {
    modalClaim,
    openNew,
    openExisting,
    duplicateClaim,
    closeClaimModal,
    setariOpen,
    openSettings,
    closeSettings,
    alerteModalTab,
    openAlerts,
    closeAlerts,
    quickCaptureOpen,
    openQuickCapture,
    closeQuickCapture,
  };
}
