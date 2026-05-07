/**
 * change-subscription-plan/index.ts
 *
 * Switch the authenticated user's active Stripe subscription between Monthly and Annual.
 * Requires an active subscription. Uses proration_behavior: 'create_prorations'.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const MONTHLY_PRICE_ID = "price_1TDHYZI2mQ3QaWmEly0lqHqQ";
const ANNUAL_PRICE_ID  = "price_1TMDohI2mQ3QaWmEMXCAR3FH";

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
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const target = body?.plan as "monthly" | "annual" | undefined;
    if (target !== "monthly" && target !== "annual") {
      return json({ error: "plan must be 'monthly' or 'annual'" }, 400);
    }
    const targetPrice = target === "annual" ? ANNUAL_PRICE_ID : MONTHLY_PRICE_ID;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) return json({ error: "No Stripe customer found" }, 404);
    const customerId = customers.data[0].id;

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length === 0) return json({ error: "No active subscription found" }, 404);
    const sub = subs.data[0];
    const item = sub.items.data[0];

    if (item.price.id === targetPrice) {
      return json({ ok: true, alreadyOnPlan: true });
    }

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: targetPrice }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
    });

    // Update local DB so UI reflects the new period end immediately
    const periodEnd = (updated as any).current_period_end as number | undefined;
    if (periodEnd) {
      await supabase
        .from("user_profiles")
        .update({
          subscription_expires_at: new Date(periodEnd * 1000).toISOString(),
          subscription_platform: "stripe",
          subscribed: true,
          is_premium: true,
          stripe_customer_id: customerId,
        })
        .eq("id", user.id);
    }

    return json({ ok: true, plan: target, subscriptionId: updated.id });
  } catch (err) {
    console.error("[change-subscription-plan] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
