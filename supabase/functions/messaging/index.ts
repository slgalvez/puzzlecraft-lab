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
  session_version?: number;
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

/** Build a message query that respects cleared_at timestamps */
function buildMessageQuery(
  sb: ReturnType<typeof createClient>,
  conversationId: string,
  now: string,
  clearedAt: string | null,
) {
  let query = sb
    .from("messages")
    .select("id, sender_profile_id, body, created_at, read_at, is_disappearing, expires_at, reactions")
    .eq("conversation_id", conversationId)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (clearedAt) {
    query = query.gt("created_at", clearedAt);
  }

  return query;
}

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

    // ─── SESSION VERSION CHECK ───
    // Verify this session hasn't been superseded by a newer login
    {
      const { data: profile } = await sb
        .from("profiles")
        .select("session_version")
        .eq("id", user.sub)
        .single();
      if (profile && user.session_version !== undefined && profile.session_version !== user.session_version) {
        return err("Session ended", 401);
      }
    }

    // ─── VERIFY SESSION (lightweight check for client polling) ───
    if (action === "verify-session") {
      return json({ ok: true });
    }

    const profileId = user.sub;
    const isAdmin = user.role === "admin";
    const now = new Date().toISOString();

    // ─── GET MY CONVERSATION (user) ───
    if (action === "get-my-conversation") {
      if (isAdmin) return err("Use admin actions");

      let { data: conv } = await sb
        .from("conversations")
        .select("id, admin_profile_id, disappearing_enabled, disappearing_duration, cleared_at_user, cleared_at_admin")
        .eq("user_profile_id", profileId)
        .maybeSingle();

      if (!conv) {
        const { data: admin } = await sb.from("profiles").select("id").eq("role", "admin").limit(1).single();
        if (!admin) return err("System not ready");

        const { data: newConv, error: convErr } = await sb
          .from("conversations")
          .insert({ user_profile_id: profileId, admin_profile_id: admin.id })
          .select("id, admin_profile_id, disappearing_enabled, disappearing_duration, cleared_at_user, cleared_at_admin")
          .single();
        if (convErr) {
          console.error("Create conversation error:", JSON.stringify(convErr));
          return err("Could not create conversation");
        }
        conv = newConv;
      }

      const clearedAt = conv.cleared_at_user;

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

      // Get messages, filtering out expired ones and cleared ones
      const { data: messages } = await buildMessageQuery(sb, conv.id, now, clearedAt)
        .order("created_at", { ascending: true })
        .limit(200);

      // Count unread from admin (only after cleared_at)
      let unreadQuery = sb
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_profile_id", profileId)
        .is("read_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      if (clearedAt) unreadQuery = unreadQuery.gt("created_at", clearedAt);
      const { count: unreadCount } = await unreadQuery;

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
          expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          const ms = parseDuration(conv.disappearing_duration);
          expires_at = new Date(Date.now() + ms).toISOString();
        }
      }

      const { data: msg, error: msgErr } = await sb
        .from("messages")
        .insert({ conversation_id, sender_profile_id: profileId, body: message.trim(), is_disappearing, expires_at })
        .select("id, sender_profile_id, body, created_at, read_at, is_disappearing, expires_at, reactions")
        .single();

      if (msgErr) return err("Could not send message");
      return json({ message: msg });
    }

    // ─── REACT TO MESSAGE ───
    if (action === "react-to-message") {
      const { message_id, reaction } = body;
      if (!message_id || typeof reaction !== "string") return err("Invalid reaction", 400);

      const VALID_REACTIONS = ["❤️", "👍", "😂", "‼️", "❓", "😢"];
      if (!VALID_REACTIONS.includes(reaction)) return err("Unsupported reaction", 400);

      // Fetch message and verify access
      const { data: msg } = await sb.from("messages").select("id, conversation_id, reactions").eq("id", message_id).single();
      if (!msg) return err("Message not found");

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", msg.conversation_id).single();
      if (!conv) return err("Conversation not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      // Toggle reaction: add if not present, remove if already there
      const reactions: Record<string, string[]> = (msg.reactions as Record<string, string[]>) || {};
      const existing = reactions[reaction] || [];
      if (existing.includes(profileId)) {
        reactions[reaction] = existing.filter((id: string) => id !== profileId);
        if (reactions[reaction].length === 0) delete reactions[reaction];
      } else {
        reactions[reaction] = [...existing, profileId];
      }

      const { error: updateErr } = await sb.from("messages").update({ reactions }).eq("id", message_id);
      if (updateErr) return err("Could not update reaction");

      return json({ reactions });
    }

    // ─── EDIT MESSAGE ───
    if (action === "edit-message") {
      const { message_id, body: newBody } = body;
      if (!message_id || typeof newBody !== "string" || newBody.trim().length === 0) return err("Invalid edit", 400);
      if (newBody.length > 5000) return err("Message too long", 400);

      const { data: msg } = await sb.from("messages").select("id, sender_profile_id, conversation_id").eq("id", message_id).single();
      if (!msg) return err("Message not found");
      if (msg.sender_profile_id !== profileId) return err("Can only edit your own messages");

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", msg.conversation_id).single();
      if (!conv) return err("Conversation not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      const { error: updateErr } = await sb.from("messages").update({ body: newBody.trim() }).eq("id", message_id);
      if (updateErr) return err("Could not edit message");

      return json({ ok: true, body: newBody.trim() });
    }

    // ─── MARK READ ───
    if (action === "mark-read") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", conversation_id).single();
      if (!conv) return err("Not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      await sb
        .from("messages")
        .update({ read_at: now })
        .eq("conversation_id", conversation_id)
        .neq("sender_profile_id", profileId)
        .is("read_at", null);

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

    // ─── CLEAR CONVERSATION (per-side) ───
    if (action === "clear-conversation") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      const { data: conv } = await sb
        .from("conversations")
        .select("id, user_profile_id, admin_profile_id")
        .eq("id", conversation_id)
        .single();
      if (!conv) return err("Not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      // Set the cleared_at timestamp for the requesting side
      const updateCol = isAdmin ? "cleared_at_admin" : "cleared_at_user";
      const { error: updateErr } = await sb
        .from("conversations")
        .update({ [updateCol]: now })
        .eq("id", conversation_id);

      if (updateErr) return err("Could not clear conversation");
      return json({ ok: true });
    }

    // ─── CLEAR ALL CONVERSATIONS (admin only) ───
    if (action === "clear-all-conversations") {
      if (!isAdmin) return err("Access denied");

      const { error: updateErr } = await sb
        .from("conversations")
        .update({ cleared_at_admin: now })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows

      if (updateErr) return err("Could not clear conversations");
      return json({ ok: true });
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
          cleared_at_admin,
          profiles!conversations_user_profile_id_fkey (first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      const results = [];
      for (const c of convs || []) {
        const clearedAt = c.cleared_at_admin;

        let lastMsgQuery = sb
          .from("messages")
          .select("body, created_at, sender_profile_id")
          .eq("conversation_id", c.id)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("created_at", { ascending: false })
          .limit(1);
        if (clearedAt) lastMsgQuery = lastMsgQuery.gt("created_at", clearedAt);
        const { data: lastMsg } = await lastMsgQuery.maybeSingle();

        let unreadQuery = sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_profile_id", profileId)
          .is("read_at", null)
          .or(`expires_at.is.null,expires_at.gt.${now}`);
        if (clearedAt) unreadQuery = unreadQuery.gt("created_at", clearedAt);
        const { count: unreadCount } = await unreadQuery;

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
        .select(`id, user_profile_id, admin_profile_id, disappearing_enabled, disappearing_duration, cleared_at_admin, profiles!conversations_user_profile_id_fkey (first_name, last_name)`)
        .eq("id", conversation_id)
        .single();
      if (!conv) return err("Not found");

      const clearedAt = conv.cleared_at_admin;

      // Clean up read view-once messages
      if (conv.disappearing_duration === "view-once") {
        await sb
          .from("messages")
          .delete()
          .eq("conversation_id", conversation_id)
          .eq("is_disappearing", true)
          .neq("sender_profile_id", profileId)
          .not("read_at", "is", null);
      }

      const { data: messages } = await buildMessageQuery(sb, conversation_id, now, clearedAt)
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

    // ─── ADMIN: START CONVERSATION ───
    if (action === "start-conversation") {
      if (!isAdmin) return err("Access denied");
      const { user_profile_id } = body;
      if (!user_profile_id) return err("Missing user_profile_id", 400);

      const { data: targetProfile } = await sb
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("id", user_profile_id)
        .single();
      if (!targetProfile) return err("User not found", 404);

      const { data: existing } = await sb
        .from("conversations")
        .select("id")
        .eq("user_profile_id", user_profile_id)
        .maybeSingle();
      if (existing) return json({ conversation_id: existing.id, already_existed: true });

      const { data: newConv, error: convErr } = await sb
        .from("conversations")
        .insert({ user_profile_id, admin_profile_id: profileId })
        .select("id")
        .single();
      if (convErr) return err("Could not create conversation");

      return json({ conversation_id: newConv.id, already_existed: false });
    }

    // ─── ADMIN: DELETE USER ───
    if (action === "delete-user") {
      if (!isAdmin) return err("Access denied");
      const { authorized_user_id } = body;
      if (!authorized_user_id) return err("Missing authorized_user_id", 400);

      const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("authorized_user_id", authorized_user_id)
        .maybeSingle();

      if (profile?.role === "admin") return err("Cannot delete admin users", 403);

      if (profile) {
        const { data: conv } = await sb
          .from("conversations")
          .select("id")
          .eq("user_profile_id", profile.id)
          .maybeSingle();

        if (conv) {
          await sb.from("messages").delete().eq("conversation_id", conv.id);
          await sb.from("conversations").delete().eq("id", conv.id);
        }

        await sb.from("profiles").delete().eq("id", profile.id);
      }

      await sb.from("authorized_users").delete().eq("id", authorized_user_id);
      return json({ ok: true });
    }

    // ─── UPDATE DISPLAY NAME ───
    if (action === "update-name") {
      const { first_name, last_name } = body;
      if (!first_name || !last_name || typeof first_name !== "string" || typeof last_name !== "string") return err("Invalid fields", 400);
      const fn = first_name.trim();
      const ln = last_name.trim();
      if (fn.length === 0 || fn.length > 100 || ln.length === 0 || ln.length > 100) return err("Name too long or empty", 400);

      const { data: profile } = await sb.from("profiles").select("authorized_user_id").eq("id", profileId).single();
      if (!profile) return err("Profile not found");

      await sb.from("profiles").update({ first_name: fn, last_name: ln }).eq("id", profileId);
      await sb.from("authorized_users").update({ first_name: fn, last_name: ln }).eq("id", profile.authorized_user_id);

      return json({ ok: true, first_name: fn, last_name: ln });
    }

    // ─── CHANGE PASSWORD ───
    if (action === "change-password") {
      const { current_password, new_password } = body;
      if (!current_password || !new_password || typeof current_password !== "string" || typeof new_password !== "string") return err("Invalid fields", 400);
      if (new_password.length < 4) return err("Password must be at least 4 characters", 400);
      if (new_password.length > 200) return err("Password too long", 400);

      const { data: profile } = await sb.from("profiles").select("authorized_user_id").eq("id", profileId).single();
      if (!profile) return err("Profile not found");

      const { data: authUser } = await sb.from("authorized_users").select("password_hash").eq("id", profile.authorized_user_id).single();
      if (!authUser) return err("User not found");

      const parts = authUser.password_hash.split(":");
      if (parts[0] !== "pbkdf2" || parts.length !== 4) return err("Password verification failed");
      const iterations = parseInt(parts[1]);
      const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
      const storedHash = atob(parts[3]);
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(current_password), "PBKDF2", false, ["deriveBits"]);
      const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256);
      if (String.fromCharCode(...new Uint8Array(hash)) !== storedHash) return err("Current password is incorrect", 401);

      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      const newKeyMaterial = await crypto.subtle.importKey("raw", encoder.encode(new_password), "PBKDF2", false, ["deriveBits"]);
      const newHash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: newSalt, iterations: 100000, hash: "SHA-256" }, newKeyMaterial, 256);
      const saltB64 = btoa(String.fromCharCode(...newSalt));
      const hashB64 = btoa(String.fromCharCode(...new Uint8Array(newHash)));
      const password_hash = `pbkdf2:100000:${saltB64}:${hashB64}`;

      await sb.from("authorized_users").update({ password_hash }).eq("id", profile.authorized_user_id);
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

    // ─── CHECK STATUS (returns only a boolean — safe for public context) ───
    if (action === "check-status") {
      let hasUpdate = false;
      if (isAdmin) {
        const { count } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_profile_id", profileId)
          .is("read_at", null)
          .or(`expires_at.is.null,expires_at.gt.${now}`);
        hasUpdate = (count || 0) > 0;
      } else {
        const { data: conv } = await sb
          .from("conversations")
          .select("id, cleared_at_user")
          .eq("user_profile_id", profileId)
          .maybeSingle();
        if (conv) {
          let q = sb
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_profile_id", profileId)
            .is("read_at", null)
            .or(`expires_at.is.null,expires_at.gt.${now}`);
          if (conv.cleared_at_user) q = q.gt("created_at", conv.cleared_at_user);
          const { count } = await q;
          hasUpdate = (count || 0) > 0;
        }
      }
      return json({ updated: hasUpdate });
    }

    // ─── LIST PUZZLES (Puzzles for You) ───
    if (action === "list-puzzles") {
      const { data: myProfile } = await sb.from("profiles").select("id, role").eq("id", profileId).single();
      if (!myProfile) return err("Profile not found");

      // Get non-draft puzzles where user is creator or recipient
      const { data: puzzles } = await sb
        .from("private_puzzles")
        .select("*")
        .eq("is_draft", false)
        .or(`created_by.eq.${profileId},sent_to.eq.${profileId}`)
        .order("created_at", { ascending: false });

      // Get drafts (only own)
      const { data: drafts } = await sb
        .from("private_puzzles")
        .select("*")
        .eq("is_draft", true)
        .eq("created_by", profileId)
        .order("created_at", { ascending: false });

      // Enrich with names
      const profileIds = new Set<string>();
      for (const p of [...(puzzles || []), ...(drafts || [])]) {
        profileIds.add(p.created_by);
        profileIds.add(p.sent_to);
      }
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", [...profileIds]);
      const nameMap = new Map((profiles || []).map(p => [p.id, `${p.first_name} ${p.last_name}`]));

      const enrich = (list: typeof puzzles) => (list || []).map(p => ({
        ...p,
        creator_name: nameMap.get(p.created_by) || "Unknown",
        recipient_name: nameMap.get(p.sent_to) || "Unknown",
      }));

      return json({ puzzles: enrich(puzzles), drafts: enrich(drafts) });
    }

    // ─── LIST RECIPIENTS ───
    if (action === "list-recipients") {
      let recipients: { id: string; first_name: string; last_name: string }[] = [];
      if (isAdmin) {
        // Admin can send to any non-admin active user
        const { data: profiles } = await sb
          .from("profiles")
          .select("id, first_name, last_name, role")
          .neq("id", profileId);
        recipients = (profiles || []).filter(p => p.role !== "admin").map(p => ({
          id: p.id, first_name: p.first_name, last_name: p.last_name,
        }));
      } else {
        // Regular user sends to their admin
        const { data: conv } = await sb
          .from("conversations")
          .select("admin_profile_id")
          .eq("user_profile_id", profileId)
          .maybeSingle();
        if (conv) {
          const { data: admin } = await sb.from("profiles").select("id, first_name, last_name").eq("id", conv.admin_profile_id).single();
          if (admin) recipients = [admin];
        }
      }
      return json({ recipients });
    }

    // ─── CREATE PUZZLE ───
    if (action === "create-puzzle") {
      const { puzzle_type, puzzle_data, reveal_message, is_draft, sent_to: explicitSentTo } = body;
      if (!puzzle_type || !puzzle_data) return err("Missing fields", 400);
      const validTypes = ["word-fill", "cryptogram", "crossword", "word-search"];
      if (!validTypes.includes(puzzle_type)) return err("Invalid puzzle type", 400);

      // Determine recipient — use explicit sent_to if provided, else find default partner
      let sentTo: string;
      if (explicitSentTo) {
        // Validate this is a real profile the user can send to
        const { data: targetProfile } = await sb.from("profiles").select("id, role").eq("id", explicitSentTo).single();
        if (!targetProfile) return err("Invalid recipient");
        if (targetProfile.id === profileId) return err("Cannot send to yourself");
        sentTo = explicitSentTo;
      } else if (isAdmin) {
        const { data: convs } = await sb
          .from("conversations")
          .select("user_profile_id")
          .eq("admin_profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (!convs || convs.length === 0) return err("No conversation partner found");
        sentTo = convs[0].user_profile_id;
      } else {
        const { data: conv } = await sb
          .from("conversations")
          .select("admin_profile_id")
          .eq("user_profile_id", profileId)
          .maybeSingle();
        if (!conv) return err("No conversation partner found");
        sentTo = conv.admin_profile_id;
      }

      const { data: puzzle, error: insertErr } = await sb
        .from("private_puzzles")
        .insert({
          created_by: profileId,
          sent_to: sentTo,
          puzzle_type,
          puzzle_data,
          reveal_message: reveal_message || null,
          is_draft: is_draft === true,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Create puzzle error:", JSON.stringify(insertErr));
        return err("Could not create puzzle");
      }

      // Only insert system message if not a draft
      if (!is_draft) {
        let convId: string | null = null;
        if (isAdmin) {
          const { data: conv } = await sb.from("conversations").select("id").eq("admin_profile_id", profileId).eq("user_profile_id", sentTo).maybeSingle();
          convId = conv?.id || null;
        } else {
          const { data: conv } = await sb.from("conversations").select("id").eq("user_profile_id", profileId).eq("admin_profile_id", sentTo).maybeSingle();
          convId = conv?.id || null;
        }
        if (convId) {
          const typeLabels: Record<string, string> = { "word-fill": "Word Fill-In", "cryptogram": "Cryptogram", "crossword": "Crossword", "word-search": "Word Search" };
          const label = typeLabels[puzzle_type] || puzzle_type;
          await sb.from("messages").insert({
            conversation_id: convId,
            sender_profile_id: profileId,
            body: `__PUZZLE_SENT__:${puzzle.id}:${puzzle_type}:${label}`,
            is_disappearing: false,
            expires_at: null,
          });
        }
      }

      return json({ puzzle });
    }

    // ─── UPDATE DRAFT ───
    if (action === "update-draft") {
      const { puzzle_id, puzzle_type, puzzle_data, reveal_message } = body;
      if (!puzzle_id) return err("Missing puzzle_id", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("id, created_by, is_draft")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Draft not found");
      if (puzzle.created_by !== profileId) return err("Access denied");
      if (!puzzle.is_draft) return err("Not a draft", 400);

      const updates: Record<string, unknown> = {};
      if (puzzle_type) updates.puzzle_type = puzzle_type;
      if (puzzle_data) updates.puzzle_data = puzzle_data;
      if (reveal_message !== undefined) updates.reveal_message = reveal_message || null;
      // Allow changing recipient on drafts
      if (body.sent_to) {
        const { data: targetProfile } = await sb.from("profiles").select("id").eq("id", body.sent_to).single();
        if (!targetProfile) return err("Invalid recipient");
        if (targetProfile.id === profileId) return err("Cannot send to yourself");
        updates.sent_to = body.sent_to;
      }

      const { error: updateErr } = await sb
        .from("private_puzzles")
        .update(updates)
        .eq("id", puzzle_id);

      if (updateErr) return err("Could not update draft");
      return json({ ok: true });
    }

    // ─── SEND DRAFT ───
    if (action === "send-draft") {
      const { puzzle_id } = body;
      if (!puzzle_id) return err("Missing puzzle_id", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("id, created_by, sent_to, is_draft, puzzle_type")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Draft not found");
      if (puzzle.created_by !== profileId) return err("Access denied");
      if (!puzzle.is_draft) return err("Already sent", 400);

      const { error: updateErr } = await sb
        .from("private_puzzles")
        .update({ is_draft: false })
        .eq("id", puzzle_id);

      if (updateErr) return err("Could not send draft");

      // Insert system message
      let convId: string | null = null;
      if (isAdmin) {
        const { data: conv } = await sb.from("conversations").select("id").eq("admin_profile_id", profileId).eq("user_profile_id", puzzle.sent_to).maybeSingle();
        convId = conv?.id || null;
      } else {
        const { data: conv } = await sb.from("conversations").select("id").eq("user_profile_id", profileId).eq("admin_profile_id", puzzle.sent_to).maybeSingle();
        convId = conv?.id || null;
      }
      if (convId) {
        const typeLabels: Record<string, string> = { "word-fill": "Word Fill-In", "cryptogram": "Cryptogram", "crossword": "Crossword", "word-search": "Word Search" };
        const label = typeLabels[puzzle.puzzle_type] || puzzle.puzzle_type;
        await sb.from("messages").insert({
          conversation_id: convId,
          sender_profile_id: profileId,
          body: `__PUZZLE_SENT__:${puzzle.id}:${puzzle.puzzle_type}:${label}`,
          is_disappearing: false,
          expires_at: null,
        });
      }

      return json({ ok: true });
    }

    // ─── SOLVE PUZZLE ───
    if (action === "solve-puzzle") {
      const { puzzle_id, solve_time } = body;
      if (!puzzle_id) return err("Missing puzzle_id", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("id, sent_to, solved_by, created_by, puzzle_type")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Puzzle not found");
      if (puzzle.sent_to !== profileId) return err("Access denied");
      if (puzzle.solved_by) return err("Already solved");

      const { error: updateErr } = await sb
        .from("private_puzzles")
        .update({
          solved_by: profileId,
          solved_at: now,
          solve_time: typeof solve_time === "number" ? solve_time : null,
        })
        .eq("id", puzzle_id);

      if (updateErr) return err("Could not mark solved");

      // Insert solved system message into conversation
      let convId: string | null = null;
      if (isAdmin) {
        const { data: conv } = await sb.from("conversations").select("id").eq("admin_profile_id", profileId).eq("user_profile_id", puzzle.created_by).maybeSingle();
        convId = conv?.id || null;
      } else {
        const { data: conv } = await sb.from("conversations").select("id").eq("user_profile_id", profileId).eq("admin_profile_id", puzzle.created_by).maybeSingle();
        convId = conv?.id || null;
      }

      if (convId) {
        const typeLabels: Record<string, string> = { "word-fill": "Word Fill-In", "cryptogram": "Cryptogram", "crossword": "Crossword", "word-search": "Word Search" };
        const label = typeLabels[puzzle.puzzle_type] || puzzle.puzzle_type;
        await sb.from("messages").insert({
          conversation_id: convId,
          sender_profile_id: profileId,
          body: `__PUZZLE_SOLVED__:${puzzle.id}:${puzzle.puzzle_type}:${label}`,
          is_disappearing: false,
          expires_at: null,
        });
      }

      return json({ ok: true });
    }

    // ─── DELETE PUZZLE ───
    if (action === "delete-puzzle") {
      const { puzzle_id } = body;
      if (!puzzle_id) return err("Missing puzzle_id", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("id, created_by, sent_to, is_draft")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Puzzle not found");

      // Allow creator or recipient to delete
      if (puzzle.created_by !== profileId && puzzle.sent_to !== profileId) {
        return err("Access denied");
      }

      const { error: delErr } = await sb
        .from("private_puzzles")
        .delete()
        .eq("id", puzzle_id);

      if (delErr) return err("Could not delete puzzle");
      return json({ ok: true });
    }

    // ─── SAVE PROGRESS ───
    if (action === "save-progress") {
      const { puzzle_id, solver_state } = body;
      if (!puzzle_id || !solver_state) return err("Missing fields", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("id, sent_to, solved_by")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Puzzle not found");
      if (puzzle.sent_to !== profileId) return err("Access denied");
      if (puzzle.solved_by) return err("Already solved");

      const { error: updateErr } = await sb
        .from("private_puzzles")
        .update({ solver_state })
        .eq("id", puzzle_id);

      if (updateErr) return err("Could not save progress");
      return json({ ok: true });
    }

    // ─── GET PUZZLE ───
    if (action === "get-puzzle") {
      const { puzzle_id } = body;
      if (!puzzle_id) return err("Missing puzzle_id", 400);

      const { data: puzzle } = await sb
        .from("private_puzzles")
        .select("*")
        .eq("id", puzzle_id)
        .single();
      if (!puzzle) return err("Puzzle not found");

      // Only creator or recipient can view
      if (puzzle.created_by !== profileId && puzzle.sent_to !== profileId) {
        return err("Access denied");
      }

      // Enrich with names
      const ids = [puzzle.created_by, puzzle.sent_to];
      const { data: profiles } = await sb.from("profiles").select("id, first_name, last_name").in("id", ids);
      const nameMap = new Map((profiles || []).map(p => [p.id, `${p.first_name} ${p.last_name}`]));

      return json({
        puzzle: {
          ...puzzle,
          creator_name: nameMap.get(puzzle.created_by) || "Unknown",
          recipient_name: nameMap.get(puzzle.sent_to) || "Unknown",
        },
      });
    }

    // ─── GET SETTINGS ───
    if (action === "get-settings") {
      const { data: profile } = await sb.from("profiles").select("focus_loss_protection").eq("id", profileId).single();
      if (!profile) return err("Profile not found");
      return json({ focus_loss_protection: profile.focus_loss_protection });
    }

    // ─── UPDATE SETTINGS ───
    if (action === "update-settings") {
      const { focus_loss_protection } = body;
      if (typeof focus_loss_protection !== "boolean") return err("Invalid params", 400);
      const { error: updateErr } = await sb.from("profiles").update({ focus_loss_protection }).eq("id", profileId);
      if (updateErr) return err("Could not update settings");
      return json({ ok: true, focus_loss_protection });
    }

    // ─── CLEAR ACTIVITY ───
    if (action === "clear-activity") {
      const { error: updateErr } = await sb.from("profiles").update({ activity_cleared_at: now }).eq("id", profileId);
      if (updateErr) return err("Could not clear activity");
      return json({ ok: true, activity_cleared_at: now });
    }

    // ─── GET ACTIVITY CLEARED AT ───
    if (action === "get-activity-cleared-at") {
      const { data: profile } = await sb.from("profiles").select("activity_cleared_at").eq("id", profileId).single();
      if (!profile) return err("Profile not found");
      return json({ activity_cleared_at: profile.activity_cleared_at });
    }

    return err("Unknown action", 400);
  } catch (e) {
    console.error("Messaging error:", e);
    return err("Internal error", 500);
  }
});
