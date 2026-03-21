import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumLockedCardProps {
  onUpgrade?: () => void;
  /** When true, shows "Coming Soon" instead of an upgrade CTA */
  comingSoon?: boolean;
}

export default function PremiumLockedCard({ onUpgrade, comingSoon }: PremiumLockedCardProps) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Advanced Insights</p>
      <p className="text-xs text-muted-foreground mb-4">
        {comingSoon
          ? "Detailed performance trends, solve history, and more — coming soon."
          : "Detailed performance trends, solve history, and more."}
      </p>
      {comingSoon ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Coming Soon
        </span>
      ) : onUpgrade ? (
        <Button variant="outline" size="sm" onClick={onUpgrade} className="gap-1.5">
          Unlock with Puzzlecraft+
        </Button>
      ) : null}
    </div>
  );
}
