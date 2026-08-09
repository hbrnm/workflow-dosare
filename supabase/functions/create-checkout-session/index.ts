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
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey || !priceId) {
      return json({
        error: "Stripe nu e configurat. Setează STRIPE_SECRET_KEY și STRIPE_PRICE_ID pe Edge Functions.",
      }, 503);
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
      // fallback global is_admin
      const { data: globalAdmin } = await caller.rpc("is_admin");
      if (!globalAdmin) return json({ error: "Doar adminii atelierului pot plăti." }, 403);
    } else if (!isAdmin) {
      return json({ error: "Doar adminii atelierului pot plăti." }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: atelier, error: atelierErr } = await admin
      .from("ateliere")
      .select("id, slug, nume, stripe_customer_id, plan")
      .eq("id", atelierId)
      .maybeSingle();
    if (atelierErr || !atelier) return json({ error: "Atelier inexistent." }, 404);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    let customerId = atelier.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email || undefined,
        name: atelier.nume || undefined,
        metadata: { atelier_id: atelier.id, slug: atelier.slug || "" },
      });
      customerId = customer.id;
      await admin
        .from("ateliere")
        .update({ stripe_customer_id: customerId })
        .eq("id", atelier.id);
    }

    const origin = String(body?.origin || req.headers.get("origin") || "").replace(/\/$/, "");
    const successBase = origin || "https://workflow-dosare.vercel.app";
    const slugQ = atelier.slug ? `atelier=${encodeURIComponent(atelier.slug)}&` : "";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successBase}/?${slugQ}billing=success`,
      cancel_url: `${successBase}/?${slugQ}billing=cancel`,
      client_reference_id: atelier.id,
      metadata: { atelier_id: atelier.id },
      subscription_data: {
        metadata: { atelier_id: atelier.id },
      },
      allow_promotion_codes: true,
    });

    return json({ ok: true, url: session.url });
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
