import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyToken(token: string) {
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
  const payload = JSON.parse(atob(payloadB64));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload as { sub: string; role: string; session_version?: number };
}

const ALLOWED_TYPES = ["image/gif", "image/png", "image/jpeg", "image/webp", "audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** Check if a MIME type is allowed — strips codec params (e.g. audio/webm;codecs=opus → audio/webm) */
function isAllowedType(mime: string): boolean {
  const base = mime.split(";")[0].trim().toLowerCase();
  return ALLOWED_TYPES.includes(base);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversation_id") as string;

    if (!token || !file || !conversationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth
    const user = await verifyToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Access unavailable" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: "File type not allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // Session version check
    const { data: profile } = await sb
      .from("profiles")
      .select("session_version")
      .eq("id", user.sub)
      .single();
    if (profile && user.session_version !== undefined && profile.session_version !== user.session_version) {
      return new Response(JSON.stringify({ error: "Session ended" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is part of this conversation
    const { data: conv } = await sb
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .or(`user_profile_id.eq.${user.sub},admin_profile_id.eq.${user.sub}`)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique path
    const ext = file.name.split(".").pop()?.toLowerCase() || "gif";
    const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await sb.storage
      .from("chat-media")
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", JSON.stringify(uploadError));
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a signed URL (valid for 7 days — will be refreshed on fetch)
    const { data: signedData, error: signError } = await sb.storage
      .from("chat-media")
      .createSignedUrl(path, 7 * 24 * 60 * 60);

    if (signError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not generate URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      url: signedData.signedUrl,
      path,
      type: file.type,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Upload media error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
