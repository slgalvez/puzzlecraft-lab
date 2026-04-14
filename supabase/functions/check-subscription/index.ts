/**
 * check-subscription/index.ts
 * supabase/functions/check-subscription/index.ts
 *
 * SERVER-SIDE SUBSCRIPTION VALIDATION — SOURCE OF TRUTH
 *
 * Called by UserAccountContext every 60 seconds and on every auth session load.
 * Uses service role key — cannot be spoofed by client.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ subscribed: false, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ subscribed: false, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("subscribed, subscription_expires_at, is_admin, subscription_platform")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ subscribed: false, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admins always have access
    if (profile.is_admin) {
      return new Response(
        JSON.stringify({ subscribed: true, subscription_end: null, is_admin: true, source: "admin_grant" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin-granted subscription (protected by DB trigger)
    if (profile.subscription_platform === "admin_grant" && profile.subscribed) {
      return new Response(
        JSON.stringify({ subscribed: true, subscription_end: null, source: "admin_grant" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    const now = new Date();
    const expiresAt = profile.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null;

    const isExpired = expiresAt !== null && expiresAt <= now;
    const activeSubscription = profile.subscribed === true && !isExpired;

    // Auto-revoke expired subscriptions (Fix 3: skip admin_grant users)
    if (profile.subscribed && isExpired && profile.subscription_platform !== 'admin_grant') {
      await supabase
        .from("user_profiles")
        .update({ subscribed: false })
        .eq("id", user.id);
    }

    return new Response(
      JSON.stringify({
        subscribed: activeSubscription,
        subscription_end: profile.subscription_expires_at ?? null,
        platform: profile.subscription_platform ?? null,
        source: activeSubscription ? (profile.subscription_platform || "stripe") : "none",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[check-subscription] Error:", err);
    return new Response(
      JSON.stringify({ subscribed: false, subscription_end: null }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
