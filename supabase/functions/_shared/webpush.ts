// Shared Web Push (RFC 8291 / aes128gcm) sender for admin notifications.
const VAPID_PUBLIC_KEY =
  "BNMV-W_UX_Jcq9A9Ff2zC9KP407ttvg0qOKd5E_xR3CniOvdAHabHKZjJIWvwN2j4oW4Pi_WmC--gzF6s8d3Fng";

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
  const enc = new TextEncoder();
  const headerB64 = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payloadB64 = b64url(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "https://puzzlecraft-lab.lovable.app",
  })));
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

export async function sendAdminWebPush(endpoint: string, p256dh: string, authKey: string, payload: string) {
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

export { VAPID_PUBLIC_KEY };
