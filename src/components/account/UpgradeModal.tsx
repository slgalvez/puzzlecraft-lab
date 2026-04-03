import { useUserAccount } from "@/contexts/UserAccountContext";
import { Button } from "@/components/ui/button";
import {
  Shield, Sparkles, Trophy, Zap, Target, Flame, User,
  Check, X, Star,
} from "lucide-react";
import { useState } from "react";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: Shield,
    label: "Streak Shield",
    sub: "Miss a day? Shield protects your streak. 2 per week.",
    highlight: true,
  },
  {
    icon: Sparkles,
    label: "Unlimited Craft puzzles",
    sub: "Send as many personalised puzzles as you want.",
    highlight: false,
  },
  {
    icon: Trophy,
    label: "Global leaderboard ranking",
    sub: "Compete with every player and claim your tier.",
    highlight: false,
  },
  {
    icon: Zap,
    label: "Advanced stats + insights",
    sub: "Rating system, accuracy trends, personal bests.",
    highlight: false,
  },
  {
    icon: Target,
    label: "90-day daily archive",
    sub: "Replay any past daily challenge, any time.",
    highlight: false,
  },
  {
    icon: Flame,
    label: "Exclusive puzzle themes",
    sub: "Unlock all 11 themes for your Craft puzzles.",
    highlight: false,
  },
];

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { account, startCheckout } = useUserAccount();
  const [loading, setLoading] = useState(false);
  const [annual, setAnnual] = useState(true); // default to annual — better conversion

  if (!open) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    await startCheckout();
    setLoading(false);
    onClose();
  };

  const monthlyPrice = "$2.99";
  const annualPrice = "$19.99";
  const annualMonthly = "$1.67";
  const savings = "Save 44%";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom, iOS-style */}
      <div className="fixed bottom-0 left-0 right-0 z-[91] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>

        <div className="px-5 pb-8 pt-2 max-w-sm mx-auto space-y-5">

          {/* Hero */}
          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-1">
              <Star size={28} className="text-primary fill-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Puzzlecraft+</h2>
            <p className="text-sm text-muted-foreground">
              Everything you need to play harder, track better, and send more.
            </p>
          </div>

          {/* Pricing toggle */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-1 flex gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                !annual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Monthly
              <span className="block text-[11px] font-normal mt-0.5 opacity-70">{monthlyPrice}/mo</span>
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                annual
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Annual
              <span className="block text-[11px] font-normal mt-0.5 opacity-70">{annualMonthly}/mo</span>
              {/* Savings badge */}
              <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {savings}
              </span>
            </button>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, sub, highlight }) => (
              <div
                key={label}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5",
                  highlight && "bg-primary/5 border border-primary/15"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  highlight ? "bg-primary/15" : "bg-secondary"
                )}>
                  <Icon size={14} className={highlight ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium leading-tight",
                    highlight ? "text-foreground" : "text-foreground/90"
                  )}>
                    {label}
                    {highlight && (
                      <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Fan favourite
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sub}</p>
                </div>
                <Check size={14} className="text-primary shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {/* CTA */}
          {!PUZZLECRAFT_PLUS_LAUNCHED ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-foreground">Launching soon</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Puzzlecraft+ is coming. Early users will get a special launch price.
                </p>
              </div>
              <Button variant="outline" onClick={onClose} className="w-full rounded-xl">
                Got it
              </Button>
            </div>
          ) : !account ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Create a free account first, then upgrade to Puzzlecraft+.
                </p>
              </div>
              <Button onClick={onClose} className="w-full rounded-xl h-12 font-semibold gap-2">
                <User size={15} />
                Create Free Account
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full h-13 rounded-xl font-semibold text-base gap-2 shadow-[0_0_24px_hsl(var(--primary)/0.3)] active:scale-[0.97] transition-all"
              >
                <Sparkles size={16} />
                {loading
                  ? "Opening checkout..."
                  : annual
                    ? `Start Free Trial — ${annualPrice}/year`
                    : `Start Free Trial — ${monthlyPrice}/month`
                }
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                7-day free trial · Cancel anytime · Billed via App Store
              </p>
              <button
                onClick={onClose}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                Continue with free plan
              </button>
            </div>
          )}

          {/* Social proof */}
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
