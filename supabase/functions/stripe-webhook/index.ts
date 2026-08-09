import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

/**
 * Stripe webhook — updates ateliere.plan / stripe_* columns.
 * verify_jwt = false; validates Stripe-Signature.
 */

Deno.serve(async (req: Request) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response("Misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("No signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const atelierId =
          session.metadata?.atelier_id ||
          session.client_reference_id ||
          null;
        if (atelierId) {
          await admin
            .from("ateliere")
            .update({
              plan: "active",
              stripe_customer_id: String(session.customer || "") || undefined,
              stripe_subscription_id: String(session.subscription || "") || undefined,
              trial_ends_at: null,
            })
            .eq("id", atelierId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const atelierId = sub.metadata?.atelier_id || null;
        const plan = mapSubscriptionPlan(sub);
        const patch: Record<string, unknown> = {
          plan,
          stripe_subscription_id: sub.id,
          stripe_customer_id: String(sub.customer || ""),
        };
        if (atelierId) {
          await admin.from("ateliere").update(patch).eq("id", atelierId);
        } else if (sub.customer) {
          await admin
            .from("ateliere")
            .update(patch)
            .eq("stripe_customer_id", String(sub.customer));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "");
        if (customerId) {
          await admin
            .from("ateliere")
            .update({ plan: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = String(invoice.customer || "");
        if (customerId && invoice.billing_reason !== "subscription_create") {
          await admin
            .from("ateliere")
            .update({ plan: "active" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

function mapSubscriptionPlan(sub: Stripe.Subscription): string {
  if (sub.status === "canceled" || sub.status === "unpaid") return "canceled";
  if (sub.status === "past_due" || sub.status === "incomplete") return "past_due";
  if (sub.status === "trialing") return "trial";
  if (sub.status === "active") return "active";
  return "past_due";
}
