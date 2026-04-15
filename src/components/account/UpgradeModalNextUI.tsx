/**
 * UpgradeModalNextUI.tsx
 * Pure presentational component — redesigned Puzzlecraft+ paywall.
 * No hooks, no logic. All state and handlers passed via props.
 * Preview: append ?paywall=new to any URL.
 */

import {
  Crown, Zap, BarChart2, Shield, Send,
  Trophy, X, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MONTHLY_PRICE, ANNUAL_PRICE, ANNUAL_SAVING_PCT,
  ANNUAL_MONTHLY_EQUIV,
} from "@/lib/pricing";

interface UpgradeModalNextUIProps {
  annual: boolean;
  setAnnual: (v: boolean) => void;
  purchasing: boolean;
  result: "idle" | "success" | "cancelled" | "error";
  errorMessage: string | null;
  native: boolean;
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
  headline?: string;
  subline?: string;
}

const BENEFIT_SECTIONS = [
  {
    title: "Create & Share",
    icon: Send,
    items: ["Create & send unlimited puzzles", "Add personal messages"],
  },
  {
    title: "Track Progress",
    icon: BarChart2,
    items: ["60-day activity history", "Replay past challenges", "Protect your streaks"],
  },
  {
    title: "Unlock Gameplay",
    icon: Zap,
    items: ["Extreme & Insane modes", "Access weekly puzzle packs"],
  },
  {
    title: "Compete",
    icon: Trophy,
    items: ["Track rank by puzzle type", "Climb global rankings"],
  },
] as const;

export default function UpgradeModalNextUI({
  annual, setAnnual, purchasing, result, errorMessage,
  native, onPurchase, onRestore, onClose, headline, subline,
}: UpgradeModalNextUIProps) {
  const ctaLabel = () => {
    if (purchasing) return "Opening…";
    if (native) return "Subscribe on our website";
    return annual
      ? `Get Puzzlecraft+ · ${ANNUAL_PRICE}/year`
      : `Get Puzzlecraft+ · ${MONTHLY_PRICE}/month`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background pb-[env(safe-area-inset-bottom)] max-h-[92vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/60"
        >
          <X size={15} className="text-muted-foreground" />
        </button>

        <div className="px-6 pt-2 pb-6 space-y-5">
          {/* ── Header ── */}
          <div className="text-center pt-2">
            <div className="flex h-10 w-10 mx-auto mb-3 items-center justify-center rounded-xl bg-primary/8">
              <Crown size={20} className="text-primary" />
            </div>
            <h2 className="text-[22px] font-extrabold text-foreground tracking-tight">{headline || "Puzzlecraft+"}</h2>
            <p className="text-sm text-muted-foreground/80 mt-1.5 leading-snug">
              {subline || "Create puzzles. Compete. Improve."}
            </p>
          </div>

          {/* ── Benefits ── */}
          <div className="space-y-1.5">
            {BENEFIT_SECTIONS.map(({ title, icon: Icon, items }) => (
              <div
                key={title}
                className="rounded-xl border border-border/40 px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                    {title}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item} className="text-sm leading-snug text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Pricing cards ── */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Monthly */}
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                !annual
                  ? "ring-1.5 ring-primary/25 border-primary/60 bg-primary/[0.04]"
                  : "border-border/25 bg-muted/10",
              )}
            >
              <span className={cn("text-xs font-medium", !annual ? "text-foreground/80" : "text-muted-foreground/70")}>Monthly</span>
              <p className={cn("text-lg font-bold mt-1 leading-none", !annual ? "text-foreground/80" : "text-muted-foreground/60")}>
                {MONTHLY_PRICE}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">per month</p>
            </button>

            {/* Annual */}
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all relative",
                annual
                  ? "ring-2 ring-primary/40 border-primary bg-primary/[0.06] shadow-sm shadow-primary/10"
                  : "border-border/30 bg-muted/15",
              )}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className={cn("text-xs font-semibold", annual ? "text-foreground" : "text-foreground/70")}>Annual</span>
                <span className="shrink-0 rounded-full bg-primary/12 text-primary px-1.5 py-0.5 text-[9px] font-semibold leading-none">
                  Save {ANNUAL_SAVING_PCT}
                </span>
              </div>
              <p className={cn("text-xl font-bold leading-none", annual ? "text-foreground" : "text-foreground/70")}>
                {ANNUAL_PRICE}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {ANNUAL_MONTHLY_EQUIV}/mo billed annually
              </p>
            </button>
          </div>

          {/* ── Error ── */}
          {result === "error" && errorMessage && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onPurchase}
              disabled={purchasing}
              className={cn(
                "w-full rounded-2xl py-4 text-base font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.97]",
                purchasing && "opacity-70 cursor-not-allowed",
              )}
            >
              {ctaLabel()}
            </button>

            <button onClick={onClose} className="w-full py-2 text-xs text-muted-foreground">
              Continue with free plan
            </button>
          </div>

          {/* ── Restore (native only) ── */}
          {native && (
            <button
              onClick={onRestore}
              disabled={purchasing}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 py-1"
            >
              <RefreshCw size={11} /> Restore purchases
            </button>
          )}

          {/* ── Footer note ── */}
          <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
            {native
              ? "Cancel anytime in Settings → Apple ID."
              : "Secure checkout via Stripe. Cancel anytime."}
          </p>
        </div>
      </div>
    </>
  );
}
