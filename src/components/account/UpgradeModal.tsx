import { useUserAccount } from "@/contexts/UserAccountContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Shield } from "lucide-react";
import { useState } from "react";
import { PUZZLECRAFT_PLUS_LAUNCHED } from "@/lib/premiumAccess";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const features = [
  { icon: BarChart3, label: "Advanced performance stats" },
  { icon: Shield, label: "Player ranking & leaderboard" },
  { icon: TrendingUp, label: "Personalized insights" },
];

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { account, startCheckout } = useUserAccount();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    await startCheckout();
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="font-display">Puzzlecraft+</DialogTitle>
          </div>
          <DialogDescription>
            Unlock deeper insight into your puzzle performance
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-4">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-foreground">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {label}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          {!PUZZLECRAFT_PLUS_LAUNCHED ? (
            <p className="text-xs text-muted-foreground text-center">
              Puzzlecraft+ is coming soon. Stay tuned!
            </p>
          ) : !account ? (
            <p className="text-xs text-muted-foreground text-center">
              Sign in to your account first to upgrade.
            </p>
          ) : (
            <Button onClick={handleUpgrade} disabled={loading} className="w-full gap-2">
              <Sparkles size={14} />
              {loading ? "Opening checkout..." : "Upgrade – $2.99/month"}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            {PUZZLECRAFT_PLUS_LAUNCHED ? "Continue free" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
