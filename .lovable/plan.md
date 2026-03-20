
Goal: fix the stealth notification test flow so mobile Safari and the installed PWA can actually receive the test push, while keeping the rest of the app untouched.

What I found

- The device is subscribing successfully: permission is granted, push subscription is active, and the app knows it is installed.
- The remaining failure is server-side delivery, not client-side subscription.
- The backend logs still show `403 BadJwtToken` from Apple’s push service.
- That means Apple is rejecting the VAPID JWT itself, so the issue is now narrowed to VAPID auth details, not the Settings UI.

Implementation plan

1. Harden VAPID JWT generation in `supabase/functions/send-push/index.ts`
   - Replace the current hardcoded JWT `sub` claim with a safer subject that Apple accepts reliably:
     - use the published site URL as an `https://...` subject, or
     - support a configurable subject value if needed.
   - Keep `aud` exactly equal to the endpoint origin and keep `exp` safely under Apple’s 1-day limit.
   - Add a startup/self-check that signs a token with the stored private key and verifies it against the shipped public key.
   - If that verification fails, return a clear configuration error instead of attempting delivery.

2. Detect the real remaining config issue instead of masking it
   - Parse Apple’s JSON error response body, not just the HTTP status.
   - Surface reasons like:
     - `BadJwtToken`
     - `VapidPkHashMismatch`
     - `BadAuthorizationHeader`
   - Return these reasons from `test-push` so the UI can distinguish:
     - no device subscribed
     - device subscribed but Apple rejected auth
     - public/private VAPID key mismatch

3. Improve the Settings test result message in `src/pages/private/PrivateSettings.tsx`
   - Keep the current subscription flow.
   - Update the “Send test notification” result text so it shows the backend’s exact reason.
   - If the backend reports a VAPID mismatch/config problem, show that explicitly instead of generic `403 Forbidden`.

4. Keep scope tight
   - Only touch:
     - `supabase/functions/send-push/index.ts`
     - `src/pages/private/PrivateSettings.tsx`
   - Do not change:
     - puzzle flows
     - daily challenge
     - messaging behavior
     - login/auth flows
     - unrelated routing/UI

Expected outcome

- If the issue is the JWT subject format, test notifications will start delivering on iPhone/PWA after the code fix.
- If the issue is actually a mismatched VAPID key pair, the app will stop failing ambiguously and will report that exact problem so the backend key can be corrected cleanly.

Technical details

- Apple’s own error docs say `BadJwtToken` happens when the JWT is missing, signed with the wrong private key, uses an invalid subject, has the wrong audience, or expires too far in the future.
- Since base64url normalization was already added and the error persists, the most likely remaining causes are:
  1. invalid/unacceptable `sub`
  2. private key not matching the hardcoded public key used in subscriptions
- I’ll implement the code changes so the system both fixes the likely cause and positively identifies whether a secret/key-pair update is still required.
