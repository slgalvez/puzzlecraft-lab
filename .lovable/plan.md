

## Fix VAPID Key Pair — Generate Fresh Matching Keys

### Problem
The current `VAPID_PRIVATE_KEY` secret does not correspond to the hardcoded `VAPID_PUBLIC_KEY`. You cannot derive the correct private key from the public key — the only fix is to generate a **new matching pair** and update both sides.

### Plan

**Step 1 — Generate a fresh VAPID key pair server-side**

Add a temporary `generate-vapid` action to `supabase/functions/send-push/index.ts` that:
- Generates a new P-256 key pair using `crypto.subtle.generateKey`
- Exports and returns both the public key (uncompressed, base64url) and the private key (`d` coordinate, base64url)
- This action requires no auth (temporary, removed after use)

**Step 2 — Call the generator, capture both keys**

Invoke the edge function to get the new pair. Then:
- Update `VAPID_PUBLIC_KEY` constant in both:
  - `src/lib/privateNotifications.ts`
  - `supabase/functions/send-push/index.ts`
- Update the `VAPID_PRIVATE_KEY` secret with the new private key value

**Step 3 — Remove the temporary generator action**

Delete the `generate-vapid` action from the edge function code after the keys are captured.

**Step 4 — Redeploy and test**

- Deploy the updated edge function
- The client's existing VAPID rotation logic will detect the public key change and force re-subscription automatically
- Send a test push to confirm end-to-end delivery

### Files changed
- `supabase/functions/send-push/index.ts` — temporary keygen action, then updated public key
- `src/lib/privateNotifications.ts` — updated public key
- `VAPID_PRIVATE_KEY` secret — replaced with matching private key

### What is NOT touched
- Auth, routing, messaging, notification dispatch, service worker

