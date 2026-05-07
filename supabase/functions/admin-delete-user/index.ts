// Admin-only: permanently delete a user account and clean up related rows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const token = authHeader.slice("Bearer ".length);

  // Verify caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json(401, { error: "Unauthorized" });
  const callerId = claimsData.claims.sub as string;

  // Parse body
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const targetId: string | undefined = body?.user_id;
  if (!targetId || !UUID_RE.test(targetId)) return json(400, { error: "Invalid user_id" });
  if (targetId === callerId) return json(400, { error: "Cannot delete your own account" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Confirm caller is admin
  const { data: callerProfile, error: profErr } = await admin
    .from("user_profiles")
    .select("is_admin")
    .eq("id", callerId)
    .maybeSingle();
  if (profErr) return json(500, { error: "Lookup failed" });
  if (!callerProfile?.is_admin) return json(403, { error: "Forbidden" });

  // Cleanup related rows. Ignore individual errors so a missing/locked row
  // doesn't block the rest of the cascade.
  const tasks: Array<Promise<unknown>> = [
    admin.from("leaderboard_entries").delete().eq("user_id", targetId),
    admin.from("type_leaderboard_entries").delete().eq("user_id", targetId),
    admin.from("daily_scores").delete().eq("user_id", targetId),
    admin.from("user_progress").delete().eq("user_id", targetId),
    admin.from("admin_push_subscriptions").delete().eq("user_id", targetId),
    admin.from("bug_reports").delete().eq("user_id", targetId),
    admin.from("friend_requests").delete().or(`sender_id.eq.${targetId},receiver_id.eq.${targetId}`),
    admin.from("friendships").delete().or(`user_id_a.eq.${targetId},user_id_b.eq.${targetId}`),
  ];
  await Promise.allSettled(tasks);

  // Delete profile row last (before auth) so trigger cascades stay clean.
  await admin.from("user_profiles").delete().eq("id", targetId);

  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) return json(500, { error: `Auth delete failed: ${delErr.message}` });

  return json(200, { ok: true });
});
