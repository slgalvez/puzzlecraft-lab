/**
 * UpgradeModal.tsx
 * src/components/premium/UpgradeModal.tsx
 *
 * Dual-platform Puzzlecraft+ upgrade sheet.
 *
 * Platform logic:
 *   iOS native app (Capacitor)  → Apple IAP path (StoreKit, future)
 *   Web / PWA / iPad web        → Stripe Checkout redirect
 *
 * PUZZLECRAFT_PLUS_LAUNCHED = false  → modal still renders for testing,
 * but CTA buttons are disabled with a "coming soon" label.
 *
 * Usage:
 *   <UpgradeModal open={open} onClose={() => setOpen(false)} />
 *   <UpgradeModal open={open} onClose={...} trigger="difficulty" />
 */

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Crown, Zap, Infinity, BarChart3, Palette,
  Shield, Sparkles, CheckCircle2, X,
} from "lucide-react";
import { isNativeApp } from "@/lib/appMode";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";

// ─── Stripe config ────────────────────────────────────────────────────────────
// Replace with your real Stripe Payment Links
const STRIPE_MONTHLY_URL = "https://buy.stripe.com/REPLACE_MONTHLY";
const STRIPE_ANNUAL_URL  = "https://buy.stripe.com/REPLACE_ANNUAL";

// ─── Apple IAP product IDs (for future StoreKit integration) ─────────────────
const IAP_MONTHLY_PRODUCT = "com.puzzlecraft.plus.monthly";
const IAP_ANNUAL_PRODUCT  = "com.puzzlecraft.plus.annual";

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Zap,
    label: "Extreme & Insane difficulties",
    desc: "Unlock the hardest puzzle tiers",
  },
  {
    icon: BarChart3,
    label: "Full stats & skill rating",
    desc: "Rating, tier, trends, personal bests",
  },
  {
    icon: Infinity,
    label: "Unlimited craft puzzles",
    desc: "Send as many as you want each month",
  },
  {
    icon: Shield,
    label: "Streak shields",
    desc: "Protect your streak on missed days",
  },
  {
    icon: Sparkles,
    label: "Weekly themed packs",
    desc: "Exclusive curated puzzle collections",
  },
  {
    icon: Palette,
    label: "Early access to new types",
    desc: "Be first when new puzzles ship",
  },
] as const;

// ─── Trigger labels ────────────────────────────────────────────────────────────
type UpgradeTrigger =
  | "difficulty"
  | "craft-limit"
  | "stats"
  | "streak-shield"
  | "weekly-pack"
  | "generic";

const TRIGGER_COPY: Record<UpgradeTrigger, { headline: string; sub: string }> = {
  difficulty:    { headline: "Unlock harder puzzles",     sub: "Extreme & Insane difficulties are a Puzzlecraft+ feature." },
  "craft-limit": { headline: "You've hit your craft limit", sub: "Upgrade to send unlimited craft puzzles every month." },
  stats:         { headline: "See your full stats",       sub: "Rating, tier tracking, and deep analytics are Puzzlecraft+ features." },
  "streak-shield": { headline: "Protect your streak",    sub: "Streak shields let you skip a day without losing progress." },
  "weekly-pack": { headline: "Weekly packs await",       sub: "Curated themed packs are exclusive to Puzzlecraft+ members." },
  generic:       { headline: "Upgrade to Puzzlecraft+",  sub: "Unlock everything and support the app." },
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: UpgradeTrigger;
}

