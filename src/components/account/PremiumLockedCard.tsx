import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumLockedCardProps {
  onUpgrade: () => void;
}

export default function PremiumLockedCard({ onUpgrade }: PremiumLockedCardProps) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Advanced Insights</p>
      <p className="text-xs text-muted-foreground mb-4">
        Detailed performance trends, solve history, and more.
      </p>
      <Button variant="outline" size="sm" onClick={onUpgrade} className="gap-1.5">
        <Sparkles size={12} />
        Unlock with Puzzlecraft+
      </Button>
    </div>
  );
}
