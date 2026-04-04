import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin status
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) return json({ error: "Forbidden" }, 403);

    const { action, email, note, id } = await req.json();

    // ── LIST ──
    if (action === "list") {
      const { data, error } = await adminClient
        .from("premium_emails")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ emails: data });
    }

    // ── ADD ──
    if (action === "add") {
      if (!email || typeof email !== "string") {
        return json({ error: "Email is required" }, 400);
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return json({ error: "Invalid email format" }, 400);
      }

      // Insert into premium_emails
      const { error: insertErr } = await adminClient
        .from("premium_emails")
        .insert({ email: cleanEmail, note: note || null });

      if (insertErr) {
        if (insertErr.code === "23505") {
          return json({ error: "Email already in list" }, 409);
        }
        return json({ error: insertErr.message }, 500);
      }

      // If user already has an account, grant premium immediately
      const { data: existingUser } = await adminClient.auth.admin.listUsers();
      const match = existingUser?.users?.find(
        (u: { email?: string }) => u.email === cleanEmail
      );
      if (match) {
        await adminClient
          .from("user_profiles")
          .update({ is_premium: true })
          .eq("id", match.id);
      }

      return json({ ok: true });
    }

    // ── REMOVE ──
    if (action === "remove") {
      if (!id) return json({ error: "ID is required" }, 400);

      // Get the email before deleting
      const { data: row } = await adminClient
        .from("premium_emails")
        .select("email")
        .eq("id", id)
        .single();

      const { error: delErr } = await adminClient
        .from("premium_emails")
        .delete()
        .eq("id", id);

      if (delErr) return json({ error: delErr.message }, 500);

      // Revoke premium from user if they exist (unless they have an active subscription)
      if (row?.email) {
        const { data: existingUser } = await adminClient.auth.admin.listUsers();
        const match = existingUser?.users?.find(
          (u: { email?: string }) => u.email === row.email
        );
        if (match) {
          const { data: userProfile } = await adminClient
            .from("user_profiles")
            .select("subscribed")
            .eq("id", match.id)
            .single();
          // Only revoke if they don't have an active paid subscription
          if (!userProfile?.subscribed) {
            await adminClient
              .from("user_profiles")
              .update({ is_premium: false })
              .eq("id", match.id);
          }
        }
      }

      return json({ ok: true });
    }

    // ── UPDATE NOTE ──
    if (action === "update-note") {
      if (!id) return json({ error: "ID is required" }, 400);
      const { error: upErr } = await adminClient
        .from("premium_emails")
        .update({ note: typeof note === "string" ? note.trim() || null : null })
        .eq("id", id);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
