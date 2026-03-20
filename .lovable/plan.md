

## Save Generated VAPID Private Key

### Steps

1. **Call the `generate-vapid` action** on the deployed `send-push` edge function to produce a fresh P-256 key pair
2. **Update the `VAPID_PRIVATE_KEY` secret** with the returned private key (`d` coordinate)
3. **Update `VAPID_PUBLIC_KEY`** in both:
   - `supabase/functions/send-push/index.ts`
   - `src/lib/privateNotifications.ts`
4. **Remove the `generate-vapid` action** from the edge function (cleanup)
5. **Redeploy** — the client's existing rotation logic will detect the new public key and force re-subscription automatically

### Files changed
- `supabase/functions/send-push/index.ts` — new public key, remove temp action
- `src/lib/privateNotifications.ts` — new public key
- `VAPID_PRIVATE_KEY` secret — replaced via tool

