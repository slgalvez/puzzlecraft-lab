import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
const CALL_RING_TIMEOUT_MS = 30_000;
const STALE_CONNECTED_CALL_MS = 15 * 60 * 1000;

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

async function fetchLatestConversationMessages(
  sb: ReturnType<typeof createClient>,
  conversationId: string,
  now: string,
  clearedAt: string | null,
  limit = 200,
) {
  const { data, error } = await buildMessageQuery(sb, conversationId, now, clearedAt)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[messaging] failed to fetch conversation messages", {
      conversationId,
      clearedAt,
      limit,
      error,
    });
    return [];
  }

  const messages = data || [];
  const newestMessageAt = messages[0]?.created_at ?? null;
  const oldestReturnedAt = messages[messages.length - 1]?.created_at ?? null;

  console.debug("[messaging] fetched latest conversation messages", {
    conversationId,
    returned: messages.length,
    newestMessageAt,
    oldestReturnedAt,
  });

  return messages.reverse();
}

// ─── EPHEMERAL TYPING STATE (DB-backed for cross-isolate reliability) ───
const TYPING_TTL_MS = 4000; // 4s timeout

function isTypingFromTimestamp(typingAt: string | null): boolean {
  if (!typingAt) return false;
  return Date.now() - new Date(typingAt).getTime() < TYPING_TTL_MS;
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

    // ─── TYPING PING (ephemeral DB-backed) ───
    if (action === "typing-ping") {
      const { conversation_id } = body;
      if (conversation_id) {
        const col = isAdmin ? "admin_typing_at" : "user_typing_at";
        await sb.from("conversations").update({ [col]: new Date().toISOString() }).eq("id", conversation_id);
      }
      return json({ ok: true });
    }

    // ─── GET MY CONVERSATION (user) ───
    if (action === "get-my-conversation") {
      if (isAdmin) return err("Use admin actions");

      let { data: conv } = await sb
        .from("conversations")
        .select("id, admin_profile_id, admin_typing_at, disappearing_enabled, disappearing_duration, cleared_at_user, cleared_at_admin")
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

      // Fetch admin display name
      const { data: adminProfile } = await sb
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", conv.admin_profile_id)
        .single();
      const adminName = adminProfile ? `${adminProfile.first_name} ${adminProfile.last_name}`.trim() : "Admin";

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

      // Get the latest visible messages without cutting off newest ones in long threads
      const messages = await fetchLatestConversationMessages(sb, conv.id, now, clearedAt);

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

      // Check if the other party (admin) is typing
      const otherTyping = isTypingFromTimestamp(conv.admin_typing_at);

      return json({
        conversation: {
          id: conv.id,
          admin_profile_id: conv.admin_profile_id,
          admin_name: adminName,
          disappearing_enabled: conv.disappearing_enabled,
          disappearing_duration: conv.disappearing_duration,
        },
        messages: messages || [],
        unread_count: unreadCount || 0,
        other_typing: otherTyping,
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

      // Fire-and-forget: send push notification to the other party
      const recipientProfileId = profileId === conv.admin_profile_id
        ? conv.user_profile_id
        : conv.admin_profile_id;

      // Use coded phrases for stealth
      const MESSAGE_PHRASES = [
        "Made this one for you 🧩",
        "Think you can solve this?",
        "A new daily challenge loaded 🧩",
        "Not too late to complete today's challenge ⏳",
        "Beat your last time ⏱️",
        "Continue your streak 🔥",
        "One quick puzzle?",
        "Just one more 🧩",
      ];
      const phraseIdx = Math.floor(Math.random() * MESSAGE_PHRASES.length);

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            action: "send-push",
            target_profile_id: recipientProfileId,
            body: MESSAGE_PHRASES[phraseIdx],
            tag: "private-notification",
            url: "/p",
          }),
        });
      } catch (pushErr) {
        // Non-blocking — don't fail the send-message action
        console.error("Push notification error:", pushErr);
      }

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

    // ─── UNSEND MESSAGE ───
    if (action === "unsend-message") {
      const { message_id } = body;
      if (!message_id) return err("Missing message_id", 400);

      const { data: msg } = await sb.from("messages").select("id, sender_profile_id, conversation_id").eq("id", message_id).single();
      if (!msg) return err("Message not found");
      if (msg.sender_profile_id !== profileId) return err("Can only unsend your own messages");

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", msg.conversation_id).single();
      if (!conv) return err("Conversation not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      const { error: delErr } = await sb.from("messages").delete().eq("id", message_id);
      if (delErr) return err("Could not unsend message");

      return json({ ok: true });
    }
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
        .select(`id, user_profile_id, admin_profile_id, user_typing_at, disappearing_enabled, disappearing_duration, cleared_at_admin, profiles!conversations_user_profile_id_fkey (first_name, last_name)`)
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

      const messages = await fetchLatestConversationMessages(sb, conversation_id, now, clearedAt);

      const profile = conv.profiles as unknown as { first_name: string; last_name: string } | null;

      // Check if the user is typing
      const otherTyping = isTypingFromTimestamp(conv.user_typing_at);

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
        other_typing: otherTyping,
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
        // Also check for unsolved puzzles sent to this user
        if (!hasUpdate) {
          const { count: unsolvedCount } = await sb
            .from("private_puzzles")
            .select("id", { count: "exact", head: true })
            .eq("sent_to", profileId)
            .eq("is_draft", false)
            .is("solved_by", null);
          hasUpdate = (unsolvedCount || 0) > 0;
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

    // ─── ADMIN: LIST FAILED LOGINS ───
    if (action === "list-failed-logins") {
      if (!isAdmin) return err("Access denied");

      const { data: attempts } = await sb
        .from("failed_login_attempts")
        .select("id, attempted_name, attempted_code, ip_address, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: blockedIps } = await sb
        .from("ip_blocklist")
        .select("ip_address");

      const blockedSet = new Set((blockedIps || []).map(b => b.ip_address));

      // Count recent failures per IP (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAll } = await sb
        .from("failed_login_attempts")
        .select("ip_address")
        .gte("created_at", oneDayAgo);

      const recentCounts: Record<string, number> = {};
      for (const r of recentAll || []) {
        recentCounts[r.ip_address] = (recentCounts[r.ip_address] || 0) + 1;
      }

      const enriched = (attempts || []).map(a => ({
        ...a,
        recent_failures: recentCounts[a.ip_address] || 0,
        is_blocked: blockedSet.has(a.ip_address),
      }));

      return json({ attempts: enriched });
    }

    // ─── ADMIN: BLOCK IP ───
    if (action === "block-ip") {
      if (!isAdmin) return err("Access denied");
      const { ip_address } = body;
      if (!ip_address || typeof ip_address !== "string") return err("Missing ip_address", 400);

      const { error: insertErr } = await sb
        .from("ip_blocklist")
        .upsert({ ip_address, blocked_by: profileId }, { onConflict: "ip_address" });

      if (insertErr) return err("Could not block IP");
      return json({ ok: true });
    }

    // ─── ADMIN: UNBLOCK IP ───
    if (action === "unblock-ip") {
      if (!isAdmin) return err("Access denied");
      const { ip_address } = body;
      if (!ip_address || typeof ip_address !== "string") return err("Missing ip_address", 400);

      const { error: delErr } = await sb
        .from("ip_blocklist")
        .delete()
        .eq("ip_address", ip_address);

      if (delErr) return err("Could not unblock IP");
      return json({ ok: true });
    }

    // ─── START CALL ───
    if (action === "start-call") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      const { data: conv } = await sb.from("conversations").select("id, user_profile_id, admin_profile_id").eq("id", conversation_id).single();
      if (!conv) return err("Conversation not found");
      if (!isAdmin && conv.user_profile_id !== profileId) return err("Access denied");

      const calleeId = profileId === conv.admin_profile_id ? conv.user_profile_id : conv.admin_profile_id;

      // Auto-expire stale ringing calls (>30s old) and check for truly active calls
      const { data: existingCalls } = await sb.from("calls").select("id, status, started_at, connected_at").eq("conversation_id", conversation_id).in("status", ["ringing", "connected"]);
      if (existingCalls && existingCalls.length > 0) {
        const staleIds: string[] = [];
        let hasActive = false;
        for (const ec of existingCalls) {
          if (ec.status === "ringing" && (Date.now() - new Date(ec.started_at).getTime()) > CALL_RING_TIMEOUT_MS) {
            staleIds.push(ec.id);
          } else if (
            ec.status === "connected" &&
            ec.connected_at &&
            (Date.now() - new Date(ec.connected_at).getTime()) > STALE_CONNECTED_CALL_MS
          ) {
            staleIds.push(ec.id);
          } else {
            hasActive = true;
          }
        }
        // Clean up stale calls and insert history messages
        if (staleIds.length > 0) {
          for (const staleId of staleIds) {
            const staleCall = existingCalls.find(c => c.id === staleId);
            await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: "stale" }).eq("id", staleId);
            await sb.from("call_signals").delete().eq("call_id", staleId);
            // Insert call history message so the thread shows the event
            const wasConnected = staleCall?.status === "connected";
            const historyBody = wasConnected ? "__CALL__:ended:0" : "__CALL__:missed";
            await sb.from("messages").insert({
              conversation_id,
              sender_profile_id: profileId,
              body: historyBody,
            });
          }
        }
        if (hasActive) return err("A call is already active", 409);
      }

      const { data: call, error: callErr } = await sb.from("calls").insert({
        conversation_id,
        caller_profile_id: profileId,
        callee_profile_id: calleeId,
        status: "ringing",
      }).select().single();
      if (callErr || !call) return err("Could not start call");

      // Get caller name for the callee
      const { data: callerProfile } = await sb.from("profiles").select("first_name").eq("id", profileId).single();

      // Send immediate push notification to the callee (no rate limiting for calls)
      const CALL_PHRASES = [
        "Made this one for you 🧩",
        "Think you can solve this?",
        "A new daily challenge loaded 🧩",
        "Beat your last time ⏱️",
        "Continue your streak 🔥",
        "One quick puzzle?",
        "Just one more 🧩",
      ];
      const callPhrase = CALL_PHRASES[Math.floor(Math.random() * CALL_PHRASES.length)];

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            action: "send-push",
            target_profile_id: calleeId,
            body: callPhrase,
            tag: "call-notification",
            url: "/p",
            skip_rate_limit: true,
          }),
        });
      } catch (pushErr) {
        console.error("Call push notification error:", pushErr);
      }

      return json({ call_id: call.id, callee_id: calleeId, caller_name: callerProfile?.first_name || "Someone" });
    }

    // ─── POLL CALL ───
    if (action === "poll-call") {
      const { call_id, last_signal_id } = body;
      if (!call_id) return err("Missing call_id", 400);

      const { data: call } = await sb.from("calls").select("*").eq("id", call_id).single();
      if (!call) return err("Call not found");
      if (call.caller_profile_id !== profileId && call.callee_profile_id !== profileId) return err("Access denied");

      // Auto-timeout ringing calls after 30s
      if (call.status === "ringing") {
        const ringDuration = Date.now() - new Date(call.started_at).getTime();
        if (ringDuration > CALL_RING_TIMEOUT_MS) {
          await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: "missed" }).eq("id", call_id);
          // Insert system message
          await sb.from("messages").insert({
            conversation_id: call.conversation_id,
            sender_profile_id: call.caller_profile_id,
            body: "__CALL__:missed",
          });
          return json({ status: "ended", end_reason: "missed", signals: [] });
        }
      }

      // Get signals since last check
      let signalQuery = sb.from("call_signals").select("*").eq("call_id", call_id).neq("sender_profile_id", profileId).order("created_at", { ascending: true });
      if (last_signal_id) {
        signalQuery = signalQuery.gt("id", last_signal_id);
      }
      const { data: signals } = await signalQuery;

      return json({ status: call.status, connected_at: call.connected_at, ended_at: call.ended_at, end_reason: call.end_reason, signals: signals || [] });
    }

    // ─── SEND SIGNAL ───
    if (action === "send-signal") {
      const { call_id, signal_type, payload } = body;
      if (!call_id || !signal_type || !payload) return err("Missing params", 400);

      const { data: call } = await sb.from("calls").select("caller_profile_id, callee_profile_id").eq("id", call_id).single();
      if (!call) return err("Call not found");
      if (call.caller_profile_id !== profileId && call.callee_profile_id !== profileId) return err("Access denied");

      const { error: sigErr } = await sb.from("call_signals").insert({ call_id, sender_profile_id: profileId, signal_type, payload });
      if (sigErr) return err("Could not send signal");

      return json({ ok: true });
    }

    // ─── ANSWER CALL ───
    if (action === "answer-call") {
      const { call_id } = body;
      if (!call_id) return err("Missing call_id", 400);

      const { data: call } = await sb.from("calls").select("*").eq("id", call_id).single();
      if (!call) return err("Call not found");
      if (call.callee_profile_id !== profileId) return err("Only the callee can answer");
      if (call.status !== "ringing") return err("Call is no longer ringing");

      const { error: updateErr } = await sb.from("calls").update({ status: "connected", connected_at: now }).eq("id", call_id);
      if (updateErr) return err("Could not answer call");

      return json({ ok: true });
    }

    // ─── DECLINE CALL ───
    if (action === "decline-call") {
      const { call_id } = body;
      if (!call_id) return err("Missing call_id", 400);

      const { data: call } = await sb.from("calls").select("*").eq("id", call_id).single();
      if (!call) return err("Call not found");
      if (call.callee_profile_id !== profileId) return err("Only the callee can decline");
      if (call.status !== "ringing") return err("Call is no longer ringing");

      await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: "declined" }).eq("id", call_id);

      await sb.from("messages").insert({
        conversation_id: call.conversation_id,
        sender_profile_id: call.callee_profile_id,
        body: "__CALL__:declined",
      });

      // Cleanup signals
      await sb.from("call_signals").delete().eq("call_id", call_id);

      return json({ ok: true });
    }

    // ─── END CALL ───
    if (action === "end-call") {
      const { call_id } = body;
      if (!call_id) return err("Missing call_id", 400);

      const { data: call } = await sb.from("calls").select("*").eq("id", call_id).single();
      if (!call) return err("Call not found");
      if (call.caller_profile_id !== profileId && call.callee_profile_id !== profileId) return err("Access denied");

      // If still ringing (caller canceled), mark as canceled
      const reason = call.status === "ringing" ? "canceled" : "normal";
      let duration = 0;
      if (call.connected_at) {
        duration = Math.round((Date.now() - new Date(call.connected_at).getTime()) / 1000);
      }

      await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: reason }).eq("id", call_id);

      const callBody = reason === "canceled"
        ? "__CALL__:canceled"
        : `__CALL__:ended:${duration}`;

      await sb.from("messages").insert({
        conversation_id: call.conversation_id,
        sender_profile_id: profileId,
        body: callBody,
      });

      // Cleanup signals
      await sb.from("call_signals").delete().eq("call_id", call_id);

      return json({ ok: true, duration });
    }

    // ─── CHECK INCOMING CALL ───
    if (action === "check-incoming-call") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      // Find ringing calls where current user is the callee
      const { data: calls } = await sb.from("calls")
        .select("id, caller_profile_id, started_at")
        .eq("conversation_id", conversation_id)
        .eq("callee_profile_id", profileId)
        .eq("status", "ringing")
        .order("started_at", { ascending: false })
        .limit(1);

      if (!calls || calls.length === 0) return json({ call: null });

      const call = calls[0];

      // Auto-timeout
      const ringDuration = Date.now() - new Date(call.started_at).getTime();
      if (ringDuration > 30000) {
        await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: "missed" }).eq("id", call.id);
        await sb.from("messages").insert({
          conversation_id,
          sender_profile_id: call.caller_profile_id,
          body: "__CALL__:missed",
        });
        return json({ call: null });
      }

      // Get caller name
      const { data: callerProfile } = await sb.from("profiles").select("first_name").eq("id", call.caller_profile_id).single();

      return json({ call: { id: call.id, caller_name: callerProfile?.first_name || "Someone", caller_profile_id: call.caller_profile_id } });
    }

    // ─── CHECK INCOMING CALL (GLOBAL — no conversation filter) ───
    if (action === "check-incoming-call-global") {
      // Find ANY ringing call where current user is the callee
      const { data: calls } = await sb.from("calls")
        .select("id, caller_profile_id, conversation_id, started_at")
        .eq("callee_profile_id", profileId)
        .eq("status", "ringing")
        .order("started_at", { ascending: false })
        .limit(1);

      if (!calls || calls.length === 0) return json({ call: null });

      const call = calls[0];

      // Auto-timeout after 30s
      const ringDuration = Date.now() - new Date(call.started_at).getTime();
      if (ringDuration > 30000) {
        await sb.from("calls").update({ status: "ended", ended_at: now, end_reason: "missed" }).eq("id", call.id);
        await sb.from("messages").insert({
          conversation_id: call.conversation_id,
          sender_profile_id: call.caller_profile_id,
          body: "__CALL__:missed",
        });
        return json({ call: null });
      }

      const { data: callerProfile } = await sb.from("profiles").select("first_name").eq("id", call.caller_profile_id).single();

      return json({
        call: {
          id: call.id,
          caller_name: callerProfile?.first_name || "Someone",
          caller_profile_id: call.caller_profile_id,
          conversation_id: call.conversation_id,
        },
      });
    }

    // ─── GET TURN CREDENTIALS ───
    if (action === "get-turn-credentials") {
      const meteredKey = Deno.env.get("METERED_API_KEY");
      if (!meteredKey) {
        // Fall back to STUN-only if no TURN configured
        return json({ iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ]});
      }

      try {
        const resp = await fetch(`https://puzzlecrft.metered.live/api/v1/turn/credentials?apiKey=${meteredKey}`);
        if (!resp.ok) {
          console.error("[messaging] Metered TURN API error:", resp.status);
          return json({ iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ]});
        }
        const creds = await resp.json();
        return json({ iceServers: creds });
      } catch (turnErr) {
        console.error("[messaging] TURN credentials fetch error:", turnErr);
        return json({ iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ]});
      }
    }

    // ─── SET NICKNAME ───
    if (action === "set-nickname") {
      const { contact_profile_id, nickname } = body;
      if (!contact_profile_id || typeof nickname !== "string") return err("Invalid params", 400);
      const trimmed = nickname.trim();
      if (trimmed.length === 0 || trimmed.length > 100) return err("Nickname must be 1-100 characters", 400);

      const { error: upsertErr } = await sb
        .from("contact_nicknames")
        .upsert(
          { owner_profile_id: profileId, contact_profile_id, nickname: trimmed, updated_at: now },
          { onConflict: "owner_profile_id,contact_profile_id" }
        );
      if (upsertErr) return err("Could not set nickname");
      return json({ ok: true, nickname: trimmed });
    }

    // ─── REMOVE NICKNAME ───
    if (action === "remove-nickname") {
      const { contact_profile_id } = body;
      if (!contact_profile_id) return err("Missing contact_profile_id", 400);

      await sb
        .from("contact_nicknames")
        .delete()
        .eq("owner_profile_id", profileId)
        .eq("contact_profile_id", contact_profile_id);

      return json({ ok: true });
    }

    // ─── GET NICKNAMES ───
    if (action === "get-nicknames") {
      const { data: nicknames } = await sb
        .from("contact_nicknames")
        .select("contact_profile_id, nickname")
        .eq("owner_profile_id", profileId);

      const map: Record<string, string> = {};
      for (const n of nicknames || []) {
        map[n.contact_profile_id] = n.nickname;
      }
      return json({ nicknames: map });
    }

    // ─── START LOCATION SHARING ───
    if (action === "start-location-sharing") {
      const { conversation_id, latitude, longitude, accuracy } = body;
      if (!conversation_id || latitude == null || longitude == null) return err("Missing fields", 400);

      // Verify user is part of the conversation
      const { data: conv } = await sb
        .from("conversations")
        .select("user_profile_id, admin_profile_id")
        .eq("id", conversation_id)
        .single();
      if (!conv) return err("Conversation not found", 404);
      if (conv.user_profile_id !== profileId && conv.admin_profile_id !== profileId) return err("Not in conversation", 403);

      const viewerId = conv.user_profile_id === profileId ? conv.admin_profile_id : conv.user_profile_id;

      // Upsert location share
      const { error: upsertErr } = await sb
        .from("location_shares")
        .upsert({
          sharer_profile_id: profileId,
          viewer_profile_id: viewerId,
          conversation_id,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "sharer_profile_id,conversation_id" });

      if (upsertErr) return err("Failed to start sharing", 500);
      return json({ ok: true });
    }

    // ─── UPDATE LOCATION ───
    if (action === "update-location") {
      const { conversation_id, latitude, longitude, accuracy } = body;
      if (!conversation_id || latitude == null || longitude == null) return err("Missing fields", 400);

      const { error: updateErr } = await sb
        .from("location_shares")
        .update({
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("sharer_profile_id", profileId)
        .eq("conversation_id", conversation_id)
        .eq("active", true);

      if (updateErr) return err("Failed to update location", 500);
      return json({ ok: true });
    }

    // ─── STOP LOCATION SHARING ───
    if (action === "stop-location-sharing") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      await sb
        .from("location_shares")
        .update({ active: false })
        .eq("sharer_profile_id", profileId)
        .eq("conversation_id", conversation_id);

      return json({ ok: true });
    }

    // ─── GET SHARED LOCATION ───
    if (action === "get-shared-location") {
      const { conversation_id } = body;
      if (!conversation_id) return err("Missing conversation_id", 400);

      // Get location shared WITH me (I'm the viewer) — check specific conversation first,
      // then fall back to ANY active share where I'm the viewer (handles admin with multiple convos)
      let incoming = null;
      const { data: inConv } = await sb
        .from("location_shares")
        .select("*")
        .eq("viewer_profile_id", profileId)
        .eq("conversation_id", conversation_id)
        .eq("active", true)
        .maybeSingle();
      incoming = inConv;

      if (!incoming) {
        // Fallback: check any conversation where someone is sharing with me
        const { data: inAny } = await sb
          .from("location_shares")
          .select("*")
          .eq("viewer_profile_id", profileId)
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        incoming = inAny;
      }

      // Get my own sharing status
      const { data: outgoing } = await sb
        .from("location_shares")
        .select("*")
        .eq("sharer_profile_id", profileId)
        .eq("conversation_id", conversation_id)
        .eq("active", true)
        .maybeSingle();

      return json({
        incoming: incoming || null,
        outgoing: outgoing ? { active: true, updated_at: outgoing.updated_at } : null,
      });
    }

    return err("Unknown action", 400);
  } catch (e) {
    console.error("Messaging error:", e);
    return err("Internal error", 500);
  }
});
