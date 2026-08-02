import { useMemo } from "react";
import { isReadyForPickupOverdue, isStageOverdue, isAcceptPlataWithoutParts, isInactiveClaim } from "../utils/alertUtils";

export function useAlerts(userClaims = [], pragRidicare, pragInactivitate) {
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

  const totalAlertsCount = useMemo(
    () => alertCount + blockedCount + gataNeridicateCount + acceptPlataNoPartsCount + inactiveCount,
    [alertCount, blockedCount, gataNeridicateCount, acceptPlataNoPartsCount, inactiveCount]
  );

  return {
    alertCount,
    blockedCount,
    gataNeridicateCount,
    acceptPlataNoPartsCount,
    inactiveCount,
    totalAlertsCount,
  };
}
