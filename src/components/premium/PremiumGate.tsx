/**
 * PremiumGate.tsx
 * src/components/premium/PremiumGate.tsx
 *
 * A reusable wrapper that either renders children (for premium users)
 * or a blurred teaser with an upgrade prompt (for free users).
 *
 * Usage:
 *   <PremiumGate feature="Advanced Stats">
 *     <PremiumStats />
 *   </PremiumGate>
 */

import { useState } from "react";
import { Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;           // e.g. "Advanced Stats", "Extreme Difficulty"
  description?: string;       // short benefit description shown in teaser
  blurChildren?: boolean;     // show blurred children as teaser (default true)
  className?: string;
}

export const PremiumGate = ({
  children,
  feature = "This feature",
  description,
  blurChildren = true,
  className,
}: PremiumGateProps) => {
  const { isPremium, loading } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Blurred teaser */}
        {blurChildren && (
          <div className="pointer-events-none select-none blur-sm opacity-50">
            {children}
          </div>
        )}

        {/* Overlay */}
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl",
            "border border-primary/20 bg-card/80 backdrop-blur-sm p-6 text-center",
            blurChildren ? "absolute inset-0" : ""
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {feature} is Puzzlecraft+
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setUpgradeOpen(true)}
            className="gap-1.5 rounded-full"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Plus
          </Button>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PremiumBadge — inline badge to label a UI element as Plus-only.
 * Use next to feature titles, menu items, etc.
 */
export const PremiumBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
      "bg-primary/10 text-[9px] font-semibold uppercase tracking-wide text-primary",
      className
    )}
  >
    <Crown className="h-2.5 w-2.5" />
    Plus
  </span>
);

/**
 * PremiumLockRow — used in settings/account screens to show a locked option.
 */
export const PremiumLockRow = ({
  label,
  onUpgrade,
}: {
  label: string;
  onUpgrade: () => void;
}) => (
  <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3 opacity-60">
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      <Lock className="h-4 w-4 text-muted-foreground" />
      {label}
    </div>
    <button
      onClick={onUpgrade}
      className="text-xs font-medium text-primary underline underline-offset-2"
    >
      Upgrade
    </button>
  </div>
);
