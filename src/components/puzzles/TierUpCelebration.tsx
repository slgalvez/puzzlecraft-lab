/**
 * TierUpCelebration.tsx
 *
 * Animated overlay celebrating a skill tier promotion.
 * Appears after solve when a tier-up is detected.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getTierBadgeStyle, getTierColor, type SkillTier } from "@/lib/solveScoring";
import { Crown, ChevronUp } from "lucide-react";
import { hapticSuccess } from "@/lib/haptic";

interface TierUpCelebrationProps {
  fromTier: string;
  toTier: string;
  rating: number;
  onDismiss: () => void;
}

export function TierUpCelebration({ fromTier, toTier, rating, onDismiss }: TierUpCelebrationProps) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    hapticSuccess();
    const t1 = setTimeout(() => setPhase("visible"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 4000);
    const t3 = setTimeout(onDismiss, 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const tier = toTier as SkillTier;
  const tierColor = getTierColor(tier);
  const badgeStyle = getTierBadgeStyle(tier);
  const isExpert = tier === "Expert";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "transition-opacity duration-300",
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      )}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Card */}
      <div
        className={cn(
          "relative z-10 w-[280px] rounded-2xl border bg-card p-6 text-center shadow-xl",
          "transition-all duration-500 ease-out",
          phase === "enter"
            ? "scale-75 opacity-0 translate-y-8"
            : phase === "exit"
            ? "scale-95 opacity-0 -translate-y-4"
            : "scale-100 opacity-100 translate-y-0"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
          isExpert ? "bg-amber-500/15" : "bg-primary/10"
        )}>
          {isExpert ? (
            <Crown size={28} className="text-amber-500 animate-[tier-bounce_0.6s_ease-out_0.3s_both]" />
          ) : (
            <ChevronUp size={28} className={cn(tierColor, "animate-[tier-bounce_0.6s_ease-out_0.3s_both]")} />
          )}
        </div>


        {/* Title */}
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Rank Up!
        </p>

        {/* New tier badge */}
        <span className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold mb-2",
          badgeStyle
        )}>
          {toTier}
        </span>

        {/* Rating */}
        <p className="font-mono text-3xl font-bold text-foreground leading-none mb-1">
          {rating}
        </p>

        {/* From → To */}
        <p className="text-xs text-muted-foreground">
          {fromTier} → {toTier}
        </p>

        {/* Tap to dismiss */}
        <p className="mt-4 text-[10px] text-muted-foreground/50">
          Tap to dismiss
        </p>
      </div>
    </div>
  );
}

export default TierUpCelebration;
