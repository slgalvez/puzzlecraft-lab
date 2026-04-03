/**
 * UpgradeModal.tsx — Full replacement
 * Uses useSubscription() for cross-platform purchases.
 */

import { useState } from "react";
import {
  Crown, Check, Star, Zap, BarChart2, Shield,
  Infinity as InfinityIcon, X, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { isNativeApp } from "@/lib/appMode";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";

const MONTHLY_PRICE = "$3.99";
const ANNUAL_PRICE  = "$27.99";
const ANNUAL_SAVING_PCT = "42%";
const TRIAL_DAYS = 7;

const FEATURES = [
  { icon: InfinityIcon, text: "Unlimited craft puzzles (free: 10/month)" },
  { icon: Zap,          text: "Extreme & Insane difficulty levels" },
  { icon: BarChart2,    text: "Full analytics — accuracy, trends, personal bests" },
  { icon: Crown,        text: "Skill rating & tier progression" },
  { icon: Shield,       text: "Streak Shield — protect your streak once a month" },
  { icon: Star,         text: "Early access to new puzzle types" },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true);
  const { purchase, restore, purchasing, result, errorMessage } = useSubscription();
  const native = isNativeApp();

  if (!open) return null;

  // Pre-launch state
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
            <p className="text-lg font-bold text-foreground">Coming soon</p>
            <p className="text-sm text-muted-foreground">
              Puzzlecraft+ is almost ready. Early users will get a special launch price.
            </p>
            <button onClick={onClose} className="w-full rounded-2xl border border-border py-3 text-sm font-medium">
              Got it
            </button>
          </div>
        </div>
      </>
    );
  }

  // Success state
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

  // CTA copy
  const ctaCopy = () => {
    if (purchasing) return "Opening…";
    if (native) {
      try { require("@revenuecat/purchases-capacitor"); } catch { return "Subscribe on our website"; }
      return `Start ${TRIAL_DAYS}-Day Free Trial`;
    }
    return annual
      ? `Subscribe — ${ANNUAL_PRICE}/year`
      : `Subscribe — ${MONTHLY_PRICE}/month`;
  };

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
              {native ? `${TRIAL_DAYS}-day free trial, then ` : ""}
              {annual ? `${ANNUAL_PRICE}/year` : `${MONTHLY_PRICE}/month`}
            </p>
          </div>

          <div className="flex rounded-2xl bg-muted/50 p-1 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
                !annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              {MONTHLY_PRICE}/mo
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all relative",
                annual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              {ANNUAL_PRICE}/yr
              <span className={cn(
                "absolute -top-2.5 left-1/2 -translate-x-1/2",
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                "bg-emerald-500 text-white",
                !annual && "opacity-60"
              )}>
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
              className={cn(
                "w-full rounded-2xl py-4 text-base font-semibold",
                "bg-primary text-primary-foreground",
                "shadow-lg shadow-primary/25",
                "transition-all active:scale-[0.97]",
                purchasing && "opacity-70 cursor-not-allowed"
              )}
            >
              {ctaCopy()}
            </button>

            {native && (
              <p className="text-center text-[11px] text-muted-foreground">
                {TRIAL_DAYS}-day free trial · Cancel anytime · Billed via App Store
              </p>
            )}

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
              <RefreshCw size={11} />
              Restore purchases
            </button>
          )}

          <div className="flex items-center justify-center gap-1 pt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
            ))}
            <span className="text-[11px] text-muted-foreground ml-1.5">
              Loved by puzzle enthusiasts
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
