

## Diagnosis

The edge function logs show the real error: **`403 BadJwtToken`** from Apple's push service. The subscription row **does exist** in the database (profile `3687afff...`, endpoint `web.push.apple.com/...`). The "No devices subscribed" message is a **client-side reporting bug**, not a missing subscription.

Two distinct problems:

1. **VAPID JWT rejected by Apple** — The `BadJwtToken` response means Apple cannot verify the JWT signature. Most likely cause: the `VAPID_PRIVATE_KEY` secret is stored in standard base64 format (with `+`, `/`) instead of base64url (with `-`, `_`), causing `crypto.subtle.importKey("jwk", ...)` to silently produce the wrong key. The JWK `d` parameter requires strict base64url encoding.

2. **Misleading error message** — When test-push finds subscriptions but delivery fails, the backend returns `{ ok: false, sent: 0, failed: 1, results: [...] }` with **no `error` field**. The client code (`result.error || "No devices subscribed"`) then falls through to the hardcoded fallback.

## Plan

### 1. Fix VAPID private key handling in edge function
**File: `supabase/functions/send-push/index.ts`**

In `createVapidJwt`, normalize the private key to base64url before passing to JWK:
```
let d = Deno.env.get("VAPID_PRIVATE_KEY")!;
d = d.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
```

Add a verification step: after importing the signing key, do a quick sign+verify round-trip to catch key pair mismatches early and log a clear error.

### 2. Fix test-push error reporting in edge function
**File: `supabase/functions/send-push/index.ts`**

When `sent === 0` and `failed > 0`, include an `error` field in the response with the actual failure reason (e.g., `"Push delivery failed (403 BadJwtToken)"`).

### 3. Fix client-side error display
**File: `src/pages/private/PrivateSettings.tsx`**

Update `handleTestPush` to show the backend's actual error message instead of the hardcoded "No devices subscribed" fallback. Show `result.error` when present, or compose a message from `result.failed`/`result.results` when available.

### Summary
- 2 files modified: `supabase/functions/send-push/index.ts`, `src/pages/private/PrivateSettings.tsx`
- No changes to auth, routing, messaging logic, service worker, or notification phrasing
- Fixes the actual push delivery failure and eliminates the misleading error message

