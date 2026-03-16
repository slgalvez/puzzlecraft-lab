import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface JwtPayload {
  sub: string;
  role: string;
  first_name: string;
  last_name: string;
  exp: number;
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token || token.split(".").length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = token.split(".");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  let sigRestored = sigB64.replace(/-/g, "+").replace(/_/g, "/");
  while (sigRestored.length % 4) sigRestored += "=";
  const sigBytes = Uint8Array.from(atob(sigRestored), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(`${headerB64}.${payloadB64}`));
  if (!valid) return null;
  const payload = JSON.parse(atob(payloadB64)) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function err(msg: string, status = 403) {
  return json({ error: msg }, status);
}

/** Parse duration string like '1h', '24h', '7d' into milliseconds */
function parseDuration(dur: string): number {
  const match = dur.match(/^(\d+)(h|d)$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h
  const val = parseInt(match[1]);
  if (match[2] === "h") return val * 60 * 60 * 1000;
  return val * 24 * 60 * 60 * 1000;
}

const VALID_DURATIONS = ["view-once", "1h", "24h", "7d"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body;

    const user = await verifyToken(token);
    if (!user) return err("Access unavailable", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const profileId = user.sub;
    const isAdmin = user.role === "admin";
    const now = new Date().toISOString();

    // ─── GET MY CONVERSATION (user) ───
    if (action === "get-my-conversation") {
      if (isAdmin) return err("Use admin actions");

      let { data: conv } = await sb
        .from("conversations")
        .select("id, admin_profile_id, disappearing_enabled, disappearing_duration")
        .eq("user_profile_id", profileId)
        .maybeSingle();

      if (!conv) {
        const { data: admin } = await sb.from("profiles").select("id").eq("role", "admin").limit(1).single();
        if (!admin) return err("System not ready");

        const { data: newConv, error: convErr } = await sb
          .from("conversations")
          .insert({ user_profile_id: profileId, admin_profile_id: admin.id })
          .select("id, admin_profile_id, disappearing_enabled, disappearing_duration")
          .single();
        if (convErr) {
          console.error("Create conversation error:", JSON.stringify(convErr));
          return err("Could not create conversation");
        }
        conv = newConv;
      }

      // Clean up read view-once messages (only when view-once mode is active)
      if (conv.disappearing_duration === "view-once") {
        await sb
          .from("messages")
          .delete()
          .eq("conversation_id", conv.id)
          .eq("is_disappearing", true)
          .neq("sender_profile_id", profileId)
          .not("read_at", "is", null);
      }

      // Get messages, filtering out expired ones
      const { data: messages } = await sb
        .from("messages")
        .select("id, sender_profile_id, body, created_at, read_at, is_disappearing, expires_at")
        .eq("conversation_id", conv.id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: true })
        .limit(200);

      // Count unread from admin
      const { count: unreadCount } = await sb
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_profile_id", profileId)
        .is("read_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      return json({
        conversation: {
          id: conv.id,
          admin_profile_id: conv.admin_profile_id,
          disappearing_enabled: conv.disappearing_enabled,
          disappearing_duration: conv.disappearing_duration,
        },
        messages: messages || [],
        unread_count: unreadCount || 0,
      });
    }

    // ─── SEND MESSAGE ───
    if (action === "send-message") {
      const { conversation_id, message } = body;
      if (!conversation_id || !message || typeof message !== "string" || message.trim().length === 0) return err("Invalid message", 400);
      if (message.length > 5000) return err("Message too long", 400);

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id, disappearing_enabled, disappearing_duration").eq("id", conversation_id).single();
      if (!conv) return err("Conversation not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      // Calculate expires_at if disappearing mode is on
      let expires_at: string | null = null;
      let is_disappearing = false;
      if (conv.disappearing_enabled) {
        is_disappearing = true;
        if (conv.disappearing_duration === "view-once") {
          // View-once: set a far-future expiry; actual deletion happens on mark-read
          expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          const ms = parseDuration(conv.disappearing_duration);
          expires_at = new Date(Date.now() + ms).toISOString();
        }
      }

      const { data: msg, error: msgErr } = await sb
        .from("messages")
        .insert({ conversation_id, sender_profile_id: profileId, body: message.trim(), is_disappearing, expires_at })
        .select("id, sender_profile_id, body, created_at, read_at, is_disappearing, expires_at")
        .single();

      if (msgErr) return err("Could not send message");
      return json({ message: msg });
    }

    // ─── MARK READ ───
    if (action === "mark-read") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", conversation_id).single();
      if (!conv) return err("Not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      // Mark unread messages as read
      await sb
        .from("messages")
        .update({ read_at: now })
        .eq("conversation_id", conversation_id)
        .neq("sender_profile_id", profileId)
        .is("read_at", null);

      // Delete view-once messages that were just read (sent by the other party)
      const { data: convForViewOnce } = await sb
        .from("conversations")
        .select("disappearing_duration")
        .eq("id", conversation_id)
        .single();

      if (convForViewOnce?.disappearing_duration === "view-once") {
        await sb
          .from("messages")
          .delete()
          .eq("conversation_id", conversation_id)
          .eq("is_disappearing", true)
          .neq("sender_profile_id", profileId)
          .not("read_at", "is", null);
      }

      return json({ ok: true });
    }

    // ─── TOGGLE DISAPPEARING ───
    if (action === "toggle-disappearing") {
      const { conversation_id, enabled, duration } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);
      if (typeof enabled !== "boolean") return err("Invalid params", 400);

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", conversation_id).single();
      if (!conv) return err("Not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      const dur = duration && VALID_DURATIONS.includes(duration) ? duration : "24h";

      const { error: updateErr } = await sb
        .from("conversations")
        .update({
          disappearing_enabled: enabled,
          disappearing_duration: dur,
          disappearing_enabled_by: profileId,
          disappearing_updated_at: now,
        })
        .eq("id", conversation_id);

      if (updateErr) return err("Could not update setting");
      return json({ ok: true, disappearing_enabled: enabled, disappearing_duration: dur });
    }

    // ─── ADMIN: LIST CONVERSATIONS ───
    if (action === "list-conversations") {
      if (!isAdmin) return err("Access denied");

      const { data: convs } = await sb
        .from("conversations")
        .select(`
          id,
          user_profile_id,
          created_at,
          disappearing_enabled,
          disappearing_duration,
          profiles!conversations_user_profile_id_fkey (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      const results = [];
      for (const c of convs || []) {
        const { data: lastMsg } = await sb
          .from("messages")
          .select("body, created_at, sender_profile_id")
          .eq("conversation_id", c.id)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_profile_id", profileId)
          .is("read_at", null)
          .or(`expires_at.is.null,expires_at.gt.${now}`);

        const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;

        results.push({
          id: c.id,
          user_profile_id: c.user_profile_id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
          last_message: lastMsg?.body || null,
          last_message_at: lastMsg?.created_at || c.created_at,
          unread_count: unreadCount || 0,
          disappearing_enabled: c.disappearing_enabled,
          disappearing_duration: c.disappearing_duration,
        });
      }

      results.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      return json({ conversations: results });
    }

    // ─── ADMIN: GET CONVERSATION ───
    if (action === "get-conversation") {
      if (!isAdmin) return err("Access denied");
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      const { data: conv } = await sb
        .from("conversations")
        .select(`id, user_profile_id, admin_profile_id, disappearing_enabled, disappearing_duration, profiles!conversations_user_profile_id_fkey (first_name, last_name)`)
        .eq("id", conversation_id)
        .single();
      if (!conv) return err("Not found");

      // Clean up read view-once messages (only when view-once mode is active)
      if (conv.disappearing_duration === "view-once") {
        await sb
          .from("messages")
          .delete()
          .eq("conversation_id", conversation_id)
          .eq("is_disappearing", true)
          .neq("sender_profile_id", profileId)
          .not("read_at", "is", null);
      }

      const { data: messages } = await sb
        .from("messages")
        .select("id, sender_profile_id, body, created_at, read_at, is_disappearing, expires_at")
        .eq("conversation_id", conversation_id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: true })
        .limit(200);

      const profile = conv.profiles as unknown as { first_name: string; last_name: string } | null;

      return json({
        conversation: {
          id: conv.id,
          user_profile_id: conv.user_profile_id,
          admin_profile_id: conv.admin_profile_id,
          user_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
          disappearing_enabled: conv.disappearing_enabled,
          disappearing_duration: conv.disappearing_duration,
        },
        messages: messages || [],
      });
    }

    // ─── ADMIN: TOGGLE USER ACTIVE ───
    if (action === "toggle-user-active") {
      if (!isAdmin) return err("Access denied");
      const { authorized_user_id, is_active } = body;
      if (!authorized_user_id || typeof is_active !== "boolean") return err("Invalid params", 400);

      const { error: updateErr } = await sb
        .from("authorized_users")
        .update({ is_active })
        .eq("id", authorized_user_id)
        .neq("id", profileId);

      if (updateErr) return err("Update failed");
      return json({ ok: true });
    }

    // ─── ADMIN: LIST USERS ───
    if (action === "list-users") {
      if (!isAdmin) return err("Access denied");

      const { data: users } = await sb
        .from("authorized_users")
        .select("id, first_name, last_name, is_active, created_at")
        .order("created_at", { ascending: true });

      const { data: profiles } = await sb.from("profiles").select("id, authorized_user_id, role");
      const profileMap = new Map((profiles || []).map((p) => [p.authorized_user_id, p]));

      const result = (users || []).map((u) => {
        const p = profileMap.get(u.id);
        return { ...u, profile_id: p?.id, role: p?.role || "user" };
      });

      return json({ users: result });
    }

    // ─── ADMIN: ADD USER ───
    if (action === "add-user") {
      if (!isAdmin) return err("Access denied");
      const { first_name, last_name, password } = body;
      if (!first_name || !last_name || !password || typeof first_name !== "string" || typeof last_name !== "string" || typeof password !== "string") {
        return err("Missing fields", 400);
      }
      if (first_name.trim().length === 0 || last_name.trim().length === 0 || password.length < 4) {
        return err("Invalid fields", 400);
      }

      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
      const saltB64 = btoa(String.fromCharCode(...salt));
      const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
      const password_hash = `pbkdf2:100000:${saltB64}:${hashB64}`;

      const { data: newUser, error: insertErr } = await sb
        .from("authorized_users")
        .insert({ first_name: first_name.trim(), last_name: last_name.trim(), password_hash })
        .select("id, first_name, last_name")
        .single();

      if (insertErr) {
        if (insertErr.message?.includes("duplicate") || insertErr.message?.includes("unique")) {
          return err("A user with that name already exists", 400);
        }
        return err("Could not create user", 400);
      }

      const { error: profileErr } = await sb
        .from("profiles")
        .insert({ authorized_user_id: newUser.id, first_name: newUser.first_name, last_name: newUser.last_name, role: "user" });

      if (profileErr) return err("User created but profile failed", 500);
      return json({ user: newUser });
    }

    // ─── ADMIN: RESET PASSWORD ───
    if (action === "reset-password") {
      if (!isAdmin) return err("Access denied");
      const { authorized_user_id, new_password } = body;
      if (!authorized_user_id || !new_password || typeof new_password !== "string") return err("Missing fields", 400);
      if (new_password.length < 4) return err("Password must be at least 4 characters", 400);

      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(new_password), "PBKDF2", false, ["deriveBits"]);
      const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
      const saltB64 = btoa(String.fromCharCode(...salt));
      const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
      const password_hash = `pbkdf2:100000:${saltB64}:${hashB64}`;

      const { error: updateErr } = await sb
        .from("authorized_users")
        .update({ password_hash })
        .eq("id", authorized_user_id);

      if (updateErr) return err("Could not reset password");
      return json({ ok: true });
    }

    // ─── CLEANUP EXPIRED MESSAGES ───
    if (action === "cleanup-expired") {
      if (!isAdmin) return err("Access denied");

      const { count } = await sb
        .from("messages")
        .delete({ count: "exact" })
        .eq("is_disappearing", true)
        .lt("expires_at", now);

      return json({ ok: true, deleted: count || 0 });
    }

    return err("Unknown action", 400);
  } catch (e) {
    console.error("Messaging error:", e);
    return err("Internal error", 500);
  }
});
