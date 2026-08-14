import { useState, useMemo, useCallback } from "react";
import { claimMatchesSearch } from "../utils/searchUtils";

/** Filtrează dosarele vizibile pentru utilizatorul conectat conform rolului său. */
export function filterClaimsByUser(claims = [], { myId = null, myEmail = "", isAdmin = false } = {}) {
  if (!Array.isArray(claims)) return [];
  if (isAdmin || (!myId && !myEmail)) return claims;
  return claims.filter((c) => {
    if (!c) return false;
    if (!c.createdBy && !c.createdByEmail) return true;
    return (
      (c.createdBy && c.createdBy === myId) ||
      (c.createdBy && c.createdBy === myEmail) ||
      (c.createdByEmail &&
        typeof c.createdByEmail === "string" &&
        c.createdByEmail.toLowerCase() === myEmail.toLowerCase())
    );
  });
}

/** Sortează o listă de dosare conform cheii specificate. */
export function sortClaimsList(claims = [], sortKey = "recent") {
  if (!Array.isArray(claims)) return [];
  const list = [...claims];
  if (sortKey === "numar") {
    return list.sort((a, b) => (a.numarDosar || "").localeCompare(b.numarDosar || ""));
  }
  if (sortKey === "status") {
    return list.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
  }
  if (sortKey === "client") {
    return list.sort((a, b) => (a.client || "").localeCompare(b.client || ""));
  }
  // Default: data ultimei actualizări descrescător
  return list.sort((a, b) => (b.dataUltimeiActualizari || "").localeCompare(a.dataUltimeiActualizari || ""));
}

/** Filtrează lista de dosare pe baza criteriilor selectate (tip, status, asigurător, blocate, căutare text). */
export function filterClaimsList(
  claims = [],
  {
    search = "",
    filterTip = "toate",
    filterStatus = "toate",
    filterAsigurator = "toti",
    onlyBlocked = false,
    sortKey = "recent",
  } = {}
) {
  if (!Array.isArray(claims)) return [];
  const query = (search || "").trim().toLowerCase();

  const filtered = claims.filter((c) => {
    if (!c) return false;
    if (filterTip !== "toate" && c.tipAsigurare !== filterTip) return false;
    if (filterStatus !== "toate" && c.status !== filterStatus) return false;
    if (filterAsigurator !== "toti" && c.asigurator !== filterAsigurator) return false;
    if (onlyBlocked && !c.blocat) return false;
    if (!query) return true;
    return claimMatchesSearch(c, query);
  });

  return sortClaimsList(filtered, sortKey);
}

/** Flux/Tabel pipeline: dosarele blocate nu se amestecă în etapele operaționale. */
export function selectStageClaims(filteredClaims = [], onlyBlocked = false) {
  if (onlyBlocked) return filteredClaims;
  return filteredClaims.filter((c) => !c.blocat);
}

/** Extrage lista unică ordonată a asigurătorilor din dosare. */
export function extractInsurersList(claims = []) {
  if (!Array.isArray(claims)) return [];
  return [...new Set(claims.map((c) => c?.asigurator).filter(Boolean))].sort();
}

/** Calculează numărul de filtre active aplicate. */
export function computeActiveFilterCount({
  search = "",
  filterTip = "toate",
  filterStatus = "toate",
  filterAsigurator = "toti",
  onlyBlocked = false,
} = {}) {
  return [
    (search || "").trim() !== "",
    filterTip !== "toate",
    filterStatus !== "toate",
    filterAsigurator !== "toti",
    Boolean(onlyBlocked),
  ].filter(Boolean).length;
}

export function useClaimFilters({ claims, myId, myEmail, isAdmin, pragRidicare, pragInactivitate }) {
  const [search, setSearch] = useState("");
  const [filterTip, setFilterTip] = useState("toate");
  const [filterStatus, setFilterStatus] = useState("toate");
  const [filterAsigurator, setFilterAsigurator] = useState("toti");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [fluxFilter, setFluxFilter] = useState("toate");
  const [mobileSort, setMobileSort] = useState("recent");
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);

  const userClaims = useMemo(
    () => filterClaimsByUser(claims, { myId, myEmail, isAdmin }),
    [claims, isAdmin, myEmail, myId]
  );

  const filteredClaims = useMemo(
    () =>
      filterClaimsList(userClaims, {
        search,
        filterTip,
        filterStatus,
        filterAsigurator,
        onlyBlocked,
        sortKey: mobileSort,
      }),
    [userClaims, search, filterTip, filterStatus, filterAsigurator, onlyBlocked, mobileSort]
  );

  const stageClaims = useMemo(
    () => selectStageClaims(filteredClaims, onlyBlocked),
    [filteredClaims, onlyBlocked]
  );

  const insurers = useMemo(() => extractInsurersList(claims), [claims]);

  const activeFilterCount = useMemo(
    () =>
      computeActiveFilterCount({
        search,
        filterTip,
        filterStatus,
        filterAsigurator,
        onlyBlocked,
      }),
    [search, filterTip, filterStatus, filterAsigurator, onlyBlocked]
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilterTip("toate");
    setFilterStatus("toate");
    setFilterAsigurator("toti");
    setOnlyBlocked(false);
    setFluxFilter("toate");
  }, []);

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
    stageClaims,
    activeFilterCount,
  };
}
