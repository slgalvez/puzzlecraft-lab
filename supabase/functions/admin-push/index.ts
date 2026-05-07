import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY =
  "BNMV-W_UX_Jcq9A9Ff2zC9KP407ttvg0qOKd5E_xR3CniOvdAHabHKZjJIWvwN2j4oW4Pi_WmC--gzF6s8d3Fng";

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64url(arr: Uint8Array) {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string) {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}
function concatBytes(...arrays: Uint8Array[]) {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const r = new Uint8Array(len);
  let o = 0;
  for (const a of arrays) { r.set(a, o); o += a.length; }
  return r;
}

async function createVapidJwt(endpoint: string) {
  const rawKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const d = rawKey.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "https://puzzlecraft-lab.lovable.app",
  };
  const enc = new TextEncoder();
  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;
  const pub = b64urlDecode(VAPID_PUBLIC_KEY);
  const x = b64url(pub.slice(1, 33));
  const y = b64url(pub.slice(33, 65));
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)
  ));
  return `${unsigned}.${b64url(sig)}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info }, k, length * 8
  ));
}

async function encrypt(payload: string, p256dh: string, authKey: string) {
  const enc = new TextEncoder();
  const userPubBytes = b64urlDecode(p256dh);
  const authSecret = b64urlDecode(authKey);
  const localKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKP.publicKey));
  const userPubKey = await crypto.subtle.importKey(
    "raw", userPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPubKey }, localKP.privateKey, 256
  ));
  const ikmInfo = concatBytes(enc.encode("WebPush: info\0"), userPubBytes, localPubRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, ikmInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const plaintext = enc.encode(payload);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2;
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce }, aesKey, padded
  ));
  const rs = plaintext.length + 1 + 16;
  const rsBytes = new Uint8Array([(rs>>24)&0xff,(rs>>16)&0xff,(rs>>8)&0xff,rs&0xff]);
  return concatBytes(salt, rsBytes, new Uint8Array([localPubRaw.length]), localPubRaw, ct);
}

export async function sendWebPush(endpoint: string, p256dh: string, authKey: string, payload: string) {
  const jwt = await createVapidJwt(endpoint);
  const body = await encrypt(payload, p256dh, authKey);
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });
  return { ok: resp.ok, status: resp.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const sb = createClient(SUPABASE_URL, SR);
    const { data: prof } = await sb
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (!prof?.is_admin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action;

    if (action === "subscribe") {
      const { endpoint, p256dh, auth: authKey } = body;
      if (!endpoint || !p256dh || !authKey) return json({ error: "Missing fields" }, 400);
      const { error } = await sb.from("admin_push_subscriptions").upsert(
        { user_id: userId, endpoint, p256dh, auth: authKey },
        { onConflict: "user_id,endpoint" }
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "unsubscribe") {
      const { endpoint } = body;
      let q = sb.from("admin_push_subscriptions").delete().eq("user_id", userId);
      if (endpoint) q = q.eq("endpoint", endpoint);
      const { error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "test") {
      const { data: subs } = await sb
        .from("admin_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);
      if (!subs || subs.length === 0) return json({ ok: false, error: "No subscriptions" });
      const payload = JSON.stringify({
        title: "Test alert",
        body: "Admin push notifications are working.",
        tag: "admin-test",
        url: "/admin-bug-reports",
      });
      let sent = 0;
      for (const s of subs) {
        const r = await sendWebPush(s.endpoint, s.p256dh, s.auth, payload);
        if (r.ok) sent++;
        else if (r.status === 404 || r.status === 410) {
          await sb.from("admin_push_subscriptions").delete()
            .eq("user_id", userId).eq("endpoint", s.endpoint);
        }
      }
      return json({ ok: sent > 0, sent });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-push error:", e);
    return json({ error: String(e) }, 500);
  }
});
