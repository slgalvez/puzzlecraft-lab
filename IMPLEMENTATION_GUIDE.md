# SUBSCRIPTION GATING — IMPLEMENTATION GUIDE
# =============================================
# Complete layered security model for Puzzlecraft+
# Apply all layers. Each one is necessary. None alone is sufficient.

## THE 5 LAYERS (apply in this order)

───────────────────────────────────────────────────────────────────────────
LAYER 1 — SQL (Database — cannot be bypassed by any client)
File: SUBSCRIPTION_RLS.sql → run in Supabase SQL Editor
───────────────────────────────────────────────────────────────────────────
DO THIS FIRST before any code changes.

What it does:
  - Creates user_has_active_subscription() DB function that checks
    user_profiles.subscribed AND subscription_expires_at <= now()
  - RLS on user_profiles: users can only read/write their own row
  - RLS on leaderboard_entries: INSERT/UPDATE requires active subscription
    (enforced at DB level — a free user cannot write to the leaderboard
    even with a direct supabase-js call from dev tools)
  - RLS on daily_scores: public reads, anyone can write their own score
  - Unique constraint on daily_scores(date_str, user_id) for upserts

Why this matters:
  Even if someone opens DevTools and calls supabase.from('leaderboard_entries').insert(...)
  the RLS policy will reject it because their user_profiles.subscribed is false.
  No frontend code change can bypass this.

───────────────────────────────────────────────────────────────────────────
LAYER 2 — Edge Function (Server — validates against DB with service role)
File: check-subscription.ts → supabase/functions/check-subscription/index.ts
───────────────────────────────────────────────────────────────────────────
Replace your existing check-subscription function with this version.

What it does:
  - Verifies the caller's JWT first — anonymous calls get subscribed=false
  - Reads subscription status using SERVICE ROLE KEY (bypasses RLS, sees truth)
  - Checks subscription_expires_at — expired subscriptions get subscribed=false
  - Auto-revokes in DB if found expired (keeps data clean)
  - Admins always get subscribed=true
  - Returns safe default (false) on any error

Why this matters:
  The `subscribed` boolean in UserAccountContext comes ONLY from this function.
  It cannot be set by localStorage, React state manipulation, or any client code.
  This is the authoritative server-side check.

───────────────────────────────────────────────────────────────────────────
LAYER 3 — premiumAccess.ts (Client — derives from server-validated state)
File: premiumAccess.ts → src/lib/premiumAccess.ts
───────────────────────────────────────────────────────────────────────────
Full replacement of premiumAccess.ts.

Key changes from previous versions:
  - PUZZLECRAFT_PLUS_LAUNCHED = true (gating is now active)
  - hasPremiumAccess(subscribed, isAdmin, loading) — takes loading as param
  - While loading=true → isPremium=false (no flash of premium content)
  - showUpgradeCTA=false while loading (no false upgrade prompts)
  - usePremiumAccess() hook now exposes loading: accountLoading || checkingSubscription

Why this matters:
  Closes the "flash window" where premium content could momentarily render
  before the server check completes. Also ensures the API signature is clean
  — components never need to access subscribed directly, only through this hook.

───────────────────────────────────────────────────────────────────────────
LAYER 4 — UserAccountContext.tsx (Client — subscription state management)
File: UserAccountContext_Patch.ts → apply patches to src/contexts/UserAccountContext.tsx
───────────────────────────────────────────────────────────────────────────
5 targeted patches to the existing context. Read the patch file carefully —
it's annotated with exactly what to find and change.

