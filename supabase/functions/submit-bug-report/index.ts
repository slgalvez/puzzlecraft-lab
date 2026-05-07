import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface BugReportBody {
  message?: unknown;
  contactEmail?: unknown;
  route?: unknown;
  userAgent?: unknown;
  platform?: unknown;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: BugReportBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = clean(body.message, 4000);
  if (!message || message.length < 10) {
    return json({ error: "Please describe the problem in at least 10 characters." }, 400);
  }

  const contactEmail = clean(body.contactEmail, 320);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return json({ error: "Invalid email address" }, 400);
  }

  const route = clean(body.route, 500);
  const userAgent = clean(body.userAgent, 500);
  const platform = clean(body.platform, 50);

  // Best-effort IP extraction
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ipAddress = xff.split(",")[0]?.trim() || null;

  // Resolve user from JWT if present
  let userId: string | null = null;
  let userEmail: string | null = contactEmail;
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await userClient.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? userEmail;
      }
    } catch {
      // ignore — treat as anonymous
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Soft IP rate limit: 10 per hour
  if (ipAddress) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("bug_reports")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .gte("created_at", since);
    if ((count ?? 0) >= 10) {
      return json({ error: "Too many reports from this device. Please try again later." }, 429);
    }
  }

  const { error } = await admin.from("bug_reports").insert({
    user_id: userId,
    user_email: userEmail,
    message,
    route,
    user_agent: userAgent,
    platform,
    ip_address: ipAddress,
  });

  if (error) {
    console.error("bug_report insert failed", error);
    return json({ error: "Failed to save report" }, 500);
  }

  // Fire-and-forget: notify admins
  (async () => {
    try {
      const { data: subs } = await admin
        .from("admin_push_subscriptions")
        .select("endpoint, p256dh, auth, user_id");
      if (!subs?.length) return;
      const payload = JSON.stringify({
        title: "New bug report",
        body: message.slice(0, 80),
        tag: "bug-report",
        url: "/admin-bug-reports",
      });
      const { sendWebPush } = await import("../admin-push/index.ts");
      await Promise.all(subs.map(async (s) => {
        try {
          const r = await sendWebPush(s.endpoint, s.p256dh, s.auth, payload);
          if (!r.ok && (r.status === 404 || r.status === 410)) {
            await admin.from("admin_push_subscriptions").delete()
              .eq("user_id", s.user_id).eq("endpoint", s.endpoint);
          }
        } catch (e) {
          console.error("admin push failed", e);
        }
      }));
    } catch (e) {
      console.error("admin notify error", e);
    }
  })();

  return json({ ok: true });
});

