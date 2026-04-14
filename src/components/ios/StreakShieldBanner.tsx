import { useState } from "react";
import { Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreakShield } from "@/hooks/useStreakShield";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";

interface StreakShieldBannerProps {
  streakLength: number;
  hasPlayedToday: boolean;
}

export function StreakShieldBanner({
  streakLength,
  hasPlayedToday,
}: StreakShieldBannerProps) {
  const {
    shieldCount,
    hasShield,
    shieldAutoUsedLastNight,
    dismissShieldNotification,
  } = useStreakShield();

  const { showUpgradeCTA } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const highStake = streakLength > 7;

  // State A — shield auto-fired last night
  if (shieldAutoUsedLastNight) {
    return (
      <>
        <div className="mx-0 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Shield size={16} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Streak Shield activated
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your {streakLength}-day streak was protected while you were away.
              {shieldCount > 0
                ? ` You have ${shieldCount} shield${shieldCount > 1 ? "s" : ""} remaining.`
                : " You're out of shields — play daily to stay protected."}
            </p>
          </div>
          <button
            onClick={dismissShieldNotification}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </>
    );
  }

  // State B — has shield, styled pill with amber tint for high-stake streaks
  if (hasShield) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-1.5 py-1.5 px-3 mx-auto rounded-full border",
          highStake
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-border/40 bg-muted/30"
        )}
      >
        <Shield
          size={11}
          className={cn(highStake ? "text-amber-500" : "text-primary/60")}
        />
        <span
          className={cn(
            "text-[11px] font-medium",
            highStake ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {shieldCount} Streak Shield{shieldCount > 1 ? "s" : ""} ready
        </span>
      </div>
    );
  }

  // State C — no shield, streak at risk, show upgrade nudge with concrete messaging
  if (!hasShield && !hasPlayedToday && streakLength > 3 && showUpgradeCTA) {
    return (
      <>
        <button
          onClick={() => setUpgradeOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-500" />
            <span className="text-xs text-muted-foreground">
              Your {streakLength}-day streak expires tonight
            </span>
          </div>
          <span className="text-xs font-medium text-primary">Upgrade</span>
        </button>
        <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      </>
    );
  }

  return null;
}