Key changes:
  - Add `loading` to context interface and Provider value
    (it's already a useState — just needs to be exposed)
  - Reset subscribed=false at the START of handleSession, before checking
    the session state — ensures no stale "subscribed" from previous session
  - Add refreshAccount() for post-purchase state refresh

───────────────────────────────────────────────────────────────────────────
LAYER 5 — PremiumGate.tsx (UI — unified subscription guard component)
File: PremiumGate.tsx → src/components/premium/PremiumGate.tsx
───────────────────────────────────────────────────────────────────────────
Replace the existing PremiumGate.tsx with this version.

Three states:
  LOADING  → renders null or skeleton (no premium content visible)
  LOCKED   → blurred teaser + upgrade CTA
  UNLOCKED → children rendered normally

Use this to wrap ALL premium UI sections:
  <PremiumGate feature="Advanced Stats">
    <PremiumStats />
  </PremiumGate>


## WHAT EACH GATED FEATURE LOOKS LIKE AFTER IMPLEMENTATION

Feature                  Free / Signed-out          Subscribed
────────────────────────────────────────────────────────────────────
Extreme / Insane         Lock icon + "Plus" badge    Normal difficulty tiles
Craft limit              Counter banner, blocked     Unlimited, no banner
Advanced stats           Blurred + upgrade CTA       Full analytics
Rating card              Teaser + upgrade CTA        Full rating + tier
Milestones               Locked                      Full access
Streak Shield            Upgrade nudge               Auto-granted monthly
Weekly pack early access Locked until Sunday         Unlocks Friday
Leaderboard writes       Blocked at DB level         Allowed by RLS policy


## TESTING CHECKLIST (run after applying all layers)

───────── FRONTEND TESTS ─────────────────────────────────────────────────

[ ] Sign out completely → confirm all premium sections show locked state
[ ] Sign in as free user → same locked state as signed out
[ ] Check browser DevTools → Network tab → check-subscription response
    should show: { "subscribed": false, "subscription_end": null }
[ ] Attempt to modify React state in DevTools console:
    window.__setSubscribed = true (should have no effect — subscribed
    comes from context which re-validates from server)
[ ] Navigate directly to /stats → advanced analytics section should be
    locked or hidden, not accessible
[ ] Check that difficulty selector shows locks on Extreme/Insane for free users
[ ] Check that craft limit counter shows and blocks share at limit

───────── SERVER TESTS ────────────────────────────────────────────────────

[ ] Run this in the Supabase SQL editor as a regular user:
    SELECT public.user_has_active_subscription();
    → Should return false for a non-subscribed user

[ ] Try inserting a leaderboard entry as a free user via the API:
    supabase.from('leaderboard_entries').insert({...})
    → Should fail with RLS policy error

[ ] Verify check-subscription edge function:
    curl -X POST https://your-project.supabase.co/functions/v1/check-subscription \
      -H "Authorization: Bearer <your-anon-token>"
    → Should return { "subscribed": false }

───────── SUBSCRIPTION FLOW TESTS ────────────────────────────────────────

[ ] Subscribe via Stripe → verify check-subscription returns subscribed=true
[ ] Cancel subscription → after subscription_expires_at passes,
    check-subscription should return subscribed=false
[ ] Try to access premium features after cancellation → should be locked
[ ] Admin account → should always have full access regardless of subscription


## WHAT CANNOT BE BYPASSED

Cannot bypass via:
  ✗ localStorage manipulation — subscribed comes from server edge function
  ✗ React DevTools state editing — context re-syncs from server every 60s
  ✗ Direct URL access — PremiumGate renders null/locked during load
  ✗ Direct Supabase API calls — RLS policies block writes for free users
  ✗ JWT manipulation — edge function verifies JWT server-side

Can theoretically be bypassed (acceptable tradeoffs):
  ~ Up to 60 second window after subscription expires before UI updates
    (server revokes immediately, frontend polls every 60s — acceptable)
  ~ Admin can grant access without a subscription (intentional)


## STRIPE WEBHOOK — ENSURE THIS WRITES TO user_profiles

Your stripe-webhook edge function must write to user_profiles when events fire.
The check-subscription function reads from user_profiles — if this isn't updated,
subscriptions won't activate. Verify these events set subscribed=true:

  checkout.session.completed       → subscribed=true, set expires_at
  invoice.payment_succeeded        → subscribed=true, update expires_at
  customer.subscription.deleted    → subscribed=false
  invoice.payment_failed           → subscribed=false (or after grace period)
  customer.subscription.updated    → update expires_at if changed

See STRIPE_EDGE_FUNCTIONS.md for the full webhook implementation.
