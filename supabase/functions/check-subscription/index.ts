/**
 * check-subscription/index.ts
 *
 * Server-side subscription validation. Called by UserAccountContext on auth load + every 60s.
 *
 * Self-healing: if the local DB shows unsubscribed but Stripe has an active subscription
 * for this user's email, we reconcile and write the row. This protects against missed
 * webhooks (e.g. endpoint not configured / wrong signing secret).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2025-08-27.basil" }) : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ subscribed: false, subscription_end: null });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ subscribed: false, subscription_end: null });

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("subscribed, subscription_expires_at, is_admin, subscription_platform, stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) return json({ subscribed: false, subscription_end: null });

    // Admins always have access
    if (profile.is_admin) {
      return json({ subscribed: true, subscription_end: null, is_admin: true, source: "admin_grant" });
    }

    // Admin-granted subscription (protected by DB trigger)
    if (profile.subscription_platform === "admin_grant" && profile.subscribed) {
      return json({ subscribed: true, subscription_end: null, source: "admin_grant" });
    }

    const now = new Date();
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
    const isExpired = expiresAt !== null && expiresAt <= now;
    let activeSubscription = profile.subscribed === true && !isExpired;

    // Auto-revoke locally expired subs (skip admin grants)
    if (profile.subscribed && isExpired && profile.subscription_platform !== "admin_grant") {
      await supabase.from("user_profiles").update({ subscribed: false }).eq("id", user.id);
      activeSubscription = false;
    }

    let priceId: string | null = null;

    // ─── SELF-HEAL: reconcile against Stripe if DB says unsubscribed ───
    if (!activeSubscription && stripe && user.email && profile.subscription_platform !== "admin_grant") {
      try {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 1,
          });
          if (subs.data.length > 0) {
            const sub = subs.data[0];
            const periodEnd = (sub as any).current_period_end as number | undefined;
            const newExpiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
            priceId = sub.items.data[0]?.price?.id ?? null;

            await supabase
              .from("user_profiles")
              .update({
                subscribed: true,
                is_premium: true,
                stripe_customer_id: customerId,
                subscription_platform: "stripe",
                subscription_expires_at: newExpiresAt,
              })
              .eq("id", user.id);

            console.log(`[check-subscription] Reconciled ${user.email} from Stripe sub ${sub.id}`);

            return json({
              subscribed: true,
              subscription_end: newExpiresAt,
              platform: "stripe",
              source: "stripe",
              price_id: priceId,
              reconciled: true,
            });
          }
        }
      } catch (reconcileErr) {
        console.error("[check-subscription] Reconcile failed:", reconcileErr);
      }
    }

    // For active stripe subs, also fetch current price_id (cheap; one Stripe call)
    if (activeSubscription && stripe && user.email && profile.subscription_platform === "stripe") {
      try {
        const customerId = profile.stripe_customer_id;
        let subs;
        if (customerId) {
          subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
        } else {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length > 0) {
            subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
          }
        }
        if (subs && subs.data.length > 0) {
          priceId = subs.data[0].items.data[0]?.price?.id ?? null;
        }
      } catch (e) {
        console.error("[check-subscription] price lookup failed:", e);
      }
    }

    return json({
      subscribed: activeSubscription,
      subscription_end: profile.subscription_expires_at ?? null,
      platform: profile.subscription_platform ?? null,
      source: activeSubscription ? (profile.subscription_platform || "stripe") : "none",
      price_id: priceId,
    });
  } catch (err) {
    console.error("[check-subscription] Error:", err);
    return json({ subscribed: false, subscription_end: null });
  }
});
