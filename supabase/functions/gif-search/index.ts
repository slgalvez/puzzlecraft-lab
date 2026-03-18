import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const TENOR_API_KEY = Deno.env.get("TENOR_API_KEY");
    if (!TENOR_API_KEY) {
      return new Response(JSON.stringify({ error: "GIF service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, token, query, pos, limit } = await req.json();

    // Verify token using the same approach as messaging function
    if (!token || token.split(".").length !== 3) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [headerB64, payloadB64, sigB64] = token.split(".");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    let sigRestored = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    while (sigRestored.length % 4) sigRestored += "=";
    const sigBytes = Uint8Array.from(atob(sigRestored), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(`${headerB64}.${payloadB64}`));
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchLimit = Math.min(Number(limit) || 20, 30);

    let tenorUrl: string;

    if (action === "search" && query && typeof query === "string") {
      tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=puzzlecraft_private&limit=${searchLimit}&media_filter=tinygif,gif`;
      if (pos) tenorUrl += `&pos=${encodeURIComponent(pos)}`;
    } else if (action === "trending") {
      tenorUrl = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=puzzlecraft_private&limit=${searchLimit}&media_filter=tinygif,gif`;
      if (pos) tenorUrl += `&pos=${encodeURIComponent(pos)}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(tenorUrl);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Tenor API error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();

    // Simplify response to just what the client needs
    const results = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || "",
      preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || "",
      url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || "",
      dims: r.media_formats?.tinygif?.dims || [200, 200],
    }));

    return new Response(JSON.stringify({ results, next: data.next || "" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
