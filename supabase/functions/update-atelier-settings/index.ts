import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Salvează setări / branding atelier cu service role + self-heal admin.
 * Evită RLS care blochează redenumirea când atelier_membri.role != 'admin'.
 *
 * Body: { atelierId, patch: { nume?, short?, logo_url?, ... } }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PATCH_KEYS = [
  "nume",
  "short",
  "logo_url",
  "capacitate_zilnica",
  "prag_ridicare_zile",
  "prag_inactivitate_zile",
  "asiguratori",
  "termene_alerta_status",
  "plan",
  "trial_ends_at",
  "seat_limit",
] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const user = userData.user;
    const email = String(user.email || "").trim().toLowerCase();
    const body = await req.json().catch(() => ({}));
    const atelierId = String(body?.atelierId || body?.atelier_id || "").trim();
    const rawPatch = body?.patch && typeof body.patch === "object" ? body.patch : {};

    if (!atelierId) return json({ error: "atelierId lipsește." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership, error: memErr } = await admin
      .from("atelier_membri")
      .select("user_id, email, role")
      .eq("atelier_id", atelierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) return json({ error: memErr.message }, 500);
    if (!membership) {
      return json({ error: "Nu ești membru al acestui atelier." }, 403);
    }

    const { count: memberCount, error: countErr } = await admin
      .from("atelier_membri")
      .select("user_id", { count: "exact", head: true })
      .eq("atelier_id", atelierId);
    if (countErr) return json({ error: countErr.message }, 500);

    let isAdmin = membership.role === "admin";

    if (!isAdmin && memberCount === 1) {
      const { error: promoteErr } = await admin
        .from("atelier_membri")
        .update({ role: "admin", email: email || membership.email })
        .eq("atelier_id", atelierId)
        .eq("user_id", user.id);
      if (promoteErr) return json({ error: promoteErr.message }, 500);
      isAdmin = true;
    }

    if (!isAdmin && email) {
      const { data: setari } = await admin
        .from("setari")
        .select("admin_emails, utilizatori")
        .eq("id", 1)
        .maybeSingle();

      const inAdminEmails = Array.isArray(setari?.admin_emails)
        && setari.admin_emails.some((e: unknown) => String(e || "").toLowerCase() === email);
      const inUtilizatoriAdmin = Array.isArray(setari?.utilizatori)
        && setari.utilizatori.some(
          (u: { email?: string; role?: string }) =>
            String(u?.email || "").toLowerCase() === email
            && String(u?.role || "").toLowerCase() === "admin"
        );

      if (inAdminEmails || inUtilizatoriAdmin) {
        const { error: promoteErr } = await admin
          .from("atelier_membri")
          .update({ role: "admin", email })
          .eq("atelier_id", atelierId)
          .eq("user_id", user.id);
        if (promoteErr) return json({ error: promoteErr.message }, 500);
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return json({ error: "Doar administratorul atelierului poate modifica setările." }, 403);
    }

    const patch: Record<string, unknown> = {};
    for (const key of PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(rawPatch, key)) {
        patch[key] = rawPatch[key];
      }
    }
    if (Object.keys(patch).length === 0) {
      return json({ error: "patch gol." }, 400);
    }

    if ("nume" in patch) {
      const name = String(patch.nume ?? "").trim();
      if (name.length < 2) return json({ error: "Numele atelierului trebuie să aibă minim 2 caractere." }, 400);
      patch.nume = name;
    }
    if ("short" in patch) {
      const short = String(patch.short ?? "").trim().toUpperCase().slice(0, 4);
      patch.short = short || "AT";
    }
    if ("logo_url" in patch) {
      const logo = String(patch.logo_url ?? "").trim();
      patch.logo_url = logo || null;
    }
    if ("capacitate_zilnica" in patch) {
      patch.capacitate_zilnica = Math.max(1, Number(patch.capacitate_zilnica) || 1);
    }
    if ("prag_ridicare_zile" in patch) {
      patch.prag_ridicare_zile = Math.max(1, Number(patch.prag_ridicare_zile) || 1);
    }
    if ("prag_inactivitate_zile" in patch) {
      patch.prag_inactivitate_zile = Math.max(1, Number(patch.prag_inactivitate_zile) || 1);
    }
    if ("seat_limit" in patch) {
      patch.seat_limit = Math.max(1, Number(patch.seat_limit) || 1);
    }

    const { data: row, error: updErr } = await admin
      .from("ateliere")
      .update(patch)
      .eq("id", atelierId)
      .select(
        "id, slug, nume, short, logo_url, capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, asiguratori, termene_alerta_status, plan, trial_ends_at, seat_limit"
      )
      .maybeSingle();

    if (updErr) return json({ error: updErr.message }, 500);
    if (!row) return json({ error: "Atelier inexistent." }, 404);

    if (row.slug === "default") {
      const mirror: Record<string, unknown> = { id: 1 };
      if ("nume" in patch) mirror.atelier_nume = row.nume;
      if ("short" in patch) mirror.atelier_short = row.short;
      if ("logo_url" in patch) mirror.logo_url = row.logo_url;
      if ("capacitate_zilnica" in patch) mirror.capacitate_zilnica = row.capacitate_zilnica;
      if ("prag_ridicare_zile" in patch) mirror.prag_ridicare_zile = row.prag_ridicare_zile;
      if ("prag_inactivitate_zile" in patch) mirror.prag_inactivitate_zile = row.prag_inactivitate_zile;
      if ("asiguratori" in patch) mirror.asiguratori = row.asiguratori;
      if ("termene_alerta_status" in patch) mirror.termene_alerta_status = row.termene_alerta_status;
      if ("plan" in patch) mirror.plan = row.plan;
      if ("trial_ends_at" in patch) mirror.trial_ends_at = row.trial_ends_at;
      if ("seat_limit" in patch) mirror.seat_limit = row.seat_limit;
      if (Object.keys(mirror).length > 1) {
        const { error: mirrorErr } = await admin.from("setari").upsert(mirror);
        if (mirrorErr) console.warn("Mirror setari failed:", mirrorErr.message);
      }
    }

    return json({ ok: true, atelier: row });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Eroare necunoscută" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
