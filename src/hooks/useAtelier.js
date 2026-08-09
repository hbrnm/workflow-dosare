import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { normalizeBilling, DEFAULT_SEAT_LIMIT } from "../constants/billing";
import {
  loadActiveAtelierId,
  saveActiveAtelierId,
  readAtelierSlugFromUrl,
  writeAtelierSlugToUrl,
  resolveActiveMembership,
} from "../utils/atelierPrefs";

const ATELIER_SELECT =
  "id, slug, nume, short, logo_url, plan, trial_ends_at, seat_limit, capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, asiguratori, termene_alerta_status, stripe_customer_id, stripe_subscription_id";

/**
 * Resolve active atelier + billing. Supports switcher + ?atelier=slug.
 */
export function useAtelier(session, { usersList = [], billingFromSettings = null } = {}) {
  const [atelierId, setAtelierId] = useState(null);
  const [atelierRow, setAtelierRow] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [tenancyReady, setTenancyReady] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  const myId = session?.user?.id || null;

  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!session || !myId) {
      setAtelierId(null);
      setAtelierRow(null);
      setMemberships([]);
      setTenancyReady(false);
      setMemberCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("atelier_membri")
          .select(`atelier_id, role, email, ateliere(${ATELIER_SELECT})`)
          .eq("user_id", myId)
          .limit(20);

        if (error || !rows?.length) {
          // Fallback without embed if join fails
          const { data: flat, error: flatErr } = await supabase
            .from("atelier_membri")
            .select("atelier_id, role, email")
            .eq("user_id", myId)
            .limit(20);

          if (flatErr || !flat?.length) {
            if (!cancelled) {
              setAtelierId(null);
              setAtelierRow(null);
              setMemberships([]);
              setTenancyReady(false);
              setMemberCount(Array.isArray(usersList) ? usersList.length : 0);
            }
            return;
          }

          const ids = flat.map((m) => m.atelier_id);
          const { data: ateliers } = await supabase
            .from("ateliere")
            .select(ATELIER_SELECT)
            .in("id", ids);

          const byId = Object.fromEntries((ateliers || []).map((a) => [a.id, a]));
          const enriched = flat.map((m) => ({ ...m, atelier: byId[m.atelier_id] || null }));
          await applyMemberships(enriched, cancelled);
          return;
        }

        const enriched = rows.map((m) => ({
          atelier_id: m.atelier_id,
          role: m.role,
          email: m.email,
          atelier: Array.isArray(m.ateliere) ? m.ateliere[0] : m.ateliere,
        }));
        await applyMemberships(enriched, cancelled);
      } catch {
        if (!cancelled) {
          setTenancyReady(false);
          setAtelierId(null);
          setMemberships([]);
        }
      }
    })();

    async function applyMemberships(enriched, cancelledFlag) {
      if (cancelledFlag) return;
      const preferredSlug = readAtelierSlugFromUrl();
      const preferredId = loadActiveAtelierId();
      const active = resolveActiveMembership(enriched, { preferredId, preferredSlug });
      if (!active) {
        setMemberships(enriched);
        setTenancyReady(false);
        return;
      }

      let atelier = active.atelier;
      if (!atelier?.id) {
        const { data } = await supabase
          .from("ateliere")
          .select(ATELIER_SELECT)
          .eq("id", active.atelier_id)
          .maybeSingle();
        atelier = data;
      }

      const { count } = await supabase
        .from("atelier_membri")
        .select("user_id", { count: "exact", head: true })
        .eq("atelier_id", active.atelier_id);

      if (cancelledFlag) return;
      setMemberships(enriched);
      setAtelierId(active.atelier_id);
      setAtelierRow(atelier || { id: active.atelier_id });
      setTenancyReady(true);
      setMemberCount(typeof count === "number" ? count : 1);
      saveActiveAtelierId(active.atelier_id);
      if (atelier?.slug) writeAtelierSlugToUrl(atelier.slug);
    }

    return () => {
      cancelled = true;
    };
  }, [session, myId, usersList, reloadToken]);

  const switchAtelier = useCallback(
    async (nextId) => {
      if (!nextId || nextId === atelierId) return false;
      const membership = memberships.find((m) => m.atelier_id === nextId);
      if (!membership) return false;

      let atelier = membership.atelier;
      if (!atelier?.id) {
        const { data } = await supabase
          .from("ateliere")
          .select(ATELIER_SELECT)
          .eq("id", nextId)
          .maybeSingle();
        atelier = data;
      }

      const { count } = await supabase
        .from("atelier_membri")
        .select("user_id", { count: "exact", head: true })
        .eq("atelier_id", nextId);

      setAtelierId(nextId);
      setAtelierRow(atelier || { id: nextId });
      setMemberCount(typeof count === "number" ? count : 1);
      saveActiveAtelierId(nextId);
      if (atelier?.slug) writeAtelierSlugToUrl(atelier.slug);
      return true;
    },
    [atelierId, memberships]
  );

  const billing = useMemo(() => {
    const fromAtelier = atelierRow
      ? {
          plan: atelierRow.plan,
          trialEndsAt: atelierRow.trial_ends_at,
          seatLimit: atelierRow.seat_limit,
          stripeCustomerId: atelierRow.stripe_customer_id,
          stripeSubscriptionId: atelierRow.stripe_subscription_id,
        }
      : null;
    const source = fromAtelier || billingFromSettings || {};
    return normalizeBilling({
      plan: source.plan,
      trialEndsAt: source.trialEndsAt ?? source.trial_ends_at,
      seatLimit: source.seatLimit ?? source.seat_limit ?? DEFAULT_SEAT_LIMIT,
      memberCount: memberCount || (Array.isArray(usersList) ? usersList.length : 0),
      stripeCustomerId: source.stripeCustomerId ?? source.stripe_customer_id,
      stripeSubscriptionId: source.stripeSubscriptionId ?? source.stripe_subscription_id,
    });
  }, [atelierRow, billingFromSettings, memberCount, usersList]);

  const membershipOptions = useMemo(
    () =>
      memberships.map((m) => ({
        id: m.atelier_id,
        role: m.role,
        nume: m.atelier?.nume || "Atelier",
        short: m.atelier?.short || "AT",
        slug: m.atelier?.slug || "",
        logoUrl: m.atelier?.logo_url || null,
      })),
    [memberships]
  );

  return {
    atelierId,
    atelier: atelierRow,
    tenancyReady,
    billing,
    memberCount,
    memberships: membershipOptions,
    switchAtelier,
    refresh,
  };
}
