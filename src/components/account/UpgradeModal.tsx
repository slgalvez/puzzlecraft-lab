/**
 * UpgradeModal.tsx
 * Single source of truth for all hooks, state, early returns,
 * and purchase/restore handlers. Delegates payment-ready UI
 * to UpgradeModalNextUI.
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

const STRIPE_CONFIGURED = true;

// ─── Trigger-specific copy ─────────────────────────────────────────────────
export type UpgradeTrigger =
  | "difficulty"
  | "craft-limit"
  | "stats"
  | "streak-shield"
  | "weekly-pack"
  | "generic";

const TRIGGER_COPY: Record<UpgradeTrigger, { headline: string; sub: string }> = {
  difficulty:      { headline: "Unlock harder puzzles",       sub: "Extreme & Insane difficulties are a Puzzlecraft+ feature." },
  "craft-limit":   { headline: "You've hit your craft limit", sub: "Upgrade to send unlimited craft puzzles every month." },
  stats:           { headline: "See your full stats",         sub: "Rating, tier tracking, and deep analytics are Puzzlecraft+ features." },
  "streak-shield": { headline: "Protect your streak",        sub: "Streak shields let you skip a day without losing progress." },
  "weekly-pack":   { headline: "Unlock Puzzlecraft+",         sub: "Get the full premium experience." },
  generic:         { headline: "Puzzlecraft+",                sub: "Create puzzles. Compete. Improve." },
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: UpgradeTrigger;
}

export default function UpgradeModal({ open, onClose, trigger = "generic" }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const { purchase, restore, purchasing, result, errorMessage } = useSubscription();
  const native = isNativeApp();

  if (!open) return null;

  // ── Pre-launch Coming Soon ──
  if (!PUZZLECRAFT_PLUS_LAUNCHED) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
        <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)]">
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

  // ── Stripe not configured — premium Coming Soon ──
  if (!STRIPE_CONFIGURED) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)] max-h-[92dvh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted/60"
            aria-label="Close"
          >
            <X size={16} className="text-muted-foreground" />
          </button>

          <div className="px-6 pt-2 pb-6 space-y-5">
            <div className="text-center pt-2">
              <div className="flex h-14 w-14 mx-auto mb-3 items-center justify-center rounded-2xl bg-primary/10">
                <Crown size={26} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Puzzlecraft+</h2>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-xs font-semibold text-primary">Coming very soon</span>
              </div>
            </div>

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
        <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)]">
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

  // ── Payment-ready state — always use new UI ──
  const copy = TRIGGER_COPY[trigger];
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
      headline={copy.headline}
      subline={copy.sub}
    />
  );
}
