import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAdminWebPush } from "../_shared/webpush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });


  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const sb = createClient(SUPABASE_URL, SR);
    const { data: prof } = await sb
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!prof?.is_admin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action;

    if (action === "subscribe") {
      const { endpoint, p256dh, auth: authKey } = body;
      if (!endpoint || !p256dh || !authKey) return json({ error: "Missing fields" }, 400);
      const { error } = await sb.from("admin_push_subscriptions").upsert(
        { user_id: userId, endpoint, p256dh, auth: authKey },
        { onConflict: "user_id,endpoint" }
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "unsubscribe") {
      const { endpoint } = body;
      let q = sb.from("admin_push_subscriptions").delete().eq("user_id", userId);
      if (endpoint) q = q.eq("endpoint", endpoint);
      const { error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "test") {
      const { data: subs } = await sb
        .from("admin_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (!subs || subs.length === 0) return json({ ok: false, error: "No subscriptions" });
      const payload = JSON.stringify({
        title: "Test alert",
        body: "Admin push notifications are working.",
        tag: "admin-test",
        url: "/admin-bug-reports",
      });
      let sent = 0;
      for (const s of subs) {
        const r = await sendAdminWebPush(s.endpoint, s.p256dh, s.auth, payload);
        if (r.ok) sent++;
        else if (r.status === 404 || r.status === 410) {
          await sb.from("admin_push_subscriptions").delete()
            .eq("user_id", userId).eq("endpoint", s.endpoint);
        }
      }
      return json({ ok: sent > 0, sent });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-push error:", e);
    return json({ error: String(e) }, 500);
  }
});
