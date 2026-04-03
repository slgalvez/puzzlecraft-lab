/**
 * MONETIZATION_REFINEMENTS.md
 *
 * Covering review items #23–#26:
 *  23. Paywall timing (handled by usePaywallTiming.ts)
 *  24. Craft limit too low for viral growth
 *  25. Annual plan savings not prominent enough (fixed in UpgradeModal.tsx)
 *  26. No free tier identity
 */

// ══════════════════════════════════════════════════════════════════════════════
// #24 — CRAFT LIMIT ADJUSTMENT
// ══════════════════════════════════════════════════════════════════════════════

/*
CURRENT: 3 craft puzzles per month (free)
PROBLEM: This throttles the viral loop. New users who try Craft can't
         send enough puzzles to get friends hooked before hitting the wall.

RECOMMENDATION: Change the limit from 3 crafts/month to this instead:

  Free users get:
  - Unlimited Word Search crafts (simplest type, best for first-time creators)
  - 2 Crossword crafts per month
  - 0 Cryptogram or Word Fill-In crafts (Plus only)

  Why this works better:
  - Word Search is the easiest to make and the easiest to share — viral potential
  - The recipient doesn't need an account to play it (already the case)
  - Free users can send unlimited Word Search puzzles → more friends exposed
  - Crossword + Cryptogram + Word Fill-In are the "premium craft experience"
  - The limit becomes a quality gate, not a quantity gate — less frustrating

  OR (simpler alternative):
  Raise the monthly limit from 3 → 10 for free users.
  10/month is enough to build the habit and spread the app virally.
  Plus users get unlimited.
  This is the simplest code change.

IMPLEMENTATION (simplest — raise the limit):
  In src/lib/premiumAccess.ts, change:
    export const FREE_CRAFT_LIMIT_PER_MONTH = 3;
  To:
    export const FREE_CRAFT_LIMIT_PER_MONTH = 10;

IMPLEMENTATION (type-based gates — more nuanced):
  In src/lib/premiumAccess.ts, add:

    export const FREE_CRAFT_TYPES: PuzzleCategory[] = ["word-search"];
    export const PLUS_CRAFT_TYPES: PuzzleCategory[] = [
      "word-search", "crossword", "cryptogram", "word-fill"
    ];
    export const FREE_CRAFT_LIMIT_BY_TYPE: Partial<Record<PuzzleCategory, number>> = {
      "word-search": Infinity,  // unlimited
      "crossword":   2,         // 2/month
    };

    export function isCraftTypeLocked(
      type: PuzzleCategory,
      account: { subscribed?: boolean; isAdmin?: boolean } | null
    ): boolean {
      if (hasPremiumAccess(account)) return false;
      return !FREE_CRAFT_TYPES.includes(type);
    }
*/

// ══════════════════════════════════════════════════════════════════════════════
// #26 — FREE TIER IDENTITY: "Puzzlecraft Explorer"
// ══════════════════════════════════════════════════════════════════════════════

/*
Free users have no sense of identity. They're just "not subscribers."
Naming the free tier makes the upgrade feel like a status change,
not just paying to remove a limit.

IMPLEMENTATION — 3 places to add this:

1. Account page (signed in, free): show "Puzzlecraft Explorer" badge
   In Account.tsx, in the profile card:

   <div className="flex items-center gap-2 mt-1">
     <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
       Explorer
     </span>
   </div>

2. Stats page header: show tier label
   Beneath the stats page title, for free users:
   "Puzzlecraft Explorer — upgrade to track your full rating"

3. UpgradeModal: contrast the tiers explicitly
   Add a "What changes" line to the feature list header:
   "Upgrade from Explorer to Puzzlecraft+"

The name "Explorer" is chosen deliberately:
  - Positive framing (you're exploring, not lacking)
  - Implies there's more to discover (drives curiosity about Plus)
  - Not "Basic" or "Free" which feel like second-class labels
*/

// ══════════════════════════════════════════════════════════════════════════════
// FREE TIER IDENTITY COMPONENT — add to Account.tsx
// ══════════════════════════════════════════════════════════════════════════════

// In Account.tsx, inside the profile card for signed-in free users:
{account && !isPremium && (
  <div className="flex items-center gap-1.5 mt-1.5">
    <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      Puzzlecraft Explorer
    </span>
    <button
      onClick={() => setUpgradeOpen(true)}
      className="text-[11px] text-primary underline underline-offset-2"
    >
      Upgrade
    </button>
  </div>
)}

// For subscribed users, show the Plus badge instead:
{account && isPremium && (
  <div className="flex items-center gap-1.5 mt-1.5">
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
      ✦ Puzzlecraft+
    </span>
  </div>
)}

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH SEQUENCE — when to flip PUZZLECRAFT_PLUS_LAUNCHED = true
// ══════════════════════════════════════════════════════════════════════════════

/*
Recommended order to get to launch-ready:

PHASE 1 — Web launch (can do this immediately):
  [ ] Stripe price IDs created (monthly + annual with 7-day trial)
  [ ] create-checkout Edge Function deployed
  [ ] stripe-webhook Edge Function deployed + webhook registered in Stripe
  [ ] Supabase user_profiles columns added (subscribed, subscription_platform, etc.)
  [ ] Stripe checkout tested end-to-end in test mode
  [ ] Flip PUZZLECRAFT_PLUS_LAUNCHED = true
  [ ] Deploy → web subscribers can now purchase via Stripe

PHASE 2 — iOS launch (after web is working):
  [ ] RevenueCat account created, app configured
  [ ] Apple IAP products created in App Store Connect (monthly + annual)
  [ ] @revenuecat/purchases-capacitor installed + configured
  [ ] initRevenueCat() called at app startup (in App.tsx PublicRoutes)
  [ ] apple-webhook Edge Function deployed + connected to RevenueCat
  [ ] Tested in TestFlight with Sandbox account
  [ ] App Store submission with IAP products attached

PHASE 3 — Cross-platform polish:
  [ ] If user subscribed on web, iOS shows them as subscribed (Supabase handles this)
  [ ] "Restore purchases" button tested on iOS (required by Apple)
  [ ] Subscription management (Stripe portal vs App Store) works per platform
*/
