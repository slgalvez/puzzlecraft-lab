const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface JwtPayload {
  sub: string;
  role: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, query, offset } = await req.json();

    const user = await verifyToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GIPHY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GIPHY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = 20;
    const pageOffset = offset || 0;
    let url: string;

    if (query && query.trim()) {
      url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query.trim())}&limit=${limit}&offset=${pageOffset}&rating=pg-13&lang=en`;
    } else {
      url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&offset=${pageOffset}&rating=pg-13`;
    }

    const resp = await fetch(url);
    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "GIPHY API error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = (data.data || []).map((gif: any) => ({
      id: gif.id,
      preview: gif.images?.fixed_width_small?.url || gif.images?.fixed_width?.url || "",
      full: gif.images?.original?.url || "",
      title: gif.title || "",
      width: Number(gif.images?.fixed_width_small?.width || 100),
      height: Number(gif.images?.fixed_width_small?.height || 100),
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
