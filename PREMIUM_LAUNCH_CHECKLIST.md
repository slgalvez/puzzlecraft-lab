/**
 * PREMIUM_LAUNCH_CHECKLIST.md
 *
 * Before flipping PUZZLECRAFT_PLUS_LAUNCHED = true, every item below
 * must be checked. Flipping it live before these are done means users
 * will hit paywalls with no working checkout — the worst possible experience.
 */

// ══════════════════════════════════════════════════════════════════════════════
// CHECKLIST — work through this in order
// ══════════════════════════════════════════════════════════════════════════════

/*
PRE-LAUNCH (do before flipping the flag):

[ ] 1. Apple IAP product IDs created in App Store Connect
        - Monthly: com.puzzlecraft.plus.monthly
        - Annual:  com.puzzlecraft.plus.annual
        Both must be in "Ready to Submit" state, not "Missing Metadata"

[ ] 2. RevenueCat (or native StoreKit) wired into useUserAccount
        - handleUpgrade() in UpgradeModal must call the real purchase flow
        - On successful purchase, account.subscribed must be set to true
        - This is currently a TODO stub — it must work before launch

[ ] 3. Supabase user_profiles table has a `subscribed` boolean column
        - When RevenueCat webhook fires, update user_profiles.subscribed = true
        - useUserAccount() must read this column, not just localStorage

[ ] 4. Webhook endpoint set up to handle subscription events
        - subscription_created  → set subscribed = true
        - subscription_cancelled → set subscribed = false (on renewal failure)
        - subscription_renewed  → keep subscribed = true

[ ] 5. Test the full purchase flow end-to-end on a real device
        - Use a Sandbox test account in TestFlight
        - Verify: free user sees gates → upgrade CTA → purchase → gates open
        - Verify: subscribed user sees all premium content immediately

[ ] 6. Test the 7-day free trial (UpgradeModal shows "Start Free Trial")
        - Free trial must appear in App Store Connect product config
        - Verify trial starts and doesn't charge until day 8

[ ] 7. "Manage Subscription" button in Account.tsx opens App Store subscription page
        Currently navigates to apple.com/manage — verify this works on device

[ ] 8. Verify admin bypass still works
        - user_profiles.is_admin = true should give full access regardless of subscribed

FLIP THE FLAG:
[ ] 9. In src/lib/premiumAccess.ts, change:
        export const PUZZLECRAFT_PLUS_LAUNCHED = false;
        → export const PUZZLECRAFT_PLUS_LAUNCHED = true;

[ ] 10. Deploy to TestFlight, test all gates with a fresh (non-admin) account
         - Craft limit: free users should see 3/month counter
         - Difficulty: Extreme and Insane should show lock + crown badge
         - Stats: free users should see blurred PremiumStats with upgrade CTA
         - Rating card: free users should see teaser, not full rating

POST-LAUNCH:
[ ] 11. Set up Supabase webhook for subscription events (if not using RevenueCat)
[ ] 12. Monitor UpgradeModal conversion rate in first 7 days
[ ] 13. A/B test: monthly-default vs annual-default (annual converts better)
*/

// ══════════════════════════════════════════════════════════════════════════════
// THE ONE LINE CHANGE (do last, after all above are done):
// ══════════════════════════════════════════════════════════════════════════════

// In src/lib/premiumAccess.ts, line ~8:
// BEFORE:
export const PUZZLECRAFT_PLUS_LAUNCHED = false;
// AFTER:
export const PUZZLECRAFT_PLUS_LAUNCHED = true;

// That single change activates:
// - Craft limit enforcement (3/month free)
// - Difficulty locks (Extreme, Insane require Plus)
// - Stats gating (advanced analytics require Plus)
// - Rating card teaser for free users
// - Upgrade CTAs in DifficultySelector, CraftTab, CraftPuzzle, Stats
// - UpgradeModal appearing from all entry points
