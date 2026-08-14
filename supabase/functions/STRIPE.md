# Stripe setup (Workflow Dosare)

## 1. Stripe Dashboard
1. Creează Product „Workflow Dosare” + Price lunar
2. Copiază Price ID (`price_…`)

## 2. Supabase secrets
```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_… \
  STRIPE_PRICE_ID=price_… \
  STRIPE_WEBHOOK_SECRET=whsec_… \
  --project-ref cfkyminejjnrwxrdlndt
```

## 3. Deploy functions
```bash
npx supabase functions deploy create-checkout-session --project-ref cfkyminejjnrwxrdlndt
npx supabase functions deploy create-portal-session --project-ref cfkyminejjnrwxrdlndt
npx supabase functions deploy stripe-webhook --project-ref cfkyminejjnrwxrdlndt
```

## 4. Webhook endpoint
URL: `https://cfkyminejjnrwxrdlndt.supabase.co/functions/v1/stripe-webhook`

Events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

## 5. Customer Portal
Stripe → Settings → Billing → Customer portal → activare.