const UpgradeModal = ({ open, onClose, trigger = "generic" }: UpgradeModalProps) => {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const native = isNativeApp();
  const launched = PUZZLECRAFT_PLUS_LAUNCHED;
  const copy = TRIGGER_COPY[trigger];

  // ── Stripe redirect (web / PWA) ────────────────────────────────────────────
  const handleStripeCheckout = () => {
    if (!launched) return;
    const url = plan === "annual" ? STRIPE_ANNUAL_URL : STRIPE_MONTHLY_URL;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  // ── Apple IAP (native iOS) ─────────────────────────────────────────────────
  const handleAppleIAP = async () => {
    if (!launched) return;
    setLoading(true);
    try {
      // Future: wire up @capacitor-community/in-app-purchases or RevenueCat
      // const productId = plan === "annual" ? IAP_ANNUAL_PRODUCT : IAP_MONTHLY_PRODUCT;
      // await Purchases.purchaseProduct({ productIdentifier: productId });
      console.warn("Apple IAP not yet integrated. Product:", plan === "annual" ? IAP_ANNUAL_PRODUCT : IAP_MONTHLY_PRODUCT);
    } finally {
      setLoading(false);
    }
  };

  // ── Restore purchases (native iOS) ────────────────────────────────────────
  const handleRestorePurchases = async () => {
    if (!native) return;
    try {
      // Future: await Purchases.restoreTransactions();
      console.warn("Restore purchases: Apple IAP not yet integrated.");
    } catch {
      // noop
    }
  };

  const handleCTA = native ? handleAppleIAP : handleStripeCheckout;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "max-w-sm rounded-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl",
          "focus:outline-none",
        )}
      >
        {/* ── Header gradient ───────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary/90 to-primary px-6 pt-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-primary-foreground/60 hover:text-primary-foreground transition-colors p-1 rounded-full touch-manipulation"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-full bg-primary-foreground/15 p-1.5">
              <Crown size={16} className="text-primary-foreground" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/80">
              Puzzlecraft+
            </span>
          </div>

          <DialogHeader className="p-0 text-left">
            <DialogTitle className="text-primary-foreground text-xl font-bold leading-tight">
              {copy.headline}
            </DialogTitle>
            <p className="text-primary-foreground/75 text-sm mt-1 leading-snug">
              {copy.sub}
            </p>
          </DialogHeader>
        </div>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-2 bg-card">
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5 shrink-0 mt-0.5">
                  <Icon size={13} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                </div>
                <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5 ml-auto" />
              </li>
            ))}
          </ul>
        </div>

        {/* ── Plan picker ───────────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-2 bg-card">
          <div className="grid grid-cols-2 gap-2">
            {/* Annual */}
            <button
              type="button"
              onClick={() => setPlan("annual")}
              className={cn(
                "rounded-xl border p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
                plan === "annual"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-secondary/50 hover:border-primary/30",
              )}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-foreground">Annual</span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0.5 h-auto bg-emerald-500 hover:bg-emerald-500 shrink-0">
                  Save 42%
                </Badge>
              </div>
              <p className="font-mono text-lg font-bold text-foreground leading-none">$2.99</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">per month, billed yearly</p>
            </button>

            {/* Monthly */}
            <button
              type="button"
              onClick={() => setPlan("monthly")}
              className={cn(
                "rounded-xl border p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
                plan === "monthly"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-secondary/50 hover:border-primary/30",
              )}
            >
              <p className="text-xs font-bold text-foreground mb-1">Monthly</p>
              <p className="font-mono text-lg font-bold text-foreground leading-none">$4.99</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">per month</p>
            </button>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6 pt-4 bg-card">
          <Button
            className="w-full h-12 rounded-xl font-bold text-base touch-manipulation"
            onClick={handleCTA}
            disabled={!launched || loading}
          >
            <Crown size={15} className="mr-2" />
            {!launched
              ? "Coming Soon"
              : loading
                ? "Loading…"
                : native
                  ? `Subscribe ${plan === "annual" ? "($2.99/mo)" : "($4.99/mo)"}`
                  : `Get Puzzlecraft+ ${plan === "annual" ? "· $2.99/mo" : "· $4.99/mo"}`
            }
          </Button>

          {/* Restore purchases — Apple IAP only */}
          {native && launched && (
            <button
              type="button"
              onClick={handleRestorePurchases}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation py-2"
            >
              Restore purchases
            </button>
          )}

          <p className="mt-3 text-center text-[10px] text-muted-foreground leading-relaxed">
            {native
              ? "Subscriptions managed via Apple. Cancel anytime in Settings → Apple ID."
              : "Subscriptions managed via Stripe. Cancel anytime. Secure checkout."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
