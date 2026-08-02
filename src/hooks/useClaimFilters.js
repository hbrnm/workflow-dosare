import { useState, useMemo, useCallback } from "react";
import { isReadyForPickupOverdue, isStageOverdue, isAcceptPlataWithoutParts, isInactiveClaim } from "../utils/alertUtils";

export function useClaimFilters({ claims, myId, myEmail, isAdmin, pragRidicare, pragInactivitate }) {
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [filterAsigurator, setFilterAsigurator] = useState("toti");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [fluxFilter, setFluxFilter] = useState("toate");
  const [mobileSort, setMobileSort] = useState("recent");
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  const userClaims = useMemo(() => {
    if (isAdmin || (!myId && !myEmail)) return claims;
    return claims.filter((c) => {
      if (!c) return false;
      if (!c.createdBy && !c.createdByEmail) return true;
      return (
        (c.createdBy && c.createdBy === myId) ||
        (c.createdBy && c.createdBy === myEmail) ||
        (c.createdByEmail && typeof c.createdByEmail === "string" && c.createdByEmail.toLowerCase() === myEmail.toLowerCase())
      );
    });
  }, [claims, isAdmin, myEmail, myId]);

  const filteredClaims = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    let res = userClaims.filter((c) => {
      if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
      if (filterStatus !== "toate" && c.status !== filterStatus) return false;
      if (filterAsigurator !== "toti" && c.asigurator !== filterAsigurator) return false;
      if (onlyBlocked && !c.blocat) return false;
      if (!query) return true;
      return (
        (c.numarInmatriculare || "").toLowerCase().includes(query) ||
        (c.client || "").toLowerCase().includes(query) ||
        (c.numarDosar || "").toLowerCase().includes(query) ||
        (c.asigurator || "").toLowerCase().includes(query) ||
        (c.vin || "").toLowerCase().includes(query)
      );
    });

    if (mobileSort === "numar") {
      return [...res].sort((a, b) => (a.numarDosar || "").localeCompare(b.numarDosar || ""));
    }
    if (mobileSort === "status") {
      return [...res].sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    }
    if (mobileSort === "client") {
      return [...res].sort((a, b) => (a.client || "").localeCompare(b.client || ""));
    }
    return [...res].sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || ""));
  }, [userClaims, search, filterTip, filterStatus, filterAsigurator, onlyBlocked, mobileSort]);

  const insurers = useMemo(
    () => [...new Set(claims.map((c) => c.asigurator).filter(Boolean))].sort(),
    [claims]
  );

  const activeFilterCount = useMemo(
    () => [filterTip !== "toate", filterStatus !== "toate", filterAsigurator !== "toti", onlyBlocked].filter(Boolean).length,
    [filterTip, filterStatus, filterAsigurator, onlyBlocked]
  );

  const resetFilters = useCallback(() => {
    setFilterTip("toate");
    setFilterStatus("toate");
    setFilterAsigurator("toti");
    setOnlyBlocked(false);
    setFluxFilter("toate");
  }, []);

  const alertCount = useMemo(() => userClaims.filter(isStageOverdue).length, [userClaims]);
  const blockedCount = useMemo(() => userClaims.filter((c) => c.blocat).length, [userClaims]);
  const gataNeridicateCount = useMemo(
    () => userClaims.filter((c) => isReadyForPickupOverdue(c, pragRidicare)).length,
    [userClaims, pragRidicare]
  );
  const acceptPlataNoPartsCount = useMemo(
    () => userClaims.filter(isAcceptPlataWithoutParts).length,
    [userClaims]
  );
  const inactiveCount = useMemo(
    () => userClaims.filter((c) => isInactiveClaim(c, pragInactivitate)).length,
    [userClaims, pragInactivitate]
  );

  const totalAlertsCount = alertCount + blockedCount + gataNeridicateCount + acceptPlataNoPartsCount + inactiveCount;

  return {
    search,
    setSearch,
    filterTip,
    setFilterTip,
    filterStatus,
    setFilterStatus,
    filterAsigurator,
    setFilterAsigurator,
    onlyBlocked,
    setOnlyBlocked,
    fluxFilter,
    setFluxFilter,
    mobileSort,
    setMobileSort,
    mobileFilterSheetOpen,
    setMobileFilterSheetOpen,
    resetFilters,
    insurers,
    userClaims,
    filteredClaims,
    activeFilterCount,
    alertCount,
    blockedCount,
    gataNeridicateCount,
    acceptPlataNoPartsCount,
    inactiveCount,
    totalAlertsCount,
  };
}
