import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { first_name, last_name, password } = await req.json();

    // Input validation
    if (
      !first_name ||
      !last_name ||
      !password ||
      typeof first_name !== "string" ||
      typeof last_name !== "string" ||
      typeof password !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Access unavailable" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (first_name.length > 100 || last_name.length > 100 || password.length > 200) {
      return new Response(
        JSON.stringify({ error: "Access unavailable" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to query authorized_users
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: user, error: dbError } = await supabase
      .from("authorized_users")
      .select("id, first_name, last_name, password_hash")
      .ilike("first_name", first_name.trim())
      .ilike("last_name", last_name.trim())
      .maybeSingle();

    if (dbError || !user) {
      return new Response(
        JSON.stringify({ error: "Access unavailable" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password against stored hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Access unavailable" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a simple session token (HMAC-based)
    const secret = serviceRoleKey; // Use service role key as HMAC secret
    const payload = {
      sub: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    };

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const headerB64 = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadB64 = btoa(JSON.stringify(payload));
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const token = `${headerB64}.${payloadB64}.${sigB64}`;

    return new Response(
      JSON.stringify({
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Access unavailable" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
