# Street Insights Supabase Setup

**New Supabase Project:** xtyfljmwfwhzthwdhkly  
**URL:** https://xtyfljmwfwhzthwdhkly.supabase.co

## 1. Run Database Migrations

Go to: https://supabase.com/dashboard/project/xtyfljmwfwhzthwdhkly/editor

Run each migration file in order:

1. `supabase/migrations/create_user_profiles.sql`
2. `supabase/migrations/create_user_watchlist.sql`
3. `supabase/migrations/create_source_follows.sql`
4. `supabase/migrations/create_options_flow.sql`
5. `supabase/migrations/create_content_drafts.sql`
6. `supabase/migrations/add_earnings_window_to_predictions.sql`
7. `supabase/migrations/add_bot_channels_to_alert_preferences.sql`

## 2. Deploy Edge Functions

Go to: https://supabase.com/dashboard/project/xtyfljmwfwhzthwdhkly/functions

### Deploy stripe-checkout
- Click "Create a new function"
- Name: `stripe-checkout`
- Upload: `supabase/functions/stripe-checkout/index.ts`
- Deploy

### Deploy stripe-webhook
- Click "Create a new function"
- Name: `stripe-webhook`
- Upload: `supabase/functions/stripe-webhook/index.ts`
- Deploy

## 3. Add Supabase Secrets

Go to: https://supabase.com/dashboard/project/xtyfljmwfwhzthwdhkly/settings/vault

Add these secrets (for Edge Functions to use):

```
STRIPE_SECRET_KEY=[from Stripe dashboard]
STRIPE_PRICE_PRO_MONTHLY=price_1TNFOqIwvcULtHy2yz7BT9Oz
STRIPE_PRICE_PRO_YEARLY=price_1TNFOqIwvcULtHy2pu4IMhRD
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1TNFOrIwvcULtHy2LSk8ArY0
STRIPE_PRICE_ENTERPRISE_YEARLY=price_1TNFOrIwvcULtHy2kCw0fsIZ
```

(Stripe secret key is already in Vercel - get from there or Stripe dashboard)

You'll add `STRIPE_WEBHOOK_SECRET` after step 4.

## 4. Configure Stripe Webhook

Go to: https://dashboard.stripe.com/webhooks

- Click "Add endpoint"
- URL: `https://xtyfljmwfwhzthwdhkly.supabase.co/functions/v1/stripe-webhook`
- Select events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Save and copy the **Webhook Signing Secret**
- Add it to Supabase secrets as: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 5. Verify Setup

Test the flow:
1. Go to: https://app.getstreetinsights.com/pricing
2. Click "Get Started" on a plan
3. Sign up with a test email
4. Should redirect to Stripe checkout
5. Use test card: `4242 4242 4242 4242`
6. After payment, should redirect back and update user profile

## Status

- ✅ Local .env updated with new credentials
- ✅ Vercel production env updated with new credentials
- ✅ Stripe keys already in Vercel
- ⏳ Database migrations need to be run
- ⏳ Edge Functions need to be deployed
- ⏳ Supabase secrets need to be added
- ⏳ Stripe webhook needs to be configured
