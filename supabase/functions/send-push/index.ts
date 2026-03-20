import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-region, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
  session_version?: number;
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token || token.split(".").length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = token.split(".");
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  let sigRestored = sigB64.replace(/-/g, "+").replace(/_/g, "/");
  while (sigRestored.length % 4) sigRestored += "=";
  const sigBytes = Uint8Array.from(atob(sigRestored), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(atob(payloadB64)) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

// ── Helpers ──

function b64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

// ── VAPID JWT (ES256) ──

const VAPID_PUBLIC_KEY =
  "BJrEgKHA6zTGGE2HCv4B9Fr8zjBIP7ebEyR94U2YWbEA9iM0WYTCb2BbWDizAWbdFuEOV90FX11dMqOi1YkCcP0";

async function createVapidJwt(endpoint: string): Promise<string> {
  // Normalize private key to strict base64url (no +, /, or = padding)
  const rawKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const privateKeyB64url = rawKey.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const audience = new URL(endpoint).origin;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:noreply@puzzlecraft-lab.lovable.app",
  };

  const enc = new TextEncoder();
  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pubKeyBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  const x = b64url(pubKeyBytes.slice(1, 33));
  const y = b64url(pubKeyBytes.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: privateKeyB64url },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      enc.encode(unsignedToken)
    )
  );

  // Convert DER → raw r||s if needed
  let raw: Uint8Array;
  if (sig.length === 64) {
    raw = sig;
  } else {
    let off = 2;
    off++; // 0x02
    const rLen = sig[off++];
    const r = sig.slice(off, off + rLen);
    off += rLen;
    off++; // 0x02
    const sLen = sig[off++];
    const s = sig.slice(off, off + sLen);
    raw = new Uint8Array(64);
    raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  }

  return `${unsignedToken}.${b64url(raw)}`;
}

// ── RFC 8291 + RFC 8188 aes128gcm encryption ──

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) {
    result.set(a, off);
    off += a.length;
  }
  return result;
}

function buildInfo(
  type: string,
  clientPub: Uint8Array,
  serverPub: Uint8Array
): Uint8Array {
  const enc = new TextEncoder();
  // "WebPush: info\0" + client_public(65) + server_public(65)
  // Then wrapped: "Content-Encoding: <type>\0" + \0 + context
  // RFC 8291 §3.4 info for key/nonce derivation:
  // info = "Content-Encoding: " + type + \0 + "P-256" + \0 +
  //        len(client_public) as 2 bytes + client_public +
  //        len(server_public) as 2 bytes + server_public

  const label = enc.encode(`Content-Encoding: ${type}\0P-256\0`);
  const clientLen = new Uint8Array(2);
  clientLen[0] = (clientPub.length >> 8) & 0xff;
  clientLen[1] = clientPub.length & 0xff;
  const serverLen = new Uint8Array(2);
  serverLen[0] = (serverPub.length >> 8) & 0xff;
  serverLen[1] = serverPub.length & 0xff;

  return concatBytes(label, clientLen, clientPub, serverLen, serverPub);
}

async function encryptPayload(
  payloadText: string,
  p256dhB64url: string,
  authB64url: string
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const userPubBytes = b64urlDecode(p256dhB64url); // 65 bytes uncompressed
  const authSecret = b64urlDecode(authB64url); // 16 bytes

  // 1. Generate ephemeral ECDH key pair
  const localKP = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKP.publicKey)
  ); // 65 bytes

  // 2. ECDH shared secret
  const userPubKey = await crypto.subtle.importKey(
    "raw",
    userPubBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPubKey },
      localKP.privateKey,
      256
    )
  );

  // 3. RFC 8291 §3.3 — IKM from auth secret
  // ikm = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" + ua_public + as_public, 32)
  const ikmInfo = concatBytes(
    enc.encode("WebPush: info\0"),
    userPubBytes,
    localPubRaw
  );
  const ikm = await hkdfDerive(authSecret, ecdhSecret, ikmInfo, 32);

  // 4. Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. Derive CEK (16 bytes) and nonce (12 bytes) per RFC 8291 §3.4
  const cekInfo = buildInfo("aesgcm128", userPubBytes, localPubRaw);
  const nonceInfo = buildInfo("nonce", userPubBytes, localPubRaw);

  // Actually RFC 8291 with aes128gcm uses simpler info strings:
  // CEK info  = "Content-Encoding: aes128gcm\0"
  // Nonce info = "Content-Encoding: nonce\0"
  const cekInfoFinal = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfoFinal = enc.encode("Content-Encoding: nonce\0");

  const cek = await hkdfDerive(salt, ikm, cekInfoFinal, 16);
  const nonce = await hkdfDerive(salt, ikm, nonceInfoFinal, 12);

  // 6. Pad plaintext: payload + delimiter 0x02 (final record)
  const plaintext = enc.encode(payloadText);
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2; // delimiter for final record

  // 7. Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      padded
    )
  );

  // 8. Build RFC 8188 aes128gcm body:
  //    salt(16) + rs(4, big-endian) + idlen(1) + keyid(65 = server pub) + ciphertext
  const rs = plaintext.length + 1 + 16; // record size = padded plaintext + tag(16)
  const rsBytes = new Uint8Array(4);
  rsBytes[0] = (rs >> 24) & 0xff;
  rsBytes[1] = (rs >> 16) & 0xff;
  rsBytes[2] = (rs >> 8) & 0xff;
  rsBytes[3] = rs & 0xff;
  const idLen = new Uint8Array([localPubRaw.length]); // 65

  return concatBytes(salt, rsBytes, idLen, localPubRaw, ciphertext);
}

