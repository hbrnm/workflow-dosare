import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { normalizeBilling, DEFAULT_SEAT_LIMIT } from "../constants/billing";

/**
 * Resolve active atelier + billing. Graceful if migrare 29 nu e aplicată.
 */
export function useAtelier(session, { usersList = [], billingFromSettings = null } = {}) {
  const [atelierId, setAtelierId] = useState(null);
  const [atelierRow, setAtelierRow] = useState(null);
  const [tenancyReady, setTenancyReady] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const myId = session?.user?.id || null;

  useEffect(() => {
    if (!session || !myId) {
      setAtelierId(null);
      setAtelierRow(null);
      setTenancyReady(false);
      setMemberCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: memberships, error } = await supabase
          .from("atelier_membri")
          .select("atelier_id, role, email")
          .eq("user_id", myId)
          .limit(5);

        if (error || !memberships?.length) {
          if (!cancelled) {
            setAtelierId(null);
            setAtelierRow(null);
            setTenancyReady(false);
            setMemberCount(Array.isArray(usersList) ? usersList.length : 0);
          }
          return;
        }

        const primary = memberships[0];
        const { data: atelier } = await supabase
          .from("ateliere")
          .select("id, slug, nume, short, plan, trial_ends_at, seat_limit")
          .eq("id", primary.atelier_id)
          .maybeSingle();

        const { count } = await supabase
          .from("atelier_membri")
          .select("user_id", { count: "exact", head: true })
          .eq("atelier_id", primary.atelier_id);

        if (!cancelled) {
          setAtelierId(primary.atelier_id);
          setAtelierRow(atelier || { id: primary.atelier_id });
          setTenancyReady(true);
          setMemberCount(typeof count === "number" ? count : memberships.length);
        }
      } catch {
        if (!cancelled) {
          setTenancyReady(false);
          setAtelierId(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, myId, usersList]);

  const billing = useMemo(() => {
    const fromAtelier = atelierRow
      ? {
          plan: atelierRow.plan,
          trialEndsAt: atelierRow.trial_ends_at,
          seatLimit: atelierRow.seat_limit,
        }
      : null;
    const source = fromAtelier || billingFromSettings || {};
    return normalizeBilling({
      plan: source.plan,
      trialEndsAt: source.trialEndsAt ?? source.trial_ends_at,
      seatLimit: source.seatLimit ?? source.seat_limit ?? DEFAULT_SEAT_LIMIT,
      memberCount: memberCount || (Array.isArray(usersList) ? usersList.length : 0),
    });
  }, [atelierRow, billingFromSettings, memberCount, usersList]);

  return {
    atelierId,
    atelier: atelierRow,
    tenancyReady,
    billing,
    memberCount,
  };
}
