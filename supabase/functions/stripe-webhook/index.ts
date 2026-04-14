import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function logWebhookEvent(fields: {
  event_id: string;
  event_type: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  supabase_user_id?: string | null;
  status: "success" | "skipped" | "error";
  error_message?: string | null;
}) {
  const { error } = await supabase.from("webhook_events").insert({
    event_id: fields.event_id,
    event_type: fields.event_type,
    stripe_customer_id: fields.stripe_customer_id ?? null,
    stripe_subscription_id: fields.stripe_subscription_id ?? null,
    supabase_user_id: fields.supabase_user_id ?? null,
    status: fields.status,
    error_message: fields.error_message ?? null,
  });
  if (error) console.error("[stripe-webhook] Audit log insert failed:", error);
}

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

  let auditCustomerId: string | null = null;
  let auditSubscriptionId: string | null = null;
  let auditUserId: string | null = null;
  let auditStatus: "success" | "skipped" | "error" = "success";

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.supabase_user_id;
        auditCustomerId = (session.customer as string) || null;
        auditSubscriptionId = (session.subscription as string) || null;
        auditUserId = userId || null;

        if (!userId) {
          console.error("[stripe-webhook] No user ID in checkout session");
          auditStatus = "skipped";
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
          auditStatus = "skipped";
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
        auditCustomerId = customerId || null;
        auditSubscriptionId = (invoice.subscription as string) || null;

        if (!customerId) {
          auditStatus = "skipped";
          break;
        }

        // Guard — don't overwrite admin-granted access
        const { data: paidProfile } = await supabase
          .from("user_profiles")
          .select("id, subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();

        auditUserId = paidProfile?.id ?? null;

        if (paidProfile?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping invoice.paid — user ${paidProfile.id} has admin_grant`);
          auditStatus = "skipped";
          break;
        }

        // Hard skip if not a subscription invoice
        if (!invoice.subscription) {
          console.log(`[stripe-webhook] invoice.paid — no subscription field, skipping for customer ${customerId}`);
          auditStatus = "skipped";
          break;
        }

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);

        // Only renew for active or trialing subscriptions
        if (sub.status !== "active" && sub.status !== "trialing") {
          console.log(`[stripe-webhook] invoice.paid — sub status is ${sub.status}, skipping renewal for customer ${customerId}`);
          auditStatus = "skipped";
          break;
        }

        const expiresAt = new Date(sub.current_period_end * 1000).toISOString();

        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscribed: true,
            subscription_expires_at: expiresAt,
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("[stripe-webhook] invoice.paid DB error:", error);
        } else {
          console.log(`[stripe-webhook] Renewed subscription for customer ${customerId} (user ${paidProfile?.id ?? "unknown"}, expires ${expiresAt})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        auditCustomerId = customerId || null;
        auditSubscriptionId = subscription.id || null;

        if (!customerId) {
          auditStatus = "skipped";
          break;
        }

        // Guard: don't revoke admin-granted access (also protected by DB trigger)
        const { data: profileToRevoke } = await supabase
          .from("user_profiles")
          .select("id, subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();

        auditUserId = profileToRevoke?.id ?? null;

        if (profileToRevoke?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping deletion — customer ${customerId} has admin_grant`);
          auditStatus = "skipped";
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
        auditCustomerId = customerId || null;
        auditSubscriptionId = (invoice.subscription as string) || null;

        if (!customerId) {
          auditStatus = "skipped";
          break;
        }

        // Guard: don't revoke admin-granted access
        const { data: failedProfile } = await supabase
          .from("user_profiles")
          .select("id, subscription_platform")
          .eq("stripe_customer_id", customerId)
          .single();

        auditUserId = failedProfile?.id ?? null;

        if (failedProfile?.subscription_platform === "admin_grant") {
          console.log(`[stripe-webhook] Skipping payment_failed — customer ${customerId} has admin_grant`);
          auditStatus = "skipped";
          break;
        }

        // Skip if not a subscription invoice
        if (!invoice.subscription) {
          console.log(`[stripe-webhook] payment_failed — no subscription field, skipping for customer ${customerId}`);
          auditStatus = "skipped";
          break;
        }

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        console.log(`[stripe-webhook] payment_failed — sub status is ${sub.status} for customer ${customerId}`);

        // Only revoke if Stripe has fully canceled — not during retry period
        if (sub.status !== "canceled") {
          console.log(`[stripe-webhook] payment_failed — sub not canceled (${sub.status}), skipping revoke for customer ${customerId}`);
          auditStatus = "skipped";
          break;
        }

        const { error } = await supabase
          .from("user_profiles")
          .update({ subscribed: false })
          .eq("stripe_customer_id", customerId);

        if (error) console.error("[stripe-webhook] payment_failed DB error:", error);
        else console.log(`[stripe-webhook] Revoked subscription (canceled after payment failed) for customer ${customerId}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    await logWebhookEvent({
      event_id: event.id,
      event_type: event.type,
      stripe_customer_id: auditCustomerId,
      stripe_subscription_id: auditSubscriptionId,
      supabase_user_id: auditUserId,
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return new Response("Webhook processing error", { status: 500 });
  }

  await logWebhookEvent({
    event_id: event.id,
    event_type: event.type,
    stripe_customer_id: auditCustomerId,
    stripe_subscription_id: auditSubscriptionId,
    supabase_user_id: auditUserId,
    status: auditStatus,
  });

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
