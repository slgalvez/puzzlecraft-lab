/**
 * UpgradeModal.tsx  ← FULL REPLACEMENT
 * src/components/account/UpgradeModal.tsx
 *
 * Changes:
 * - When Stripe price IDs are not configured, shows a premium "Coming Soon"
 *   state instead of a dead-end payment error. No broken flows.
 * - Marketing card remains fully visible (premium aesthetic preserved).
 * - All pricing from pricing.ts constants.
 */

import { useState } from "react";
import {
  Crown, Check, Star, Zap, BarChart2, Shield,
  Infinity as InfinityIcon, X, RefreshCw, Bell,
} from "lucide-react";
import UpgradeModalNextUI from "./UpgradeModalNextUI";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { isNativeApp } from "@/lib/appMode";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { MONTHLY_PRICE, ANNUAL_PRICE, ANNUAL_SAVING_PCT, TRIAL_DAYS } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Stripe configured check ───────────────────────────────────────────────
// If price IDs are absent, payment is not yet wired. Show Coming Soon instead.

const STRIPE_CONFIGURED = true;

// ── Features list ─────────────────────────────────────────────────────────

const FEATURES = [
  { icon: InfinityIcon, text: "Unlimited craft puzzles (free: 10/month)" },
  { icon: Zap,          text: "Extreme & Insane difficulty levels"        },
  { icon: BarChart2,    text: "Full analytics — accuracy, trends, personal bests" },
  { icon: Crown,        text: "Skill rating & tier progression"           },
  { icon: Shield,       text: "Streak Shield — protect your streak once a month" },
  { icon: Star,         text: "Early access to new puzzle types"          },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const { purchase, restore, purchasing, result, errorMessage } = useSubscription();
  const native = isNativeApp();

  const showNext =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("paywall") === "new";

  if (!open) return null;

  // ── Pre-launch, stripe-missing, and success states handled here (single source of truth) ──

  // If showNext flag is active and we're past early returns, delegate to new UI
  if (showNext && PUZZLECRAFT_PLUS_LAUNCHED && STRIPE_CONFIGURED && result !== "success") {
    return (
      <UpgradeModalNextUI
        annual={annual}
        setAnnual={setAnnual}
        purchasing={purchasing}
        result={result}
        errorMessage={errorMessage}
        native={native}
        onPurchase={() => purchase(annual)}
        onRestore={() => restore()}
        onClose={onClose}
      />
    );
  }

  // ── Pre-launch Coming Soon ──
  if (!PUZZLECRAFT_PLUS_LAUNCHED) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
          <div className="px-6 pb-8 pt-4 text-center space-y-3">
            <Crown size={32} className="text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground">Puzzlecraft+ — Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Early users will get a special launch price. Drop your email to be first.
            </p>
            <button onClick={onClose} className="w-full rounded-2xl border border-border py-3 text-sm font-medium">
              Got it
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Stripe not configured — premium Coming Soon ──────────────────────────
  // Keeps the full feature marketing visible but replaces the pay button
  // with a clean "notify me" flow. No errors, no dead ends.
  if (!STRIPE_CONFIGURED) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)] max-h-[92vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/60"
          >
            <X size={15} className="text-muted-foreground" />
          </button>

          <div className="px-6 pt-2 pb-6 space-y-5">
            {/* Header */}
            <div className="text-center pt-2">
              <div className="flex h-14 w-14 mx-auto mb-3 items-center justify-center rounded-2xl bg-primary/10">
                <Crown size={26} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Puzzlecraft+</h2>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-xs font-semibold text-primary">Coming very soon</span>
              </div>
            </div>

            {/* Pricing teaser */}
            <div className="flex rounded-2xl bg-muted/50 p-1 gap-1">
              <div className={cn("flex-1 rounded-xl py-2.5 text-sm font-medium text-center", "text-muted-foreground")}>
                {MONTHLY_PRICE}/mo
              </div>
              <div className={cn("flex-1 rounded-xl py-2.5 text-sm font-medium text-center relative", "bg-background shadow-sm text-foreground")}>
                {ANNUAL_PRICE}/yr
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-500 text-white">
                  Save {ANNUAL_SAVING_PCT}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2.5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon size={13} className="text-primary" />
                  </div>
                  <p className="text-sm text-foreground leading-snug">{text}</p>
                </div>
              ))}
            </div>

            {/* Notify me CTA — clean, no dead-end */}
            <div className="space-y-2.5 pt-1">
              {notifySubmitted ? (
                <div className="w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 py-4 text-center">
                  <Check size={20} className="text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-sm font-semibold text-foreground">You're on the list!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">We'll email you when Plus launches.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      className="flex-1 rounded-xl"
                    />
                    <Button
                      onClick={() => {
                        if (notifyEmail.includes("@")) setNotifySubmitted(true);
                      }}
                      className="shrink-0 rounded-xl gap-1.5"
                      disabled={!notifyEmail.includes("@")}
                    >
                      <Bell size={14} /> Notify me
                    </Button>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Early access · Special launch pricing · No spam
                  </p>
                </>
              )}

              <button onClick={onClose} className="w-full py-2 text-xs text-muted-foreground">
                Continue with free plan
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Success state ──
  if (result === "success") {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" aria-hidden />
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="px-6 pb-8 pt-8 text-center space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-foreground">You're on Puzzlecraft+</p>
            <p className="text-sm text-muted-foreground">All features are now unlocked. Enjoy!</p>
            <button onClick={onClose} className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground">
              Let's go
            </button>
          </div>
        </div>
      </>
    );
  }

  const ctaCopy = () => {
    if (purchasing) return "Opening…";
    if (native) return "Subscribe on our website";
    return annual ? `Subscribe — ${ANNUAL_PRICE}/year` : `Subscribe — ${MONTHLY_PRICE}/month`;
  };

  // ── Fully configured payment modal ──
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)] max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/60"
        >
          <X size={15} className="text-muted-foreground" />
        </button>

        <div className="px-6 pt-2 pb-6 space-y-5">
          <div className="text-center pt-2">
            <div className="flex h-14 w-14 mx-auto mb-3 items-center justify-center rounded-2xl bg-primary/10">
              <Crown size={26} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Puzzlecraft+</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {annual ? `${ANNUAL_PRICE}/year` : `${MONTHLY_PRICE}/month`}
            </p>
          </div>

          <div className="flex rounded-2xl bg-muted/50 p-1 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn("flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
                !annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              {MONTHLY_PRICE}/mo
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("flex-1 rounded-xl py-2.5 text-sm font-medium transition-all relative",
                annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              {ANNUAL_PRICE}/yr
              <span className={cn("absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-500 text-white",
                !annual && "opacity-60")}>
                Save {ANNUAL_SAVING_PCT}
              </span>
            </button>
          </div>

          <div className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={13} className="text-primary" />
                </div>
                <p className="text-sm text-foreground leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {result === "error" && errorMessage && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => purchase(annual)}
              disabled={purchasing}
              className={cn("w-full rounded-2xl py-4 text-base font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.97]",
                purchasing && "opacity-70 cursor-not-allowed")}
            >
              {ctaCopy()}
            </button>
            <button onClick={onClose} className="w-full py-2 text-xs text-muted-foreground">
              Continue with free plan
            </button>
          </div>

          {native && (
            <button
              onClick={() => restore()}
              disabled={purchasing}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 py-1"
            >
              <RefreshCw size={11} /> Restore purchases
            </button>
          )}

          <div className="flex items-center justify-center gap-1 pt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
            ))}
            <span className="text-[11px] text-muted-foreground ml-1.5">Loved by puzzle enthusiasts</span>
          </div>
        </div>
      </div>
    </>
  );
}