// ── Send push to endpoint ──

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payloadJson: string
): Promise<{ ok: boolean; status: number; statusText: string }> {
  try {
    const jwt = await createVapidJwt(endpoint);
    const body = await encryptPayload(payloadJson, p256dh, auth);

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

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(`Push delivery failed: ${resp.status} ${resp.statusText} — ${text}`);
    }

    return { ok: resp.ok, status: resp.status, statusText: resp.statusText };
  } catch (e) {
    console.error("sendWebPush error:", e);
    return { ok: false, status: 0, statusText: String(e) };
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // ── SUBSCRIBE ──
    if (action === "subscribe") {
      const user = await verifyToken(token);
      if (!user) return err("Unauthorized", 401);

      const { endpoint, p256dh, auth: authKey } = body;
      if (!endpoint || !p256dh || !authKey)
        return err("Missing subscription data");

      const { error: upsertErr } = await sb
        .from("push_subscriptions")
        .upsert(
          { profile_id: user.sub, endpoint, p256dh, auth: authKey },
          { onConflict: "profile_id,endpoint" }
        );

      if (upsertErr) {
        console.error("Subscribe error:", JSON.stringify(upsertErr));
        return err("Could not save subscription");
      }

      return json({ ok: true });
    }

    // ── UNSUBSCRIBE ──
    if (action === "unsubscribe") {
      const user = await verifyToken(token);
      if (!user) return err("Unauthorized", 401);

      const { endpoint } = body;
      if (endpoint) {
        await sb
          .from("push_subscriptions")
          .delete()
          .eq("profile_id", user.sub)
          .eq("endpoint", endpoint);
      } else {
        await sb
          .from("push_subscriptions")
          .delete()
          .eq("profile_id", user.sub);
      }

      return json({ ok: true });
    }

    // ── TEST PUSH ──
    if (action === "test-push") {
      const user = await verifyToken(token);
      if (!user) return err("Unauthorized", 401);

      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("profile_id", user.sub);

      if (!subs || subs.length === 0) {
        return json({
          ok: false,
          error: "No push subscriptions found",
          sent: 0,
        });
      }

      const payload = JSON.stringify({
        title: "Puzzlecraft",
        body: "Test notification — push is working!",
        tag: "test-notification",
        url: "/p/settings",
      });

      let sent = 0;
      let failed = 0;
      const results: Array<{ status: number; statusText: string }> = [];

      for (const sub of subs) {
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload
        );
        results.push({ status: result.status, statusText: result.statusText });
        if (result.ok) {
          sent++;
        } else {
          failed++;
          if (result.status === 410 || result.status === 404) {
            await sb
              .from("push_subscriptions")
              .delete()
              .eq("profile_id", user.sub)
              .eq("endpoint", sub.endpoint);
          }
        }
      }

      // Include explicit error when all deliveries failed
      const firstFailure = results.find((r) => r.status !== 200 && r.status !== 201);
      const errorMsg =
        sent === 0 && failed > 0 && firstFailure
          ? `Push delivery failed (${firstFailure.status} ${firstFailure.statusText})`
          : undefined;

      return json({ ok: sent > 0, sent, failed, results, ...(errorMsg ? { error: errorMsg } : {}) });
    }

    // ── SEND PUSH (internal) ──
    if (action === "send-push") {
      const { target_profile_id, title, body: pushBody, tag, url } = body;
      if (!target_profile_id || !pushBody) return err("Missing params");

      const { data: subs } = await sb
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("profile_id", target_profile_id);

      if (!subs || subs.length === 0) {
        return json({ ok: true, sent: 0, reason: "no_subscriptions" });
      }

      const payload = JSON.stringify({
        title: title || "Puzzlecraft",
        body: pushBody,
        tag: tag || "private-notification",
        url: url || "/p",
      });

      let sent = 0;
      for (const sub of subs) {
        const result = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload
        );
        if (result.ok) {
          sent++;
        } else if (result.status === 410 || result.status === 404) {
          await sb
            .from("push_subscriptions")
            .delete()
            .eq("profile_id", target_profile_id)
            .eq("endpoint", sub.endpoint);
        }
      }

      return json({ ok: true, sent });
    }

    return err("Unknown action", 400);
  } catch (e) {
    console.error("send-push error:", e);
    return err("Internal error", 500);
  }
});
