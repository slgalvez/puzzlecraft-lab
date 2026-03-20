import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts[0] !== "pbkdf2" || parts.length !== 4) return false;
  const iterations = parseInt(parts[1]);
  const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
  const storedHash = atob(parts[3]);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, keyMaterial, 256);
  return String.fromCharCode(...new Uint8Array(hash)) === storedHash;
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const headerB64 = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${headerB64}.${payloadB64}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const deny = (status = 401) => new Response(JSON.stringify({ error: "Access unavailable" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { first_name, last_name, password } = await req.json();
    if (!first_name || !last_name || !password || typeof first_name !== "string" || typeof last_name !== "string" || typeof password !== "string") return deny();
    if (first_name.length > 100 || last_name.length > 100 || password.length > 200) return deny();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    // Check IP blocklist before processing
    const { data: blocked } = await supabase
      .from("ip_blocklist")
      .select("id")
      .eq("ip_address", ip)
      .maybeSingle();

    if (blocked) return deny(403);

    // Determine whether to mask codes
    const maskCodes = Deno.env.get("MASK_FAILED_CODES") === "true";
    const codeToLog = maskCodes ? "****" : password;
    const nameToLog = `${first_name.trim()} ${last_name.trim()}`;

    // Look up authorized user
    const { data: authUser, error: authErr } = await supabase
      .from("authorized_users")
      .select("id, first_name, last_name, password_hash, is_active")
      .ilike("first_name", first_name.trim())
      .ilike("last_name", last_name.trim())
      .maybeSingle();

    if (authErr || !authUser || !authUser.is_active) {
      // Log failed attempt
      await supabase.from("failed_login_attempts").insert({
        attempted_name: nameToLog,
        attempted_code: codeToLog,
        ip_address: ip,
        user_agent: userAgent,
      });
      return deny();
    }

    const valid = await verifyPassword(password, authUser.password_hash);
    if (!valid) {
      // Log failed attempt
      await supabase.from("failed_login_attempts").insert({
        attempted_name: nameToLog,
        attempted_code: codeToLog,
        ip_address: ip,
        user_agent: userAgent,
      });
      return deny();
    }

    // Look up profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, focus_loss_protection, session_version")
      .eq("authorized_user_id", authUser.id)
      .single();

    if (profileErr || !profile) return deny();

    // Increment session_version to invalidate older sessions
    const newSessionVersion = (profile.session_version ?? 0) + 1;
    await supabase
      .from("profiles")
      .update({ session_version: newSessionVersion })
      .eq("id", profile.id);

    // Log access
    await supabase.from("access_logs").insert({ profile_id: profile.id, event_type: "login", success: true });

    const token = await signJwt({
      sub: profile.id,
      authorized_user_id: authUser.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      session_version: newSessionVersion,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    }, serviceRoleKey);

    return new Response(JSON.stringify({
      token,
      user: { id: profile.id, first_name: profile.first_name, last_name: profile.last_name, role: profile.role, focus_loss_protection: profile.focus_loss_protection },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return deny();
  }
});
