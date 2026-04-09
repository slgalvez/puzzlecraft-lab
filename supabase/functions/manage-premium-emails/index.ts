/**
 * manage-premium-emails/index.ts
 *
 * FIX: When admin adds an email, the previous version only wrote to
 * premium_emails but never touched user_profiles. So check-subscription
 * looked at user_profiles.subscribed (still false) and returned false.
 *
 * THIS VERSION:
 * - On "add": writes to premium_email_list AND immediately grants premium
 *   on user_profiles for any matching existing account.
 * - On "remove": revokes premium from user_profiles too.
 * - Adds a "sync" action to manually backfill all listed emails.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(authHeader: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return false;
  const { data } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return !!(data as any)?.is_admin;
}

async function grantPremiumByEmail(email: string): Promise<void> {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error || !users) return;

  const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) return;

  await supabase
    .from("user_profiles")
    .update({
      subscribed:                true,
      is_premium:                true,
      subscription_platform:     "admin_grant",
      subscription_expires_at:   null,
      updated_at:                new Date().toISOString(),
    })
    .eq("id", match.id);
}

async function revokePremiumByEmail(email: string): Promise<void> {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error || !users) return;

  const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) return;

  await supabase
    .from("user_profiles")
    .update({
      subscribed:              false,
      is_premium:              false,
      subscription_platform:   null,
      subscription_expires_at: null,
      updated_at:              new Date().toISOString(),
    })
    .eq("id", match.id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!(await isAdmin(authHeader))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? "";

  try {
    // ── LIST ──────────────────────────────────────────────────────────────
    if (action === "list") {
      const { data, error } = await supabase
        .from("premium_email_list")
        .select("id, email, note, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(
        JSON.stringify({ emails: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ADD ───────────────────────────────────────────────────────────────
    if (action === "add") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await supabase
        .from("premium_email_list")
        .insert({ email, note: body.note ?? null });

      if (insertError) {
        const isDupe = insertError.code === "23505";
        return new Response(
          JSON.stringify({ error: isDupe ? "Email already in list" : insertError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await grantPremiumByEmail(email);

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REMOVE ────────────────────────────────────────────────────────────
    if (action === "remove") {
      const { id } = body;
      if (!id) {
        return new Response(
          JSON.stringify({ error: "ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: row } = await supabase
        .from("premium_email_list")
        .select("email")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("premium_email_list")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (row?.email) await revokePremiumByEmail(row.email);

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPDATE-NOTE ───────────────────────────────────────────────────────
    if (action === "update-note") {
      const { id, note } = body;
      const { error } = await supabase
        .from("premium_email_list")
        .update({ note: note ?? null })
        .eq("id", id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SYNC ─────────────────────────────────────────────────────────────
    if (action === "sync") {
      const { data: list } = await supabase
        .from("premium_email_list")
        .select("email");

      const emails = (list ?? []).map((r: any) => r.email);
      const results: { email: string; granted: boolean }[] = [];

      for (const email of emails) {
        await grantPremiumByEmail(email);
        results.push({ email, granted: true });
      }

      return new Response(
        JSON.stringify({ ok: true, synced: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[manage-premium-emails]", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
