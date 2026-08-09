import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey) {
      return json({ error: "Stripe nu e configurat." }, 503);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const atelierId = String(body?.atelierId || "").trim();
    if (!atelierId) return json({ error: "atelierId lipsește." }, 400);

    const { data: isAdmin, error: adminErr } = await caller.rpc("is_atelier_admin", {
      p_atelier_id: atelierId,
    });
    if (adminErr) {
      const { data: globalAdmin } = await caller.rpc("is_admin");
      if (!globalAdmin) return json({ error: "Doar adminii atelierului." }, 403);
    } else if (!isAdmin) {
      return json({ error: "Doar adminii atelierului." }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: atelier } = await admin
      .from("ateliere")
      .select("id, slug, stripe_customer_id")
      .eq("id", atelierId)
      .maybeSingle();
    if (!atelier?.stripe_customer_id) {
      return json({ error: "Niciun client Stripe — activează abonamentul mai întâi." }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = String(body?.origin || req.headers.get("origin") || "").replace(/\/$/, "");
    const returnBase = origin || "https://workflow-dosare.vercel.app";
    const slugQ = atelier.slug ? `?atelier=${encodeURIComponent(atelier.slug)}` : "";

    const portal = await stripe.billingPortal.sessions.create({
      customer: atelier.stripe_customer_id,
      return_url: `${returnBase}/${slugQ}`,
    });

    return json({ ok: true, url: portal.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
