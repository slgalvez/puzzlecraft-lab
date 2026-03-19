

## Plan: Delete Unused `add-authorized-user` Edge Function

### What
Remove the vulnerable, unused `add-authorized-user` edge function to close the security finding.

### Changes

1. **Delete** `supabase/functions/add-authorized-user/index.ts`
2. **Remove** the `[functions.add-authorized-user]` block from `supabase/config.toml`

No other code references this function — all user management goes through the `messaging` function with admin checks.

