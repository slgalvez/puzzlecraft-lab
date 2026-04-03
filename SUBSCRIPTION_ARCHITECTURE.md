# SUBSCRIPTION ARCHITECTURE
# ===========================
#
# You cannot use Stripe inside the iOS app for in-app purchases.
# Apple App Store guideline 3.1.1 is explicit: any digital content
# or subscriptions sold inside an iOS app MUST use Apple's IAP system.
# Submitting with Stripe checkout inside the app will cause App Store rejection.
#
# However: Stripe on your WEBSITE is completely fine. A user who subscribes
# on puzzlecraft.com via Stripe is a valid subscriber on iOS too — as long as
# both systems write to the same Supabase `subscribed` field.
#
# THE ARCHITECTURE:
#
#   puzzlecraft.com (web)          iOS App (Capacitor)
#         │                               │
#     Stripe Checkout               Apple IAP / StoreKit
#         │                               │
#    Stripe Webhook               Apple Server Notifications
#         │                               │
#         └──────────┬────────────────────┘
#                    ▼
#            Supabase Edge Function
#                    │
#                    ▼
#         user_profiles.subscribed = true
#         user_profiles.subscription_platform = "stripe" | "apple"
#         user_profiles.subscription_expires_at = <date>
#                    │
#                    ▼
#           useUserAccount() reads this
#                    │
#                    ▼
#           hasPremiumAccess() returns true
#                    │
#                    ▼
#         ALL gates open on both platforms
#
#
# RECOMMENDED BRIDGE: RevenueCat
# ─────────────────────────────────────────────────────────────────────────────
# RevenueCat (revenuecat.com) manages both Apple IAP and Stripe in one SDK.
# It gives you:
#  - One dashboard showing all subscribers regardless of platform
#  - Webhooks that fire for both Apple and Stripe events
#  - Entitlement system (map "puzzlecraft_plus" to both product IDs)
#  - Automatic receipt validation (Apple receipts are complex to validate manually)
#  - Subscription status sync across reinstalls and devices
#
# Without RevenueCat you'll spend weeks hand-rolling Apple receipt validation
# and cross-platform entitlement logic. It's free up to $2.5k MRR.
#
#
# THREE PATHS TO IMPLEMENT (choose one):
# ─────────────────────────────────────────────────────────────────────────────
#
# PATH A — RevenueCat (recommended)
#   iOS:  @revenuecat/purchases-capacitor package
#   Web:  RevenueCat Stripe integration (beta) or keep Stripe direct + webhook
#   Time: ~1-2 days setup
#
# PATH B — Apple IAP direct (no RevenueCat)
#   iOS:  @capacitor-community/in-app-purchases or native Swift StoreKit 2
#   Web:  Stripe stays as-is
#   Time: ~3-5 days, including manual receipt validation endpoint
#
# PATH C — Web-only subscription, iOS free
#   iOS:  Show "Subscribe on puzzlecraft.com" link (opens Safari)
#   Web:  Stripe as-is
#   Time: 1 day — fastest path to launch
#         Drawback: Apple may reject if the subscription is too prominent in-app
#                   (guideline 3.1.3 — you can mention it exists but can't
#                   deep-link to a purchase flow outside the app)
#
#
# RECOMMENDATION: Start with PATH C to launch, migrate to PATH A (RevenueCat)
# after your first 100 subscribers. Path C lets you flip
# PUZZLECRAFT_PLUS_LAUNCHED = true immediately once Stripe is tested.
#
#
# WHAT CHANGES BY PATH:
# ─────────────────────────────────────────────────────────────────────────────
#
# useSubscription.ts (built below) abstracts the platform detection.
# The rest of your app (hasPremiumAccess, gates, UpgradeModal) stays identical.
# Only the purchase call and the webhook change per path.
