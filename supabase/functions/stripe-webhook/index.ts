import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  console.log(`[stripe-webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        if (!userId) {
          console.error("[stripe-webhook] No user ID in checkout session");
          break;
        }

        // Guard: don't overwrite admin-granted access
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("subscription_platform")
          .eq("id", userId)
          .single();
        if (existingProfile?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping checkout — user ${userId} has admin_grant`);
          break;
        }

        const customerId = session.customer as string;
        let expiresAt: string | null = null;

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        }

        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscribed: true,
            subscription_platform: "stripe",
            subscription_expires_at: expiresAt,
            stripe_customer_id: customerId,
            is_premium: true,
          })
          .eq("id", userId);

        if (error) console.error("[stripe-webhook] DB update error:", error);
        else console.log(`[stripe-webhook] Activated subscription for user ${userId}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        // Fix 1: Guard — don't overwrite admin-granted access
        const { data: paidProfile } = await supabase
          .from("user_profiles")
          .select("id, subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();

        if (paidProfile?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping invoice.paid — user ${paidProfile.id} has admin_grant`);
          break;
        }

        let expiresAt: string | null = null;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          expiresAt = new Date(sub.current_period_end * 1000).toISOString();
        }

        const { error, count } = await supabase
          .from("user_profiles")
          .update({
            subscribed: true,
            subscription_expires_at: expiresAt,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] invoice.paid DB error:", error);
        } else if (count === 0) {
          console.warn(`[stripe-webhook] invoice.paid — 0 rows updated for customer ${customerId} (user may not exist)`);
        } else {
          console.log(`[stripe-webhook] Renewed subscription for customer ${customerId} (user ${paidProfile?.id ?? "unknown"})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;

        // Guard: don't revoke admin-granted access (also protected by DB trigger)
        const { data: profileToRevoke } = await supabase
          .from("user_profiles")
          .select("subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();
        if (profileToRevoke?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping deletion — customer ${customerId} has admin_grant`);
          break;
        }

        // Fix 4: Clean up subscription_expires_at on deletion
        const { error } = await supabase
          .from("user_profiles")
          .update({ subscribed: false, subscription_expires_at: null })
          .eq("stripe_customer_id", customerId);

        if (error) console.error("[stripe-webhook] deletion DB error:", error);
        else console.log(`[stripe-webhook] Revoked subscription for customer ${customerId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        // Guard: don't revoke admin-granted access
        const { data: failedProfile } = await supabase
          .from("user_profiles")
          .select("subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();
        if (failedProfile?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping payment_failed — customer ${customerId} has admin_grant`);
          break;
        }

        // Fix 2: Only revoke if Stripe has fully canceled — not during retry period
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          if (sub.status === "past_due" || sub.status === "unpaid") {
            console.log(`[stripe-webhook] payment_failed but sub status is ${sub.status} — Stripe still retrying, skipping revoke for customer ${customerId}`);
            break;
          }
          if (sub.status !== "canceled") {
            console.log(`[stripe-webhook] payment_failed with sub status ${sub.status} — not revoking for customer ${customerId}`);
            break;
          }
        }

        const { error } = await supabase
          .from("user_profiles")
          .update({ subscribed: false })
          .eq("stripe_customer_id", customerId);

        if (error) console.error("[stripe-webhook] payment_failed DB error:", error);
        else console.log(`[stripe-webhook] Revoked subscription (payment failed, sub canceled) for customer ${customerId}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
