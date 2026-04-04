/**
 * PremiumGate.tsx
 * src/components/premium/PremiumGate.tsx
 *
 * Unified subscription guard with three states:
 *   LOADING  → renders nothing (skeleton optional)
 *   LOCKED   → blurred teaser + upgrade CTA
 *   UNLOCKED → renders children
 */

import { useState } from "react";
import { Crown, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
  description?: string;
  blurChildren?: boolean;
  showSkeleton?: boolean;
  className?: string;
}

export function PremiumGate({
  children,
  feature = "This feature",
  description,
  blurChildren = true,
  showSkeleton = false,
  className,
}: PremiumGateProps) {
  const { isPremium, loading } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) {
    if (showSkeleton) {
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
        </div>
      );
    }
    return null;
  }

  if (isPremium) return <>{children}</>;

  return (
    <>
      <div className={cn("relative", className)}>
        {blurChildren && (
          <div
            className="pointer-events-none select-none blur-sm opacity-40"
            aria-hidden="true"
          >
            {children}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 text-center",
            "rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm p-6",
            blurChildren ? "absolute inset-0" : ""
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Crown size={20} className="text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {feature} is Puzzlecraft+
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground max-w-[200px]">
                {description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setUpgradeOpen(true)}
            className="gap-1.5 rounded-full"
          >
            <Crown size={13} />
            Upgrade to Plus
          </Button>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "bg-primary/10 text-[9px] font-semibold uppercase tracking-wide text-primary",
        className
      )}
    >
      <Crown size={9} />
      Plus
    </span>
  );
}

export function PremiumLockIcon({ size = 14 }: { size?: number }) {
  return <Lock size={size} className="text-muted-foreground/50" />;
}

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

export default PremiumGate;
