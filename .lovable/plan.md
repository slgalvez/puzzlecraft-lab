

## Fix VAPID Key Mismatch for Push Notifications

### Problem
The `VAPID_PRIVATE_KEY` secret stored in the backend does not match the `VAPID_PUBLIC_KEY` hardcoded in both the edge function and the client. This causes the "Configuration error: VAPID private key does not match the public key — keys need to be regenerated" error shown in Settings.

### Solution
Generate a fresh VAPID key pair, then update all three locations:

1. **Add a temporary `generate-vapid` action** to the `send-push` edge function that creates a new P-256 key pair and returns both public and private keys
2. **Deploy and call it** to get the new keys
3. **Update `VAPID_PUBLIC_KEY`** in:
   - `supabase/functions/send-push/index.ts` (line 72)
   - `src/lib/privateNotifications.ts` (line 16)
4. **Update the `VAPID_PRIVATE_KEY` secret** with the new private key value
5. **Remove the temporary `generate-vapid` action** from the edge function (cleanup)

The client's existing VAPID key rotation logic in `subscribeToPush` will automatically detect the new public key and force browsers to re-subscribe — no client-side subscription fix needed.

### Files changed
- `supabase/functions/send-push/index.ts` — new public key constant, temporary keygen action (then removed)
- `src/lib/privateNotifications.ts` — new public key constant
- `VAPID_PRIVATE_KEY` secret — replaced with matching private key

